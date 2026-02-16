-- Create materialized view for production summary with all eFCR calculations
-- This view aggregates data from multiple production tables (feeding, mortality, transfer, harvest, stocking)
-- and calculates period and aggregated eFCR metrics for each activity in each cycle

CREATE MATERIALIZED VIEW IF NOT EXISTS public.production_summary AS
WITH
  asof AS (
    SELECT
      COALESCE(
        (
          SELECT
            i.input_end_date
          FROM
            input i
          ORDER BY
            i.id DESC
          LIMIT 1
        ),
        CURRENT_DATE
      ) AS as_of_date
  ),
  cycle_map AS (
    SELECT
      pc.cycle_id,
      pc.system_id,
      pc.cycle_start,
      LEAST(
        COALESCE(
          pc.cycle_end,
          (
            SELECT
              asof.as_of_date
            FROM
              asof
          )
        ),
        (
          SELECT
            asof.as_of_date
          FROM
            asof
        )
      ) AS cycle_end,
      pc.cycle_end IS NULL
      OR pc.cycle_end > (
        (
          SELECT
            asof.as_of_date
          FROM
            asof
        )
      ) AS ongoing_cycle
    FROM
      production_cycle pc
  ),
  base_data AS (
    -- Sampling data from fish_sampling_weight
    SELECT
      fs.date,
      fs.system_id,
      sys.name AS system_name,
      sys.growth_stage,
      fs.abw AS average_body_weight,
      dfi.number_of_fish AS number_of_fish_inventory,
      'sampling'::text AS activity,
      2 AS activity_rank
    FROM
      fish_sampling_weight fs
      JOIN daily_fish_inventory_table dfi ON dfi.inventory_date = fs.date
      AND dfi.system_id = fs.system_id
      JOIN system sys ON sys.id = fs.system_id
    WHERE
      fs.date <= (
        (
          SELECT
            asof.as_of_date
          FROM
            asof
        )
      )
    UNION ALL
    -- Stocking data at cycle start
    SELECT
      cm.cycle_start AS date,
      fst.system_id,
      sys.name,
      sys.growth_stage,
      fst.abw,
      fst.number_of_fish_stocking::double precision AS number_of_fish_stocking,
      'stocking'::text,
      1
    FROM
      cycle_map cm
      JOIN fish_stocking fst ON fst.system_id = cm.system_id
      AND fst.date = cm.cycle_start
      JOIN system sys ON sys.id = fst.system_id
    WHERE
      cm.cycle_start <= (
        (
          SELECT
            asof.as_of_date
          FROM
            asof
        )
      )
    UNION ALL
    -- Final harvest data at cycle end
    SELECT
      pc.cycle_end AS date,
      fh.system_id,
      sys.name,
      sys.growth_stage,
      fh.abw,
      fh.number_of_fish_harvest::double precision AS number_of_fish_harvest,
      'final harvest'::text,
      3
    FROM
      production_cycle pc
      JOIN fish_harvest fh ON fh.system_id = pc.system_id
      AND fh.date = pc.cycle_end
      JOIN system sys ON sys.id = fh.system_id
    WHERE
      pc.cycle_end IS NOT NULL
      AND pc.cycle_end <= (
        (
          SELECT
            asof.as_of_date
          FROM
            asof
        )
      )
  ),
  periods AS (
    -- Map each activity to its cycle and calculate previous date for period calculations
    SELECT
      cm.cycle_id,
      cm.ongoing_cycle,
      bd.date,
      bd.system_id,
      bd.system_name,
      bd.growth_stage,
      bd.average_body_weight,
      bd.number_of_fish_inventory,
      bd.activity,
      bd.activity_rank,
      LAG(bd.date) OVER (
        PARTITION BY
          bd.system_id,
          cm.cycle_id
        ORDER BY
          bd.date,
          bd.activity_rank
      ) AS previous_date
    FROM
      base_data bd
      JOIN cycle_map cm ON cm.system_id = bd.system_id
      AND bd.date >= cm.cycle_start
      AND bd.date <= cm.cycle_end
  ),
  total_feed_amounts AS (
    -- Sum feeding records between periods
    SELECT
      p.cycle_id,
      p.system_id,
      p.date,
      p.activity,
      COALESCE(SUM(fr.feeding_amount), 0::double precision) AS total_feed_amount_period
    FROM
      periods p
      LEFT JOIN feeding_record fr ON fr.system_id = p.system_id
      AND p.previous_date IS NOT NULL
      AND (
        p.activity = 'final harvest'::text
        AND fr.date >= p.previous_date
        AND fr.date <= p.date
        OR p.activity <> 'final harvest'::text
        AND fr.date >= p.previous_date
        AND fr.date < p.date
      )
    GROUP BY
      p.cycle_id,
      p.system_id,
      p.date,
      p.activity
  ),
  mortality_amounts AS (
    -- Sum mortality records between periods
    SELECT
      p.cycle_id,
      p.system_id,
      p.date,
      p.activity,
      COALESCE(SUM(fm.number_of_fish_mortality), 0::numeric)::double precision AS mortality_period
    FROM
      periods p
      LEFT JOIN fish_mortality fm ON fm.system_id = p.system_id
      AND p.previous_date IS NOT NULL
      AND fm.date > p.previous_date
      AND fm.date <= p.date
    GROUP BY
      p.cycle_id,
      p.system_id,
      p.date,
      p.activity
  ),
  biomass_data AS (
    -- Calculate biomass at each activity point
    SELECT
      p.cycle_id,
      p.ongoing_cycle,
      p.date,
      p.system_id,
      p.system_name,
      p.growth_stage,
      p.average_body_weight,
      p.number_of_fish_inventory,
      p.activity,
      p.activity_rank,
      p.previous_date,
      fa.total_feed_amount_period,
      ma.mortality_period AS daily_mortality_count,
      p.average_body_weight * p.number_of_fish_inventory / 1000.0::double precision AS total_biomass,
      LAG(
        p.average_body_weight * p.number_of_fish_inventory / 1000.0::double precision
      ) OVER (
        PARTITION BY
          p.system_id,
          p.cycle_id
        ORDER BY
          p.date,
          p.activity_rank
      ) AS previous_total_biomass
    FROM
      periods p
      LEFT JOIN total_feed_amounts fa ON fa.cycle_id = p.cycle_id
      AND fa.system_id = p.system_id
      AND fa.date = p.date
      AND fa.activity = p.activity
      LEFT JOIN mortality_amounts ma ON ma.cycle_id = p.cycle_id
      AND ma.system_id = p.system_id
      AND ma.date = p.date
      AND ma.activity = p.activity
  ),
  transfer_out_data AS (
    -- Sum fish transfers out between periods
    SELECT
      bd.cycle_id,
      bd.system_id,
      bd.date,
      bd.activity,
      COALESCE(
        SUM(ft.number_of_fish_transfer),
        0::double precision
      ) AS number_of_fish_transfer_out,
      COALESCE(
        SUM(ft.total_weight_transfer),
        0::double precision
      ) AS total_weight_transfer_out
    FROM
      biomass_data bd
      LEFT JOIN fish_transfer ft ON ft.origin_system_id = bd.system_id
      AND bd.previous_date IS NOT NULL
      AND ft.date > bd.previous_date
      AND ft.date <= bd.date
    GROUP BY
      bd.cycle_id,
      bd.system_id,
      bd.date,
      bd.activity
  ),
  transfer_in_data AS (
    -- Sum fish transfers in between periods
    SELECT
      bd.cycle_id,
      bd.system_id,
      bd.date,
      bd.activity,
      COALESCE(
        SUM(ft.number_of_fish_transfer),
        0::double precision
      ) AS number_of_fish_transfer_in,
      COALESCE(
        SUM(ft.total_weight_transfer),
        0::double precision
      ) AS total_weight_transfer_in
    FROM
      biomass_data bd
      LEFT JOIN fish_transfer ft ON ft.target_system_id = bd.system_id
      AND bd.previous_date IS NOT NULL
      AND ft.date > bd.previous_date
      AND ft.date <= bd.date
    GROUP BY
      bd.cycle_id,
      bd.system_id,
      bd.date,
      bd.activity
  ),
  harvest_data AS (
    -- Sum harvest records between periods
    SELECT
      bd.cycle_id,
      bd.system_id,
      bd.date,
      bd.activity,
      COALESCE(SUM(fh.number_of_fish_harvest), 0::numeric)::double precision AS number_of_fish_harvested,
      COALESCE(SUM(fh.total_weight_harvest), 0::double precision) AS total_weight_harvested
    FROM
      biomass_data bd
      LEFT JOIN fish_harvest fh ON fh.system_id = bd.system_id
      AND bd.previous_date IS NOT NULL
      AND fh.date > bd.previous_date
      AND fh.date <= bd.date
    GROUP BY
      bd.cycle_id,
      bd.system_id,
      bd.date,
      bd.activity
  ),
  stocking_data AS (
    -- Sum stocking records between periods
    SELECT
      bd.cycle_id,
      bd.system_id,
      bd.date,
      bd.activity,
      COALESCE(SUM(fs.number_of_fish_stocking), 0::numeric)::double precision AS number_of_fish_stocked,
      COALESCE(
        SUM(fs.total_weight_stocking),
        0::double precision
      ) AS total_weight_stocked
    FROM
      biomass_data bd
      LEFT JOIN fish_stocking fs ON fs.system_id = bd.system_id
      AND bd.previous_date IS NOT NULL
      AND fs.date > bd.previous_date
      AND fs.date <= bd.date
    GROUP BY
      bd.cycle_id,
      bd.system_id,
      bd.date,
      bd.activity
  ),
  consolidated AS (
    -- Consolidate all metrics and calculate aggregated values using window functions
    SELECT
      bd.cycle_id,
      bd.date,
      bd.system_id,
      bd.system_name,
      bd.growth_stage,
      bd.ongoing_cycle,
      bd.average_body_weight,
      bd.number_of_fish_inventory,
      bd.total_feed_amount_period,
      bd.activity,
      bd.activity_rank,
      bd.total_biomass,
      COALESCE(
        bd.total_biomass - bd.previous_total_biomass,
        0::double precision
      ) AS biomass_increase_period,
      SUM(bd.total_feed_amount_period) OVER (
        PARTITION BY
          bd.cycle_id
        ORDER BY
          bd.date,
          bd.activity_rank
      ) AS total_feed_amount_aggregated,
      SUM(
        COALESCE(
          bd.total_biomass - bd.previous_total_biomass,
          0::double precision
        )
      ) OVER (
        PARTITION BY
          bd.cycle_id
        ORDER BY
          bd.date,
          bd.activity_rank
      ) AS biomass_increase_aggregated,
      bd.daily_mortality_count,
      SUM(bd.daily_mortality_count) OVER (
        PARTITION BY
          bd.cycle_id
        ORDER BY
          bd.date,
          bd.activity_rank
      ) AS cumulative_mortality,
      tod.number_of_fish_transfer_out,
      tod.total_weight_transfer_out,
      SUM(tod.total_weight_transfer_out) OVER (
        PARTITION BY
          tod.cycle_id
        ORDER BY
          tod.date,
          bd.activity_rank
      ) AS total_weight_transfer_out_aggregated,
      tid.number_of_fish_transfer_in,
      tid.total_weight_transfer_in,
      SUM(tid.total_weight_transfer_in) OVER (
        PARTITION BY
          tid.cycle_id
        ORDER BY
          tid.date,
          bd.activity_rank
      ) AS total_weight_transfer_in_aggregated,
      hd.number_of_fish_harvested,
      hd.total_weight_harvested,
      SUM(hd.total_weight_harvested) OVER (
        PARTITION BY
          hd.cycle_id
        ORDER BY
          hd.date,
          bd.activity_rank
      ) AS total_weight_harvested_aggregated,
      CASE
        WHEN bd.activity = 'stocking'::text THEN bd.number_of_fish_inventory
        ELSE sd.number_of_fish_stocked
      END AS number_of_fish_stocked,
      CASE
        WHEN bd.activity = 'stocking'::text THEN bd.total_biomass
        ELSE sd.total_weight_stocked
      END AS total_weight_stocked,
      SUM(
        CASE
          WHEN bd.activity = 'stocking'::text THEN bd.total_biomass
          ELSE sd.total_weight_stocked
        END
      ) OVER (
        PARTITION BY
          bd.cycle_id
        ORDER BY
          bd.date,
          bd.activity_rank
      ) AS total_weight_stocked_aggregated
    FROM
      biomass_data bd
      LEFT JOIN transfer_out_data tod ON tod.cycle_id = bd.cycle_id
      AND tod.system_id = bd.system_id
      AND tod.date = bd.date
      AND tod.activity = bd.activity
      LEFT JOIN transfer_in_data tid ON tid.cycle_id = bd.cycle_id
      AND tid.system_id = bd.system_id
      AND tid.date = bd.date
      AND tid.activity = bd.activity
      LEFT JOIN harvest_data hd ON hd.cycle_id = bd.cycle_id
      AND hd.system_id = bd.system_id
      AND hd.date = bd.date
      AND hd.activity = bd.activity
      LEFT JOIN stocking_data sd ON sd.cycle_id = bd.cycle_id
      AND sd.system_id = bd.system_id
      AND sd.date = bd.date
      AND sd.activity = bd.activity
  )
SELECT
  c.cycle_id,
  c.date,
  c.system_id,
  c.system_name,
  c.growth_stage,
  c.ongoing_cycle,
  c.average_body_weight,
  c.number_of_fish_inventory,
  c.total_feed_amount_period,
  c.activity,
  c.activity_rank,
  c.total_biomass,
  c.biomass_increase_period,
  c.total_feed_amount_aggregated,
  c.biomass_increase_aggregated,
  c.daily_mortality_count,
  c.cumulative_mortality,
  -- Daily mortality rate (%) = (daily mortality count / avg fish inventory) * 100
  CASE
    WHEN c.number_of_fish_inventory > 0 THEN (c.daily_mortality_count / c.number_of_fish_inventory) * 100.0
    ELSE NULL::double precision
  END AS daily_mortality_rate,
  -- Cumulative mortality rate (%) = (cumulative mortality / initial stocking count) * 100
  CASE
    WHEN c.number_of_fish_inventory > 0 THEN (c.cumulative_mortality / c.number_of_fish_inventory) * 100.0
    ELSE NULL::double precision
  END AS cumulative_mortality_rate,
  -- Feeding rate (kg/day per fish) = total feed / number of fish / days in period
  CASE
    WHEN c.number_of_fish_inventory > 0 AND c.biomass_increase_period IS NOT NULL THEN c.total_feed_amount_period / c.number_of_fish_inventory
    ELSE NULL::double precision
  END AS feeding_rate_per_fish,
  -- Feeding rate (kg/day per ton biomass) = total feed / total biomass
  CASE
    WHEN c.total_biomass > 0 THEN (c.total_feed_amount_period / c.total_biomass) * 1000.0
    ELSE NULL::double precision
  END AS feeding_rate_per_biomass,
  c.number_of_fish_transfer_out,
  c.total_weight_transfer_out,
  c.total_weight_transfer_out_aggregated,
  c.number_of_fish_transfer_in,
  c.total_weight_transfer_in,
  c.total_weight_transfer_in_aggregated,
  c.number_of_fish_harvested,
  c.total_weight_harvested,
  c.total_weight_harvested_aggregated,
  c.number_of_fish_stocked,
  c.total_weight_stocked,
  c.total_weight_stocked_aggregated,
  -- eFCR for current period (between activities)
  CASE
    WHEN NULLIF(
      COALESCE(c.biomass_increase_period, 0::double precision) + c.total_weight_transfer_out - c.total_weight_transfer_in + c.total_weight_harvested - c.total_weight_stocked,
      0::double precision
    ) IS NULL THEN NULL::double precision
    ELSE c.total_feed_amount_period / NULLIF(
      COALESCE(c.biomass_increase_period, 0::double precision) + c.total_weight_transfer_out - c.total_weight_transfer_in + c.total_weight_harvested - c.total_weight_stocked,
      0::double precision
    )
  END AS efcr_period,
  -- eFCR aggregated from cycle start to current activity
  CASE
    WHEN c.activity = 'final harvest'::text
    AND NULLIF(
      c.total_weight_harvested_aggregated + c.total_weight_transfer_out_aggregated - c.total_weight_transfer_in_aggregated - c.total_weight_stocked_aggregated,
      0::double precision
    ) IS NOT NULL THEN c.total_feed_amount_aggregated / NULLIF(
      c.total_weight_harvested_aggregated + c.total_weight_transfer_out_aggregated - c.total_weight_transfer_in_aggregated - c.total_weight_stocked_aggregated,
      0::double precision
    )
    WHEN NULLIF(
      c.biomass_increase_aggregated + c.total_weight_transfer_out_aggregated - c.total_weight_transfer_in_aggregated + c.total_weight_harvested_aggregated,
      0::double precision
    ) IS NULL THEN NULL::double precision
    ELSE c.total_feed_amount_aggregated / NULLIF(
      c.biomass_increase_aggregated + c.total_weight_transfer_out_aggregated - c.total_weight_transfer_in_aggregated + c.total_weight_harvested_aggregated,
      0::double precision
    )
  END AS efcr_aggregated
FROM
  consolidated c
ORDER BY
  c.system_id,
  c.cycle_id,
  c.date,
  c.activity_rank;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_production_summary_system_id ON public.production_summary(system_id);
CREATE INDEX IF NOT EXISTS idx_production_summary_cycle_id ON public.production_summary(cycle_id);
CREATE INDEX IF NOT EXISTS idx_production_summary_date ON public.production_summary(date);
CREATE INDEX IF NOT EXISTS idx_production_summary_system_date ON public.production_summary(system_id, date);

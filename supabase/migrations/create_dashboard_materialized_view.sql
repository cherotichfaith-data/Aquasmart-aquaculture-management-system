-- Create materialized view for dashboard with pre-calculated KPIs
-- This view calculates eFCR, mortality rate, biomass density, and water quality
-- for multiple time periods (7d, 30d, 90d, 180d, 365d, custom)

CREATE MATERIALIZED VIEW IF NOT EXISTS public.dashboard AS
WITH
  input_dates AS (
    SELECT
      'custom'::text AS time_period,
      input.input_start_date,
      input.input_end_date
    FROM
      input
    LIMIT 1
  ),
  additional_dates AS (
    SELECT
      dtp.time_period::text AS time_period,
      id.input_end_date - '1 day'::interval * dtp.days_since_start::double precision AS input_start_date,
      id.input_end_date
    FROM
      dashboard_time_period dtp
      CROSS JOIN input_dates id
  ),
  all_dates AS (
    SELECT
      input_dates.time_period,
      input_dates.input_start_date,
      input_dates.input_end_date
    FROM
      input_dates
    UNION ALL
    SELECT
      additional_dates.time_period,
      additional_dates.input_start_date,
      additional_dates.input_end_date
    FROM
      additional_dates
  ),
  sampling_dates AS (
    SELECT
      ps.system_id,
      ad_1.input_start_date,
      ad_1.input_end_date,
      ad_1.time_period,
      (
        SELECT
          production_summary.date
        FROM
          production_summary
        WHERE
          production_summary.system_id = ps.system_id
          AND production_summary.date <= ad_1.input_start_date
        ORDER BY
          (
            ABS(
              EXTRACT(
                EPOCH
                FROM
                  production_summary.date::timestamp without time zone - ad_1.input_start_date
              )
            )
          )
        LIMIT 1
      ) AS sampling_start_date,
      (
        SELECT
          production_summary.date
        FROM
          production_summary
        WHERE
          production_summary.system_id = ps.system_id
          AND production_summary.date <= ad_1.input_end_date
        ORDER BY
          (
            ABS(
              EXTRACT(
                EPOCH
                FROM
                  production_summary.date::timestamp without time zone - ad_1.input_end_date::timestamp without time zone
              )
            )
          )
        LIMIT 1
      ) AS sampling_end_date
    FROM
      production_summary ps
      CROSS JOIN all_dates ad_1
    GROUP BY
      ps.system_id,
      ad_1.input_start_date,
      ad_1.input_end_date,
      ad_1.time_period
  ),
  adjusted_sampling_dates AS (
    SELECT
      sd_1.system_id,
      sd_1.input_start_date,
      sd_1.input_end_date,
      sd_1.time_period,
      CASE
        WHEN sd_1.sampling_start_date = sd_1.sampling_end_date THEN (
          SELECT
            production_summary.date
          FROM
            production_summary
          WHERE
            production_summary.system_id = sd_1.system_id
            AND production_summary.date < sd_1.sampling_start_date
          ORDER BY
            production_summary.date DESC
          LIMIT 1
        )
        ELSE sd_1.sampling_start_date
      END AS sampling_start_date,
      sd_1.sampling_end_date
    FROM
      sampling_dates sd_1
  ),
  start_data AS (
    SELECT
      ps.system_id,
      sd_1.input_start_date,
      sd_1.input_end_date,
      sd_1.time_period,
      ps.total_feed_amount_aggregated AS start_feed_amount_aggregated,
      ps.biomass_increase_aggregated AS start_biomass_increase_aggregated,
      ps.total_weight_transfer_out_aggregated AS start_weight_transfer_out_aggregated,
      ps.total_weight_transfer_in_aggregated AS start_weight_transfer_in_aggregated,
      ps.total_weight_harvested_aggregated AS start_weight_harvested_aggregated,
      ps.total_weight_stocked_aggregated AS start_weight_stocked_aggregated
    FROM
      production_summary ps
      JOIN adjusted_sampling_dates sd_1 ON ps.system_id = sd_1.system_id
      AND ps.date = sd_1.sampling_start_date
  ),
  end_data AS (
    SELECT
      ps.system_id,
      sd_1.input_start_date,
      sd_1.input_end_date,
      sd_1.time_period,
      ps.total_feed_amount_aggregated AS end_feed_amount_aggregated,
      ps.biomass_increase_aggregated AS end_biomass_increase_aggregated,
      ps.total_weight_transfer_out_aggregated AS end_weight_transfer_out_aggregated,
      ps.total_weight_transfer_in_aggregated AS end_weight_transfer_in_aggregated,
      ps.total_weight_harvested_aggregated AS end_weight_harvested_aggregated,
      ps.total_weight_stocked_aggregated AS end_weight_stocked_aggregated,
      ps.average_body_weight AS abw_last_sampling,
      sd_1.sampling_end_date AS abw_latest_date
    FROM
      production_summary ps
      JOIN adjusted_sampling_dates sd_1 ON ps.system_id = sd_1.system_id
      AND ps.date = sd_1.sampling_end_date
  ),
  efcr_data AS (
    SELECT
      st.system_id,
      st.input_start_date,
      st.input_end_date,
      st.time_period,
      CASE
        WHEN (
          ed_1.end_biomass_increase_aggregated - st.start_biomass_increase_aggregated + (
            ed_1.end_weight_transfer_out_aggregated - st.start_weight_transfer_out_aggregated
          ) - (
            ed_1.end_weight_transfer_in_aggregated - st.start_weight_transfer_in_aggregated
          ) + (
            ed_1.end_weight_harvested_aggregated - st.start_weight_harvested_aggregated
          ) - (
            ed_1.end_weight_stocked_aggregated - st.start_weight_stocked_aggregated
          )
        ) = 0::double precision THEN NULL::double precision
        ELSE (
          ed_1.end_feed_amount_aggregated - st.start_feed_amount_aggregated
        ) / (
          ed_1.end_biomass_increase_aggregated - st.start_biomass_increase_aggregated + (
            ed_1.end_weight_transfer_out_aggregated - st.start_weight_transfer_out_aggregated
          ) - (
            ed_1.end_weight_transfer_in_aggregated - st.start_weight_transfer_in_aggregated
          ) + (
            ed_1.end_weight_harvested_aggregated - st.start_weight_harvested_aggregated
          ) - (
            ed_1.end_weight_stocked_aggregated - st.start_weight_stocked_aggregated
          )
        )
      END AS efcr,
      sd_1.sampling_end_date AS efcr_latest_date
    FROM
      start_data st
      JOIN adjusted_sampling_dates sd_1 ON st.system_id = sd_1.system_id
      AND st.input_start_date = sd_1.input_start_date
      AND st.input_end_date = sd_1.input_end_date
      JOIN end_data ed_1 ON st.system_id = ed_1.system_id
      AND st.input_start_date = ed_1.input_start_date
      AND st.input_end_date = ed_1.input_end_date
  ),
  feeding_rate_data AS (
    SELECT
      ps_start.system_id,
      ad_1.input_start_date,
      ad_1.input_end_date,
      ad_1.time_period,
      CASE
        WHEN SUM(ps_mid.total_biomass) = 0::double precision THEN NULL::double precision
        ELSE (
          ps_end.total_feed_amount_aggregated - ps_start.total_feed_amount_aggregated
        ) / SUM(ps_mid.total_biomass)
      END AS feeding_rate
    FROM
      production_summary ps_start
      JOIN production_summary ps_end ON ps_start.system_id = ps_end.system_id
      JOIN production_summary ps_mid ON ps_start.system_id = ps_mid.system_id
      CROSS JOIN all_dates ad_1
    WHERE
      ps_start.date = ad_1.input_start_date
      AND ps_end.date = ad_1.input_end_date
      AND ps_mid.date >= (ad_1.input_start_date + '1 day'::interval)
      AND ps_mid.date <= ad_1.input_end_date
    GROUP BY
      ps_start.system_id,
      ad_1.input_start_date,
      ad_1.input_end_date,
      ad_1.time_period,
      ps_start.total_feed_amount_aggregated,
      ps_end.total_feed_amount_aggregated
  ),
  mortality_rate_data AS (
    SELECT
      ps_start.system_id,
      ad_1.input_start_date,
      ad_1.input_end_date,
      ad_1.time_period,
      CASE
        WHEN SUM(ps_mid.number_of_fish_inventory) = 0::double precision THEN NULL::double precision
        ELSE (
          ps_end.cumulative_mortality - ps_start.cumulative_mortality
        ) / SUM(ps_mid.number_of_fish_inventory)
      END AS mortality_rate
    FROM
      production_summary ps_start
      JOIN production_summary ps_end ON ps_start.system_id = ps_end.system_id
      JOIN production_summary ps_mid ON ps_start.system_id = ps_mid.system_id
      CROSS JOIN all_dates ad_1
    WHERE
      ps_start.date = ad_1.input_start_date
      AND ps_end.date = ad_1.input_end_date
      AND ps_mid.date >= (ad_1.input_start_date + '1 day'::interval)
      AND ps_mid.date <= ad_1.input_end_date
    GROUP BY
      ps_start.system_id,
      ad_1.input_start_date,
      ad_1.input_end_date,
      ad_1.time_period,
      ps_start.cumulative_mortality,
      ps_end.cumulative_mortality
  ),
  biomass_density_data AS (
    SELECT
      ps.system_id,
      ad_1.input_start_date,
      ad_1.input_end_date,
      ad_1.time_period,
      CASE
        WHEN SUM(sys.volume) = 0::double precision THEN NULL::double precision
        ELSE SUM(ps.total_biomass) / SUM(sys.volume)
      END AS biomass_density
    FROM
      production_summary ps
      JOIN system sys ON ps.system_id = sys.id
      CROSS JOIN all_dates ad_1
    WHERE
      ps.date >= (ad_1.input_start_date + '1 day'::interval)
      AND ps.date <= ad_1.input_end_date
    GROUP BY
      ps.system_id,
      ad_1.input_start_date,
      ad_1.input_end_date,
      ad_1.time_period
  ),
  average_number_of_fish_data AS (
    SELECT
      ps.system_id,
      ad_1.input_start_date,
      ad_1.input_end_date,
      ad_1.time_period,
      AVG(ps.number_of_fish_inventory) AS average_number_of_fish
    FROM
      production_summary ps
      CROSS JOIN all_dates ad_1
    WHERE
      ps.date >= (ad_1.input_start_date + '1 day'::interval)
      AND ps.date <= ad_1.input_end_date
    GROUP BY
      ps.system_id,
      ad_1.input_start_date,
      ad_1.input_end_date,
      ad_1.time_period
  ),
  water_quality_data AS (
    SELECT
      wqr.system_id,
      ad_1.input_start_date,
      ad_1.input_end_date,
      ad_1.time_period,
      ROUND(AVG(wqr.rating_numeric), 1) AS water_quality_rating_numeric_average,
      CASE
        WHEN ROUND(AVG(wqr.rating_numeric)) = 0::numeric THEN 'lethal'::water_quality_rating
        WHEN ROUND(AVG(wqr.rating_numeric)) = 1::numeric THEN 'critical'::water_quality_rating
        WHEN ROUND(AVG(wqr.rating_numeric)) = 2::numeric THEN 'acceptable'::water_quality_rating
        WHEN ROUND(AVG(wqr.rating_numeric)) = 3::numeric THEN 'optimal'::water_quality_rating
        ELSE NULL::water_quality_rating
      END AS water_quality_rating_average
    FROM
      daily_water_quality_rating wqr
      CROSS JOIN all_dates ad_1
    WHERE
      wqr.rating_date >= (ad_1.input_start_date + '1 day'::interval)
      AND wqr.rating_date <= ad_1.input_end_date
    GROUP BY
      wqr.system_id,
      ad_1.input_start_date,
      ad_1.input_end_date,
      ad_1.time_period
  ),
  system_info AS (
    SELECT
      system.id AS system_id,
      system.volume,
      system.name AS system_name,
      system.growth_stage
    FROM
      system
  )
SELECT
  sd.system_id,
  si.system_name,
  si.growth_stage,
  ad.input_start_date,
  ad.input_end_date,
  ad.time_period,
  sd.sampling_start_date,
  sd.sampling_end_date,
  efcr_data.efcr,
  efcr_data.efcr_latest_date,
  'up'::arrows AS efcr_arrow,
  ed.abw_last_sampling AS abw,
  sd.sampling_end_date AS abw_latest_date,
  'up'::arrows AS abw_arrow,
  frd.feeding_rate,
  frd.feeding_rate AS feeding_rate_per_biomass,
  ad.input_end_date AS feeding_rate_latest_date,
  'down'::arrows AS feeding_rate_arrow,
  mrd.mortality_rate,
  mrd.mortality_rate * 100.0 AS mortality_rate_percentage,
  ad.input_end_date AS mortality_rate_latest_date,
  'straight'::arrows AS mortality_rate_arrow,
  bdd.biomass_density,
  'straight'::arrows AS biomass_density_arrow,
  bdd.biomass_density * si.volume AS average_biomass,
  anf.average_number_of_fish,
  wq.water_quality_rating_numeric_average,
  wq.water_quality_rating_average,
  ad.input_end_date AS water_quality_latest_date,
  'straight'::arrows AS water_quality_arrow
FROM
  adjusted_sampling_dates sd
  JOIN all_dates ad ON sd.input_start_date = ad.input_start_date
  AND sd.input_end_date = ad.input_end_date
  JOIN efcr_data ON sd.system_id = efcr_data.system_id
  AND sd.input_start_date = efcr_data.input_start_date
  AND sd.input_end_date = efcr_data.input_end_date
  JOIN end_data ON sd.system_id = end_data.system_id
  AND sd.input_start_date = end_data.input_start_date
  AND sd.input_end_date = end_data.input_end_date
  LEFT JOIN feeding_rate_data frd ON sd.system_id = frd.system_id
  AND sd.input_start_date = frd.input_start_date
  AND sd.input_end_date = frd.input_end_date
  LEFT JOIN mortality_rate_data mrd ON sd.system_id = mrd.system_id
  AND sd.input_start_date = mrd.input_start_date
  AND sd.input_end_date = mrd.input_end_date
  LEFT JOIN biomass_density_data bdd ON sd.system_id = bdd.system_id
  AND sd.input_start_date = bdd.input_start_date
  AND sd.input_end_date = bdd.input_end_date
  JOIN system_info si ON sd.system_id = si.system_id
  LEFT JOIN average_number_of_fish_data anf ON sd.system_id = anf.system_id
  AND sd.input_start_date = anf.input_start_date
  AND sd.input_end_date = anf.input_end_date
  LEFT JOIN water_quality_data wq ON sd.system_id = wq.system_id
  AND ad.input_start_date = wq.input_start_date
  AND ad.input_end_date = wq.input_end_date
WITH DATA;

-- Create index for faster queries by time_period and system_id
CREATE INDEX IF NOT EXISTS idx_dashboard_time_period_system ON public.dashboard(time_period, system_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_system_id ON public.dashboard(system_id);

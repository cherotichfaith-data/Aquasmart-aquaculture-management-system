-- Migration: clean_matviews
-- Date: 2026-06-04

DROP MATERIALIZED VIEW IF EXISTS analytics.daily_fish_inventory_table CASCADE;
DROP MATERIALIZED VIEW IF EXISTS analytics.efcr_period_last_sampling_view CASCADE;
DROP INDEX IF EXISTS analytics.daily_fish_inventory_table_id_idx;

DROP MATERIALIZED VIEW IF EXISTS analytics.daily_system_facts CASCADE;

CREATE MATERIALIZED VIEW analytics.daily_system_facts AS
WITH
activity_dates AS (
  SELECT system_id, date FROM public.fish_stocking
  UNION ALL SELECT system_id, date FROM public.fish_mortality
  UNION ALL SELECT system_id, date FROM public.feeding_record
  UNION ALL SELECT system_id, date FROM public.fish_sampling_weight
  UNION ALL SELECT system_id, date FROM public.fish_harvest
  UNION ALL SELECT target_system_id AS system_id, date FROM public.fish_transfer WHERE target_system_id IS NOT NULL
  UNION ALL SELECT origin_system_id AS system_id, date FROM public.fish_transfer WHERE origin_system_id IS NOT NULL
),
system_bounds AS (
  SELECT
    s.id AS system_id,
    s.farm_id,
    s.name AS system_name,
    s.growth_stage::text AS growth_stage,
    s.is_active AS system_is_active,
    s.volume,
    COALESCE(MIN(ad.date), s.commissioned_at, CURRENT_DATE) AS start_date,
    CASE
      WHEN s.decommissioned_at IS NOT NULL
        THEN GREATEST(COALESCE(MAX(ad.date), s.decommissioned_at), s.decommissioned_at)
      ELSE CURRENT_DATE
    END AS end_date
  FROM public.system s
  LEFT JOIN activity_dates ad ON ad.system_id = s.id
  WHERE s.farm_id IS NOT NULL
  GROUP BY s.id, s.farm_id, s.name, s.growth_stage, s.is_active, s.commissioned_at, s.decommissioned_at, s.volume
),
date_spine AS (
  SELECT
    sb.system_id,
    sb.farm_id,
    sb.system_name,
    sb.growth_stage,
    sb.system_is_active,
    sb.volume AS system_volume,
    gs.gs::date AS inventory_date
  FROM system_bounds sb
  CROSS JOIN LATERAL generate_series(sb.start_date::timestamp, sb.end_date::timestamp, '1 day'::interval) gs(gs)
),
daily_stocked AS (
  SELECT system_id, date AS inventory_date, SUM(number_of_fish_stocking)::double precision AS qty_stocked
  FROM public.fish_stocking
  GROUP BY system_id, date
),
daily_mortality AS (
  SELECT system_id, date AS inventory_date, SUM(number_of_fish_mortality)::double precision AS qty_mortality
  FROM public.fish_mortality
  GROUP BY system_id, date
),
daily_transfer_in AS (
  SELECT target_system_id AS system_id, date AS inventory_date, SUM(number_of_fish_transfer)::double precision AS qty_transfer_in
  FROM public.fish_transfer
  WHERE target_system_id IS NOT NULL
  GROUP BY target_system_id, date
),
daily_transfer_out AS (
  SELECT origin_system_id AS system_id, date AS inventory_date, SUM(number_of_fish_transfer)::double precision AS qty_transfer_out
  FROM public.fish_transfer
  WHERE origin_system_id IS NOT NULL
  GROUP BY origin_system_id, date
),
daily_harvest AS (
  SELECT system_id, date AS inventory_date, SUM(COALESCE(number_of_fish_harvest, 0))::double precision AS qty_harvested
  FROM public.fish_harvest
  GROUP BY system_id, date
),
daily_feed AS (
  SELECT system_id, date AS inventory_date, SUM(feeding_amount)::double precision AS feed_kg
  FROM public.feeding_record
  GROUP BY system_id, date
),
daily_events AS (
  SELECT
    ds.system_id,
    ds.farm_id,
    ds.system_name,
    ds.growth_stage,
    ds.system_is_active,
    ds.system_volume,
    ds.inventory_date,
    COALESCE(stk.qty_stocked, 0) AS fish_stocked_today,
    COALESCE(mort.qty_mortality, 0) AS fish_died_today,
    COALESCE(tin.qty_transfer_in, 0) AS fish_transferred_in_today,
    COALESCE(tout.qty_transfer_out, 0) AS fish_transferred_out_today,
    COALESCE(harv.qty_harvested, 0) AS fish_harvested_today,
    COALESCE(feed.feed_kg, 0) AS feeding_amount_today
  FROM date_spine ds
  LEFT JOIN daily_stocked stk ON stk.system_id = ds.system_id AND stk.inventory_date = ds.inventory_date
  LEFT JOIN daily_mortality mort ON mort.system_id = ds.system_id AND mort.inventory_date = ds.inventory_date
  LEFT JOIN daily_transfer_in tin ON tin.system_id = ds.system_id AND tin.inventory_date = ds.inventory_date
  LEFT JOIN daily_transfer_out tout ON tout.system_id = ds.system_id AND tout.inventory_date = ds.inventory_date
  LEFT JOIN daily_harvest harv ON harv.system_id = ds.system_id AND harv.inventory_date = ds.inventory_date
  LEFT JOIN daily_feed feed ON feed.system_id = ds.system_id AND feed.inventory_date = ds.inventory_date
),
running AS (
  SELECT
    de.*,
    SUM(
      de.fish_stocked_today
      + de.fish_transferred_in_today
      - de.fish_died_today
      - de.fish_transferred_out_today
      - de.fish_harvested_today
    ) OVER (
      PARTITION BY de.system_id
      ORDER BY de.inventory_date
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS number_of_fish
  FROM daily_events de
),
sampling_anchor AS (
  SELECT
    w.system_id,
    w.date AS anchor_date,
    COALESCE(
      CASE
        WHEN SUM(w.number_of_fish_sampling) FILTER (WHERE w.total_weight_sampling IS NOT NULL) > 0
          THEN (SUM(w.total_weight_sampling) FILTER (WHERE w.total_weight_sampling IS NOT NULL) * 1000.0)
            / NULLIF(SUM(w.number_of_fish_sampling) FILTER (WHERE w.total_weight_sampling IS NOT NULL), 0)::double precision
        ELSE NULL
      END,
      AVG(NULLIF(w.abw, 0))
    ) AS abw_g,
    1 AS anchor_priority
  FROM public.fish_sampling_weight w
  GROUP BY w.system_id, w.date
),
transfer_anchor AS (
  SELECT
    ft.target_system_id AS system_id,
    ft.date AS anchor_date,
    COALESCE(
      AVG(NULLIF(ft.abw, 0)),
      CASE
        WHEN SUM(ft.number_of_fish_transfer) > 0 AND SUM(ft.total_weight_transfer) > 0
          THEN (SUM(ft.total_weight_transfer) * 1000.0) / SUM(ft.number_of_fish_transfer)
        ELSE NULL
      END
    ) AS abw_g,
    2 AS anchor_priority
  FROM public.fish_transfer ft
  WHERE ft.target_system_id IS NOT NULL
  GROUP BY ft.target_system_id, ft.date
  HAVING COALESCE(
    AVG(NULLIF(ft.abw, 0)),
    CASE
      WHEN SUM(ft.number_of_fish_transfer) > 0 AND SUM(ft.total_weight_transfer) > 0
        THEN (SUM(ft.total_weight_transfer) * 1000.0) / SUM(ft.number_of_fish_transfer)
      ELSE NULL
    END
  ) IS NOT NULL
),
stocking_anchor AS (
  SELECT
    fs.system_id,
    fs.date AS anchor_date,
    COALESCE(
      AVG(NULLIF(fs.abw, 0)),
      CASE
        WHEN SUM(fs.number_of_fish_stocking) > 0 AND SUM(fs.total_weight_stocking) > 0
          THEN (SUM(fs.total_weight_stocking) * 1000.0) / SUM(fs.number_of_fish_stocking)
        ELSE NULL
      END,
      AVG(NULLIF(fb.abw, 0))
    ) AS abw_g,
    3 AS anchor_priority
  FROM public.fish_stocking fs
  LEFT JOIN public.fingerling_batch fb ON fb.id = fs.batch_id
  GROUP BY fs.system_id, fs.date
  HAVING COALESCE(
    AVG(NULLIF(fs.abw, 0)),
    CASE
      WHEN SUM(fs.number_of_fish_stocking) > 0 AND SUM(fs.total_weight_stocking) > 0
        THEN (SUM(fs.total_weight_stocking) * 1000.0) / SUM(fs.number_of_fish_stocking)
      ELSE NULL
    END,
    AVG(NULLIF(fb.abw, 0))
  ) IS NOT NULL
),
all_anchors AS (
  SELECT system_id, anchor_date, abw_g, anchor_priority FROM sampling_anchor
  UNION ALL SELECT system_id, anchor_date, abw_g, anchor_priority FROM transfer_anchor
  UNION ALL SELECT system_id, anchor_date, abw_g, anchor_priority FROM stocking_anchor
),
last_abw AS (
  SELECT DISTINCT ON (r.system_id, r.inventory_date)
    r.system_id,
    r.inventory_date,
    a.anchor_date AS last_abw_date,
    a.abw_g AS abw_last_sampling
  FROM running r
  LEFT JOIN all_anchors a ON a.system_id = r.system_id AND a.anchor_date <= r.inventory_date
  ORDER BY r.system_id, r.inventory_date, a.anchor_date DESC NULLS LAST, a.anchor_priority ASC
),
facts AS (
  SELECT
    ROW_NUMBER() OVER (ORDER BY r.system_id, r.inventory_date) AS id,
    r.inventory_date,
    r.system_id,
    r.farm_id,
    r.system_name,
    r.growth_stage,
    r.system_is_active,
    GREATEST(r.number_of_fish, 0) AS number_of_fish,
    r.fish_died_today AS number_of_fish_mortality,
    r.feeding_amount_today AS feeding_amount,
    la.abw_last_sampling,
    la.last_abw_date,
    CASE
      WHEN la.abw_last_sampling IS NOT NULL THEN (la.abw_last_sampling * GREATEST(r.number_of_fish, 0)) / 1000.0
      ELSE NULL
    END AS biomass_kg,
    r.system_volume,
    CASE
      WHEN GREATEST(r.number_of_fish, 0) > 0 THEN lineage.cycle_id::bigint
      ELSE NULL
    END AS production_cycle_id,
    lineage.batch_id
  FROM running r
  LEFT JOIN last_abw la ON la.system_id = r.system_id AND la.inventory_date = r.inventory_date
  LEFT JOIN LATERAL public.resolve_cycle_batch_for_system_date(r.system_id, r.inventory_date) lineage(cycle_id, batch_id) ON true
)
SELECT
  f.id,
  f.inventory_date,
  f.system_id,
  f.farm_id,
  f.system_name,
  f.growth_stage,
  f.system_is_active,
  f.production_cycle_id,
  f.batch_id,
  f.number_of_fish,
  f.number_of_fish_mortality,
  f.feeding_amount,
  f.abw_last_sampling,
  f.last_abw_date,
  f.biomass_kg AS biomass_last_sampling,
  CASE WHEN f.biomass_kg > 0 THEN (f.feeding_amount / f.biomass_kg) * 100.0 ELSE NULL END AS feeding_rate,
  CASE WHEN f.system_volume > 0 AND f.biomass_kg IS NOT NULL THEN GREATEST(f.biomass_kg, 0) / f.system_volume ELSE NULL END AS biomass_density,
  CASE WHEN f.number_of_fish > 0 THEN (f.number_of_fish_mortality / f.number_of_fish) * 100.0 ELSE 0 END AS mortality_rate,
  f.system_volume,
  (f.abw_last_sampling IS NOT NULL) AS has_abw,
  (f.number_of_fish IS NOT NULL) AS has_inventory_count,
  (f.feeding_amount > 0) AS has_feed_record
FROM facts f
WITH NO DATA;

ALTER MATERIALIZED VIEW analytics.daily_system_facts OWNER TO postgres;
CREATE UNIQUE INDEX daily_system_facts_id_idx ON analytics.daily_system_facts (id);
CREATE INDEX daily_system_facts_farm_system_date_idx ON analytics.daily_system_facts (farm_id, system_id, inventory_date);
CREATE INDEX daily_system_facts_cycle_idx ON analytics.daily_system_facts (production_cycle_id, inventory_date) WHERE production_cycle_id IS NOT NULL;
GRANT SELECT ON analytics.daily_system_facts TO authenticated, service_role;

DROP MATERIALIZED VIEW IF EXISTS analytics.production_summary CASCADE;

CREATE MATERIALIZED VIEW analytics.production_summary AS
WITH
real_events AS (
  SELECT
    fs.cycle_id,
    fs.system_id,
    fs.date,
    'stocking'::text AS activity,
    10 AS activity_rank,
    SUM(fs.number_of_fish_stocking)::double precision AS number_of_fish_event,
    SUM(fs.total_weight_stocking)::double precision AS weight_kg_event,
    0::double precision AS feed_kg_period,
    0::double precision AS mortality_count,
    0::double precision AS fish_transfer_out,
    0::double precision AS weight_transfer_out_kg,
    0::double precision AS fish_transfer_in,
    0::double precision AS weight_transfer_in_kg,
    0::double precision AS fish_harvested,
    0::double precision AS weight_harvested_kg
  FROM public.fish_stocking fs
  WHERE fs.cycle_id IS NOT NULL
  GROUP BY fs.cycle_id, fs.system_id, fs.date
  UNION ALL
  SELECT fr.cycle_id, fr.system_id, fr.date, 'feeding'::text, 20, 0, 0, SUM(fr.feeding_amount)::double precision, 0, 0, 0, 0, 0, 0, 0
  FROM public.feeding_record fr
  WHERE fr.cycle_id IS NOT NULL
  GROUP BY fr.cycle_id, fr.system_id, fr.date
  UNION ALL
  SELECT fsw.cycle_id, fsw.system_id, fsw.date, 'sampling'::text, 30, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
  FROM public.fish_sampling_weight fsw
  WHERE fsw.cycle_id IS NOT NULL
  GROUP BY fsw.cycle_id, fsw.system_id, fsw.date
  UNION ALL
  SELECT fm.cycle_id, fm.system_id, fm.date, 'mortality'::text, 40, 0, 0, 0, SUM(fm.number_of_fish_mortality)::double precision, 0, 0, 0, 0, 0, 0
  FROM public.fish_mortality fm
  WHERE fm.cycle_id IS NOT NULL
  GROUP BY fm.cycle_id, fm.system_id, fm.date
  UNION ALL
  SELECT
    ft.cycle_id,
    ft.origin_system_id AS system_id,
    ft.date,
    'transfer out'::text,
    50,
    0,
    0,
    0,
    0,
    SUM(ft.number_of_fish_transfer)::double precision,
    SUM(public.transfer_weight_kg(ft.total_weight_transfer, ft.number_of_fish_transfer, ft.abw))::double precision,
    0,
    0,
    0,
    0
  FROM public.fish_transfer ft
  WHERE ft.origin_system_id IS NOT NULL
    AND ft.cycle_id IS NOT NULL
    AND public.transfer_impacts_efcr(ft.transfer_type, ft.origin_system_id, ft.target_system_id)
  GROUP BY ft.cycle_id, ft.origin_system_id, ft.date
  UNION ALL
  SELECT
    ft.cycle_id,
    ft.target_system_id AS system_id,
    ft.date,
    'transfer in'::text,
    60,
    0,
    0,
    0,
    0,
    0,
    0,
    SUM(ft.number_of_fish_transfer)::double precision,
    SUM(public.transfer_weight_kg(ft.total_weight_transfer, ft.number_of_fish_transfer, ft.abw))::double precision,
    0,
    0
  FROM public.fish_transfer ft
  WHERE ft.target_system_id IS NOT NULL
    AND ft.cycle_id IS NOT NULL
    AND public.transfer_impacts_efcr(ft.transfer_type, ft.origin_system_id, ft.target_system_id)
  GROUP BY ft.cycle_id, ft.target_system_id, ft.date
  UNION ALL
  SELECT fh.cycle_id, fh.system_id, fh.date, 'partial harvest'::text, 70, 0, 0, 0, 0, 0, 0, 0, 0, SUM(COALESCE(fh.number_of_fish_harvest, 0))::double precision, SUM(fh.total_weight_harvest)::double precision
  FROM public.fish_harvest fh
  WHERE fh.cycle_id IS NOT NULL AND fh.type_of_harvest <> 'final'
  GROUP BY fh.cycle_id, fh.system_id, fh.date
  UNION ALL
  SELECT fh.cycle_id, fh.system_id, fh.date, 'final harvest'::text, 80, 0, 0, 0, 0, 0, 0, 0, 0, SUM(COALESCE(fh.number_of_fish_harvest, 0))::double precision, SUM(fh.total_weight_harvest)::double precision
  FROM public.fish_harvest fh
  WHERE fh.cycle_id IS NOT NULL AND fh.type_of_harvest = 'final'
  GROUP BY fh.cycle_id, fh.system_id, fh.date
),
events_with_context AS (
  SELECT
    re.*,
    pc.ongoing_cycle,
    s.name AS system_name,
    s.growth_stage::text AS growth_stage
  FROM real_events re
  JOIN public.production_cycle pc ON pc.cycle_id = re.cycle_id
  JOIN public.system s ON s.id = re.system_id
),
events_with_biomass AS (
  SELECT
    e.*,
    dsf.abw_last_sampling AS average_body_weight,
    dsf.number_of_fish AS number_of_fish_inventory,
    dsf.biomass_last_sampling AS biomass_kg,
    LAG(dsf.biomass_last_sampling) OVER (
      PARTITION BY e.cycle_id
      ORDER BY e.date, e.activity_rank, e.system_id
    ) AS prev_biomass_kg
  FROM events_with_context e
  LEFT JOIN analytics.daily_system_facts dsf ON dsf.system_id = e.system_id AND dsf.inventory_date = e.date
),
consolidated AS (
  SELECT
    e.*,
    CASE
      WHEN e.prev_biomass_kg IS NULL OR e.biomass_kg IS NULL THEN 0::double precision
      ELSE e.biomass_kg - e.prev_biomass_kg
    END AS biomass_increase_period,
    CASE
      WHEN e.prev_biomass_kg IS NULL OR e.biomass_kg IS NULL THEN NULL::double precision
      ELSE (e.biomass_kg - e.prev_biomass_kg)
        + e.weight_transfer_out_kg
        - e.weight_transfer_in_kg
        + e.weight_harvested_kg
        - e.weight_kg_event
    END AS efcr_denominator_period
  FROM events_with_biomass e
),
final_rows AS (
  SELECT
    c.*,
    SUM(c.feed_kg_period) OVER w AS feed_kg_aggregated,
    SUM(c.biomass_increase_period) OVER w AS biomass_increase_aggregated,
    SUM(c.mortality_count) OVER w AS cumulative_mortality,
    SUM(c.fish_transfer_out) OVER w AS fish_transfer_out_aggregated,
    SUM(c.fish_transfer_in) OVER w AS fish_transfer_in_aggregated,
    SUM(c.fish_harvested) OVER w AS fish_harvested_aggregated,
    SUM(c.weight_transfer_out_kg) OVER w AS weight_transfer_out_kg_aggregated,
    SUM(c.weight_transfer_in_kg) OVER w AS weight_transfer_in_kg_aggregated,
    SUM(c.weight_harvested_kg) OVER w AS weight_harvested_kg_aggregated,
    SUM(c.weight_kg_event) OVER w AS weight_stocked_kg_aggregated,
    SUM(COALESCE(c.efcr_denominator_period, 0)) OVER w AS efcr_denominator_aggregated
  FROM consolidated c
  WINDOW w AS (
    PARTITION BY c.cycle_id
    ORDER BY c.date, c.activity_rank, c.system_id
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  )
)
SELECT
  f.cycle_id,
  f.system_id,
  f.system_name,
  f.growth_stage,
  f.ongoing_cycle,
  f.date,
  f.activity,
  f.activity_rank,
  f.number_of_fish_event AS number_of_fish_stocked,
  f.weight_kg_event AS weight_stocked_kg,
  f.feed_kg_period,
  f.mortality_count,
  f.fish_transfer_out,
  f.weight_transfer_out_kg,
  f.fish_transfer_in,
  f.weight_transfer_in_kg,
  f.fish_harvested,
  f.weight_harvested_kg,
  f.average_body_weight,
  f.number_of_fish_inventory,
  f.biomass_kg,
  f.prev_biomass_kg,
  f.biomass_increase_period,
  f.feed_kg_aggregated,
  f.biomass_increase_aggregated,
  f.cumulative_mortality,
  f.fish_transfer_out_aggregated,
  f.fish_transfer_in_aggregated,
  f.fish_harvested_aggregated,
  f.weight_transfer_out_kg_aggregated,
  f.weight_transfer_in_kg_aggregated,
  f.weight_harvested_kg_aggregated,
  f.weight_stocked_kg_aggregated,
  CASE WHEN f.efcr_denominator_period > 0 THEN f.feed_kg_period / f.efcr_denominator_period ELSE NULL END AS efcr_period,
  CASE WHEN f.efcr_denominator_aggregated > 0 THEN f.feed_kg_aggregated / f.efcr_denominator_aggregated ELSE NULL END AS efcr_aggregated
FROM final_rows f
ORDER BY f.cycle_id, f.date, f.activity_rank, f.system_id
WITH NO DATA;

ALTER MATERIALIZED VIEW analytics.production_summary OWNER TO postgres;
CREATE INDEX production_summary_cycle_date_idx ON analytics.production_summary (cycle_id, date, activity_rank, system_id);
CREATE INDEX production_summary_system_date_idx ON analytics.production_summary (system_id, date);
GRANT SELECT ON analytics.production_summary TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.process_inventory_queue(p_limit integer DEFAULT 50)
RETURNS TABLE(
  processed_system_id bigint,
  processed_from_date date,
  processed_to_date date,
  upserted_days integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'analytics'
AS $$
DECLARE
  r record;
  v_has_queue boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public._affected_systems) INTO v_has_queue;

  IF v_has_queue THEN
    REFRESH MATERIALIZED VIEW analytics.daily_system_facts;
    REFRESH MATERIALIZED VIEW analytics.production_summary;
  END IF;

  FOR r IN
    SELECT system_id, min_affected_date
    FROM public._affected_systems
    ORDER BY min_affected_date ASC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 500))
  LOOP
    processed_system_id := r.system_id;
    processed_from_date := r.min_affected_date;
    processed_to_date := CURRENT_DATE;
    upserted_days := 0;
    RETURN NEXT;
  END LOOP;

  DELETE FROM public._affected_systems
  WHERE system_id IN (
    SELECT system_id
    FROM public._affected_systems
    ORDER BY min_affected_date ASC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 500))
  );
END;
$$;

ALTER FUNCTION public.process_inventory_queue(integer) OWNER TO postgres;

DROP FUNCTION IF EXISTS public.api_daily_fish_inventory_rpc(
  uuid,
  bigint,
  public.system_growth_stage,
  date,
  date,
  date,
  bigint,
  boolean,
  integer
);

CREATE FUNCTION public.api_daily_fish_inventory_rpc(
  p_farm_id uuid,
  p_system_id bigint DEFAULT NULL,
  p_stage public.system_growth_stage DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_cursor_date date DEFAULT NULL,
  p_cursor_system_id bigint DEFAULT NULL,
  p_order_asc boolean DEFAULT false,
  p_limit integer DEFAULT 5000
)
RETURNS TABLE(
  inventory_date date,
  system_id bigint,
  farm_id uuid,
  system_name text,
  production_cycle_id bigint,
  batch_id bigint,
  growth_stage text,
  number_of_fish double precision,
  number_of_fish_mortality double precision,
  feeding_amount double precision,
  abw_last_sampling double precision,
  last_abw_date date,
  biomass_last_sampling double precision,
  feeding_rate double precision,
  system_volume double precision,
  biomass_density double precision,
  mortality_rate double precision,
  has_abw boolean,
  has_inventory_count boolean,
  has_feed_record boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'analytics'
AS $$
BEGIN
  IF NOT private.is_farm_member(p_farm_id) THEN
    RETURN;
  END IF;

  PERFORM private.assert_rpc_parameters(
    p_farm_id := p_farm_id,
    p_system_id := p_system_id,
    p_batch_id := NULL,
    p_start_date := p_start_date,
    p_end_date := p_end_date
  );

  IF p_order_asc THEN
    RETURN QUERY
    SELECT
      dfi.inventory_date,
      dfi.system_id,
      dfi.farm_id,
      dfi.system_name,
      dfi.production_cycle_id,
      dfi.batch_id,
      dfi.growth_stage,
      dfi.number_of_fish::double precision,
      dfi.number_of_fish_mortality::double precision,
      dfi.feeding_amount::double precision,
      dfi.abw_last_sampling::double precision,
      dfi.last_abw_date,
      dfi.biomass_last_sampling::double precision,
      dfi.feeding_rate::double precision,
      dfi.system_volume::double precision,
      dfi.biomass_density::double precision,
      dfi.mortality_rate::double precision,
      dfi.has_abw,
      dfi.has_inventory_count,
      dfi.has_feed_record
    FROM analytics.daily_system_facts dfi
    WHERE dfi.farm_id = p_farm_id
      AND (p_system_id IS NULL OR dfi.system_id = p_system_id)
      AND (p_stage IS NULL OR dfi.growth_stage = p_stage::text)
      AND (p_start_date IS NULL OR dfi.inventory_date >= p_start_date)
      AND (p_end_date IS NULL OR dfi.inventory_date <= p_end_date)
      AND (p_cursor_date IS NULL OR (dfi.inventory_date, dfi.system_id) > (p_cursor_date, COALESCE(p_cursor_system_id, -1)))
    ORDER BY dfi.inventory_date ASC, dfi.system_id ASC
    LIMIT private.clamp_rpc_limit(p_limit, 5000, 100000);
  ELSE
    RETURN QUERY
    SELECT
      dfi.inventory_date,
      dfi.system_id,
      dfi.farm_id,
      dfi.system_name,
      dfi.production_cycle_id,
      dfi.batch_id,
      dfi.growth_stage,
      dfi.number_of_fish::double precision,
      dfi.number_of_fish_mortality::double precision,
      dfi.feeding_amount::double precision,
      dfi.abw_last_sampling::double precision,
      dfi.last_abw_date,
      dfi.biomass_last_sampling::double precision,
      dfi.feeding_rate::double precision,
      dfi.system_volume::double precision,
      dfi.biomass_density::double precision,
      dfi.mortality_rate::double precision,
      dfi.has_abw,
      dfi.has_inventory_count,
      dfi.has_feed_record
    FROM analytics.daily_system_facts dfi
    WHERE dfi.farm_id = p_farm_id
      AND (p_system_id IS NULL OR dfi.system_id = p_system_id)
      AND (p_stage IS NULL OR dfi.growth_stage = p_stage::text)
      AND (p_start_date IS NULL OR dfi.inventory_date >= p_start_date)
      AND (p_end_date IS NULL OR dfi.inventory_date <= p_end_date)
      AND (p_cursor_date IS NULL OR (dfi.inventory_date, dfi.system_id) < (p_cursor_date, COALESCE(p_cursor_system_id, 9223372036854775807)))
    ORDER BY dfi.inventory_date DESC, dfi.system_id DESC
    LIMIT private.clamp_rpc_limit(p_limit, 5000, 100000);
  END IF;
END;
$$;

ALTER FUNCTION public.api_daily_fish_inventory_rpc(uuid, bigint, public.system_growth_stage, date, date, date, bigint, boolean, integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.api_daily_fish_inventory_rpc(uuid, bigint, public.system_growth_stage, date, date, date, bigint, boolean, integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.api_daily_fish_inventory_rpc(uuid, bigint, public.system_growth_stage, date, date, date, bigint, boolean, integer) TO authenticated;
GRANT ALL ON FUNCTION public.api_daily_fish_inventory_rpc(uuid, bigint, public.system_growth_stage, date, date, date, bigint, boolean, integer) TO service_role;

DROP FUNCTION IF EXISTS public.api_efcr_trend(uuid, bigint, date, date);

CREATE FUNCTION public.api_efcr_trend(
  p_farm_id uuid,
  p_system_id bigint DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE(
  system_id bigint,
  farm_id uuid,
  inventory_date date,
  efcr_period numeric,
  efcr_aggregated numeric,
  biomass_last_sampling numeric,
  system_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'analytics'
AS $$
  SELECT
    ps.system_id,
    sys.farm_id,
    ps.date AS inventory_date,
    ps.efcr_period::numeric,
    ps.efcr_aggregated::numeric,
    ps.biomass_kg::numeric AS biomass_last_sampling,
    sys.name AS system_name
  FROM analytics.production_summary ps
  JOIN public.system sys ON sys.id = ps.system_id
  WHERE sys.farm_id = p_farm_id
    AND private.app_rpc_scope_ok(p_farm_id, p_system_id, NULL, p_start_date, p_end_date)
    AND (p_system_id IS NULL OR ps.system_id = p_system_id)
    AND (p_start_date IS NULL OR ps.date >= p_start_date)
    AND (p_end_date IS NULL OR ps.date <= p_end_date)
    AND (ps.efcr_period IS NOT NULL OR ps.efcr_aggregated IS NOT NULL)
  ORDER BY ps.date, ps.system_id, ps.activity_rank;
$$;

ALTER FUNCTION public.api_efcr_trend(uuid, bigint, date, date) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.api_efcr_trend(uuid, bigint, date, date) FROM PUBLIC;
GRANT ALL ON FUNCTION public.api_efcr_trend(uuid, bigint, date, date) TO authenticated;
GRANT ALL ON FUNCTION public.api_efcr_trend(uuid, bigint, date, date) TO service_role;

REFRESH MATERIALIZED VIEW analytics.daily_system_facts;
REFRESH MATERIALIZED VIEW analytics.production_summary;

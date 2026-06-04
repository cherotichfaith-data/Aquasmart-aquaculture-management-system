-- Migration: fix_clean_matview_rpcs
-- Date: 2026-06-04
-- Summary:
--   Recreate dashboard and production RPCs against the cleaned analytics
--   materialized views. The previous RPC bodies referenced columns/views
--   removed by clean_matviews.

DROP FUNCTION IF EXISTS public.api_system_options_rpc(uuid, public.system_growth_stage, boolean);
DROP FUNCTION IF EXISTS public.api_system_options_rpc(boolean, uuid, public.system_growth_stage);

CREATE FUNCTION public.api_system_options_rpc(
  p_farm_id uuid DEFAULT NULL,
  p_stage public.system_growth_stage DEFAULT NULL,
  p_active_only boolean DEFAULT true
)
RETURNS TABLE(
  id bigint,
  farm_id uuid,
  farm_name text,
  label text,
  name text,
  unit text,
  type text,
  growth_stage public.system_growth_stage,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT
    s.id,
    s.farm_id,
    f.name AS farm_name,
    CASE
      WHEN NULLIF(trim(s.unit), '') IS NOT NULL AND NULLIF(trim(s.name), '') IS NOT NULL
        THEN trim(s.unit) || ' - ' || trim(s.name)
      WHEN NULLIF(trim(s.name), '') IS NOT NULL THEN trim(s.name)
      WHEN NULLIF(trim(s.unit), '') IS NOT NULL THEN trim(s.unit)
      ELSE 'Missing cage name'
    END AS label,
    s.name,
    s.unit,
    s.type::text,
    s.growth_stage,
    s.is_active
  FROM public.system s
  JOIN public.farm f ON f.id = s.farm_id
  WHERE (p_farm_id IS NULL OR s.farm_id = p_farm_id)
    AND (p_farm_id IS NULL OR private.is_farm_member(p_farm_id))
    AND (p_stage IS NULL OR s.growth_stage = p_stage)
    AND (NOT COALESCE(p_active_only, true) OR s.is_active = true)
  ORDER BY s.is_active DESC, s.commissioned_at DESC NULLS LAST, s.id DESC;
$$;

ALTER FUNCTION public.api_system_options_rpc(uuid, public.system_growth_stage, boolean) OWNER TO postgres;
GRANT ALL ON FUNCTION public.api_system_options_rpc(uuid, public.system_growth_stage, boolean) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.api_production_summary(uuid, bigint, public.system_growth_stage, date, date);
DROP FUNCTION IF EXISTS public.api_production_summary(uuid, public.system_growth_stage, date, date, bigint);

CREATE FUNCTION public.api_production_summary(
  p_farm_id uuid,
  p_system_id bigint DEFAULT NULL,
  p_stage public.system_growth_stage DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE(
  cycle_id bigint,
  system_id bigint,
  system_name text,
  growth_stage text,
  ongoing_cycle boolean,
  date date,
  activity text,
  activity_rank integer,
  number_of_fish_stocked double precision,
  total_weight_stocked double precision,
  total_feed_amount_period double precision,
  daily_mortality_count double precision,
  number_of_fish_transfer_out double precision,
  total_weight_transfer_out double precision,
  number_of_fish_harvested double precision,
  total_weight_harvested double precision,
  average_body_weight double precision,
  number_of_fish_inventory double precision,
  total_biomass double precision,
  biomass_density double precision,
  feeding_rate double precision,
  biomass_increase_period double precision,
  total_feed_amount_aggregated double precision,
  biomass_increase_aggregated double precision,
  cumulative_mortality double precision,
  total_weight_transfer_out_aggregated double precision,
  total_weight_harvested_aggregated double precision,
  total_weight_stocked_aggregated double precision,
  number_of_fish_transfer_out_aggregated double precision,
  efcr_period double precision,
  efcr_aggregated double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'analytics'
AS $$
  SELECT
    ps.cycle_id,
    ps.system_id,
    ps.system_name,
    ps.growth_stage,
    ps.ongoing_cycle,
    ps.date,
    ps.activity,
    ps.activity_rank,
    ps.number_of_fish_stocked::double precision,
    ps.weight_stocked_kg::double precision AS total_weight_stocked,
    ps.feed_kg_period::double precision AS total_feed_amount_period,
    ps.mortality_count::double precision AS daily_mortality_count,
    ps.fish_transfer_out::double precision AS number_of_fish_transfer_out,
    ps.weight_transfer_out_kg::double precision AS total_weight_transfer_out,
    ps.fish_harvested::double precision AS number_of_fish_harvested,
    ps.weight_harvested_kg::double precision AS total_weight_harvested,
    ps.average_body_weight::double precision,
    ps.number_of_fish_inventory::double precision,
    ps.biomass_kg::double precision AS total_biomass,
    dsf.biomass_density::double precision,
    dsf.feeding_rate::double precision,
    ps.biomass_increase_period::double precision,
    ps.feed_kg_aggregated::double precision AS total_feed_amount_aggregated,
    ps.biomass_increase_aggregated::double precision,
    ps.cumulative_mortality::double precision,
    ps.weight_transfer_out_kg_aggregated::double precision AS total_weight_transfer_out_aggregated,
    ps.weight_harvested_kg_aggregated::double precision AS total_weight_harvested_aggregated,
    ps.weight_stocked_kg_aggregated::double precision AS total_weight_stocked_aggregated,
    ps.fish_transfer_out_aggregated::double precision AS number_of_fish_transfer_out_aggregated,
    ps.efcr_period::double precision,
    ps.efcr_aggregated::double precision
  FROM analytics.production_summary ps
  JOIN public.system s ON s.id = ps.system_id
  LEFT JOIN analytics.daily_system_facts dsf
    ON dsf.system_id = ps.system_id
   AND dsf.inventory_date = ps.date
  WHERE s.farm_id = p_farm_id
    AND private.app_rpc_scope_ok(p_farm_id, p_system_id, NULL, p_start_date, p_end_date)
    AND (p_system_id IS NULL OR ps.system_id = p_system_id)
    AND (p_stage IS NULL OR s.growth_stage = p_stage)
    AND (p_start_date IS NULL OR ps.date >= p_start_date)
    AND (p_end_date IS NULL OR ps.date <= p_end_date)
  ORDER BY ps.date DESC, ps.activity_rank DESC, ps.system_id DESC;
$$;

ALTER FUNCTION public.api_production_summary(uuid, bigint, public.system_growth_stage, date, date) OWNER TO postgres;
GRANT ALL ON FUNCTION public.api_production_summary(uuid, bigint, public.system_growth_stage, date, date) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.api_dashboard_systems(uuid, bigint, public.system_growth_stage, date, date);
DROP FUNCTION IF EXISTS public.api_dashboard_systems(uuid, public.system_growth_stage, date, date, bigint);

CREATE FUNCTION public.api_dashboard_systems(
  p_farm_id uuid,
  p_system_id bigint DEFAULT NULL,
  p_stage public.system_growth_stage DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE(
  system_id bigint,
  system_name text,
  growth_stage public.system_growth_stage,
  input_start_date date,
  input_end_date date,
  as_of_date date,
  fish_end double precision,
  biomass_end double precision,
  sampling_end_date date,
  sample_age_days integer,
  efcr double precision,
  efcr_date date,
  feed_total double precision,
  abw double precision,
  abw_delta double precision,
  abw_trend text,
  feeding_rate double precision,
  mortality_rate double precision,
  biomass_density double precision,
  missing_days_count integer,
  water_quality_rating_average text,
  water_quality_rating_numeric_average double precision,
  water_quality_latest_date date,
  worst_parameter text,
  worst_parameter_value double precision,
  worst_parameter_unit text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'analytics'
AS $$
  WITH sys AS (
    SELECT s.id AS system_id, s.name AS system_name, s.growth_stage
    FROM public.system s
    WHERE s.farm_id = p_farm_id
      AND private.app_rpc_scope_ok(p_farm_id, p_system_id, NULL, p_start_date, p_end_date)
      AND s.is_active = true
      AND COALESCE(s.cage_status, 'occupied'::public.cage_status_enum) <> 'retired'::public.cage_status_enum
      AND (p_stage IS NULL OR s.growth_stage = p_stage)
      AND (p_system_id IS NULL OR s.id = p_system_id)
  ),
  bounds AS (
    SELECT
      COALESCE(p_start_date, MIN(dsf.inventory_date), CURRENT_DATE) AS start_date,
      COALESCE(p_end_date, MAX(dsf.inventory_date), CURRENT_DATE) AS end_date
    FROM analytics.daily_system_facts dsf
    JOIN sys ON sys.system_id = dsf.system_id
  ),
  inv AS (
    SELECT dsf.*
    FROM analytics.daily_system_facts dsf
    JOIN sys ON sys.system_id = dsf.system_id
    CROSS JOIN bounds b
    WHERE dsf.inventory_date BETWEEN b.start_date AND b.end_date
  ),
  snap AS (
    SELECT DISTINCT ON (system_id)
      system_id,
      inventory_date AS as_of_date,
      number_of_fish AS fish_end,
      biomass_last_sampling AS biomass_end,
      abw_last_sampling AS abw,
      last_abw_date AS sampling_end_date,
      biomass_density
    FROM inv
    ORDER BY system_id, inventory_date DESC
  ),
  abw_ranked AS (
    SELECT
      system_id,
      abw_last_sampling AS abw,
      row_number() OVER (
        PARTITION BY system_id
        ORDER BY last_abw_date DESC NULLS LAST, inventory_date DESC
      ) AS rn
    FROM inv
    WHERE abw_last_sampling IS NOT NULL
      AND last_abw_date IS NOT NULL
  ),
  abw_delta AS (
    SELECT
      cur.system_id,
      (cur.abw - prev.abw)::double precision AS abw_delta,
      CASE
        WHEN prev.abw IS NULL OR cur.abw IS NULL OR cur.abw = prev.abw THEN 'flat'
        WHEN cur.abw > prev.abw THEN 'up'
        ELSE 'down'
      END AS abw_trend
    FROM abw_ranked cur
    LEFT JOIN abw_ranked prev ON prev.system_id = cur.system_id AND prev.rn = 2
    WHERE cur.rn = 1
  ),
  inv_agg AS (
    SELECT
      system_id,
      CASE WHEN SUM(COALESCE(biomass_last_sampling, 0)) > 0
        THEN SUM(COALESCE(feeding_rate, 0) * COALESCE(biomass_last_sampling, 0)) / SUM(COALESCE(biomass_last_sampling, 0))
        ELSE AVG(feeding_rate)
      END AS feeding_rate,
      CASE WHEN SUM(COALESCE(number_of_fish, 0)) > 0
        THEN SUM(COALESCE(mortality_rate, 0) * COALESCE(number_of_fish, 0)) / SUM(COALESCE(number_of_fish, 0))
        ELSE AVG(mortality_rate)
      END AS mortality_rate,
      COUNT(DISTINCT inventory_date)::integer AS days_present
    FROM inv
    GROUP BY system_id
  ),
  ps_window AS (
    SELECT ps.*
    FROM analytics.production_summary ps
    JOIN sys ON sys.system_id = ps.system_id
    CROSS JOIN bounds b
    WHERE ps.date BETWEEN b.start_date AND b.end_date
  ),
  ps_feed AS (
    SELECT system_id, SUM(COALESCE(feed_kg_period, 0))::double precision AS feed_total
    FROM ps_window
    GROUP BY system_id
  ),
  ps_latest AS (
    SELECT DISTINCT ON (system_id)
      system_id,
      date AS efcr_date,
      COALESCE(efcr_period, efcr_aggregated)::double precision AS efcr
    FROM ps_window
    WHERE efcr_period IS NOT NULL OR efcr_aggregated IS NOT NULL
    ORDER BY system_id, date DESC, activity_rank DESC
  ),
  sampling_latest AS (
    SELECT DISTINCT ON (b.system_id)
      b.system_id,
      fsw.date AS sampling_end_date
    FROM sys b
    CROSS JOIN bounds bo
    LEFT JOIN public.fish_sampling_weight fsw
      ON fsw.system_id = b.system_id
     AND fsw.date <= bo.end_date
    ORDER BY b.system_id, fsw.date DESC
  ),
  wq_window AS (
    SELECT wq.*
    FROM public.daily_water_quality_rating wq
    JOIN sys ON sys.system_id = wq.system_id
    CROSS JOIN bounds b
    WHERE wq.rating_date BETWEEN b.start_date AND b.end_date
  ),
  wq_avg AS (
    SELECT
      system_id,
      AVG(rating_numeric::double precision) AS rating_numeric_avg,
      public.water_quality_rating_label(AVG(rating_numeric::numeric)) AS rating_label_avg
    FROM wq_window
    GROUP BY system_id
  ),
  wq_latest AS (
    SELECT DISTINCT ON (system_id)
      system_id,
      rating_date AS latest_date,
      worst_parameter::text,
      worst_parameter_value::double precision,
      worst_parameter_unit::text
    FROM wq_window
    ORDER BY system_id, rating_date DESC, created_at DESC, id DESC
  )
  SELECT
    sys.system_id,
    sys.system_name,
    sys.growth_stage,
    b.start_date AS input_start_date,
    b.end_date AS input_end_date,
    snap.as_of_date,
    snap.fish_end,
    snap.biomass_end,
    COALESCE(sl.sampling_end_date, snap.sampling_end_date) AS sampling_end_date,
    CASE
      WHEN COALESCE(sl.sampling_end_date, snap.sampling_end_date) IS NULL THEN NULL
      ELSE (b.end_date - COALESCE(sl.sampling_end_date, snap.sampling_end_date))::integer
    END AS sample_age_days,
    pl.efcr,
    pl.efcr_date,
    pf.feed_total,
    snap.abw,
    ad.abw_delta,
    COALESCE(ad.abw_trend, 'flat') AS abw_trend,
    ia.feeding_rate,
    ia.mortality_rate,
    snap.biomass_density,
    GREATEST(0, (b.end_date - b.start_date + 1)::integer - COALESCE(ia.days_present, 0)) AS missing_days_count,
    wa.rating_label_avg AS water_quality_rating_average,
    wa.rating_numeric_avg AS water_quality_rating_numeric_average,
    wl.latest_date AS water_quality_latest_date,
    wl.worst_parameter,
    wl.worst_parameter_value,
    wl.worst_parameter_unit
  FROM sys
  CROSS JOIN bounds b
  LEFT JOIN snap ON snap.system_id = sys.system_id
  LEFT JOIN inv_agg ia ON ia.system_id = sys.system_id
  LEFT JOIN ps_feed pf ON pf.system_id = sys.system_id
  LEFT JOIN ps_latest pl ON pl.system_id = sys.system_id
  LEFT JOIN sampling_latest sl ON sl.system_id = sys.system_id
  LEFT JOIN abw_delta ad ON ad.system_id = sys.system_id
  LEFT JOIN wq_avg wa ON wa.system_id = sys.system_id
  LEFT JOIN wq_latest wl ON wl.system_id = sys.system_id
  ORDER BY sys.system_name;
$$;

ALTER FUNCTION public.api_dashboard_systems(uuid, bigint, public.system_growth_stage, date, date) OWNER TO postgres;
GRANT ALL ON FUNCTION public.api_dashboard_systems(uuid, bigint, public.system_growth_stage, date, date) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.api_dashboard_consolidated(uuid, bigint, public.system_growth_stage, date, date, text, integer, boolean);
DROP FUNCTION IF EXISTS public.api_dashboard_consolidated(uuid, public.system_growth_stage, date, date, bigint, text, integer, boolean);

CREATE FUNCTION public.api_dashboard_consolidated(
  p_farm_id uuid,
  p_system_id bigint DEFAULT NULL,
  p_stage public.system_growth_stage DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_time_period text DEFAULT NULL,
  p_limit integer DEFAULT NULL,
  p_order_desc boolean DEFAULT true
)
RETURNS TABLE(
  system_id bigint,
  time_period text,
  input_start_date date,
  input_end_date date,
  efcr_period_consolidated double precision,
  efcr_period_consolidated_delta double precision,
  mortality_rate double precision,
  mortality_rate_delta double precision,
  abw_asof_end double precision,
  abw_asof_end_delta double precision,
  average_biomass double precision,
  average_biomass_delta double precision,
  biomass_density double precision,
  biomass_density_delta double precision,
  feeding_rate double precision,
  feeding_rate_delta double precision,
  water_quality_rating_average text,
  water_quality_rating_numeric_average double precision,
  water_quality_rating_numeric_delta double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'analytics'
AS $$
  WITH sys AS (
    SELECT s.id AS system_id
    FROM public.system s
    WHERE s.farm_id = p_farm_id
      AND private.app_rpc_scope_ok(p_farm_id, p_system_id, NULL, p_start_date, p_end_date)
      AND s.is_active = true
      AND COALESCE(s.cage_status, 'occupied'::public.cage_status_enum) <> 'retired'::public.cage_status_enum
      AND (p_stage IS NULL OR s.growth_stage = p_stage)
      AND (p_system_id IS NULL OR s.id = p_system_id)
  ),
  bounds AS (
    SELECT
      COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days')::date AS start_date,
      COALESCE(p_end_date, CURRENT_DATE)::date AS end_date
  ),
  inv AS (
    SELECT dsf.*
    FROM analytics.daily_system_facts dsf
    JOIN sys ON sys.system_id = dsf.system_id
    CROSS JOIN bounds b
    WHERE dsf.inventory_date BETWEEN b.start_date AND b.end_date
  ),
  snap AS (
    SELECT DISTINCT ON (system_id)
      system_id,
      abw_last_sampling,
      biomass_last_sampling
    FROM inv
    ORDER BY system_id, inventory_date DESC
  ),
  ps AS (
    SELECT ps.*
    FROM analytics.production_summary ps
    JOIN sys ON sys.system_id = ps.system_id
    CROSS JOIN bounds b
    WHERE ps.date BETWEEN b.start_date AND b.end_date
  ),
  wq AS (
    SELECT wq.*
    FROM public.daily_water_quality_rating wq
    JOIN sys ON sys.system_id = wq.system_id
    CROSS JOIN bounds b
    WHERE wq.rating_date BETWEEN b.start_date AND b.end_date
  ),
  agg AS (
    SELECT
      (SELECT COALESCE(
        (SUM(feed_kg_period) / NULLIF(SUM(NULLIF(efcr_den, 0)), 0))::double precision,
        MAX(efcr_aggregated)::double precision,
        MAX(efcr_period)::double precision
      )
       FROM (
         SELECT
           feed_kg_period,
           efcr_period,
           efcr_aggregated,
           CASE WHEN efcr_period > 0 THEN feed_kg_period / efcr_period ELSE NULL END AS efcr_den
         FROM ps
       ) x
      ) AS efcr,
      (SELECT CASE WHEN SUM(COALESCE(number_of_fish, 0)) > 0
        THEN SUM(COALESCE(mortality_rate, 0) * COALESCE(number_of_fish, 0)) / SUM(COALESCE(number_of_fish, 0))
        ELSE AVG(mortality_rate)
      END FROM inv) AS mortality,
      (SELECT AVG(abw_last_sampling) FROM snap WHERE abw_last_sampling IS NOT NULL) AS abw,
      (SELECT SUM(COALESCE(biomass_last_sampling, 0)) FROM snap) AS biomass,
      (SELECT AVG(biomass_density) FROM inv WHERE biomass_density IS NOT NULL) AS density,
      (SELECT CASE WHEN SUM(COALESCE(biomass_last_sampling, 0)) > 0
        THEN SUM(COALESCE(feeding_rate, 0) * COALESCE(biomass_last_sampling, 0)) / SUM(COALESCE(biomass_last_sampling, 0))
        ELSE AVG(feeding_rate)
      END FROM inv) AS feeding,
      (SELECT AVG(rating_numeric::double precision) FROM wq) AS wq_numeric
  )
  SELECT
    NULL::bigint AS system_id,
    COALESCE(p_time_period, 'custom')::text AS time_period,
    b.start_date AS input_start_date,
    b.end_date AS input_end_date,
    agg.efcr AS efcr_period_consolidated,
    NULL::double precision AS efcr_period_consolidated_delta,
    agg.mortality AS mortality_rate,
    NULL::double precision AS mortality_rate_delta,
    agg.abw AS abw_asof_end,
    NULL::double precision AS abw_asof_end_delta,
    agg.biomass AS average_biomass,
    NULL::double precision AS average_biomass_delta,
    agg.density AS biomass_density,
    NULL::double precision AS biomass_density_delta,
    agg.feeding AS feeding_rate,
    NULL::double precision AS feeding_rate_delta,
    public.water_quality_rating_label(agg.wq_numeric::numeric) AS water_quality_rating_average,
    agg.wq_numeric AS water_quality_rating_numeric_average,
    NULL::double precision AS water_quality_rating_numeric_delta
  FROM agg
  CROSS JOIN bounds b;
$$;

ALTER FUNCTION public.api_dashboard_consolidated(uuid, bigint, public.system_growth_stage, date, date, text, integer, boolean) OWNER TO postgres;
GRANT ALL ON FUNCTION public.api_dashboard_consolidated(uuid, bigint, public.system_growth_stage, date, date, text, integer, boolean) TO authenticated, service_role;




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "analytics";


ALTER SCHEMA "analytics" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."arrows" AS ENUM (
    'up',
    'down',
    'straight'
);


ALTER TYPE "public"."arrows" OWNER TO "postgres";


CREATE TYPE "public"."cage_status_enum" AS ENUM (
    'occupied',
    'available',
    'retired'
);


ALTER TYPE "public"."cage_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."change_type_enum" AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE'
);


ALTER TYPE "public"."change_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."farm_user_invitation_rpc_result" AS (
	"id" "uuid",
	"farm_id" "uuid",
	"email" "text",
	"role" "text",
	"status" "text",
	"invited_by" "uuid",
	"invited_user_id" "uuid",
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"last_sent_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"should_send_auth_invite" boolean
);


ALTER TYPE "public"."farm_user_invitation_rpc_result" OWNER TO "postgres";


CREATE TYPE "public"."feed_category" AS ENUM (
    'pre-starter',
    'starter',
    'pre-grower',
    'grower',
    'finisher',
    'broodstock',
    'unknown'
);


ALTER TYPE "public"."feed_category" OWNER TO "postgres";


CREATE TYPE "public"."feed_pellet_size" AS ENUM (
    'mash_powder',
    '<0.49mm',
    '0.5-0.99mm',
    '1.0-1.5mm',
    '1.5-1.99mm',
    '2mm',
    '2.5mm',
    '3mm',
    '3.5mm',
    '4mm',
    '4.5mm',
    '5mm',
    'unknown',
    '0.5mm',
    '0.5-1.0mm',
    '0.9-1.6mm'
);


ALTER TYPE "public"."feed_pellet_size" OWNER TO "postgres";


CREATE TYPE "public"."system_growth_stage" AS ENUM (
    'fingerling',
    'juvenile',
    'sub_adult',
    'broodstock'
);


ALTER TYPE "public"."system_growth_stage" OWNER TO "postgres";


CREATE TYPE "public"."system_type" AS ENUM (
    'cage',
    'compartment',
    'all_active_cages',
    'rectangular_cage',
    'circular_cage',
    'pond',
    'tank'
);


ALTER TYPE "public"."system_type" OWNER TO "postgres";


CREATE TYPE "public"."time_period" AS ENUM (
    'day',
    'week',
    '2 weeks',
    'month',
    'quarter',
    '6 months',
    'year'
);


ALTER TYPE "public"."time_period" OWNER TO "postgres";


CREATE TYPE "public"."transfer_type" AS ENUM (
    'transfer',
    'grading',
    'density_thinning',
    'broodstock',
    'count_check',
    'lab_sample',
    'training',
    'external_out'
);


ALTER TYPE "public"."transfer_type" OWNER TO "postgres";


CREATE TYPE "public"."type_of_harvest" AS ENUM (
    'partial',
    'final'
);


ALTER TYPE "public"."type_of_harvest" OWNER TO "postgres";


CREATE TYPE "public"."type_of_stocking" AS ENUM (
    'empty',
    'already_stocked'
);


ALTER TYPE "public"."type_of_stocking" OWNER TO "postgres";


CREATE TYPE "public"."units" AS ENUM (
    'm',
    'mg/l',
    'ppt',
    '°C',
    'pH',
    'NTU',
    'µS/cm'
);


ALTER TYPE "public"."units" OWNER TO "postgres";


CREATE TYPE "public"."water_quality_parameters" AS ENUM (
    'pH',
    'temperature',
    'dissolved_oxygen',
    'secchi_disk_depth',
    'nitrite',
    'nitrate',
    'ammonia',
    'salinity'
);


ALTER TYPE "public"."water_quality_parameters" OWNER TO "postgres";


CREATE TYPE "public"."water_quality_rating" AS ENUM (
    'optimal',
    'acceptable',
    'critical',
    'lethal'
);


ALTER TYPE "public"."water_quality_rating" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."after_event_update_inventory"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_origin_id bigint;
  v_target_id bigint;
  v_system_id bigint;
BEGIN
  IF tg_table_name = 'fish_transfer' THEN
    v_origin_id := COALESCE(NEW.origin_system_id, OLD.origin_system_id);
    v_target_id := COALESCE(NEW.target_system_id, OLD.target_system_id);
    IF v_origin_id IS NOT NULL THEN
      INSERT INTO public._affected_systems (system_id)
      VALUES (v_origin_id)
      ON CONFLICT (system_id) DO NOTHING;
    END IF;
    IF v_target_id IS NOT NULL THEN
      INSERT INTO public._affected_systems (system_id)
      VALUES (v_target_id)
      ON CONFLICT (system_id) DO NOTHING;
    END IF;
  ELSE
    v_system_id := COALESCE(NEW.system_id, OLD.system_id);
    IF v_system_id IS NOT NULL THEN
      INSERT INTO public._affected_systems (system_id)
      VALUES (v_system_id)
      ON CONFLICT (system_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."after_event_update_inventory"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."after_event_update_inventory"() IS 'Registers affected system(s) and triggers scoped daily inventory recomputation.';



CREATE OR REPLACE FUNCTION "public"."api_cycle_benchmarks"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint) RETURNS TABLE("system_id" bigint, "system_name" "text", "current_cycle_start" "date", "current_efcr" double precision, "current_adg_g_day" double precision, "current_survival_pct" double precision, "current_abw_g" double precision, "current_days_in_cycle" integer, "best_efcr" double precision, "best_efcr_cycle_start" "date", "best_adg_g_day" double precision, "best_survival_pct" double precision, "efcr_vs_best" double precision, "adg_vs_best" double precision, "survival_vs_best" double precision, "benchmark_label" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
begin
  if not private.is_farm_member(p_farm_id) then
    return;
  end if;

  perform private.assert_rpc_parameters(
    p_farm_id := p_farm_id,
    p_system_id := p_system_id,
    p_batch_id := null,
    p_start_date := null,
    p_end_date := null
  );


  RETURN QUERY
  WITH
  current_cycle AS (
    SELECT
      ps.system_id,
      MIN(ps.date) AS cycle_start,
      (ARRAY_AGG(ps.efcr_aggregated ORDER BY ps.date DESC)
        FILTER (WHERE ps.efcr_aggregated IS NOT NULL))[1] AS efcr_agg,
      (ARRAY_AGG(ps.average_body_weight ORDER BY ps.date DESC)
        FILTER (WHERE ps.average_body_weight IS NOT NULL))[1] AS latest_abw_g,
      MAX(ps.number_of_fish_stocked) AS total_stocked,
      MAX(ps.cumulative_mortality) AS cum_mortality,
      NULL::double precision AS adg_placeholder
    FROM analytics.production_summary ps
    JOIN public.system s ON s.id = ps.system_id
    WHERE s.farm_id = p_farm_id
      AND ps.ongoing_cycle = TRUE
      AND (p_system_id IS NULL OR ps.system_id = p_system_id)
    GROUP BY ps.system_id
  ),
  current_adg AS (
    SELECT DISTINCT ON (fsw.system_id)
      fsw.system_id,
      (fsw.abw - LAG(fsw.abw) OVER (PARTITION BY fsw.system_id ORDER BY fsw.date))::double precision
      / NULLIF((fsw.date - LAG(fsw.date) OVER (PARTITION BY fsw.system_id ORDER BY fsw.date)), 0) AS adg_g_day
    FROM public.fish_sampling_weight fsw
    JOIN current_cycle cc ON cc.system_id = fsw.system_id
    WHERE fsw.date >= cc.cycle_start
    ORDER BY fsw.system_id, fsw.date DESC
  ),
  completed_cycles AS (
    SELECT
      ps.system_id,
      ps.cycle_id,
      MIN(ps.date) AS cycle_start,
      (ARRAY_AGG(ps.efcr_aggregated ORDER BY ps.date DESC)
        FILTER (WHERE ps.efcr_aggregated IS NOT NULL AND ps.efcr_aggregated > 0))[1] AS efcr_agg,
      MAX(ps.number_of_fish_stocked) AS total_stocked,
      MAX(ps.cumulative_mortality) AS cum_mortality,
      AVG(NULLIF(ps.average_body_weight, 0)) AS avg_abw_g
    FROM analytics.production_summary ps
    JOIN public.system s ON s.id = ps.system_id
    WHERE s.farm_id = p_farm_id
      AND ps.ongoing_cycle = FALSE
      AND (p_system_id IS NULL OR ps.system_id = p_system_id)
    GROUP BY ps.system_id, ps.cycle_id
  ),
  best_cycle AS (
    SELECT DISTINCT ON (ccy.system_id)
      ccy.system_id,
      ccy.cycle_start AS best_cycle_start,
      ccy.efcr_agg AS best_efcr,
      CASE
        WHEN ccy.total_stocked > 0 THEN (1 - ccy.cum_mortality / NULLIF(ccy.total_stocked, 0)) * 100
        ELSE NULL
      END AS best_survival_pct,
      NULL::double precision AS best_adg_g_day
    FROM completed_cycles ccy
    WHERE ccy.efcr_agg IS NOT NULL AND ccy.efcr_agg > 0
    ORDER BY ccy.system_id, ccy.efcr_agg ASC
  )
  SELECT
    s.id AS system_id,
    s.name AS system_name,
    cc.cycle_start AS current_cycle_start,
    cc.efcr_agg AS current_efcr,
    ca.adg_g_day AS current_adg_g_day,
    CASE
      WHEN cc.total_stocked > 0 THEN (1 - cc.cum_mortality / NULLIF(cc.total_stocked, 0)) * 100
      ELSE NULL
    END AS current_survival_pct,
    cc.latest_abw_g AS current_abw_g,
    (CURRENT_DATE - cc.cycle_start)::integer AS current_days_in_cycle,
    bc.best_efcr,
    bc.best_cycle_start AS best_efcr_cycle_start,
    bc.best_adg_g_day,
    bc.best_survival_pct,
    (cc.efcr_agg - bc.best_efcr) AS efcr_vs_best,
    (ca.adg_g_day - bc.best_adg_g_day) AS adg_vs_best,
    ((1 - cc.cum_mortality / NULLIF(cc.total_stocked, 0)) * 100 - bc.best_survival_pct) AS survival_vs_best,
    CASE
      WHEN bc.best_efcr IS NULL OR cc.efcr_agg IS NULL THEN 'no_history'
      WHEN cc.efcr_agg <= bc.best_efcr * 1.05 THEN 'best_ever'
      WHEN cc.efcr_agg <= bc.best_efcr * 1.15 THEN 'above_avg'
      WHEN cc.efcr_agg <= bc.best_efcr * 1.30 THEN 'average'
      ELSE 'below_avg'
    END AS benchmark_label
  FROM public.system s
  JOIN current_cycle cc ON cc.system_id = s.id
  LEFT JOIN current_adg ca ON ca.system_id = s.id
  LEFT JOIN best_cycle bc ON bc.system_id = s.id
  WHERE s.farm_id = p_farm_id
    AND s.is_active
    AND (p_system_id IS NULL OR s.id = p_system_id)
  ORDER BY cc.efcr_agg DESC NULLS LAST;
END;
$$;


ALTER FUNCTION "public"."api_cycle_benchmarks"("p_farm_id" "uuid", "p_system_id" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."api_cycle_benchmarks"("p_farm_id" "uuid", "p_system_id" bigint) IS 'Intentional app-facing SECURITY DEFINER RPC. Direct access to internal read models is revoked; callers must be authenticated and function body must enforce farm membership/scope checks.';



CREATE OR REPLACE FUNCTION "public"."api_daily_fish_inventory_rpc"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint, "p_stage" "public"."system_growth_stage" DEFAULT NULL::"public"."system_growth_stage", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date", "p_cursor_date" "date" DEFAULT NULL::"date", "p_cursor_system_id" bigint DEFAULT NULL::bigint, "p_order_asc" boolean DEFAULT false, "p_limit" integer DEFAULT 5000) RETURNS TABLE("inventory_date" "date", "system_id" bigint, "farm_id" "uuid", "system_name" "text", "production_cycle_id" bigint, "batch_id" bigint, "growth_stage" "text", "number_of_fish" double precision, "number_of_fish_mortality" double precision, "feeding_amount" double precision, "abw_last_sampling" double precision, "last_abw_date" "date", "biomass_last_sampling" double precision, "feeding_rate" double precision, "system_volume" double precision, "biomass_density" double precision, "mortality_rate" double precision, "has_abw" boolean, "has_inventory_count" boolean, "has_feed_record" boolean)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'analytics'
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


ALTER FUNCTION "public"."api_daily_fish_inventory_rpc"("p_farm_id" "uuid", "p_system_id" bigint, "p_stage" "public"."system_growth_stage", "p_start_date" "date", "p_end_date" "date", "p_cursor_date" "date", "p_cursor_system_id" bigint, "p_order_asc" boolean, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_dashboard_consolidated"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint, "p_stage" "public"."system_growth_stage" DEFAULT NULL::"public"."system_growth_stage", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date", "p_time_period" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT NULL::integer, "p_order_desc" boolean DEFAULT true) RETURNS TABLE("system_id" bigint, "time_period" "text", "input_start_date" "date", "input_end_date" "date", "efcr_period_consolidated" double precision, "efcr_period_consolidated_delta" double precision, "mortality_rate" double precision, "mortality_rate_delta" double precision, "abw_asof_end" double precision, "abw_asof_end_delta" double precision, "average_biomass" double precision, "average_biomass_delta" double precision, "biomass_density" double precision, "biomass_density_delta" double precision, "feeding_rate" double precision, "feeding_rate_delta" double precision, "water_quality_rating_average" "text", "water_quality_rating_numeric_average" double precision, "water_quality_rating_numeric_delta" double precision)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'analytics'
    AS $$
WITH
sys AS (
  SELECT s.id AS system_id
  FROM public.system s
  WHERE s.farm_id = p_farm_id
    AND private.app_rpc_scope_ok(p_farm_id, p_system_id, NULL, p_start_date, p_end_date)
    AND s.is_active = TRUE
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
    system_id, abw_last_sampling, biomass_last_sampling
  FROM inv
  ORDER BY system_id, inventory_date DESC
),

ps_period AS (
  SELECT DISTINCT ON (ps.system_id, ps.date)
    ps.system_id,
    ps.feed_kg_period,
    ps.biomass_increase_period
  FROM analytics.production_summary ps
  JOIN sys ON sys.system_id = ps.system_id
  CROSS JOIN bounds b
  WHERE ps.date BETWEEN b.start_date AND b.end_date
  ORDER BY ps.system_id, ps.date, ps.activity_rank DESC
),
efcr_period_calc AS (
  SELECT
    SUM(feed_kg_period)                           AS total_feed_period,
    SUM(GREATEST(biomass_increase_period, 0))     AS total_growth_period
  FROM ps_period
),

ps_latest AS (
  SELECT DISTINCT ON (ps.system_id)
    ps.system_id,
    ps.cycle_id,
    ps.feed_kg_aggregated,
    ps.biomass_increase_aggregated,
    ps.number_of_fish_inventory
  FROM analytics.production_summary ps
  JOIN sys ON sys.system_id = ps.system_id
  ORDER BY ps.system_id, ps.date DESC, ps.activity_rank DESC
),
one_per_cycle AS (
  SELECT DISTINCT ON (cycle_id)
    cycle_id,
    feed_kg_aggregated,
    biomass_increase_aggregated
  FROM ps_latest
  WHERE biomass_increase_aggregated > 0
  ORDER BY cycle_id, number_of_fish_inventory DESC NULLS LAST
),
efcr_agg_calc AS (
  SELECT
    SUM(feed_kg_aggregated)                       AS total_feed_agg,
    SUM(biomass_increase_aggregated)              AS total_growth_agg
  FROM one_per_cycle
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
    -- Period eFCR: total farm feed used / total farm biomass growth in window
    CASE
      WHEN ep.total_growth_period > 0
      THEN (ep.total_feed_period / ep.total_growth_period)::double precision
      ELSE NULL
    END                                                                    AS efcr_period,
    -- Aggregated eFCR: total farm feed used / total farm biomass growth since cycle starts
    CASE
      WHEN ea.total_growth_agg > 0
      THEN (ea.total_feed_agg / ea.total_growth_agg)::double precision
      ELSE NULL
    END                                                                    AS efcr_aggregated,
    (SELECT CASE WHEN SUM(COALESCE(number_of_fish, 0)) > 0
                 THEN SUM(COALESCE(mortality_rate, 0) * COALESCE(number_of_fish, 0))
                      / SUM(COALESCE(number_of_fish, 0))
                 ELSE AVG(mortality_rate)
            END FROM inv)                                                   AS mortality,
    (SELECT AVG(abw_last_sampling) FROM snap WHERE abw_last_sampling IS NOT NULL) AS abw,
    (SELECT SUM(COALESCE(biomass_last_sampling, 0)) FROM snap)             AS biomass,
    (SELECT AVG(biomass_density) FROM inv WHERE biomass_density IS NOT NULL) AS density,
    (SELECT CASE WHEN SUM(COALESCE(biomass_last_sampling, 0)) > 0
                 THEN SUM(COALESCE(feeding_rate, 0) * COALESCE(biomass_last_sampling, 0))
                      / SUM(COALESCE(biomass_last_sampling, 0))
                 ELSE AVG(feeding_rate)
            END FROM inv)                                                   AS feeding,
    (SELECT AVG(rating_numeric::double precision) FROM wq)                 AS wq_numeric
  FROM efcr_period_calc ep
  CROSS JOIN efcr_agg_calc ea
)
SELECT
  NULL::bigint                                                              AS system_id,
  COALESCE(p_time_period, 'custom')::text                                  AS time_period,
  b.start_date                                                              AS input_start_date,
  b.end_date                                                                AS input_end_date,
  -- Expose period eFCR as the primary KPI card value (feed/growth within the selected window)
  agg.efcr_period                                                           AS efcr_period_consolidated,
  NULL::double precision                                                    AS efcr_period_consolidated_delta,
  agg.mortality                                                             AS mortality_rate,
  NULL::double precision                                                    AS mortality_rate_delta,
  agg.abw                                                                   AS abw_asof_end,
  NULL::double precision                                                    AS abw_asof_end_delta,
  agg.biomass                                                               AS average_biomass,
  NULL::double precision                                                    AS average_biomass_delta,
  agg.density                                                               AS biomass_density,
  NULL::double precision                                                    AS biomass_density_delta,
  agg.feeding                                                               AS feeding_rate,
  NULL::double precision                                                    AS feeding_rate_delta,
  public.water_quality_rating_label(agg.wq_numeric::numeric)               AS water_quality_rating_average,
  agg.wq_numeric                                                            AS water_quality_rating_numeric_average,
  NULL::double precision                                                    AS water_quality_rating_numeric_delta
FROM agg
CROSS JOIN bounds b;
$$;


ALTER FUNCTION "public"."api_dashboard_consolidated"("p_farm_id" "uuid", "p_system_id" bigint, "p_stage" "public"."system_growth_stage", "p_start_date" "date", "p_end_date" "date", "p_time_period" "text", "p_limit" integer, "p_order_desc" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_dashboard_systems"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint, "p_stage" "public"."system_growth_stage" DEFAULT NULL::"public"."system_growth_stage", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("system_id" bigint, "system_name" "text", "growth_stage" "public"."system_growth_stage", "input_start_date" "date", "input_end_date" "date", "as_of_date" "date", "fish_end" double precision, "biomass_end" double precision, "sampling_end_date" "date", "sample_age_days" integer, "efcr" double precision, "efcr_date" "date", "feed_total" double precision, "abw" double precision, "abw_delta" double precision, "abw_trend" "text", "feeding_rate" double precision, "mortality_rate" double precision, "biomass_density" double precision, "missing_days_count" integer, "water_quality_rating_average" "text", "water_quality_rating_numeric_average" double precision, "water_quality_latest_date" "date", "worst_parameter" "text", "worst_parameter_value" double precision, "worst_parameter_unit" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'analytics'
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


ALTER FUNCTION "public"."api_dashboard_systems"("p_farm_id" "uuid", "p_system_id" bigint, "p_stage" "public"."system_growth_stage", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_efcr_trend"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint, "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("system_id" bigint, "farm_id" "uuid", "inventory_date" "date", "efcr_period" numeric, "efcr_aggregated" numeric, "biomass_last_sampling" numeric, "system_name" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'analytics'
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


ALTER FUNCTION "public"."api_efcr_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_farm_options_rpc"() RETURNS TABLE("id" "uuid", "label" "text", "location" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
  select f.id, f.name as label, f.location
  from public.farm f
  where private.is_farm_member(f.id)
  order by f.name;
$$;


ALTER FUNCTION "public"."api_farm_options_rpc"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."api_farm_options_rpc"() IS 'Intentional app-facing SECURITY DEFINER RPC. Direct access to internal read models is revoked; callers must be authenticated and function body must enforce farm membership/scope checks.';



CREATE OR REPLACE FUNCTION "public"."api_farm_user_invitations"("p_farm_id" "uuid") RETURNS TABLE("id" "uuid", "farm_id" "uuid", "email" "text", "role" "text", "status" "text", "invited_by" "uuid", "invited_user_id" "uuid", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "last_sent_at" timestamp with time zone, "accepted_at" timestamp with time zone, "revoked_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
begin
  if auth.uid() is null
     or not private.has_farm_role(p_farm_id, array['admin'], auth.uid()) then
    raise insufficient_privilege using errcode = '42501';
  end if;

  return query
  select
    i.id,
    i.farm_id,
    i.email,
    i.role,
    i.status,
    i.invited_by,
    i.invited_user_id,
    i.created_at,
    i.updated_at,
    i.last_sent_at,
    i.accepted_at,
    i.revoked_at
  from private.farm_user_invitation i
  where i.farm_id = p_farm_id
    and i.status = 'pending'
    and i.revoked_at is null
    and i.accepted_at is null
  order by i.created_at desc;
end;
$$;


ALTER FUNCTION "public"."api_farm_user_invitations"("p_farm_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_feed_fcr_intervals"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint, "p_date_from" "date" DEFAULT NULL::"date", "p_date_to" "date" DEFAULT NULL::"date") RETURNS TABLE("system_id" bigint, "system_name" "text", "interval_start" "date", "interval_end" "date", "interval_days" integer, "abw_start_g" double precision, "abw_end_g" double precision, "live_fish" integer, "total_feed_kg" double precision, "sgr_pct_per_day" double precision, "efcr_period" double precision, "dominant_feed_type" "text", "warning" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'analytics', 'pg_temp'
    AS $$
BEGIN
  IF NOT private.is_farm_member(p_farm_id) THEN
    RETURN;
  END IF;

  PERFORM private.assert_rpc_parameters(
    p_farm_id  := p_farm_id,
    p_system_id := p_system_id,
    p_batch_id  := null,
    p_start_date := p_date_from,
    p_end_date  := p_date_to
  );

  RETURN QUERY
  WITH sys AS (
    SELECT s.id AS system_id, s.name AS system_name
    FROM public.system s
    WHERE s.farm_id = p_farm_id
      AND (p_system_id IS NULL OR s.id = p_system_id)
  ),
  -- Sampling events only from production_summary (activity = 'sampling')
  samples AS (
    SELECT
      ps.system_id,
      ps.cycle_id,
      ps.system_name,
      ps.date         AS sample_date,
      ps.average_body_weight::double precision AS abw_g
    FROM analytics.production_summary ps
    JOIN sys ON sys.system_id = ps.system_id
    WHERE ps.activity = 'sampling'
      AND ps.average_body_weight IS NOT NULL
      AND ps.average_body_weight > 0
  ),
  -- Consecutive sampling intervals
  intervals AS (
    SELECT
      sm.system_id,
      sm.system_name,
      LAG(sm.sample_date) OVER sample_window    AS interval_start,
      sm.sample_date                             AS interval_end,
      (sm.sample_date - LAG(sm.sample_date) OVER sample_window)::integer AS interval_days,
      LAG(sm.abw_g)  OVER sample_window         AS abw_start_g,
      sm.abw_g                                  AS abw_end_g
    FROM samples sm
    WINDOW sample_window AS (PARTITION BY sm.system_id, sm.cycle_id ORDER BY sm.sample_date)
  ),
  valid_intervals AS (
    SELECT iv.*
    FROM intervals iv
    WHERE iv.interval_start IS NOT NULL
      AND iv.interval_days > 0
      AND (p_date_from IS NULL OR iv.interval_end  >= p_date_from)
      AND (p_date_to   IS NULL OR iv.interval_start <= p_date_to)
  ),
  -- Feed and efcr_period sourced from production_summary (single source of truth)
  ps_in_interval AS (
    SELECT
      vi.system_id,
      vi.interval_start,
      vi.interval_end,
      SUM(ps.feed_kg_period)::double precision AS total_feed_kg,
      -- Take the latest efcr_period within the interval as the interval's FCR
      (ARRAY_AGG(ps.efcr_period ORDER BY ps.date DESC, ps.activity_rank DESC)
         FILTER (WHERE ps.efcr_period IS NOT NULL))[1]::double precision AS efcr_period
    FROM valid_intervals vi
    JOIN analytics.production_summary ps
      ON ps.system_id = vi.system_id
      AND ps.date > vi.interval_start
      AND ps.date <= vi.interval_end
    GROUP BY vi.system_id, vi.interval_start, vi.interval_end
  ),
  -- Latest fish count at interval end from daily_system_facts
  fish_at_end AS (
    SELECT DISTINCT ON (vi.system_id, vi.interval_start, vi.interval_end)
      vi.system_id,
      vi.interval_start,
      vi.interval_end,
      dsf.number_of_fish::integer AS live_fish
    FROM valid_intervals vi
    LEFT JOIN analytics.daily_system_facts dsf
      ON dsf.system_id = vi.system_id
      AND dsf.inventory_date <= vi.interval_end
      AND dsf.number_of_fish IS NOT NULL
    ORDER BY vi.system_id, vi.interval_start, vi.interval_end, dsf.inventory_date DESC
  )
  SELECT
    vi.system_id,
    vi.system_name,
    vi.interval_start,
    vi.interval_end,
    vi.interval_days,
    vi.abw_start_g,
    vi.abw_end_g,
    COALESCE(fe.live_fish, 0)::integer,
    COALESCE(pi.total_feed_kg, 0)::double precision,
    CASE
      WHEN vi.interval_days > 0 AND vi.abw_end_g > 0 AND vi.abw_start_g > 0
      THEN (100.0 * (LN(vi.abw_end_g) - LN(vi.abw_start_g)) / vi.interval_days)::double precision
      ELSE NULL::double precision
    END AS sgr_pct_per_day,
    pi.efcr_period,
    NULL::text AS dominant_feed_type,
    CASE
      WHEN vi.interval_days > 60        THEN 'Interval > 60 days: sample data may be missing'
      WHEN COALESCE(pi.total_feed_kg, 0) = 0 THEN 'No feed events in production_summary for this interval'
      WHEN vi.abw_end_g <= vi.abw_start_g THEN 'No positive growth in this interval'
      ELSE NULL::text
    END AS warning
  FROM valid_intervals vi
  LEFT JOIN ps_in_interval pi
    ON pi.system_id = vi.system_id
    AND pi.interval_start = vi.interval_start
    AND pi.interval_end   = vi.interval_end
  LEFT JOIN fish_at_end fe
    ON fe.system_id = vi.system_id
    AND fe.interval_start = vi.interval_start
    AND fe.interval_end   = vi.interval_end
  ORDER BY vi.system_id, vi.interval_start;
END;
$$;


ALTER FUNCTION "public"."api_feed_fcr_intervals"("p_farm_id" "uuid", "p_system_id" bigint, "p_date_from" "date", "p_date_to" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_feed_rate_analysis"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint, "p_date_from" "date" DEFAULT NULL::"date", "p_date_to" "date" DEFAULT NULL::"date") RETURNS TABLE("system_id" bigint, "system_name" "text", "feed_date" "date", "feed_kg" double precision, "biomass_kg" double precision, "abw_g" double precision, "live_fish" integer, "feed_rate_pct" double precision, "lower_band_pct" double precision, "upper_band_pct" double precision, "pellet_size" "text", "status" "text", "detail" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'analytics', 'pg_temp'
    AS $$
BEGIN
  IF NOT private.is_farm_member(p_farm_id) THEN
    RETURN;
  END IF;

  PERFORM private.assert_rpc_parameters(
    p_farm_id   := p_farm_id,
    p_system_id := p_system_id,
    p_batch_id  := null,
    p_start_date := p_date_from,
    p_end_date  := p_date_to
  );

  RETURN QUERY
  WITH pellet_guide (min_abw_g, max_abw_g, pellet, lower_pct, upper_pct) AS (
    VALUES
      (0.0::double precision,   1.0::double precision,    'Crumble / powder'::text, 15.0::double precision, 20.0::double precision),
      (1.0::double precision,   10.0::double precision,   '1.0-1.5 mm'::text,       8.0::double precision,  15.0::double precision),
      (10.0::double precision,  50.0::double precision,   '2.0 mm'::text,            5.0::double precision,   8.0::double precision),
      (50.0::double precision,  200.0::double precision,  '3.0 mm'::text,            3.0::double precision,   5.0::double precision),
      (200.0::double precision, NULL::double precision,   '4-6 mm'::text,            2.0::double precision,   3.0::double precision)
  ),
  -- Single source: daily_system_facts provides feeding_amount (daily), feeding_rate, biomass, abw, fish count
  dsf AS (
    SELECT
      d.system_id,
      d.system_name,
      d.inventory_date          AS feed_date,
      d.feeding_amount          AS feed_kg,
      d.biomass_last_sampling   AS biomass_kg,
      d.abw_last_sampling       AS abw_g,
      d.number_of_fish::integer AS live_fish,
      d.feeding_rate            AS feed_rate_pct  -- already = (feeding_amount/biomass)*100
    FROM analytics.daily_system_facts d
    JOIN public.system s ON s.id = d.system_id
    WHERE s.farm_id = p_farm_id
      AND (p_system_id IS NULL OR d.system_id = p_system_id)
      AND (p_date_from IS NULL OR d.inventory_date >= p_date_from)
      AND (p_date_to   IS NULL OR d.inventory_date <= p_date_to)
      AND d.has_feed_record = TRUE  -- only days where feed was actually recorded
  )
  SELECT
    dsf.system_id,
    dsf.system_name,
    dsf.feed_date,
    dsf.feed_kg::double precision,
    NULLIF(dsf.biomass_kg, 0)::double precision,
    NULLIF(dsf.abw_g, 0)::double precision,
    dsf.live_fish,
    dsf.feed_rate_pct::double precision,
    pg.lower_pct,
    pg.upper_pct,
    pg.pellet AS pellet_size,
    CASE
      WHEN dsf.biomass_kg IS NULL OR dsf.abw_g IS NULL  THEN 'missing'
      WHEN pg.lower_pct   IS NULL                       THEN 'no_target'
      WHEN dsf.feed_rate_pct > pg.upper_pct             THEN 'above'
      WHEN dsf.feed_rate_pct < pg.lower_pct             THEN 'below'
      ELSE 'in_target'
    END AS status,
    CASE
      WHEN dsf.biomass_kg IS NULL OR dsf.abw_g IS NULL THEN 'No inventory data for this date'
      WHEN pg.lower_pct IS NULL                        THEN 'ABW outside pellet guide range'
      WHEN dsf.feed_rate_pct > pg.upper_pct THEN
        CONCAT(ROUND(dsf.feed_rate_pct::numeric, 1), ' % BW/day (target max ', ROUND(pg.upper_pct::numeric, 1), ' %)')
      WHEN dsf.feed_rate_pct < pg.lower_pct THEN
        CONCAT(ROUND(dsf.feed_rate_pct::numeric, 1), ' % BW/day (target min ', ROUND(pg.lower_pct::numeric, 1), ' %)')
      ELSE
        CONCAT(ROUND(dsf.feed_rate_pct::numeric, 1), ' % BW/day - within band ',
               ROUND(pg.lower_pct::numeric, 1), '-', ROUND(pg.upper_pct::numeric, 1), ' %')
    END AS detail
  FROM dsf
  LEFT JOIN pellet_guide pg
    ON dsf.abw_g >= pg.min_abw_g
    AND (pg.max_abw_g IS NULL OR dsf.abw_g < pg.max_abw_g)
  ORDER BY dsf.system_id, dsf.feed_date;
END;
$$;


ALTER FUNCTION "public"."api_feed_rate_analysis"("p_farm_id" "uuid", "p_system_id" bigint, "p_date_from" "date", "p_date_to" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."api_feed_rate_analysis"("p_farm_id" "uuid", "p_system_id" bigint, "p_date_from" "date", "p_date_to" "date") IS 'Intentional app-facing SECURITY DEFINER RPC. Direct access to internal read models is revoked; callers must be authenticated and function body must enforce farm membership/scope checks.';



CREATE OR REPLACE FUNCTION "public"."api_feed_type_options_rpc"("p_farm_id" "uuid") RETURNS TABLE("id" bigint, "farm_id" "uuid", "feed_line" "text", "label" "text", "feed_category" "text", "feed_pellet_size" "text", "crude_protein_percentage" numeric, "crude_fat_percentage" numeric, "visibility_scope" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
  select
    ft.id,
    ft.farm_id,
    ft.feed_line,
    trim(both from concat_ws('  ', fs.company_name::text, ft.feed_line, ft.feed_category,
      ft.feed_pellet_size,
      case when ft.crude_protein_percentage is not null then 'CP ' || ft.crude_protein_percentage::text || '%' else null end,
      case when ft.crude_fat_percentage is not null then 'F ' || ft.crude_fat_percentage::text || '%' else null end
    )) as label,
    ft.feed_category::text,
    ft.feed_pellet_size::text,
    ft.crude_protein_percentage::numeric,
    ft.crude_fat_percentage::numeric,
    case
      when ft.farm_id = p_farm_id then 'farm'
      when exists (
        select 1
        from public.feed_inventory fi
        where fi.farm_id = p_farm_id
          and fi.feed_type_id = ft.id
      ) or exists (
        select 1
        from public.feeding_record fr
        join public.system s on s.id = fr.system_id
        where s.farm_id = p_farm_id
          and fr.feed_type_id = ft.id
      ) then 'farm_used'
      else 'shared_catalog'
    end as visibility_scope
  from public.feed_type ft
  left join public.feed_supplier fs on fs.id = ft.feed_supplier_id
  where private.is_farm_member(p_farm_id)
    and coalesce(ft.is_active, true)
    and (
      ft.farm_id is null
      or ft.farm_id = p_farm_id
      or exists (
        select 1
        from public.feed_inventory fi
        where fi.farm_id = p_farm_id
          and fi.feed_type_id = ft.id
      )
      or exists (
        select 1
        from public.feeding_record fr
        join public.system s on s.id = fr.system_id
        where s.farm_id = p_farm_id
          and fr.feed_type_id = ft.id
      )
    )
  order by
    case when ft.farm_id = p_farm_id then 0 else 1 end,
    ft.feed_line,
    ft.feed_pellet_size::text;
$$;


ALTER FUNCTION "public"."api_feed_type_options_rpc"("p_farm_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."api_feed_type_options_rpc"("p_farm_id" "uuid") IS 'Intentional app-facing SECURITY DEFINER RPC. Direct access to internal read models is revoked; callers must be authenticated and function body must enforce farm membership/scope checks.';



CREATE OR REPLACE FUNCTION "public"."api_fingerling_batch_options_rpc"("p_farm_id" "uuid" DEFAULT NULL::"uuid", "p_active_only" boolean DEFAULT true) RETURNS TABLE("id" bigint, "farm_id" "uuid", "system_id" bigint, "label" "text", "date_of_delivery" "date", "abw" numeric, "number_of_fish" numeric, "supplier_id" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
select
  fb.id,
  fb.farm_id,
  -- derive system_id from the most recent ongoing production cycle for this batch
  (
    select pc.system_id
    from public.production_cycle pc
    where pc.batch_id = fb.id
      and pc.ongoing_cycle = true
    order by pc.cycle_start desc
    limit 1
  ) as system_id,
  coalesce(nullif(fb.name, ''), 'Batch #' || fb.id::text) as label,
  fb.date_of_delivery,
  fb.abw::numeric,
  fb.number_of_fish::numeric,
  fb.supplier_id
from public.fingerling_batch fb
where (p_farm_id is null or private.is_farm_member(p_farm_id))
  and (p_farm_id is null or fb.farm_id = p_farm_id)
  and exists (
    select 1
    from public.farm_user fu
    where fu.farm_id = fb.farm_id
      and fu.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.production_cycle pc
    where pc.batch_id = fb.id
      and pc.ongoing_cycle = true
  )
  and (
    coalesce(p_active_only, true) = false
    or exists (
      select 1
      from public.production_cycle pc2
      join public.system s on s.id = pc2.system_id
      where pc2.batch_id = fb.id
        and pc2.ongoing_cycle = true
        and s.farm_id = fb.farm_id
        and s.is_active = true
        and fb.date_of_delivery >= coalesce(s.commissioned_at, date '0001-01-01')
    )
    or exists (
      select 1
      from public.fish_stocking fs
      join public.system s on s.id = fs.system_id
      where fs.batch_id = fb.id
        and s.farm_id = fb.farm_id
        and s.is_active = true
        and fs.date >= coalesce(s.commissioned_at, date '0001-01-01')
    )
    or exists (
      select 1
      from public.fish_transfer ft
      join public.system s on s.id = ft.target_system_id
      where ft.batch_id = fb.id
        and s.farm_id = fb.farm_id
        and s.is_active = true
        and ft.date >= coalesce(s.commissioned_at, date '0001-01-01')
    )
  )
order by fb.date_of_delivery desc nulls last;
$$;


ALTER FUNCTION "public"."api_fingerling_batch_options_rpc"("p_farm_id" "uuid", "p_active_only" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_growth_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_days" integer DEFAULT 180) RETURNS TABLE("sample_date" "date", "abw_g" numeric, "prev_abw_g" numeric, "weight_gain_g" numeric, "adg_g_day" numeric, "sgr_pct_day" numeric, "days_interval" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  WITH scope_check AS (
    SELECT 1
    WHERE private.app_rpc_scope_ok(p_farm_id, p_system_id, NULL::bigint, NULL::date, NULL::date)
  ),
  samples AS (
    SELECT
      fsw.date                                    AS sample_date,
      public.resolve_sampling_abw_g(
        fsw.abw,
        fsw.total_weight_sampling,
        fsw.number_of_fish_sampling
      )                                           AS abw_g
    FROM public.fish_sampling_weight fsw
    JOIN public.system s ON s.id = fsw.system_id
    WHERE s.farm_id = p_farm_id
      AND fsw.system_id = p_system_id
      AND fsw.date >= CURRENT_DATE - GREATEST(1, LEAST(COALESCE(p_days, 180), 3650))
      AND EXISTS (SELECT 1 FROM scope_check)
  ),
  ranked AS (
    SELECT
      sample_date,
      abw_g,
      LAG(abw_g)    OVER (ORDER BY sample_date) AS prev_abw_g,
      LAG(sample_date) OVER (ORDER BY sample_date) AS prev_date
    FROM samples
  )
  SELECT
    r.sample_date,
    r.abw_g,
    r.prev_abw_g,
    (r.abw_g - r.prev_abw_g)                                             AS weight_gain_g,
    CASE
      WHEN r.prev_date IS NOT NULL AND (r.sample_date - r.prev_date) > 0
      THEN ROUND(
        (r.abw_g - r.prev_abw_g) / (r.sample_date - r.prev_date),
        4
      )
      ELSE NULL
    END                                                                   AS adg_g_day,
    CASE
      WHEN r.prev_abw_g IS NOT NULL AND r.prev_abw_g > 0
       AND r.prev_date IS NOT NULL AND (r.sample_date - r.prev_date) > 0
      THEN ROUND(
        (
          LN(r.abw_g::numeric / r.prev_abw_g::numeric)
          / (r.sample_date - r.prev_date)
        ) * 100,
        4
      )
      ELSE NULL
    END                                                                   AS sgr_pct_day,
    CASE
      WHEN r.prev_date IS NOT NULL
      THEN (r.sample_date - r.prev_date)
      ELSE NULL
    END::integer                                                          AS days_interval
  FROM ranked r
  ORDER BY r.sample_date;
$$;


ALTER FUNCTION "public"."api_growth_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_harvest_forecast"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint) RETURNS TABLE("system_id" bigint, "system_name" "text", "current_abw_g" double precision, "last_sample_date" "date", "sample_age_days" integer, "adg_g_day" double precision, "target_weight_g" double precision, "days_to_target" integer, "projected_harvest_date" "date", "status" "text", "confidence" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
begin
  if not private.is_farm_member(p_farm_id) then
    return;
  end if;

  perform private.assert_rpc_parameters(
    p_farm_id := p_farm_id,
    p_system_id := p_system_id,
    p_batch_id := null,
    p_start_date := null,
    p_end_date := null
  );


  RETURN QUERY
  WITH ranked_samples AS (
    SELECT
      fsw.system_id,
      fsw.date AS sample_date,
      fsw.abw::double precision AS abw_g,
      LAG(fsw.date) OVER w AS prev_date,
      LAG(fsw.abw::double precision) OVER w AS prev_abw_g,
      ROW_NUMBER() OVER w AS rn
    FROM public.fish_sampling_weight fsw
    JOIN public.system s ON s.id = fsw.system_id
    WHERE s.farm_id = p_farm_id
      AND s.is_active
      AND (p_system_id IS NULL OR fsw.system_id = p_system_id)
    WINDOW w AS (PARTITION BY fsw.system_id ORDER BY fsw.date DESC)
  ),
  intervals AS (
    SELECT
      rs.system_id,
      rs.sample_date,
      rs.abw_g,
      rs.prev_date,
      rs.prev_abw_g,
      rs.rn,
      CASE
        WHEN rs.prev_date IS NOT NULL AND (rs.sample_date - rs.prev_date) > 0
          THEN (rs.abw_g - rs.prev_abw_g) / (rs.sample_date - rs.prev_date)::double precision
        ELSE NULL
      END AS interval_adg
    FROM ranked_samples rs
    WHERE rs.rn <= 4
  ),
  adg_weighted AS (
    SELECT
      i.system_id,
      FIRST_VALUE(i.abw_g) OVER (PARTITION BY i.system_id ORDER BY i.rn) AS latest_abw_g,
      FIRST_VALUE(i.sample_date) OVER (PARTITION BY i.system_id ORDER BY i.rn) AS last_sample_date,
      SUM(
        CASE
          WHEN i.rn = 2 THEN i.interval_adg * 3
          WHEN i.rn = 3 THEN i.interval_adg * 2
          WHEN i.rn = 4 THEN i.interval_adg
          ELSE NULL
        END
      ) OVER (PARTITION BY i.system_id)
      /
      NULLIF(SUM(
        CASE
          WHEN i.rn = 2 AND i.interval_adg IS NOT NULL THEN 3
          WHEN i.rn = 3 AND i.interval_adg IS NOT NULL THEN 2
          WHEN i.rn = 4 AND i.interval_adg IS NOT NULL THEN 1
          ELSE 0
        END
      ) OVER (PARTITION BY i.system_id), 0) AS weighted_adg,
      COUNT(i.interval_adg) FILTER (WHERE i.rn > 1 AND i.interval_adg IS NOT NULL)
        OVER (PARTITION BY i.system_id) AS interval_count
    FROM intervals i
  ),
  latest AS (
    SELECT DISTINCT ON (aw.system_id)
      aw.system_id,
      aw.latest_abw_g,
      aw.last_sample_date,
      aw.weighted_adg,
      aw.interval_count
    FROM adg_weighted aw
    ORDER BY aw.system_id
  ),
  targets AS (
    SELECT
      pc.system_id,
      COALESCE(pc.target_weight_g, 400)::double precision AS target_weight_g
    FROM public.production_cycle pc
    WHERE pc.ongoing_cycle = TRUE
  )
  SELECT
    s.id AS system_id,
    s.name AS system_name,
    la.latest_abw_g AS current_abw_g,
    la.last_sample_date,
    (CURRENT_DATE - la.last_sample_date)::integer AS sample_age_days,
    la.weighted_adg AS adg_g_day,
    COALESCE(t.target_weight_g, 400::double precision) AS target_weight_g,
    CASE
      WHEN la.weighted_adg > 0 AND la.latest_abw_g < COALESCE(t.target_weight_g, 400)
        THEN CEIL((COALESCE(t.target_weight_g, 400) - la.latest_abw_g) / la.weighted_adg)::integer
      WHEN la.latest_abw_g >= COALESCE(t.target_weight_g, 400)
        THEN 0
      ELSE NULL
    END AS days_to_target,
    CASE
      WHEN la.weighted_adg > 0 AND la.latest_abw_g < COALESCE(t.target_weight_g, 400)
        THEN CURRENT_DATE + CEIL((COALESCE(t.target_weight_g, 400) - la.latest_abw_g) / la.weighted_adg)::integer
      WHEN la.latest_abw_g >= COALESCE(t.target_weight_g, 400)
        THEN CURRENT_DATE
      ELSE NULL
    END AS projected_harvest_date,
    CASE
      WHEN la.latest_abw_g IS NULL THEN 'no_data'
      WHEN la.latest_abw_g >= COALESCE(t.target_weight_g, 400) THEN 'ready'
      WHEN la.weighted_adg IS NULL OR la.weighted_adg <= 0 THEN 'no_data'
      WHEN la.weighted_adg < 1.5 THEN 'slow_growth'
      ELSE 'on_track'
    END AS status,
    CASE
      WHEN la.interval_count >= 2 AND (CURRENT_DATE - la.last_sample_date) <= 30 THEN 'high'
      ELSE 'low'
    END AS confidence
  FROM public.system s
  LEFT JOIN latest la ON la.system_id = s.id
  LEFT JOIN targets t ON t.system_id = s.id
  WHERE s.farm_id = p_farm_id
    AND s.is_active
    AND (p_system_id IS NULL OR s.id = p_system_id)
  ORDER BY
    CASE WHEN la.latest_abw_g >= COALESCE(t.target_weight_g, 400) THEN 0 ELSE 1 END,
    CASE
      WHEN la.weighted_adg > 0 AND la.latest_abw_g < COALESCE(t.target_weight_g, 400)
        THEN CEIL((COALESCE(t.target_weight_g, 400) - la.latest_abw_g) / la.weighted_adg)::integer
      WHEN la.latest_abw_g >= COALESCE(t.target_weight_g, 400)
        THEN 0
      ELSE NULL
    END ASC NULLS LAST;
END;
$$;


ALTER FUNCTION "public"."api_harvest_forecast"("p_farm_id" "uuid", "p_system_id" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."api_harvest_forecast"("p_farm_id" "uuid", "p_system_id" bigint) IS 'Intentional app-facing SECURITY DEFINER RPC. Direct access to internal read models is revoked; callers must be authenticated and function body must enforce farm membership/scope checks.';



CREATE OR REPLACE FUNCTION "public"."api_kpi_coverage"("p_farm_id" "uuid", "p_date_from" "date" DEFAULT NULL::"date", "p_date_to" "date" DEFAULT NULL::"date") RETURNS TABLE("kpi_key" "text", "covered" integer, "total" integer, "label" "text", "source" "text", "basis" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'analytics', 'pg_temp'
    AS $$
DECLARE
  v_total integer;
BEGIN
  IF NOT private.is_farm_member(p_farm_id) THEN
    RETURN;
  END IF;

  PERFORM private.assert_rpc_parameters(
    p_farm_id  := p_farm_id,
    p_system_id := NULL,
    p_batch_id  := NULL,
    p_start_date := p_date_from,
    p_end_date   := p_date_to
  );

  SELECT COUNT(*)::integer INTO v_total
  FROM public.system
  WHERE farm_id = p_farm_id AND is_active = TRUE;

  RETURN QUERY
  WITH inv_window AS (
    SELECT DISTINCT
      inv.system_id,
      (inv.abw_last_sampling       IS NOT NULL)                                        AS has_abw,
      (inv.biomass_last_sampling   IS NOT NULL)                                        AS has_biomass,
      (inv.system_volume IS NOT NULL AND inv.system_volume > 0)                        AS has_volume,
      (inv.feeding_rate IS NOT NULL OR inv.feeding_amount IS NOT NULL)                 AS has_feeding,
      (inv.mortality_rate IS NOT NULL OR inv.number_of_fish_mortality IS NOT NULL)     AS has_mortality
    FROM analytics.daily_system_facts inv
    JOIN public.system s ON s.id = inv.system_id
    WHERE s.farm_id = p_farm_id
      AND (p_date_from IS NULL OR inv.inventory_date >= p_date_from)
      AND (p_date_to   IS NULL OR inv.inventory_date <= p_date_to)
  ),
  wq_window AS (
    SELECT DISTINCT r.system_id
    FROM public.daily_water_quality_rating r
    JOIN public.system s ON s.id = r.system_id
    WHERE s.farm_id = p_farm_id
      AND (p_date_from IS NULL OR r.rating_date >= p_date_from)
      AND (p_date_to   IS NULL OR r.rating_date <= p_date_to)
      AND r.rating_numeric IS NOT NULL
  ),
  prod_window AS (
    SELECT DISTINCT ps.system_id
    FROM analytics.production_summary ps
    JOIN public.system s ON s.id = ps.system_id
    WHERE s.farm_id = p_farm_id
      AND (p_date_from IS NULL OR ps.date >= p_date_from)
      AND (p_date_to   IS NULL OR ps.date <= p_date_to)
      AND (ps.feed_kg_period IS NOT NULL OR ps.biomass_increase_period IS NOT NULL)
  )
  SELECT
    k.kpi_key,
    k.covered,
    v_total,
    k.label,
    k.source,
    k.basis
  FROM (
    VALUES
      ('efcr',
       (SELECT COUNT(*)::integer FROM prod_window),
       (SELECT COUNT(*)||'/'||v_total||' system'||CASE WHEN v_total=1 THEN '' ELSE 's' END FROM prod_window),
       'Production summary','In-window conversion'),
      ('mortality',
       (SELECT COUNT(*)::integer FROM inv_window WHERE has_mortality),
       (SELECT COUNT(*)||'/'||v_total||' system'||CASE WHEN v_total=1 THEN '' ELSE 's' END FROM inv_window WHERE has_mortality),
       'Inventory + production','In-window rate'),
      ('abw',
       (SELECT COUNT(*)::integer FROM inv_window WHERE has_abw),
       (SELECT COUNT(*)||'/'||v_total||' system'||CASE WHEN v_total=1 THEN '' ELSE 's' END FROM inv_window WHERE has_abw),
       'Sampling + inventory','Latest in-window sample'),
      ('biomass',
       (SELECT COUNT(*)::integer FROM inv_window WHERE has_biomass),
       (SELECT COUNT(*)||'/'||v_total||' system'||CASE WHEN v_total=1 THEN '' ELSE 's' END FROM inv_window WHERE has_biomass),
       'Inventory','As-of-end biomass'),
      ('biomass_density',
       (SELECT COUNT(*)::integer FROM inv_window WHERE has_biomass AND has_volume),
       (SELECT COUNT(*)||'/'||v_total||' system'||CASE WHEN v_total=1 THEN '' ELSE 's' END FROM inv_window WHERE has_biomass AND has_volume),
       'Inventory + volume','Biomass / volume'),
      ('feeding',
       (SELECT COUNT(*)::integer FROM inv_window WHERE has_feeding),
       (SELECT COUNT(*)||'/'||v_total||' system'||CASE WHEN v_total=1 THEN '' ELSE 's' END FROM inv_window WHERE has_feeding),
       'Feed records + biomass','% body weight/day'),
      ('water_quality',
       (SELECT COUNT(*)::integer FROM wq_window),
       (SELECT COUNT(*)||'/'||v_total||' system'||CASE WHEN v_total=1 THEN '' ELSE 's' END FROM wq_window),
       'Daily water ratings','Average in-window rating')
  ) AS k(kpi_key, covered, label, source, basis);
END;
$$;


ALTER FUNCTION "public"."api_kpi_coverage"("p_farm_id" "uuid", "p_date_from" "date", "p_date_to" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_latest_water_quality_status"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint) RETURNS TABLE("system_id" bigint, "system_name" "text", "rating_date" "date", "rating" "text", "rating_numeric" double precision, "worst_parameter" "text", "worst_parameter_value" double precision, "worst_parameter_unit" "text", "low_do_threshold" numeric, "high_ammonia_threshold" numeric, "do_exceeded" boolean, "ammonia_exceeded" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  with perm as (
    select private.app_rpc_scope_ok(p_farm_id, p_system_id, null::bigint, null::date, null::date) as ok
  ),
  sys as (
    select s.id, s.name
    from public.system s, perm
    where perm.ok
      and s.farm_id = p_farm_id
      and coalesce(s.is_active, true) = true
      and (p_system_id is null or s.id = p_system_id)
  ),
  latest_rating as (
    select distinct on (dwr.system_id)
      dwr.system_id, dwr.rating_date, dwr.rating::text as rating,
      dwr.rating_numeric::double precision as rating_numeric,
      dwr.worst_parameter::text as worst_parameter,
      dwr.worst_parameter_value::double precision as worst_parameter_value,
      dwr.worst_parameter_unit::text as worst_parameter_unit
    from public.daily_water_quality_rating dwr
    join sys on sys.id = dwr.system_id
    order by dwr.system_id, dwr.rating_date desc, dwr.created_at desc, dwr.id desc
  ),
  thresh as (
    select sys.id as system_id,
      coalesce(ts.low_do_threshold, tf.low_do_threshold, td.low_do_threshold) as low_do_threshold,
      coalesce(ts.high_ammonia_threshold, tf.high_ammonia_threshold, td.high_ammonia_threshold) as high_ammonia_threshold
    from sys
    left join public.alert_threshold ts on ts.scope = 'system' and ts.system_id = sys.id
    left join public.alert_threshold tf on tf.scope = 'farm' and tf.farm_id = p_farm_id
    left join public.alert_threshold td on td.scope = 'default'
  )
  select sys.id as system_id, sys.name::text as system_name,
    lr.rating_date, coalesce(lr.rating, 'no_data') as rating,
    lr.rating_numeric, lr.worst_parameter, lr.worst_parameter_value, lr.worst_parameter_unit,
    t.low_do_threshold, t.high_ammonia_threshold,
    case when lr.rating_date is null then null
      else (lr.worst_parameter = 'dissolved_oxygen' and t.low_do_threshold is not null
        and lr.worst_parameter_value < t.low_do_threshold::double precision)
    end as do_exceeded,
    case when lr.rating_date is null then null
      else (lr.worst_parameter = 'ammonia' and t.high_ammonia_threshold is not null
        and lr.worst_parameter_value > t.high_ammonia_threshold::double precision)
    end as ammonia_exceeded
  from sys
  left join latest_rating lr on lr.system_id = sys.id
  left join thresh t on t.system_id = sys.id
  order by sys.name;
$$;


ALTER FUNCTION "public"."api_latest_water_quality_status"("p_farm_id" "uuid", "p_system_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_production_summary"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint, "p_stage" "public"."system_growth_stage" DEFAULT NULL::"public"."system_growth_stage", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("cycle_id" bigint, "system_id" bigint, "system_name" "text", "growth_stage" "text", "ongoing_cycle" boolean, "date" "date", "activity" "text", "activity_rank" integer, "number_of_fish_stocked" double precision, "total_weight_stocked" double precision, "total_feed_amount_period" double precision, "daily_mortality_count" double precision, "number_of_fish_transfer_out" double precision, "total_weight_transfer_out" double precision, "number_of_fish_harvested" double precision, "total_weight_harvested" double precision, "average_body_weight" double precision, "number_of_fish_inventory" double precision, "total_biomass" double precision, "biomass_density" double precision, "feeding_rate" double precision, "biomass_increase_period" double precision, "total_feed_amount_aggregated" double precision, "biomass_increase_aggregated" double precision, "cumulative_mortality" double precision, "total_weight_transfer_out_aggregated" double precision, "total_weight_harvested_aggregated" double precision, "total_weight_stocked_aggregated" double precision, "number_of_fish_transfer_out_aggregated" double precision, "efcr_period" double precision, "efcr_aggregated" double precision)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'analytics'
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


ALTER FUNCTION "public"."api_production_summary"("p_farm_id" "uuid", "p_system_id" bigint, "p_stage" "public"."system_growth_stage", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_production_trend"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint, "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("trend_date" "date", "avg_abw_g" double precision, "total_biomass_kg" double precision, "total_feed_kg" double precision, "total_fish_count" double precision, "daily_mortality" double precision, "system_count" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'analytics', 'pg_temp'
    AS $$
DECLARE
  v_start date := COALESCE(p_start_date, date '1900-01-01');
  v_end   date := COALESCE(p_end_date, CURRENT_DATE);
BEGIN
  IF NOT private.is_farm_member(p_farm_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  -- For each (date, system_id) pair, take the LATEST activity row only.
  -- This avoids double-counting biomass_kg when multiple activity rows exist on
  -- the same date for the same system (e.g. feeding + mortality on the same day).
  WITH latest_per_system_date AS (
    SELECT DISTINCT ON (ps.date, ps.system_id)
      ps.date,
      ps.system_id,
      ps.number_of_fish_inventory,
      ps.average_body_weight,
      ps.biomass_kg,          -- snapshot: take only the latest row, not sum
      ps.feed_kg_period,      -- already period-level; sum across systems is correct
      ps.mortality_count      -- events: sum across systems is correct
    FROM analytics.production_summary ps
    JOIN public.system s ON s.id = ps.system_id
    WHERE s.farm_id = p_farm_id
      AND (p_system_id IS NULL OR ps.system_id = p_system_id)
      AND ps.date BETWEEN v_start AND v_end
    ORDER BY ps.date, ps.system_id, ps.activity_rank DESC
  )
  SELECT
    l.date                                                                AS trend_date,
    CASE
      WHEN SUM(l.number_of_fish_inventory) > 0
      THEN SUM(l.average_body_weight * l.number_of_fish_inventory)
           / SUM(l.number_of_fish_inventory)
      ELSE NULL
    END::double precision                                                 AS avg_abw_g,
    SUM(l.biomass_kg)::double precision                                   AS total_biomass_kg,
    SUM(l.feed_kg_period)::double precision                               AS total_feed_kg,
    SUM(l.number_of_fish_inventory)::double precision                     AS total_fish_count,
    SUM(l.mortality_count)::double precision                              AS daily_mortality,
    COUNT(DISTINCT l.system_id)                                           AS system_count
  FROM latest_per_system_date l
  GROUP BY l.date
  ORDER BY l.date;
END;
$$;


ALTER FUNCTION "public"."api_production_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_recommended_actions"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint) RETURNS TABLE("system_id" bigint, "system_name" "text", "metric_name" "text", "current_value" numeric, "threshold_low" numeric, "threshold_high" numeric, "unit" "text", "severity" "text", "context_json" "jsonb")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'analytics'
    AS $$
SELECT
  wq.system_id,
  s.name AS system_name,
  'water_quality_score'::text AS metric_name,
  wq.rating_numeric::numeric AS current_value,
  60::numeric AS threshold_low,
  80::numeric AS threshold_high,
  'score'::text AS unit,
  CASE
    WHEN wq.rating_numeric < 40 THEN 'critical'
    WHEN wq.rating_numeric < 60 THEN 'warning'
    WHEN wq.rating_numeric < 80 THEN 'watch'
    ELSE 'ok'
  END AS severity,
  jsonb_build_object(
    'rating', wq.rating::text,
    'worst_parameter', wq.worst_parameter::text,
    'worst_value', wq.worst_parameter_value,
    'worst_unit', wq.worst_parameter_unit,
    'rating_date', wq.rating_date
  ) AS context_json
FROM (
  SELECT DISTINCT ON (dw.system_id)
    dw.system_id, dw.rating_numeric, dw.rating,
    dw.worst_parameter, dw.worst_parameter_value,
    dw.worst_parameter_unit, dw.rating_date
  FROM public.daily_water_quality_rating dw
  JOIN public.system s2 ON s2.id = dw.system_id
  WHERE s2.farm_id = p_farm_id
    AND (p_system_id IS NULL OR dw.system_id = p_system_id)
  ORDER BY dw.system_id, dw.rating_date DESC
) wq
JOIN public.system s ON s.id = wq.system_id

UNION ALL

SELECT
  f.system_id,
  f.system_name,
  'mortality_rate'::text AS metric_name,
  ROUND(f.mortality_rate::numeric, 4) AS current_value,
  NULL::numeric AS threshold_low,
  0.005::numeric AS threshold_high,
  '%/day'::text AS unit,
  CASE
    WHEN f.mortality_rate > 0.02 THEN 'critical'
    WHEN f.mortality_rate > 0.01 THEN 'warning'
    WHEN f.mortality_rate > 0.005 THEN 'watch'
    ELSE 'ok'
  END AS severity,
  jsonb_build_object(
    'fish_count',         f.number_of_fish,
    'mortality_today',    f.number_of_fish_mortality,
    'inventory_date',     f.inventory_date
  ) AS context_json
FROM (
  SELECT DISTINCT ON (dsf.system_id)
    dsf.system_id, dsf.system_name, dsf.inventory_date,
    dsf.mortality_rate, dsf.number_of_fish,
    dsf.number_of_fish_mortality
  FROM analytics.daily_system_facts dsf
  WHERE dsf.farm_id = p_farm_id
    AND (p_system_id IS NULL OR dsf.system_id = p_system_id)
    AND dsf.system_is_active = TRUE
  ORDER BY dsf.system_id, dsf.inventory_date DESC
) f

UNION ALL

SELECT
  f.system_id,
  f.system_name,
  'feeding_rate_pct_bw'::text AS metric_name,
  ROUND(f.feeding_rate::numeric, 4) AS current_value,
  0.01::numeric AS threshold_low,
  0.05::numeric AS threshold_high,
  '%BW/day'::text AS unit,
  CASE
    WHEN f.feeding_rate IS NULL    THEN 'no_data'
    WHEN f.feeding_rate < 0.005   THEN 'critical'
    WHEN f.feeding_rate < 0.01    THEN 'warning'
    WHEN f.feeding_rate > 0.08    THEN 'warning'
    ELSE 'ok'
  END AS severity,
  jsonb_build_object(
    'feeding_amount_kg', f.feeding_amount,
    'biomass_kg',        f.biomass_last_sampling,
    'inventory_date',    f.inventory_date
  ) AS context_json
FROM (
  SELECT DISTINCT ON (dsf.system_id)
    dsf.system_id, dsf.system_name, dsf.inventory_date,
    dsf.feeding_rate, dsf.feeding_amount, dsf.biomass_last_sampling
  FROM analytics.daily_system_facts dsf
  WHERE dsf.farm_id = p_farm_id
    AND (p_system_id IS NULL OR dsf.system_id = p_system_id)
    AND dsf.system_is_active = TRUE
    AND dsf.has_feed_record = TRUE
  ORDER BY dsf.system_id, dsf.inventory_date DESC
) f

UNION ALL

SELECT
  f.system_id,
  f.system_name,
  'biomass_density_kg_m3'::text AS metric_name,
  ROUND(f.biomass_density::numeric, 3) AS current_value,
  NULL::numeric AS threshold_low,
  15::numeric AS threshold_high,
  'kg/m3'::text AS unit,
  CASE
    WHEN f.biomass_density IS NULL THEN 'no_data'
    WHEN f.biomass_density > 25    THEN 'critical'
    WHEN f.biomass_density > 20    THEN 'warning'
    WHEN f.biomass_density > 15    THEN 'watch'
    ELSE 'ok'
  END AS severity,
  jsonb_build_object(
    'biomass_kg',      f.biomass_last_sampling,
    'system_volume_m3', f.system_volume,
    'abw_g',           f.abw_last_sampling,
    'fish_count',      f.number_of_fish,
    'inventory_date',  f.inventory_date
  ) AS context_json
FROM (
  SELECT DISTINCT ON (dsf.system_id)
    dsf.system_id, dsf.system_name, dsf.inventory_date,
    dsf.biomass_density, dsf.biomass_last_sampling,
    dsf.system_volume, dsf.abw_last_sampling, dsf.number_of_fish
  FROM analytics.daily_system_facts dsf
  WHERE dsf.farm_id = p_farm_id
    AND (p_system_id IS NULL OR dsf.system_id = p_system_id)
    AND dsf.system_is_active = TRUE
  ORDER BY dsf.system_id, dsf.inventory_date DESC
) f

UNION ALL

SELECT
  f.system_id,
  f.system_name,
  'average_body_weight_g'::text AS metric_name,
  ROUND(f.abw_last_sampling::numeric, 2) AS current_value,
  NULL::numeric AS threshold_low,
  NULL::numeric AS threshold_high,
  'g'::text AS unit,
  CASE
    WHEN f.abw_last_sampling IS NULL THEN 'no_data'
    ELSE 'ok'
  END AS severity,
  jsonb_build_object(
    'last_abw_date',  f.last_abw_date,
    'growth_stage',   f.growth_stage,
    'biomass_kg',     f.biomass_last_sampling,
    'fish_count',     f.number_of_fish,
    'inventory_date', f.inventory_date
  ) AS context_json
FROM (
  SELECT DISTINCT ON (dsf.system_id)
    dsf.system_id, dsf.system_name, dsf.inventory_date,
    dsf.abw_last_sampling, dsf.biomass_last_sampling,
    dsf.last_abw_date, dsf.growth_stage, dsf.number_of_fish
  FROM analytics.daily_system_facts dsf
  WHERE dsf.farm_id = p_farm_id
    AND (p_system_id IS NULL OR dsf.system_id = p_system_id)
    AND dsf.system_is_active = TRUE
    AND dsf.has_abw = TRUE
  ORDER BY dsf.system_id, dsf.inventory_date DESC
) f

ORDER BY severity, system_id, metric_name;
$$;


ALTER FUNCTION "public"."api_recommended_actions"("p_farm_id" "uuid", "p_system_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_running_stock"("p_farm_id" "uuid") RETURNS TABLE("feed_type_id" bigint, "feed_type_name" "text", "pellet_size" "text", "current_stock_kg" numeric, "avg_daily_usage_kg" numeric, "days_remaining" numeric, "stock_status" "text", "last_delivery_date" "date")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select rs.*
  from public.get_running_stock(p_farm_id) rs
  where private.is_farm_member(p_farm_id);
$$;


ALTER FUNCTION "public"."api_running_stock"("p_farm_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_system_options_rpc"("p_farm_id" "uuid" DEFAULT NULL::"uuid", "p_stage" "public"."system_growth_stage" DEFAULT NULL::"public"."system_growth_stage", "p_active_only" boolean DEFAULT true) RETURNS TABLE("id" bigint, "farm_id" "uuid", "farm_name" "text", "label" "text", "name" "text", "unit" "text", "type" "text", "growth_stage" "public"."system_growth_stage", "is_active" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
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


ALTER FUNCTION "public"."api_system_options_rpc"("p_farm_id" "uuid", "p_stage" "public"."system_growth_stage", "p_active_only" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_system_timeline_bounds"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint) RETURNS TABLE("system_id" bigint, "resolved_start" "date", "resolved_end" "date", "resolved_ongoing" boolean, "snapshot_as_of" "date", "first_stocking_date" "date", "final_harvest_date" "date", "first_activity_date" "date", "last_activity_date" "date", "configured_cycle_start" "date", "configured_cycle_end" "date", "period_source" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
  WITH sys AS (
    SELECT s.id AS system_id
    FROM public.system s
    WHERE private.app_rpc_scope_ok(p_farm_id, p_system_id, NULL, NULL, NULL)
      AND s.farm_id = p_farm_id
      AND COALESCE(s.is_active, TRUE) = TRUE
      AND (p_system_id IS NULL OR s.id = p_system_id)
  ),
  snapshot_bounds AS (
    SELECT d.system_id,
           MAX(d.inventory_date) AS snapshot_as_of
    FROM analytics.daily_system_facts d
    JOIN sys ON sys.system_id = d.system_id
    GROUP BY d.system_id
  ),
  stocking_bounds AS (
    SELECT fs.system_id,
           MIN(fs.date) AS first_stocking_date
    FROM public.fish_stocking fs
    JOIN sys ON sys.system_id = fs.system_id
    GROUP BY fs.system_id
  ),
  harvest_bounds AS (
    SELECT fh.system_id,
           MAX(fh.date) AS final_harvest_date
    FROM public.fish_harvest fh
    JOIN sys ON sys.system_id = fh.system_id
    WHERE fh.type_of_harvest = 'final'::public.type_of_harvest
    GROUP BY fh.system_id
  ),
  configured_cycle AS (
    SELECT DISTINCT ON (pc.system_id)
      pc.system_id,
      pc.cycle_start AS configured_cycle_start,
      pc.cycle_end   AS configured_cycle_end
    FROM public.production_cycle pc
    JOIN sys ON sys.system_id = pc.system_id
    ORDER BY pc.system_id, pc.ongoing_cycle DESC, pc.cycle_start DESC, pc.cycle_id DESC
  ),
  activity_bounds AS (
    SELECT
      sub.system_id,
      MIN(sub.d) AS first_activity_date,
      MAX(sub.d) AS last_activity_date
    FROM (
      SELECT dsf.system_id, dsf.inventory_date AS d
        FROM analytics.daily_system_facts dsf
        JOIN sys ON sys.system_id = dsf.system_id
      UNION ALL
      SELECT fsw.system_id, fsw.date AS d
        FROM public.fish_sampling_weight fsw
        JOIN sys ON sys.system_id = fsw.system_id
      UNION ALL
      SELECT dwr.system_id, dwr.rating_date AS d
        FROM public.daily_water_quality_rating dwr
        JOIN sys ON sys.system_id = dwr.system_id
      UNION ALL
      SELECT fh.system_id, fh.date AS d
        FROM public.fish_harvest fh
        JOIN sys ON sys.system_id = fh.system_id
      UNION ALL
      SELECT ft.origin_system_id AS system_id, ft.date AS d
        FROM public.fish_transfer ft
        JOIN sys ON sys.system_id = ft.origin_system_id
       WHERE ft.origin_system_id IS NOT NULL
      UNION ALL
      SELECT ft.target_system_id AS system_id, ft.date AS d
        FROM public.fish_transfer ft
        JOIN sys ON sys.system_id = ft.target_system_id
       WHERE ft.target_system_id IS NOT NULL
    ) sub
    GROUP BY sub.system_id
  )
  SELECT
    sys.system_id,
    CASE
      WHEN sb.first_stocking_date IS NOT NULL THEN sb.first_stocking_date
      WHEN cc.configured_cycle_start IS NOT NULL AND ab.first_activity_date IS NULL THEN cc.configured_cycle_start
      ELSE ab.first_activity_date
    END                                                           AS resolved_start,
    CASE
      WHEN sb.first_stocking_date IS NOT NULL THEN hb.final_harvest_date
      WHEN cc.configured_cycle_start IS NOT NULL AND ab.first_activity_date IS NULL THEN cc.configured_cycle_end
      ELSE COALESCE(hb.final_harvest_date, ab.last_activity_date)
    END                                                           AS resolved_end,
    CASE
      WHEN sb.first_stocking_date IS NOT NULL THEN hb.final_harvest_date IS NULL
      WHEN cc.configured_cycle_start IS NOT NULL AND ab.first_activity_date IS NULL THEN cc.configured_cycle_end IS NULL
      ELSE FALSE
    END                                                           AS resolved_ongoing,
    snap.snapshot_as_of,
    sb.first_stocking_date,
    hb.final_harvest_date,
    ab.first_activity_date,
    ab.last_activity_date,
    cc.configured_cycle_start,
    cc.configured_cycle_end,
    CASE
      WHEN sb.first_stocking_date IS NOT NULL AND hb.final_harvest_date IS NULL      THEN 'cycle_ongoing'
      WHEN sb.first_stocking_date IS NOT NULL AND hb.final_harvest_date IS NOT NULL  THEN 'cycle_closed'
      WHEN cc.configured_cycle_start IS NOT NULL AND ab.first_activity_date IS NULL  THEN 'planned_cycle'
      WHEN ab.first_activity_date IS NOT NULL                                        THEN 'observed_activity'
      ELSE 'no_data'
    END                                                           AS period_source
  FROM sys
  LEFT JOIN snapshot_bounds snap ON snap.system_id = sys.system_id
  LEFT JOIN stocking_bounds  sb  ON sb.system_id   = sys.system_id
  LEFT JOIN harvest_bounds   hb  ON hb.system_id   = sys.system_id
  LEFT JOIN configured_cycle cc  ON cc.system_id   = sys.system_id
  LEFT JOIN activity_bounds  ab  ON ab.system_id   = sys.system_id
  ORDER BY sys.system_id;
$$;


ALTER FUNCTION "public"."api_system_timeline_bounds"("p_farm_id" "uuid", "p_system_id" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."api_system_timeline_bounds"("p_farm_id" "uuid", "p_system_id" bigint) IS 'Intentional app-facing SECURITY DEFINER RPC. Direct access to internal read models is revoked; callers must be authenticated and function body must enforce farm membership/scope checks.';



CREATE OR REPLACE FUNCTION "public"."api_time_period_bounds_scoped"("p_farm_id" "uuid", "p_time_period" "text", "p_scope" "text" DEFAULT 'dashboard'::"text", "p_anchor_date" "date" DEFAULT NULL::"date", "p_system_id" bigint DEFAULT NULL::bigint) RETURNS TABLE("time_period" "text", "input_start_date" "date", "input_end_date" "date", "anchor_scope" "text", "latest_available_date" "date", "available_from_date" "date", "requested_days" integer, "available_days" integer, "resolved_days" integer, "staleness_days" integer, "is_truncated" boolean)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
  with perm as (
    select private.app_rpc_scope_ok(p_farm_id, null, null, null, null) as ok
  ),
  resolved_scope as (
    select case lower(coalesce(nullif(trim(p_scope), ''), 'dashboard'))
      when 'dashboard' then 'dashboard'
      when 'inventory' then 'inventory'
      when 'production' then 'production'
      when 'water_quality' then 'water_quality'
      when 'water-quality' then 'water_quality'
      when 'feeding' then 'feeding'
      when 'feed' then 'feeding'
      when 'feed_inventory' then 'feed_inventory'
      when 'feed-inventory' then 'feed_inventory'
      else 'dashboard'
    end as anchor_scope
    from perm where perm.ok
  ),
  requested_period as (
    select lower(replace(coalesce(nullif(trim(p_time_period), ''), '2 weeks'), '-', ' ')) as value
  ),
  tp as (
    select
      case
        when rp.value in ('all history', 'all_history') then 'all history'
        else dtp.time_period::text
      end as time_period,
      case
        when rp.value in ('all history', 'all_history') then null::integer
        else greatest(dtp.days_since_start, 1)
      end as requested_days
    from requested_period rp
    join perm on perm.ok
    left join public.dashboard_time_period dtp on dtp.time_period::text = rp.value
    where rp.value in ('all history', 'all_history') or dtp.time_period is not null
    limit 1
  ),
  capped_anchor as (
    select least(coalesce(p_anchor_date, current_date), current_date) as value
  ),
  active_systems as (
    select s.id
    from public.system s
    where s.farm_id = p_farm_id
      and coalesce(s.is_active, true) = true
      and (p_system_id is null or s.id = p_system_id)
  ),
  scoped_dates as (
    select
      rs.anchor_scope,
      case rs.anchor_scope
        when 'water_quality' then (
          select min(latest_date)
          from (
            select max(dwr.rating_date) as latest_date
            from active_systems s
            join public.daily_water_quality_rating dwr on dwr.system_id = s.id
            cross join capped_anchor ca
            where dwr.rating_date <= ca.value
            group by s.id
          ) per_system
          where latest_date is not null
        )
        when 'feeding' then (
          select min(latest_date)
          from (
            select max(fr.date) as latest_date
            from active_systems s
            join public.feeding_record fr on fr.system_id = s.id
            cross join capped_anchor ca
            where fr.date <= ca.value
            group by s.id
          ) per_system
          where latest_date is not null
        )
        when 'feed_inventory' then (
          select max(fi.inventory_date)
          from public.feed_inventory fi
          cross join capped_anchor ca
          where fi.farm_id = p_farm_id
            and fi.inventory_date <= ca.value
            and p_system_id is null
        )
        else (
          select min(latest_date)
          from (
            select max(d.inventory_date) as latest_date
            from active_systems s
            join analytics.daily_system_facts d on d.system_id = s.id
            cross join capped_anchor ca
            where d.inventory_date <= ca.value
            group by s.id
          ) per_system
          where latest_date is not null
        )
      end as latest_available_date,
      case rs.anchor_scope
        when 'water_quality' then (
          select min(dwr.rating_date)
          from active_systems s
          join public.daily_water_quality_rating dwr on dwr.system_id = s.id
          where dwr.rating_date <= current_date
        )
        when 'feeding' then (
          select min(fr.date)
          from active_systems s
          join public.feeding_record fr on fr.system_id = s.id
          where fr.date <= current_date
        )
        when 'feed_inventory' then (
          select min(fi.inventory_date)
          from public.feed_inventory fi
          where fi.farm_id = p_farm_id
            and fi.inventory_date <= current_date
            and p_system_id is null
        )
        else (
          select min(d.inventory_date)
          from active_systems s
          join analytics.daily_system_facts d on d.system_id = s.id
          where d.inventory_date <= current_date
        )
      end as available_from_date
    from resolved_scope rs
  ),
  bounded as (
    select
      tp.time_period,
      sd.anchor_scope,
      sd.latest_available_date as input_end_date,
      sd.available_from_date,
      tp.requested_days,
      case
        when sd.latest_available_date is null or sd.available_from_date is null then null::date
        when tp.time_period = 'all history' then sd.available_from_date
        else greatest(sd.available_from_date, sd.latest_available_date - (tp.requested_days - 1))
      end as input_start_date
    from tp cross join scoped_dates sd
  )
  select
    b.time_period,
    b.input_start_date,
    b.input_end_date,
    case when p_system_id is null then b.anchor_scope else b.anchor_scope || ':system' end as anchor_scope,
    b.input_end_date as latest_available_date,
    b.available_from_date,
    b.requested_days,
    case
      when b.input_end_date is null or b.available_from_date is null then null::integer
      else (b.input_end_date - b.available_from_date + 1)::integer
    end as available_days,
    case
      when b.input_end_date is null or b.input_start_date is null then null::integer
      else (b.input_end_date - b.input_start_date + 1)::integer
    end as resolved_days,
    case
      when b.input_end_date is null then null::integer
      else greatest((current_date - b.input_end_date)::integer, 0)
    end as staleness_days,
    case
      when b.time_period = 'all history' then false
      when b.input_end_date is null or b.available_from_date is null or b.input_start_date is null then false
      else b.input_start_date > (b.input_end_date - (b.requested_days - 1))
    end as is_truncated
  from bounded b;
$$;


ALTER FUNCTION "public"."api_time_period_bounds_scoped"("p_farm_id" "uuid", "p_time_period" "text", "p_scope" "text", "p_anchor_date" "date", "p_system_id" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."api_time_period_bounds_scoped"("p_farm_id" "uuid", "p_time_period" "text", "p_scope" "text", "p_anchor_date" "date", "p_system_id" bigint) IS 'Intentional app-facing SECURITY DEFINER RPC. Anchors shared time windows to active-system data coverage so filters do not drop active systems just because another system has newer data.';



CREATE OR REPLACE FUNCTION "public"."api_water_quality_index"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint, "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("system_id" bigint, "system_name" "text", "period_start" "date", "period_end" "date", "wqi_score" double precision, "wqi_grade" "text", "measurement_days" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'analytics', 'pg_temp'
    AS $$
DECLARE
  v_start date := COALESCE(p_start_date, date '1900-01-01');
  v_end   date := COALESCE(p_end_date,   CURRENT_DATE);
BEGIN
  IF NOT private.is_farm_member(p_farm_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH wq_window AS (
    SELECT
      dwr.system_id,
      dwr.rating_date,
      dwr.rating_numeric
    FROM public.daily_water_quality_rating dwr
    JOIN public.system s ON s.id = dwr.system_id
    WHERE s.farm_id = p_farm_id
      AND (p_system_id IS NULL OR dwr.system_id = p_system_id)
      AND dwr.rating_date BETWEEN v_start AND v_end
      AND dwr.rating_numeric IS NOT NULL
  )
  SELECT
    w.system_id,
    s.name::text                                    AS system_name,
    MIN(w.rating_date)::date                        AS period_start,
    MAX(w.rating_date)::date                        AS period_end,
    AVG(w.rating_numeric::double precision)         AS wqi_score,
    public.water_quality_rating_label(
      AVG(w.rating_numeric::numeric)
    )                                               AS wqi_grade,
    COUNT(DISTINCT w.rating_date)                   AS measurement_days
  FROM wq_window w
  JOIN public.system s ON s.id = w.system_id
  GROUP BY w.system_id, s.name
  ORDER BY s.name;
END;
$$;


ALTER FUNCTION "public"."api_water_quality_index"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_water_quality_trend"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint, "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("wq_date" "date", "system_id" bigint, "system_name" "text", "temp_avg" double precision, "temp_min" double precision, "temp_max" double precision, "do_avg" double precision, "do_min" double precision, "do_max" double precision, "do_variation" double precision, "ph_avg" double precision, "rating" "text", "rating_numeric" integer, "rating_7d_rolling" double precision)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
declare
  v_start date := coalesce(p_start_date, date '1900-01-01');
  v_end   date := coalesce(p_end_date,   current_date);
begin
  if not private.is_farm_member(p_farm_id) then
    return;
  end if;

  return query
  with daily_params as (
    select
      wqm.system_id,
      s.farm_id,
      wqm.date AS wq_date,
      avg(CASE WHEN wqm.parameter_name::text = 'temperature' THEN wqm.parameter_value END)         AS temp_avg,
      min(CASE WHEN wqm.parameter_name::text = 'temperature' THEN wqm.parameter_value END)         AS temp_min,
      max(CASE WHEN wqm.parameter_name::text = 'temperature' THEN wqm.parameter_value END)         AS temp_max,
      avg(CASE WHEN wqm.parameter_name::text = 'dissolved_oxygen' THEN wqm.parameter_value END)    AS do_avg,
      min(CASE WHEN wqm.parameter_name::text = 'dissolved_oxygen' THEN wqm.parameter_value END)    AS do_min,
      max(CASE WHEN wqm.parameter_name::text = 'dissolved_oxygen' THEN wqm.parameter_value END)    AS do_max,
      avg(CASE WHEN wqm.parameter_name::text = 'ph' THEN wqm.parameter_value END)                  AS ph_avg
    from public.water_quality_measurement wqm
    join public.system s ON s.id = wqm.system_id
    where s.farm_id = p_farm_id
      and (p_system_id is null or wqm.system_id = p_system_id)
      and wqm.date between v_start and v_end
    group by wqm.system_id, s.farm_id, wqm.date
  ),
  with_rating as (
    select
      dp.*,
      dqr.system_name,
      dqr.rating,
      dqr.rating_numeric
    from daily_params dp
    left join public.api_daily_water_quality_rating dqr
      ON dqr.system_id = dp.system_id AND dqr.rating_date = dp.wq_date
  )
  select
    wr.wq_date,
    wr.system_id,
    wr.system_name,
    wr.temp_avg,
    wr.temp_min,
    wr.temp_max,
    wr.do_avg,
    wr.do_min,
    wr.do_max,
    (wr.do_max - wr.do_min)                                                         AS do_variation,
    wr.ph_avg,
    wr.rating::text,
    wr.rating_numeric,
    avg(wr.rating_numeric::double precision) OVER (
      PARTITION BY wr.system_id
      ORDER BY wr.wq_date
      ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    )                                                                               AS rating_7d_rolling
  from with_rating wr
  order by wr.system_id, wr.wq_date;
end;
$$;


ALTER FUNCTION "public"."api_water_quality_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_operation_lineage_from_system"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  lineage record;
begin
  if new.cycle_id is null or new.batch_id is null then
    select *
      into lineage
    from public.resolve_cycle_batch_for_system_date(new.system_id, new.date);

    if lineage.cycle_id is null or lineage.batch_id is null then
      raise exception 'No stocked or transferred fish batch could be resolved for system % on %', new.system_id, new.date;
    end if;

    new.cycle_id := coalesce(new.cycle_id, lineage.cycle_id);
    new.batch_id := coalesce(new.batch_id, lineage.batch_id);
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."assign_operation_lineage_from_system"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_transfer_lineage_from_origin"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  lineage record;
begin
  if new.cycle_id is null or new.batch_id is null then
    if new.origin_system_id is null then
      raise exception 'origin_system_id is required to resolve transfer batch lineage';
    end if;

    select *
      into lineage
    from public.resolve_cycle_batch_for_system_date(new.origin_system_id, new.date);

    if lineage.cycle_id is null or lineage.batch_id is null then
      raise exception 'No stocked or transferred fish batch could be resolved for transfer origin system % on %', new.origin_system_id, new.date;
    end if;

    new.cycle_id := coalesce(new.cycle_id, lineage.cycle_id);
    new.batch_id := coalesce(new.batch_id, lineage.batch_id);
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."assign_transfer_lineage_from_origin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_my_farm_user_invitations"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_email text := lower(trim(coalesce(auth.email(), '')));
begin
  if auth.uid() is null or v_email = '' then
    return 0;
  end if;

  return private.apply_pending_farm_user_invitations(auth.uid(), v_email);
end;
$$;


ALTER FUNCTION "public"."claim_my_farm_user_invitations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."classify_growth_stage_tanganicae"("p_abw_g" numeric) RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select case
    when p_abw_g is null then null
    when p_abw_g < 20.0 then 'fingerling'
    when p_abw_g < 80.0 then 'juvenile'
    when p_abw_g < 250.0 then 'sub_adult'
    else 'broodstock'
  end;
$$;


ALTER FUNCTION "public"."classify_growth_stage_tanganicae"("p_abw_g" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."classify_water_quality_measurement"("p_parameter_value" double precision, "p_optimal" "jsonb", "p_acceptable" "jsonb", "p_critical" "jsonb", "p_lethal" "jsonb") RETURNS TABLE("measurement_rating" "public"."water_quality_rating", "severity_rank" integer, "distance_from_next_better_band" double precision)
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  opt_min  double precision := nullif(p_optimal->>'min', '')::double precision;
  opt_max  double precision := nullif(p_optimal->>'max', '')::double precision;
  acc_min  double precision := nullif(p_acceptable->>'min', '')::double precision;
  acc_max  double precision := nullif(p_acceptable->>'max', '')::double precision;
  crit_min double precision := nullif(p_critical->>'min', '')::double precision;
  crit_max double precision := nullif(p_critical->>'max', '')::double precision;
  v_distance double precision;
begin
  if (opt_min is null or p_parameter_value >= opt_min)
     and (opt_max is null or p_parameter_value <= opt_max) then
    v_distance := least(coalesce(p_parameter_value - opt_min, 1e12), coalesce(opt_max - p_parameter_value, 1e12));
    return query select 'optimal'::public.water_quality_rating, 3, v_distance;
    return;
  end if;

  if (acc_min is null or p_parameter_value >= acc_min)
     and (acc_max is null or p_parameter_value <= acc_max) then
    v_distance := least(
      case when opt_min is not null and p_parameter_value < opt_min then opt_min - p_parameter_value else 1e12 end,
      case when opt_max is not null and p_parameter_value > opt_max then p_parameter_value - opt_max else 1e12 end
    );
    return query select 'acceptable'::public.water_quality_rating, 2, v_distance;
    return;
  end if;

  if (crit_min is null or p_parameter_value >= crit_min)
     and (crit_max is null or p_parameter_value <= crit_max) then
    v_distance := least(
      case when acc_min is not null and p_parameter_value < acc_min then acc_min - p_parameter_value else 1e12 end,
      case when acc_max is not null and p_parameter_value > acc_max then p_parameter_value - acc_max else 1e12 end
    );
    return query select 'critical'::public.water_quality_rating, 1, v_distance;
    return;
  end if;

  v_distance := least(
    case when crit_min is not null and p_parameter_value < crit_min then crit_min - p_parameter_value else 1e12 end,
    case when crit_max is not null and p_parameter_value > crit_max then p_parameter_value - crit_max else 1e12 end
  );
  return query select 'lethal'::public.water_quality_rating, 0, v_distance;
end;
$$;


ALTER FUNCTION "public"."classify_water_quality_measurement"("p_parameter_value" double precision, "p_optimal" "jsonb", "p_acceptable" "jsonb", "p_critical" "jsonb", "p_lethal" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."close_cycle_on_final_harvest"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  resolved_cycle_id int;
begin
  if new.type_of_harvest <> 'final'::public.type_of_harvest then
    return null;
  end if;

  resolved_cycle_id := new.cycle_id;

  if resolved_cycle_id is null then
    select pc.cycle_id
      into resolved_cycle_id
    from public.production_cycle pc
    where pc.system_id = new.system_id
      and pc.cycle_end is null
      and pc.cycle_start <= new.date
    order by pc.cycle_start desc, pc.cycle_id desc
    limit 1;
  end if;

  if resolved_cycle_id is null then
    raise exception 'Final harvest on % for system % but no production cycle exists.', new.date, new.system_id;
  end if;

  update public.production_cycle pc
  set cycle_end = new.date,
      ongoing_cycle = false
  where pc.cycle_id = resolved_cycle_id
    and (pc.cycle_end is null or pc.cycle_end >= new.date);

  return null;
end;
$$;


ALTER FUNCTION "public"."close_cycle_on_final_harvest"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_farm_user_invitation"("p_farm_id" "uuid", "p_email" "text", "p_role" "text" DEFAULT 'viewer'::"text") RETURNS SETOF "public"."farm_user_invitation_rpc_result"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_role text := lower(trim(coalesce(p_role, 'viewer')));
begin
  if auth.uid() is null
     or not private.has_farm_role(p_farm_id, array['admin'], auth.uid()) then
    raise insufficient_privilege using errcode = '42501';
  end if;

  if v_email = '' or position('@' in v_email) <= 1 then
    raise exception 'A valid email is required.' using errcode = '22023';
  end if;

  if v_role not in ('admin', 'farm_manager', 'system_operator', 'data_analyst', 'viewer') then
    raise exception 'Invalid role.' using errcode = '22023';
  end if;

  return query
  with updated as (
    update private.farm_user_invitation i
    set
      role = v_role,
      status = 'pending',
      invited_by = auth.uid(),
      updated_at = timezone('utc', now()),
      revoked_at = null,
      accepted_at = null,
      invited_user_id = null
    where i.farm_id = p_farm_id
      and i.email = v_email
      and i.revoked_at is null
      and i.accepted_at is null
    returning i.*
  ),
  inserted as (
    insert into private.farm_user_invitation (
      farm_id,
      email,
      role,
      status,
      invited_by
    )
    select
      p_farm_id,
      v_email,
      v_role,
      'pending',
      auth.uid()
    where not exists (select 1 from updated)
    returning *
  ),
  selected as (
    select * from updated
    union all
    select * from inserted
  )
  select
    s.id,
    s.farm_id,
    s.email,
    s.role,
    s.status,
    s.invited_by,
    s.invited_user_id,
    s.created_at,
    s.updated_at,
    s.last_sent_at,
    s.accepted_at,
    s.revoked_at,
    true as should_send_auth_invite
  from selected s;
end;
$$;


ALTER FUNCTION "public"."create_farm_user_invitation"("p_farm_id" "uuid", "p_email" "text", "p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_cycle_on_stocking"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  resolved_cycle_id int;
begin
  if new.batch_id is null then
    raise exception 'fish_stocking.batch_id is required to start a production cycle';
  end if;

  resolved_cycle_id := new.cycle_id;

  if resolved_cycle_id is null then
    select pc.cycle_id
      into resolved_cycle_id
    from public.production_cycle pc
    where pc.system_id = new.system_id
      and pc.batch_id = new.batch_id
      and new.date >= pc.cycle_start
      and new.date <= coalesce(pc.cycle_end, 'infinity'::date)
    order by
      case when pc.cycle_end is null then 0 else 1 end,
      pc.cycle_start desc,
      pc.cycle_id desc
    limit 1;
  end if;

  if resolved_cycle_id is null then
    insert into public.production_cycle(system_id, batch_id, cycle_start, cycle_end, ongoing_cycle)
    values (new.system_id, new.batch_id, new.date, null, true)
    returning cycle_id into resolved_cycle_id;
  end if;

  update public.production_cycle pc
  set batch_id = new.batch_id,
      cycle_start = least(pc.cycle_start, new.date),
      ongoing_cycle = (pc.cycle_end is null)
  where pc.cycle_id = resolved_cycle_id
    and (
      pc.batch_id is distinct from new.batch_id
      or pc.cycle_start > new.date
      or pc.ongoing_cycle is distinct from (pc.cycle_end is null)
    );

  new.cycle_id := resolved_cycle_id;
  return new;
end;
$$;


ALTER FUNCTION "public"."ensure_cycle_on_stocking"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."feed_inventory_snapshot_kg"("p_bag_weight" integer, "p_amount_of_bags" integer, "p_opened_bags" integer) RETURNS numeric
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select greatest(
    coalesce(p_bag_weight, 0)::numeric * coalesce(p_amount_of_bags, 0)::numeric
      + coalesce(p_opened_bags, 0)::numeric / 1000.0,
    0::numeric
  );
$$;


ALTER FUNCTION "public"."feed_inventory_snapshot_kg"("p_bag_weight" integer, "p_amount_of_bags" integer, "p_opened_bags" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_daily_feed_target_kg"("p_farm_id" "uuid" DEFAULT NULL::"uuid", "p_system_id" bigint DEFAULT NULL::bigint) RETURNS TABLE("system_name" "text", "growth_stage" "text", "estimated_biomass_kg" numeric, "feed_rate_min_pct" numeric, "feed_rate_max_pct" numeric, "daily_feed_min_kg" numeric, "daily_feed_target_kg" numeric, "daily_feed_max_kg" numeric, "sessions_per_day" integer, "pellet_size_mm" "text", "per_session_kg" numeric)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'analytics', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  WITH latest_biomass AS (
    SELECT DISTINCT ON (ps.system_id)
      ps.system_id,
      ps.biomass_kg::numeric AS estimated_biomass_kg
    FROM analytics.production_summary ps
    JOIN public.system s ON s.id = ps.system_id
    WHERE ps.ongoing_cycle = TRUE
      AND ps.biomass_kg IS NOT NULL
      AND ps.biomass_kg > 0
      AND private.is_farm_member(s.farm_id)
      AND (p_farm_id IS NULL OR s.farm_id = p_farm_id)
      AND (p_system_id IS NULL OR ps.system_id = p_system_id)
    ORDER BY ps.system_id, ps.date DESC, ps.activity_rank DESC
  )
  SELECT
    s.name AS system_name,
    s.growth_stage::text,
    lb.estimated_biomass_kg,
    fr.feed_rate_min_pct,
    fr.feed_rate_max_pct,
    ROUND(lb.estimated_biomass_kg * fr.feed_rate_min_pct / 100.0, 3) AS daily_feed_min_kg,
    ROUND(lb.estimated_biomass_kg * fr.feed_rate_mid_pct / 100.0, 3) AS daily_feed_target_kg,
    ROUND(lb.estimated_biomass_kg * fr.feed_rate_max_pct / 100.0, 3) AS daily_feed_max_kg,
    fr.sessions_per_day,
    fr.pellet_size_mm,
    ROUND((lb.estimated_biomass_kg * fr.feed_rate_mid_pct / 100.0) / NULLIF(fr.sessions_per_day, 0), 3) AS per_session_kg
  FROM latest_biomass lb
  JOIN public.system s ON s.id = lb.system_id
  CROSS JOIN LATERAL public.get_feed_rate_target(s.growth_stage::text) fr
  ORDER BY s.name;
END;
$$;


ALTER FUNCTION "public"."get_daily_feed_target_kg"("p_farm_id" "uuid", "p_system_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_feed_rate_target"("p_growth_stage" "text") RETURNS TABLE("stage" "text", "abw_range_g" "text", "feed_rate_min_pct" numeric, "feed_rate_max_pct" numeric, "feed_rate_mid_pct" numeric, "sessions_per_day" integer, "pellet_size_mm" "text")
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select stage_name, abw_range, lo, hi, round((lo + hi) / 2.0, 2), sessions, pellet
  from (values
    ('fingerling', '0 - 20g', 3.0::numeric, 8.0::numeric, 4, '0.5 - 1.6 mm'),
    ('juvenile', '20 - 80g', 2.0::numeric, 4.0::numeric, 4, '1.6 - 2.0 mm'),
    ('sub_adult', '80 - 250g', 1.0::numeric, 2.5::numeric, 3, '2 - 4 mm'),
    ('broodstock', '>= 250g', 0.5::numeric, 1.5::numeric, 2, '3 - 4 mm')
  ) t(stage_name, abw_range, lo, hi, sessions, pellet)
  where stage_name = p_growth_stage or p_growth_stage is null;
$$;


ALTER FUNCTION "public"."get_feed_rate_target"("p_growth_stage" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_running_stock"("p_farm_id" "uuid") RETURNS TABLE("feed_type_id" bigint, "feed_type_name" "text", "pellet_size" "text", "current_stock_kg" numeric, "avg_daily_usage_kg" numeric, "days_remaining" numeric, "stock_status" "text", "last_delivery_date" "date")
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
with latest_inventory_date as (
  select max(fi.inventory_date) as inventory_date
  from public.feed_inventory fi
  where fi.farm_id = p_farm_id
    and fi.inventory_date <= current_date
),
latest_snapshot as (
  select distinct on (fi.feed_type_id)
    fi.feed_type_id,
    public.feed_inventory_snapshot_kg(fi.bag_weight, fi.amount_of_bags, fi.opened_bags) as stock_kg,
    fi.inventory_date as last_inventory_date
  from public.feed_inventory fi
  join latest_inventory_date lid on lid.inventory_date = fi.inventory_date
  where fi.farm_id = p_farm_id
  order by fi.feed_type_id, fi.inventory_date desc, fi.inventory_time desc nulls last, fi.id desc
),
usage_7d as (
  select fr.feed_type_id, greatest(sum(fr.feeding_amount)::numeric / 7.0, 0.001) as avg_d
  from public.feeding_record fr
  join public.system s on s.id = fr.system_id
  where s.farm_id = p_farm_id
    and fr.feed_type_id is not null
    and fr.date >= current_date - 7
  group by fr.feed_type_id
),
used_types as (
  select distinct fr.feed_type_id
  from public.feeding_record fr
  join public.system s on s.id = fr.system_id
  where s.farm_id = p_farm_id
    and fr.feed_type_id is not null
),
base as (
  select
    ft.id as feed_type_id,
    concat_ws(' ', coalesce(ft.feed_line, ''), ft.feed_category::text,
      ft.feed_pellet_size::text, concat('CP', ft.crude_protein_percentage::text))::text as feed_type_name,
    ft.feed_pellet_size::text as pellet_size,
    coalesce(ls.stock_kg, 0) as stock_kg,
    u7.avg_d,
    ls.last_inventory_date
  from public.feed_type ft
  left join latest_snapshot ls on ls.feed_type_id = ft.id
  left join usage_7d u7 on u7.feed_type_id = ft.id
  left join used_types ut on ut.feed_type_id = ft.id
  where coalesce(ft.is_active, true)
    and (ls.feed_type_id is not null or ut.feed_type_id is not null)
)
select
  b.feed_type_id,
  b.feed_type_name,
  b.pellet_size,
  round(b.stock_kg, 2),
  round(coalesce(b.avg_d, 0), 2),
  case when coalesce(b.avg_d, 0) > 0 then round(b.stock_kg / b.avg_d, 1) else null end as days_remaining,
  case
    when coalesce(b.avg_d, 0) = 0 then 'no_data'
    when b.stock_kg / b.avg_d < 7 then 'critical'
    when b.stock_kg / b.avg_d < 14 then 'low'
    when b.stock_kg / b.avg_d < 30 then 'reorder'
    else 'ok'
  end as stock_status,
  b.last_inventory_date as last_delivery_date
from base b
order by b.stock_kg asc;
$$;


ALTER FUNCTION "public"."get_running_stock"("p_farm_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_email text := lower(trim(coalesce(new.email, '')));
  v_full_name text := nullif(
    trim(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')),
    ''
  );
  v_role text := coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'viewer');
begin
  insert into public.user_profile (
    user_id,
    email,
    full_name,
    role
  )
  values (
    new.id,
    v_email,
    v_full_name,
    v_role
  )
  on conflict (user_id) do update
  set
    email = coalesce(excluded.email, public.user_profile.email),
    full_name = coalesce(public.user_profile.full_name, excluded.full_name),
    role = case
      when exists (select 1 from public.farm_user fu where fu.user_id = new.id)
        then public.user_profile.role
      else coalesce(public.user_profile.role, excluded.role)
    end,
    updated_at = timezone('utc', now());

  perform private.apply_pending_farm_user_invitations(new.id, v_email);

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_farm_user_invitation_sent"("p_invitation_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_farm_id uuid;
begin
  select i.farm_id
  into v_farm_id
  from private.farm_user_invitation i
  where i.id = p_invitation_id;

  if v_farm_id is null then
    raise exception 'Invitation not found' using errcode = 'P0002';
  end if;

  if auth.uid() is null
     or not private.has_farm_role(v_farm_id, array['admin'], auth.uid()) then
    raise insufficient_privilege using errcode = '42501';
  end if;

  update private.farm_user_invitation
  set
    last_sent_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where id = p_invitation_id;
end;
$$;


ALTER FUNCTION "public"."mark_farm_user_invitation_sent"("p_invitation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_manual_wqr_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  -- Allow writes only when the system explicitly unlocks this table
  IF current_setting('app.allow_wqr_write', true) = 'true' THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'daily_water_quality_rating is managed by the system only. '
    'Direct INSERT/UPDATE/DELETE is not permitted.';
END;
$$;


ALTER FUNCTION "public"."prevent_manual_wqr_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_system_name_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  IF NEW.name <> OLD.name AND OLD.is_active = true THEN
    RAISE EXCEPTION 'system.name is immutable once created';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_system_name_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_inventory_queue"("p_limit" integer DEFAULT 50) RETURNS TABLE("processed_system_id" bigint, "processed_to_date" "date", "upserted_days" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'analytics'
    AS $$
DECLARE
  r record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public._affected_systems) THEN
    RETURN;
  END IF;

  REFRESH MATERIALIZED VIEW analytics.daily_system_facts;
  REFRESH MATERIALIZED VIEW analytics.production_summary;

  FOR r IN
    SELECT system_id FROM public._affected_systems ORDER BY system_id
  LOOP
    processed_system_id := r.system_id;
    processed_to_date   := CURRENT_DATE;
    upserted_days       := 0;
    RETURN NEXT;
  END LOOP;

  DELETE FROM public._affected_systems;
END;
$$;


ALTER FUNCTION "public"."process_inventory_queue"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."production_cycle_set_ongoing"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  new.ongoing_cycle := (new.cycle_end is null);
  return new;
end;
$$;


ALTER FUNCTION "public"."production_cycle_set_ongoing"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."provision_default_farm_membership"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
begin
  perform private.apply_pending_farm_user_invitations(new.id, new.email);
  return new;
end;
$$;


ALTER FUNCTION "public"."provision_default_farm_membership"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_after_system_if_needed"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'DELETE') THEN
    INSERT INTO public._affected_systems (system_id, min_affected_date)
    VALUES (COALESCE(NEW.id, OLD.id), COALESCE(NEW.commissioned_at, CURRENT_DATE - INTERVAL '1 year'))
    ON CONFLICT (system_id)
    DO UPDATE SET min_affected_date = LEAST(
      public._affected_systems.min_affected_date,
      EXCLUDED.min_affected_date
    );
  ELSIF
    NEW.volume             IS DISTINCT FROM OLD.volume
    OR NEW.farm_id         IS DISTINCT FROM OLD.farm_id
    OR NEW.name            IS DISTINCT FROM OLD.name
    OR NEW.growth_stage    IS DISTINCT FROM OLD.growth_stage
    OR COALESCE(NEW.is_active, true) IS DISTINCT FROM COALESCE(OLD.is_active, true)
  THEN
    INSERT INTO public._affected_systems (system_id, min_affected_date)
    VALUES (NEW.id, CURRENT_DATE - INTERVAL '1 year')
    ON CONFLICT (system_id)
    DO UPDATE SET min_affected_date = LEAST(
      public._affected_systems.min_affected_date,
      EXCLUDED.min_affected_date
    );
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."refresh_after_system_if_needed"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_daily_water_quality_rating"("p_system_id" bigint DEFAULT NULL::bigint, "p_from" "date" DEFAULT NULL::"date", "p_to" "date" DEFAULT NULL::"date") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  -- Allow writes to the protected table within this function scope only
  PERFORM set_config('app.allow_wqr_write', 'true', true);  -- true = local to transaction

  with measurement_base as (
    select wqm.system_id, wqm.date as rating_date, wqm.parameter_name,
      wqm.parameter_value, wf.unit::text as unit,
      wf.parameter_optimal, wf.parameter_acceptable, wf.parameter_critical, wf.parameter_lethal
    from public.water_quality_measurement wqm
    join public.water_quality_framework wf on wf.parameter_name = wqm.parameter_name
    where (p_system_id is null or wqm.system_id = p_system_id)
      and (p_from is null or wqm.date >= p_from)
      and (p_to is null or wqm.date <= p_to)
  ),
  measurement_scored as (
    select mb.system_id, mb.rating_date, mb.parameter_name, mb.parameter_value, mb.unit,
      c.measurement_rating, c.severity_rank, c.distance_from_next_better_band
    from measurement_base mb
    cross join lateral public.classify_water_quality_measurement(
      mb.parameter_value, mb.parameter_optimal, mb.parameter_acceptable,
      mb.parameter_critical, mb.parameter_lethal
    ) c
  ),
  ranked as (
    select ms.*,
      row_number() over (
        partition by ms.system_id, ms.rating_date
        order by ms.severity_rank asc, ms.distance_from_next_better_band asc,
          ms.parameter_name asc, ms.parameter_value asc
      ) as rn
    from measurement_scored ms
  ),
  daily_result as (
    select r.system_id, r.rating_date, r.measurement_rating as rating,
      r.parameter_name as worst_parameter, r.parameter_value as worst_parameter_value,
      r.unit as worst_parameter_unit, r.severity_rank,
      case r.measurement_rating
        when 'lethal' then 0 when 'critical' then 1
        when 'acceptable' then 2 when 'optimal' then 3
      end as rating_numeric
    from ranked r where r.rn = 1
  )
  insert into public.daily_water_quality_rating (
    system_id, rating_date, rating, worst_parameter, worst_parameter_value,
    worst_parameter_unit, rating_numeric
  )
  select dr.system_id, dr.rating_date, dr.rating, dr.worst_parameter,
    dr.worst_parameter_value, dr.worst_parameter_unit, dr.rating_numeric
  from daily_result dr
  on conflict (system_id, rating_date)
  do update set
    rating = excluded.rating,
    worst_parameter = excluded.worst_parameter,
    worst_parameter_value = excluded.worst_parameter_value,
    worst_parameter_unit = excluded.worst_parameter_unit,
    rating_numeric = excluded.rating_numeric;

  delete from public.daily_water_quality_rating d
  where (p_system_id is null or d.system_id = p_system_id)
    and (p_from is null or d.rating_date >= p_from)
    and (p_to is null or d.rating_date <= p_to)
    and not exists (
      select 1 from public.water_quality_measurement wqm
      where wqm.system_id = d.system_id and wqm.date = d.rating_date
    );

  -- Reset the flag (redundant since it's transaction-local, but explicit)
  PERFORM set_config('app.allow_wqr_write', 'false', true);
end;
$$;


ALTER FUNCTION "public"."refresh_daily_water_quality_rating"("p_system_id" bigint, "p_from" "date", "p_to" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_cycle_batch_for_system_date"("p_system_id" bigint, "p_date" "date") RETURNS TABLE("cycle_id" integer, "batch_id" bigint)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select candidate.cycle_id, candidate.batch_id
  from (
    select
      pc.cycle_id,
      pc.batch_id,
      20 as priority,
      pc.cycle_start as event_date,
      pc.cycle_id::bigint as event_id
    from public.production_cycle pc
    where pc.system_id = p_system_id
      and p_date >= pc.cycle_start
      and p_date <= coalesce(pc.cycle_end, 'infinity'::date)

    union all

    select
      ft.cycle_id,
      ft.batch_id,
      10 as priority,
      ft.date as event_date,
      ft.id::bigint as event_id
    from public.fish_transfer ft
    where ft.target_system_id = p_system_id
      and ft.date <= p_date
      and ft.cycle_id is not null
      and ft.batch_id is not null
      and not exists (
        select 1
        from public.fish_transfer moved_out
        where moved_out.origin_system_id = p_system_id
          and moved_out.cycle_id = ft.cycle_id
          and moved_out.date > ft.date
          and moved_out.date <= p_date
      )
  ) as candidate
  order by candidate.event_date desc, candidate.priority asc, candidate.event_id desc
  limit 1;
$$;


ALTER FUNCTION "public"."resolve_cycle_batch_for_system_date"("p_system_id" bigint, "p_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_sampling_abw_g"("p_abw" double precision, "p_total_weight_sampling" double precision, "p_number_of_fish_sampling" numeric) RETURNS numeric
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select public.resolve_sampling_abw_g(
    p_abw::numeric,
    p_total_weight_sampling::numeric,
    p_number_of_fish_sampling
  )
$$;


ALTER FUNCTION "public"."resolve_sampling_abw_g"("p_abw" double precision, "p_total_weight_sampling" double precision, "p_number_of_fish_sampling" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_sampling_abw_g"("p_abw" numeric, "p_total_weight_sampling" numeric, "p_number_of_fish_sampling" numeric) RETURNS numeric
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select case
    when p_abw is not null and p_abw > 0 then p_abw
    when nullif(p_number_of_fish_sampling, 0) is null then null
    when p_total_weight_sampling is null or p_total_weight_sampling <= 0 then null
    -- More than 20 per fish is implausible as kg/fish for this farm, so treat
    -- the total as grams. Otherwise treat the total as kilograms.
    when (p_total_weight_sampling / p_number_of_fish_sampling) > 20
      then p_total_weight_sampling / p_number_of_fish_sampling
    else (p_total_weight_sampling * 1000.0) / p_number_of_fish_sampling
  end
$$;


ALTER FUNCTION "public"."resolve_sampling_abw_g"("p_abw" numeric, "p_total_weight_sampling" numeric, "p_number_of_fish_sampling" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revoke_farm_user_invitation"("p_invitation_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_farm_id uuid;
begin
  select i.farm_id
  into v_farm_id
  from private.farm_user_invitation i
  where i.id = p_invitation_id;

  if v_farm_id is null then
    raise exception 'Invitation not found' using errcode = 'P0002';
  end if;

  if auth.uid() is null
     or not private.has_farm_role(v_farm_id, array['admin'], auth.uid()) then
    raise insufficient_privilege using errcode = '42501';
  end if;

  update private.farm_user_invitation
  set
    status = 'revoked',
    revoked_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where id = p_invitation_id
    and status = 'pending'
    and revoked_at is null
    and accepted_at is null;

  if not found then
    raise exception 'Only pending invitations can be revoked' using errcode = '22023';
  end if;

  return p_invitation_id;
end;
$$;


ALTER FUNCTION "public"."revoke_farm_user_invitation"("p_invitation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_harvest_abw"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  if new.number_of_fish_harvest is null or new.number_of_fish_harvest <= 0 then
    raise exception 'number_of_fish_harvest must be greater than zero';
  end if;

  if new.total_weight_harvest <= 0 then
    raise exception 'total_weight_harvest must be greater than zero';
  end if;

  new.abw := (new.total_weight_harvest * 1000.0) / new.number_of_fish_harvest;

  return new;
end;
$$;


ALTER FUNCTION "public"."set_harvest_abw"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_sampling_weight_abw"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  if new.number_of_fish_sampling is null or new.number_of_fish_sampling <= 0 then
    raise exception 'number_of_fish_sampling must be greater than zero';
  end if;

  if new.total_weight_sampling is null or new.total_weight_sampling <= 0 then
    raise exception 'total_weight_sampling must be greater than zero';
  end if;

  -- Historical imports sometimes used grams for total sample weight. Normalize
  -- impossible kg-per-fish values before calculating ABW.
  if (new.total_weight_sampling / new.number_of_fish_sampling) > 20 then
    new.total_weight_sampling := new.total_weight_sampling / 1000.0;
  end if;

  new.abw := (new.total_weight_sampling * 1000.0) / new.number_of_fish_sampling;

  return new;
end;
$$;


ALTER FUNCTION "public"."set_sampling_weight_abw"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_affected_systems_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


ALTER FUNCTION "public"."touch_affected_systems_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transfer_impacts_efcr"("p_transfer_type" "public"."transfer_type", "p_origin_system_id" bigint, "p_target_system_id" bigint) RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select case
    when coalesce(
      p_transfer_type::text,
      case when p_origin_system_id = p_target_system_id then 'count_check' else 'transfer' end
    ) in ('transfer', 'grading', 'density_thinning', 'external_out') then true
    else false
  end;
$$;


ALTER FUNCTION "public"."transfer_impacts_efcr"("p_transfer_type" "public"."transfer_type", "p_origin_system_id" bigint, "p_target_system_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transfer_weight_kg"("p_total_weight_transfer" double precision, "p_number_of_fish_transfer" double precision, "p_abw" double precision) RETURNS double precision
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
  select coalesce(
    p_total_weight_transfer,
    case
      when p_number_of_fish_transfer is not null
       and p_number_of_fish_transfer > 0
       and p_abw is not null
       and p_abw > 0
      then (p_number_of_fish_transfer * p_abw) / 1000.0
      else null::double precision
    end
  )
$$;


ALTER FUNCTION "public"."transfer_weight_kg"("p_total_weight_transfer" double precision, "p_number_of_fish_transfer" double precision, "p_abw" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_refresh_daily_water_quality_rating"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  v_system_id bigint;
  v_date date;
begin
  if tg_op = 'DELETE' then
    v_system_id := old.system_id; v_date := old.date;
  else
    v_system_id := new.system_id; v_date := new.date;
  end if;

  perform public.refresh_daily_water_quality_rating(v_system_id, v_date, v_date);

  if tg_op = 'UPDATE' then
    if old.system_id is distinct from new.system_id or old.date is distinct from new.date then
      perform public.refresh_daily_water_quality_rating(old.system_id, old.date, old.date);
    end if;
  end if;
  return null;
end;
$$;


ALTER FUNCTION "public"."trg_refresh_daily_water_quality_rating"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_refresh_daily_water_quality_rating_from_framework"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$ declare v_parameter public.water_quality_parameters; v_min_date date; v_max_date date; begin v_parameter := coalesce(new.parameter_name, old.parameter_name); select min(wqm.date), max(wqm.date) into v_min_date, v_max_date from public.water_quality_measurement wqm where wqm.parameter_name = v_parameter; if v_min_date is not null then perform public.refresh_daily_water_quality_rating(null, v_min_date, v_max_date); end if; return null; end; $$;


ALTER FUNCTION "public"."trg_refresh_daily_water_quality_rating_from_framework"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_update_system_growth_stage"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  v_abw_g numeric;
  v_new_stage text;
begin
  v_abw_g := public.resolve_sampling_abw_g(
    new.abw::numeric,
    new.total_weight_sampling::numeric,
    new.number_of_fish_sampling::numeric
  );

  v_new_stage := public.classify_growth_stage_tanganicae(v_abw_g);

  if v_new_stage is not null then
    update public.system
    set growth_stage = v_new_stage::public.system_growth_stage
    where id = new.system_id;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."trg_update_system_growth_stage"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."water_quality_rating_label"("p_score" numeric) RETURNS "text"
    LANGUAGE "sql" IMMUTABLE PARALLEL SAFE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select case
    when p_score is null then null
    else case greatest(0, least(3, round(p_score)::int))
      when 0 then 'lethal'
      when 1 then 'critical'
      when 2 then 'acceptable'
      else 'optimal'
    end
  end
$$;


ALTER FUNCTION "public"."water_quality_rating_label"("p_score" numeric) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."feeding_record" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "system_id" bigint NOT NULL,
    "feed_type_id" bigint NOT NULL,
    "feeding_amount" double precision NOT NULL,
    "date" "date" NOT NULL,
    "batch_id" bigint,
    "notes" "text",
    "cycle_id" bigint,
    "local_id" "text",
    "feeding_response" smallint,
    "synced_at" timestamp with time zone,
    CONSTRAINT "feeding_amount_check" CHECK ((("feeding_amount" >= (0)::double precision) AND ("feeding_amount" < (1000)::double precision))),
    CONSTRAINT "feeding_response_range_check" CHECK ((("feeding_response" >= 1) AND ("feeding_response" <= 5)))
);


ALTER TABLE "public"."feeding_record" OWNER TO "postgres";


COMMENT ON COLUMN "public"."feeding_record"."feed_type_id" IS 'Optional when no feed was given and feeding_amount is 0; required by the app for positive feeding entries.';



COMMENT ON COLUMN "public"."feeding_record"."feeding_response" IS 'Optional when no feed was given and feeding_amount is 0. Appetite level 1-5 for positive feeding entries.';



CREATE TABLE IF NOT EXISTS "public"."fingerling_batch" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "supplier_id" bigint NOT NULL,
    "date_of_delivery" "date" NOT NULL,
    "number_of_fish" bigint NOT NULL,
    "abw" double precision NOT NULL,
    "name" "text" NOT NULL,
    "farm_id" "uuid",
    CONSTRAINT "fingerling_batch_abw_positive" CHECK ((("abw" IS NULL) OR ("abw" > (0)::double precision))),
    CONSTRAINT "fingerling_batch_number_positive" CHECK ((("number_of_fish" IS NULL) OR ("number_of_fish" >= 0)))
);


ALTER TABLE "public"."fingerling_batch" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fish_harvest" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "date" "date" NOT NULL,
    "system_id" bigint NOT NULL,
    "number_of_fish_harvest" bigint,
    "total_weight_harvest" double precision NOT NULL,
    "abw" double precision,
    "type_of_harvest" "public"."type_of_harvest" NOT NULL,
    "batch_id" bigint,
    "cycle_id" bigint,
    "local_id" "text",
    "synced_at" timestamp with time zone
);


ALTER TABLE "public"."fish_harvest" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fish_mortality" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "system_id" bigint NOT NULL,
    "date" "date" NOT NULL,
    "number_of_fish_mortality" bigint NOT NULL,
    "total_weight_mortality" double precision,
    "cause" "text" DEFAULT 'unknown'::"text" NOT NULL,
    "notes" "text",
    "batch_id" bigint,
    "is_mass_mortality" boolean GENERATED ALWAYS AS (("number_of_fish_mortality" >= 100)) STORED,
    "cycle_id" bigint,
    "local_id" "text",
    "synced_at" timestamp with time zone,
    CONSTRAINT "fish_mortality_cause_check" CHECK (("cause" = ANY (ARRAY['unknown'::"text", 'hypoxia'::"text", 'disease'::"text", 'injury'::"text", 'handling'::"text", 'predator'::"text", 'starvation'::"text", 'temperature'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."fish_mortality" OWNER TO "postgres";


COMMENT ON COLUMN "public"."fish_mortality"."total_weight_mortality" IS 'Total dead fish weight in kg. Required for new mass mortality records of 100 or more fish.';



CREATE TABLE IF NOT EXISTS "public"."fish_sampling_weight" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "system_id" bigint NOT NULL,
    "date" "date" NOT NULL,
    "number_of_fish_sampling" bigint NOT NULL,
    "total_weight_sampling" double precision NOT NULL,
    "abw" double precision NOT NULL,
    "batch_id" bigint,
    "notes" "text",
    "cycle_id" bigint,
    "local_id" "text",
    "synced_at" timestamp with time zone,
    CONSTRAINT "fish_sampling_positive_numbers" CHECK ((("number_of_fish_sampling" > 0) AND ("total_weight_sampling" > (0)::double precision) AND ("abw" > (0)::double precision)))
);


ALTER TABLE "public"."fish_sampling_weight" OWNER TO "postgres";


COMMENT ON TABLE "public"."fish_sampling_weight" IS 'Monthly fish growth sampling records. Each row stores the sampled fish count, total sample weight in kg, and derived ABW in grams for the stocked batch production cycle.';



COMMENT ON COLUMN "public"."fish_sampling_weight"."total_weight_sampling" IS 'Total weight of sampled fish in kg.';



COMMENT ON COLUMN "public"."fish_sampling_weight"."abw" IS 'Average body weight in grams, derived from total_weight_sampling and number_of_fish_sampling.';



CREATE TABLE IF NOT EXISTS "public"."fish_stocking" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "date" "date" NOT NULL,
    "system_id" bigint NOT NULL,
    "number_of_fish_stocking" bigint NOT NULL,
    "total_weight_stocking" double precision NOT NULL,
    "abw" double precision NOT NULL,
    "batch_id" bigint NOT NULL,
    "type_of_stocking" "public"."type_of_stocking" NOT NULL,
    "notes" "text",
    "cycle_id" bigint NOT NULL,
    "local_id" "text",
    "synced_at" timestamp with time zone
);


ALTER TABLE "public"."fish_stocking" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fish_transfer" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "origin_system_id" bigint,
    "target_system_id" bigint,
    "number_of_fish_transfer" double precision NOT NULL,
    "date" "date" NOT NULL,
    "total_weight_transfer" double precision,
    "abw" double precision,
    "batch_id" bigint,
    "transfer_type" "public"."transfer_type" DEFAULT 'transfer'::"public"."transfer_type" NOT NULL,
    "notes" "text",
    "external_target_name" "text",
    "cycle_id" bigint,
    "local_id" "text",
    "external_origin_name" "text",
    "synced_at" timestamp with time zone
);


ALTER TABLE "public"."fish_transfer" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "type" "public"."system_type" NOT NULL,
    "growth_stage" "public"."system_growth_stage" NOT NULL,
    "volume" double precision,
    "depth" double precision,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "commissioned_at" "date",
    "decommissioned_at" "date",
    "farm_id" "uuid",
    "unit" "text",
    "cage_status" "public"."cage_status_enum"
);


ALTER TABLE "public"."system" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "analytics"."daily_system_facts" AS
 WITH "activity_dates" AS (
         SELECT "fish_stocking"."system_id",
            "fish_stocking"."date"
           FROM "public"."fish_stocking"
        UNION ALL
         SELECT "fish_mortality"."system_id",
            "fish_mortality"."date"
           FROM "public"."fish_mortality"
        UNION ALL
         SELECT "feeding_record"."system_id",
            "feeding_record"."date"
           FROM "public"."feeding_record"
        UNION ALL
         SELECT "fish_sampling_weight"."system_id",
            "fish_sampling_weight"."date"
           FROM "public"."fish_sampling_weight"
        UNION ALL
         SELECT "fish_harvest"."system_id",
            "fish_harvest"."date"
           FROM "public"."fish_harvest"
        UNION ALL
         SELECT "fish_transfer"."target_system_id" AS "system_id",
            "fish_transfer"."date"
           FROM "public"."fish_transfer"
          WHERE ("fish_transfer"."target_system_id" IS NOT NULL)
        UNION ALL
         SELECT "fish_transfer"."origin_system_id" AS "system_id",
            "fish_transfer"."date"
           FROM "public"."fish_transfer"
          WHERE ("fish_transfer"."origin_system_id" IS NOT NULL)
        ), "system_bounds" AS (
         SELECT "s"."id" AS "system_id",
            "s"."farm_id",
            "s"."name" AS "system_name",
            ("s"."growth_stage")::"text" AS "growth_stage",
            "s"."is_active" AS "system_is_active",
            "s"."volume",
            COALESCE("min"("ad"."date"), "s"."commissioned_at", CURRENT_DATE) AS "start_date",
                CASE
                    WHEN ("s"."decommissioned_at" IS NOT NULL) THEN GREATEST(COALESCE("max"("ad"."date"), "s"."decommissioned_at"), "s"."decommissioned_at")
                    ELSE COALESCE("max"("ad"."date"), CURRENT_DATE)
                END AS "end_date"
           FROM ("public"."system" "s"
             LEFT JOIN "activity_dates" "ad" ON (("ad"."system_id" = "s"."id")))
          WHERE ("s"."farm_id" IS NOT NULL)
          GROUP BY "s"."id", "s"."farm_id", "s"."name", "s"."growth_stage", "s"."is_active", "s"."commissioned_at", "s"."decommissioned_at", "s"."volume"
        ), "date_spine" AS (
         SELECT "sb"."system_id",
            "sb"."farm_id",
            "sb"."system_name",
            "sb"."growth_stage",
            "sb"."system_is_active",
            "sb"."volume" AS "system_volume",
            ("gs"."gs")::"date" AS "inventory_date"
           FROM ("system_bounds" "sb"
             CROSS JOIN LATERAL "generate_series"(("sb"."start_date")::timestamp without time zone, ("sb"."end_date")::timestamp without time zone, '1 day'::interval) "gs"("gs"))
        ), "daily_stocked" AS (
         SELECT "fish_stocking"."system_id",
            "fish_stocking"."date" AS "inventory_date",
            ("sum"("fish_stocking"."number_of_fish_stocking"))::double precision AS "qty_stocked"
           FROM "public"."fish_stocking"
          GROUP BY "fish_stocking"."system_id", "fish_stocking"."date"
        ), "daily_mortality" AS (
         SELECT "fish_mortality"."system_id",
            "fish_mortality"."date" AS "inventory_date",
            ("sum"("fish_mortality"."number_of_fish_mortality"))::double precision AS "qty_mortality"
           FROM "public"."fish_mortality"
          GROUP BY "fish_mortality"."system_id", "fish_mortality"."date"
        ), "daily_transfer_in" AS (
         SELECT "fish_transfer"."target_system_id" AS "system_id",
            "fish_transfer"."date" AS "inventory_date",
            "sum"("fish_transfer"."number_of_fish_transfer") AS "qty_transfer_in"
           FROM "public"."fish_transfer"
          WHERE ("fish_transfer"."target_system_id" IS NOT NULL)
          GROUP BY "fish_transfer"."target_system_id", "fish_transfer"."date"
        ), "daily_transfer_out" AS (
         SELECT "fish_transfer"."origin_system_id" AS "system_id",
            "fish_transfer"."date" AS "inventory_date",
            "sum"("fish_transfer"."number_of_fish_transfer") AS "qty_transfer_out"
           FROM "public"."fish_transfer"
          WHERE ("fish_transfer"."origin_system_id" IS NOT NULL)
          GROUP BY "fish_transfer"."origin_system_id", "fish_transfer"."date"
        ), "daily_harvest" AS (
         SELECT "fish_harvest"."system_id",
            "fish_harvest"."date" AS "inventory_date",
            ("sum"(COALESCE("fish_harvest"."number_of_fish_harvest", (0)::bigint)))::double precision AS "qty_harvested"
           FROM "public"."fish_harvest"
          GROUP BY "fish_harvest"."system_id", "fish_harvest"."date"
        ), "daily_feed" AS (
         SELECT "feeding_record"."system_id",
            "feeding_record"."date" AS "inventory_date",
            "sum"("feeding_record"."feeding_amount") AS "feed_kg"
           FROM "public"."feeding_record"
          GROUP BY "feeding_record"."system_id", "feeding_record"."date"
        ), "daily_events" AS (
         SELECT "ds"."system_id",
            "ds"."farm_id",
            "ds"."system_name",
            "ds"."growth_stage",
            "ds"."system_is_active",
            "ds"."system_volume",
            "ds"."inventory_date",
            COALESCE("stk"."qty_stocked", (0)::double precision) AS "fish_stocked_today",
            COALESCE("mort"."qty_mortality", (0)::double precision) AS "fish_died_today",
            COALESCE("tin"."qty_transfer_in", (0)::double precision) AS "fish_transferred_in_today",
            COALESCE("tout"."qty_transfer_out", (0)::double precision) AS "fish_transferred_out_today",
            COALESCE("harv"."qty_harvested", (0)::double precision) AS "fish_harvested_today",
            COALESCE("feed"."feed_kg", (0)::double precision) AS "feeding_amount_today"
           FROM (((((("date_spine" "ds"
             LEFT JOIN "daily_stocked" "stk" ON ((("stk"."system_id" = "ds"."system_id") AND ("stk"."inventory_date" = "ds"."inventory_date"))))
             LEFT JOIN "daily_mortality" "mort" ON ((("mort"."system_id" = "ds"."system_id") AND ("mort"."inventory_date" = "ds"."inventory_date"))))
             LEFT JOIN "daily_transfer_in" "tin" ON ((("tin"."system_id" = "ds"."system_id") AND ("tin"."inventory_date" = "ds"."inventory_date"))))
             LEFT JOIN "daily_transfer_out" "tout" ON ((("tout"."system_id" = "ds"."system_id") AND ("tout"."inventory_date" = "ds"."inventory_date"))))
             LEFT JOIN "daily_harvest" "harv" ON ((("harv"."system_id" = "ds"."system_id") AND ("harv"."inventory_date" = "ds"."inventory_date"))))
             LEFT JOIN "daily_feed" "feed" ON ((("feed"."system_id" = "ds"."system_id") AND ("feed"."inventory_date" = "ds"."inventory_date"))))
        ), "running" AS (
         SELECT "de"."system_id",
            "de"."farm_id",
            "de"."system_name",
            "de"."growth_stage",
            "de"."system_is_active",
            "de"."system_volume",
            "de"."inventory_date",
            "de"."fish_stocked_today",
            "de"."fish_died_today",
            "de"."fish_transferred_in_today",
            "de"."fish_transferred_out_today",
            "de"."fish_harvested_today",
            "de"."feeding_amount_today",
            "sum"((((("de"."fish_stocked_today" + "de"."fish_transferred_in_today") - "de"."fish_died_today") - "de"."fish_transferred_out_today") - "de"."fish_harvested_today")) OVER (PARTITION BY "de"."system_id" ORDER BY "de"."inventory_date" ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS "number_of_fish"
           FROM "daily_events" "de"
        ), "sampling_anchor" AS (
         SELECT "w"."system_id",
            "w"."date" AS "anchor_date",
            COALESCE(
                CASE
                    WHEN ("sum"("w"."number_of_fish_sampling") FILTER (WHERE ("w"."total_weight_sampling" IS NOT NULL)) > (0)::numeric) THEN (("sum"("w"."total_weight_sampling") FILTER (WHERE ("w"."total_weight_sampling" IS NOT NULL)) * (1000.0)::double precision) / (NULLIF("sum"("w"."number_of_fish_sampling") FILTER (WHERE ("w"."total_weight_sampling" IS NOT NULL)), (0)::numeric))::double precision)
                    ELSE NULL::double precision
                END, "avg"(NULLIF("w"."abw", (0)::double precision))) AS "abw_g",
            1 AS "anchor_priority"
           FROM "public"."fish_sampling_weight" "w"
          GROUP BY "w"."system_id", "w"."date"
        ), "transfer_anchor" AS (
         SELECT "ft"."target_system_id" AS "system_id",
            "ft"."date" AS "anchor_date",
            COALESCE("avg"(NULLIF("ft"."abw", (0)::double precision)),
                CASE
                    WHEN (("sum"("ft"."number_of_fish_transfer") > (0)::double precision) AND ("sum"("ft"."total_weight_transfer") > (0)::double precision)) THEN (("sum"("ft"."total_weight_transfer") * (1000.0)::double precision) / "sum"("ft"."number_of_fish_transfer"))
                    ELSE NULL::double precision
                END) AS "abw_g",
            2 AS "anchor_priority"
           FROM "public"."fish_transfer" "ft"
          WHERE ("ft"."target_system_id" IS NOT NULL)
          GROUP BY "ft"."target_system_id", "ft"."date"
         HAVING (COALESCE("avg"(NULLIF("ft"."abw", (0)::double precision)),
                CASE
                    WHEN (("sum"("ft"."number_of_fish_transfer") > (0)::double precision) AND ("sum"("ft"."total_weight_transfer") > (0)::double precision)) THEN (("sum"("ft"."total_weight_transfer") * (1000.0)::double precision) / "sum"("ft"."number_of_fish_transfer"))
                    ELSE NULL::double precision
                END) IS NOT NULL)
        ), "stocking_anchor" AS (
         SELECT "fs"."system_id",
            "fs"."date" AS "anchor_date",
            COALESCE("avg"(NULLIF("fs"."abw", (0)::double precision)),
                CASE
                    WHEN (("sum"("fs"."number_of_fish_stocking") > (0)::numeric) AND ("sum"("fs"."total_weight_stocking") > (0)::double precision)) THEN (("sum"("fs"."total_weight_stocking") * (1000.0)::double precision) / ("sum"("fs"."number_of_fish_stocking"))::double precision)
                    ELSE NULL::double precision
                END, "avg"(NULLIF("fb"."abw", (0)::double precision))) AS "abw_g",
            3 AS "anchor_priority"
           FROM ("public"."fish_stocking" "fs"
             LEFT JOIN "public"."fingerling_batch" "fb" ON (("fb"."id" = "fs"."batch_id")))
          GROUP BY "fs"."system_id", "fs"."date"
         HAVING (COALESCE("avg"(NULLIF("fs"."abw", (0)::double precision)),
                CASE
                    WHEN (("sum"("fs"."number_of_fish_stocking") > (0)::numeric) AND ("sum"("fs"."total_weight_stocking") > (0)::double precision)) THEN (("sum"("fs"."total_weight_stocking") * (1000.0)::double precision) / ("sum"("fs"."number_of_fish_stocking"))::double precision)
                    ELSE NULL::double precision
                END, "avg"(NULLIF("fb"."abw", (0)::double precision))) IS NOT NULL)
        ), "all_anchors" AS (
         SELECT "sampling_anchor"."system_id",
            "sampling_anchor"."anchor_date",
            "sampling_anchor"."abw_g",
            "sampling_anchor"."anchor_priority"
           FROM "sampling_anchor"
        UNION ALL
         SELECT "transfer_anchor"."system_id",
            "transfer_anchor"."anchor_date",
            "transfer_anchor"."abw_g",
            "transfer_anchor"."anchor_priority"
           FROM "transfer_anchor"
        UNION ALL
         SELECT "stocking_anchor"."system_id",
            "stocking_anchor"."anchor_date",
            "stocking_anchor"."abw_g",
            "stocking_anchor"."anchor_priority"
           FROM "stocking_anchor"
        ), "last_abw" AS (
         SELECT DISTINCT ON ("r"."system_id", "r"."inventory_date") "r"."system_id",
            "r"."inventory_date",
            "a"."anchor_date" AS "last_abw_date",
            "a"."abw_g" AS "abw_last_sampling"
           FROM ("running" "r"
             LEFT JOIN "all_anchors" "a" ON ((("a"."system_id" = "r"."system_id") AND ("a"."anchor_date" <= "r"."inventory_date"))))
          ORDER BY "r"."system_id", "r"."inventory_date", "a"."anchor_date" DESC NULLS LAST, "a"."anchor_priority"
        ), "facts" AS (
         SELECT "row_number"() OVER (ORDER BY "r"."system_id", "r"."inventory_date") AS "id",
            "r"."inventory_date",
            "r"."system_id",
            "r"."farm_id",
            "r"."system_name",
            "r"."growth_stage",
            "r"."system_is_active",
            GREATEST("r"."number_of_fish", (0)::double precision) AS "number_of_fish",
            "r"."fish_died_today" AS "number_of_fish_mortality",
            "r"."feeding_amount_today" AS "feeding_amount",
            "la"."abw_last_sampling",
            "la"."last_abw_date",
                CASE
                    WHEN ("la"."abw_last_sampling" IS NOT NULL) THEN (("la"."abw_last_sampling" * GREATEST("r"."number_of_fish", (0)::double precision)) / (1000.0)::double precision)
                    ELSE NULL::double precision
                END AS "biomass_kg",
            "r"."system_volume",
                CASE
                    WHEN (GREATEST("r"."number_of_fish", (0)::double precision) > (0)::double precision) THEN ("lineage"."cycle_id")::bigint
                    ELSE NULL::bigint
                END AS "production_cycle_id",
            "lineage"."batch_id"
           FROM (("running" "r"
             LEFT JOIN "last_abw" "la" ON ((("la"."system_id" = "r"."system_id") AND ("la"."inventory_date" = "r"."inventory_date"))))
             LEFT JOIN LATERAL "public"."resolve_cycle_batch_for_system_date"("r"."system_id", "r"."inventory_date") "lineage"("cycle_id", "batch_id") ON (true))
        )
 SELECT "f"."id",
    "f"."inventory_date",
    "f"."system_id",
    "f"."farm_id",
    "f"."system_name",
    "f"."growth_stage",
    "f"."system_is_active",
    "f"."production_cycle_id",
    "f"."batch_id",
    "f"."number_of_fish",
    "f"."number_of_fish_mortality",
    "f"."feeding_amount",
    "f"."abw_last_sampling",
    "f"."last_abw_date",
    "f"."biomass_kg" AS "biomass_last_sampling",
        CASE
            WHEN ("f"."biomass_kg" > (0)::double precision) THEN (("f"."feeding_amount" / "f"."biomass_kg") * (100.0)::double precision)
            ELSE NULL::double precision
        END AS "feeding_rate",
        CASE
            WHEN (("f"."system_volume" > (0)::double precision) AND ("f"."biomass_kg" IS NOT NULL)) THEN (GREATEST("f"."biomass_kg", (0)::double precision) / "f"."system_volume")
            ELSE NULL::double precision
        END AS "biomass_density",
        CASE
            WHEN ("f"."number_of_fish" > (0)::double precision) THEN (("f"."number_of_fish_mortality" / "f"."number_of_fish") * (100.0)::double precision)
            ELSE (0)::double precision
        END AS "mortality_rate",
    "f"."system_volume",
    ("f"."abw_last_sampling" IS NOT NULL) AS "has_abw",
    ("f"."number_of_fish" IS NOT NULL) AS "has_inventory_count",
    ("f"."feeding_amount" > (0)::double precision) AS "has_feed_record"
   FROM "facts" "f"
  WITH NO DATA;


ALTER TABLE "analytics"."daily_system_facts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."production_cycle" (
    "cycle_id" integer NOT NULL,
    "system_id" bigint NOT NULL,
    "cycle_start" "date" NOT NULL,
    "cycle_end" "date",
    "ongoing_cycle" boolean NOT NULL,
    "target_weight_g" numeric,
    "batch_id" bigint NOT NULL,
    "previous_system_id" bigint,
    CONSTRAINT "production_cycle_date_check" CHECK ((("cycle_end" IS NULL) OR ("cycle_end" >= "cycle_start"))),
    CONSTRAINT "production_cycle_end_after_start" CHECK ((("cycle_end" IS NULL) OR ("cycle_end" >= "cycle_start"))),
    CONSTRAINT "production_cycle_ongoing_matches_end" CHECK (("ongoing_cycle" = ("cycle_end" IS NULL))),
    CONSTRAINT "production_cycle_target_weight_g_check" CHECK (("target_weight_g" > (0)::numeric))
);


ALTER TABLE "public"."production_cycle" OWNER TO "postgres";


COMMENT ON COLUMN "public"."production_cycle"."target_weight_g" IS 'Target market weight (grams) for this cycle. NULL = use farm/species default (400 g).';



CREATE MATERIALIZED VIEW "analytics"."production_summary" AS
 WITH "real_events" AS (
         SELECT "fs"."cycle_id",
            "fs"."system_id",
            "fs"."date",
            'stocking'::"text" AS "activity",
            10 AS "activity_rank",
            ("sum"("fs"."number_of_fish_stocking"))::double precision AS "number_of_fish_event",
            "sum"("fs"."total_weight_stocking") AS "weight_kg_event",
            (0)::double precision AS "feed_kg_period",
            (0)::double precision AS "mortality_count",
            (0)::double precision AS "fish_transfer_out",
            (0)::double precision AS "weight_transfer_out_kg",
            (0)::double precision AS "fish_transfer_in",
            (0)::double precision AS "weight_transfer_in_kg",
            (0)::double precision AS "fish_harvested",
            (0)::double precision AS "weight_harvested_kg"
           FROM "public"."fish_stocking" "fs"
          WHERE ("fs"."cycle_id" IS NOT NULL)
          GROUP BY "fs"."cycle_id", "fs"."system_id", "fs"."date"
        UNION ALL
         SELECT "fr"."cycle_id",
            "fr"."system_id",
            "fr"."date",
            'feeding'::"text" AS "text",
            20,
            0,
            0,
            "sum"("fr"."feeding_amount") AS "sum",
            0,
            0,
            0,
            0,
            0,
            0,
            0
           FROM "public"."feeding_record" "fr"
          WHERE ("fr"."cycle_id" IS NOT NULL)
          GROUP BY "fr"."cycle_id", "fr"."system_id", "fr"."date"
        UNION ALL
         SELECT "fsw"."cycle_id",
            "fsw"."system_id",
            "fsw"."date",
            'sampling'::"text" AS "text",
            30,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0
           FROM "public"."fish_sampling_weight" "fsw"
          WHERE ("fsw"."cycle_id" IS NOT NULL)
          GROUP BY "fsw"."cycle_id", "fsw"."system_id", "fsw"."date"
        UNION ALL
         SELECT "fm"."cycle_id",
            "fm"."system_id",
            "fm"."date",
            'mortality'::"text" AS "text",
            40,
            0,
            0,
            0,
            ("sum"("fm"."number_of_fish_mortality"))::double precision AS "sum",
            0,
            0,
            0,
            0,
            0,
            0
           FROM "public"."fish_mortality" "fm"
          WHERE ("fm"."cycle_id" IS NOT NULL)
          GROUP BY "fm"."cycle_id", "fm"."system_id", "fm"."date"
        UNION ALL
         SELECT "ft"."cycle_id",
            "ft"."origin_system_id" AS "system_id",
            "ft"."date",
            'transfer out'::"text" AS "text",
            50,
            0,
            0,
            0,
            0,
            "sum"("ft"."number_of_fish_transfer") AS "sum",
            "sum"("public"."transfer_weight_kg"("ft"."total_weight_transfer", "ft"."number_of_fish_transfer", "ft"."abw")) AS "sum",
            0,
            0,
            0,
            0
           FROM "public"."fish_transfer" "ft"
          WHERE (("ft"."origin_system_id" IS NOT NULL) AND ("ft"."cycle_id" IS NOT NULL) AND "public"."transfer_impacts_efcr"("ft"."transfer_type", "ft"."origin_system_id", "ft"."target_system_id"))
          GROUP BY "ft"."cycle_id", "ft"."origin_system_id", "ft"."date"
        UNION ALL
         SELECT "ft"."cycle_id",
            "ft"."target_system_id" AS "system_id",
            "ft"."date",
            'transfer in'::"text" AS "text",
            60,
            0,
            0,
            0,
            0,
            0,
            0,
            "sum"("ft"."number_of_fish_transfer") AS "sum",
            "sum"("public"."transfer_weight_kg"("ft"."total_weight_transfer", "ft"."number_of_fish_transfer", "ft"."abw")) AS "sum",
            0,
            0
           FROM "public"."fish_transfer" "ft"
          WHERE (("ft"."target_system_id" IS NOT NULL) AND ("ft"."cycle_id" IS NOT NULL) AND "public"."transfer_impacts_efcr"("ft"."transfer_type", "ft"."origin_system_id", "ft"."target_system_id"))
          GROUP BY "ft"."cycle_id", "ft"."target_system_id", "ft"."date"
        UNION ALL
         SELECT "fh"."cycle_id",
            "fh"."system_id",
            "fh"."date",
            'partial harvest'::"text" AS "text",
            70,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            ("sum"(COALESCE("fh"."number_of_fish_harvest", (0)::bigint)))::double precision AS "sum",
            "sum"("fh"."total_weight_harvest") AS "sum"
           FROM "public"."fish_harvest" "fh"
          WHERE (("fh"."cycle_id" IS NOT NULL) AND ("fh"."type_of_harvest" <> 'final'::"public"."type_of_harvest"))
          GROUP BY "fh"."cycle_id", "fh"."system_id", "fh"."date"
        UNION ALL
         SELECT "fh"."cycle_id",
            "fh"."system_id",
            "fh"."date",
            'final harvest'::"text" AS "text",
            80,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            ("sum"(COALESCE("fh"."number_of_fish_harvest", (0)::bigint)))::double precision AS "sum",
            "sum"("fh"."total_weight_harvest") AS "sum"
           FROM "public"."fish_harvest" "fh"
          WHERE (("fh"."cycle_id" IS NOT NULL) AND ("fh"."type_of_harvest" = 'final'::"public"."type_of_harvest"))
          GROUP BY "fh"."cycle_id", "fh"."system_id", "fh"."date"
        ), "events_with_context" AS (
         SELECT "re"."cycle_id",
            "re"."system_id",
            "re"."date",
            "re"."activity",
            "re"."activity_rank",
            "re"."number_of_fish_event",
            "re"."weight_kg_event",
            "re"."feed_kg_period",
            "re"."mortality_count",
            "re"."fish_transfer_out",
            "re"."weight_transfer_out_kg",
            "re"."fish_transfer_in",
            "re"."weight_transfer_in_kg",
            "re"."fish_harvested",
            "re"."weight_harvested_kg",
            "pc"."ongoing_cycle",
            "s"."name" AS "system_name",
            ("s"."growth_stage")::"text" AS "growth_stage"
           FROM (("real_events" "re"
             JOIN "public"."production_cycle" "pc" ON (("pc"."cycle_id" = "re"."cycle_id")))
             JOIN "public"."system" "s" ON (("s"."id" = "re"."system_id")))
        ), "events_with_biomass" AS (
         SELECT "e"."cycle_id",
            "e"."system_id",
            "e"."date",
            "e"."activity",
            "e"."activity_rank",
            "e"."number_of_fish_event",
            "e"."weight_kg_event",
            "e"."feed_kg_period",
            "e"."mortality_count",
            "e"."fish_transfer_out",
            "e"."weight_transfer_out_kg",
            "e"."fish_transfer_in",
            "e"."weight_transfer_in_kg",
            "e"."fish_harvested",
            "e"."weight_harvested_kg",
            "e"."ongoing_cycle",
            "e"."system_name",
            "e"."growth_stage",
            "dsf"."abw_last_sampling" AS "average_body_weight",
            "dsf"."number_of_fish" AS "number_of_fish_inventory",
            "dsf"."biomass_last_sampling" AS "biomass_kg",
            "lag"("dsf"."biomass_last_sampling") OVER (PARTITION BY "e"."cycle_id" ORDER BY "e"."date", "e"."activity_rank", "e"."system_id") AS "prev_biomass_kg"
           FROM ("events_with_context" "e"
             LEFT JOIN "analytics"."daily_system_facts" "dsf" ON ((("dsf"."system_id" = "e"."system_id") AND ("dsf"."inventory_date" = "e"."date"))))
        ), "consolidated" AS (
         SELECT "e"."cycle_id",
            "e"."system_id",
            "e"."date",
            "e"."activity",
            "e"."activity_rank",
            "e"."number_of_fish_event",
            "e"."weight_kg_event",
            "e"."feed_kg_period",
            "e"."mortality_count",
            "e"."fish_transfer_out",
            "e"."weight_transfer_out_kg",
            "e"."fish_transfer_in",
            "e"."weight_transfer_in_kg",
            "e"."fish_harvested",
            "e"."weight_harvested_kg",
            "e"."ongoing_cycle",
            "e"."system_name",
            "e"."growth_stage",
            "e"."average_body_weight",
            "e"."number_of_fish_inventory",
            "e"."biomass_kg",
            "e"."prev_biomass_kg",
                CASE
                    WHEN (("e"."prev_biomass_kg" IS NULL) OR ("e"."biomass_kg" IS NULL)) THEN (0)::double precision
                    ELSE ("e"."biomass_kg" - "e"."prev_biomass_kg")
                END AS "biomass_increase_period",
                CASE
                    WHEN (("e"."prev_biomass_kg" IS NULL) OR ("e"."biomass_kg" IS NULL)) THEN NULL::double precision
                    ELSE ((((("e"."biomass_kg" - "e"."prev_biomass_kg") + "e"."weight_transfer_out_kg") - "e"."weight_transfer_in_kg") + "e"."weight_harvested_kg") - "e"."weight_kg_event")
                END AS "efcr_denominator_period"
           FROM "events_with_biomass" "e"
        ), "final_rows" AS (
         SELECT "c"."cycle_id",
            "c"."system_id",
            "c"."date",
            "c"."activity",
            "c"."activity_rank",
            "c"."number_of_fish_event",
            "c"."weight_kg_event",
            "c"."feed_kg_period",
            "c"."mortality_count",
            "c"."fish_transfer_out",
            "c"."weight_transfer_out_kg",
            "c"."fish_transfer_in",
            "c"."weight_transfer_in_kg",
            "c"."fish_harvested",
            "c"."weight_harvested_kg",
            "c"."ongoing_cycle",
            "c"."system_name",
            "c"."growth_stage",
            "c"."average_body_weight",
            "c"."number_of_fish_inventory",
            "c"."biomass_kg",
            "c"."prev_biomass_kg",
            "c"."biomass_increase_period",
            "c"."efcr_denominator_period",
            "sum"("c"."feed_kg_period") OVER "w" AS "feed_kg_aggregated",
            "sum"("c"."biomass_increase_period") OVER "w" AS "biomass_increase_aggregated",
            "sum"("c"."mortality_count") OVER "w" AS "cumulative_mortality",
            "sum"("c"."fish_transfer_out") OVER "w" AS "fish_transfer_out_aggregated",
            "sum"("c"."fish_transfer_in") OVER "w" AS "fish_transfer_in_aggregated",
            "sum"("c"."fish_harvested") OVER "w" AS "fish_harvested_aggregated",
            "sum"("c"."weight_transfer_out_kg") OVER "w" AS "weight_transfer_out_kg_aggregated",
            "sum"("c"."weight_transfer_in_kg") OVER "w" AS "weight_transfer_in_kg_aggregated",
            "sum"("c"."weight_harvested_kg") OVER "w" AS "weight_harvested_kg_aggregated",
            "sum"("c"."weight_kg_event") OVER "w" AS "weight_stocked_kg_aggregated",
            "sum"(COALESCE("c"."efcr_denominator_period", (0)::double precision)) OVER "w" AS "efcr_denominator_aggregated"
           FROM "consolidated" "c"
          WINDOW "w" AS (PARTITION BY "c"."cycle_id" ORDER BY "c"."date", "c"."activity_rank", "c"."system_id" ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
        )
 SELECT "f"."cycle_id",
    "f"."system_id",
    "f"."system_name",
    "f"."growth_stage",
    "f"."ongoing_cycle",
    "f"."date",
    "f"."activity",
    "f"."activity_rank",
    "f"."number_of_fish_event" AS "number_of_fish_stocked",
    "f"."weight_kg_event" AS "weight_stocked_kg",
    "f"."feed_kg_period",
    "f"."mortality_count",
    "f"."fish_transfer_out",
    "f"."weight_transfer_out_kg",
    "f"."fish_transfer_in",
    "f"."weight_transfer_in_kg",
    "f"."fish_harvested",
    "f"."weight_harvested_kg",
    "f"."average_body_weight",
    "f"."number_of_fish_inventory",
    "f"."biomass_kg",
    "f"."prev_biomass_kg",
    "f"."biomass_increase_period",
    "f"."feed_kg_aggregated",
    "f"."biomass_increase_aggregated",
    "f"."cumulative_mortality",
    "f"."fish_transfer_out_aggregated",
    "f"."fish_transfer_in_aggregated",
    "f"."fish_harvested_aggregated",
    "f"."weight_transfer_out_kg_aggregated",
    "f"."weight_transfer_in_kg_aggregated",
    "f"."weight_harvested_kg_aggregated",
    "f"."weight_stocked_kg_aggregated",
        CASE
            WHEN ("f"."efcr_denominator_period" > (0)::double precision) THEN ("f"."feed_kg_period" / "f"."efcr_denominator_period")
            ELSE NULL::double precision
        END AS "efcr_period",
        CASE
            WHEN ("f"."efcr_denominator_aggregated" > (0)::double precision) THEN ("f"."feed_kg_aggregated" / "f"."efcr_denominator_aggregated")
            ELSE NULL::double precision
        END AS "efcr_aggregated"
   FROM "final_rows" "f"
  ORDER BY "f"."cycle_id", "f"."date", "f"."activity_rank", "f"."system_id"
  WITH NO DATA;


ALTER TABLE "analytics"."production_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_affected_systems" (
    "system_id" bigint NOT NULL
);


ALTER TABLE "public"."_affected_systems" OWNER TO "postgres";


COMMENT ON TABLE "public"."_affected_systems" IS 'Internal queue of systems whose daily inventory needs recomputation after operational event changes.';



CREATE TABLE IF NOT EXISTS "public"."alert_threshold" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "scope" "text" NOT NULL,
    "farm_id" "uuid",
    "system_id" bigint,
    "low_do_threshold" numeric,
    "high_ammonia_threshold" numeric,
    "high_mortality_threshold" numeric,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "low_sgr_threshold" numeric DEFAULT 1.0,
    "low_survival_pct" numeric DEFAULT 80.0,
    "critical_survival_pct" numeric DEFAULT 70.0,
    CONSTRAINT "alert_threshold_scope_check" CHECK (((("scope" = 'default'::"text") AND ("farm_id" IS NULL) AND ("system_id" IS NULL)) OR (("scope" = 'farm'::"text") AND ("farm_id" IS NOT NULL) AND ("system_id" IS NULL)) OR (("scope" = 'system'::"text") AND ("system_id" IS NOT NULL))))
);


ALTER TABLE "public"."alert_threshold" OWNER TO "postgres";


COMMENT ON COLUMN "public"."alert_threshold"."low_sgr_threshold" IS 'SGR (%/day) below which a warning fires. Research brief: fingerlings ≥3%/day; grow-out ≥1%/day.';



COMMENT ON COLUMN "public"."alert_threshold"."low_survival_pct" IS 'Cumulative survival (%) below which a WARNING fires. Research brief: investigate <80%.';



COMMENT ON COLUMN "public"."alert_threshold"."critical_survival_pct" IS 'Cumulative survival (%) below which a CRITICAL fires. Research brief: critical <70%.';



CREATE TABLE IF NOT EXISTS "public"."farm_user" (
    "farm_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    CONSTRAINT "farm_user_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text", 'data_analyst'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."farm_user" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."api_alert_thresholds" WITH ("security_invoker"='true') AS
 SELECT "at"."id",
    "at"."scope",
    "at"."farm_id",
    "at"."system_id",
    "at"."low_do_threshold",
    "at"."high_ammonia_threshold",
    "at"."high_mortality_threshold",
    "at"."low_sgr_threshold",
    "at"."low_survival_pct",
    "at"."critical_survival_pct",
    "at"."created_at",
    "at"."updated_at"
   FROM "public"."alert_threshold" "at"
  WHERE ((("at"."farm_id" IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM "public"."farm_user" "fu"
          WHERE (("fu"."farm_id" = "at"."farm_id") AND ("fu"."user_id" = "auth"."uid"()))))) OR (("at"."system_id" IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM ("public"."system" "s"
             JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
          WHERE (("s"."id" = "at"."system_id") AND ("fu"."user_id" = "auth"."uid"()))))) OR ("at"."scope" = 'default'::"text"));


ALTER TABLE "public"."api_alert_thresholds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_water_quality_rating" (
    "id" bigint NOT NULL,
    "system_id" bigint NOT NULL,
    "rating_date" "date" NOT NULL,
    "rating" "public"."water_quality_rating" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "worst_parameter" "public"."water_quality_parameters",
    "worst_parameter_value" double precision,
    "worst_parameter_unit" "text",
    "rating_numeric" integer,
    CONSTRAINT "daily_water_quality_rating_rating_numeric_matches_rating" CHECK (((("rating" = 'lethal'::"public"."water_quality_rating") AND ("rating_numeric" = 0)) OR (("rating" = 'critical'::"public"."water_quality_rating") AND ("rating_numeric" = 1)) OR (("rating" = 'acceptable'::"public"."water_quality_rating") AND ("rating_numeric" = 2)) OR (("rating" = 'optimal'::"public"."water_quality_rating") AND ("rating_numeric" = 3))))
);


ALTER TABLE "public"."daily_water_quality_rating" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profile" (
    "user_id" "uuid" NOT NULL,
    "notifications_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "full_name" "text",
    "role" "text",
    "organization_id" "uuid",
    "farm_id" "uuid",
    "email" "text",
    CONSTRAINT "user_profile_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text", 'data_analyst'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."user_profile" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."water_quality_measurement" (
    "id" bigint NOT NULL,
    "date" "date" NOT NULL,
    "time" time without time zone NOT NULL,
    "water_depth" double precision NOT NULL,
    "parameter_value" double precision NOT NULL,
    "system_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "parameter_name" "public"."water_quality_parameters" NOT NULL,
    "measured_at" timestamp with time zone NOT NULL,
    "location_reference" "text",
    "local_id" "text",
    "synced_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."water_quality_measurement" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."api_daily_water_quality_rating" WITH ("security_invoker"='true') AS
 SELECT "dwr"."system_id",
    "s"."farm_id",
    "s"."name" AS "system_name",
    "dwr"."rating_date",
    "dwr"."rating",
    "dwr"."rating_numeric",
    "dwr"."worst_parameter",
    ("dwr"."worst_parameter")::"text" AS "worst_parameter_normalized",
    "dwr"."worst_parameter_value",
    "dwr"."worst_parameter_unit",
    ( SELECT "avg"("wqm"."parameter_value") AS "avg"
           FROM "public"."water_quality_measurement" "wqm"
          WHERE (("wqm"."system_id" = "dwr"."system_id") AND ("wqm"."date" = "dwr"."rating_date") AND ("wqm"."parameter_name" = 'temperature'::"public"."water_quality_parameters"))) AS "temperature_average",
    "dwr"."created_at"
   FROM ("public"."daily_water_quality_rating" "dwr"
     JOIN "public"."system" "s" ON (("s"."id" = "dwr"."system_id")))
  WHERE (EXISTS ( SELECT 1
           FROM "public"."user_profile" "up"
          WHERE (("up"."user_id" = "auth"."uid"()) AND ("up"."farm_id" = "s"."farm_id") AND ("up"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text"])))));


ALTER TABLE "public"."api_daily_water_quality_rating" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."water_quality_framework" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "parameter_acceptable" "jsonb",
    "parameter_critical" "jsonb",
    "parameter_lethal" "jsonb",
    "parameter_optimal" "jsonb",
    "unit" "public"."units",
    "parameter_name" "public"."water_quality_parameters" NOT NULL
);


ALTER TABLE "public"."water_quality_framework" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."api_water_quality_measurements" WITH ("security_invoker"='true') AS
 SELECT "wqm"."id",
    "wqm"."system_id",
    "s"."farm_id",
    "s"."name" AS "system_name",
    "wqm"."date",
    "wqm"."time",
    "wqm"."parameter_name",
    "wqm"."parameter_value",
    "wqm"."water_depth",
    "wqf"."unit",
    "wqm"."created_at",
    ("wqm"."parameter_name")::"text" AS "parameter_name_normalized"
   FROM (("public"."water_quality_measurement" "wqm"
     JOIN "public"."system" "s" ON (("s"."id" = "wqm"."system_id")))
     JOIN "public"."water_quality_framework" "wqf" ON (("wqf"."parameter_name" = "wqm"."parameter_name")))
  WHERE (EXISTS ( SELECT 1
           FROM "public"."user_profile" "up"
          WHERE (("up"."user_id" = "auth"."uid"()) AND ("up"."farm_id" = "s"."farm_id") AND ("up"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text"])))));


ALTER TABLE "public"."api_water_quality_measurements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_config" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL
);


ALTER TABLE "public"."app_config" OWNER TO "postgres";


ALTER TABLE "public"."daily_water_quality_rating" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."daily_water_quality_rating_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."dashboard_time_period" (
    "time_period" "public"."time_period" NOT NULL,
    "days_since_start" integer NOT NULL
);


ALTER TABLE "public"."dashboard_time_period" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."energy_alarm_events" (
    "id" bigint NOT NULL,
    "farm_id" "uuid" NOT NULL,
    "meter_id" "text",
    "alarm_code" "text" NOT NULL,
    "alarm_name" "text",
    "severity" "text" DEFAULT 'warning'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ended_at" timestamp with time zone,
    "acknowledged_at" timestamp with time zone,
    "resolved_at" timestamp with time zone,
    "message" "text",
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "energy_alarm_events_alarm_code_not_blank" CHECK (("btrim"("alarm_code") <> ''::"text")),
    CONSTRAINT "energy_alarm_events_severity_check" CHECK (("severity" = ANY (ARRAY['info'::"text", 'warning'::"text", 'critical'::"text"]))),
    CONSTRAINT "energy_alarm_events_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'acknowledged'::"text", 'resolved'::"text"]))),
    CONSTRAINT "energy_alarm_events_time_check" CHECK ((("ended_at" IS NULL) OR ("ended_at" >= "started_at")))
);


ALTER TABLE "public"."energy_alarm_events" OWNER TO "postgres";


ALTER TABLE "public"."energy_alarm_events" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."energy_alarm_events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."energy_meter_timeseries" (
    "id" bigint NOT NULL,
    "farm_id" "uuid" NOT NULL,
    "meter_id" "text" NOT NULL,
    "measured_at" timestamp with time zone NOT NULL,
    "active_power_kw" numeric,
    "reactive_power_kvar" numeric,
    "apparent_power_kva" numeric,
    "energy_import_kwh" numeric,
    "energy_export_kwh" numeric,
    "voltage_l1_v" numeric,
    "voltage_l2_v" numeric,
    "voltage_l3_v" numeric,
    "current_l1_a" numeric,
    "current_l2_a" numeric,
    "current_l3_a" numeric,
    "frequency_hz" numeric,
    "power_factor" numeric,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "energy_meter_timeseries_meter_id_not_blank" CHECK (("btrim"("meter_id") <> ''::"text"))
);


ALTER TABLE "public"."energy_meter_timeseries" OWNER TO "postgres";


ALTER TABLE "public"."energy_meter_timeseries" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."energy_meter_timeseries_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."farm" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "location" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid"
);


ALTER TABLE "public"."farm" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feed_inventory" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "farm_id" "uuid" NOT NULL,
    "feed_type_id" bigint NOT NULL,
    "inventory_date" "date" NOT NULL,
    "inventory_time" time without time zone,
    "feed_type_label" "text" NOT NULL,
    "bag_weight" integer,
    "amount_of_bags" integer,
    "opened_bags" integer,
    "comments" "text",
    CONSTRAINT "feed_inventory_nonnegative_values" CHECK (((("bag_weight" IS NULL) OR ("bag_weight" >= 0)) AND (("amount_of_bags" IS NULL) OR ("amount_of_bags" >= 0)) AND (("opened_bags" IS NULL) OR ("opened_bags" >= 0))))
);


ALTER TABLE "public"."feed_inventory" OWNER TO "postgres";


COMMENT ON TABLE "public"."feed_inventory" IS 'Manual feed inventory stock-count snapshots. These are the feed stock source of truth, normally counted at start of day and end of day.';



COMMENT ON COLUMN "public"."feed_inventory"."inventory_time" IS 'Stock-count time. Operationally this is usually near 08:00 for start-of-day and near 16:00 for end-of-day.';



COMMENT ON COLUMN "public"."feed_inventory"."amount_of_bags" IS 'Closed/full bags counted in the feed store.';



COMMENT ON COLUMN "public"."feed_inventory"."opened_bags" IS 'Remaining feed in opened bags, recorded in grams in the historical AquaSmart data.';



ALTER TABLE "public"."feed_inventory" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."feed_inventory_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."feed_supplier" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "company_name" "text" NOT NULL,
    "location_country" "text" NOT NULL,
    "location_city" "text"
);


ALTER TABLE "public"."feed_supplier" OWNER TO "postgres";


ALTER TABLE "public"."feed_supplier" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."feed_supplier_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."feed_type" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "feed_supplier_id" bigint NOT NULL,
    "feed_line" "text",
    "feed_category" "public"."feed_category" NOT NULL,
    "feed_pellet_size" "public"."feed_pellet_size" NOT NULL,
    "crude_protein_percentage" double precision,
    "crude_fat_percentage" double precision,
    "farm_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."feed_type" OWNER TO "postgres";


COMMENT ON COLUMN "public"."feed_type"."is_active" IS 'When false this feed type is retired and will not appear in form dropdowns, but historical records referencing it are preserved.';



ALTER TABLE "public"."feed_type" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."feed_type_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."feeding_record" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."feeding_record_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."feeding_response_level" (
    "level" smallint NOT NULL,
    "label" "text" NOT NULL,
    "immediate_response" "text" NOT NULL,
    "after_10_min" "text",
    "after_3_hours" "text",
    "action_guideline" "text" NOT NULL,
    CONSTRAINT "feeding_response_level_level_check" CHECK ((("level" >= 1) AND ("level" <= 5)))
);


ALTER TABLE "public"."feeding_response_level" OWNER TO "postgres";


COMMENT ON TABLE "public"."feeding_response_level" IS 'Official 1-5 appetite scale used by feeding_record.feeding_response.';



ALTER TABLE "public"."fingerling_batch" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."fingerling_batch_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."fingerling_supplier" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "company_name" "text" NOT NULL,
    "location_country" "text" NOT NULL,
    "location_city" "text"
);


ALTER TABLE "public"."fingerling_supplier" OWNER TO "postgres";


ALTER TABLE "public"."fingerling_supplier" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."fingerling_supplier_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."fish_harvest" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."fish_harvest_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."fish_mortality" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."fish_mortality_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."fish_sampling_weight" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."fish_sampling_weight_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."fish_stocking" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."fish_stocking_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."fish_transfer" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."fish_transfer_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."normalization_review" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "raw_upload_id" "uuid",
    "farm_id" "uuid" NOT NULL,
    "table_name" "text" NOT NULL,
    "row_data" "jsonb" NOT NULL,
    "issue_type" "text" NOT NULL,
    "issue_detail" "text" NOT NULL,
    "resolved" boolean DEFAULT false NOT NULL,
    "resolution" "text",
    "resolved_by" "uuid",
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."normalization_review" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "owner_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."organization" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."production_cycle_cycle_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."production_cycle_cycle_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."production_cycle_cycle_id_seq" OWNED BY "public"."production_cycle"."cycle_id";



CREATE TABLE IF NOT EXISTS "public"."raw_uploads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "farm_id" "uuid" NOT NULL,
    "uploaded_by" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_type" "text",
    "storage_path" "text" NOT NULL,
    "row_count" integer,
    "status" "text" DEFAULT 'pending_review'::"text" NOT NULL,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "rejection_reason" "text",
    "review_notes" "text",
    "parse_warnings" "jsonb",
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "raw_uploads_status_check" CHECK (("status" = ANY (ARRAY['pending_review'::"text", 'in_review'::"text", 'approved'::"text", 'rejected'::"text", 'normalizing'::"text", 'normalized'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."raw_uploads" OWNER TO "postgres";


ALTER TABLE "public"."system" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."system_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "user_id" "uuid" NOT NULL,
    "theme" "text" DEFAULT 'light'::"text",
    "default_views" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_settings" OWNER TO "postgres";


ALTER TABLE "public"."water_quality_framework" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."water_quality_framework_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."water_quality_measurement" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."water_quality_measurement_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE SEQUENCE IF NOT EXISTS "public"."water_quality_measurements_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."water_quality_measurements_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."water_quality_measurements_id_seq" OWNED BY "public"."water_quality_measurement"."id";



ALTER TABLE ONLY "public"."production_cycle" ALTER COLUMN "cycle_id" SET DEFAULT "nextval"('"public"."production_cycle_cycle_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."_affected_systems"
    ADD CONSTRAINT "_affected_systems_pkey" PRIMARY KEY ("system_id");



ALTER TABLE ONLY "public"."alert_threshold"
    ADD CONSTRAINT "alert_threshold_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_config"
    ADD CONSTRAINT "app_config_pkey" PRIMARY KEY ("key");



ALTER TABLE "public"."alert_threshold"
    ADD CONSTRAINT "chk_alert_scope" CHECK ((("scope" = ANY (ARRAY['farm'::"text", 'system'::"text", 'default'::"text"])) AND ((("scope" = 'farm'::"text") AND ("farm_id" IS NOT NULL)) OR (("scope" = 'system'::"text") AND ("system_id" IS NOT NULL)) OR ("scope" = 'default'::"text")))) NOT VALID;



ALTER TABLE "public"."farm_user"
    ADD CONSTRAINT "chk_farm_user_role" CHECK (("role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text", 'data_analyst'::"text", 'viewer'::"text"]))) NOT VALID;



ALTER TABLE "public"."fish_transfer"
    ADD CONSTRAINT "chk_transfer_origin" CHECK ((("origin_system_id" IS NOT NULL) OR ("external_origin_name" IS NOT NULL))) NOT VALID;



ALTER TABLE "public"."fish_transfer"
    ADD CONSTRAINT "chk_transfer_target" CHECK ((("target_system_id" IS NOT NULL) OR ("external_target_name" IS NOT NULL))) NOT VALID;



ALTER TABLE ONLY "public"."daily_water_quality_rating"
    ADD CONSTRAINT "daily_water_quality_rating_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_water_quality_rating"
    ADD CONSTRAINT "daily_water_quality_rating_unique" UNIQUE ("system_id", "rating_date");



ALTER TABLE ONLY "public"."dashboard_time_period"
    ADD CONSTRAINT "dashboard_time_period_pkey" PRIMARY KEY ("time_period");



ALTER TABLE ONLY "public"."energy_alarm_events"
    ADD CONSTRAINT "energy_alarm_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."energy_meter_timeseries"
    ADD CONSTRAINT "energy_meter_timeseries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."energy_meter_timeseries"
    ADD CONSTRAINT "energy_meter_timeseries_unique" UNIQUE ("farm_id", "meter_id", "measured_at");



ALTER TABLE ONLY "public"."farm"
    ADD CONSTRAINT "farm_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."farm_user"
    ADD CONSTRAINT "farm_user_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feed_inventory"
    ADD CONSTRAINT "feed_inventory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feeding_record"
    ADD CONSTRAINT "feed_record_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feed_supplier"
    ADD CONSTRAINT "feed_supplier_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feed_type"
    ADD CONSTRAINT "feed_type_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feeding_response_level"
    ADD CONSTRAINT "feeding_response_level_pkey" PRIMARY KEY ("level");



ALTER TABLE ONLY "public"."fingerling_batch"
    ADD CONSTRAINT "fingerling_batch_name_unique" UNIQUE ("name");



ALTER TABLE ONLY "public"."fingerling_batch"
    ADD CONSTRAINT "fingerling_batch_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."fish_harvest"
    ADD CONSTRAINT "fish_harvest_abw_matches_total" CHECK ((("number_of_fish_harvest" IS NULL) OR ("number_of_fish_harvest" <= 0) OR ("abs"(("abw" - (("total_weight_harvest" * (1000.0)::double precision) / ("number_of_fish_harvest")::double precision))) <= (0.01)::double precision))) NOT VALID;



ALTER TABLE "public"."fish_harvest"
    ADD CONSTRAINT "fish_harvest_batch_required" CHECK (("batch_id" IS NOT NULL)) NOT VALID;



ALTER TABLE "public"."fish_harvest"
    ADD CONSTRAINT "fish_harvest_cycle_required" CHECK (("cycle_id" IS NOT NULL)) NOT VALID;



ALTER TABLE ONLY "public"."fish_harvest"
    ADD CONSTRAINT "fish_harvest_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."fish_harvest"
    ADD CONSTRAINT "fish_harvest_positive_count" CHECK ((("number_of_fish_harvest" IS NOT NULL) AND ("number_of_fish_harvest" > 0))) NOT VALID;



ALTER TABLE "public"."fish_harvest"
    ADD CONSTRAINT "fish_harvest_positive_weight" CHECK (("total_weight_harvest" > (0)::double precision)) NOT VALID;



ALTER TABLE "public"."fish_mortality"
    ADD CONSTRAINT "fish_mortality_mass_weight_required" CHECK ((("number_of_fish_mortality" < 100) OR ("total_weight_mortality" IS NOT NULL))) NOT VALID;



ALTER TABLE "public"."fish_mortality"
    ADD CONSTRAINT "fish_mortality_total_weight_nonnegative" CHECK ((("total_weight_mortality" IS NULL) OR ("total_weight_mortality" >= (0)::double precision))) NOT VALID;



ALTER TABLE "public"."fish_sampling_weight"
    ADD CONSTRAINT "fish_sampling_weight_abw_matches_sample" CHECK (("abs"(("abw" - (("total_weight_sampling" * (1000.0)::double precision) / (NULLIF("number_of_fish_sampling", 0))::double precision))) <= (0.01)::double precision)) NOT VALID;



ALTER TABLE "public"."fish_sampling_weight"
    ADD CONSTRAINT "fish_sampling_weight_batch_required" CHECK (("batch_id" IS NOT NULL)) NOT VALID;



ALTER TABLE "public"."fish_sampling_weight"
    ADD CONSTRAINT "fish_sampling_weight_cycle_required" CHECK (("cycle_id" IS NOT NULL)) NOT VALID;



ALTER TABLE ONLY "public"."fish_sampling_weight"
    ADD CONSTRAINT "fish_sampling_weight_local_id_key" UNIQUE ("local_id");



ALTER TABLE "public"."fish_transfer"
    ADD CONSTRAINT "fish_transfer_batch_required" CHECK (("batch_id" IS NOT NULL)) NOT VALID;



ALTER TABLE "public"."fish_transfer"
    ADD CONSTRAINT "fish_transfer_cycle_required" CHECK (("cycle_id" IS NOT NULL)) NOT VALID;



ALTER TABLE "public"."fish_transfer"
    ADD CONSTRAINT "fish_transfer_movement_type" CHECK (("transfer_type" = ANY (ARRAY['transfer'::"public"."transfer_type", 'grading'::"public"."transfer_type", 'density_thinning'::"public"."transfer_type", 'external_out'::"public"."transfer_type"]))) NOT VALID;



ALTER TABLE "public"."fish_transfer"
    ADD CONSTRAINT "fish_transfer_no_external_origin" CHECK (("external_origin_name" IS NULL)) NOT VALID;



ALTER TABLE "public"."fish_transfer"
    ADD CONSTRAINT "fish_transfer_origin_required" CHECK (("origin_system_id" IS NOT NULL)) NOT VALID;



ALTER TABLE "public"."fish_transfer"
    ADD CONSTRAINT "fish_transfer_target_boundary" CHECK (((("transfer_type" = 'external_out'::"public"."transfer_type") AND ("target_system_id" IS NULL) AND (NULLIF("btrim"("external_target_name"), ''::"text") IS NOT NULL)) OR (("transfer_type" = ANY (ARRAY['transfer'::"public"."transfer_type", 'grading'::"public"."transfer_type", 'density_thinning'::"public"."transfer_type"])) AND ("target_system_id" IS NOT NULL) AND ("target_system_id" <> "origin_system_id")))) NOT VALID;



ALTER TABLE ONLY "public"."fish_sampling_weight"
    ADD CONSTRAINT "fish_weight_sampling_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fish_mortality"
    ADD CONSTRAINT "mortality_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."normalization_review"
    ADD CONSTRAINT "normalization_review_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization"
    ADD CONSTRAINT "organization_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization"
    ADD CONSTRAINT "organization_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."production_cycle"
    ADD CONSTRAINT "production_cycle_no_overlap" EXCLUDE USING "gist" ("system_id" WITH =, "daterange"("cycle_start", COALESCE("cycle_end", 'infinity'::"date"), '[]'::"text") WITH &&);



ALTER TABLE ONLY "public"."production_cycle"
    ADD CONSTRAINT "production_cycle_pkey_cycle_id" PRIMARY KEY ("cycle_id");



ALTER TABLE ONLY "public"."raw_uploads"
    ADD CONSTRAINT "raw_uploads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fish_stocking"
    ADD CONSTRAINT "stocking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fingerling_supplier"
    ADD CONSTRAINT "supplier_name_key" UNIQUE ("company_name");



ALTER TABLE ONLY "public"."fingerling_supplier"
    ADD CONSTRAINT "supplier_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system"
    ADD CONSTRAINT "system_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fish_transfer"
    ADD CONSTRAINT "transfer_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profile"
    ADD CONSTRAINT "user_profile_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."water_quality_framework"
    ADD CONSTRAINT "water_quality_framework_parameter_unique" UNIQUE ("parameter_name");



ALTER TABLE ONLY "public"."water_quality_framework"
    ADD CONSTRAINT "water_quality_framework_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."water_quality_measurement"
    ADD CONSTRAINT "water_quality_measurement_unique" UNIQUE ("system_id", "parameter_name", "date", "time", "water_depth");



ALTER TABLE ONLY "public"."water_quality_measurement"
    ADD CONSTRAINT "water_quality_measurements_pkey" PRIMARY KEY ("id");



CREATE INDEX "daily_system_facts_cycle_idx" ON "analytics"."daily_system_facts" USING "btree" ("production_cycle_id", "inventory_date") WHERE ("production_cycle_id" IS NOT NULL);



CREATE INDEX "daily_system_facts_farm_system_date_idx" ON "analytics"."daily_system_facts" USING "btree" ("farm_id", "system_id", "inventory_date");



CREATE UNIQUE INDEX "daily_system_facts_id_idx" ON "analytics"."daily_system_facts" USING "btree" ("id");



CREATE INDEX "production_summary_cycle_date_idx" ON "analytics"."production_summary" USING "btree" ("cycle_id", "date", "activity_rank", "system_id");



CREATE INDEX "production_summary_system_date_idx" ON "analytics"."production_summary" USING "btree" ("system_id", "date");



CREATE UNIQUE INDEX "farm_user_farm_id_user_id_key" ON "public"."farm_user" USING "btree" ("farm_id", "user_id");



CREATE UNIQUE INDEX "feed_supplier_identity_idx" ON "public"."feed_supplier" USING "btree" ("lower"(TRIM(BOTH FROM "company_name")), "lower"(TRIM(BOTH FROM "location_country")), "lower"(COALESCE(TRIM(BOTH FROM "location_city"), ''::"text")));



CREATE UNIQUE INDEX "feed_type_identity_idx" ON "public"."feed_type" USING "btree" (COALESCE("farm_id", '00000000-0000-0000-0000-000000000000'::"uuid"), "feed_supplier_id", "lower"(COALESCE(TRIM(BOTH FROM "feed_line"), ''::"text")), "feed_category", "feed_pellet_size", COALESCE("crude_protein_percentage", '-1'::double precision), COALESCE("crude_fat_percentage", '-1'::double precision));



CREATE UNIQUE INDEX "feeding_record_local_id_unique" ON "public"."feeding_record" USING "btree" ("system_id", "local_id") WHERE ("local_id" IS NOT NULL);



CREATE UNIQUE INDEX "fish_harvest_local_id_unique" ON "public"."fish_harvest" USING "btree" ("system_id", "local_id") WHERE ("local_id" IS NOT NULL);



CREATE UNIQUE INDEX "fish_mortality_local_id_unique" ON "public"."fish_mortality" USING "btree" ("system_id", "local_id") WHERE ("local_id" IS NOT NULL);



CREATE UNIQUE INDEX "fish_sampling_weight_local_id_unique" ON "public"."fish_sampling_weight" USING "btree" ("system_id", "local_id") WHERE ("local_id" IS NOT NULL);



CREATE UNIQUE INDEX "fish_stocking_local_id_unique" ON "public"."fish_stocking" USING "btree" ("system_id", "local_id") WHERE ("local_id" IS NOT NULL);



CREATE UNIQUE INDEX "fish_transfer_local_id_unique" ON "public"."fish_transfer" USING "btree" ("origin_system_id", "local_id") WHERE ("local_id" IS NOT NULL);



CREATE INDEX "idx_daily_water_quality_rating_system_date_desc" ON "public"."daily_water_quality_rating" USING "btree" ("system_id", "rating_date" DESC, "created_at" DESC, "id" DESC);



CREATE INDEX "idx_daily_wq_rating_date" ON "public"."daily_water_quality_rating" USING "btree" ("rating_date");



CREATE INDEX "idx_daily_wq_system_date_desc" ON "public"."daily_water_quality_rating" USING "btree" ("system_id", "rating_date" DESC);



CREATE INDEX "idx_dwr_system_date" ON "public"."daily_water_quality_rating" USING "btree" ("system_id", "rating_date");



CREATE INDEX "idx_energy_alarm_events_active" ON "public"."energy_alarm_events" USING "btree" ("farm_id", "status", "severity", "started_at" DESC) WHERE ("status" <> 'resolved'::"text");



CREATE INDEX "idx_energy_alarm_events_farm_started_at" ON "public"."energy_alarm_events" USING "btree" ("farm_id", "started_at" DESC);



CREATE INDEX "idx_energy_meter_timeseries_farm_meter_measured_at" ON "public"."energy_meter_timeseries" USING "btree" ("farm_id", "meter_id", "measured_at" DESC);



CREATE INDEX "idx_farm_org_id" ON "public"."farm" USING "btree" ("organization_id");



CREATE INDEX "idx_farm_user_farm_user_role" ON "public"."farm_user" USING "btree" ("farm_id", "user_id", "role");



CREATE INDEX "idx_farm_user_user_farm" ON "public"."farm_user" USING "btree" ("user_id", "farm_id");



CREATE INDEX "idx_farm_user_user_id" ON "public"."farm_user" USING "btree" ("user_id");



CREATE INDEX "idx_feed_inventory_farm_date" ON "public"."feed_inventory" USING "btree" ("farm_id", "inventory_date");



CREATE INDEX "idx_feed_inventory_feed_type_date" ON "public"."feed_inventory" USING "btree" ("feed_type_id", "inventory_date");



CREATE INDEX "idx_feed_type_farm_id" ON "public"."feed_type" USING "btree" ("farm_id");



CREATE INDEX "idx_feed_type_feed_supplier" ON "public"."feed_type" USING "btree" ("feed_supplier_id");



CREATE INDEX "idx_feeding_record_cycle_id" ON "public"."feeding_record" USING "btree" ("cycle_id");



CREATE INDEX "idx_feeding_record_response_date" ON "public"."feeding_record" USING "btree" ("system_id", "date", "feeding_response");



CREATE INDEX "idx_feeding_record_system_date" ON "public"."feeding_record" USING "btree" ("system_id", "date");



CREATE INDEX "idx_fh_system_date" ON "public"."fish_harvest" USING "btree" ("system_id", "date");



CREATE INDEX "idx_fingerling_batch_farm_id" ON "public"."fingerling_batch" USING "btree" ("farm_id");



CREATE INDEX "idx_fish_harvest_batch_id" ON "public"."fish_harvest" USING "btree" ("batch_id");



CREATE INDEX "idx_fish_harvest_cycle_id" ON "public"."fish_harvest" USING "btree" ("cycle_id");



CREATE INDEX "idx_fish_harvest_system_date" ON "public"."fish_harvest" USING "btree" ("system_id", "date" DESC);



CREATE INDEX "idx_fish_harvest_system_date_desc" ON "public"."fish_harvest" USING "btree" ("system_id", "date" DESC);



CREATE INDEX "idx_fish_mortality_batch_id" ON "public"."fish_mortality" USING "btree" ("batch_id");



CREATE INDEX "idx_fish_mortality_cycle_id" ON "public"."fish_mortality" USING "btree" ("cycle_id");



CREATE INDEX "idx_fish_mortality_system_date" ON "public"."fish_mortality" USING "btree" ("system_id", "date");



CREATE INDEX "idx_fish_sampling_system_date" ON "public"."fish_sampling_weight" USING "btree" ("system_id", "date");



CREATE INDEX "idx_fish_sampling_weight_cycle_id" ON "public"."fish_sampling_weight" USING "btree" ("cycle_id");



CREATE INDEX "idx_fish_sampling_weight_system_date" ON "public"."fish_sampling_weight" USING "btree" ("system_id", "date" DESC);



CREATE INDEX "idx_fish_stocking_cycle_id" ON "public"."fish_stocking" USING "btree" ("cycle_id");



CREATE INDEX "idx_fish_transfer_cycle_id" ON "public"."fish_transfer" USING "btree" ("cycle_id");



CREATE INDEX "idx_fish_transfer_system_date" ON "public"."fish_transfer" USING "btree" ("origin_system_id", "date" DESC);



CREATE INDEX "idx_fish_transfer_type_date_desc" ON "public"."fish_transfer" USING "btree" ("transfer_type", "date" DESC);



CREATE INDEX "idx_fs_system_date" ON "public"."fish_stocking" USING "btree" ("system_id", "date");



CREATE INDEX "idx_ft_origin_date" ON "public"."fish_transfer" USING "btree" ("origin_system_id", "date");



CREATE INDEX "idx_ft_target_date" ON "public"."fish_transfer" USING "btree" ("target_system_id", "date");



CREATE INDEX "idx_norm_review_farm_unresolved" ON "public"."normalization_review" USING "btree" ("farm_id", "resolved", "created_at" DESC);



CREATE INDEX "idx_production_cycle_system_ongoing" ON "public"."production_cycle" USING "btree" ("system_id") WHERE ("ongoing_cycle" = true);



CREATE INDEX "idx_raw_uploads_farm_status" ON "public"."raw_uploads" USING "btree" ("farm_id", "status", "uploaded_at" DESC);



CREATE INDEX "idx_system_farm_id" ON "public"."system" USING "btree" ("farm_id");



CREATE INDEX "idx_system_farm_id_id" ON "public"."system" USING "btree" ("farm_id", "id");



CREATE INDEX "idx_system_id_farm_id" ON "public"."system" USING "btree" ("id", "farm_id");



CREATE INDEX "idx_wqm_system_date" ON "public"."water_quality_measurement" USING "btree" ("system_id", "date" DESC);



CREATE INDEX "idx_wqm_system_date_time" ON "public"."water_quality_measurement" USING "btree" ("system_id", "date", "time");



CREATE INDEX "idx_wqm_system_id" ON "public"."water_quality_measurement" USING "btree" ("system_id");



CREATE INDEX "idx_wqm_system_measured_at" ON "public"."water_quality_measurement" USING "btree" ("system_id", "measured_at");



CREATE UNIQUE INDEX "system_active_name_farm_unique" ON "public"."system" USING "btree" ("farm_id", "name") WHERE ("is_active" IS TRUE);



CREATE UNIQUE INDEX "uq_one_active_cycle_per_system" ON "public"."production_cycle" USING "btree" ("system_id") WHERE ("ongoing_cycle" = true);



CREATE UNIQUE INDEX "water_quality_measurement_local_id_uidx" ON "public"."water_quality_measurement" USING "btree" ("local_id");



CREATE UNIQUE INDEX "water_quality_measurement_local_id_unique" ON "public"."water_quality_measurement" USING "btree" ("system_id", "local_id") WHERE ("local_id" IS NOT NULL);



CREATE OR REPLACE TRIGGER "after_feeding_record_update_inventory" AFTER INSERT OR DELETE OR UPDATE ON "public"."feeding_record" FOR EACH ROW EXECUTE FUNCTION "public"."after_event_update_inventory"();



CREATE OR REPLACE TRIGGER "after_fish_harvest_update_inventory" AFTER INSERT OR DELETE OR UPDATE ON "public"."fish_harvest" FOR EACH ROW EXECUTE FUNCTION "public"."after_event_update_inventory"();



CREATE OR REPLACE TRIGGER "after_fish_mortality_update_inventory" AFTER INSERT OR DELETE OR UPDATE ON "public"."fish_mortality" FOR EACH ROW EXECUTE FUNCTION "public"."after_event_update_inventory"();



CREATE OR REPLACE TRIGGER "after_fish_sampling_weight_update_inventory" AFTER INSERT OR DELETE OR UPDATE ON "public"."fish_sampling_weight" FOR EACH ROW EXECUTE FUNCTION "public"."after_event_update_inventory"();



CREATE OR REPLACE TRIGGER "after_fish_stocking_update_inventory" AFTER INSERT OR DELETE OR UPDATE ON "public"."fish_stocking" FOR EACH ROW EXECUTE FUNCTION "public"."after_event_update_inventory"();



CREATE OR REPLACE TRIGGER "after_fish_transfer_update_inventory" AFTER INSERT OR DELETE OR UPDATE ON "public"."fish_transfer" FOR EACH ROW EXECUTE FUNCTION "public"."after_event_update_inventory"();



CREATE OR REPLACE TRIGGER "no_manual_changes" BEFORE INSERT OR DELETE OR UPDATE ON "public"."daily_water_quality_rating" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_manual_wqr_changes"();



CREATE OR REPLACE TRIGGER "prevent_system_name_change" BEFORE UPDATE ON "public"."system" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_system_name_update"();



CREATE OR REPLACE TRIGGER "refresh_after_system" AFTER INSERT OR DELETE OR UPDATE ON "public"."system" FOR EACH ROW EXECUTE FUNCTION "public"."refresh_after_system_if_needed"();



CREATE OR REPLACE TRIGGER "set_harvest_abw" BEFORE INSERT OR UPDATE ON "public"."fish_harvest" FOR EACH ROW EXECUTE FUNCTION "public"."set_harvest_abw"();



CREATE OR REPLACE TRIGGER "set_sampling_weight_abw" BEFORE INSERT OR UPDATE ON "public"."fish_sampling_weight" FOR EACH ROW EXECUTE FUNCTION "public"."set_sampling_weight_abw"();



CREATE OR REPLACE TRIGGER "trg_close_cycle_on_final_harvest" AFTER INSERT OR UPDATE OF "type_of_harvest", "date", "system_id" ON "public"."fish_harvest" FOR EACH ROW EXECUTE FUNCTION "public"."close_cycle_on_final_harvest"();



CREATE OR REPLACE TRIGGER "trg_cycle_on_stocking" BEFORE INSERT OR UPDATE OF "system_id", "batch_id", "date", "cycle_id" ON "public"."fish_stocking" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_cycle_on_stocking"();



CREATE OR REPLACE TRIGGER "trg_energy_alarm_events_updated_at" BEFORE UPDATE ON "public"."energy_alarm_events" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_energy_meter_timeseries_updated_at" BEFORE UPDATE ON "public"."energy_meter_timeseries" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_feeding_record_assign_lineage" BEFORE INSERT OR UPDATE OF "system_id", "date", "cycle_id", "batch_id" ON "public"."feeding_record" FOR EACH ROW EXECUTE FUNCTION "public"."assign_operation_lineage_from_system"();



CREATE OR REPLACE TRIGGER "trg_fish_harvest_assign_lineage" BEFORE INSERT OR UPDATE OF "system_id", "date", "cycle_id", "batch_id" ON "public"."fish_harvest" FOR EACH ROW EXECUTE FUNCTION "public"."assign_operation_lineage_from_system"();



CREATE OR REPLACE TRIGGER "trg_fish_harvest_set_abw" BEFORE INSERT OR UPDATE OF "number_of_fish_harvest", "total_weight_harvest", "abw" ON "public"."fish_harvest" FOR EACH ROW EXECUTE FUNCTION "public"."set_harvest_abw"();



CREATE OR REPLACE TRIGGER "trg_fish_mortality_assign_lineage" BEFORE INSERT OR UPDATE OF "system_id", "date", "cycle_id", "batch_id" ON "public"."fish_mortality" FOR EACH ROW EXECUTE FUNCTION "public"."assign_operation_lineage_from_system"();



CREATE OR REPLACE TRIGGER "trg_fish_sampling_weight_assign_lineage" BEFORE INSERT OR UPDATE OF "system_id", "date", "cycle_id", "batch_id" ON "public"."fish_sampling_weight" FOR EACH ROW EXECUTE FUNCTION "public"."assign_operation_lineage_from_system"();



CREATE OR REPLACE TRIGGER "trg_fish_sampling_weight_set_abw" BEFORE INSERT OR UPDATE OF "number_of_fish_sampling", "total_weight_sampling", "abw" ON "public"."fish_sampling_weight" FOR EACH ROW EXECUTE FUNCTION "public"."set_sampling_weight_abw"();



CREATE OR REPLACE TRIGGER "trg_fish_transfer_assign_lineage" BEFORE INSERT OR UPDATE OF "origin_system_id", "date", "cycle_id", "batch_id" ON "public"."fish_transfer" FOR EACH ROW EXECUTE FUNCTION "public"."assign_transfer_lineage_from_origin"();



CREATE OR REPLACE TRIGGER "trg_growth_stage_on_sampling" AFTER INSERT OR UPDATE OF "abw", "total_weight_sampling", "number_of_fish_sampling" ON "public"."fish_sampling_weight" FOR EACH ROW EXECUTE FUNCTION "public"."trg_update_system_growth_stage"();



CREATE OR REPLACE TRIGGER "trg_production_cycle_set_ongoing" BEFORE INSERT OR UPDATE OF "cycle_end" ON "public"."production_cycle" FOR EACH ROW EXECUTE FUNCTION "public"."production_cycle_set_ongoing"();



CREATE OR REPLACE TRIGGER "water_quality_framework_refresh_daily_rating" AFTER UPDATE ON "public"."water_quality_framework" FOR EACH ROW EXECUTE FUNCTION "public"."trg_refresh_daily_water_quality_rating_from_framework"();



CREATE OR REPLACE TRIGGER "water_quality_measurement_refresh_daily_rating" AFTER INSERT OR DELETE OR UPDATE ON "public"."water_quality_measurement" FOR EACH ROW EXECUTE FUNCTION "public"."trg_refresh_daily_water_quality_rating"();



ALTER TABLE ONLY "public"."_affected_systems"
    ADD CONSTRAINT "_affected_systems_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."alert_threshold"
    ADD CONSTRAINT "alert_threshold_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."alert_threshold"
    ADD CONSTRAINT "alert_threshold_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_water_quality_rating"
    ADD CONSTRAINT "daily_water_quality_rating_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id");



ALTER TABLE ONLY "public"."energy_alarm_events"
    ADD CONSTRAINT "energy_alarm_events_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."energy_meter_timeseries"
    ADD CONSTRAINT "energy_meter_timeseries_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."farm"
    ADD CONSTRAINT "farm_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id");



ALTER TABLE ONLY "public"."farm_user"
    ADD CONSTRAINT "farm_user_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."farm_user"
    ADD CONSTRAINT "farm_user_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feed_inventory"
    ADD CONSTRAINT "feed_inventory_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feed_inventory"
    ADD CONSTRAINT "feed_inventory_feed_type_id_fkey" FOREIGN KEY ("feed_type_id") REFERENCES "public"."feed_type"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."feeding_record"
    ADD CONSTRAINT "feed_record_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id");



ALTER TABLE ONLY "public"."feed_type"
    ADD CONSTRAINT "feed_type_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."feed_type"
    ADD CONSTRAINT "feed_type_feed_supplier_fkey" FOREIGN KEY ("feed_supplier_id") REFERENCES "public"."feed_supplier"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."feeding_record"
    ADD CONSTRAINT "feeding_record_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."fingerling_batch"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."feeding_record"
    ADD CONSTRAINT "feeding_record_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."production_cycle"("cycle_id");



ALTER TABLE ONLY "public"."feeding_record"
    ADD CONSTRAINT "feeding_record_feed_id_fkey" FOREIGN KEY ("feed_type_id") REFERENCES "public"."feed_type"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."fingerling_batch"
    ADD CONSTRAINT "fingerling_batch_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id");



ALTER TABLE ONLY "public"."fingerling_batch"
    ADD CONSTRAINT "fingerling_batch_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."fingerling_supplier"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."fish_harvest"
    ADD CONSTRAINT "fish_harvest_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."fingerling_batch"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."fish_harvest"
    ADD CONSTRAINT "fish_harvest_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."production_cycle"("cycle_id");



ALTER TABLE ONLY "public"."fish_harvest"
    ADD CONSTRAINT "fish_harvest_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."fish_mortality"
    ADD CONSTRAINT "fish_mortality_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."fingerling_batch"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."fish_mortality"
    ADD CONSTRAINT "fish_mortality_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."production_cycle"("cycle_id");



ALTER TABLE ONLY "public"."fish_sampling_weight"
    ADD CONSTRAINT "fish_sampling_weight_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."fingerling_batch"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."fish_sampling_weight"
    ADD CONSTRAINT "fish_sampling_weight_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."production_cycle"("cycle_id");



ALTER TABLE ONLY "public"."fish_stocking"
    ADD CONSTRAINT "fish_stocking_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."fingerling_batch"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."fish_stocking"
    ADD CONSTRAINT "fish_stocking_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."production_cycle"("cycle_id");



ALTER TABLE ONLY "public"."fish_transfer"
    ADD CONSTRAINT "fish_transfer_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."fingerling_batch"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."fish_transfer"
    ADD CONSTRAINT "fish_transfer_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."production_cycle"("cycle_id");



ALTER TABLE ONLY "public"."fish_sampling_weight"
    ADD CONSTRAINT "fish_weight_sampling_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id");



ALTER TABLE ONLY "public"."feeding_record"
    ADD CONSTRAINT "fk_feeding_response_level" FOREIGN KEY ("feeding_response") REFERENCES "public"."feeding_response_level"("level");



ALTER TABLE ONLY "public"."fish_mortality"
    ADD CONSTRAINT "mortality_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id");



ALTER TABLE ONLY "public"."normalization_review"
    ADD CONSTRAINT "normalization_review_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."normalization_review"
    ADD CONSTRAINT "normalization_review_raw_upload_id_fkey" FOREIGN KEY ("raw_upload_id") REFERENCES "public"."raw_uploads"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."normalization_review"
    ADD CONSTRAINT "normalization_review_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."organization"
    ADD CONSTRAINT "organization_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."production_cycle"
    ADD CONSTRAINT "production_cycle_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."fingerling_batch"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."production_cycle"
    ADD CONSTRAINT "production_cycle_previous_system_id_fkey" FOREIGN KEY ("previous_system_id") REFERENCES "public"."system"("id");



ALTER TABLE ONLY "public"."production_cycle"
    ADD CONSTRAINT "production_cycle_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."raw_uploads"
    ADD CONSTRAINT "raw_uploads_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."raw_uploads"
    ADD CONSTRAINT "raw_uploads_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."raw_uploads"
    ADD CONSTRAINT "raw_uploads_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."fish_stocking"
    ADD CONSTRAINT "stocking_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id");



ALTER TABLE ONLY "public"."system"
    ADD CONSTRAINT "system_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fish_transfer"
    ADD CONSTRAINT "transfer_origin_system_id_fkey" FOREIGN KEY ("origin_system_id") REFERENCES "public"."system"("id");



ALTER TABLE ONLY "public"."fish_transfer"
    ADD CONSTRAINT "transfer_target_system_id_fkey" FOREIGN KEY ("target_system_id") REFERENCES "public"."system"("id");



ALTER TABLE ONLY "public"."user_profile"
    ADD CONSTRAINT "user_profile_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id");



ALTER TABLE ONLY "public"."user_profile"
    ADD CONSTRAINT "user_profile_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profile"("user_id");



ALTER TABLE ONLY "public"."water_quality_measurement"
    ADD CONSTRAINT "water_quality_measurement_parameter_fkey" FOREIGN KEY ("parameter_name") REFERENCES "public"."water_quality_framework"("parameter_name");



ALTER TABLE ONLY "public"."water_quality_measurement"
    ADD CONSTRAINT "water_quality_measurements_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id");



CREATE POLICY "Authenticated users can read water_quality_framework" ON "public"."water_quality_framework" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."alert_threshold" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "alert_threshold_delete" ON "public"."alert_threshold" FOR DELETE TO "authenticated" USING (((("scope" = 'farm'::"text") AND "private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"], ( SELECT "auth"."uid"() AS "uid"))) OR (("scope" = 'system'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."system" "s"
  WHERE (("s"."id" = "alert_threshold"."system_id") AND "private"."has_farm_role"("s"."farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"], ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "alert_threshold_select_farm_member" ON "public"."alert_threshold" FOR SELECT TO "authenticated" USING (((("farm_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE (("fu"."farm_id" = "alert_threshold"."farm_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) OR (("system_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "alert_threshold"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "alert_threshold_update_admin_manager" ON "public"."alert_threshold" FOR UPDATE TO "authenticated" USING (((("farm_id" IS NOT NULL) AND "private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"])) OR (("system_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."system" "s"
  WHERE (("s"."id" = "alert_threshold"."system_id") AND "private"."has_farm_role"("s"."farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"]))))))) WITH CHECK (((("farm_id" IS NOT NULL) AND "private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"])) OR (("system_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."system" "s"
  WHERE (("s"."id" = "alert_threshold"."system_id") AND "private"."has_farm_role"("s"."farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"])))))));



CREATE POLICY "alert_threshold_write_admin_manager" ON "public"."alert_threshold" FOR INSERT TO "authenticated" WITH CHECK (((("farm_id" IS NOT NULL) AND "private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"])) OR (("system_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."system" "s"
  WHERE (("s"."id" = "alert_threshold"."system_id") AND "private"."has_farm_role"("s"."farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"])))))));



ALTER TABLE "public"."app_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "app_config_select" ON "public"."app_config" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."daily_water_quality_rating" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dashboard_time_period" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dashboard_time_period: authenticated read" ON "public"."dashboard_time_period" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "dwr_select_farm_member" ON "public"."daily_water_quality_rating" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "daily_water_quality_rating"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."energy_alarm_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "energy_alarm_events_farm_members_all" ON "public"."energy_alarm_events" TO "authenticated" USING ("private"."is_farm_member"("farm_id")) WITH CHECK ("private"."is_farm_member"("farm_id"));



ALTER TABLE "public"."energy_meter_timeseries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "energy_meter_timeseries_farm_members_all" ON "public"."energy_meter_timeseries" TO "authenticated" USING ("private"."is_farm_member"("farm_id")) WITH CHECK ("private"."is_farm_member"("farm_id"));



ALTER TABLE "public"."farm" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "farm_delete" ON "public"."farm" FOR DELETE USING ("private"."has_farm_role"("id", ARRAY['admin'::"text", 'farm_manager'::"text"], ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "farm_insert" ON "public"."farm" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "farm_select" ON "public"."farm" FOR SELECT USING ("private"."is_farm_member"("id", ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "farm_update" ON "public"."farm" FOR UPDATE USING ("private"."has_farm_role"("id", ARRAY['admin'::"text", 'farm_manager'::"text"], ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("private"."has_farm_role"("id", ARRAY['admin'::"text", 'farm_manager'::"text"], ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."farm_user" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "farm_user: read own" ON "public"."farm_user" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "farm_user_delete" ON "public"."farm_user" FOR DELETE TO "authenticated" USING ("private"."has_farm_role"("farm_id", ARRAY['admin'::"text"], ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "farm_user_insert" ON "public"."farm_user" FOR INSERT TO "authenticated" WITH CHECK ("private"."has_farm_role"("farm_id", ARRAY['admin'::"text"], ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "farm_user_update" ON "public"."farm_user" FOR UPDATE TO "authenticated" USING ("private"."has_farm_role"("farm_id", ARRAY['admin'::"text"], ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("private"."has_farm_role"("farm_id", ARRAY['admin'::"text"], ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."feed_inventory" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feed_inventory: delete managers" ON "public"."feed_inventory" FOR DELETE TO "authenticated" USING ("private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"]));



CREATE POLICY "feed_inventory: insert write roles" ON "public"."feed_inventory" FOR INSERT TO "authenticated" WITH CHECK ("private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text", 'farm_technician'::"text"]));



CREATE POLICY "feed_inventory: read farm members" ON "public"."feed_inventory" FOR SELECT TO "authenticated" USING ("private"."is_farm_member"("farm_id"));



CREATE POLICY "feed_inventory: update managers" ON "public"."feed_inventory" FOR UPDATE TO "authenticated" USING ("private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"])) WITH CHECK ("private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"]));



ALTER TABLE "public"."feed_supplier" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feed_supplier: delete by managers" ON "public"."feed_supplier" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE (("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "feed_supplier: insert by managers" ON "public"."feed_supplier" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE (("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "feed_supplier: update by managers" ON "public"."feed_supplier" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE (("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE (("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "feed_supplier_select" ON "public"."feed_supplier" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."feed_type" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feed_type: delete by farm managers" ON "public"."feed_type" FOR DELETE TO "authenticated" USING ((("farm_id" IS NOT NULL) AND "private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"])));



CREATE POLICY "feed_type: insert by farm managers" ON "public"."feed_type" FOR INSERT TO "authenticated" WITH CHECK ((("farm_id" IS NOT NULL) AND "private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"])));



CREATE POLICY "feed_type: read shared or farm scoped" ON "public"."feed_type" FOR SELECT TO "authenticated" USING ((("farm_id" IS NULL) OR "private"."is_farm_member"("farm_id")));



CREATE POLICY "feed_type: update by farm managers" ON "public"."feed_type" FOR UPDATE TO "authenticated" USING ((("farm_id" IS NOT NULL) AND "private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"]))) WITH CHECK ((("farm_id" IS NOT NULL) AND "private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"])));



ALTER TABLE "public"."feeding_record" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feeding_record: delete by managers" ON "public"."feeding_record" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "feeding_record"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "feeding_record: insert by write roles" ON "public"."feeding_record" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "feeding_record"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text"]))))));



CREATE POLICY "feeding_record: read if farm member" ON "public"."feeding_record" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "feeding_record"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "feeding_record: update by managers" ON "public"."feeding_record" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "feeding_record"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "feeding_record"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));



ALTER TABLE "public"."feeding_response_level" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feeding_response_level: read authenticated" ON "public"."feeding_response_level" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."fingerling_batch" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fingerling_batch: delete by managers" ON "public"."fingerling_batch" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE (("fu"."farm_id" = "fingerling_batch"."farm_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "fingerling_batch: insert by write roles" ON "public"."fingerling_batch" FOR INSERT WITH CHECK ((("farm_id" IS NOT NULL) AND "private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text"], "auth"."uid"())));



CREATE POLICY "fingerling_batch: read if user is farm member" ON "public"."fingerling_batch" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "fingerling_batch: update by managers" ON "public"."fingerling_batch" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE (("fu"."farm_id" = "fingerling_batch"."farm_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE (("fu"."farm_id" = "fingerling_batch"."farm_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));



ALTER TABLE "public"."fingerling_supplier" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fingerling_supplier: delete by managers" ON "public"."fingerling_supplier" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE (("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "fingerling_supplier: insert by write roles" ON "public"."fingerling_supplier" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE (("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text"]))))));



CREATE POLICY "fingerling_supplier: update by managers" ON "public"."fingerling_supplier" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE (("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE (("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "fingerling_supplier_select" ON "public"."fingerling_supplier" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."fish_harvest" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fish_harvest: delete by managers" ON "public"."fish_harvest" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_harvest"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "fish_harvest: insert by write roles" ON "public"."fish_harvest" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_harvest"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text"]))))));



CREATE POLICY "fish_harvest: read if farm member" ON "public"."fish_harvest" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_harvest"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "fish_harvest: update by managers" ON "public"."fish_harvest" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_harvest"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_harvest"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));



ALTER TABLE "public"."fish_mortality" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fish_mortality: delete by managers" ON "public"."fish_mortality" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_mortality"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "fish_mortality: insert by write roles" ON "public"."fish_mortality" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_mortality"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text"]))))));



CREATE POLICY "fish_mortality: read if farm member" ON "public"."fish_mortality" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_mortality"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "fish_mortality: update by managers" ON "public"."fish_mortality" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_mortality"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_mortality"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));



ALTER TABLE "public"."fish_sampling_weight" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fish_sampling_weight: delete by managers" ON "public"."fish_sampling_weight" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_sampling_weight"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "fish_sampling_weight: insert by write roles" ON "public"."fish_sampling_weight" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_sampling_weight"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text"]))))));



CREATE POLICY "fish_sampling_weight: read if farm member" ON "public"."fish_sampling_weight" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_sampling_weight"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "fish_sampling_weight: update by managers" ON "public"."fish_sampling_weight" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_sampling_weight"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_sampling_weight"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));



ALTER TABLE "public"."fish_stocking" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fish_stocking: delete by managers" ON "public"."fish_stocking" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_stocking"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "fish_stocking: insert by write roles" ON "public"."fish_stocking" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_stocking"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text"]))))));



CREATE POLICY "fish_stocking: read if farm member" ON "public"."fish_stocking" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_stocking"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "fish_stocking: update by managers" ON "public"."fish_stocking" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_stocking"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_stocking"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));



ALTER TABLE "public"."fish_transfer" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fish_transfer: delete by managers" ON "public"."fish_transfer" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_transfer"."origin_system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "fish_transfer: insert by write roles" ON "public"."fish_transfer" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_transfer"."origin_system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text"]))))));



CREATE POLICY "fish_transfer: read if farm member" ON "public"."fish_transfer" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("s"."id" = "fish_transfer"."origin_system_id") OR ("s"."id" = "fish_transfer"."target_system_id"))))));



CREATE POLICY "fish_transfer: update by managers" ON "public"."fish_transfer" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_transfer"."origin_system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_transfer"."origin_system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "norm_review_farm_isolation" ON "public"."normalization_review" USING (("farm_id" IN ( SELECT "farm_user"."farm_id"
   FROM "public"."farm_user"
  WHERE ("farm_user"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."normalization_review" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_select_owner_or_farm_member" ON "public"."organization" FOR SELECT TO "authenticated" USING ((("owner_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM ("public"."farm" "f"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "f"."id")))
  WHERE (("f"."organization_id" = "organization"."id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."production_cycle" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "production_cycle: delete by managers" ON "public"."production_cycle" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "production_cycle"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "production_cycle_insert" ON "public"."production_cycle" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "production_cycle"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "production_cycle_select" ON "public"."production_cycle" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "production_cycle"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "production_cycle_update" ON "public"."production_cycle" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "production_cycle"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."raw_uploads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "raw_uploads_farm_isolation" ON "public"."raw_uploads" USING (("farm_id" IN ( SELECT "farm_user"."farm_id"
   FROM "public"."farm_user"
  WHERE ("farm_user"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."system" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "system_delete" ON "public"."system" FOR DELETE USING ("private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"], ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "system_insert" ON "public"."system" FOR INSERT WITH CHECK ("private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text"], ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "system_select" ON "public"."system" FOR SELECT TO "authenticated" USING ("private"."is_farm_member"("farm_id", ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "system_update" ON "public"."system" FOR UPDATE USING ("private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text"], ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text"], ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."user_profile" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_profile_insert" ON "public"."user_profile" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "user_profile_select" ON "public"."user_profile" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM ("public"."farm_user" "fu1"
     JOIN "public"."farm_user" "fu2" ON (("fu1"."farm_id" = "fu2"."farm_id")))
  WHERE (("fu1"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu2"."user_id" = "user_profile"."user_id"))))));



CREATE POLICY "user_profile_update" ON "public"."user_profile" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."water_quality_framework" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."water_quality_measurement" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "water_quality_measurement: delete by managers" ON "public"."water_quality_measurement" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "water_quality_measurement"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "water_quality_measurement: insert by write roles" ON "public"."water_quality_measurement" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "water_quality_measurement"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text"]))))));



CREATE POLICY "water_quality_measurement: update by managers" ON "public"."water_quality_measurement" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "water_quality_measurement"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "water_quality_measurement"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("fu"."role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "wqm_select_farm_member" ON "public"."water_quality_measurement" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "water_quality_measurement"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



GRANT USAGE ON SCHEMA "analytics" TO "service_role";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."after_event_update_inventory"() TO "anon";
GRANT ALL ON FUNCTION "public"."after_event_update_inventory"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."after_event_update_inventory"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_cycle_benchmarks"("p_farm_id" "uuid", "p_system_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_cycle_benchmarks"("p_farm_id" "uuid", "p_system_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_cycle_benchmarks"("p_farm_id" "uuid", "p_system_id" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_daily_fish_inventory_rpc"("p_farm_id" "uuid", "p_system_id" bigint, "p_stage" "public"."system_growth_stage", "p_start_date" "date", "p_end_date" "date", "p_cursor_date" "date", "p_cursor_system_id" bigint, "p_order_asc" boolean, "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_daily_fish_inventory_rpc"("p_farm_id" "uuid", "p_system_id" bigint, "p_stage" "public"."system_growth_stage", "p_start_date" "date", "p_end_date" "date", "p_cursor_date" "date", "p_cursor_system_id" bigint, "p_order_asc" boolean, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_daily_fish_inventory_rpc"("p_farm_id" "uuid", "p_system_id" bigint, "p_stage" "public"."system_growth_stage", "p_start_date" "date", "p_end_date" "date", "p_cursor_date" "date", "p_cursor_system_id" bigint, "p_order_asc" boolean, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."api_dashboard_consolidated"("p_farm_id" "uuid", "p_system_id" bigint, "p_stage" "public"."system_growth_stage", "p_start_date" "date", "p_end_date" "date", "p_time_period" "text", "p_limit" integer, "p_order_desc" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_dashboard_consolidated"("p_farm_id" "uuid", "p_system_id" bigint, "p_stage" "public"."system_growth_stage", "p_start_date" "date", "p_end_date" "date", "p_time_period" "text", "p_limit" integer, "p_order_desc" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."api_dashboard_systems"("p_farm_id" "uuid", "p_system_id" bigint, "p_stage" "public"."system_growth_stage", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_dashboard_systems"("p_farm_id" "uuid", "p_system_id" bigint, "p_stage" "public"."system_growth_stage", "p_start_date" "date", "p_end_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_efcr_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_efcr_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_efcr_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_farm_options_rpc"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_farm_options_rpc"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_farm_options_rpc"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_farm_user_invitations"("p_farm_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_farm_user_invitations"("p_farm_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_farm_user_invitations"("p_farm_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_feed_rate_analysis"("p_farm_id" "uuid", "p_system_id" bigint, "p_date_from" "date", "p_date_to" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_feed_rate_analysis"("p_farm_id" "uuid", "p_system_id" bigint, "p_date_from" "date", "p_date_to" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_feed_rate_analysis"("p_farm_id" "uuid", "p_system_id" bigint, "p_date_from" "date", "p_date_to" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_feed_type_options_rpc"("p_farm_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_feed_type_options_rpc"("p_farm_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_feed_type_options_rpc"("p_farm_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_fingerling_batch_options_rpc"("p_farm_id" "uuid", "p_active_only" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_fingerling_batch_options_rpc"("p_farm_id" "uuid", "p_active_only" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_fingerling_batch_options_rpc"("p_farm_id" "uuid", "p_active_only" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_growth_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_growth_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_growth_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_harvest_forecast"("p_farm_id" "uuid", "p_system_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_harvest_forecast"("p_farm_id" "uuid", "p_system_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_harvest_forecast"("p_farm_id" "uuid", "p_system_id" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_latest_water_quality_status"("p_farm_id" "uuid", "p_system_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_latest_water_quality_status"("p_farm_id" "uuid", "p_system_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_latest_water_quality_status"("p_farm_id" "uuid", "p_system_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."api_production_summary"("p_farm_id" "uuid", "p_system_id" bigint, "p_stage" "public"."system_growth_stage", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_production_summary"("p_farm_id" "uuid", "p_system_id" bigint, "p_stage" "public"."system_growth_stage", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."api_recommended_actions"("p_farm_id" "uuid", "p_system_id" bigint) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."api_running_stock"("p_farm_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_running_stock"("p_farm_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_running_stock"("p_farm_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."api_system_options_rpc"("p_farm_id" "uuid", "p_stage" "public"."system_growth_stage", "p_active_only" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_system_options_rpc"("p_farm_id" "uuid", "p_stage" "public"."system_growth_stage", "p_active_only" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_system_timeline_bounds"("p_farm_id" "uuid", "p_system_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_system_timeline_bounds"("p_farm_id" "uuid", "p_system_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_system_timeline_bounds"("p_farm_id" "uuid", "p_system_id" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_time_period_bounds_scoped"("p_farm_id" "uuid", "p_time_period" "text", "p_scope" "text", "p_anchor_date" "date", "p_system_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_time_period_bounds_scoped"("p_farm_id" "uuid", "p_time_period" "text", "p_scope" "text", "p_anchor_date" "date", "p_system_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_time_period_bounds_scoped"("p_farm_id" "uuid", "p_time_period" "text", "p_scope" "text", "p_anchor_date" "date", "p_system_id" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."claim_my_farm_user_invitations"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_my_farm_user_invitations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_my_farm_user_invitations"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."classify_growth_stage_tanganicae"("p_abw_g" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."classify_growth_stage_tanganicae"("p_abw_g" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."classify_growth_stage_tanganicae"("p_abw_g" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."classify_water_quality_measurement"("p_parameter_value" double precision, "p_optimal" "jsonb", "p_acceptable" "jsonb", "p_critical" "jsonb", "p_lethal" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."classify_water_quality_measurement"("p_parameter_value" double precision, "p_optimal" "jsonb", "p_acceptable" "jsonb", "p_critical" "jsonb", "p_lethal" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."classify_water_quality_measurement"("p_parameter_value" double precision, "p_optimal" "jsonb", "p_acceptable" "jsonb", "p_critical" "jsonb", "p_lethal" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."close_cycle_on_final_harvest"() TO "anon";
GRANT ALL ON FUNCTION "public"."close_cycle_on_final_harvest"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."close_cycle_on_final_harvest"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_farm_user_invitation"("p_farm_id" "uuid", "p_email" "text", "p_role" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_farm_user_invitation"("p_farm_id" "uuid", "p_email" "text", "p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_farm_user_invitation"("p_farm_id" "uuid", "p_email" "text", "p_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_cycle_on_stocking"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_cycle_on_stocking"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_cycle_on_stocking"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_daily_feed_target_kg"("p_farm_id" "uuid", "p_system_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_daily_feed_target_kg"("p_farm_id" "uuid", "p_system_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_daily_feed_target_kg"("p_farm_id" "uuid", "p_system_id" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_running_stock"("p_farm_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_running_stock"("p_farm_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_farm_user_invitation_sent"("p_invitation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_farm_user_invitation_sent"("p_invitation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_farm_user_invitation_sent"("p_invitation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_system_name_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_system_name_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_system_name_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."production_cycle_set_ongoing"() TO "anon";
GRANT ALL ON FUNCTION "public"."production_cycle_set_ongoing"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."production_cycle_set_ongoing"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."provision_default_farm_membership"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."provision_default_farm_membership"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."refresh_after_system_if_needed"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."refresh_after_system_if_needed"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_daily_water_quality_rating"("p_system_id" bigint, "p_from" "date", "p_to" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_daily_water_quality_rating"("p_system_id" bigint, "p_from" "date", "p_to" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_daily_water_quality_rating"("p_system_id" bigint, "p_from" "date", "p_to" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."resolve_sampling_abw_g"("p_abw" double precision, "p_total_weight_sampling" double precision, "p_number_of_fish_sampling" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."resolve_sampling_abw_g"("p_abw" double precision, "p_total_weight_sampling" double precision, "p_number_of_fish_sampling" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_sampling_abw_g"("p_abw" double precision, "p_total_weight_sampling" double precision, "p_number_of_fish_sampling" numeric) TO "service_role";



REVOKE ALL ON FUNCTION "public"."resolve_sampling_abw_g"("p_abw" numeric, "p_total_weight_sampling" numeric, "p_number_of_fish_sampling" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."resolve_sampling_abw_g"("p_abw" numeric, "p_total_weight_sampling" numeric, "p_number_of_fish_sampling" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_sampling_abw_g"("p_abw" numeric, "p_total_weight_sampling" numeric, "p_number_of_fish_sampling" numeric) TO "service_role";



REVOKE ALL ON FUNCTION "public"."revoke_farm_user_invitation"("p_invitation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."revoke_farm_user_invitation"("p_invitation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."revoke_farm_user_invitation"("p_invitation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."transfer_impacts_efcr"("p_transfer_type" "public"."transfer_type", "p_origin_system_id" bigint, "p_target_system_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."transfer_impacts_efcr"("p_transfer_type" "public"."transfer_type", "p_origin_system_id" bigint, "p_target_system_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."transfer_impacts_efcr"("p_transfer_type" "public"."transfer_type", "p_origin_system_id" bigint, "p_target_system_id" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."transfer_weight_kg"("p_total_weight_transfer" double precision, "p_number_of_fish_transfer" double precision, "p_abw" double precision) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."transfer_weight_kg"("p_total_weight_transfer" double precision, "p_number_of_fish_transfer" double precision, "p_abw" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."transfer_weight_kg"("p_total_weight_transfer" double precision, "p_number_of_fish_transfer" double precision, "p_abw" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_refresh_daily_water_quality_rating"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_refresh_daily_water_quality_rating"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_refresh_daily_water_quality_rating"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_refresh_daily_water_quality_rating_from_framework"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_refresh_daily_water_quality_rating_from_framework"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_refresh_daily_water_quality_rating_from_framework"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."trg_update_system_growth_stage"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."trg_update_system_growth_stage"() TO "service_role";



GRANT ALL ON FUNCTION "public"."water_quality_rating_label"("p_score" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."water_quality_rating_label"("p_score" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."water_quality_rating_label"("p_score" numeric) TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."feeding_record" TO "authenticated";
GRANT ALL ON TABLE "public"."feeding_record" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."fingerling_batch" TO "authenticated";
GRANT ALL ON TABLE "public"."fingerling_batch" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."fish_harvest" TO "authenticated";
GRANT ALL ON TABLE "public"."fish_harvest" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."fish_mortality" TO "authenticated";
GRANT ALL ON TABLE "public"."fish_mortality" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."fish_sampling_weight" TO "authenticated";
GRANT ALL ON TABLE "public"."fish_sampling_weight" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."fish_stocking" TO "authenticated";
GRANT ALL ON TABLE "public"."fish_stocking" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."fish_transfer" TO "authenticated";
GRANT ALL ON TABLE "public"."fish_transfer" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."system" TO "authenticated";
GRANT ALL ON TABLE "public"."system" TO "service_role";



GRANT SELECT ON TABLE "analytics"."daily_system_facts" TO "authenticated";
GRANT SELECT ON TABLE "analytics"."daily_system_facts" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."production_cycle" TO "authenticated";
GRANT ALL ON TABLE "public"."production_cycle" TO "service_role";



GRANT SELECT ON TABLE "analytics"."production_summary" TO "authenticated";
GRANT SELECT ON TABLE "analytics"."production_summary" TO "service_role";



GRANT ALL ON TABLE "public"."_affected_systems" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."alert_threshold" TO "authenticated";
GRANT ALL ON TABLE "public"."alert_threshold" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."farm_user" TO "authenticated";
GRANT ALL ON TABLE "public"."farm_user" TO "service_role";



GRANT SELECT ON TABLE "public"."api_alert_thresholds" TO "authenticated";
GRANT SELECT ON TABLE "public"."api_alert_thresholds" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."daily_water_quality_rating" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_water_quality_rating" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."user_profile" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profile" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."water_quality_measurement" TO "authenticated";
GRANT ALL ON TABLE "public"."water_quality_measurement" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE ON TABLE "public"."api_daily_water_quality_rating" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE ON TABLE "public"."api_daily_water_quality_rating" TO "authenticated";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE ON TABLE "public"."api_daily_water_quality_rating" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER ON TABLE "public"."water_quality_framework" TO "authenticated";
GRANT ALL ON TABLE "public"."water_quality_framework" TO "service_role";



GRANT SELECT ON TABLE "public"."api_water_quality_measurements" TO "authenticated";
GRANT SELECT ON TABLE "public"."api_water_quality_measurements" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER ON TABLE "public"."app_config" TO "authenticated";
GRANT ALL ON TABLE "public"."app_config" TO "service_role";



GRANT ALL ON SEQUENCE "public"."daily_water_quality_rating_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."daily_water_quality_rating_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."daily_water_quality_rating_id_seq" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER ON TABLE "public"."dashboard_time_period" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard_time_period" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE ON TABLE "public"."energy_alarm_events" TO "anon";
GRANT ALL ON TABLE "public"."energy_alarm_events" TO "authenticated";
GRANT ALL ON TABLE "public"."energy_alarm_events" TO "service_role";



GRANT UPDATE ON SEQUENCE "public"."energy_alarm_events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."energy_alarm_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."energy_alarm_events_id_seq" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE ON TABLE "public"."energy_meter_timeseries" TO "anon";
GRANT ALL ON TABLE "public"."energy_meter_timeseries" TO "authenticated";
GRANT ALL ON TABLE "public"."energy_meter_timeseries" TO "service_role";



GRANT UPDATE ON SEQUENCE "public"."energy_meter_timeseries_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."energy_meter_timeseries_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."energy_meter_timeseries_id_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."farm" TO "authenticated";
GRANT ALL ON TABLE "public"."farm" TO "service_role";



GRANT ALL ON TABLE "public"."feed_inventory" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."feed_inventory" TO "authenticated";



GRANT UPDATE ON SEQUENCE "public"."feed_inventory_id_seq" TO "anon";
GRANT UPDATE ON SEQUENCE "public"."feed_inventory_id_seq" TO "authenticated";
GRANT UPDATE ON SEQUENCE "public"."feed_inventory_id_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."feed_supplier" TO "authenticated";
GRANT ALL ON TABLE "public"."feed_supplier" TO "service_role";



GRANT ALL ON SEQUENCE "public"."feed_supplier_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."feed_supplier_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."feed_supplier_id_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."feed_type" TO "authenticated";
GRANT ALL ON TABLE "public"."feed_type" TO "service_role";



GRANT ALL ON SEQUENCE "public"."feed_type_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."feed_type_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."feed_type_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."feeding_record_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."feeding_record_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."feeding_record_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."feeding_response_level" TO "service_role";
GRANT SELECT ON TABLE "public"."feeding_response_level" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."fingerling_batch_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."fingerling_batch_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."fingerling_batch_id_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."fingerling_supplier" TO "authenticated";
GRANT ALL ON TABLE "public"."fingerling_supplier" TO "service_role";



GRANT ALL ON SEQUENCE "public"."fingerling_supplier_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."fingerling_supplier_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."fingerling_supplier_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."fish_harvest_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."fish_harvest_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."fish_harvest_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."fish_mortality_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."fish_mortality_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."fish_mortality_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."fish_sampling_weight_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."fish_sampling_weight_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."fish_sampling_weight_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."fish_stocking_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."fish_stocking_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."fish_stocking_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."fish_transfer_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."fish_transfer_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."fish_transfer_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."normalization_review" TO "authenticated";
GRANT ALL ON TABLE "public"."normalization_review" TO "service_role";



GRANT ALL ON TABLE "public"."organization" TO "authenticated";
GRANT ALL ON TABLE "public"."organization" TO "service_role";



GRANT ALL ON SEQUENCE "public"."production_cycle_cycle_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."production_cycle_cycle_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."production_cycle_cycle_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."raw_uploads" TO "authenticated";
GRANT ALL ON TABLE "public"."raw_uploads" TO "service_role";



GRANT ALL ON SEQUENCE "public"."system_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."system_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."system_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_settings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."water_quality_framework_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."water_quality_framework_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."water_quality_framework_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."water_quality_measurement_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."water_quality_measurement_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."water_quality_measurement_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."water_quality_measurements_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."water_quality_measurements_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."water_quality_measurements_id_seq" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE ON TABLES  TO "service_role";








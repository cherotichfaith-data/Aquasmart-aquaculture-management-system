


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


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE SCHEMA IF NOT EXISTS "energy";


ALTER SCHEMA "energy" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgsodium";






CREATE SCHEMA IF NOT EXISTS "private";


ALTER SCHEMA "private" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "btree_gist" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






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


CREATE OR REPLACE FUNCTION "private"."app_rpc_scope_ok"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint, "p_batch_id" bigint DEFAULT NULL::bigint, "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if not private.is_farm_member(p_farm_id) then
    return false;
  end if;

  perform private.assert_rpc_parameters(
    p_farm_id := p_farm_id,
    p_system_id := p_system_id,
    p_batch_id := p_batch_id,
    p_start_date := p_start_date,
    p_end_date := p_end_date
  );

  return true;
end;
$$;


ALTER FUNCTION "private"."app_rpc_scope_ok"("p_farm_id" "uuid", "p_system_id" bigint, "p_batch_id" bigint, "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."apply_pending_farm_user_invitations"("p_user_id" "uuid", "p_email" "text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_rows int := 0;
begin
  if p_user_id is null or v_email = '' then
    return 0;
  end if;

  insert into public.farm_user (farm_id, user_id, role)
  select
    i.farm_id,
    p_user_id,
    i.role
  from private.farm_user_invitation i
  where i.email = v_email
    and i.status = 'pending'
  on conflict (farm_id, user_id) do nothing;

  update private.farm_user_invitation
  set
    status = 'accepted',
    invited_user_id = p_user_id,
    accepted_at = coalesce(accepted_at, timezone('utc', now())),
    revoked_at = null
  where email = v_email
    and status = 'pending';

  get diagnostics v_rows = row_count;

  insert into public.user_profile (
    user_id,
    email,
    farm_id,
    organization_id,
    role
  )
  select
    p_user_id,
    v_email,
    fu.farm_id,
    f.organization_id,
    fu.role
  from public.farm_user fu
  join public.farm f on f.id = fu.farm_id
  where fu.user_id = p_user_id
  order by fu.created_at asc nulls last
  limit 1
  on conflict (user_id) do update
  set
    email = coalesce(public.user_profile.email, excluded.email),
    farm_id = coalesce(public.user_profile.farm_id, excluded.farm_id),
    organization_id = coalesce(public.user_profile.organization_id, excluded.organization_id),
    role = excluded.role,
    updated_at = timezone('utc', now());

  return v_rows;
end;
$$;


ALTER FUNCTION "private"."apply_pending_farm_user_invitations"("p_user_id" "uuid", "p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."assert_rpc_parameters"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint, "p_batch_id" bigint DEFAULT NULL::bigint, "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS "void"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if p_start_date is not null and p_end_date is not null and p_start_date > p_end_date then
    raise exception 'invalid date range: start date is after end date'
      using errcode = '22023';
  end if;

  if p_system_id is not null and not exists (
    select 1
    from public.system s
    where s.id = p_system_id
      and s.farm_id = p_farm_id
  ) then
    raise exception 'system does not belong to farm scope'
      using errcode = '42501';
  end if;

  if p_batch_id is not null and not exists (
    select 1
    from public.fingerling_batch fb
    where fb.id = p_batch_id
      and fb.farm_id = p_farm_id
  ) then
    raise exception 'batch does not belong to farm scope'
      using errcode = '42501';
  end if;
end;
$$;


ALTER FUNCTION "private"."assert_rpc_parameters"("p_farm_id" "uuid", "p_system_id" bigint, "p_batch_id" bigint, "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."clamp_rpc_limit"("p_limit" integer, "p_default" integer DEFAULT 1000, "p_max" integer DEFAULT 10000) RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'pg_temp'
    AS $$
  select greatest(1, least(coalesce(p_limit, p_default), p_max));
$$;


ALTER FUNCTION "private"."clamp_rpc_limit"("p_limit" integer, "p_default" integer, "p_max" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."has_farm_role"("farm" "uuid", "roles" "text"[]) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
      SELECT EXISTS (
          SELECT 1
              FROM public.farm_user fu
                  WHERE fu.farm_id = farm
                        AND fu.user_id = (SELECT auth.uid())
                              AND fu.role = ANY(roles)
                                );
                                $$;


ALTER FUNCTION "private"."has_farm_role"("farm" "uuid", "roles" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."has_farm_role"("farm" "uuid", "roles" "text"[], "_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
                                        SELECT EXISTS (
                                            SELECT 1
                                                FROM public.farm_user fu
                                                    WHERE fu.farm_id = farm
                                                          AND fu.user_id = _user_id
                                                                AND fu.role = ANY(roles)
                                                                  );
                                                                  $$;


ALTER FUNCTION "private"."has_farm_role"("farm" "uuid", "roles" "text"[], "_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_farm_member"("farm" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
                                                                      SELECT EXISTS (
                                                                          SELECT 1
                                                                              FROM public.farm_user fu
                                                                                  WHERE fu.farm_id = farm
                                                                                        AND fu.user_id = (SELECT auth.uid())
                                                                                          );
                                                                                          $$;


ALTER FUNCTION "private"."is_farm_member"("farm" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_farm_member"("farm" "uuid", "_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
                                                                                                SELECT EXISTS (
                                                                                                    SELECT 1
                                                                                                        FROM public.farm_user fu
                                                                                                            WHERE fu.farm_id = farm
                                                                                                                  AND fu.user_id = _user_id
                                                                                                                    );
                                                                                                                    $$;


ALTER FUNCTION "private"."is_farm_member"("farm" "uuid", "_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "private"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."after_event_update_inventory"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$ declare affected_date date; v_origin_id bigint; v_target_id bigint; v_system_id bigint; begin affected_date := coalesce(new.date, old.date); if tg_table_name = 'fish_transfer' then v_origin_id := coalesce(new.origin_system_id, old.origin_system_id); v_target_id := coalesce(new.target_system_id, old.target_system_id); if v_origin_id is not null then insert into public._affected_systems (system_id, min_affected_date) values (v_origin_id, affected_date) on conflict (system_id) do update set min_affected_date = least(public._affected_systems.min_affected_date, excluded.min_affected_date); end if; if v_target_id is not null then insert into public._affected_systems (system_id, min_affected_date) values (v_target_id, affected_date) on conflict (system_id) do update set min_affected_date = least(public._affected_systems.min_affected_date, excluded.min_affected_date); end if; else v_system_id := coalesce(new.system_id, old.system_id); if v_system_id is not null then insert into public._affected_systems (system_id, min_affected_date) values (v_system_id, affected_date) on conflict (system_id) do update set min_affected_date = least(public._affected_systems.min_affected_date, excluded.min_affected_date); end if; end if; return null; end; $$;


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



CREATE OR REPLACE FUNCTION "public"."api_daily_fish_inventory_rpc"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint, "p_stage" "public"."system_growth_stage" DEFAULT NULL::"public"."system_growth_stage", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date", "p_cursor_date" "date" DEFAULT NULL::"date", "p_cursor_system_id" bigint DEFAULT NULL::bigint, "p_order_asc" boolean DEFAULT false, "p_limit" integer DEFAULT 5000) RETURNS TABLE("inventory_date" "date", "system_id" bigint, "farm_id" "uuid", "number_of_fish" double precision, "number_of_fish_stocked" double precision, "number_of_fish_transferred_in" double precision, "number_of_fish_mortality_aggregated" double precision, "number_of_fish_mortality" double precision, "number_of_fish_transferred_out" double precision, "number_of_fish_harvested" double precision, "feeding_amount" double precision, "feeding_amount_aggregated" double precision, "last_sampling_date" "date", "abw_last_sampling" double precision, "biomass_last_sampling" double precision, "feeding_rate" double precision, "system_volume" double precision, "biomass_density" double precision, "mortality_rate" double precision, "system_name" "text")
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
    p_start_date := p_start_date,
    p_end_date := p_end_date
  );


  if p_order_asc then
    return query
    select dfi.inventory_date, dfi.system_id::bigint, s.farm_id,
      dfi.number_of_fish::double precision, dfi.number_of_fish_stocked::double precision,
      dfi.number_of_fish_transferred_in::double precision,
      dfi.number_of_fish_mortality_aggregated::double precision,
      dfi.number_of_fish_mortality::double precision,
      dfi.number_of_fish_transferred_out::double precision,
      dfi.number_of_fish_harvested::double precision,
      dfi.feeding_amount::double precision, dfi.feeding_amount_aggregated::double precision,
      dfi.last_sampling_date, dfi.abw_last_sampling::double precision,
      dfi.biomass_last_sampling::double precision, dfi.feeding_rate::double precision,
      dfi.system_volume::double precision, dfi.biomass_density::double precision,
      dfi.mortality_rate::double precision, s.name as system_name
    from analytics.daily_system_facts dfi
    join public.system s on s.id = dfi.system_id
    where s.farm_id = p_farm_id
      and (p_system_id is null or dfi.system_id = p_system_id)
      and (p_stage is null or s.growth_stage = p_stage)
      and (p_start_date is null or dfi.inventory_date >= p_start_date)
      and (p_end_date is null or dfi.inventory_date <= p_end_date)
      and (p_cursor_date is null or (dfi.inventory_date, dfi.system_id) > (p_cursor_date, coalesce(p_cursor_system_id, -1)))
    order by dfi.inventory_date asc, dfi.system_id asc
    limit private.clamp_rpc_limit(p_limit, 5000, 100000);
  else
    return query
    select dfi.inventory_date, dfi.system_id::bigint, s.farm_id,
      dfi.number_of_fish::double precision, dfi.number_of_fish_stocked::double precision,
      dfi.number_of_fish_transferred_in::double precision,
      dfi.number_of_fish_mortality_aggregated::double precision,
      dfi.number_of_fish_mortality::double precision,
      dfi.number_of_fish_transferred_out::double precision,
      dfi.number_of_fish_harvested::double precision,
      dfi.feeding_amount::double precision, dfi.feeding_amount_aggregated::double precision,
      dfi.last_sampling_date, dfi.abw_last_sampling::double precision,
      dfi.biomass_last_sampling::double precision, dfi.feeding_rate::double precision,
      dfi.system_volume::double precision, dfi.biomass_density::double precision,
      dfi.mortality_rate::double precision, s.name as system_name
    from analytics.daily_system_facts dfi
    join public.system s on s.id = dfi.system_id
    where s.farm_id = p_farm_id
      and (p_system_id is null or dfi.system_id = p_system_id)
      and (p_stage is null or s.growth_stage = p_stage)
      and (p_start_date is null or dfi.inventory_date >= p_start_date)
      and (p_end_date is null or dfi.inventory_date <= p_end_date)
      and (p_cursor_date is null or (dfi.inventory_date, dfi.system_id) < (p_cursor_date, coalesce(p_cursor_system_id, 9223372036854775807)))
    order by dfi.inventory_date desc, dfi.system_id desc
    limit private.clamp_rpc_limit(p_limit, 5000, 100000);
  end if;
end;
$$;


ALTER FUNCTION "public"."api_daily_fish_inventory_rpc"("p_farm_id" "uuid", "p_system_id" bigint, "p_stage" "public"."system_growth_stage", "p_start_date" "date", "p_end_date" "date", "p_cursor_date" "date", "p_cursor_system_id" bigint, "p_order_asc" boolean, "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."api_daily_fish_inventory_rpc"("p_farm_id" "uuid", "p_system_id" bigint, "p_stage" "public"."system_growth_stage", "p_start_date" "date", "p_end_date" "date", "p_cursor_date" "date", "p_cursor_system_id" bigint, "p_order_asc" boolean, "p_limit" integer) IS 'Intentional app-facing SECURITY DEFINER RPC. Direct access to internal read models is revoked; callers must be authenticated and function body must enforce farm membership/scope checks.';



CREATE OR REPLACE FUNCTION "public"."api_daily_overlay"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint, "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("system_id" bigint, "inventory_date" "date", "feeding_amount" double precision, "number_of_fish_mortality" double precision)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
  select dfi.system_id, dfi.inventory_date,
    coalesce(dfi.feeding_amount,0)::double precision as feeding_amount,
    coalesce(dfi.number_of_fish_mortality,0)::double precision as number_of_fish_mortality
  from analytics.daily_system_facts dfi
  join public.system s on s.id = dfi.system_id
  where s.farm_id = p_farm_id and private.app_rpc_scope_ok(p_farm_id, p_system_id, null, p_start_date, p_end_date)
    and (p_system_id is null or dfi.system_id = p_system_id)
    and (p_start_date is null or dfi.inventory_date >= p_start_date)
    and (p_end_date is null or dfi.inventory_date <= p_end_date)
  order by dfi.system_id, dfi.inventory_date;
$$;


ALTER FUNCTION "public"."api_daily_overlay"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."api_daily_overlay"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") IS 'Intentional app-facing SECURITY DEFINER RPC. Direct access to internal read models is revoked; callers must be authenticated and function body must enforce farm membership/scope checks.';



CREATE OR REPLACE FUNCTION "public"."api_dashboard_consolidated"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint, "p_stage" "public"."system_growth_stage" DEFAULT NULL::"public"."system_growth_stage", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date", "p_time_period" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT NULL::integer, "p_order_desc" boolean DEFAULT true) RETURNS TABLE("system_id" bigint, "input_start_date" "date", "input_end_date" "date", "time_period" "text", "mortality_rate" double precision, "feeding_rate" double precision, "average_biomass" double precision, "biomass_density" double precision, "efcr_period_consolidated" double precision, "water_quality_rating_numeric_average" numeric, "water_quality_rating_average" "text", "efcr_period_consolidated_delta" numeric, "mortality_rate_delta" numeric, "average_biomass_delta" numeric, "biomass_density_delta" numeric, "feeding_rate_delta" numeric, "abw_asof_end" double precision, "abw_asof_end_delta" numeric, "water_quality_rating_numeric_delta" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
declare
  v_start date;
  v_end date;
  v_len integer;
  v_prev_start date;
  v_prev_end date;
  v_tp public.time_period;
begin
  if not private.is_farm_member(p_farm_id) then
    return;
  end if;

  perform private.assert_rpc_parameters(
    p_farm_id := p_farm_id,
    p_system_id := p_system_id,
    p_batch_id := null,
    p_start_date := p_start_date,
    p_end_date := p_end_date
  );

  if p_start_date is not null and p_end_date is not null then
    v_start := p_start_date;
    v_end := p_end_date;
  else
    select dtp.time_period into v_tp
    from public.dashboard_time_period dtp
    where dtp.time_period::text = coalesce(p_time_period, '2 weeks')
    limit 1;

    if v_tp is null then
      v_tp := '2 weeks'::public.time_period;
    end if;

    select b.input_start_date, b.input_end_date into v_start, v_end
    from public.api_time_period_bounds_scoped(p_farm_id, v_tp::text, 'dashboard') b;
  end if;

  if v_start is null or v_end is null then
    return;
  end if;

  v_len := (v_end - v_start) + 1;
  v_prev_end := v_start - 1;
  v_prev_start := v_prev_end - (v_len - 1);

  return query
  with sys as (
    select s.id as system_id
    from public.system s
    where s.farm_id = p_farm_id
      and coalesce(s.is_active, true) = true
      and (p_stage is null or s.growth_stage = p_stage)
      and (p_system_id is null or s.id = p_system_id)
  ),
  inv as (
    select d.*
    from analytics.daily_system_facts d
    join sys on sys.system_id = d.system_id
  ),
  cur as (
    select * from inv where inventory_date between v_start and v_end
  ),
  prev as (
    select * from inv where inventory_date between v_prev_start and v_prev_end
  ),
  cur_metrics as (
    select
      d.system_id,
      case when sum(coalesce(d.biomass_last_sampling, 0)) > 0
        then sum(coalesce(d.feeding_rate, 0) * coalesce(d.biomass_last_sampling, 0))
          / nullif(sum(coalesce(d.biomass_last_sampling, 0)), 0)
        else avg(d.feeding_rate)
      end as feeding_rate,
      case when sum(coalesce(d.number_of_fish, 0)) > 0
        then sum(coalesce(d.mortality_rate, 0) * coalesce(d.number_of_fish, 0))
          / nullif(sum(coalesce(d.number_of_fish, 0)), 0)
        else avg(d.mortality_rate)
      end as mortality_rate,
      avg(d.biomass_last_sampling) as average_biomass,
      avg(d.biomass_density) as biomass_density
    from cur d
    group by d.system_id
  ),
  prev_metrics as (
    select
      d.system_id,
      case when sum(coalesce(d.biomass_last_sampling, 0)) > 0
        then sum(coalesce(d.feeding_rate, 0) * coalesce(d.biomass_last_sampling, 0))
          / nullif(sum(coalesce(d.biomass_last_sampling, 0)), 0)
        else avg(d.feeding_rate)
      end as feeding_rate,
      case when sum(coalesce(d.number_of_fish, 0)) > 0
        then sum(coalesce(d.mortality_rate, 0) * coalesce(d.number_of_fish, 0))
          / nullif(sum(coalesce(d.number_of_fish, 0)), 0)
        else avg(d.mortality_rate)
      end as mortality_rate,
      avg(d.biomass_last_sampling) as average_biomass,
      avg(d.biomass_density) as biomass_density
    from prev d
    group by d.system_id
  ),
  cur_efcr as (
    select
      ps.system_id,
      sum(coalesce(ps.total_feed_amount_period, 0)) as feed_sum,
      sum(
        coalesce(ps.biomass_increase_period, 0)
        + coalesce(ps.total_weight_transfer_out, 0)
        - coalesce(ps.total_weight_transfer_in, 0)
        + coalesce(ps.total_weight_harvested, 0)
        - coalesce(ps.total_weight_stocked, 0)
      ) as denominator
    from analytics.production_summary ps
    join sys on sys.system_id = ps.system_id
    where ps.date between v_start and v_end
    group by ps.system_id
  ),
  prev_efcr as (
    select
      ps.system_id,
      sum(coalesce(ps.total_feed_amount_period, 0)) as feed_sum,
      sum(
        coalesce(ps.biomass_increase_period, 0)
        + coalesce(ps.total_weight_transfer_out, 0)
        - coalesce(ps.total_weight_transfer_in, 0)
        + coalesce(ps.total_weight_harvested, 0)
        - coalesce(ps.total_weight_stocked, 0)
      ) as denominator
    from analytics.production_summary ps
    join sys on sys.system_id = ps.system_id
    where ps.date between v_prev_start and v_prev_end
    group by ps.system_id
  ),
  cur_sampling_efcr as (
    select distinct on (s.system_id)
      s.system_id,
      ev.efcr_period_last_sampling::double precision as efcr
    from sys s
    left join analytics.efcr_period_last_sampling_view ev
      on ev.system_id = s.system_id
      and ev.inventory_date <= v_end
      and ev.efcr_period_last_sampling is not null
    order by s.system_id, ev.inventory_date desc
  ),
  prev_sampling_efcr as (
    select distinct on (s.system_id)
      s.system_id,
      ev.efcr_period_last_sampling::double precision as efcr
    from sys s
    left join analytics.efcr_period_last_sampling_view ev
      on ev.system_id = s.system_id
      and ev.inventory_date <= v_prev_end
      and ev.efcr_period_last_sampling is not null
    order by s.system_id, ev.inventory_date desc
  ),
  cur_wq as (
    select s.system_id, avg(dwr.rating_numeric::numeric) as wq_num
    from sys s
    left join public.daily_water_quality_rating dwr
      on dwr.system_id = s.system_id
      and dwr.rating_date between v_start and v_end
    group by s.system_id
  ),
  prev_wq as (
    select s.system_id, avg(dwr.rating_numeric::numeric) as wq_num
    from sys s
    left join public.daily_water_quality_rating dwr
      on dwr.system_id = s.system_id
      and dwr.rating_date between v_prev_start and v_prev_end
    group by s.system_id
  ),
  cur_abw as (
    select
      s.system_id,
      (
        select d.abw_last_sampling
        from analytics.daily_system_facts d
        where d.system_id = s.system_id
          and d.inventory_date <= v_end
          and d.abw_last_sampling is not null
        order by d.inventory_date desc
        limit 1
      ) as abw_asof_end
    from sys s
  ),
  prev_abw as (
    select
      s.system_id,
      (
        select d.abw_last_sampling
        from analytics.daily_system_facts d
        where d.system_id = s.system_id
          and d.inventory_date <= v_prev_end
          and d.abw_last_sampling is not null
        order by d.inventory_date desc
        limit 1
      ) as abw_asof_end
    from sys s
  ),
  resolved as (
    select
      s.system_id,
      case
        when ce.denominator is null or ce.denominator <= 0 then cse.efcr
        else (ce.feed_sum::double precision / ce.denominator::double precision)
      end as cur_efcr,
      case
        when pe.denominator is null or pe.denominator <= 0 then pse.efcr
        else (pe.feed_sum::double precision / pe.denominator::double precision)
      end as prev_efcr
    from sys s
    left join cur_efcr ce on ce.system_id = s.system_id
    left join prev_efcr pe on pe.system_id = s.system_id
    left join cur_sampling_efcr cse on cse.system_id = s.system_id
    left join prev_sampling_efcr pse on pse.system_id = s.system_id
  )
  select
    s.system_id,
    v_start as input_start_date,
    v_end as input_end_date,
    coalesce(p_time_period, v_tp::text) as time_period,
    cm.mortality_rate::double precision,
    cm.feeding_rate::double precision,
    cm.average_biomass::double precision,
    cm.biomass_density::double precision,
    r.cur_efcr::double precision as efcr_period_consolidated,
    cwq.wq_num::numeric as water_quality_rating_numeric_average,
    case
      when cwq.wq_num is null then null::text
      else public.water_quality_rating_label(cwq.wq_num)
    end as water_quality_rating_average,
    (r.cur_efcr::numeric - r.prev_efcr::numeric) as efcr_period_consolidated_delta,
    (cm.mortality_rate::numeric - pm.mortality_rate::numeric) as mortality_rate_delta,
    (cm.average_biomass::numeric - pm.average_biomass::numeric) as average_biomass_delta,
    (cm.biomass_density::numeric - pm.biomass_density::numeric) as biomass_density_delta,
    (cm.feeding_rate::numeric - pm.feeding_rate::numeric) as feeding_rate_delta,
    cabw.abw_asof_end::double precision as abw_asof_end,
    (cabw.abw_asof_end::numeric - pabw.abw_asof_end::numeric) as abw_asof_end_delta,
    (cwq.wq_num - pwq.wq_num) as water_quality_rating_numeric_delta
  from sys s
  left join cur_metrics cm on cm.system_id = s.system_id
  left join prev_metrics pm on pm.system_id = s.system_id
  left join resolved r on r.system_id = s.system_id
  left join cur_wq cwq on cwq.system_id = s.system_id
  left join prev_wq pwq on pwq.system_id = s.system_id
  left join cur_abw cabw on cabw.system_id = s.system_id
  left join prev_abw pabw on pabw.system_id = s.system_id
  order by
    case when p_order_desc then s.system_id end desc nulls last,
    case when not p_order_desc then s.system_id end asc nulls last
  limit private.clamp_rpc_limit(p_limit, 1000, 10000);
end;
$$;


ALTER FUNCTION "public"."api_dashboard_consolidated"("p_farm_id" "uuid", "p_system_id" bigint, "p_stage" "public"."system_growth_stage", "p_start_date" "date", "p_end_date" "date", "p_time_period" "text", "p_limit" integer, "p_order_desc" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."api_dashboard_consolidated"("p_farm_id" "uuid", "p_system_id" bigint, "p_stage" "public"."system_growth_stage", "p_start_date" "date", "p_end_date" "date", "p_time_period" "text", "p_limit" integer, "p_order_desc" boolean) IS 'Intentional app-facing SECURITY DEFINER RPC. Direct access to internal read models is revoked; callers must be authenticated and function body must enforce farm membership/scope checks. Core analytics are sourced from analytics.daily_system_facts and analytics.production_summary; eFCR falls back to latest sampling eFCR as-of the selected end date.';



CREATE OR REPLACE FUNCTION "public"."api_dashboard_systems"("p_farm_id" "uuid", "p_stage" "public"."system_growth_stage" DEFAULT NULL::"public"."system_growth_stage", "p_system_id" bigint DEFAULT NULL::bigint, "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("system_id" bigint, "system_name" "text", "growth_stage" "public"."system_growth_stage", "input_start_date" "date", "input_end_date" "date", "as_of_date" "date", "fish_end" double precision, "biomass_end" double precision, "sampling_end_date" "date", "sample_age_days" integer, "efcr" double precision, "efcr_date" "date", "feed_total" double precision, "abw" double precision, "abw_delta" double precision, "abw_trend" "text", "feeding_rate" double precision, "mortality_rate" double precision, "biomass_density" double precision, "missing_days_count" integer, "water_quality_rating_average" "text", "water_quality_rating_numeric_average" double precision, "water_quality_latest_date" "date", "worst_parameter" "text", "worst_parameter_value" double precision, "worst_parameter_unit" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
  with
  perm as (select private.app_rpc_scope_ok(p_farm_id, p_system_id, null, p_start_date, p_end_date) as ok),
  sys as (
    select s.id as system_id, s.name as system_name, s.growth_stage
    from public.system s, perm
    where perm.ok and s.farm_id = p_farm_id
      and coalesce(s.is_active, true) = true
      and coalesce(s.cage_status, 'occupied'::public.cage_status_enum) <> 'retired'::public.cage_status_enum
      and (p_stage is null or s.growth_stage = p_stage)
      and (p_system_id is null or s.id = p_system_id)
  ),
  inv as (
    select dfi.*
    from analytics.daily_system_facts dfi
    join sys on sys.system_id = dfi.system_id
    where (p_start_date is null or dfi.inventory_date >= p_start_date)
      and (p_end_date   is null or dfi.inventory_date <= p_end_date)
  ),
  snap as (
    select distinct on (system_id)
      system_id, inventory_date as as_of_date,
      number_of_fish as fish_end,
      biomass_last_sampling as biomass_end,
      abw_last_sampling as abw,
      last_sampling_date as sampling_end_date,
      biomass_density
    from inv
    order by system_id, inventory_date desc
  ),
  abw_ranked as (
    select
      dfi.system_id,
      dfi.abw_last_sampling as abw,
      row_number() over (
        partition by dfi.system_id
        order by dfi.last_sampling_date desc nulls last, dfi.inventory_date desc
      ) as rn
    from inv dfi
    where dfi.abw_last_sampling is not null
      and dfi.last_sampling_date is not null
  ),
  abw_delta as (
    select
      cur.system_id,
      (cur.abw - prev.abw)::double precision as abw_delta,
      case
        when prev.abw is null or cur.abw is null or cur.abw = prev.abw then 'flat'
        when cur.abw > prev.abw then 'up'
        else 'down'
      end as abw_trend
    from abw_ranked cur
    left join abw_ranked prev on prev.system_id = cur.system_id and prev.rn = 2
    where cur.rn = 1
  ),
  base as (
    select sys.system_id, sys.system_name, sys.growth_stage,
      coalesce(snap.as_of_date, p_end_date) as input_end_date,
      case
        when coalesce(snap.as_of_date, p_end_date) is null then p_start_date
        when p_start_date is null then coalesce(snap.as_of_date, p_end_date)
        when p_start_date > coalesce(snap.as_of_date, p_end_date) then coalesce(snap.as_of_date, p_end_date)
        else p_start_date
      end as input_start_date,
      snap.fish_end, snap.biomass_end, snap.sampling_end_date,
      snap.abw, snap.biomass_density
    from sys left join snap on snap.system_id = sys.system_id
  ),
  inv_window as (
    select i.* from inv i
    join base b on b.system_id = i.system_id
    where b.input_start_date is not null and b.input_end_date is not null
      and i.inventory_date between b.input_start_date and b.input_end_date
  ),
  inv_agg as (
    select system_id,
      case when sum(coalesce(biomass_last_sampling,0)) > 0
        then sum(coalesce(feeding_rate,0) * coalesce(biomass_last_sampling,0)) / sum(coalesce(biomass_last_sampling,0))
        else avg(feeding_rate) end as feeding_rate,
      case when sum(coalesce(number_of_fish,0)) > 0
        then sum(coalesce(mortality_rate,0) * coalesce(number_of_fish,0)) / sum(coalesce(number_of_fish,0))
        else avg(mortality_rate) end as mortality_rate,
      count(distinct inventory_date)::int as days_present
    from inv_window group by system_id
  ),
  ps_window as (
    select ps.* from analytics.production_summary ps
    join base b on b.system_id = ps.system_id
    join sys on sys.system_id = ps.system_id
    where b.input_start_date is not null and b.input_end_date is not null
      and ps.date between b.input_start_date and b.input_end_date
      and ps.date <= b.input_end_date
  ),
  ps_feed as (
    select system_id, sum(coalesce(total_feed_amount_period,0)) as feed_total
    from ps_window group by system_id
  ),
  ps_latest as (
    select distinct on (system_id)
      system_id, date as efcr_date, coalesce(efcr_period, efcr_aggregated) as efcr
    from ps_window
    where efcr_period is not null or efcr_aggregated is not null
    order by system_id, date desc
  ),
  efcr_sampling as (
    select distinct on (b.system_id)
      b.system_id,
      ev.inventory_date as efcr_date,
      ev.efcr_period_last_sampling::double precision as efcr
    from base b
    left join analytics.efcr_period_last_sampling_view ev
      on ev.system_id = b.system_id
      and ev.inventory_date <= b.input_end_date
      and ev.efcr_period_last_sampling is not null
    order by b.system_id, ev.inventory_date desc
  ),
  sampling_latest as (
    select distinct on (b.system_id)
      b.system_id,
      fsw.date as sampling_end_date
    from base b
    left join public.fish_sampling_weight fsw
      on fsw.system_id = b.system_id
      and fsw.date <= b.input_end_date
    order by b.system_id, fsw.date desc
  ),
  wq_window as (
    select wq.* from public.daily_water_quality_rating wq
    join base b on b.system_id = wq.system_id
    join sys on sys.system_id = wq.system_id
    where b.input_start_date is not null and b.input_end_date is not null
      and wq.rating_date between b.input_start_date and b.input_end_date
      and wq.rating_date <= b.input_end_date
  ),
  wq_avg as (
    select system_id,
      avg(rating_numeric::double precision) as rating_numeric_avg,
      public.water_quality_rating_label(avg(rating_numeric::numeric)) as rating_label_avg
    from wq_window group by system_id
  ),
  wq_latest as (
    select distinct on (system_id)
      system_id, rating_date as latest_date,
      worst_parameter::text, worst_parameter_value::double precision,
      worst_parameter_unit::text
    from wq_window order by system_id, rating_date desc, created_at desc, id desc
  )
  select b.system_id, b.system_name, b.growth_stage,
    b.input_start_date, b.input_end_date, b.input_end_date as as_of_date,
    b.fish_end, b.biomass_end, coalesce(sl.sampling_end_date, b.sampling_end_date) as sampling_end_date,
    case when coalesce(sl.sampling_end_date, b.sampling_end_date) is null or b.input_end_date is null then null
      else (b.input_end_date - coalesce(sl.sampling_end_date, b.sampling_end_date))::int end as sample_age_days,
    coalesce(pl.efcr, es.efcr) as efcr, coalesce(pl.efcr_date, es.efcr_date) as efcr_date, pf.feed_total, b.abw, ad.abw_delta, coalesce(ad.abw_trend, 'flat') as abw_trend,
    ia.feeding_rate, ia.mortality_rate, b.biomass_density,
    case when b.input_start_date is null or b.input_end_date is null then null
      else greatest(0, (b.input_end_date - b.input_start_date + 1)::int - coalesce(ia.days_present, 0))
    end as missing_days_count,
    wa.rating_label_avg as water_quality_rating_average,
    wa.rating_numeric_avg as water_quality_rating_numeric_average,
    wl.latest_date as water_quality_latest_date,
    wl.worst_parameter, wl.worst_parameter_value, wl.worst_parameter_unit
  from base b
  left join inv_agg ia on ia.system_id = b.system_id
  left join ps_feed pf on pf.system_id = b.system_id
  left join ps_latest pl on pl.system_id = b.system_id
  left join efcr_sampling es on es.system_id = b.system_id
  left join sampling_latest sl on sl.system_id = b.system_id
  left join abw_delta ad on ad.system_id = b.system_id
  left join wq_avg wa on wa.system_id = b.system_id
  left join wq_latest wl on wl.system_id = b.system_id
  order by b.system_name;
$$;


ALTER FUNCTION "public"."api_dashboard_systems"("p_farm_id" "uuid", "p_stage" "public"."system_growth_stage", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_efcr_trend"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint, "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("system_id" bigint, "farm_id" "uuid", "inventory_date" "date", "last_sampling_date" "date", "efcr_period_last_sampling" numeric, "biomass_last_sampling" numeric, "biomass_efcr_multiple" numeric, "system_name" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
  select ev.system_id, ev.farm_id, ev.inventory_date, ev.last_sampling_date,
    ev.efcr_period_last_sampling, ev.biomass_last_sampling::numeric,
    ev.biomass_efcr_multiple::numeric, sys.name as system_name
  from analytics.efcr_period_last_sampling_view ev
  join public.system sys on sys.id = ev.system_id
  where sys.farm_id = p_farm_id and private.app_rpc_scope_ok(p_farm_id, p_system_id, null, p_start_date, p_end_date)
    and (p_system_id is null or ev.system_id = p_system_id)
    and (p_start_date is null or ev.inventory_date >= p_start_date)
    and (p_end_date is null or ev.inventory_date <= p_end_date);
$$;


ALTER FUNCTION "public"."api_efcr_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."api_efcr_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") IS 'Intentional app-facing SECURITY DEFINER RPC. Direct access to internal read models is revoked; callers must be authenticated and function body must enforce farm membership/scope checks.';



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


CREATE OR REPLACE FUNCTION "public"."api_fcr_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_days" integer DEFAULT 180) RETURNS TABLE("period_start" "date", "period_end" "date", "total_feed_kg" numeric, "weight_gain_kg" numeric, "fcr" numeric, "abw_end_g" numeric, "days_interval" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select ft.*
  from public.get_fcr_trend(
    p_farm_id,
    p_system_id,
    greatest(1, least(coalesce(p_days, 180), 3650))
  ) ft
  where private.app_rpc_scope_ok(p_farm_id, p_system_id, null::bigint, null::date, null::date);
$$;


ALTER FUNCTION "public"."api_fcr_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_feed_demand_forecast"("p_farm_id" "uuid", "p_days_ahead" integer DEFAULT 14) RETURNS TABLE("feed_type_id" bigint, "feed_line" "text", "feed_category" "text", "feed_pellet_size" "text", "avg_daily_kg" double precision, "forecast_7d_kg" double precision, "forecast_total_kg" double precision, "current_stock_kg" numeric, "days_of_stock" double precision, "stock_status" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
declare
  v_ref_start date := current_date - 14;
  v_ref_end date := current_date - 1;
begin
  if not private.is_farm_member(p_farm_id) then
    return;
  end if;

  perform private.assert_rpc_parameters(
    p_farm_id := p_farm_id,
    p_system_id := null,
    p_batch_id := null,
    p_start_date := null,
    p_end_date := null
  );

  return query
  with farm_feed_types as (
    select distinct fi.feed_type_id
    from public.feed_inventory fi
    where fi.farm_id = p_farm_id

    union

    select distinct fr.feed_type_id
    from public.feeding_record fr
    join public.system s on s.id = fr.system_id
    where s.farm_id = p_farm_id
      and fr.feed_type_id is not null
  ),
  recent_feeding as (
    select
      fr.feed_type_id,
      sum(fr.feeding_amount)::double precision / greatest(count(distinct fr.date), 1) as avg_daily_kg
    from public.feeding_record fr
    join public.system s on s.id = fr.system_id
    where s.farm_id = p_farm_id
      and fr.feed_type_id is not null
      and fr.date between v_ref_start and v_ref_end
    group by fr.feed_type_id
  ),
  latest_inventory_date as (
    select max(fi.inventory_date) as inventory_date
    from public.feed_inventory fi
    where fi.farm_id = p_farm_id
      and fi.inventory_date <= current_date
  ),
  latest_snapshot as (
    select distinct on (fi.feed_type_id)
      fi.feed_type_id,
      public.feed_inventory_snapshot_kg(fi.bag_weight, fi.amount_of_bags, fi.opened_bags) as stock_kg
    from public.feed_inventory fi
    join latest_inventory_date lid on lid.inventory_date = fi.inventory_date
    where fi.farm_id = p_farm_id
    order by fi.feed_type_id, fi.inventory_date desc, fi.inventory_time desc nulls last, fi.id desc
  )
  select
    ft.id as feed_type_id,
    ft.feed_line,
    ft.feed_category::text,
    ft.feed_pellet_size::text,
    coalesce(rf.avg_daily_kg, 0)::double precision as avg_daily_kg,
    (coalesce(rf.avg_daily_kg, 0) * least(7, p_days_ahead))::double precision as forecast_7d_kg,
    (coalesce(rf.avg_daily_kg, 0) * p_days_ahead)::double precision as forecast_total_kg,
    coalesce(ls.stock_kg, 0) as current_stock_kg,
    case
      when rf.avg_daily_kg > 0 then coalesce(ls.stock_kg, 0)::double precision / rf.avg_daily_kg
      else null
    end as days_of_stock,
    case
      when rf.avg_daily_kg is null or rf.avg_daily_kg = 0 then 'unknown'
      when coalesce(ls.stock_kg, 0) = 0 then 'critical'
      when coalesce(ls.stock_kg, 0)::double precision / rf.avg_daily_kg <= 7 then 'critical'
      when coalesce(ls.stock_kg, 0)::double precision / rf.avg_daily_kg <= 14 then 'low'
      else 'ok'
    end as stock_status
  from farm_feed_types fft
  join public.feed_type ft on ft.id = fft.feed_type_id
  left join recent_feeding rf on rf.feed_type_id = ft.id
  left join latest_snapshot ls on ls.feed_type_id = ft.id
  where coalesce(ft.is_active, true)
    and (coalesce(rf.avg_daily_kg, 0) > 0
     or coalesce(ls.stock_kg, 0) > 0
    )
  order by coalesce(rf.avg_daily_kg, 0) desc, ft.id;
end;
$$;


ALTER FUNCTION "public"."api_feed_demand_forecast"("p_farm_id" "uuid", "p_days_ahead" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."api_feed_demand_forecast"("p_farm_id" "uuid", "p_days_ahead" integer) IS 'Intentional app-facing SECURITY DEFINER RPC. Direct access to internal read models is revoked; callers must be authenticated and function body must enforce farm membership/scope checks.';



CREATE OR REPLACE FUNCTION "public"."api_feed_fcr_intervals"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint, "p_date_from" "date" DEFAULT NULL::"date", "p_date_to" "date" DEFAULT NULL::"date") RETURNS TABLE("system_id" bigint, "system_name" "text", "interval_start" "date", "interval_end" "date", "interval_days" integer, "abw_start_g" double precision, "abw_end_g" double precision, "live_fish" integer, "total_feed_kg" double precision, "weight_gain_kg" double precision, "fcr" double precision, "sgr_pct_per_day" double precision, "dominant_feed_type" "text", "warning" "text")
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
    p_start_date := p_date_from,
    p_end_date := p_date_to
  );

  return query
  with sys as (
    select s.id as system_id, s.name as system_name
    from public.system s
    where s.farm_id = p_farm_id
      and (p_system_id is null or s.id = p_system_id)
  ),
  samples as (
    select
      ps.system_id,
      ps.cycle_id,
      ps.system_name,
      ps.date as sample_date,
      ps.average_body_weight::double precision as abw_g
    from analytics.production_summary ps
    join sys on sys.system_id = ps.system_id
    where ps.activity = 'sampling'
      and ps.average_body_weight is not null
      and ps.average_body_weight > 0
  ),
  intervals as (
    select
      sm.system_id,
      sm.system_name,
      lag(sm.sample_date) over sample_window as interval_start,
      sm.sample_date as interval_end,
      (sm.sample_date - lag(sm.sample_date) over sample_window)::integer as interval_days,
      lag(sm.abw_g) over sample_window as abw_start_g,
      sm.abw_g as abw_end_g
    from samples sm
    window sample_window as (partition by sm.system_id, sm.cycle_id order by sm.sample_date)
  ),
  complete_intervals as (
    select iv.*
    from intervals iv
    where iv.interval_start is not null
      and iv.interval_days > 0
  ),
  overlapping_intervals as (
    select ci.*
    from complete_intervals ci
    where (p_date_from is null or ci.interval_end >= p_date_from)
      and (p_date_to is null or ci.interval_start <= p_date_to)
  ),
  latest_asof_intervals as (
    select distinct on (ci.system_id) ci.*
    from complete_intervals ci
    where p_date_to is not null
      and ci.interval_end <= p_date_to
      and not exists (
        select 1
        from overlapping_intervals oi
        where oi.system_id = ci.system_id
      )
    order by ci.system_id, ci.interval_end desc
  ),
  valid_intervals as (
    select * from overlapping_intervals
    union all
    select * from latest_asof_intervals
  ),
  facts as (
    select d.*
    from analytics.daily_system_facts d
    join sys on sys.system_id = d.system_id
  ),
  interval_facts as (
    select
      vi.system_id,
      vi.interval_start,
      vi.interval_end,
      coalesce(sum(d.feeding_amount), 0)::double precision as total_feed_kg
    from valid_intervals vi
    left join facts d
      on d.system_id = vi.system_id
      and d.inventory_date > vi.interval_start
      and d.inventory_date <= vi.interval_end
    group by vi.system_id, vi.interval_start, vi.interval_end
  ),
  fish_start as (
    select distinct on (vi.system_id, vi.interval_start, vi.interval_end)
      vi.system_id,
      vi.interval_start,
      vi.interval_end,
      d.number_of_fish::integer as fish_start
    from valid_intervals vi
    left join facts d
      on d.system_id = vi.system_id
      and d.inventory_date <= vi.interval_start
      and d.number_of_fish is not null
    order by vi.system_id, vi.interval_start, vi.interval_end, d.inventory_date desc
  ),
  fish_end as (
    select distinct on (vi.system_id, vi.interval_start, vi.interval_end)
      vi.system_id,
      vi.interval_start,
      vi.interval_end,
      d.number_of_fish::integer as fish_end
    from valid_intervals vi
    left join facts d
      on d.system_id = vi.system_id
      and d.inventory_date <= vi.interval_end
      and d.number_of_fish is not null
    order by vi.system_id, vi.interval_start, vi.interval_end, d.inventory_date desc
  ),
  scored as (
    select
      vi.system_id,
      vi.system_name,
      vi.interval_start,
      vi.interval_end,
      vi.interval_days,
      vi.abw_start_g,
      vi.abw_end_g,
      coalesce(fe.fish_end, 0) as live_fish,
      coalesce(ifc.total_feed_kg, 0) as total_feed_kg,
      case
        when fe.fish_end > 0 and fs.fish_start > 0
          and (vi.abw_end_g * fe.fish_end - vi.abw_start_g * fs.fish_start) > 0
        then (vi.abw_end_g * fe.fish_end - vi.abw_start_g * fs.fish_start) / 1000.0
        when fe.fish_end > 0 and vi.abw_end_g > vi.abw_start_g
        then ((vi.abw_end_g - vi.abw_start_g) * fe.fish_end) / 1000.0
        else null::double precision
      end as weight_gain_kg,
      case
        when vi.interval_days > 0 and vi.abw_end_g > 0 and vi.abw_start_g > 0
        then 100.0 * (ln(vi.abw_end_g) - ln(vi.abw_start_g)) / vi.interval_days
        else null::double precision
      end as sgr_pct_per_day
    from valid_intervals vi
    left join interval_facts ifc
      on ifc.system_id = vi.system_id
      and ifc.interval_start = vi.interval_start
      and ifc.interval_end = vi.interval_end
    left join fish_start fs
      on fs.system_id = vi.system_id
      and fs.interval_start = vi.interval_start
      and fs.interval_end = vi.interval_end
    left join fish_end fe
      on fe.system_id = vi.system_id
      and fe.interval_start = vi.interval_start
      and fe.interval_end = vi.interval_end
  )
  select
    sc.system_id,
    sc.system_name,
    sc.interval_start,
    sc.interval_end,
    sc.interval_days,
    sc.abw_start_g,
    sc.abw_end_g,
    sc.live_fish::integer,
    sc.total_feed_kg,
    sc.weight_gain_kg,
    case
      when sc.total_feed_kg > 0 and sc.weight_gain_kg > 0
      then sc.total_feed_kg / sc.weight_gain_kg
      else null::double precision
    end as fcr,
    sc.sgr_pct_per_day,
    null::text as dominant_feed_type,
    case
      when sc.interval_days > 60 then 'Interval > 60 days: sample data may be missing'
      when sc.total_feed_kg = 0 then 'No feeding facts in this interval'
      when sc.abw_end_g <= sc.abw_start_g then 'No positive growth in this interval'
      else null::text
    end as warning
  from scored sc
  order by sc.system_id, sc.interval_start;
end;
$$;


ALTER FUNCTION "public"."api_feed_fcr_intervals"("p_farm_id" "uuid", "p_system_id" bigint, "p_date_from" "date", "p_date_to" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."api_feed_fcr_intervals"("p_farm_id" "uuid", "p_system_id" bigint, "p_date_from" "date", "p_date_to" "date") IS 'Intentional app-facing SECURITY DEFINER RPC. Direct access to internal read models is revoked; callers must be authenticated and function body must enforce farm membership/scope checks. Sampling intervals and feed/FCR metrics are sourced from canonical analytics objects; if a selected window has no interval, the latest completed interval as-of the end date is returned.';



CREATE OR REPLACE FUNCTION "public"."api_feed_rate_analysis"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint, "p_date_from" "date" DEFAULT NULL::"date", "p_date_to" "date" DEFAULT NULL::"date") RETURNS TABLE("system_id" bigint, "system_name" "text", "feed_date" "date", "feed_kg" double precision, "biomass_kg" double precision, "abw_g" double precision, "live_fish" integer, "feed_rate_pct" double precision, "lower_band_pct" double precision, "upper_band_pct" double precision, "pellet_size" "text", "status" "text", "detail" "text")
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
    p_start_date := p_date_from,
    p_end_date := p_date_to
  );


  RETURN QUERY
  WITH pellet_guide (min_abw_g, max_abw_g, pellet, lower_pct, upper_pct) AS (
    VALUES
      (0.0::double precision, 1.0::double precision, 'Crumble / powder'::text, 15.0::double precision, 20.0::double precision),
      (1.0::double precision, 10.0::double precision, '1.0-1.5 mm'::text, 8.0::double precision, 15.0::double precision),
      (10.0::double precision, 50.0::double precision, '2.0 mm'::text, 5.0::double precision, 8.0::double precision),
      (50.0::double precision, 200.0::double precision, '3.0 mm'::text, 3.0::double precision, 5.0::double precision),
      (200.0::double precision, NULL::double precision, '4-6 mm'::text, 2.0::double precision, 3.0::double precision)
  ),
  daily_feed AS (
    SELECT
      fr.system_id,
      fr.date AS feed_date,
      SUM(fr.feeding_amount)::double precision AS feed_kg
    FROM public.feeding_record fr
    JOIN public.system s ON s.id = fr.system_id
    WHERE s.farm_id = p_farm_id
      AND (p_system_id IS NULL OR fr.system_id = p_system_id)
      AND (p_date_from IS NULL OR fr.date >= p_date_from)
      AND (p_date_to IS NULL OR fr.date <= p_date_to)
    GROUP BY fr.system_id, fr.date
  ),
  inv AS (
    SELECT
      dfit.system_id,
      dfit.inventory_date,
      NULLIF(dfit.biomass_last_sampling, 0)::double precision AS biomass_kg,
      NULLIF(dfit.abw_last_sampling, 0)::double precision AS abw_g,
      dfit.number_of_fish::integer AS live_fish
    FROM analytics.daily_system_facts dfit
    JOIN public.system s ON s.id = dfit.system_id
    WHERE s.farm_id = p_farm_id
      AND (p_system_id IS NULL OR dfit.system_id = p_system_id)
      AND (p_date_from IS NULL OR dfit.inventory_date >= p_date_from)
      AND (p_date_to IS NULL OR dfit.inventory_date <= p_date_to)
  )
  SELECT
    s.id AS system_id,
    s.name AS system_name,
    df.feed_date,
    df.feed_kg,
    inv.biomass_kg,
    inv.abw_g,
    inv.live_fish,
    CASE
      WHEN inv.biomass_kg > 0 THEN ((df.feed_kg / inv.biomass_kg) * 100.0)::double precision
      ELSE NULL
    END AS feed_rate_pct,
    pg.lower_pct::double precision AS lower_band_pct,
    pg.upper_pct::double precision AS upper_band_pct,
    pg.pellet AS pellet_size,
    CASE
      WHEN inv.biomass_kg IS NULL OR inv.abw_g IS NULL THEN 'missing'
      WHEN pg.lower_pct IS NULL THEN 'no_target'
      WHEN (df.feed_kg / inv.biomass_kg) * 100.0 > pg.upper_pct THEN 'above'
      WHEN (df.feed_kg / inv.biomass_kg) * 100.0 < pg.lower_pct THEN 'below'
      ELSE 'in_target'
    END AS status,
    CASE
      WHEN inv.biomass_kg IS NULL OR inv.abw_g IS NULL THEN 'No inventory data for this date'
      WHEN pg.lower_pct IS NULL THEN 'ABW outside pellet guide range'
      WHEN (df.feed_kg / inv.biomass_kg) * 100.0 > pg.upper_pct
        THEN concat(
          round(((df.feed_kg / inv.biomass_kg) * 100.0)::numeric, 1),
          ' % BW/day (target max ',
          round(pg.upper_pct::numeric, 1),
          ' %)'
        )
      WHEN (df.feed_kg / inv.biomass_kg) * 100.0 < pg.lower_pct
        THEN concat(
          round(((df.feed_kg / inv.biomass_kg) * 100.0)::numeric, 1),
          ' % BW/day (target min ',
          round(pg.lower_pct::numeric, 1),
          ' %)'
        )
      ELSE concat(
        round(((df.feed_kg / inv.biomass_kg) * 100.0)::numeric, 1),
        ' % BW/day - within band ',
        round(pg.lower_pct::numeric, 1),
        '-',
        round(pg.upper_pct::numeric, 1),
        ' %'
      )
    END AS detail
  FROM daily_feed df
  JOIN public.system s ON s.id = df.system_id
  LEFT JOIN inv ON inv.system_id = df.system_id AND inv.inventory_date = df.feed_date
  LEFT JOIN pellet_guide pg ON inv.abw_g >= pg.min_abw_g AND (pg.max_abw_g IS NULL OR inv.abw_g < pg.max_abw_g)
  ORDER BY df.system_id, df.feed_date;
END;
$$;


ALTER FUNCTION "public"."api_feed_rate_analysis"("p_farm_id" "uuid", "p_system_id" bigint, "p_date_from" "date", "p_date_to" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."api_feed_rate_analysis"("p_farm_id" "uuid", "p_system_id" bigint, "p_date_from" "date", "p_date_to" "date") IS 'Intentional app-facing SECURITY DEFINER RPC. Direct access to internal read models is revoked; callers must be authenticated and function body must enforce farm membership/scope checks.';



CREATE OR REPLACE FUNCTION "public"."api_feed_type_options_rpc"() RETURNS TABLE("id" bigint, "farm_id" "uuid", "feed_line" "text", "label" "text", "feed_category" "text", "feed_pellet_size" "text", "crude_protein_percentage" numeric, "crude_fat_percentage" numeric, "visibility_scope" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ SELECT ft.id, ft.farm_id, ft.feed_line, trim(both from concat_ws(' ', fs.company_name::text, ft.feed_line, ft.feed_category, ft.feed_pellet_size, case when ft.crude_protein_percentage is not null then 'CP ' || ft.crude_protein_percentage::text || '%' else null end, case when ft.crude_fat_percentage is not null then 'F ' || ft.crude_fat_percentage::text || '%' else null end)) as label, ft.feed_category::text, ft.feed_pellet_size::text, ft.crude_protein_percentage::numeric, ft.crude_fat_percentage::numeric, case when ft.farm_id is null then 'shared_catalog' else 'farm' end as visibility_scope FROM public.feed_type ft LEFT JOIN public.feed_supplier fs ON fs.id = ft.feed_supplier WHERE (SELECT auth.uid()) IS NOT NULL AND ft.is_active = true AND (ft.farm_id IS NULL OR private.is_farm_member(ft.farm_id)) ORDER BY case when ft.farm_id is null then 1 else 0 end, ft.feed_line, ft.feed_pellet_size::text; $$;


ALTER FUNCTION "public"."api_feed_type_options_rpc"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."api_feed_type_options_rpc"() IS 'Intentional app-facing SECURITY DEFINER RPC. Direct access to internal read models is revoked; callers must be authenticated and function body must enforce farm membership/scope checks.';



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
  left join public.feed_supplier fs on fs.id = ft.feed_supplier
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



CREATE OR REPLACE FUNCTION "public"."api_fingerling_batch_options_rpc"("p_farm_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" bigint, "farm_id" "uuid", "system_id" bigint, "label" "text", "date_of_delivery" "date", "abw" numeric, "number_of_fish" numeric, "supplier_id" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
select
  fb.id,
  fb.farm_id,
  fb.system_id,
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
order by fb.date_of_delivery desc nulls last;
$$;


ALTER FUNCTION "public"."api_fingerling_batch_options_rpc"("p_farm_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_growth_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_days" integer DEFAULT 180) RETURNS TABLE("sample_date" "date", "abw_g" numeric, "prev_abw_g" numeric, "weight_gain_g" numeric, "adg_g_day" numeric, "sgr_pct_day" numeric, "days_interval" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select gt.*
  from public.get_growth_trend(
    p_system_id,
    greatest(1, least(coalesce(p_days, 180), 3650))
  ) gt
  where private.app_rpc_scope_ok(p_farm_id, p_system_id, null::bigint, null::date, null::date);
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



CREATE OR REPLACE FUNCTION "public"."api_kpi_coverage"("p_farm_id" "uuid", "p_date_from" "date" DEFAULT NULL::"date", "p_date_to" "date" DEFAULT NULL::"date") RETURNS TABLE("kpi_key" "text", "systems_covered" integer, "systems_total" integer, "coverage_label" "text", "data_source" "text", "basis" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
declare
  v_total integer;
begin
  if not private.is_farm_member(p_farm_id) then
    return;
  end if;

  perform private.assert_rpc_parameters(
    p_farm_id := p_farm_id,
    p_system_id := null,
    p_batch_id := null,
    p_start_date := p_date_from,
    p_end_date := p_date_to
  );


  select count(*)::integer
  into v_total
  from public.system
  where farm_id = p_farm_id
    and is_active = true;

  return query
  with inv_window as (
    select distinct
      inv.system_id,
      (inv.abw_last_sampling is not null) as has_abw,
      (inv.biomass_last_sampling is not null) as has_biomass,
      (inv.system_volume is not null and inv.system_volume > 0) as has_volume,
      (inv.feeding_rate is not null or inv.feeding_amount is not null) as has_feeding,
      (inv.mortality_rate is not null or inv.number_of_fish_mortality is not null) as has_mortality
    from analytics.daily_system_facts inv
    join public.system s on s.id = inv.system_id
    where s.farm_id = p_farm_id
      and (p_date_from is null or inv.inventory_date >= p_date_from)
      and (p_date_to is null or inv.inventory_date <= p_date_to)
  ),
  wq_window as (
    select distinct r.system_id
    from public.daily_water_quality_rating r
    join public.system s on s.id = r.system_id
    where s.farm_id = p_farm_id
      and (p_date_from is null or r.rating_date >= p_date_from)
      and (p_date_to is null or r.rating_date <= p_date_to)
      and r.rating_numeric is not null
  ),
  prod_window as (
    select distinct ps.system_id
    from analytics.production_summary ps
    join public.system s on s.id = ps.system_id
    where s.farm_id = p_farm_id
      and (p_date_from is null or ps.date >= p_date_from)
      and (p_date_to is null or ps.date <= p_date_to)
      and (ps.total_feed_amount_period is not null or ps.biomass_increase_period is not null)
  )
  select
    k.kpi_key,
    k.covered,
    v_total,
    k.label,
    k.source,
    k.basis
  from (
    values
      (
        'efcr',
        (select count(*)::integer from prod_window),
        (select count(*) || '/' || v_total || ' system' || case when v_total = 1 then '' else 's' end from prod_window),
        'Production summary',
        'In-window conversion'
      ),
      (
        'mortality',
        (select count(*)::integer from inv_window where has_mortality),
        (select count(*) || '/' || v_total || ' system' || case when v_total = 1 then '' else 's' end from inv_window where has_mortality),
        'Inventory + production',
        'In-window rate'
      ),
      (
        'abw',
        (select count(*)::integer from inv_window where has_abw),
        (select count(*) || '/' || v_total || ' system' || case when v_total = 1 then '' else 's' end from inv_window where has_abw),
        'Sampling + inventory',
        'Latest in-window sample'
      ),
      (
        'biomass',
        (select count(*)::integer from inv_window where has_biomass),
        (select count(*) || '/' || v_total || ' system' || case when v_total = 1 then '' else 's' end from inv_window where has_biomass),
        'Inventory',
        'As-of-end biomass'
      ),
      (
        'biomass_density',
        (select count(*)::integer from inv_window where has_biomass and has_volume),
        (select count(*) || '/' || v_total || ' system' || case when v_total = 1 then '' else 's' end from inv_window where has_biomass and has_volume),
        'Inventory + volume',
        'Biomass / volume'
      ),
      (
        'feeding',
        (select count(*)::integer from inv_window where has_feeding),
        (select count(*) || '/' || v_total || ' system' || case when v_total = 1 then '' else 's' end from inv_window where has_feeding),
        'Feed records + biomass',
        '% body weight/day'
      ),
      (
        'water_quality',
        (select count(*)::integer from wq_window),
        (select count(*) || '/' || v_total || ' system' || case when v_total = 1 then '' else 's' end from wq_window),
        'Daily water ratings',
        'Average in-window rating'
      )
  ) as k(kpi_key, covered, label, source, basis);
end;
$$;


ALTER FUNCTION "public"."api_kpi_coverage"("p_farm_id" "uuid", "p_date_from" "date", "p_date_to" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."api_kpi_coverage"("p_farm_id" "uuid", "p_date_from" "date", "p_date_to" "date") IS 'Intentional app-facing SECURITY DEFINER RPC. Direct access to internal read models is revoked; callers must be authenticated and function body must enforce farm membership/scope checks.';



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


CREATE OR REPLACE FUNCTION "public"."api_production_summary"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint, "p_stage" "public"."system_growth_stage" DEFAULT NULL::"public"."system_growth_stage", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("cycle_id" integer, "date" "date", "system_id" bigint, "system_name" "text", "growth_stage" "text", "ongoing_cycle" boolean, "average_body_weight" double precision, "number_of_fish_inventory" double precision, "total_feed_amount_period" double precision, "activity" "text", "activity_rank" integer, "total_biomass" double precision, "biomass_increase_period" double precision, "total_feed_amount_aggregated" double precision, "biomass_increase_aggregated" double precision, "daily_mortality_count" double precision, "cumulative_mortality" double precision, "number_of_fish_transfer_out" double precision, "total_weight_transfer_out" double precision, "total_weight_transfer_out_aggregated" double precision, "number_of_fish_transfer_in" double precision, "total_weight_transfer_in" double precision, "total_weight_transfer_in_aggregated" double precision, "number_of_fish_harvested" double precision, "total_weight_harvested" double precision, "total_weight_harvested_aggregated" double precision, "number_of_fish_stocked" double precision, "total_weight_stocked" double precision, "total_weight_stocked_aggregated" double precision, "efcr_period" double precision, "efcr_aggregated" double precision)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
declare
  v_start date := coalesce(p_start_date, date '1900-01-01');
  v_end date := coalesce(p_end_date, current_date);
begin
  if not private.is_farm_member(p_farm_id) then
    return;
  end if;

  perform private.assert_rpc_parameters(
    p_farm_id := p_farm_id,
    p_system_id := p_system_id,
    p_batch_id := null,
    p_start_date := p_start_date,
    p_end_date := p_end_date
  );

  return query
  select
    ps.cycle_id::integer,
    ps.date,
    ps.system_id,
    ps.system_name,
    ps.growth_stage,
    ps.ongoing_cycle,
    ps.average_body_weight,
    ps.number_of_fish_inventory,
    ps.total_feed_amount_period,
    ps.activity,
    ps.activity_rank,
    ps.total_biomass,
    ps.biomass_increase_period,
    ps.total_feed_amount_aggregated,
    ps.biomass_increase_aggregated,
    ps.daily_mortality_count,
    ps.cumulative_mortality,
    ps.number_of_fish_transfer_out,
    ps.total_weight_transfer_out,
    ps.total_weight_transfer_out_aggregated,
    ps.number_of_fish_transfer_in,
    ps.total_weight_transfer_in,
    ps.total_weight_transfer_in_aggregated,
    ps.number_of_fish_harvested,
    ps.total_weight_harvested,
    ps.total_weight_harvested_aggregated,
    ps.number_of_fish_stocked,
    ps.total_weight_stocked,
    ps.total_weight_stocked_aggregated,
    ps.efcr_period,
    ps.efcr_aggregated
  from analytics.production_summary ps
  join public.system s on s.id = ps.system_id
  where s.farm_id = p_farm_id
    and (p_system_id is null or ps.system_id = p_system_id)
    and (p_stage is null or s.growth_stage = p_stage)
    and ps.date between v_start and v_end
  order by ps.system_id, ps.date, ps.activity_rank;
end;
$$;


ALTER FUNCTION "public"."api_production_summary"("p_farm_id" "uuid", "p_system_id" bigint, "p_stage" "public"."system_growth_stage", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."api_production_summary"("p_farm_id" "uuid", "p_system_id" bigint, "p_stage" "public"."system_growth_stage", "p_start_date" "date", "p_end_date" "date") IS 'Intentional app-facing SECURITY DEFINER RPC. Reads analytics.production_summary and enforces farm membership/scope checks.';



CREATE OR REPLACE FUNCTION "public"."api_recommended_actions"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint) RETURNS TABLE("system_id" bigint, "system_name" "text", "metric_name" "text", "current_value" numeric, "threshold_low" numeric, "threshold_high" numeric, "unit" "text", "severity" "text", "context_json" "jsonb")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'analytics'
    AS $$
SELECT
  wq.system_id,
  s.name AS system_name,
  'water_quality_score' AS metric_name,
  wq.rating_numeric::numeric AS current_value,
  60::numeric AS threshold_low,
  80::numeric AS threshold_high,
  'score' AS unit,
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
  f.system_id, f.system_name,
  'mortality_rate' AS metric_name,
  ROUND(f.mortality_rate::numeric, 4) AS current_value,
  NULL::numeric AS threshold_low,
  0.005::numeric AS threshold_high,
  '%/day' AS unit,
  CASE
    WHEN f.mortality_rate > 0.02  THEN 'critical'
    WHEN f.mortality_rate > 0.01  THEN 'warning'
    WHEN f.mortality_rate > 0.005 THEN 'watch'
    ELSE 'ok'
  END AS severity,
  jsonb_build_object(
    'fish_count', f.number_of_fish,
    'mortality_7d', f.number_of_fish_mortality,
    'mortality_aggregated', f.number_of_fish_mortality_aggregated,
    'fact_date', f.fact_date
  ) AS context_json
FROM (
  SELECT DISTINCT ON (c.system_id)
    c.system_id, c.system_name, c.fact_date,
    c.mortality_rate, c.number_of_fish,
    c.number_of_fish_mortality,
    c.number_of_fish_mortality_aggregated
  FROM analytics.daily_system_facts_cache c
  WHERE c.farm_id = p_farm_id
    AND (p_system_id IS NULL OR c.system_id = p_system_id)
    AND c.system_is_active = true
  ORDER BY c.system_id, c.fact_date DESC
) f
UNION ALL
SELECT
  f.system_id, f.system_name,
  'feeding_rate_pct_bw' AS metric_name,
  ROUND(f.feeding_rate::numeric, 4) AS current_value,
  0.01::numeric AS threshold_low,
  0.05::numeric AS threshold_high,
  '%BW/day' AS unit,
  CASE
    WHEN f.feeding_rate IS NULL   THEN 'no_data'
    WHEN f.feeding_rate < 0.005   THEN 'critical'
    WHEN f.feeding_rate < 0.01    THEN 'warning'
    WHEN f.feeding_rate > 0.08    THEN 'warning'
    ELSE 'ok'
  END AS severity,
  jsonb_build_object(
    'feeding_amount_kg', f.feeding_amount,
    'feeding_aggregated_kg', f.feeding_amount_aggregated,
    'biomass_kg', f.biomass_last_sampling,
    'fact_date', f.fact_date
  ) AS context_json
FROM (
  SELECT DISTINCT ON (c.system_id)
    c.system_id, c.system_name, c.fact_date,
    c.feeding_rate, c.feeding_amount,
    c.feeding_amount_aggregated, c.biomass_last_sampling
  FROM analytics.daily_system_facts_cache c
  WHERE c.farm_id = p_farm_id
    AND (p_system_id IS NULL OR c.system_id = p_system_id)
    AND c.system_is_active = true
    AND c.has_feed_record = true
  ORDER BY c.system_id, c.fact_date DESC
) f
UNION ALL
SELECT
  f.system_id, f.system_name,
  'biomass_density_kg_m3' AS metric_name,
  ROUND(f.biomass_density::numeric, 3) AS current_value,
  NULL::numeric AS threshold_low,
  15::numeric AS threshold_high,
  'kg/m3' AS unit,
  CASE
    WHEN f.biomass_density IS NULL THEN 'no_data'
    WHEN f.biomass_density > 25    THEN 'critical'
    WHEN f.biomass_density > 20    THEN 'warning'
    WHEN f.biomass_density > 15    THEN 'watch'
    ELSE 'ok'
  END AS severity,
  jsonb_build_object(
    'biomass_kg', f.biomass_last_sampling,
    'system_volume_m3', f.system_volume,
    'abw_g', f.abw_last_sampling,
    'fish_count', f.number_of_fish,
    'fact_date', f.fact_date
  ) AS context_json
FROM (
  SELECT DISTINCT ON (c.system_id)
    c.system_id, c.system_name, c.fact_date,
    c.biomass_density, c.biomass_last_sampling,
    c.system_volume, c.abw_last_sampling, c.number_of_fish
  FROM analytics.daily_system_facts_cache c
  WHERE c.farm_id = p_farm_id
    AND (p_system_id IS NULL OR c.system_id = p_system_id)
    AND c.system_is_active = true
  ORDER BY c.system_id, c.fact_date DESC
) f
UNION ALL
SELECT
  f.system_id, f.system_name,
  'average_body_weight_g' AS metric_name,
  ROUND(f.abw_last_sampling::numeric, 2) AS current_value,
  NULL::numeric AS threshold_low,
  NULL::numeric AS threshold_high,
  'g' AS unit,
  CASE
    WHEN f.abw_last_sampling IS NULL THEN 'no_data'
    ELSE 'ok'
  END AS severity,
  jsonb_build_object(
    'last_sampling_date', f.last_sampling_date,
    'growth_stage', f.growth_stage,
    'biomass_kg', f.biomass_last_sampling,
    'fish_count', f.number_of_fish,
    'fact_date', f.fact_date
  ) AS context_json
FROM (
  SELECT DISTINCT ON (c.system_id)
    c.system_id, c.system_name, c.fact_date,
    c.abw_last_sampling, c.biomass_last_sampling,
    c.last_sampling_date, c.growth_stage, c.number_of_fish
  FROM analytics.daily_system_facts_cache c
  WHERE c.farm_id = p_farm_id
    AND (p_system_id IS NULL OR c.system_id = p_system_id)
    AND c.system_is_active = true
    AND c.has_abw = true
  ORDER BY c.system_id, c.fact_date DESC
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


CREATE OR REPLACE FUNCTION "public"."api_survival_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date" DEFAULT CURRENT_DATE) RETURNS TABLE("event_date" "date", "daily_deaths" integer, "cum_deaths" integer, "stocked" integer, "live_count" integer, "survival_pct" numeric, "daily_mort_pct" numeric)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select st.*
  from public.get_survival_trend(
    p_system_id,
    p_start_date,
    coalesce(p_end_date, current_date)
  ) st
  where p_start_date is not null
    and p_start_date <= coalesce(p_end_date, current_date)
    and private.app_rpc_scope_ok(
      p_farm_id,
      p_system_id,
      null::bigint,
      p_start_date,
      coalesce(p_end_date, current_date)
    );
$$;


ALTER FUNCTION "public"."api_survival_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_system_health_score"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint) RETURNS TABLE("system_id" bigint, "system_name" "text", "health_score" numeric, "health_grade" "text", "wq_score" numeric, "mortality_score" numeric, "fcr_score" numeric, "growth_score" numeric, "wq_rating_avg" double precision, "mortality_rate_pct" double precision, "latest_efcr" double precision, "adg_g_day" double precision, "latest_abw_g" double precision, "last_sample_date" "date", "wq_date" "date")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'analytics'
    AS $$
begin
  if not private.is_farm_member(p_farm_id) then
    return;
  end if;

  if p_system_id is not null and not exists (
    select 1
    from public.system s
    where s.id = p_system_id
      and s.farm_id = p_farm_id
  ) then
    return;
  end if;

  return query
  with latest_fact as (
    select distinct on (dsf.system_id)
      dsf.system_id,
      dsf.farm_id,
      dsf.system_name,
      dsf.fact_date,
      dsf.number_of_fish,
      dsf.abw_last_sampling,
      dsf.last_sampling_date,
      dsf.feeding_amount_aggregated,
      dsf.number_of_fish_mortality_aggregated
    from analytics.daily_system_facts dsf
    where dsf.farm_id = p_farm_id
      and dsf.system_is_active
      and (p_system_id is null or dsf.system_id = p_system_id)
    order by dsf.system_id, dsf.fact_date desc
  ),
  recent_fact as (
    select
      lf.system_id,
      sum(dsf.number_of_fish_mortality)::double precision as recent_mortality,
      avg(nullif(dsf.number_of_fish, 0))::double precision as avg_live_fish,
      sum(dsf.feeding_amount)::double precision as recent_feed_kg
    from latest_fact lf
    join analytics.daily_system_facts dsf
      on dsf.system_id = lf.system_id
     and dsf.fact_date between lf.fact_date - 6 and lf.fact_date
    group by lf.system_id
  ),
  wq as (
    select
      lf.system_id,
      avg(dwr.rating_numeric)::double precision as wq_avg,
      max(dwr.rating_date) as wq_date
    from latest_fact lf
    left join public.daily_water_quality_rating dwr
      on dwr.system_id = lf.system_id
     and dwr.rating_date between lf.fact_date - 29 and lf.fact_date
    group by lf.system_id
  ),
  appetite as (
    select
      lf.system_id,
      avg(fr.feeding_response)::double precision as avg_response,
      count(*) as response_count,
      bool_or(fr.feeding_response = 1) as has_no_response
    from latest_fact lf
    left join public.feeding_record fr
      on fr.system_id = lf.system_id
     and fr.date between lf.fact_date - 6 and lf.fact_date
    group by lf.system_id
  ),
  sampling_ranked as (
    select
      lf.system_id,
      fsw.date,
      public.resolve_sampling_abw_g(
        fsw.abw::numeric,
        fsw.total_weight_sampling::numeric,
        fsw.number_of_fish_sampling::numeric
      )::double precision as abw_g,
      row_number() over (partition by lf.system_id order by fsw.date desc, fsw.id desc) as rn
    from latest_fact lf
    join public.fish_sampling_weight fsw
      on fsw.system_id = lf.system_id
     and fsw.date <= lf.fact_date
  ),
  growth as (
    select
      latest.system_id,
      latest.abw_g as latest_abw_g,
      latest.date as last_sample_date,
      case
        when prev.date is not null
         and latest.date > prev.date
         and latest.abw_g is not null
         and prev.abw_g is not null
          then ((latest.abw_g - prev.abw_g) / nullif(latest.date - prev.date, 0))::double precision
        else null::double precision
      end as adg_g_day
    from sampling_ranked latest
    left join sampling_ranked prev
      on prev.system_id = latest.system_id
     and prev.rn = 2
    where latest.rn = 1
  ),
  scored as (
    select
      lf.system_id,
      lf.system_name,
      lf.fact_date,
      coalesce(g.latest_abw_g, lf.abw_last_sampling)::double precision as latest_abw_g,
      coalesce(g.last_sample_date, lf.last_sampling_date) as last_sample_date,
      g.adg_g_day,
      wq.wq_avg,
      wq.wq_date,
      case
        when coalesce(rf.avg_live_fish, 0) > 0
          then (coalesce(rf.recent_mortality, 0) / rf.avg_live_fish * 100.0)::double precision
        else null::double precision
      end as mortality_rate_pct,
      null::double precision as latest_efcr,
      case
        when wq.wq_avg is null then 1.5
        else least(greatest(wq.wq_avg, 0), 3)::numeric
      end as wq_score,
      case
        when coalesce(rf.avg_live_fish, 0) <= 0 then 0.0
        when (coalesce(rf.recent_mortality, 0) / rf.avg_live_fish * 100.0) <= 0.10 then 3.0
        when (coalesce(rf.recent_mortality, 0) / rf.avg_live_fish * 100.0) <= 0.50 then 2.0
        when (coalesce(rf.recent_mortality, 0) / rf.avg_live_fish * 100.0) <= 1.00 then 1.0
        else 0.0
      end::numeric as mortality_score,
      case
        when appetite.response_count = 0 then 1.0
        when appetite.has_no_response then 0.0
        when appetite.avg_response >= 2.75 and appetite.avg_response <= 4.25 then 2.0
        when appetite.avg_response > 4.25 and appetite.avg_response <= 5.0 then 1.5
        when appetite.avg_response >= 2.0 then 1.0
        else 0.0
      end::numeric as feed_score,
      case
        when coalesce(g.last_sample_date, lf.last_sampling_date) is null then 0.5
        when lf.fact_date - coalesce(g.last_sample_date, lf.last_sampling_date) > 45 then 0.75
        when g.adg_g_day is null then 1.0
        when g.adg_g_day > 0 then 2.0
        when g.adg_g_day = 0 then 1.0
        else 0.0
      end::numeric as growth_score
    from latest_fact lf
    left join recent_fact rf on rf.system_id = lf.system_id
    left join wq on wq.system_id = lf.system_id
    left join appetite on appetite.system_id = lf.system_id
    left join growth g on g.system_id = lf.system_id
  )
  select
    scored.system_id,
    scored.system_name,
    round((
      scored.wq_score
      + scored.mortality_score
      + scored.feed_score
      + scored.growth_score
    )::numeric, 1) as health_score,
    case
      when (
        scored.wq_score + scored.mortality_score + scored.feed_score + scored.growth_score
      ) >= 8.5 then 'excellent'
      when (
        scored.wq_score + scored.mortality_score + scored.feed_score + scored.growth_score
      ) >= 7.0 then 'good'
      when (
        scored.wq_score + scored.mortality_score + scored.feed_score + scored.growth_score
      ) >= 5.0 then 'fair'
      when (
        scored.wq_score + scored.mortality_score + scored.feed_score + scored.growth_score
      ) >= 3.0 then 'poor'
      else 'critical'
    end as health_grade,
    round(scored.wq_score, 1) as wq_score,
    round(scored.mortality_score, 1) as mortality_score,
    round(scored.feed_score, 1) as fcr_score,
    round(scored.growth_score, 1) as growth_score,
    scored.wq_avg as wq_rating_avg,
    scored.mortality_rate_pct,
    scored.latest_efcr,
    scored.adg_g_day,
    scored.latest_abw_g,
    scored.last_sample_date,
    scored.wq_date
  from scored
  order by health_score asc nulls last, system_name;
end;
$$;


ALTER FUNCTION "public"."api_system_health_score"("p_farm_id" "uuid", "p_system_id" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."api_system_health_score"("p_farm_id" "uuid", "p_system_id" bigint) IS 'Dashboard system health score from canonical daily facts, recent water-quality ratings, 1-5 appetite response logs, mortality, and sampling freshness. Evaluated as of each system latest real fact date for historical production records.';



CREATE OR REPLACE FUNCTION "public"."api_system_options_rpc"("p_farm_id" "uuid" DEFAULT NULL::"uuid", "p_stage" "public"."system_growth_stage" DEFAULT NULL::"public"."system_growth_stage", "p_active_only" boolean DEFAULT true) RETURNS TABLE("id" bigint, "label" "text", "type" "text", "growth_stage" "public"."system_growth_stage", "is_active" boolean, "farm_id" "uuid", "farm_name" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
  select s.id, s.name as label, s.type::text, s.growth_stage,
    coalesce(s.is_active, true) as is_active, s.farm_id, f.name as farm_name
  from public.system s
  join public.farm f on f.id = s.farm_id
  left join lateral (
    select min(fs.date) as first_stocking_date
    from public.fish_stocking fs
    where fs.system_id = s.id
  ) stocking on true
  left join lateral (
    select max(pc.cycle_start) as latest_cycle_start
    from public.production_cycle pc
    where pc.system_id = s.id
  ) cycle on true
  where (p_farm_id is null or s.farm_id = p_farm_id)
    and (p_stage is null or s.growth_stage = p_stage)
    and (not p_active_only or coalesce(s.is_active, true) = true)
    and (p_farm_id is null or private.is_farm_member(p_farm_id))
    and private.is_farm_member(s.farm_id)
  order by
    coalesce(s.is_active, true) desc,
    case
      when coalesce(s.is_active, true) then (stocking.first_stocking_date is not null)
      else true
    end desc,
    coalesce(stocking.first_stocking_date, cycle.latest_cycle_start, s.commissioned_at) desc nulls last,
    s.commissioned_at desc nulls last,
    s.id desc,
    s.name asc;
$$;


ALTER FUNCTION "public"."api_system_options_rpc"("p_farm_id" "uuid", "p_stage" "public"."system_growth_stage", "p_active_only" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_system_timeline_bounds"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint) RETURNS TABLE("system_id" bigint, "resolved_start" "date", "resolved_end" "date", "resolved_ongoing" boolean, "snapshot_as_of" "date", "first_stocking_date" "date", "final_harvest_date" "date", "first_activity_date" "date", "last_activity_date" "date", "configured_cycle_start" "date", "configured_cycle_end" "date", "period_source" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
  with sys as (
    select s.id as system_id from public.system s
    where private.app_rpc_scope_ok(p_farm_id, p_system_id, null, null, null)
      and s.farm_id = p_farm_id
      and coalesce(s.is_active, true) = true
      and (p_system_id is null or s.id = p_system_id)
  ),
  snapshot_bounds as (
    select d.system_id, max(d.inventory_date) as snapshot_as_of
    from analytics.daily_system_facts d
    join sys on sys.system_id = d.system_id
    group by d.system_id
  ),
  stocking_bounds as (
    select fs.system_id, min(fs.date) as first_stocking_date
    from public.fish_stocking fs
    join sys on sys.system_id = fs.system_id
    group by fs.system_id
  ),
  harvest_bounds as (
    select fh.system_id, max(fh.date) as final_harvest_date
    from public.fish_harvest fh
    join sys on sys.system_id = fh.system_id
    where fh.type_of_harvest = 'final'::public.type_of_harvest
    group by fh.system_id
  ),
  configured_cycle_ranked as (
    select pc.system_id, pc.cycle_start, pc.cycle_end,
      row_number() over (
        partition by pc.system_id
        order by pc.ongoing_cycle desc, pc.cycle_start desc, pc.cycle_id desc
      ) as rn
    from public.production_cycle pc
    join sys on sys.system_id = pc.system_id
  ),
  configured_cycle as (
    select system_id, cycle_start as configured_cycle_start, cycle_end as configured_cycle_end
    from configured_cycle_ranked where rn = 1
  ),
  activity_union as (
    select fs.system_id, fs.date from public.fish_stocking fs join sys on sys.system_id = fs.system_id
    union all
    select fr.system_id, fr.date from public.feeding_record fr join sys on sys.system_id = fr.system_id
    union all
    select fm.system_id, fm.date from public.fish_mortality fm join sys on sys.system_id = fm.system_id
    union all
    select sw.system_id, sw.date from public.fish_sampling_weight sw join sys on sys.system_id = sw.system_id
    union all
    select fh.system_id, fh.date from public.fish_harvest fh join sys on sys.system_id = fh.system_id
    union all
    select ft.origin_system_id, ft.date from public.fish_transfer ft join sys on sys.system_id = ft.origin_system_id where ft.origin_system_id is not null
    union all
    select ft.target_system_id, ft.date from public.fish_transfer ft join sys on sys.system_id = ft.target_system_id where ft.target_system_id is not null
    union all
    select dwr.system_id, dwr.rating_date from public.daily_water_quality_rating dwr join sys on sys.system_id = dwr.system_id
  ),
  activity_bounds as (
    select system_id, min(date) as first_activity_date, max(date) as last_activity_date
    from activity_union group by system_id
  )
  select sys.system_id,
    case
      when sb.first_stocking_date is not null then sb.first_stocking_date
      when sb.first_stocking_date is null and cc.configured_cycle_start is not null and ab.first_activity_date is null then cc.configured_cycle_start
      when ab.first_activity_date is not null then ab.first_activity_date
      else null::date
    end as resolved_start,
    case
      when sb.first_stocking_date is not null then hb.final_harvest_date
      when sb.first_stocking_date is null and cc.configured_cycle_start is not null and ab.first_activity_date is null then cc.configured_cycle_end
      when ab.first_activity_date is not null then coalesce(hb.final_harvest_date, ab.last_activity_date)
      else null::date
    end as resolved_end,
    case
      when sb.first_stocking_date is not null then hb.final_harvest_date is null
      when sb.first_stocking_date is null and cc.configured_cycle_start is not null and ab.first_activity_date is null then cc.configured_cycle_end is null
      when ab.first_activity_date is not null then false
      else false
    end as resolved_ongoing,
    snap.snapshot_as_of, sb.first_stocking_date, hb.final_harvest_date,
    ab.first_activity_date, ab.last_activity_date,
    cc.configured_cycle_start, cc.configured_cycle_end,
    case
      when sb.first_stocking_date is not null and hb.final_harvest_date is null then 'cycle_ongoing'
      when sb.first_stocking_date is not null and hb.final_harvest_date is not null then 'cycle_closed'
      when sb.first_stocking_date is null and cc.configured_cycle_start is not null and ab.first_activity_date is null then 'planned_cycle'
      when ab.first_activity_date is not null then 'observed_activity'
      else 'no_data'
    end as period_source
  from sys
  left join snapshot_bounds snap on snap.system_id = sys.system_id
  left join stocking_bounds sb on sb.system_id = sys.system_id
  left join harvest_bounds hb on hb.system_id = sys.system_id
  left join configured_cycle cc on cc.system_id = sys.system_id
  left join activity_bounds ab on ab.system_id = sys.system_id
  order by sys.system_id;
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
      when 'dashboard'      then 'dashboard'
      when 'inventory'      then 'inventory'
      when 'production'     then 'production'
      when 'water_quality'  then 'water_quality'
      when 'water-quality'  then 'water_quality'
      when 'feeding'        then 'feeding'
      when 'feed'           then 'feeding'
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
      case when rp.value in ('all history', 'all_history') then 'all history' else dtp.time_period::text end as time_period,
      case when rp.value in ('all history', 'all_history') then null::integer else greatest(dtp.days_since_start, 1) end as requested_days
    from requested_period rp
    join perm on perm.ok
    left join public.dashboard_time_period dtp on dtp.time_period::text = rp.value
    where rp.value in ('all history', 'all_history') or dtp.time_period is not null
    limit 1
  ),
  capped_anchor as (
    select least(coalesce(p_anchor_date, current_date), current_date) as value
  ),
  scoped_dates as (
    select
      rs.anchor_scope,
      case rs.anchor_scope
        when 'water_quality' then (
          select max(dwr.rating_date)
          from public.daily_water_quality_rating dwr
          join public.system s on s.id = dwr.system_id
          cross join capped_anchor ca
          where s.farm_id = p_farm_id
            and dwr.rating_date <= ca.value
            and (p_system_id is null or s.id = p_system_id)
        )
        when 'feeding' then (
          select max(fr.date)
          from public.feeding_record fr
          join public.system s on s.id = fr.system_id
          cross join capped_anchor ca
          where s.farm_id = p_farm_id
            and fr.date <= ca.value
            and (p_system_id is null or s.id = p_system_id)
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
          select max(d.inventory_date)
          from analytics.daily_system_facts d
          join public.system s on s.id = d.system_id
          cross join capped_anchor ca
          where s.farm_id = p_farm_id
            and d.inventory_date <= ca.value
            and (p_system_id is null or s.id = p_system_id)
        )
      end as latest_available_date,
      case rs.anchor_scope
        when 'water_quality' then (
          select min(dwr.rating_date)
          from public.daily_water_quality_rating dwr
          join public.system s on s.id = dwr.system_id
          where s.farm_id = p_farm_id
            and dwr.rating_date <= current_date
            and (p_system_id is null or s.id = p_system_id)
        )
        when 'feeding' then (
          select min(fr.date)
          from public.feeding_record fr
          join public.system s on s.id = fr.system_id
          where s.farm_id = p_farm_id
            and fr.date <= current_date
            and (p_system_id is null or s.id = p_system_id)
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
          from analytics.daily_system_facts d
          join public.system s on s.id = d.system_id
          where s.farm_id = p_farm_id
            and d.inventory_date <= current_date
            and (p_system_id is null or s.id = p_system_id)
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
    case when b.input_end_date is null or b.available_from_date is null then null::integer
         else (b.input_end_date - b.available_from_date + 1)::integer end as available_days,
    case when b.input_end_date is null or b.input_start_date is null then null::integer
         else (b.input_end_date - b.input_start_date + 1)::integer end as resolved_days,
    case when b.input_end_date is null then null::integer
         else greatest((current_date - b.input_end_date)::integer, 0) end as staleness_days,
    case when b.time_period = 'all history' then false
         when b.input_end_date is null or b.available_from_date is null or b.input_start_date is null then false
         else b.input_start_date > (b.input_end_date - (b.requested_days - 1)) end as is_truncated
  from bounded b;
$$;


ALTER FUNCTION "public"."api_time_period_bounds_scoped"("p_farm_id" "uuid", "p_time_period" "text", "p_scope" "text", "p_anchor_date" "date", "p_system_id" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."api_time_period_bounds_scoped"("p_farm_id" "uuid", "p_time_period" "text", "p_scope" "text", "p_anchor_date" "date", "p_system_id" bigint) IS 'Intentional app-facing SECURITY DEFINER RPC. Direct access to internal read models is revoked; callers must be authenticated and function body must enforce farm membership/scope checks.';



CREATE OR REPLACE FUNCTION "public"."api_water_quality_sync_status"("p_farm_id" "uuid") RETURNS TABLE("latest_rating_date" "date", "latest_measurement_ts" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  with perm as (
    select private.is_farm_member(p_farm_id) as ok
  )
  select
    (select max(dwr.rating_date)
     from public.daily_water_quality_rating dwr
     join public.system s on s.id = dwr.system_id
     where s.farm_id = p_farm_id
       and (select ok from perm)
    ) as latest_rating_date,
    (select max(wqm.created_at)
     from public.water_quality_measurement wqm
     join public.system s on s.id = wqm.system_id
     where s.farm_id = p_farm_id
       and (select ok from perm)
    ) as latest_measurement_ts;
$$;


ALTER FUNCTION "public"."api_water_quality_sync_status"("p_farm_id" "uuid") OWNER TO "postgres";


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
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
  with latest_summary as (
    select distinct on (ps.system_id)
      ps.system_id,
      ps.total_biomass::numeric as estimated_biomass_kg
    from analytics.production_summary ps
    join public.system s on s.id = ps.system_id
    where coalesce(ps.ongoing_cycle, true) = true
      and ps.total_biomass is not null
      and private.is_farm_member(s.farm_id)
      and (p_farm_id is null or s.farm_id = p_farm_id)
      and (p_system_id is null or ps.system_id = p_system_id)
    order by ps.system_id, ps.date desc
  )
  select
    s.name as system_name,
    s.growth_stage::text,
    ls.estimated_biomass_kg,
    fr.feed_rate_min_pct,
    fr.feed_rate_max_pct,
    round(ls.estimated_biomass_kg * fr.feed_rate_min_pct / 100.0, 3) as daily_feed_min_kg,
    round(ls.estimated_biomass_kg * fr.feed_rate_mid_pct / 100.0, 3) as daily_feed_target_kg,
    round(ls.estimated_biomass_kg * fr.feed_rate_max_pct / 100.0, 3) as daily_feed_max_kg,
    fr.sessions_per_day,
    fr.pellet_size_mm,
    round((ls.estimated_biomass_kg * fr.feed_rate_mid_pct / 100.0) / nullif(fr.sessions_per_day, 0), 3) as per_session_kg
  from latest_summary ls
  join public.system s on s.id = ls.system_id
  cross join lateral public.get_feed_rate_target(s.growth_stage::text) fr
  order by s.name;
$$;


ALTER FUNCTION "public"."get_daily_feed_target_kg"("p_farm_id" "uuid", "p_system_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_fcr_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_days" integer DEFAULT 180) RETURNS TABLE("period_start" "date", "period_end" "date", "total_feed_kg" numeric, "weight_gain_kg" numeric, "fcr" numeric, "abw_end_g" numeric, "days_interval" integer)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
WITH samp AS (
  SELECT fsw.date AS sample_date, fsw.abw, fsw.number_of_fish_sampling,
    LAG(fsw.date) OVER (ORDER BY fsw.date) AS prev_date,
    LAG(fsw.abw) OVER (ORDER BY fsw.date) AS prev_abw,
    LAG(fsw.number_of_fish_sampling) OVER (ORDER BY fsw.date) AS prev_count
  FROM public.fish_sampling_weight fsw JOIN public.system s ON s.id = fsw.system_id
  WHERE fsw.system_id = p_system_id AND s.farm_id = p_farm_id AND fsw.date >= CURRENT_DATE - p_days
),
intervals AS (
  SELECT prev_date AS ps, sample_date AS pe,
    (abw - prev_abw) * ((COALESCE(number_of_fish_sampling,0) + COALESCE(prev_count,0)) / 2.0) / 1000.0 AS wg,
    abw AS abw_end, (sample_date - prev_date)::int AS di
  FROM samp WHERE prev_date IS NOT NULL AND abw > prev_abw
),
feeds AS (
  SELECT i.ps, i.pe, SUM(fr.feeding_amount)::numeric AS fk
  FROM intervals i
  JOIN public.feeding_record fr ON fr.system_id = p_system_id AND fr.date > i.ps AND fr.date <= i.pe
  WHERE fr.feeding_amount > 0 GROUP BY i.ps, i.pe
)
SELECT i.ps, i.pe, ROUND(COALESCE(f.fk,0),3), ROUND(i.wg::numeric,3),
  CASE WHEN i.wg > 0 THEN ROUND(COALESCE(f.fk,0) / i.wg::numeric,3) ELSE NULL END,
  i.abw_end, i.di
FROM intervals i LEFT JOIN feeds f ON f.ps = i.ps AND f.pe = i.pe ORDER BY i.ps;
$$;


ALTER FUNCTION "public"."get_fcr_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_days" integer) OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."get_growth_trend"("p_system_id" bigint, "p_days" integer DEFAULT 180) RETURNS TABLE("sample_date" "date", "abw_g" numeric, "prev_abw_g" numeric, "weight_gain_g" numeric, "adg_g_day" numeric, "sgr_pct_day" numeric, "days_interval" integer)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
SELECT fsw.date AS sample_date, fsw.abw::numeric AS abw_g,
  (LAG(fsw.abw) OVER w)::numeric AS prev_abw_g,
  (fsw.abw - (LAG(fsw.abw) OVER w))::numeric AS weight_gain_g,
  ROUND(((fsw.abw - (LAG(fsw.abw) OVER w)) / NULLIF((fsw.date - (LAG(fsw.date) OVER w)), 0))::numeric, 3) AS adg_g_day,
  ROUND(((LN(fsw.abw) - LN(LAG(fsw.abw) OVER w)) / NULLIF((fsw.date - (LAG(fsw.date) OVER w)), 0) * 100)::numeric, 4) AS sgr_pct_day,
  (fsw.date - (LAG(fsw.date) OVER w))::int AS days_interval
FROM public.fish_sampling_weight fsw
WHERE fsw.system_id = p_system_id AND fsw.date >= CURRENT_DATE - p_days AND fsw.abw > 0
WINDOW w AS (ORDER BY fsw.date) ORDER BY fsw.date;
$$;


ALTER FUNCTION "public"."get_growth_trend"("p_system_id" bigint, "p_days" integer) OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."get_survival_trend"("p_system_id" bigint, "p_start_date" "date", "p_end_date" "date" DEFAULT CURRENT_DATE) RETURNS TABLE("event_date" "date", "daily_deaths" integer, "cum_deaths" integer, "stocked" integer, "live_count" integer, "survival_pct" numeric, "daily_mort_pct" numeric)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
WITH stk AS (
  SELECT COALESCE(SUM(number_of_fish_stocking),0)::int AS total
  FROM public.fish_stocking WHERE system_id = p_system_id AND date <= p_start_date
),
cum AS (
  SELECT fm.date AS event_date, fm.number_of_fish_mortality::int AS dead_count,
    SUM(fm.number_of_fish_mortality) OVER (ORDER BY fm.date)::int AS cd
  FROM public.fish_mortality fm
  WHERE fm.system_id = p_system_id AND fm.date BETWEEN p_start_date AND p_end_date
)
SELECT c.event_date, c.dead_count, c.cd, s.total,
  GREATEST(s.total - c.cd, 0)::int,
  ROUND(GREATEST(s.total - c.cd,0)::numeric / NULLIF(s.total,0) * 100, 2),
  ROUND(c.dead_count::numeric / NULLIF(s.total - COALESCE(LAG(c.cd) OVER (ORDER BY c.event_date),0),0) * 100, 4)
FROM cum c CROSS JOIN stk s ORDER BY c.event_date;
$$;


ALTER FUNCTION "public"."get_survival_trend"("p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."process_inventory_queue"("p_limit" integer DEFAULT 50) RETURNS TABLE("processed_system_id" bigint, "processed_from_date" "date", "processed_to_date" "date", "upserted_days" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'analytics'
    AS $$
declare
  r record;
  v_has_queue boolean;
begin
  select exists (select 1 from public._affected_systems)
  into v_has_queue;

  if v_has_queue then
    refresh materialized view analytics.daily_fish_inventory_table;
    refresh materialized view analytics.daily_system_facts;
    refresh materialized view analytics.production_summary;
    refresh materialized view analytics.efcr_period_last_sampling_view;
  end if;

  for r in
    select system_id, min_affected_date
    from public._affected_systems
    order by min_affected_date asc
    limit greatest(1, least(coalesce(p_limit, 50), 500))
  loop
    processed_system_id := r.system_id;
    processed_from_date := r.min_affected_date;
    processed_to_date := current_date;
    upserted_days := 0;
    return next;
  end loop;

  delete from public._affected_systems
  where system_id in (
    select system_id
    from public._affected_systems
    order by min_affected_date asc
    limit greatest(1, least(coalesce(p_limit, 50), 500))
  );
end;
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
begin
  if tg_op in ('INSERT', 'DELETE') then
    perform public.request_matview_refresh();
  elsif
    new.volume is distinct from old.volume
    or new.farm_id is distinct from old.farm_id
    or new.name is distinct from old.name
    or new.growth_stage is distinct from old.growth_stage
    or coalesce(new.is_active, true) is distinct from coalesce(old.is_active, true)
  then
    perform public.request_matview_refresh();
  end if;
  return null;
end;
$$;


ALTER FUNCTION "public"."refresh_after_system_if_needed"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_analytics_cache"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.daily_system_facts_cache;
END;
$$;


ALTER FUNCTION "public"."refresh_analytics_cache"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."refresh_analytics_cache"() IS 'Refreshes the analytics.daily_system_facts_cache materialized view. Call after fish_mortality, fish_harvest, fish_stocking, fish_transfer, fish_sampling_weight, feeding_record or production_cycle data entry.';



CREATE OR REPLACE FUNCTION "public"."refresh_daily_water_quality_rating"("p_system_id" bigint DEFAULT NULL::bigint, "p_from" "date" DEFAULT NULL::"date", "p_to" "date" DEFAULT NULL::"date") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
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
    rating = excluded.rating, worst_parameter = excluded.worst_parameter,
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

  perform public.request_matview_refresh();
end;
$$;


ALTER FUNCTION "public"."refresh_daily_water_quality_rating"("p_system_id" bigint, "p_from" "date", "p_to" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_matview_refresh"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  NULL;
END;
$$;


ALTER FUNCTION "public"."request_matview_refresh"() OWNER TO "postgres";


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
    "feed_type_id" bigint,
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
    "farm_id" "uuid",
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


CREATE MATERIALIZED VIEW "analytics"."daily_fish_inventory_table" AS
 WITH "system_start" AS (
         SELECT "fish_stocking"."system_id",
            "min"("fish_stocking"."date") AS "start_date"
           FROM "public"."fish_stocking"
          GROUP BY "fish_stocking"."system_id"
        ), "date_spine" AS (
         SELECT "ss"."system_id",
            ("gs"."gs")::"date" AS "inventory_date"
           FROM "system_start" "ss",
            LATERAL "generate_series"(("ss"."start_date")::timestamp with time zone, (CURRENT_DATE)::timestamp with time zone, '1 day'::interval) "gs"("gs")
        ), "daily_stocked" AS (
         SELECT "fish_stocking"."system_id",
            "fish_stocking"."date" AS "inventory_date",
            "sum"("fish_stocking"."number_of_fish_stocking") AS "qty_stocked"
           FROM "public"."fish_stocking"
          GROUP BY "fish_stocking"."system_id", "fish_stocking"."date"
        ), "daily_mortality" AS (
         SELECT "fish_mortality"."system_id",
            "fish_mortality"."date" AS "inventory_date",
            "sum"("fish_mortality"."number_of_fish_mortality") AS "qty_mortality"
           FROM "public"."fish_mortality"
          GROUP BY "fish_mortality"."system_id", "fish_mortality"."date"
        ), "daily_transferred_in" AS (
         SELECT "fish_transfer"."target_system_id" AS "system_id",
            "fish_transfer"."date" AS "inventory_date",
            "sum"("fish_transfer"."number_of_fish_transfer") AS "qty_transfer_in"
           FROM "public"."fish_transfer"
          GROUP BY "fish_transfer"."target_system_id", "fish_transfer"."date"
        ), "daily_transferred_out" AS (
         SELECT "fish_transfer"."origin_system_id" AS "system_id",
            "fish_transfer"."date" AS "inventory_date",
            "sum"("fish_transfer"."number_of_fish_transfer") AS "qty_transfer_out"
           FROM "public"."fish_transfer"
          GROUP BY "fish_transfer"."origin_system_id", "fish_transfer"."date"
        ), "daily_harvested" AS (
         SELECT "fish_harvest"."system_id",
            "fish_harvest"."date" AS "inventory_date",
            "sum"("fish_harvest"."number_of_fish_harvest") AS "qty_harvested"
           FROM "public"."fish_harvest"
          GROUP BY "fish_harvest"."system_id", "fish_harvest"."date"
        ), "daily_feeding" AS (
         SELECT "feeding_record"."system_id",
            "feeding_record"."date" AS "inventory_date",
            ("sum"("feeding_record"."feeding_amount"))::numeric AS "qty_feeding"
           FROM "public"."feeding_record"
          GROUP BY "feeding_record"."system_id", "feeding_record"."date"
        ), "last_sampling_dates" AS (
         SELECT "ds"."system_id",
            "ds"."inventory_date",
            "max"("fsw"."date") AS "last_sampling_date"
           FROM ("date_spine" "ds"
             LEFT JOIN "public"."fish_sampling_weight" "fsw" ON ((("fsw"."system_id" = "ds"."system_id") AND ("fsw"."date" <= "ds"."inventory_date"))))
          GROUP BY "ds"."system_id", "ds"."inventory_date"
        ), "last_sampling" AS (
         SELECT "lsd"."system_id",
            "lsd"."inventory_date",
            "lsd"."last_sampling_date",
            ((("sum"("fsw"."total_weight_sampling") * (1000.0)::double precision) / (NULLIF("sum"("fsw"."number_of_fish_sampling"), (0)::numeric))::double precision))::numeric AS "abw_last_sampling"
           FROM ("last_sampling_dates" "lsd"
             LEFT JOIN "public"."fish_sampling_weight" "fsw" ON ((("fsw"."system_id" = "lsd"."system_id") AND ("fsw"."date" = "lsd"."last_sampling_date"))))
          GROUP BY "lsd"."system_id", "lsd"."inventory_date", "lsd"."last_sampling_date"
        ), "combined" AS (
         SELECT "ds"."system_id",
            "ds"."inventory_date",
            COALESCE("stk"."qty_stocked", (0)::numeric) AS "number_of_fish_stocked",
            COALESCE("mort"."qty_mortality", (0)::numeric) AS "number_of_fish_mortality",
            COALESCE("tin"."qty_transfer_in", (0)::double precision) AS "number_of_fish_transferred_in",
            COALESCE("tout"."qty_transfer_out", (0)::double precision) AS "number_of_fish_transferred_out",
            COALESCE("harv"."qty_harvested", (0)::numeric) AS "number_of_fish_harvested",
            COALESCE("feed"."qty_feeding", (0)::numeric) AS "feeding_amount"
           FROM (((((("date_spine" "ds"
             LEFT JOIN "daily_stocked" "stk" ON ((("stk"."system_id" = "ds"."system_id") AND ("stk"."inventory_date" = "ds"."inventory_date"))))
             LEFT JOIN "daily_mortality" "mort" ON ((("mort"."system_id" = "ds"."system_id") AND ("mort"."inventory_date" = "ds"."inventory_date"))))
             LEFT JOIN "daily_transferred_in" "tin" ON ((("tin"."system_id" = "ds"."system_id") AND ("tin"."inventory_date" = "ds"."inventory_date"))))
             LEFT JOIN "daily_transferred_out" "tout" ON ((("tout"."system_id" = "ds"."system_id") AND ("tout"."inventory_date" = "ds"."inventory_date"))))
             LEFT JOIN "daily_harvested" "harv" ON ((("harv"."system_id" = "ds"."system_id") AND ("harv"."inventory_date" = "ds"."inventory_date"))))
             LEFT JOIN "daily_feeding" "feed" ON ((("feed"."system_id" = "ds"."system_id") AND ("feed"."inventory_date" = "ds"."inventory_date"))))
        ), "running" AS (
         SELECT "c"."system_id",
            "c"."inventory_date",
            "c"."number_of_fish_stocked",
            "c"."number_of_fish_mortality",
            "c"."number_of_fish_transferred_in",
            "c"."number_of_fish_transferred_out",
            "c"."number_of_fish_harvested",
            "c"."feeding_amount",
            "sum"(((((("c"."number_of_fish_stocked")::double precision + "c"."number_of_fish_transferred_in") - ("c"."number_of_fish_mortality")::double precision) - "c"."number_of_fish_transferred_out") - ("c"."number_of_fish_harvested")::double precision)) OVER (PARTITION BY "c"."system_id" ORDER BY "c"."inventory_date" ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS "number_of_fish",
            "sum"("c"."number_of_fish_mortality") OVER (PARTITION BY "c"."system_id" ORDER BY "c"."inventory_date" ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS "number_of_fish_mortality_aggregated",
            "sum"("c"."feeding_amount") OVER (PARTITION BY "c"."system_id" ORDER BY "c"."inventory_date" ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS "feeding_amount_aggregated"
           FROM "combined" "c"
        )
 SELECT "row_number"() OVER (ORDER BY "r"."system_id", "r"."inventory_date") AS "id",
    "r"."inventory_date",
    ("r"."system_id")::integer AS "system_id",
    "r"."number_of_fish",
    "r"."number_of_fish_stocked",
    "r"."number_of_fish_transferred_in",
    "r"."number_of_fish_mortality_aggregated",
    "r"."number_of_fish_mortality",
    "r"."number_of_fish_transferred_out",
    "r"."number_of_fish_harvested",
    "r"."feeding_amount",
    "r"."feeding_amount_aggregated",
    "ls"."last_sampling_date",
    "ls"."abw_last_sampling",
    ((("ls"."abw_last_sampling")::double precision * "r"."number_of_fish") / (1000.0)::double precision) AS "biomass_last_sampling",
        CASE
            WHEN (((("ls"."abw_last_sampling")::double precision * "r"."number_of_fish") / (1000.0)::double precision) > (0)::double precision) THEN (((("r"."feeding_amount")::double precision / ((("ls"."abw_last_sampling")::double precision * "r"."number_of_fish") / (1000.0)::double precision)) * (100)::double precision))::numeric
            ELSE NULL::numeric
        END AS "feeding_rate",
    ("s"."volume")::numeric AS "system_volume",
        CASE
            WHEN ("s"."volume" > (0)::double precision) THEN (((("ls"."abw_last_sampling")::double precision * "r"."number_of_fish") / (1000.0)::double precision) / "s"."volume")
            ELSE NULL::double precision
        END AS "biomass_density",
        CASE
            WHEN ("r"."number_of_fish" > (0)::double precision) THEN ((("r"."number_of_fish_mortality")::double precision / "r"."number_of_fish") * (100)::double precision)
            ELSE (0)::double precision
        END AS "mortality_rate"
   FROM (("running" "r"
     JOIN "public"."system" "s" ON (("s"."id" = "r"."system_id")))
     LEFT JOIN "last_sampling" "ls" ON ((("ls"."system_id" = "r"."system_id") AND ("ls"."inventory_date" = "r"."inventory_date"))))
  WITH NO DATA;


ALTER TABLE "analytics"."daily_fish_inventory_table" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fingerling_batch" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "supplier_id" bigint NOT NULL,
    "date_of_delivery" "date" NOT NULL,
    "number_of_fish" bigint,
    "abw" double precision,
    "name" "text" NOT NULL,
    "farm_id" "uuid",
    "system_id" bigint,
    CONSTRAINT "fingerling_batch_abw_positive" CHECK ((("abw" IS NULL) OR ("abw" > (0)::double precision))),
    CONSTRAINT "fingerling_batch_number_positive" CHECK ((("number_of_fish" IS NULL) OR ("number_of_fish" >= 0)))
);


ALTER TABLE "public"."fingerling_batch" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "analytics"."daily_system_facts" AS
 WITH "activity_union" AS (
         SELECT "fish_stocking"."system_id",
            "fish_stocking"."date"
           FROM "public"."fish_stocking"
        UNION ALL
         SELECT "feeding_record"."system_id",
            "feeding_record"."date"
           FROM "public"."feeding_record"
        UNION ALL
         SELECT "fish_mortality"."system_id",
            "fish_mortality"."date"
           FROM "public"."fish_mortality"
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
            COALESCE("min"("au"."date"), "s"."commissioned_at", CURRENT_DATE) AS "start_date",
            GREATEST(COALESCE("max"("au"."date"), "s"."decommissioned_at", "s"."commissioned_at", CURRENT_DATE), COALESCE("s"."decommissioned_at", "max"("au"."date"), "s"."commissioned_at", CURRENT_DATE)) AS "end_date"
           FROM ("public"."system" "s"
             LEFT JOIN "activity_union" "au" ON (("au"."system_id" = "s"."id")))
          WHERE ("s"."farm_id" IS NOT NULL)
          GROUP BY "s"."id", "s"."farm_id", "s"."name", "s"."growth_stage", "s"."is_active", "s"."commissioned_at", "s"."decommissioned_at"
        ), "date_spine" AS (
         SELECT "sb"."system_id",
            "sb"."farm_id",
            "sb"."system_name",
            "sb"."growth_stage",
            "sb"."system_is_active",
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
            ("sum"(COALESCE("fish_harvest"."number_of_fish_harvest", (0)::bigint)))::double precision AS "qty_harvest"
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
            "ds"."inventory_date",
            COALESCE("stk"."qty_stocked", (0)::double precision) AS "number_of_fish_stocked",
            COALESCE("tin"."qty_transfer_in", (0)::double precision) AS "number_of_fish_transferred_in",
            COALESCE("mort"."qty_mortality", (0)::double precision) AS "number_of_fish_mortality",
            COALESCE("tout"."qty_transfer_out", (0)::double precision) AS "number_of_fish_transferred_out",
            COALESCE("harv"."qty_harvest", (0)::double precision) AS "number_of_fish_harvested",
            COALESCE("feed"."feed_kg", (0)::double precision) AS "feeding_amount"
           FROM (((((("date_spine" "ds"
             LEFT JOIN "daily_stocked" "stk" ON ((("stk"."system_id" = "ds"."system_id") AND ("stk"."inventory_date" = "ds"."inventory_date"))))
             LEFT JOIN "daily_transfer_in" "tin" ON ((("tin"."system_id" = "ds"."system_id") AND ("tin"."inventory_date" = "ds"."inventory_date"))))
             LEFT JOIN "daily_mortality" "mort" ON ((("mort"."system_id" = "ds"."system_id") AND ("mort"."inventory_date" = "ds"."inventory_date"))))
             LEFT JOIN "daily_transfer_out" "tout" ON ((("tout"."system_id" = "ds"."system_id") AND ("tout"."inventory_date" = "ds"."inventory_date"))))
             LEFT JOIN "daily_harvest" "harv" ON ((("harv"."system_id" = "ds"."system_id") AND ("harv"."inventory_date" = "ds"."inventory_date"))))
             LEFT JOIN "daily_feed" "feed" ON ((("feed"."system_id" = "ds"."system_id") AND ("feed"."inventory_date" = "ds"."inventory_date"))))
        ), "running" AS (
         SELECT "de"."system_id",
            "de"."farm_id",
            "de"."system_name",
            "de"."growth_stage",
            "de"."system_is_active",
            "de"."inventory_date",
            "de"."number_of_fish_stocked",
            "de"."number_of_fish_transferred_in",
            "de"."number_of_fish_mortality",
            "de"."number_of_fish_transferred_out",
            "de"."number_of_fish_harvested",
            "de"."feeding_amount",
            "sum"((((("de"."number_of_fish_stocked" + "de"."number_of_fish_transferred_in") - "de"."number_of_fish_mortality") - "de"."number_of_fish_transferred_out") - "de"."number_of_fish_harvested")) OVER (PARTITION BY "de"."system_id" ORDER BY "de"."inventory_date" ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS "number_of_fish",
            "sum"("de"."number_of_fish_mortality") OVER (PARTITION BY "de"."system_id" ORDER BY "de"."inventory_date" ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS "number_of_fish_mortality_aggregated",
            "sum"("de"."feeding_amount") OVER (PARTITION BY "de"."system_id" ORDER BY "de"."inventory_date" ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS "feeding_amount_aggregated"
           FROM "daily_events" "de"
        ), "sampling_anchor" AS (
         SELECT "w"."system_id",
            "w"."date" AS "anchor_date",
            COALESCE(
                CASE
                    WHEN ("sum"("w"."number_of_fish_sampling") FILTER (WHERE ("w"."total_weight_sampling" IS NOT NULL)) > (0)::numeric) THEN (("sum"("w"."total_weight_sampling") FILTER (WHERE ("w"."total_weight_sampling" IS NOT NULL)) * (1000.0)::double precision) / (NULLIF("sum"("w"."number_of_fish_sampling") FILTER (WHERE ("w"."total_weight_sampling" IS NOT NULL)), (0)::numeric))::double precision)
                    ELSE NULL::double precision
                END, "avg"(NULLIF("w"."abw", (0)::double precision))) AS "abw_g",
            1 AS "anchor_rank"
           FROM "public"."fish_sampling_weight" "w"
          GROUP BY "w"."system_id", "w"."date"
        ), "transfer_anchor" AS (
         SELECT "ft"."target_system_id" AS "system_id",
            "ft"."date" AS "anchor_date",
            COALESCE("avg"(NULLIF("ft"."abw", (0)::double precision)), (("sum"("ft"."total_weight_transfer") * (1000.0)::double precision) / NULLIF("sum"("ft"."number_of_fish_transfer"), (0)::double precision)), "avg"(NULLIF("fb"."abw", (0)::double precision))) AS "abw_g",
            2 AS "anchor_rank"
           FROM ("public"."fish_transfer" "ft"
             LEFT JOIN "public"."fingerling_batch" "fb" ON (("fb"."id" = "ft"."batch_id")))
          WHERE ("ft"."target_system_id" IS NOT NULL)
          GROUP BY "ft"."target_system_id", "ft"."date"
        ), "stocking_anchor" AS (
         SELECT "fs"."system_id",
            "fs"."date" AS "anchor_date",
            COALESCE("avg"(NULLIF("fs"."abw", (0)::double precision)), (("sum"("fs"."total_weight_stocking") * (1000.0)::double precision) / (NULLIF("sum"("fs"."number_of_fish_stocking"), (0)::numeric))::double precision), "avg"(NULLIF("fb"."abw", (0)::double precision))) AS "abw_g",
            3 AS "anchor_rank"
           FROM ("public"."fish_stocking" "fs"
             LEFT JOIN "public"."fingerling_batch" "fb" ON (("fb"."id" = "fs"."batch_id")))
          GROUP BY "fs"."system_id", "fs"."date"
        ), "anchors" AS (
         SELECT "sampling_anchor"."system_id",
            "sampling_anchor"."anchor_date",
            "sampling_anchor"."abw_g",
            "sampling_anchor"."anchor_rank"
           FROM "sampling_anchor"
        UNION ALL
         SELECT "transfer_anchor"."system_id",
            "transfer_anchor"."anchor_date",
            "transfer_anchor"."abw_g",
            "transfer_anchor"."anchor_rank"
           FROM "transfer_anchor"
          WHERE ("transfer_anchor"."abw_g" IS NOT NULL)
        UNION ALL
         SELECT "stocking_anchor"."system_id",
            "stocking_anchor"."anchor_date",
            "stocking_anchor"."abw_g",
            "stocking_anchor"."anchor_rank"
           FROM "stocking_anchor"
          WHERE ("stocking_anchor"."abw_g" IS NOT NULL)
        ), "last_anchor" AS (
         SELECT DISTINCT ON ("r"."system_id", "r"."inventory_date") "r"."system_id",
            "r"."inventory_date",
            "a"."anchor_date" AS "last_sampling_date",
            "a"."abw_g" AS "abw_last_sampling"
           FROM ("running" "r"
             LEFT JOIN "anchors" "a" ON ((("a"."system_id" = "r"."system_id") AND ("a"."anchor_date" <= "r"."inventory_date"))))
          ORDER BY "r"."system_id", "r"."inventory_date", "a"."anchor_date" DESC NULLS LAST, "a"."anchor_rank"
        ), "system_dims" AS (
         SELECT "s"."id" AS "system_id",
            NULLIF("s"."volume", (0)::double precision) AS "system_volume"
           FROM "public"."system" "s"
        ), "facts" AS (
         SELECT "row_number"() OVER (ORDER BY "r"."system_id", "r"."inventory_date") AS "id",
            "r"."inventory_date" AS "fact_date",
            "r"."inventory_date",
            "r"."system_id",
            "r"."farm_id",
            "r"."system_name",
                CASE
                    WHEN (GREATEST("r"."number_of_fish", (0)::double precision) > (0)::double precision) THEN ("lineage"."cycle_id")::bigint
                    ELSE NULL::bigint
                END AS "production_cycle_id",
            "r"."growth_stage",
            "r"."system_is_active",
            GREATEST("r"."number_of_fish", (0)::double precision) AS "number_of_fish",
            "r"."number_of_fish_stocked",
            "r"."number_of_fish_transferred_in",
            "r"."number_of_fish_mortality_aggregated",
            "r"."number_of_fish_mortality",
            "r"."number_of_fish_transferred_out",
            "r"."number_of_fish_harvested",
            "r"."feeding_amount",
            "r"."feeding_amount_aggregated",
            "la"."last_sampling_date",
            "la"."abw_last_sampling",
            (("la"."abw_last_sampling" * GREATEST("r"."number_of_fish", (0)::double precision)) / (1000.0)::double precision) AS "biomass_last_sampling",
            "sd"."system_volume"
           FROM ((("running" "r"
             LEFT JOIN "last_anchor" "la" ON ((("la"."system_id" = "r"."system_id") AND ("la"."inventory_date" = "r"."inventory_date"))))
             LEFT JOIN "system_dims" "sd" ON (("sd"."system_id" = "r"."system_id")))
             LEFT JOIN LATERAL "public"."resolve_cycle_batch_for_system_date"("r"."system_id", "r"."inventory_date") "lineage"("cycle_id", "batch_id") ON (true))
        )
 SELECT "f"."id",
    "f"."fact_date",
    "f"."inventory_date",
    "f"."system_id",
    "f"."farm_id",
    "f"."system_name",
    "f"."production_cycle_id",
    "f"."growth_stage",
    "f"."system_is_active",
    "f"."number_of_fish",
    "f"."number_of_fish_stocked",
    "f"."number_of_fish_transferred_in",
    "f"."number_of_fish_mortality_aggregated",
    "f"."number_of_fish_mortality",
    "f"."number_of_fish_transferred_out",
    "f"."number_of_fish_harvested",
    "f"."feeding_amount",
    "f"."feeding_amount_aggregated",
    "f"."last_sampling_date",
    "f"."abw_last_sampling",
    "f"."biomass_last_sampling",
        CASE
            WHEN ("f"."biomass_last_sampling" > (0)::double precision) THEN (("f"."feeding_amount" / "f"."biomass_last_sampling") * (100.0)::double precision)
            ELSE NULL::double precision
        END AS "feeding_rate",
    "f"."system_volume",
        CASE
            WHEN (("f"."system_volume" > (0)::double precision) AND ("f"."biomass_last_sampling" IS NOT NULL)) THEN (GREATEST("f"."biomass_last_sampling", (0)::double precision) / "f"."system_volume")
            ELSE NULL::double precision
        END AS "biomass_density",
        CASE
            WHEN ("f"."number_of_fish" > (0)::double precision) THEN (("f"."number_of_fish_mortality" / "f"."number_of_fish") * (100.0)::double precision)
            ELSE (0)::double precision
        END AS "mortality_rate",
    ("f"."last_sampling_date" IS NOT NULL) AS "has_sampling",
    ("f"."abw_last_sampling" IS NOT NULL) AS "has_abw",
    ("f"."number_of_fish" IS NOT NULL) AS "has_inventory_count",
    ("f"."feeding_amount" > (0)::double precision) AS "has_feed_record",
    (((
        CASE
            WHEN ("f"."last_sampling_date" IS NOT NULL) THEN 1
            ELSE 0
        END +
        CASE
            WHEN ("f"."abw_last_sampling" IS NOT NULL) THEN 1
            ELSE 0
        END) +
        CASE
            WHEN ("f"."number_of_fish" IS NOT NULL) THEN 1
            ELSE 0
        END) +
        CASE
            WHEN ("f"."feeding_amount" > (0)::double precision) THEN 1
            ELSE 0
        END) AS "data_completeness_score"
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


CREATE MATERIALIZED VIEW "analytics"."production_summary" AS
 WITH "real_events" AS (
         SELECT "fs"."cycle_id",
            "fs"."system_id",
            "fs"."date",
            'stocking'::"text" AS "activity",
            10 AS "activity_rank",
            ("sum"("fs"."number_of_fish_stocking"))::double precision AS "number_of_fish_stocked",
            "sum"("fs"."total_weight_stocking") AS "total_weight_stocked",
            (0)::double precision AS "total_feed_amount_period",
            (0)::double precision AS "daily_mortality_count",
            (0)::double precision AS "number_of_fish_transfer_out",
            (0)::double precision AS "total_weight_transfer_out",
            (0)::double precision AS "number_of_fish_transfer_in",
            (0)::double precision AS "total_weight_transfer_in",
            (0)::double precision AS "number_of_fish_harvested",
            (0)::double precision AS "total_weight_harvested"
           FROM "public"."fish_stocking" "fs"
          WHERE ("fs"."cycle_id" IS NOT NULL)
          GROUP BY "fs"."cycle_id", "fs"."system_id", "fs"."date"
        UNION ALL
         SELECT "fr"."cycle_id",
            "fr"."system_id",
            "fr"."date",
            'feeding'::"text" AS "activity",
            20 AS "activity_rank",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            "sum"("fr"."feeding_amount") AS "sum",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8"
           FROM "public"."feeding_record" "fr"
          WHERE ("fr"."cycle_id" IS NOT NULL)
          GROUP BY "fr"."cycle_id", "fr"."system_id", "fr"."date"
        UNION ALL
         SELECT "fsw"."cycle_id",
            "fsw"."system_id",
            "fsw"."date",
            'sampling'::"text" AS "activity",
            30 AS "activity_rank",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8"
           FROM "public"."fish_sampling_weight" "fsw"
          WHERE ("fsw"."cycle_id" IS NOT NULL)
          GROUP BY "fsw"."cycle_id", "fsw"."system_id", "fsw"."date"
        UNION ALL
         SELECT "fm"."cycle_id",
            "fm"."system_id",
            "fm"."date",
            'mortality'::"text" AS "activity",
            40 AS "activity_rank",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            ("sum"("fm"."number_of_fish_mortality"))::double precision AS "sum",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8"
           FROM "public"."fish_mortality" "fm"
          WHERE ("fm"."cycle_id" IS NOT NULL)
          GROUP BY "fm"."cycle_id", "fm"."system_id", "fm"."date"
        UNION ALL
         SELECT "ft"."cycle_id",
            "ft"."origin_system_id" AS "system_id",
            "ft"."date",
            'transfer out'::"text" AS "activity",
            50 AS "activity_rank",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            "sum"("ft"."number_of_fish_transfer") AS "sum",
            "sum"("public"."transfer_weight_kg"("ft"."total_weight_transfer", "ft"."number_of_fish_transfer", "ft"."abw")) AS "sum",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8"
           FROM "public"."fish_transfer" "ft"
          WHERE (("ft"."origin_system_id" IS NOT NULL) AND ("ft"."cycle_id" IS NOT NULL) AND "public"."transfer_impacts_efcr"("ft"."transfer_type", "ft"."origin_system_id", "ft"."target_system_id"))
          GROUP BY "ft"."cycle_id", "ft"."origin_system_id", "ft"."date"
        UNION ALL
         SELECT "ft"."cycle_id",
            "ft"."target_system_id" AS "system_id",
            "ft"."date",
            'transfer in'::"text" AS "activity",
            60 AS "activity_rank",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            "sum"("ft"."number_of_fish_transfer") AS "sum",
            "sum"("public"."transfer_weight_kg"("ft"."total_weight_transfer", "ft"."number_of_fish_transfer", "ft"."abw")) AS "sum",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8"
           FROM "public"."fish_transfer" "ft"
          WHERE (("ft"."target_system_id" IS NOT NULL) AND ("ft"."cycle_id" IS NOT NULL) AND "public"."transfer_impacts_efcr"("ft"."transfer_type", "ft"."origin_system_id", "ft"."target_system_id"))
          GROUP BY "ft"."cycle_id", "ft"."target_system_id", "ft"."date"
        UNION ALL
         SELECT "fh"."cycle_id",
            "fh"."system_id",
            "fh"."date",
                CASE
                    WHEN ("fh"."type_of_harvest" = 'final'::"public"."type_of_harvest") THEN 'final harvest'::"text"
                    ELSE 'partial harvest'::"text"
                END AS "activity",
                CASE
                    WHEN ("fh"."type_of_harvest" = 'final'::"public"."type_of_harvest") THEN 80
                    ELSE 70
                END AS "activity_rank",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            ("sum"(COALESCE("fh"."number_of_fish_harvest", (0)::bigint)))::double precision AS "sum",
            "sum"("fh"."total_weight_harvest") AS "sum"
           FROM "public"."fish_harvest" "fh"
          WHERE ("fh"."cycle_id" IS NOT NULL)
          GROUP BY "fh"."cycle_id", "fh"."system_id", "fh"."date", "fh"."type_of_harvest"
        UNION ALL
         SELECT "lineage"."cycle_id",
            "wq"."system_id",
            "wq"."date",
            'water quality'::"text" AS "activity",
            90 AS "activity_rank",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8",
            (0)::double precision AS "float8"
           FROM ("public"."water_quality_measurement" "wq"
             JOIN LATERAL "public"."resolve_cycle_batch_for_system_date"("wq"."system_id", "wq"."date") "lineage"("cycle_id", "batch_id") ON (true))
          GROUP BY "lineage"."cycle_id", "wq"."system_id", "wq"."date"
        ), "events_with_cycles" AS (
         SELECT "re"."cycle_id",
            "pc"."ongoing_cycle",
            "re"."date",
            "re"."system_id",
            "s"."name" AS "system_name",
            ("s"."growth_stage")::"text" AS "growth_stage",
            "re"."activity",
            "re"."activity_rank",
            "re"."number_of_fish_stocked",
            "re"."total_weight_stocked",
            "re"."total_feed_amount_period",
            "re"."daily_mortality_count",
            "re"."number_of_fish_transfer_out",
            "re"."total_weight_transfer_out",
            "re"."number_of_fish_transfer_in",
            "re"."total_weight_transfer_in",
            "re"."number_of_fish_harvested",
            "re"."total_weight_harvested"
           FROM (("real_events" "re"
             JOIN "public"."production_cycle" "pc" ON (("pc"."cycle_id" = "re"."cycle_id")))
             JOIN "public"."system" "s" ON (("s"."id" = "re"."system_id")))
        ), "events_with_facts" AS (
         SELECT "e"."cycle_id",
            "e"."ongoing_cycle",
            "e"."date",
            "e"."system_id",
            "e"."system_name",
            "e"."growth_stage",
            "e"."activity",
            "e"."activity_rank",
            "e"."number_of_fish_stocked",
            "e"."total_weight_stocked",
            "e"."total_feed_amount_period",
            "e"."daily_mortality_count",
            "e"."number_of_fish_transfer_out",
            "e"."total_weight_transfer_out",
            "e"."number_of_fish_transfer_in",
            "e"."total_weight_transfer_in",
            "e"."number_of_fish_harvested",
            "e"."total_weight_harvested",
            "dsf"."abw_last_sampling" AS "average_body_weight",
            "dsf"."number_of_fish" AS "number_of_fish_inventory",
            "dsf"."biomass_last_sampling" AS "total_biomass",
            "lag"("dsf"."biomass_last_sampling") OVER (PARTITION BY "e"."cycle_id" ORDER BY "e"."date", "e"."activity_rank", "e"."system_id") AS "previous_total_biomass"
           FROM ("events_with_cycles" "e"
             LEFT JOIN "analytics"."daily_system_facts" "dsf" ON ((("dsf"."system_id" = "e"."system_id") AND ("dsf"."inventory_date" = "e"."date"))))
        ), "consolidated" AS (
         SELECT "e"."cycle_id",
            "e"."ongoing_cycle",
            "e"."date",
            "e"."system_id",
            "e"."system_name",
            "e"."growth_stage",
            "e"."activity",
            "e"."activity_rank",
            "e"."number_of_fish_stocked",
            "e"."total_weight_stocked",
            "e"."total_feed_amount_period",
            "e"."daily_mortality_count",
            "e"."number_of_fish_transfer_out",
            "e"."total_weight_transfer_out",
            "e"."number_of_fish_transfer_in",
            "e"."total_weight_transfer_in",
            "e"."number_of_fish_harvested",
            "e"."total_weight_harvested",
            "e"."average_body_weight",
            "e"."number_of_fish_inventory",
            "e"."total_biomass",
            "e"."previous_total_biomass",
                CASE
                    WHEN (("e"."previous_total_biomass" IS NULL) OR ("e"."total_biomass" IS NULL)) THEN (0)::double precision
                    ELSE ("e"."total_biomass" - "e"."previous_total_biomass")
                END AS "biomass_increase_period",
                CASE
                    WHEN (("e"."previous_total_biomass" IS NULL) OR ("e"."total_biomass" IS NULL)) THEN NULL::double precision
                    ELSE ((((("e"."total_biomass" - "e"."previous_total_biomass") + "e"."total_weight_transfer_out") - "e"."total_weight_transfer_in") + "e"."total_weight_harvested") - "e"."total_weight_stocked")
                END AS "efcr_denominator_period"
           FROM "events_with_facts" "e"
        ), "final_rows" AS (
         SELECT "c"."cycle_id",
            "c"."ongoing_cycle",
            "c"."date",
            "c"."system_id",
            "c"."system_name",
            "c"."growth_stage",
            "c"."activity",
            "c"."activity_rank",
            "c"."number_of_fish_stocked",
            "c"."total_weight_stocked",
            "c"."total_feed_amount_period",
            "c"."daily_mortality_count",
            "c"."number_of_fish_transfer_out",
            "c"."total_weight_transfer_out",
            "c"."number_of_fish_transfer_in",
            "c"."total_weight_transfer_in",
            "c"."number_of_fish_harvested",
            "c"."total_weight_harvested",
            "c"."average_body_weight",
            "c"."number_of_fish_inventory",
            "c"."total_biomass",
            "c"."previous_total_biomass",
            "c"."biomass_increase_period",
            "c"."efcr_denominator_period",
            "sum"("c"."total_feed_amount_period") OVER (PARTITION BY "c"."cycle_id" ORDER BY "c"."date", "c"."activity_rank", "c"."system_id") AS "total_feed_amount_aggregated",
            "sum"("c"."biomass_increase_period") OVER (PARTITION BY "c"."cycle_id" ORDER BY "c"."date", "c"."activity_rank", "c"."system_id") AS "biomass_increase_aggregated",
            "sum"("c"."daily_mortality_count") OVER (PARTITION BY "c"."cycle_id" ORDER BY "c"."date", "c"."activity_rank", "c"."system_id") AS "cumulative_mortality",
            "sum"("c"."total_weight_transfer_out") OVER (PARTITION BY "c"."cycle_id" ORDER BY "c"."date", "c"."activity_rank", "c"."system_id") AS "total_weight_transfer_out_aggregated",
            "sum"("c"."total_weight_transfer_in") OVER (PARTITION BY "c"."cycle_id" ORDER BY "c"."date", "c"."activity_rank", "c"."system_id") AS "total_weight_transfer_in_aggregated",
            "sum"("c"."total_weight_harvested") OVER (PARTITION BY "c"."cycle_id" ORDER BY "c"."date", "c"."activity_rank", "c"."system_id") AS "total_weight_harvested_aggregated",
            "sum"("c"."total_weight_stocked") OVER (PARTITION BY "c"."cycle_id" ORDER BY "c"."date", "c"."activity_rank", "c"."system_id") AS "total_weight_stocked_aggregated",
            "sum"(COALESCE("c"."efcr_denominator_period", (0)::double precision)) OVER (PARTITION BY "c"."cycle_id" ORDER BY "c"."date", "c"."activity_rank", "c"."system_id") AS "efcr_denominator_aggregated"
           FROM "consolidated" "c"
        )
 SELECT "f"."cycle_id",
    "f"."date",
    "f"."system_id",
    "f"."system_name",
    "f"."growth_stage",
    "f"."ongoing_cycle",
    "f"."average_body_weight",
    "f"."number_of_fish_inventory",
    "f"."total_feed_amount_period",
    "f"."activity",
    "f"."activity_rank",
    "f"."total_biomass",
    "f"."biomass_increase_period",
    "f"."total_feed_amount_aggregated",
    "f"."biomass_increase_aggregated",
    "f"."daily_mortality_count",
    "f"."cumulative_mortality",
    "f"."number_of_fish_transfer_out",
    "f"."total_weight_transfer_out",
    "f"."total_weight_transfer_out_aggregated",
    "f"."number_of_fish_transfer_in",
    "f"."total_weight_transfer_in",
    "f"."total_weight_transfer_in_aggregated",
    "f"."number_of_fish_harvested",
    "f"."total_weight_harvested",
    "f"."total_weight_harvested_aggregated",
    "f"."number_of_fish_stocked",
    "f"."total_weight_stocked",
    "f"."total_weight_stocked_aggregated",
        CASE
            WHEN ("f"."efcr_denominator_period" > (0)::double precision) THEN ("f"."total_feed_amount_period" / "f"."efcr_denominator_period")
            ELSE NULL::double precision
        END AS "efcr_period",
        CASE
            WHEN ("f"."efcr_denominator_aggregated" > (0)::double precision) THEN ("f"."total_feed_amount_aggregated" / "f"."efcr_denominator_aggregated")
            ELSE NULL::double precision
        END AS "efcr_aggregated"
   FROM "final_rows" "f"
  ORDER BY "f"."cycle_id", "f"."date", "f"."activity_rank", "f"."system_id"
  WITH NO DATA;


ALTER TABLE "analytics"."production_summary" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "analytics"."efcr_period_last_sampling_view" AS
 WITH "sampling_points" AS (
         SELECT "ps"."system_id",
            "ps"."cycle_id",
            "ps"."date" AS "sampling_date",
            "ps"."total_feed_amount_aggregated" AS "feed_cumulative",
            "ps"."biomass_increase_aggregated" AS "growth_cumulative",
            "ps"."total_biomass" AS "biomass_at_sampling",
            "lag"("ps"."total_feed_amount_aggregated") OVER (PARTITION BY "ps"."cycle_id" ORDER BY "ps"."date") AS "prev_feed_cumulative",
            "lag"("ps"."biomass_increase_aggregated") OVER (PARTITION BY "ps"."cycle_id" ORDER BY "ps"."date") AS "prev_growth_cumulative"
           FROM "analytics"."production_summary" "ps"
          WHERE ("ps"."activity" = 'sampling'::"text")
        )
 SELECT "dsf"."system_id",
    "dsf"."farm_id",
    "dsf"."inventory_date",
    "dsf"."last_sampling_date",
        CASE
            WHEN (("sp"."growth_cumulative" - COALESCE("sp"."prev_growth_cumulative", (0)::double precision)) > (0)::double precision) THEN "round"(((("sp"."feed_cumulative" - COALESCE("sp"."prev_feed_cumulative", (0)::double precision)) / ("sp"."growth_cumulative" - COALESCE("sp"."prev_growth_cumulative", (0)::double precision))))::numeric, 4)
            ELSE NULL::numeric
        END AS "efcr_period_last_sampling",
        CASE
            WHEN ("sp"."growth_cumulative" > (0)::double precision) THEN "round"((("sp"."feed_cumulative" / "sp"."growth_cumulative"))::numeric, 4)
            ELSE NULL::numeric
        END AS "efcr_aggregated_last_sampling",
    ("dsf"."biomass_last_sampling")::numeric AS "biomass_last_sampling"
   FROM ("analytics"."daily_system_facts" "dsf"
     JOIN "sampling_points" "sp" ON ((("sp"."system_id" = "dsf"."system_id") AND ("sp"."cycle_id" = "dsf"."production_cycle_id") AND ("sp"."sampling_date" = "dsf"."last_sampling_date"))))
  WHERE ("dsf"."last_sampling_date" IS NOT NULL)
  ORDER BY "dsf"."system_id", "dsf"."inventory_date"
  WITH NO DATA;


ALTER TABLE "analytics"."efcr_period_last_sampling_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "energy"."live" (
    "id" bigint NOT NULL,
    "farm_id" "uuid" NOT NULL,
    "system_id" bigint,
    "source_id" "text",
    "source_type" "text" DEFAULT 'mqtt_rs485'::"text" NOT NULL,
    "meter_id" "text" NOT NULL,
    "meter_name" "text",
    "measured_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "power_kw" numeric,
    "pv_power_w" numeric,
    "load_power_w" numeric,
    "battery_power_w" numeric,
    "battery_power_kw" numeric,
    "battery_state_of_charge_pct" numeric,
    "mppt1_power_w" numeric,
    "mppt2_power_w" numeric,
    "mppt3_power_w" numeric,
    "mppt4_power_w" numeric,
    "energy_today_kwh" numeric,
    "energy_total_kwh" numeric,
    "voltage_v" numeric,
    "current_a" numeric,
    "frequency_hz" numeric,
    "power_factor" numeric,
    "status" "text" DEFAULT 'online'::"text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "energy"."live" OWNER TO "postgres";


ALTER TABLE "energy"."live" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "energy"."live_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "energy"."timeseries" (
    "id" bigint NOT NULL,
    "farm_id" "uuid" NOT NULL,
    "system_id" bigint,
    "source_id" "text",
    "source_type" "text" DEFAULT 'mqtt_rs485'::"text" NOT NULL,
    "measured_at" timestamp with time zone NOT NULL,
    "power_kw" numeric,
    "pv_power_w" numeric,
    "load_power_w" numeric,
    "battery_power_w" numeric,
    "battery_power_kw" numeric,
    "battery_state_of_charge_pct" numeric,
    "mppt1_power_w" numeric,
    "mppt2_power_w" numeric,
    "mppt3_power_w" numeric,
    "mppt4_power_w" numeric,
    "energy_kwh" numeric,
    "energy_import_kwh" numeric,
    "energy_export_kwh" numeric,
    "solar_generation_kwh" numeric,
    "grid_import_kwh" numeric,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "energy"."timeseries" OWNER TO "postgres";


ALTER TABLE "energy"."timeseries" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "energy"."timeseries_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "private"."farm_user_invitation" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "farm_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "invited_by" "uuid",
    "invited_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_sent_at" timestamp with time zone,
    "accepted_at" timestamp with time zone,
    "revoked_at" timestamp with time zone
);


ALTER TABLE "private"."farm_user_invitation" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_affected_systems" (
    "system_id" bigint NOT NULL,
    "min_affected_date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
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
    "feed_supplier" bigint NOT NULL,
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
    "alert_thresholds" "jsonb",
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



ALTER TABLE ONLY "energy"."live"
    ADD CONSTRAINT "live_farm_id_meter_id_key" UNIQUE ("farm_id", "meter_id");



ALTER TABLE ONLY "energy"."live"
    ADD CONSTRAINT "live_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "energy"."timeseries"
    ADD CONSTRAINT "timeseries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "private"."farm_user_invitation"
    ADD CONSTRAINT "farm_user_invitation_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."_affected_systems"
    ADD CONSTRAINT "_affected_systems_pkey" PRIMARY KEY ("system_id");



ALTER TABLE ONLY "public"."alert_threshold"
    ADD CONSTRAINT "alert_threshold_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_config"
    ADD CONSTRAINT "app_config_pkey" PRIMARY KEY ("key");



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



ALTER TABLE ONLY "public"."feeding_record"
    ADD CONSTRAINT "feeding_record_local_id_key" UNIQUE ("local_id");



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
    ADD CONSTRAINT "fish_harvest_local_id_key" UNIQUE ("local_id");



ALTER TABLE ONLY "public"."fish_harvest"
    ADD CONSTRAINT "fish_harvest_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."fish_harvest"
    ADD CONSTRAINT "fish_harvest_positive_count" CHECK ((("number_of_fish_harvest" IS NOT NULL) AND ("number_of_fish_harvest" > 0))) NOT VALID;



ALTER TABLE "public"."fish_harvest"
    ADD CONSTRAINT "fish_harvest_positive_weight" CHECK (("total_weight_harvest" > (0)::double precision)) NOT VALID;



ALTER TABLE ONLY "public"."fish_mortality"
    ADD CONSTRAINT "fish_mortality_local_id_key" UNIQUE ("local_id");



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



ALTER TABLE ONLY "public"."fish_stocking"
    ADD CONSTRAINT "fish_stocking_local_id_key" UNIQUE ("local_id");



ALTER TABLE "public"."fish_transfer"
    ADD CONSTRAINT "fish_transfer_batch_required" CHECK (("batch_id" IS NOT NULL)) NOT VALID;



ALTER TABLE "public"."fish_transfer"
    ADD CONSTRAINT "fish_transfer_cycle_required" CHECK (("cycle_id" IS NOT NULL)) NOT VALID;



ALTER TABLE ONLY "public"."fish_transfer"
    ADD CONSTRAINT "fish_transfer_local_id_key" UNIQUE ("local_id");



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



CREATE UNIQUE INDEX "daily_fish_inventory_table_id_idx" ON "analytics"."daily_fish_inventory_table" USING "btree" ("id");



CREATE INDEX "idx_energy_live_farm_system" ON "energy"."live" USING "btree" ("farm_id", "system_id");



CREATE INDEX "idx_energy_live_measured_at" ON "energy"."live" USING "btree" ("measured_at" DESC);



CREATE INDEX "idx_energy_timeseries_farm_measured" ON "energy"."timeseries" USING "btree" ("farm_id", "measured_at" DESC);



CREATE INDEX "idx_energy_timeseries_farm_system" ON "energy"."timeseries" USING "btree" ("farm_id", "system_id");



CREATE INDEX "idx_energy_timeseries_measured_at" ON "energy"."timeseries" USING "btree" ("measured_at" DESC);



CREATE UNIQUE INDEX "farm_user_invitation_active_unique" ON "private"."farm_user_invitation" USING "btree" ("farm_id", "email") WHERE (("revoked_at" IS NULL) AND ("accepted_at" IS NULL));



CREATE UNIQUE INDEX "farm_user_farm_id_user_id_key" ON "public"."farm_user" USING "btree" ("farm_id", "user_id");



CREATE UNIQUE INDEX "feed_supplier_identity_idx" ON "public"."feed_supplier" USING "btree" ("lower"(TRIM(BOTH FROM "company_name")), "lower"(TRIM(BOTH FROM "location_country")), "lower"(COALESCE(TRIM(BOTH FROM "location_city"), ''::"text")));



CREATE UNIQUE INDEX "feed_type_identity_idx" ON "public"."feed_type" USING "btree" (COALESCE("farm_id", '00000000-0000-0000-0000-000000000000'::"uuid"), "feed_supplier", "lower"(COALESCE(TRIM(BOTH FROM "feed_line"), ''::"text")), "feed_category", "feed_pellet_size", COALESCE("crude_protein_percentage", '-1'::double precision), COALESCE("crude_fat_percentage", '-1'::double precision));



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



CREATE INDEX "idx_feed_type_feed_supplier" ON "public"."feed_type" USING "btree" ("feed_supplier");



CREATE INDEX "idx_feeding_record_response_date" ON "public"."feeding_record" USING "btree" ("system_id", "date", "feeding_response");



CREATE INDEX "idx_feeding_record_system_date" ON "public"."feeding_record" USING "btree" ("system_id", "date");



CREATE INDEX "idx_fh_system_date" ON "public"."fish_harvest" USING "btree" ("system_id", "date");



CREATE INDEX "idx_fingerling_batch_farm_id" ON "public"."fingerling_batch" USING "btree" ("farm_id");



CREATE INDEX "idx_fingerling_batch_system_id" ON "public"."fingerling_batch" USING "btree" ("system_id");



CREATE INDEX "idx_fish_harvest_batch_id" ON "public"."fish_harvest" USING "btree" ("batch_id");



CREATE INDEX "idx_fish_harvest_system_date_desc" ON "public"."fish_harvest" USING "btree" ("system_id", "date" DESC);



CREATE INDEX "idx_fish_mortality_batch_id" ON "public"."fish_mortality" USING "btree" ("batch_id");



CREATE INDEX "idx_fish_mortality_system_date" ON "public"."fish_mortality" USING "btree" ("system_id", "date");



CREATE INDEX "idx_fish_sampling_system_date" ON "public"."fish_sampling_weight" USING "btree" ("system_id", "date");



CREATE INDEX "idx_fish_transfer_type_date_desc" ON "public"."fish_transfer" USING "btree" ("transfer_type", "date" DESC);



CREATE INDEX "idx_fs_system_date" ON "public"."fish_stocking" USING "btree" ("system_id", "date");



CREATE INDEX "idx_ft_origin_date" ON "public"."fish_transfer" USING "btree" ("origin_system_id", "date");



CREATE INDEX "idx_ft_target_date" ON "public"."fish_transfer" USING "btree" ("target_system_id", "date");



CREATE INDEX "idx_norm_review_farm_unresolved" ON "public"."normalization_review" USING "btree" ("farm_id", "resolved", "created_at" DESC);



CREATE INDEX "idx_raw_uploads_farm_status" ON "public"."raw_uploads" USING "btree" ("farm_id", "status", "uploaded_at" DESC);



CREATE INDEX "idx_system_farm_id" ON "public"."system" USING "btree" ("farm_id");



CREATE INDEX "idx_system_farm_id_id" ON "public"."system" USING "btree" ("farm_id", "id");



CREATE INDEX "idx_system_id_farm_id" ON "public"."system" USING "btree" ("id", "farm_id");



CREATE INDEX "idx_wqm_system_date_time" ON "public"."water_quality_measurement" USING "btree" ("system_id", "date", "time");



CREATE INDEX "idx_wqm_system_id" ON "public"."water_quality_measurement" USING "btree" ("system_id");



CREATE INDEX "idx_wqm_system_measured_at" ON "public"."water_quality_measurement" USING "btree" ("system_id", "measured_at");



CREATE UNIQUE INDEX "system_active_name_farm_unique" ON "public"."system" USING "btree" ("farm_id", "name") WHERE ("is_active" IS TRUE);



CREATE UNIQUE INDEX "uix_water_quality_local_id" ON "public"."water_quality_measurement" USING "btree" ("local_id") WHERE ("local_id" IS NOT NULL);



CREATE UNIQUE INDEX "uq_one_active_cycle_per_system" ON "public"."production_cycle" USING "btree" ("system_id") WHERE ("ongoing_cycle" = true);



CREATE UNIQUE INDEX "water_quality_measurement_local_id_uidx" ON "public"."water_quality_measurement" USING "btree" ("local_id");



CREATE OR REPLACE TRIGGER "after_feeding_record_update_inventory" AFTER INSERT OR DELETE OR UPDATE ON "public"."feeding_record" FOR EACH ROW EXECUTE FUNCTION "public"."after_event_update_inventory"();



CREATE OR REPLACE TRIGGER "after_fish_harvest_update_inventory" AFTER INSERT OR DELETE OR UPDATE ON "public"."fish_harvest" FOR EACH ROW EXECUTE FUNCTION "public"."after_event_update_inventory"();



CREATE OR REPLACE TRIGGER "after_fish_mortality_update_inventory" AFTER INSERT OR DELETE OR UPDATE ON "public"."fish_mortality" FOR EACH ROW EXECUTE FUNCTION "public"."after_event_update_inventory"();



CREATE OR REPLACE TRIGGER "after_fish_sampling_weight_update_inventory" AFTER INSERT OR DELETE OR UPDATE ON "public"."fish_sampling_weight" FOR EACH ROW EXECUTE FUNCTION "public"."after_event_update_inventory"();



CREATE OR REPLACE TRIGGER "after_fish_stocking_update_inventory" AFTER INSERT OR DELETE OR UPDATE ON "public"."fish_stocking" FOR EACH ROW EXECUTE FUNCTION "public"."after_event_update_inventory"();



CREATE OR REPLACE TRIGGER "after_fish_transfer_update_inventory" AFTER INSERT OR DELETE OR UPDATE ON "public"."fish_transfer" FOR EACH ROW EXECUTE FUNCTION "public"."after_event_update_inventory"();



CREATE OR REPLACE TRIGGER "prevent_system_name_change" BEFORE UPDATE ON "public"."system" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_system_name_update"();



CREATE OR REPLACE TRIGGER "refresh_after_system" AFTER INSERT OR DELETE OR UPDATE ON "public"."system" FOR EACH ROW EXECUTE FUNCTION "public"."refresh_after_system_if_needed"();



CREATE OR REPLACE TRIGGER "touch_affected_systems_updated_at" BEFORE UPDATE ON "public"."_affected_systems" FOR EACH ROW EXECUTE FUNCTION "public"."touch_affected_systems_updated_at"();



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



ALTER TABLE ONLY "energy"."live"
    ADD CONSTRAINT "live_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id");



ALTER TABLE ONLY "energy"."live"
    ADD CONSTRAINT "live_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id");



ALTER TABLE ONLY "energy"."timeseries"
    ADD CONSTRAINT "timeseries_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id");



ALTER TABLE ONLY "energy"."timeseries"
    ADD CONSTRAINT "timeseries_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id");



ALTER TABLE ONLY "private"."farm_user_invitation"
    ADD CONSTRAINT "farm_user_invitation_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id") ON DELETE CASCADE;



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
    ADD CONSTRAINT "feed_type_feed_supplier_fkey" FOREIGN KEY ("feed_supplier") REFERENCES "public"."feed_supplier"("id") ON UPDATE CASCADE;



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



ALTER TABLE ONLY "public"."fingerling_batch"
    ADD CONSTRAINT "fingerling_batch_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id") ON UPDATE CASCADE;



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



ALTER TABLE ONLY "public"."fish_mortality"
    ADD CONSTRAINT "fish_mortality_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id");



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



CREATE POLICY "fingerling_batch: insert by write roles" ON "public"."fingerling_batch" FOR INSERT TO "authenticated" WITH CHECK ((("farm_id" IS NOT NULL) AND "private"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text"]) AND (("system_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."system" "s"
  WHERE (("s"."id" = "fingerling_batch"."system_id") AND ("s"."farm_id" = "fingerling_batch"."farm_id") AND ("s"."is_active" = true)))))));



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





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "analytics" TO "service_role";









GRANT USAGE ON SCHEMA "private" TO "service_role";
GRANT USAGE ON SCHEMA "private" TO "authenticated";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


























































































































































































































































































































































































































































































































































































































































































































































































REVOKE ALL ON FUNCTION "private"."app_rpc_scope_ok"("p_farm_id" "uuid", "p_system_id" bigint, "p_batch_id" bigint, "p_start_date" "date", "p_end_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."app_rpc_scope_ok"("p_farm_id" "uuid", "p_system_id" bigint, "p_batch_id" bigint, "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "private"."app_rpc_scope_ok"("p_farm_id" "uuid", "p_system_id" bigint, "p_batch_id" bigint, "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "private"."apply_pending_farm_user_invitations"("p_user_id" "uuid", "p_email" "text") TO "service_role";



REVOKE ALL ON FUNCTION "private"."assert_rpc_parameters"("p_farm_id" "uuid", "p_system_id" bigint, "p_batch_id" bigint, "p_start_date" "date", "p_end_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."assert_rpc_parameters"("p_farm_id" "uuid", "p_system_id" bigint, "p_batch_id" bigint, "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "private"."assert_rpc_parameters"("p_farm_id" "uuid", "p_system_id" bigint, "p_batch_id" bigint, "p_start_date" "date", "p_end_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "private"."clamp_rpc_limit"("p_limit" integer, "p_default" integer, "p_max" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."clamp_rpc_limit"("p_limit" integer, "p_default" integer, "p_max" integer) TO "authenticated";
GRANT ALL ON FUNCTION "private"."clamp_rpc_limit"("p_limit" integer, "p_default" integer, "p_max" integer) TO "service_role";



REVOKE ALL ON FUNCTION "private"."has_farm_role"("farm" "uuid", "roles" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."has_farm_role"("farm" "uuid", "roles" "text"[]) TO "service_role";
GRANT ALL ON FUNCTION "private"."has_farm_role"("farm" "uuid", "roles" "text"[]) TO "authenticated";



REVOKE ALL ON FUNCTION "private"."has_farm_role"("farm" "uuid", "roles" "text"[], "_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."has_farm_role"("farm" "uuid", "roles" "text"[], "_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "private"."has_farm_role"("farm" "uuid", "roles" "text"[], "_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."is_farm_member"("farm" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_farm_member"("farm" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "private"."is_farm_member"("farm" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."is_farm_member"("farm" "uuid", "_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_farm_member"("farm" "uuid", "_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "private"."is_farm_member"("farm" "uuid", "_user_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."after_event_update_inventory"() TO "anon";
GRANT ALL ON FUNCTION "public"."after_event_update_inventory"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."after_event_update_inventory"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_cycle_benchmarks"("p_farm_id" "uuid", "p_system_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_cycle_benchmarks"("p_farm_id" "uuid", "p_system_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_cycle_benchmarks"("p_farm_id" "uuid", "p_system_id" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_daily_fish_inventory_rpc"("p_farm_id" "uuid", "p_system_id" bigint, "p_stage" "public"."system_growth_stage", "p_start_date" "date", "p_end_date" "date", "p_cursor_date" "date", "p_cursor_system_id" bigint, "p_order_asc" boolean, "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_daily_fish_inventory_rpc"("p_farm_id" "uuid", "p_system_id" bigint, "p_stage" "public"."system_growth_stage", "p_start_date" "date", "p_end_date" "date", "p_cursor_date" "date", "p_cursor_system_id" bigint, "p_order_asc" boolean, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_daily_fish_inventory_rpc"("p_farm_id" "uuid", "p_system_id" bigint, "p_stage" "public"."system_growth_stage", "p_start_date" "date", "p_end_date" "date", "p_cursor_date" "date", "p_cursor_system_id" bigint, "p_order_asc" boolean, "p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_daily_overlay"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_daily_overlay"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_daily_overlay"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_dashboard_consolidated"("p_farm_id" "uuid", "p_system_id" bigint, "p_stage" "public"."system_growth_stage", "p_start_date" "date", "p_end_date" "date", "p_time_period" "text", "p_limit" integer, "p_order_desc" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_dashboard_consolidated"("p_farm_id" "uuid", "p_system_id" bigint, "p_stage" "public"."system_growth_stage", "p_start_date" "date", "p_end_date" "date", "p_time_period" "text", "p_limit" integer, "p_order_desc" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_dashboard_consolidated"("p_farm_id" "uuid", "p_system_id" bigint, "p_stage" "public"."system_growth_stage", "p_start_date" "date", "p_end_date" "date", "p_time_period" "text", "p_limit" integer, "p_order_desc" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_dashboard_systems"("p_farm_id" "uuid", "p_stage" "public"."system_growth_stage", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_dashboard_systems"("p_farm_id" "uuid", "p_stage" "public"."system_growth_stage", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_dashboard_systems"("p_farm_id" "uuid", "p_stage" "public"."system_growth_stage", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_efcr_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_efcr_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_efcr_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_farm_options_rpc"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_farm_options_rpc"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_farm_options_rpc"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_farm_user_invitations"("p_farm_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_farm_user_invitations"("p_farm_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_farm_user_invitations"("p_farm_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_fcr_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_fcr_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_fcr_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_feed_demand_forecast"("p_farm_id" "uuid", "p_days_ahead" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_feed_demand_forecast"("p_farm_id" "uuid", "p_days_ahead" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_feed_demand_forecast"("p_farm_id" "uuid", "p_days_ahead" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_feed_fcr_intervals"("p_farm_id" "uuid", "p_system_id" bigint, "p_date_from" "date", "p_date_to" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_feed_fcr_intervals"("p_farm_id" "uuid", "p_system_id" bigint, "p_date_from" "date", "p_date_to" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_feed_fcr_intervals"("p_farm_id" "uuid", "p_system_id" bigint, "p_date_from" "date", "p_date_to" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_feed_rate_analysis"("p_farm_id" "uuid", "p_system_id" bigint, "p_date_from" "date", "p_date_to" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_feed_rate_analysis"("p_farm_id" "uuid", "p_system_id" bigint, "p_date_from" "date", "p_date_to" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_feed_rate_analysis"("p_farm_id" "uuid", "p_system_id" bigint, "p_date_from" "date", "p_date_to" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_feed_type_options_rpc"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_feed_type_options_rpc"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_feed_type_options_rpc"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_feed_type_options_rpc"("p_farm_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_feed_type_options_rpc"("p_farm_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_feed_type_options_rpc"("p_farm_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_fingerling_batch_options_rpc"("p_farm_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_fingerling_batch_options_rpc"("p_farm_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_fingerling_batch_options_rpc"("p_farm_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_growth_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_growth_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_growth_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_harvest_forecast"("p_farm_id" "uuid", "p_system_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_harvest_forecast"("p_farm_id" "uuid", "p_system_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_harvest_forecast"("p_farm_id" "uuid", "p_system_id" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_kpi_coverage"("p_farm_id" "uuid", "p_date_from" "date", "p_date_to" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_kpi_coverage"("p_farm_id" "uuid", "p_date_from" "date", "p_date_to" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_kpi_coverage"("p_farm_id" "uuid", "p_date_from" "date", "p_date_to" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_latest_water_quality_status"("p_farm_id" "uuid", "p_system_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_latest_water_quality_status"("p_farm_id" "uuid", "p_system_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_latest_water_quality_status"("p_farm_id" "uuid", "p_system_id" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_production_summary"("p_farm_id" "uuid", "p_system_id" bigint, "p_stage" "public"."system_growth_stage", "p_start_date" "date", "p_end_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_production_summary"("p_farm_id" "uuid", "p_system_id" bigint, "p_stage" "public"."system_growth_stage", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_production_summary"("p_farm_id" "uuid", "p_system_id" bigint, "p_stage" "public"."system_growth_stage", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."api_recommended_actions"("p_farm_id" "uuid", "p_system_id" bigint) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."api_running_stock"("p_farm_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_running_stock"("p_farm_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_running_stock"("p_farm_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_survival_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_survival_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_survival_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_system_health_score"("p_farm_id" "uuid", "p_system_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_system_health_score"("p_farm_id" "uuid", "p_system_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_system_health_score"("p_farm_id" "uuid", "p_system_id" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_system_options_rpc"("p_farm_id" "uuid", "p_stage" "public"."system_growth_stage", "p_active_only" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_system_options_rpc"("p_farm_id" "uuid", "p_stage" "public"."system_growth_stage", "p_active_only" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_system_options_rpc"("p_farm_id" "uuid", "p_stage" "public"."system_growth_stage", "p_active_only" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_system_timeline_bounds"("p_farm_id" "uuid", "p_system_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_system_timeline_bounds"("p_farm_id" "uuid", "p_system_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_system_timeline_bounds"("p_farm_id" "uuid", "p_system_id" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_time_period_bounds_scoped"("p_farm_id" "uuid", "p_time_period" "text", "p_scope" "text", "p_anchor_date" "date", "p_system_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_time_period_bounds_scoped"("p_farm_id" "uuid", "p_time_period" "text", "p_scope" "text", "p_anchor_date" "date", "p_system_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_time_period_bounds_scoped"("p_farm_id" "uuid", "p_time_period" "text", "p_scope" "text", "p_anchor_date" "date", "p_system_id" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."api_water_quality_sync_status"("p_farm_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_water_quality_sync_status"("p_farm_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_water_quality_sync_status"("p_farm_id" "uuid") TO "service_role";



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



REVOKE ALL ON FUNCTION "public"."get_fcr_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_fcr_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_growth_trend"("p_system_id" bigint, "p_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_growth_trend"("p_system_id" bigint, "p_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_running_stock"("p_farm_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_running_stock"("p_farm_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_survival_trend"("p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_survival_trend"("p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_farm_user_invitation_sent"("p_invitation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_farm_user_invitation_sent"("p_invitation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_farm_user_invitation_sent"("p_invitation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_system_name_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_system_name_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_system_name_update"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."process_inventory_queue"("p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_inventory_queue"("p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_inventory_queue"("p_limit" integer) TO "service_role";



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



GRANT ALL ON FUNCTION "public"."request_matview_refresh"() TO "anon";
GRANT ALL ON FUNCTION "public"."request_matview_refresh"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_matview_refresh"() TO "service_role";



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



GRANT ALL ON TABLE "analytics"."daily_fish_inventory_table" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."fingerling_batch" TO "authenticated";
GRANT ALL ON TABLE "public"."fingerling_batch" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."production_cycle" TO "authenticated";
GRANT ALL ON TABLE "public"."production_cycle" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,UPDATE ON TABLE "public"."water_quality_measurement" TO "authenticated";
GRANT ALL ON TABLE "public"."water_quality_measurement" TO "service_role";
























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



GRANT SELECT ON TABLE "public"."api_daily_water_quality_rating" TO "authenticated";
GRANT SELECT ON TABLE "public"."api_daily_water_quality_rating" TO "service_role";



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
































-- Reconcile privileges from linked backend db pull 20260603.

revoke delete on table "public"."_affected_systems" from "anon";

revoke insert on table "public"."_affected_systems" from "anon";

revoke references on table "public"."_affected_systems" from "anon";

revoke select on table "public"."_affected_systems" from "anon";

revoke trigger on table "public"."_affected_systems" from "anon";

revoke truncate on table "public"."_affected_systems" from "anon";

revoke update on table "public"."_affected_systems" from "anon";

revoke delete on table "public"."_affected_systems" from "authenticated";

revoke insert on table "public"."_affected_systems" from "authenticated";

revoke references on table "public"."_affected_systems" from "authenticated";

revoke select on table "public"."_affected_systems" from "authenticated";

revoke trigger on table "public"."_affected_systems" from "authenticated";

revoke truncate on table "public"."_affected_systems" from "authenticated";

revoke update on table "public"."_affected_systems" from "authenticated";

revoke delete on table "public"."alert_threshold" from "anon";

revoke insert on table "public"."alert_threshold" from "anon";

revoke references on table "public"."alert_threshold" from "anon";

revoke select on table "public"."alert_threshold" from "anon";

revoke trigger on table "public"."alert_threshold" from "anon";

revoke truncate on table "public"."alert_threshold" from "anon";

revoke update on table "public"."alert_threshold" from "anon";

revoke truncate on table "public"."alert_threshold" from "authenticated";

revoke delete on table "public"."app_config" from "anon";

revoke insert on table "public"."app_config" from "anon";

revoke references on table "public"."app_config" from "anon";

revoke select on table "public"."app_config" from "anon";

revoke trigger on table "public"."app_config" from "anon";

revoke truncate on table "public"."app_config" from "anon";

revoke update on table "public"."app_config" from "anon";

revoke delete on table "public"."app_config" from "authenticated";

revoke insert on table "public"."app_config" from "authenticated";

revoke truncate on table "public"."app_config" from "authenticated";

revoke update on table "public"."app_config" from "authenticated";

revoke delete on table "public"."daily_water_quality_rating" from "anon";

revoke insert on table "public"."daily_water_quality_rating" from "anon";

revoke references on table "public"."daily_water_quality_rating" from "anon";

revoke select on table "public"."daily_water_quality_rating" from "anon";

revoke trigger on table "public"."daily_water_quality_rating" from "anon";

revoke truncate on table "public"."daily_water_quality_rating" from "anon";

revoke update on table "public"."daily_water_quality_rating" from "anon";

revoke truncate on table "public"."daily_water_quality_rating" from "authenticated";

revoke delete on table "public"."dashboard_time_period" from "anon";

revoke insert on table "public"."dashboard_time_period" from "anon";

revoke references on table "public"."dashboard_time_period" from "anon";

revoke select on table "public"."dashboard_time_period" from "anon";

revoke trigger on table "public"."dashboard_time_period" from "anon";

revoke truncate on table "public"."dashboard_time_period" from "anon";

revoke update on table "public"."dashboard_time_period" from "anon";

revoke delete on table "public"."dashboard_time_period" from "authenticated";

revoke insert on table "public"."dashboard_time_period" from "authenticated";

revoke truncate on table "public"."dashboard_time_period" from "authenticated";

revoke update on table "public"."dashboard_time_period" from "authenticated";

revoke delete on table "public"."energy_alarm_events" from "anon";

revoke insert on table "public"."energy_alarm_events" from "anon";

revoke select on table "public"."energy_alarm_events" from "anon";

revoke update on table "public"."energy_alarm_events" from "anon";

revoke delete on table "public"."energy_meter_timeseries" from "anon";

revoke insert on table "public"."energy_meter_timeseries" from "anon";

revoke select on table "public"."energy_meter_timeseries" from "anon";

revoke update on table "public"."energy_meter_timeseries" from "anon";

revoke delete on table "public"."farm" from "anon";

revoke insert on table "public"."farm" from "anon";

revoke references on table "public"."farm" from "anon";

revoke select on table "public"."farm" from "anon";

revoke trigger on table "public"."farm" from "anon";

revoke truncate on table "public"."farm" from "anon";

revoke update on table "public"."farm" from "anon";

revoke truncate on table "public"."farm" from "authenticated";

revoke delete on table "public"."farm_user" from "anon";

revoke insert on table "public"."farm_user" from "anon";

revoke references on table "public"."farm_user" from "anon";

revoke select on table "public"."farm_user" from "anon";

revoke trigger on table "public"."farm_user" from "anon";

revoke truncate on table "public"."farm_user" from "anon";

revoke update on table "public"."farm_user" from "anon";

revoke truncate on table "public"."farm_user" from "authenticated";

revoke delete on table "public"."feed_inventory" from "anon";

revoke insert on table "public"."feed_inventory" from "anon";

revoke references on table "public"."feed_inventory" from "anon";

revoke select on table "public"."feed_inventory" from "anon";

revoke trigger on table "public"."feed_inventory" from "anon";

revoke truncate on table "public"."feed_inventory" from "anon";

revoke update on table "public"."feed_inventory" from "anon";

revoke references on table "public"."feed_inventory" from "authenticated";

revoke trigger on table "public"."feed_inventory" from "authenticated";

revoke truncate on table "public"."feed_inventory" from "authenticated";

revoke delete on table "public"."feed_supplier" from "anon";

revoke insert on table "public"."feed_supplier" from "anon";

revoke references on table "public"."feed_supplier" from "anon";

revoke select on table "public"."feed_supplier" from "anon";

revoke trigger on table "public"."feed_supplier" from "anon";

revoke truncate on table "public"."feed_supplier" from "anon";

revoke update on table "public"."feed_supplier" from "anon";

revoke truncate on table "public"."feed_supplier" from "authenticated";

revoke delete on table "public"."feed_type" from "anon";

revoke insert on table "public"."feed_type" from "anon";

revoke references on table "public"."feed_type" from "anon";

revoke select on table "public"."feed_type" from "anon";

revoke trigger on table "public"."feed_type" from "anon";

revoke truncate on table "public"."feed_type" from "anon";

revoke update on table "public"."feed_type" from "anon";

revoke truncate on table "public"."feed_type" from "authenticated";

revoke delete on table "public"."feeding_record" from "anon";

revoke insert on table "public"."feeding_record" from "anon";

revoke references on table "public"."feeding_record" from "anon";

revoke select on table "public"."feeding_record" from "anon";

revoke trigger on table "public"."feeding_record" from "anon";

revoke truncate on table "public"."feeding_record" from "anon";

revoke update on table "public"."feeding_record" from "anon";

revoke truncate on table "public"."feeding_record" from "authenticated";

revoke delete on table "public"."feeding_response_level" from "anon";

revoke insert on table "public"."feeding_response_level" from "anon";

revoke references on table "public"."feeding_response_level" from "anon";

revoke select on table "public"."feeding_response_level" from "anon";

revoke trigger on table "public"."feeding_response_level" from "anon";

revoke truncate on table "public"."feeding_response_level" from "anon";

revoke update on table "public"."feeding_response_level" from "anon";

revoke delete on table "public"."feeding_response_level" from "authenticated";

revoke insert on table "public"."feeding_response_level" from "authenticated";

revoke references on table "public"."feeding_response_level" from "authenticated";

revoke trigger on table "public"."feeding_response_level" from "authenticated";

revoke truncate on table "public"."feeding_response_level" from "authenticated";

revoke update on table "public"."feeding_response_level" from "authenticated";

revoke delete on table "public"."fingerling_batch" from "anon";

revoke insert on table "public"."fingerling_batch" from "anon";

revoke references on table "public"."fingerling_batch" from "anon";

revoke select on table "public"."fingerling_batch" from "anon";

revoke trigger on table "public"."fingerling_batch" from "anon";

revoke truncate on table "public"."fingerling_batch" from "anon";

revoke update on table "public"."fingerling_batch" from "anon";

revoke truncate on table "public"."fingerling_batch" from "authenticated";

revoke delete on table "public"."fingerling_supplier" from "anon";

revoke insert on table "public"."fingerling_supplier" from "anon";

revoke references on table "public"."fingerling_supplier" from "anon";

revoke select on table "public"."fingerling_supplier" from "anon";

revoke trigger on table "public"."fingerling_supplier" from "anon";

revoke truncate on table "public"."fingerling_supplier" from "anon";

revoke update on table "public"."fingerling_supplier" from "anon";

revoke truncate on table "public"."fingerling_supplier" from "authenticated";

revoke delete on table "public"."fish_harvest" from "anon";

revoke insert on table "public"."fish_harvest" from "anon";

revoke references on table "public"."fish_harvest" from "anon";

revoke select on table "public"."fish_harvest" from "anon";

revoke trigger on table "public"."fish_harvest" from "anon";

revoke truncate on table "public"."fish_harvest" from "anon";

revoke update on table "public"."fish_harvest" from "anon";

revoke truncate on table "public"."fish_harvest" from "authenticated";

revoke delete on table "public"."fish_mortality" from "anon";

revoke insert on table "public"."fish_mortality" from "anon";

revoke references on table "public"."fish_mortality" from "anon";

revoke select on table "public"."fish_mortality" from "anon";

revoke trigger on table "public"."fish_mortality" from "anon";

revoke truncate on table "public"."fish_mortality" from "anon";

revoke update on table "public"."fish_mortality" from "anon";

revoke truncate on table "public"."fish_mortality" from "authenticated";

revoke delete on table "public"."fish_sampling_weight" from "anon";

revoke insert on table "public"."fish_sampling_weight" from "anon";

revoke references on table "public"."fish_sampling_weight" from "anon";

revoke select on table "public"."fish_sampling_weight" from "anon";

revoke trigger on table "public"."fish_sampling_weight" from "anon";

revoke truncate on table "public"."fish_sampling_weight" from "anon";

revoke update on table "public"."fish_sampling_weight" from "anon";

revoke truncate on table "public"."fish_sampling_weight" from "authenticated";

revoke delete on table "public"."fish_stocking" from "anon";

revoke insert on table "public"."fish_stocking" from "anon";

revoke references on table "public"."fish_stocking" from "anon";

revoke select on table "public"."fish_stocking" from "anon";

revoke trigger on table "public"."fish_stocking" from "anon";

revoke truncate on table "public"."fish_stocking" from "anon";

revoke update on table "public"."fish_stocking" from "anon";

revoke truncate on table "public"."fish_stocking" from "authenticated";

revoke delete on table "public"."fish_transfer" from "anon";

revoke insert on table "public"."fish_transfer" from "anon";

revoke references on table "public"."fish_transfer" from "anon";

revoke select on table "public"."fish_transfer" from "anon";

revoke trigger on table "public"."fish_transfer" from "anon";

revoke truncate on table "public"."fish_transfer" from "anon";

revoke update on table "public"."fish_transfer" from "anon";

revoke truncate on table "public"."fish_transfer" from "authenticated";

revoke delete on table "public"."normalization_review" from "anon";

revoke insert on table "public"."normalization_review" from "anon";

revoke references on table "public"."normalization_review" from "anon";

revoke select on table "public"."normalization_review" from "anon";

revoke trigger on table "public"."normalization_review" from "anon";

revoke truncate on table "public"."normalization_review" from "anon";

revoke update on table "public"."normalization_review" from "anon";

revoke delete on table "public"."organization" from "anon";

revoke insert on table "public"."organization" from "anon";

revoke references on table "public"."organization" from "anon";

revoke select on table "public"."organization" from "anon";

revoke trigger on table "public"."organization" from "anon";

revoke truncate on table "public"."organization" from "anon";

revoke update on table "public"."organization" from "anon";

revoke delete on table "public"."production_cycle" from "anon";

revoke insert on table "public"."production_cycle" from "anon";

revoke references on table "public"."production_cycle" from "anon";

revoke select on table "public"."production_cycle" from "anon";

revoke trigger on table "public"."production_cycle" from "anon";

revoke truncate on table "public"."production_cycle" from "anon";

revoke update on table "public"."production_cycle" from "anon";

revoke truncate on table "public"."production_cycle" from "authenticated";

revoke delete on table "public"."raw_uploads" from "anon";

revoke insert on table "public"."raw_uploads" from "anon";

revoke references on table "public"."raw_uploads" from "anon";

revoke select on table "public"."raw_uploads" from "anon";

revoke trigger on table "public"."raw_uploads" from "anon";

revoke truncate on table "public"."raw_uploads" from "anon";

revoke update on table "public"."raw_uploads" from "anon";

revoke delete on table "public"."system" from "anon";

revoke insert on table "public"."system" from "anon";

revoke references on table "public"."system" from "anon";

revoke select on table "public"."system" from "anon";

revoke trigger on table "public"."system" from "anon";

revoke truncate on table "public"."system" from "anon";

revoke update on table "public"."system" from "anon";

revoke truncate on table "public"."system" from "authenticated";

revoke delete on table "public"."user_profile" from "anon";

revoke insert on table "public"."user_profile" from "anon";

revoke references on table "public"."user_profile" from "anon";

revoke select on table "public"."user_profile" from "anon";

revoke trigger on table "public"."user_profile" from "anon";

revoke truncate on table "public"."user_profile" from "anon";

revoke update on table "public"."user_profile" from "anon";

revoke truncate on table "public"."user_profile" from "authenticated";

revoke delete on table "public"."user_settings" from "anon";

revoke insert on table "public"."user_settings" from "anon";

revoke references on table "public"."user_settings" from "anon";

revoke select on table "public"."user_settings" from "anon";

revoke trigger on table "public"."user_settings" from "anon";

revoke truncate on table "public"."user_settings" from "anon";

revoke update on table "public"."user_settings" from "anon";

revoke delete on table "public"."water_quality_framework" from "anon";

revoke insert on table "public"."water_quality_framework" from "anon";

revoke references on table "public"."water_quality_framework" from "anon";

revoke select on table "public"."water_quality_framework" from "anon";

revoke trigger on table "public"."water_quality_framework" from "anon";

revoke truncate on table "public"."water_quality_framework" from "anon";

revoke update on table "public"."water_quality_framework" from "anon";

revoke delete on table "public"."water_quality_framework" from "authenticated";

revoke insert on table "public"."water_quality_framework" from "authenticated";

revoke truncate on table "public"."water_quality_framework" from "authenticated";

revoke update on table "public"."water_quality_framework" from "authenticated";

revoke delete on table "public"."water_quality_measurement" from "anon";

revoke insert on table "public"."water_quality_measurement" from "anon";

revoke references on table "public"."water_quality_measurement" from "anon";

revoke select on table "public"."water_quality_measurement" from "anon";

revoke trigger on table "public"."water_quality_measurement" from "anon";

revoke truncate on table "public"."water_quality_measurement" from "anon";

revoke update on table "public"."water_quality_measurement" from "anon";

revoke truncate on table "public"."water_quality_measurement" from "authenticated";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "auth_insert_raw_uploads"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'raw-uploads'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "auth_read_raw_uploads"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'raw-uploads'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "auth_update_raw_uploads"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'raw-uploads'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "svc_all_raw_uploads"
  on "storage"."objects"
  as permissive
  for all
  to public
using (((bucket_id = 'raw-uploads'::text) AND (auth.role() = 'service_role'::text)));




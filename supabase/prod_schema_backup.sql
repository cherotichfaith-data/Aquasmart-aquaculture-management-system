


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


CREATE SCHEMA IF NOT EXISTS "archive";


ALTER SCHEMA "archive" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "energy";


ALTER SCHEMA "energy" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "legacy";


ALTER SCHEMA "legacy" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgsodium";






CREATE SCHEMA IF NOT EXISTS "private";


ALTER SCHEMA "private" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "btree_gist" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






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


CREATE TYPE "public"."change_type_enum" AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE'
);


ALTER TYPE "public"."change_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."feed_category" AS ENUM (
    'pre-starter',
    'starter',
    'pre-grower',
    'grower',
    'finisher',
    'broodstock'
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
    '5mm'
);


ALTER TYPE "public"."feed_pellet_size" OWNER TO "postgres";


CREATE TYPE "public"."feeding_response" AS ENUM (
    'excellent',
    'good',
    'ok',
    'poor',
    'not responding'
);


ALTER TYPE "public"."feeding_response" OWNER TO "postgres";


CREATE TYPE "public"."system_growth_stage" AS ENUM (
    'grow_out',
    'nursing'
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
  return v_rows;
end;
$$;


ALTER FUNCTION "private"."apply_pending_farm_user_invitations"("p_user_id" "uuid", "p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION "private"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."after_event_update_inventory"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  affected_date date;
  v_origin_id bigint;
  v_target_id bigint;
  v_system_id bigint;
begin
  affected_date := coalesce(new.date, old.date);

  if tg_table_name = 'fish_transfer' then
    v_origin_id := coalesce(new.origin_system_id, old.origin_system_id);
    v_target_id := coalesce(new.target_system_id, old.target_system_id);

    if v_origin_id is not null then
      insert into public._affected_systems (system_id, min_affected_date)
      values (v_origin_id, affected_date)
      on conflict (system_id)
      do update
        set min_affected_date = least(public._affected_systems.min_affected_date, excluded.min_affected_date);
    end if;

    if v_target_id is not null then
      insert into public._affected_systems (system_id, min_affected_date)
      values (v_target_id, affected_date)
      on conflict (system_id)
      do update
        set min_affected_date = least(public._affected_systems.min_affected_date, excluded.min_affected_date);
    end if;

  else
    v_system_id := coalesce(new.system_id, old.system_id);

    if v_system_id is not null then
      insert into public._affected_systems (system_id, min_affected_date)
      values (v_system_id, affected_date)
      on conflict (system_id)
      do update
        set min_affected_date = least(public._affected_systems.min_affected_date, excluded.min_affected_date);
    end if;
  end if;

  return null;
end;
$$;


ALTER FUNCTION "public"."after_event_update_inventory"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_daily_fish_inventory"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint, "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date", "p_cursor_date" "date" DEFAULT NULL::"date", "p_order_asc" boolean DEFAULT false, "p_limit" integer DEFAULT 5000) RETURNS TABLE("inventory_date" "date", "system_id" bigint, "farm_id" "uuid", "number_of_fish" double precision, "number_of_fish_stocked" double precision, "number_of_fish_transferred_in" double precision, "number_of_fish_mortality_aggregated" double precision, "number_of_fish_mortality" double precision, "number_of_fish_transferred_out" double precision, "number_of_fish_harvested" double precision, "feeding_amount" double precision, "feeding_amount_aggregated" double precision, "last_sampling_date" "date", "abw_last_sampling" double precision, "biomass_last_sampling" double precision, "feeding_rate" double precision, "system_volume" double precision, "biomass_density" double precision, "mortality_rate" double precision, "system_name" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select * from public.api_daily_fish_inventory_rpc(
    p_farm_id => p_farm_id, p_system_id => p_system_id,
    p_start_date => p_start_date, p_end_date => p_end_date,
    p_cursor_date => p_cursor_date, p_cursor_system_id => null,
    p_order_asc => p_order_asc, p_limit => p_limit
  );
$$;


ALTER FUNCTION "public"."api_daily_fish_inventory"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date", "p_cursor_date" "date", "p_order_asc" boolean, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_daily_fish_inventory_rpc"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint, "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date", "p_cursor_date" "date" DEFAULT NULL::"date", "p_cursor_system_id" bigint DEFAULT NULL::bigint, "p_order_asc" boolean DEFAULT false, "p_limit" integer DEFAULT 5000) RETURNS TABLE("inventory_date" "date", "system_id" bigint, "farm_id" "uuid", "number_of_fish" double precision, "number_of_fish_stocked" double precision, "number_of_fish_transferred_in" double precision, "number_of_fish_mortality_aggregated" double precision, "number_of_fish_mortality" double precision, "number_of_fish_transferred_out" double precision, "number_of_fish_harvested" double precision, "feeding_amount" double precision, "feeding_amount_aggregated" double precision, "last_sampling_date" "date", "abw_last_sampling" double precision, "biomass_last_sampling" double precision, "feeding_rate" double precision, "system_volume" double precision, "biomass_density" double precision, "mortality_rate" double precision, "system_name" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  if not public.is_farm_member(p_farm_id) then return; end if;

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
    from public.daily_fish_inventory dfi
    join public.system s on s.id = dfi.system_id
    where s.farm_id = p_farm_id
      and (p_system_id is null or dfi.system_id = p_system_id)
      and (p_start_date is null or dfi.inventory_date >= p_start_date)
      and (p_end_date is null or dfi.inventory_date <= p_end_date)
      and (p_cursor_date is null or (dfi.inventory_date, dfi.system_id) > (p_cursor_date, coalesce(p_cursor_system_id, -1)))
    order by dfi.inventory_date asc, dfi.system_id asc
    limit greatest(1, least(coalesce(p_limit, 5000), 100000));
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
    from public.daily_fish_inventory dfi
    join public.system s on s.id = dfi.system_id
    where s.farm_id = p_farm_id
      and (p_system_id is null or dfi.system_id = p_system_id)
      and (p_start_date is null or dfi.inventory_date >= p_start_date)
      and (p_end_date is null or dfi.inventory_date <= p_end_date)
      and (p_cursor_date is null or (dfi.inventory_date, dfi.system_id) < (p_cursor_date, coalesce(p_cursor_system_id, 9223372036854775807)))
    order by dfi.inventory_date desc, dfi.system_id desc
    limit greatest(1, least(coalesce(p_limit, 5000), 100000));
  end if;
end;
$$;


ALTER FUNCTION "public"."api_daily_fish_inventory_rpc"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date", "p_cursor_date" "date", "p_cursor_system_id" bigint, "p_order_asc" boolean, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_daily_overlay"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint, "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("system_id" bigint, "inventory_date" "date", "feeding_amount" double precision, "number_of_fish_mortality" double precision)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select dfi.system_id, dfi.inventory_date,
    coalesce(dfi.feeding_amount,0)::double precision as feeding_amount,
    coalesce(dfi.number_of_fish_mortality,0)::double precision as number_of_fish_mortality
  from public.daily_fish_inventory dfi
  join public.system s on s.id = dfi.system_id
  where s.farm_id = p_farm_id and is_farm_member(p_farm_id)
    and (p_system_id is null or dfi.system_id = p_system_id)
    and (p_start_date is null or dfi.inventory_date >= p_start_date)
    and (p_end_date is null or dfi.inventory_date <= p_end_date)
  order by dfi.system_id, dfi.inventory_date;
$$;


ALTER FUNCTION "public"."api_daily_overlay"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_dashboard"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint, "p_growth_stage" "text" DEFAULT NULL::"text", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date", "p_time_period" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT NULL::integer, "p_order_desc" boolean DEFAULT true) RETURNS TABLE("system_id" bigint, "farm_id" "uuid", "system_name" "text", "growth_stage" "text", "input_start_date" "date", "input_end_date" "date", "time_period" "text", "sampling_start_date" "date", "sampling_end_date" "date", "total_feed_period" double precision, "efcr_denominator_period" double precision, "efcr" double precision, "efcr_latest_date" "date", "efcr_arrow" "text", "abw" double precision, "abw_latest_date" "date", "abw_arrow" "text", "feeding_rate" double precision, "feeding_rate_latest_date" "date", "feeding_rate_arrow" "text", "mortality_rate" double precision, "mortality_rate_latest_date" "date", "mortality_rate_arrow" "text", "biomass_density" double precision, "biomass_density_arrow" "text", "average_biomass" double precision, "average_number_of_fish" double precision, "feeding_latest_date_recorded" "date", "feeding_latest_date_nonzero" "date", "mortality_latest_date_recorded" "date", "mortality_latest_date_nonzero" "date", "water_quality_rating_numeric_average" double precision, "water_quality_rating_average" "text", "water_quality_latest_date" "date", "water_quality_arrow" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select
    d.system_id, s.farm_id, d.system_name, d.growth_stage::text,
    d.input_start_date, d.input_end_date, d.time_period::text,
    d.sampling_start_date, d.sampling_end_date,
    d.total_feed_period, d.efcr_denominator_period,
    d.efcr, d.efcr_latest_date, d.efcr_arrow::text,
    d.abw, d.abw_latest_date, d.abw_arrow::text,
    d.feeding_rate, d.feeding_rate_latest_date, d.feeding_rate_arrow::text,
    d.mortality_rate, d.mortality_rate_latest_date, d.mortality_rate_arrow::text,
    d.biomass_density, d.biomass_density_arrow::text,
    d.average_biomass, d.average_number_of_fish,
    d.feeding_latest_date_recorded, d.feeding_latest_date_nonzero,
    d.mortality_latest_date_recorded, d.mortality_latest_date_nonzero,
    d.water_quality_rating_numeric_average,
    d.water_quality_rating_average::text, d.water_quality_latest_date,
    d.water_quality_arrow::text
  from public.dashboard d
  join public.system s on s.id = d.system_id
  where s.farm_id = p_farm_id
    and public.is_farm_member(p_farm_id)
    and (p_system_id is null or d.system_id = p_system_id)
    and (p_growth_stage is null or d.growth_stage::text = p_growth_stage)
    and (p_time_period is null or d.time_period::text = p_time_period)
    and (p_start_date is null or d.input_start_date >= p_start_date)
    and (p_end_date is null or d.input_end_date <= p_end_date)
  order by
    case when p_order_desc then d.input_end_date end desc nulls last,
    case when not p_order_desc then d.input_end_date end asc nulls last
  limit coalesce(p_limit, 2147483647);
$$;


ALTER FUNCTION "public"."api_dashboard"("p_farm_id" "uuid", "p_system_id" bigint, "p_growth_stage" "text", "p_start_date" "date", "p_end_date" "date", "p_time_period" "text", "p_limit" integer, "p_order_desc" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_dashboard_consolidated"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint, "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date", "p_time_period" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT NULL::integer, "p_order_desc" boolean DEFAULT true) RETURNS TABLE("system_id" bigint, "input_start_date" "date", "input_end_date" "date", "time_period" "text", "mortality_rate" double precision, "feeding_rate" double precision, "average_biomass" double precision, "biomass_density" double precision, "efcr_period_consolidated" double precision, "water_quality_rating_numeric_average" numeric, "water_quality_rating_average" "text", "efcr_period_consolidated_delta" numeric, "mortality_rate_delta" numeric, "average_biomass_delta" numeric, "biomass_density_delta" numeric, "feeding_rate_delta" numeric, "abw_asof_end" double precision, "abw_asof_end_delta" numeric, "water_quality_rating_numeric_delta" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  v_start date; v_end date; v_len int;
  v_prev_start date; v_prev_end date; v_tp public.time_period;
begin
  if p_start_date is not null and p_end_date is not null then
    v_start := p_start_date; v_end := p_end_date;
  else
    select dtp.time_period into v_tp
    from public.dashboard_time_period dtp
    where dtp.time_period::text = coalesce(p_time_period, '2 weeks') limit 1;
    if v_tp is null then v_tp := '2 weeks'::public.time_period; end if;
    select b.input_start_date, b.input_end_date into v_start, v_end
    from public.api_time_period_bounds(p_farm_id, v_tp::text) b;
  end if;
  if v_start is null or v_end is null then return; end if;

  v_len := (v_end - v_start) + 1;
  v_prev_end := v_start - 1;
  v_prev_start := v_prev_end - (v_len - 1);

  return query
  with sys as (
    select s.id as system_id from public.system s
    where s.farm_id = p_farm_id and coalesce(s.is_active, true) = true
      and (p_system_id is null or s.id = p_system_id)
  ),
  inv as (
    select d.* from public.daily_fish_inventory_table d join sys on sys.system_id = d.system_id
  ),
  cur as (select * from inv where inventory_date between v_start and v_end),
  prev as (select * from inv where inventory_date between v_prev_start and v_prev_end),
  cur_metrics as (
    select d.system_id,
      case when sum(coalesce(d.biomass_last_sampling, 0)) > 0
        then sum(coalesce(d.feeding_rate, 0) * coalesce(d.biomass_last_sampling, 0)) / nullif(sum(coalesce(d.biomass_last_sampling, 0)), 0)
        else avg(d.feeding_rate) end as feeding_rate,
      case when sum(coalesce(d.number_of_fish, 0)) > 0
        then sum(coalesce(d.mortality_rate, 0) * coalesce(d.number_of_fish, 0)) / nullif(sum(coalesce(d.number_of_fish, 0)), 0)
        else avg(d.mortality_rate) end as mortality_rate,
      avg(d.biomass_last_sampling) as average_biomass,
      avg(d.biomass_density) as biomass_density,
      sum(coalesce(d.feeding_amount, 0)) as feed_sum
    from cur d group by d.system_id
  ),
  prev_metrics as (
    select d.system_id,
      case when sum(coalesce(d.biomass_last_sampling, 0)) > 0
        then sum(coalesce(d.feeding_rate, 0) * coalesce(d.biomass_last_sampling, 0)) / nullif(sum(coalesce(d.biomass_last_sampling, 0)), 0)
        else avg(d.feeding_rate) end as feeding_rate,
      case when sum(coalesce(d.number_of_fish, 0)) > 0
        then sum(coalesce(d.mortality_rate, 0) * coalesce(d.number_of_fish, 0)) / nullif(sum(coalesce(d.number_of_fish, 0)), 0)
        else avg(d.mortality_rate) end as mortality_rate,
      avg(d.biomass_last_sampling) as average_biomass,
      avg(d.biomass_density) as biomass_density,
      sum(coalesce(d.feeding_amount, 0)) as feed_sum
    from prev d group by d.system_id
  ),
  cur_biom as (
    select s.system_id,
      (select d.biomass_last_sampling from public.daily_fish_inventory_table d where d.system_id = s.system_id and d.inventory_date = v_start) as b0,
      (select d.biomass_last_sampling from public.daily_fish_inventory_table d where d.system_id = s.system_id and d.inventory_date = v_end) as b1
    from sys s
  ),
  prev_biom as (
    select s.system_id,
      (select d.biomass_last_sampling from public.daily_fish_inventory_table d where d.system_id = s.system_id and d.inventory_date = v_prev_start) as b0,
      (select d.biomass_last_sampling from public.daily_fish_inventory_table d where d.system_id = s.system_id and d.inventory_date = v_prev_end) as b1
    from sys s
  ),
  cur_w as (
    select s.system_id,
      coalesce((select sum(h.total_weight_harvest) from public.fish_harvest h where h.system_id = s.system_id and h.date > v_start and h.date <= v_end), 0) as harvest_kg,
      coalesce((select sum(fs.total_weight_stocking) from public.fish_stocking fs where fs.system_id = s.system_id and fs.date > v_start and fs.date <= v_end), 0) as stocked_kg,
      coalesce((select sum(ft.total_weight_transfer) from public.fish_transfer ft where ft.origin_system_id = s.system_id and ft.date > v_start and ft.date <= v_end and public.transfer_impacts_efcr(ft.transfer_type, ft.origin_system_id, ft.target_system_id)), 0) as tout_kg,
      coalesce((select sum(ft.total_weight_transfer) from public.fish_transfer ft where ft.target_system_id = s.system_id and ft.date > v_start and ft.date <= v_end and public.transfer_impacts_efcr(ft.transfer_type, ft.origin_system_id, ft.target_system_id)), 0) as tin_kg
    from sys s
  ),
  prev_w as (
    select s.system_id,
      coalesce((select sum(h.total_weight_harvest) from public.fish_harvest h where h.system_id = s.system_id and h.date > v_prev_start and h.date <= v_prev_end), 0) as harvest_kg,
      coalesce((select sum(fs.total_weight_stocking) from public.fish_stocking fs where fs.system_id = s.system_id and fs.date > v_prev_start and fs.date <= v_prev_end), 0) as stocked_kg,
      coalesce((select sum(ft.total_weight_transfer) from public.fish_transfer ft where ft.origin_system_id = s.system_id and ft.date > v_prev_start and ft.date <= v_prev_end and public.transfer_impacts_efcr(ft.transfer_type, ft.origin_system_id, ft.target_system_id)), 0) as tout_kg,
      coalesce((select sum(ft.total_weight_transfer) from public.fish_transfer ft where ft.target_system_id = s.system_id and ft.date > v_prev_start and ft.date <= v_prev_end and public.transfer_impacts_efcr(ft.transfer_type, ft.origin_system_id, ft.target_system_id)), 0) as tin_kg
    from sys s
  ),
  cur_efcr as (
    select s.system_id,
      case when cb.b0 is null or cb.b1 is null then null::double precision
        else (cb.b1 - cb.b0 + cw.harvest_kg + cw.tout_kg - cw.tin_kg - cw.stocked_kg) end as denom,
      cm.feed_sum
    from sys s
    left join cur_biom cb on cb.system_id = s.system_id
    left join cur_w cw on cw.system_id = s.system_id
    left join cur_metrics cm on cm.system_id = s.system_id
  ),
  prev_efcr as (
    select s.system_id,
      case when pb.b0 is null or pb.b1 is null then null::double precision
        else (pb.b1 - pb.b0 + pw.harvest_kg + pw.tout_kg - pw.tin_kg - pw.stocked_kg) end as denom,
      pm.feed_sum
    from sys s
    left join prev_biom pb on pb.system_id = s.system_id
    left join prev_w pw on pw.system_id = s.system_id
    left join prev_metrics pm on pm.system_id = s.system_id
  ),
  cur_wq as (
    select s.system_id, avg(dwr.rating_numeric::numeric) as wq_num
    from sys s
    left join public.daily_water_quality_rating dwr on dwr.system_id = s.system_id and dwr.rating_date between v_start and v_end
    group by s.system_id
  ),
  prev_wq as (
    select s.system_id, avg(dwr.rating_numeric::numeric) as wq_num
    from sys s
    left join public.daily_water_quality_rating dwr on dwr.system_id = s.system_id and dwr.rating_date between v_prev_start and v_prev_end
    group by s.system_id
  ),
  cur_abw as (
    select s.system_id,
      (select d.abw_last_sampling from public.daily_fish_inventory_table d
        where d.system_id = s.system_id and d.inventory_date <= v_end and d.abw_last_sampling is not null
        order by d.inventory_date desc limit 1) as abw_asof_end
    from sys s
  ),
  prev_abw as (
    select s.system_id,
      (select d.abw_last_sampling from public.daily_fish_inventory_table d
        where d.system_id = s.system_id and d.inventory_date <= v_prev_end and d.abw_last_sampling is not null
        order by d.inventory_date desc limit 1) as abw_asof_end
    from sys s
  )
  select s.system_id, v_start as input_start_date, v_end as input_end_date,
    coalesce(p_time_period, v_tp::text) as time_period,
    cm.mortality_rate::double precision, cm.feeding_rate::double precision,
    cm.average_biomass::double precision, cm.biomass_density::double precision,
    case when ce.denom is null or ce.denom = 0 then null::double precision
      else (ce.feed_sum::double precision / ce.denom::double precision) end as efcr_period_consolidated,
    cwq.wq_num::numeric as water_quality_rating_numeric_average,
    case when cwq.wq_num is null then null::text
      else public.water_quality_rating_label(cwq.wq_num) end as water_quality_rating_average,
    ((case when ce.denom is null or ce.denom = 0 then null::numeric else (ce.feed_sum / ce.denom)::numeric end)
      - (case when pe.denom is null or pe.denom = 0 then null::numeric else (pe.feed_sum / pe.denom)::numeric end)) as efcr_period_consolidated_delta,
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
  left join cur_efcr ce on ce.system_id = s.system_id
  left join prev_efcr pe on pe.system_id = s.system_id
  left join cur_wq cwq on cwq.system_id = s.system_id
  left join prev_wq pwq on pwq.system_id = s.system_id
  left join cur_abw cabw on cabw.system_id = s.system_id
  left join prev_abw pabw on pabw.system_id = s.system_id
  order by
    case when p_order_desc then s.system_id end desc nulls last,
    case when not p_order_desc then s.system_id end asc nulls last
  limit coalesce(p_limit, 2147483647);
end
$$;


ALTER FUNCTION "public"."api_dashboard_consolidated"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date", "p_time_period" "text", "p_limit" integer, "p_order_desc" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_dashboard_systems"("p_farm_id" "uuid", "p_stage" "public"."system_growth_stage" DEFAULT NULL::"public"."system_growth_stage", "p_system_id" bigint DEFAULT NULL::bigint, "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("system_id" bigint, "system_name" "text", "growth_stage" "public"."system_growth_stage", "input_start_date" "date", "input_end_date" "date", "as_of_date" "date", "fish_end" double precision, "biomass_end" double precision, "sampling_end_date" "date", "sample_age_days" integer, "efcr" double precision, "efcr_date" "date", "feed_total" double precision, "abw" double precision, "feeding_rate" double precision, "mortality_rate" double precision, "biomass_density" double precision, "missing_days_count" integer, "water_quality_rating_average" "text", "water_quality_rating_numeric_average" double precision, "water_quality_latest_date" "date", "worst_parameter" "text", "worst_parameter_value" double precision, "worst_parameter_unit" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  with
  perm as (select true as ok),
  sys as (
    select s.id as system_id, s.name as system_name, s.growth_stage
    from public.system s, perm
    where perm.ok and s.farm_id = p_farm_id
      and (p_stage is null or s.growth_stage = p_stage)
      and (p_system_id is null or s.id = p_system_id)
  ),
  inv as (
    select dfi.*
    from public.daily_fish_inventory dfi
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
    select ps.* from public.production_summary ps
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
      system_id, date as efcr_date, efcr_period as efcr
    from ps_window order by system_id, date desc
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
    b.fish_end, b.biomass_end, b.sampling_end_date,
    case when b.sampling_end_date is null or b.input_end_date is null then null
      else (b.input_end_date - b.sampling_end_date)::int end as sample_age_days,
    pl.efcr, pl.efcr_date, pf.feed_total, b.abw,
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
  left join wq_avg wa on wa.system_id = b.system_id
  left join wq_latest wl on wl.system_id = b.system_id
  order by b.system_name;
$$;


ALTER FUNCTION "public"."api_dashboard_systems"("p_farm_id" "uuid", "p_stage" "public"."system_growth_stage", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_efcr_trend"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint, "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("system_id" bigint, "farm_id" "uuid", "inventory_date" "date", "last_sampling_date" "date", "efcr_period_last_sampling" numeric, "biomass_last_sampling" numeric, "biomass_efcr_multiple" numeric, "system_name" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select ev.system_id, ev.farm_id, ev.inventory_date, ev.last_sampling_date,
    ev.efcr_period_last_sampling, ev.biomass_last_sampling::numeric,
    ev.biomass_efcr_multiple::numeric, sys.name as system_name
  from public.efcr_period_last_sampling_view ev
  join public.system sys on sys.id = ev.system_id
  where sys.farm_id = p_farm_id and is_farm_member(p_farm_id)
    and (p_system_id is null or ev.system_id = p_system_id)
    and (p_start_date is null or ev.inventory_date >= p_start_date)
    and (p_end_date is null or ev.inventory_date <= p_end_date);
$$;


ALTER FUNCTION "public"."api_efcr_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_farm_options_rpc"() RETURNS TABLE("id" "uuid", "label" "text", "location" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select f.id, f.name as label, f.location
  from public.farm f
  where exists (
    select 1 from public.farm_user fu
    where fu.farm_id = f.id and fu.user_id = auth.uid()
  )
  order by f.name;
$$;


ALTER FUNCTION "public"."api_farm_options_rpc"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_farm_user_invitations"("p_farm_id" "uuid") RETURNS TABLE("id" "uuid", "farm_id" "uuid", "email" "text", "role" "text", "status" "text", "invited_by" "uuid", "invited_user_id" "uuid", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "last_sent_at" timestamp with time zone, "accepted_at" timestamp with time zone, "revoked_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
begin
  if auth.uid() is null
     or not public.has_farm_role(p_farm_id, array['admin', 'farm_manager'], auth.uid()) then
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
  order by i.created_at desc, i.email asc;
end;
$$;


ALTER FUNCTION "public"."api_farm_user_invitations"("p_farm_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_feed_type_options_rpc"() RETURNS TABLE("id" bigint, "feed_line" "text", "label" "text", "feed_category" "text", "feed_pellet_size" "text", "crude_protein_percentage" numeric, "crude_fat_percentage" numeric)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select ft.id, ft.feed_line,
    trim(both from concat_ws('  ', ft.feed_supplier::text, ft.feed_line, ft.feed_category,
      ft.feed_pellet_size,
      case when ft.crude_protein_percentage is not null then 'CP ' || ft.crude_protein_percentage::text || '%' else null end,
      case when ft.crude_fat_percentage is not null then 'F ' || ft.crude_fat_percentage::text || '%' else null end
    )) as label,
    ft.feed_category::text, ft.feed_pellet_size::text,
    ft.crude_protein_percentage::numeric, ft.crude_fat_percentage::numeric
  from public.feed_type ft
  order by ft.feed_line, ft.feed_pellet_size::text;
$$;


ALTER FUNCTION "public"."api_feed_type_options_rpc"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_fingerling_batch_options_rpc"("p_farm_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" bigint, "farm_id" "uuid", "label" "text", "date_of_delivery" "date", "abw" numeric, "number_of_fish" numeric, "supplier_id" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select fb.id, fb.farm_id,
    coalesce(nullif(fb.name, ''), 'Batch #' || fb.id::text) as label,
    fb.date_of_delivery, fb.abw::numeric, fb.number_of_fish::numeric, fb.supplier_id
  from public.fingerling_batch fb
  where (p_farm_id is null or fb.farm_id = p_farm_id)
    and exists (
      select 1 from public.farm_user fu
      where fu.farm_id = fb.farm_id and fu.user_id = auth.uid()
    )
  order by fb.date_of_delivery desc nulls last;
$$;


ALTER FUNCTION "public"."api_fingerling_batch_options_rpc"("p_farm_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_latest_water_quality_status"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint) RETURNS TABLE("system_id" bigint, "system_name" "text", "rating_date" "date", "rating" "text", "rating_numeric" double precision, "worst_parameter" "text", "worst_parameter_value" double precision, "worst_parameter_unit" "text", "low_do_threshold" numeric, "high_ammonia_threshold" numeric, "do_exceeded" boolean, "ammonia_exceeded" boolean)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  with perm as (select true as ok),
  sys as (
    select s.id, s.name from public.system s, perm
    where perm.ok and s.farm_id = p_farm_id
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


CREATE OR REPLACE FUNCTION "public"."api_production_summary"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint, "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("cycle_id" integer, "date" "date", "system_id" bigint, "system_name" "text", "growth_stage" "text", "ongoing_cycle" boolean, "average_body_weight" double precision, "number_of_fish_inventory" double precision, "total_feed_amount_period" double precision, "activity" "text", "activity_rank" integer, "total_biomass" double precision, "biomass_increase_period" double precision, "total_feed_amount_aggregated" double precision, "biomass_increase_aggregated" double precision, "daily_mortality_count" double precision, "cumulative_mortality" double precision, "number_of_fish_transfer_out" double precision, "total_weight_transfer_out" double precision, "total_weight_transfer_out_aggregated" double precision, "number_of_fish_transfer_in" double precision, "total_weight_transfer_in" double precision, "total_weight_transfer_in_aggregated" double precision, "number_of_fish_harvested" double precision, "total_weight_harvested" double precision, "total_weight_harvested_aggregated" double precision, "number_of_fish_stocked" double precision, "total_weight_stocked" double precision, "total_weight_stocked_aggregated" double precision, "efcr_period" double precision, "efcr_aggregated" double precision)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select ps.cycle_id, ps.date, ps.system_id, ps.system_name, ps.growth_stage::text,
    ps.ongoing_cycle, ps.average_body_weight, ps.number_of_fish_inventory,
    ps.total_feed_amount_period, ps.activity, ps.activity_rank, ps.total_biomass,
    ps.biomass_increase_period, ps.total_feed_amount_aggregated, ps.biomass_increase_aggregated,
    ps.daily_mortality_count, ps.cumulative_mortality, ps.number_of_fish_transfer_out,
    ps.total_weight_transfer_out, ps.total_weight_transfer_out_aggregated,
    ps.number_of_fish_transfer_in, ps.total_weight_transfer_in,
    ps.total_weight_transfer_in_aggregated, ps.number_of_fish_harvested,
    ps.total_weight_harvested, ps.total_weight_harvested_aggregated,
    ps.number_of_fish_stocked, ps.total_weight_stocked, ps.total_weight_stocked_aggregated,
    ps.efcr_period, ps.efcr_aggregated
  from public.production_summary ps
  join public.system s on s.id = ps.system_id
  where s.farm_id = p_farm_id
    and public.is_farm_member(p_farm_id)
    and (p_system_id is null or ps.system_id = p_system_id)
    and (p_start_date is null or ps.date >= p_start_date)
    and (p_end_date is null or ps.date <= p_end_date);
$$;


ALTER FUNCTION "public"."api_production_summary"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_system_options_rpc"("p_farm_id" "uuid" DEFAULT NULL::"uuid", "p_stage" "public"."system_growth_stage" DEFAULT NULL::"public"."system_growth_stage", "p_active_only" boolean DEFAULT true) RETURNS TABLE("id" bigint, "label" "text", "type" "text", "growth_stage" "public"."system_growth_stage", "is_active" boolean, "farm_id" "uuid", "farm_name" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select s.id, s.name as label, s.type::text, s.growth_stage,
    coalesce(s.is_active, true) as is_active, s.farm_id, f.name as farm_name
  from public.system s
  join public.farm f on f.id = s.farm_id
  where (p_farm_id is null or s.farm_id = p_farm_id)
    and (p_stage is null or s.growth_stage = p_stage)
    and (not p_active_only or coalesce(s.is_active, true) = true)
    and is_farm_member(s.farm_id)
  order by s.name;
$$;


ALTER FUNCTION "public"."api_system_options_rpc"("p_farm_id" "uuid", "p_stage" "public"."system_growth_stage", "p_active_only" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_system_timeline_bounds"("p_farm_id" "uuid", "p_system_id" bigint DEFAULT NULL::bigint) RETURNS TABLE("system_id" bigint, "resolved_start" "date", "resolved_end" "date", "resolved_ongoing" boolean, "snapshot_as_of" "date", "first_stocking_date" "date", "final_harvest_date" "date", "first_activity_date" "date", "last_activity_date" "date", "configured_cycle_start" "date", "configured_cycle_end" "date", "period_source" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  with sys as (
    select s.id as system_id from public.system s
    where public.is_farm_member(p_farm_id)
      and s.farm_id = p_farm_id
      and coalesce(s.is_active, true) = true
      and (p_system_id is null or s.id = p_system_id)
  ),
  snapshot_bounds as (
    select d.system_id, max(d.inventory_date) as snapshot_as_of
    from public.daily_fish_inventory_table d
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


CREATE OR REPLACE FUNCTION "public"."api_time_period_bounds"("p_farm_id" "uuid", "p_time_period" "text", "p_anchor_date" "date" DEFAULT NULL::"date") RETURNS TABLE("time_period" "text", "input_start_date" "date", "input_end_date" "date")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select b.time_period, b.input_start_date, b.input_end_date
  from public.api_time_period_bounds_scoped(
    p_farm_id => p_farm_id, p_time_period => p_time_period,
    p_scope => 'dashboard', p_anchor_date => p_anchor_date
  ) b;
$$;


ALTER FUNCTION "public"."api_time_period_bounds"("p_farm_id" "uuid", "p_time_period" "text", "p_anchor_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_time_period_bounds_scoped"("p_farm_id" "uuid", "p_time_period" "text", "p_scope" "text" DEFAULT 'dashboard'::"text", "p_anchor_date" "date" DEFAULT NULL::"date") RETURNS TABLE("time_period" "text", "input_start_date" "date", "input_end_date" "date", "anchor_scope" "text", "latest_available_date" "date", "available_from_date" "date", "requested_days" integer, "available_days" integer, "resolved_days" integer, "staleness_days" integer, "is_truncated" boolean)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  with perm as (
    select public.is_farm_member(p_farm_id) as ok
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
  tp as (
    select dtp.time_period::text as time_period, greatest(dtp.days_since_start, 1) as requested_days
    from public.dashboard_time_period dtp join perm on perm.ok
    where dtp.time_period::text = p_time_period limit 1
  ),
  scoped_dates as (
    select rs.anchor_scope,
      case rs.anchor_scope
        when 'water_quality' then (select max(a.fact_date) from public.analytics_system_day a join public.system s on s.id = a.system_id where s.farm_id = p_farm_id and a.water_quality_rating_numeric is not null and (p_anchor_date is null or a.fact_date <= p_anchor_date))
        when 'feeding' then (select max(a.fact_date) from public.analytics_system_day a join public.system s on s.id = a.system_id where s.farm_id = p_farm_id and a.feeding_amount is not null and (p_anchor_date is null or a.fact_date <= p_anchor_date))
        when 'feed_inventory' then (select max(f.fact_date) from public.analytics_feed_inventory_day f where f.farm_id = p_farm_id and (p_anchor_date is null or f.fact_date <= p_anchor_date))
        else (select max(a.fact_date) from public.analytics_system_day a join public.system s on s.id = a.system_id where s.farm_id = p_farm_id and a.has_inventory and (p_anchor_date is null or a.fact_date <= p_anchor_date))
      end as latest_available_date,
      case rs.anchor_scope
        when 'water_quality' then (select min(a.fact_date) from public.analytics_system_day a join public.system s on s.id = a.system_id where s.farm_id = p_farm_id and a.water_quality_rating_numeric is not null)
        when 'feeding' then (select min(a.fact_date) from public.analytics_system_day a join public.system s on s.id = a.system_id where s.farm_id = p_farm_id and a.feeding_amount is not null)
        when 'feed_inventory' then (select min(f.fact_date) from public.analytics_feed_inventory_day f where f.farm_id = p_farm_id)
        else (select min(a.fact_date) from public.analytics_system_day a join public.system s on s.id = a.system_id where s.farm_id = p_farm_id and a.has_inventory)
      end as available_from_date
    from resolved_scope rs
  ),
  bounded as (
    select tp.time_period, sd.anchor_scope, sd.latest_available_date as input_end_date,
      sd.available_from_date, tp.requested_days,
      case when sd.latest_available_date is null or sd.available_from_date is null then null::date
        else greatest(sd.available_from_date, sd.latest_available_date - (tp.requested_days - 1))
      end as input_start_date
    from tp cross join scoped_dates sd
  )
  select b.time_period, b.input_start_date, b.input_end_date, b.anchor_scope,
    b.input_end_date as latest_available_date, b.available_from_date, b.requested_days,
    case when b.input_end_date is null or b.available_from_date is null then null::integer
      else (b.input_end_date - b.available_from_date + 1)::integer end as available_days,
    case when b.input_end_date is null or b.input_start_date is null then null::integer
      else (b.input_end_date - b.input_start_date + 1)::integer end as resolved_days,
    case when b.input_end_date is null then null::integer
      else greatest((current_date - b.input_end_date)::integer, 0) end as staleness_days,
    case when b.input_end_date is null or b.available_from_date is null or b.input_start_date is null then false
      else b.input_start_date > (b.input_end_date - (b.requested_days - 1)) end as is_truncated
  from bounded b;
$$;


ALTER FUNCTION "public"."api_time_period_bounds_scoped"("p_farm_id" "uuid", "p_time_period" "text", "p_scope" "text", "p_anchor_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_time_period_options"() RETURNS TABLE("time_period" "public"."time_period", "days_since_start" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select time_period, days_since_start
  from public.dashboard_time_period
  order by days_since_start;
$$;


ALTER FUNCTION "public"."api_time_period_options"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."api_water_quality_sync_status"("p_farm_id" "uuid") RETURNS TABLE("latest_rating_date" "date", "latest_measurement_ts" timestamp with time zone)
    LANGUAGE "sql" STABLE
    AS $$
  select
    (select max(dwr.rating_date) from public.daily_water_quality_rating dwr
      join public.system s on s.id = dwr.system_id
      where s.farm_id = p_farm_id
        and exists (select 1 from public.farm_user fu where fu.farm_id = p_farm_id and fu.user_id = auth.uid())
    ) as latest_rating_date,
    (select max(wqm.created_at) from public.water_quality_measurement wqm
      join public.system s on s.id = wqm.system_id
      where s.farm_id = p_farm_id
        and exists (select 1 from public.farm_user fu where fu.farm_id = p_farm_id and fu.user_id = auth.uid())
    ) as latest_measurement_ts;
$$;


ALTER FUNCTION "public"."api_water_quality_sync_status"("p_farm_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_feed_incoming_farm_if_missing"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  v_farm_count integer;
  v_farm_id uuid;
begin
  if new.farm_id is not null then return new; end if;

  if auth.uid() is null then
    raise exception 'feed_incoming.farm_id is required when no authenticated farm context is available';
  end if;

  select count(*) into v_farm_count from public.farm_user fu where fu.user_id = auth.uid();
  select fu.farm_id into v_farm_id from public.farm_user fu where fu.user_id = auth.uid() order by fu.farm_id limit 1;

  if v_farm_count = 1 and v_farm_id is not null then
    new.farm_id := v_farm_id;
    return new;
  end if;

  raise exception 'feed_incoming.farm_id is required for users with multiple farms';
end;
$$;


ALTER FUNCTION "public"."assign_feed_incoming_farm_if_missing"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_my_farm_user_invitations"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
begin
  if v_user_id is null or v_email = '' then
    return 0;
  end if;

  return private.apply_pending_farm_user_invitations(v_user_id, v_email);
end;
$$;


ALTER FUNCTION "public"."claim_my_farm_user_invitations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."classify_water_quality_measurement"("p_parameter_value" double precision, "p_optimal" "jsonb", "p_acceptable" "jsonb", "p_critical" "jsonb", "p_lethal" "jsonb") RETURNS TABLE("measurement_rating" "public"."water_quality_rating", "severity_rank" integer, "distance_from_next_better_band" double precision)
    LANGUAGE "plpgsql" IMMUTABLE
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
  open_cycle_id int;
begin
  if new.type_of_harvest <> 'final'::type_of_harvest then
    return null;
  end if;

  select pc.cycle_id into open_cycle_id
  from public.production_cycle pc
  where pc.system_id = new.system_id
    and pc.cycle_end is null
    and pc.cycle_start <= new.date
  order by pc.cycle_start desc
  limit 1;

  if open_cycle_id is null then
    raise exception 'Final harvest on % for system % but no open production_cycle exists.', new.date, new.system_id;
  end if;

  update public.production_cycle set cycle_end = new.date where cycle_id = open_cycle_id;
  return null;
end;
$$;


ALTER FUNCTION "public"."close_cycle_on_final_harvest"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_farm_user_invitation"("p_farm_id" "uuid", "p_email" "text", "p_role" "text" DEFAULT 'viewer'::"text") RETURNS TABLE("id" "uuid", "farm_id" "uuid", "email" "text", "role" "text", "status" "text", "invited_by" "uuid", "invited_user_id" "uuid", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "last_sent_at" timestamp with time zone, "accepted_at" timestamp with time zone, "revoked_at" timestamp with time zone, "should_send_auth_invite" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_role text := trim(coalesce(p_role, 'viewer'));
  v_actor uuid := auth.uid();
  v_existing_user_id uuid;
begin
  if v_actor is null
     or not public.has_farm_role(p_farm_id, array['admin', 'farm_manager'], v_actor) then
    raise insufficient_privilege using errcode = '42501';
  end if;

  if v_email = '' or position('@' in v_email) <= 1 then
    raise exception 'A valid email address is required' using errcode = '22023';
  end if;

  if not (v_role = any (array['admin', 'farm_manager', 'system_operator', 'data_analyst', 'viewer'])) then
    raise exception 'Unsupported farm role: %', v_role using errcode = '22023';
  end if;

  select u.id
  into v_existing_user_id
  from auth.users u
  where lower(trim(coalesce(u.email, ''))) = v_email
  order by u.created_at asc
  limit 1;

  if v_existing_user_id is not null then
    insert into public.farm_user (farm_id, user_id, role)
    values (p_farm_id, v_existing_user_id, v_role)
    on conflict (farm_id, user_id) do nothing;
  end if;

  return query
  insert into private.farm_user_invitation as i (
    farm_id,
    email,
    role,
    status,
    invited_by,
    invited_user_id,
    accepted_at,
    revoked_at
  )
  values (
    p_farm_id,
    v_email,
    v_role,
    case when v_existing_user_id is null then 'pending' else 'accepted' end,
    v_actor,
    v_existing_user_id,
    case when v_existing_user_id is null then null else timezone('utc', now()) end,
    null
  )
  on conflict (farm_id, email) do update
  set
    role = excluded.role,
    status = excluded.status,
    invited_by = excluded.invited_by,
    invited_user_id = excluded.invited_user_id,
    accepted_at = excluded.accepted_at,
    revoked_at = excluded.revoked_at
  returning
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
    i.revoked_at,
    (v_existing_user_id is null) as should_send_auth_invite;
end;
$$;


ALTER FUNCTION "public"."create_farm_user_invitation"("p_farm_id" "uuid", "p_email" "text", "p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_cycle_on_stocking"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  if exists (
    select 1 from public.production_cycle pc
    where pc.system_id = new.system_id and pc.cycle_end is null
  ) then
    return null;
  end if;

  insert into public.production_cycle(system_id, cycle_start, cycle_end, ongoing_cycle)
  values (new.system_id, new.date, null, true);
  return null;
end;
$$;


ALTER FUNCTION "public"."ensure_cycle_on_stocking"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_farm_kpis_today"("p_farm_id" "uuid") RETURNS TABLE("feed_today_kg" numeric, "active_systems" integer, "systems_fed" integer, "systems_missing_feed" integer, "mortality_today" integer, "do_compliance_pct" numeric, "min_stock_days" numeric, "unacked_critical" integer, "farm_biomass_kg" numeric)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
SELECT
  COALESCE((SELECT SUM(fr.feeding_amount)::numeric FROM public.feeding_record fr
    JOIN public.system s ON s.id = fr.system_id
    WHERE s.farm_id = p_farm_id AND fr.date = CURRENT_DATE), 0),
  (SELECT COUNT(*) FROM public.system s
    WHERE s.farm_id = p_farm_id AND COALESCE(s.is_active,true) = true)::int,
  (SELECT COUNT(DISTINCT fr.system_id) FROM public.feeding_record fr
    JOIN public.system s ON s.id = fr.system_id
    WHERE s.farm_id = p_farm_id AND fr.date = CURRENT_DATE)::int,
  (SELECT COUNT(*) FROM public.system s
    WHERE s.farm_id = p_farm_id AND COALESCE(s.is_active,true) = true
      AND NOT EXISTS (SELECT 1 FROM public.feeding_record fr
        WHERE fr.system_id = s.id AND fr.date = CURRENT_DATE))::int,
  COALESCE((SELECT SUM(fm.number_of_fish_mortality)::int FROM public.fish_mortality fm
    JOIN public.system s ON s.id = fm.system_id
    WHERE s.farm_id = p_farm_id AND fm.date = CURRENT_DATE), 0)::int,
  (SELECT ROUND(AVG(CASE WHEN wqm.parameter_value >= 5.0 THEN 1.0 ELSE 0.0 END) * 100, 1)
    FROM public.water_quality_measurement wqm
    JOIN public.system s ON s.id = wqm.system_id
    WHERE s.farm_id = p_farm_id AND wqm.parameter_name::text = 'dissolved_oxygen'
      AND wqm.measured_at >= NOW() - interval '24 hours'),
  (SELECT MIN(days_remaining) FROM public.get_running_stock(p_farm_id) WHERE avg_daily_usage_kg > 0),
  (SELECT COUNT(*) FROM public.alert_log al
    WHERE al.farm_id = p_farm_id AND al.severity = 'critical' AND al.acknowledged_at IS NULL)::int,
  COALESCE((SELECT SUM(x.biomass_last_sampling)::numeric FROM (
    SELECT DISTINCT ON (d.system_id) d.system_id, d.biomass_last_sampling
    FROM public.daily_fish_inventory_table d
    JOIN public.system s ON s.id = d.system_id
    WHERE s.farm_id = p_farm_id AND d.biomass_last_sampling IS NOT NULL
    ORDER BY d.system_id, d.inventory_date DESC) x), 0);
$$;


ALTER FUNCTION "public"."get_farm_kpis_today"("p_farm_id" "uuid") OWNER TO "postgres";


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
WITH incoming AS (
  SELECT fi.feed_type_id, SUM(fi.feed_amount)::numeric AS qty_in, MAX(fi.date) AS last_delivery_date
  FROM public.feed_incoming fi WHERE fi.farm_id = p_farm_id GROUP BY fi.feed_type_id
),
usage_all AS (
  SELECT fr.feed_type_id, SUM(fr.feeding_amount)::numeric AS qty_used
  FROM public.feeding_record fr JOIN public.system s ON s.id = fr.system_id
  WHERE s.farm_id = p_farm_id GROUP BY fr.feed_type_id
),
usage_7d AS (
  SELECT fr.feed_type_id, GREATEST(SUM(fr.feeding_amount)::numeric / 7.0, 0.001) AS avg_d
  FROM public.feeding_record fr JOIN public.system s ON s.id = fr.system_id
  WHERE s.farm_id = p_farm_id AND fr.date >= CURRENT_DATE - 7 GROUP BY fr.feed_type_id
),
base AS (
  SELECT ft.id AS feed_type_id,
    CONCAT_WS(' ', COALESCE(ft.feed_line,''), ft.feed_category::text,
      ft.feed_pellet_size::text, CONCAT('CP', ft.crude_protein_percentage::text))::text AS feed_type_name,
    ft.feed_pellet_size::text AS pellet_size,
    COALESCE(i.qty_in,0) - COALESCE(u.qty_used,0) AS stock_kg,
    u7.avg_d, i.last_delivery_date
  FROM public.feed_type ft
  LEFT JOIN incoming i ON i.feed_type_id = ft.id
  LEFT JOIN usage_all u ON u.feed_type_id = ft.id
  LEFT JOIN usage_7d u7 ON u7.feed_type_id = ft.id
  WHERE i.feed_type_id IS NOT NULL OR u.feed_type_id IS NOT NULL
)
SELECT b.feed_type_id, b.feed_type_name, b.pellet_size,
  ROUND(b.stock_kg,2), ROUND(COALESCE(b.avg_d,0),2),
  CASE WHEN COALESCE(b.avg_d,0) > 0 THEN ROUND(b.stock_kg / b.avg_d,1) ELSE NULL END AS days_remaining,
  CASE WHEN COALESCE(b.avg_d,0) = 0 THEN 'no_data'
    WHEN b.stock_kg / b.avg_d < 7 THEN 'critical'
    WHEN b.stock_kg / b.avg_d < 14 THEN 'low'
    WHEN b.stock_kg / b.avg_d < 30 THEN 'reorder'
    ELSE 'ok' END AS stock_status,
  b.last_delivery_date
FROM base b ORDER BY b.stock_kg ASC;
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
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.user_profile (
    user_id,
    full_name,
    role
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'role', 'viewer')
  )
  on conflict (user_id) do nothing;

  perform private.apply_pending_farm_user_invitations(new.id, new.email);

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_farm_role"("farm" "uuid", "roles" "text"[]) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.has_farm_role(farm, roles, (select auth.uid()));
$$;


ALTER FUNCTION "public"."has_farm_role"("farm" "uuid", "roles" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_farm_role"("farm" "uuid", "roles" "text"[], "_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.farm_user fu
    where fu.farm_id = farm and fu.user_id = _user_id and fu.role = any(roles)
  );
$$;


ALTER FUNCTION "public"."has_farm_role"("farm" "uuid", "roles" "text"[], "_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_farm_member"("farm" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.is_farm_member(farm, (select auth.uid()));
$$;


ALTER FUNCTION "public"."is_farm_member"("farm" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_farm_member"("farm" "uuid", "_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.farm_user fu
    where fu.farm_id = farm and fu.user_id = _user_id
  );
$$;


ALTER FUNCTION "public"."is_farm_member"("farm" "uuid", "_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_feeding_record_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
    col_name VARCHAR;
    old_value TEXT;
    new_value TEXT;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Loop through each column in the record and log changes
        FOR col_name IN SELECT column_name FROM information_schema.columns WHERE table_name = 'feeding_record' LOOP
            EXECUTE 'SELECT ($1).' || quote_ident(col_name) INTO old_value USING OLD;
            EXECUTE 'SELECT ($1).' || quote_ident(col_name) INTO new_value USING NEW;
            IF old_value IS DISTINCT FROM new_value THEN
                INSERT INTO change_log (table_name, change_type, record_id, column_name, old_value, new_value)
                VALUES ('feeding_record', 'UPDATE', NEW.id, col_name, old_value, new_value);
            END IF;
        END LOOP;
    ELSIF TG_OP = 'DELETE' THEN
        -- Loop through each column in the record and log changes
        FOR col_name IN SELECT column_name FROM information_schema.columns WHERE table_name = 'feeding_record' LOOP
            EXECUTE 'SELECT ($1).' || quote_ident(col_name) INTO old_value USING OLD;
            IF old_value IS NOT NULL THEN
                INSERT INTO change_log (table_name, change_type, record_id, column_name, old_value)
                VALUES ('feeding_record', 'DELETE', OLD.id, col_name, old_value);
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$_$;


ALTER FUNCTION "public"."log_feeding_record_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_row_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  rec_id text;
begin
  rec_id := coalesce(
    (to_jsonb(new)->>'id'), (to_jsonb(old)->>'id'),
    (to_jsonb(new)->>'user_id'), (to_jsonb(old)->>'user_id')
  );

  insert into public.change_log(table_name, change_type, record_id, column_name, old_value, new_value)
  values (
    tg_table_name, tg_op, rec_id, null,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old)::text else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new)::text else null end
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."log_row_change"() OWNER TO "postgres";


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
     or not public.has_farm_role(v_farm_id, array['admin', 'farm_manager'], auth.uid()) then
    raise insufficient_privilege using errcode = '42501';
  end if;

  update private.farm_user_invitation
  set last_sent_at = timezone('utc', now())
  where id = p_invitation_id;
end;
$$;


ALTER FUNCTION "public"."mark_farm_user_invitation_sent"("p_invitation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_system_name_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  IF NEW.name <> OLD.name THEN
    RAISE EXCEPTION 'system.name is immutable once created';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_system_name_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_inventory_queue"("p_limit" integer DEFAULT 50) RETURNS TABLE("processed_system_id" bigint, "processed_from_date" "date", "processed_to_date" "date", "upserted_days" integer)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  r record;
  v_from date;
  v_to date;
  v_base date;
  v_days int;
  v_open_fish double precision;
  v_open_stocked_cum double precision;
  v_open_mort_cum double precision;
  v_open_harv_cum double precision;
  v_open_feed_cum double precision;
  v_open_tout_cum double precision;
  v_open_tin_cum double precision;
begin
  for r in
    select system_id, min_affected_date
    from public._affected_systems
    order by min_affected_date asc
    limit p_limit
    for update skip locked
  loop
    processed_system_id := r.system_id;
    processed_from_date := r.min_affected_date;

    select greatest(
      coalesce((select max(date) from public.fish_stocking where system_id = r.system_id), r.min_affected_date),
      coalesce((select max(date) from public.fish_mortality where system_id = r.system_id), r.min_affected_date),
      coalesce((select max(date) from public.fish_harvest where system_id = r.system_id), r.min_affected_date),
      coalesce((select max(date) from public.feeding_record where system_id = r.system_id), r.min_affected_date),
      coalesce((select max(date) from public.fish_sampling_weight where system_id = r.system_id), r.min_affected_date),
      coalesce((select max(date) from public.fish_transfer where origin_system_id = r.system_id), r.min_affected_date),
      coalesce((select max(date) from public.fish_transfer where target_system_id = r.system_id), r.min_affected_date)
    ) into v_to;

    v_from := r.min_affected_date;
    if v_to < v_from then v_to := v_from; end if;
    v_base := v_from - 1;

    select
      d.number_of_fish, d.number_of_fish_stocked,
      d.number_of_fish_mortality_aggregated, d.number_of_fish_harvested,
      d.feeding_amount_aggregated, d.number_of_fish_transferred_out,
      d.number_of_fish_transferred_in
    into
      v_open_fish, v_open_stocked_cum, v_open_mort_cum, v_open_harv_cum,
      v_open_feed_cum, v_open_tout_cum, v_open_tin_cum
    from public.daily_fish_inventory_table d
    where d.system_id = r.system_id and d.inventory_date = v_base;

    if v_open_fish is null then
      select
        coalesce((select sum(number_of_fish_stocking)::double precision from public.fish_stocking where system_id = r.system_id and date <= v_base), 0),
        coalesce((select sum(number_of_fish_mortality)::double precision from public.fish_mortality where system_id = r.system_id and date <= v_base), 0),
        coalesce((select sum(number_of_fish_harvest)::double precision from public.fish_harvest where system_id = r.system_id and date <= v_base), 0),
        coalesce((select sum(feeding_amount)::double precision from public.feeding_record where system_id = r.system_id and date <= v_base), 0),
        coalesce((select sum(number_of_fish_transfer)::double precision from public.fish_transfer where origin_system_id = r.system_id and date <= v_base), 0),
        coalesce((select sum(number_of_fish_transfer)::double precision from public.fish_transfer where target_system_id = r.system_id and date <= v_base), 0)
      into v_open_stocked_cum, v_open_mort_cum, v_open_harv_cum, v_open_feed_cum, v_open_tout_cum, v_open_tin_cum;

      v_open_fish := v_open_stocked_cum - v_open_mort_cum - v_open_tout_cum + v_open_tin_cum - v_open_harv_cum;
    end if;

    v_open_fish := coalesce(v_open_fish, 0);
    v_open_stocked_cum := coalesce(v_open_stocked_cum, 0);
    v_open_mort_cum := coalesce(v_open_mort_cum, 0);
    v_open_harv_cum := coalesce(v_open_harv_cum, 0);
    v_open_feed_cum := coalesce(v_open_feed_cum, 0);
    v_open_tout_cum := coalesce(v_open_tout_cum, 0);
    v_open_tin_cum := coalesce(v_open_tin_cum, 0);

    delete from public.daily_fish_inventory_table
    where system_id = r.system_id and inventory_date > v_to;

    with ds as (
      select generate_series(v_from::timestamptz, v_to::timestamptz, '1 day')::date as inventory_date
    ),
    daily as (
      select
        ds.inventory_date,
        coalesce((select sum(number_of_fish_stocking)::double precision from public.fish_stocking where system_id = r.system_id and date = ds.inventory_date), 0) as stocked_d,
        coalesce((select sum(number_of_fish_mortality)::double precision from public.fish_mortality where system_id = r.system_id and date = ds.inventory_date), 0) as mort_d,
        coalesce((select sum(number_of_fish_harvest)::double precision from public.fish_harvest where system_id = r.system_id and date = ds.inventory_date), 0) as harv_d,
        coalesce((select sum(feeding_amount)::double precision from public.feeding_record where system_id = r.system_id and date = ds.inventory_date), 0) as feed_d,
        coalesce((select sum(number_of_fish_transfer)::double precision from public.fish_transfer where origin_system_id = r.system_id and date = ds.inventory_date), 0) as tout_d,
        coalesce((select sum(number_of_fish_transfer)::double precision from public.fish_transfer where target_system_id = r.system_id and date = ds.inventory_date), 0) as tin_d,
        (select max(date) from public.fish_sampling_weight where system_id = r.system_id and date <= ds.inventory_date) as last_sampling_date
      from ds
    ),
    cum as (
      select
        inventory_date,
        sum(stocked_d) over (order by inventory_date) as stocked_cum_w,
        sum(mort_d) over (order by inventory_date) as mort_cum_w,
        sum(harv_d) over (order by inventory_date) as harv_cum_w,
        sum(feed_d) over (order by inventory_date) as feed_cum_w,
        sum(tout_d) over (order by inventory_date) as tout_cum_w,
        sum(tin_d) over (order by inventory_date) as tin_cum_w,
        stocked_d, mort_d, harv_d, feed_d, tout_d, tin_d, last_sampling_date
      from daily
    ),
    enriched as (
      select
        c.inventory_date,
        v_open_stocked_cum + c.stocked_cum_w as stocked_cum,
        v_open_mort_cum + c.mort_cum_w as mort_cum,
        v_open_harv_cum + c.harv_cum_w as harv_cum,
        v_open_feed_cum + c.feed_cum_w as feed_cum,
        v_open_tout_cum + c.tout_cum_w as tout_cum,
        v_open_tin_cum + c.tin_cum_w as tin_cum,
        v_open_fish + (c.stocked_cum_w - c.mort_cum_w - c.tout_cum_w + c.tin_cum_w - c.harv_cum_w) as number_of_fish_eod,
        c.stocked_d, c.mort_d, c.harv_d, c.feed_d, c.tout_d, c.tin_d,
        c.last_sampling_date,
        (select s.volume::double precision from public.system s where s.id = r.system_id) as system_volume
      from cum c
    ),
    with_abw as (
      select e.*,
        (select fsw.abw from public.fish_sampling_weight fsw where fsw.system_id = r.system_id and fsw.date = e.last_sampling_date limit 1) as abw_last_sampling
      from enriched e
    ),
    final as (
      select w.*,
        case when w.abw_last_sampling is null then null::double precision
          else w.abw_last_sampling * w.number_of_fish_eod / 1000.0 end as biomass_last_sampling,
        case when w.abw_last_sampling is null then null::double precision
          when (w.abw_last_sampling * w.number_of_fish_eod / 1000.0) <= 0 then null::double precision
          else w.feed_d / (w.abw_last_sampling * w.number_of_fish_eod / 1000.0) end as feeding_rate,
        case when w.system_volume is null or w.system_volume <= 0 then null::double precision
          when w.abw_last_sampling is null then null::double precision
          else (w.abw_last_sampling * w.number_of_fish_eod / 1000.0) / w.system_volume end as biomass_density,
        case
          when w.inventory_date = v_from then
            case when v_open_fish <= 0 then null::double precision
              else w.mort_d / nullif(v_open_fish, 0::double precision) end
          else
            case when lag(w.number_of_fish_eod) over (order by w.inventory_date) is null then null::double precision
              when lag(w.number_of_fish_eod) over (order by w.inventory_date) <= 0 then null::double precision
              else w.mort_d / nullif(lag(w.number_of_fish_eod) over (order by w.inventory_date), 0::double precision) end
        end as mortality_rate
      from with_abw w
    )
    insert into public.daily_fish_inventory_table (
      inventory_date, system_id, number_of_fish, number_of_fish_stocked,
      number_of_fish_transferred_in, number_of_fish_mortality_aggregated,
      number_of_fish_mortality, number_of_fish_transferred_out, number_of_fish_harvested,
      feeding_amount, feeding_amount_aggregated, last_sampling_date, abw_last_sampling,
      biomass_last_sampling, feeding_rate, system_volume, biomass_density, mortality_rate
    )
    select
      f.inventory_date, r.system_id, f.number_of_fish_eod, f.stocked_cum, f.tin_cum,
      f.mort_cum, f.mort_d, f.tout_cum, f.harv_cum, f.feed_d, f.feed_cum,
      f.last_sampling_date, f.abw_last_sampling, f.biomass_last_sampling,
      f.feeding_rate, f.system_volume, f.biomass_density, f.mortality_rate
    from final f
    on conflict (system_id, inventory_date)
    do update set
      number_of_fish = excluded.number_of_fish,
      number_of_fish_stocked = excluded.number_of_fish_stocked,
      number_of_fish_transferred_in = excluded.number_of_fish_transferred_in,
      number_of_fish_mortality_aggregated = excluded.number_of_fish_mortality_aggregated,
      number_of_fish_mortality = excluded.number_of_fish_mortality,
      number_of_fish_transferred_out = excluded.number_of_fish_transferred_out,
      number_of_fish_harvested = excluded.number_of_fish_harvested,
      feeding_amount = excluded.feeding_amount,
      feeding_amount_aggregated = excluded.feeding_amount_aggregated,
      last_sampling_date = excluded.last_sampling_date,
      abw_last_sampling = excluded.abw_last_sampling,
      biomass_last_sampling = excluded.biomass_last_sampling,
      feeding_rate = excluded.feeding_rate,
      system_volume = excluded.system_volume,
      biomass_density = excluded.biomass_density,
      mortality_rate = excluded.mortality_rate;

    get diagnostics v_days = row_count;
    delete from public._affected_systems where system_id = r.system_id;
    perform public.request_matview_refresh();

    processed_to_date := v_to;
    upserted_days := v_days;
    return next;
  end loop;
  return;
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


CREATE OR REPLACE FUNCTION "public"."refresh_all_materialized_views"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  refresh materialized view public.analytics_system_day_mv;
  refresh materialized view public.production_summary;
  refresh materialized view public.dashboard;
  refresh materialized view public.efcr_period_last_sampling_view;
end;
$$;


ALTER FUNCTION "public"."refresh_all_materialized_views"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_daily_water_quality_rating"("p_system_id" bigint DEFAULT NULL::bigint, "p_from" "date" DEFAULT NULL::"date", "p_to" "date" DEFAULT NULL::"date") RETURNS "void"
    LANGUAGE "plpgsql"
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


CREATE OR REPLACE FUNCTION "public"."refresh_kpi_materialized_views"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  if exists (select 1 from public._refresh_queue where key = 'matviews') then
    perform public.refresh_all_materialized_views();
    delete from public._refresh_queue where key = 'matviews';
  end if;
end;
$$;


ALTER FUNCTION "public"."refresh_kpi_materialized_views"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_mortality_daily_rollup"("p_system_id" bigint, "p_batch_id" bigint, "p_event_date" "date") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  v_dead_count integer;
begin
  -- Sum from fish_mortality_events if it exists, otherwise just clean up
  BEGIN
    EXECUTE format(
      'SELECT coalesce(sum(dead_count), 0)::integer
       FROM public.fish_mortality_events
       WHERE system_id = $1 AND event_date = $2
         AND (($3 IS NULL AND batch_id IS NULL) OR batch_id = $3)'
    ) INTO v_dead_count USING p_system_id, p_event_date, p_batch_id;
  EXCEPTION WHEN undefined_table THEN
    v_dead_count := 0;
  END;
 
  delete from public.fish_mortality
  where system_id = p_system_id and date = p_event_date
    and ((p_batch_id is null and batch_id is null) or batch_id = p_batch_id);
 
  if v_dead_count > 0 then
    insert into public.fish_mortality (system_id, batch_id, date, number_of_fish_mortality)
    values (p_system_id, p_batch_id, p_event_date, v_dead_count);
  end if;
end;
$_$;


ALTER FUNCTION "public"."refresh_mortality_daily_rollup"("p_system_id" bigint, "p_batch_id" bigint, "p_event_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_matview_refresh"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  insert into public._refresh_queue (key)
  values ('matviews')
  on conflict (key)
  do update
    set requested_at = excluded.requested_at;
end;
$$;


ALTER FUNCTION "public"."request_matview_refresh"() OWNER TO "postgres";


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
     or not public.has_farm_role(v_farm_id, array['admin', 'farm_manager'], auth.uid()) then
    raise insufficient_privilege using errcode = '42501';
  end if;

  update private.farm_user_invitation
  set
    status = 'revoked',
    revoked_at = timezone('utc', now())
  where id = p_invitation_id
    and status = 'pending';

  if not found then
    raise exception 'Only pending invitations can be revoked' using errcode = '22023';
  end if;

  return p_invitation_id;
end;
$$;


ALTER FUNCTION "public"."revoke_farm_user_invitation"("p_invitation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transfer_impacts_efcr"("p_transfer_type" "public"."transfer_type", "p_origin_system_id" bigint, "p_target_system_id" bigint) RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select case
    when coalesce(p_transfer_type::text,
      case when p_origin_system_id = p_target_system_id then 'count_check' else 'transfer' end
    ) in ('transfer', 'grading', 'density_thinning') then true
    else false
  end;
$$;


ALTER FUNCTION "public"."transfer_impacts_efcr"("p_transfer_type" "public"."transfer_type", "p_origin_system_id" bigint, "p_target_system_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_mortality_mass_alert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_population numeric;
  v_rate numeric;
  v_rule_code text;
  v_severity text;
  v_threshold numeric;
begin
  select dfit.number_of_fish
    into v_population
  from public.daily_fish_inventory_table dfit
  where dfit.system_id = new.system_id
    and dfit.inventory_date = new.date
  order by dfit.inventory_date desc
  limit 1;
 
  if coalesce(v_population, 0) <= 0 then return new; end if;
 
  v_rate := round((new.number_of_fish_mortality::numeric / nullif(v_population, 0)) * 100, 3);
 
  if v_rate >= 2.0 then
    v_rule_code := 'MASS_MORTALITY'; v_severity := 'critical'; v_threshold := 2.0;
  elsif v_rate >= 0.5 then
    v_rule_code := 'ELEVATED_MORTALITY'; v_severity := 'warning'; v_threshold := 0.5;
  else
    return new;
  end if;
 
  if not exists (
    select 1 from public.alert_log al
    where al.system_id = new.system_id
      and al.rule_code = v_rule_code
      and al.fired_at::date = new.date
  ) then
    insert into public.alert_log (farm_id, system_id, rule_code, severity, message, value, threshold)
    select s.farm_id, new.system_id, v_rule_code, v_severity,
      case when v_rule_code = 'MASS_MORTALITY'
        then 'Mass mortality: ' || new.number_of_fish_mortality || ' fish (' || v_rate || '% of ' || round(v_population) || ')'
        else 'Elevated mortality: ' || new.number_of_fish_mortality || ' fish (' || v_rate || '% of ' || round(v_population) || ')'
      end, v_rate, v_threshold
    from public.system s where s.id = new.system_id;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_mortality_mass_alert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_refresh_daily_water_quality_rating"() RETURNS "trigger"
    LANGUAGE "plpgsql"
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
    AS $$
declare
  v_parameter public.water_quality_parameters;
begin
  v_parameter := coalesce(new.parameter_name, old.parameter_name);
  with affected as (
    select min(wqm.date) as min_date, max(wqm.date) as max_date
    from public.water_quality_measurement wqm
    where wqm.parameter_name = v_parameter
  )
  select public.refresh_daily_water_quality_rating(null, a.min_date, a.max_date)
  from affected a where a.min_date is not null;
  return null;
end;
$$;


ALTER FUNCTION "public"."trg_refresh_daily_water_quality_rating_from_framework"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_wq_alert_check"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_farm_id uuid;
  v_low_do numeric := 5.0;
  v_high_ammonia numeric := 0.5;
begin
  select s.farm_id into v_farm_id from public.system s where s.id = new.system_id;
  if v_farm_id is null then return new; end if;

  select coalesce(at.low_do_threshold, v_low_do), coalesce(at.high_ammonia_threshold, v_high_ammonia)
  into v_low_do, v_high_ammonia
  from public.alert_threshold at
  where at.farm_id = v_farm_id and (at.system_id = new.system_id or at.system_id is null)
  order by case when at.system_id = new.system_id then 0 else 1 end limit 1;

  if new.parameter_name = 'dissolved_oxygen' then
    if new.parameter_value < 4.0 and not exists (
      select 1 from public.alert_log al where al.system_id = new.system_id
        and al.rule_code = 'DO_CRITICAL' and al.fired_at > now() - interval '60 minutes'
    ) then
      insert into public.alert_log (farm_id, system_id, rule_code, severity, message, value, threshold)
      values (v_farm_id, new.system_id, 'DO_CRITICAL', 'critical',
        'DO critically low: ' || new.parameter_value || ' mg/L. Stop feeding.', new.parameter_value, 4.0);
    elsif new.parameter_value < v_low_do and not exists (
      select 1 from public.alert_log al where al.system_id = new.system_id
        and al.rule_code = 'DO_WARNING' and al.fired_at > now() - interval '60 minutes'
    ) then
      insert into public.alert_log (farm_id, system_id, rule_code, severity, message, value, threshold)
      values (v_farm_id, new.system_id, 'DO_WARNING', 'warning',
        'DO below threshold: ' || new.parameter_value || ' mg/L.', new.parameter_value, v_low_do);
    end if;
  elsif new.parameter_name = 'temperature' then
    if new.parameter_value > 33.0 and not exists (
      select 1 from public.alert_log al where al.system_id = new.system_id
        and al.rule_code = 'TEMP_HIGH' and al.fired_at > now() - interval '60 minutes'
    ) then
      insert into public.alert_log (farm_id, system_id, rule_code, severity, message, value, threshold)
      values (v_farm_id, new.system_id, 'TEMP_HIGH', 'warning',
        'High temperature: ' || new.parameter_value || ' C', new.parameter_value, 33.0);
    elsif new.parameter_value < 20.0 and not exists (
      select 1 from public.alert_log al where al.system_id = new.system_id
        and al.rule_code = 'TEMP_LOW' and al.fired_at > now() - interval '60 minutes'
    ) then
      insert into public.alert_log (farm_id, system_id, rule_code, severity, message, value, threshold)
      values (v_farm_id, new.system_id, 'TEMP_LOW', 'warning',
        'Low temperature: ' || new.parameter_value || ' C', new.parameter_value, 20.0);
    end if;
  elsif new.parameter_name = 'ammonia' then
    if new.parameter_value > v_high_ammonia and not exists (
      select 1 from public.alert_log al where al.system_id = new.system_id
        and al.rule_code = 'TAN_HIGH' and al.fired_at > now() - interval '60 minutes'
    ) then
      insert into public.alert_log (farm_id, system_id, rule_code, severity, message, value, threshold)
      values (v_farm_id, new.system_id, 'TAN_HIGH', 'warning',
        'Ammonia above threshold: ' || new.parameter_value || ' mg/L.', new.parameter_value, v_high_ammonia);
    end if;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_wq_alert_check"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_change_log"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  pk_cols text[];
  pk text;
  r_new jsonb;
  r_old jsonb;
  i int;
  k text;
  skip_cols text[] := array['created_at','updated_at','deleted_at'];
begin
  if tg_op = 'DELETE' then
    r_old := to_jsonb(old);
  else
    r_new := to_jsonb(new);
    r_old := to_jsonb(old);
  end if;
 
  select array_agg(a.attname order by a.attnum)
  into pk_cols
  from pg_index ix
  join pg_attribute a on a.attrelid = ix.indrelid and a.attnum = any(ix.indkey)
  where ix.indrelid = tg_relid and ix.indisprimary;
 
  if pk_cols is null or array_length(pk_cols, 1) is null then
    raise exception 'update_change_log(): table "%" has no primary key', tg_table_name;
  end if;
 
  pk := '';
  for i in 1..array_length(pk_cols, 1) loop
    if i > 1 then pk := pk || ':'; end if;
    pk := pk || coalesce(r_old ->> pk_cols[i], r_new ->> pk_cols[i], '');
  end loop;
 
  if pk is null or pk = '' then
    raise exception 'update_change_log(): could not determine record_id for table "%"', tg_table_name;
  end if;
 
  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(r_new) loop
      if k = any(skip_cols) then continue; end if;
      if (r_old ->> k) is distinct from (r_new ->> k) then
        insert into public.change_log (table_name, change_type, record_id, column_name, old_value, new_value, change_time)
        values (tg_table_name, 'UPDATE', pk, k, (r_old ->> k), (r_new ->> k), current_timestamp);
      end if;
    end loop;
    return new;
  end if;
 
  if tg_op = 'DELETE' then
    for k in select jsonb_object_keys(r_old) loop
      if k = any(skip_cols) then continue; end if;
      insert into public.change_log (table_name, change_type, record_id, column_name, old_value, new_value, change_time)
      values (tg_table_name, 'DELETE', pk, k, (r_old ->> k), null, current_timestamp);
    end loop;
    return old;
  end if;
 
  return null;
end;
$$;


ALTER FUNCTION "public"."update_change_log"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."water_quality_rating_label"("p_rating_numeric" numeric) RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select case round(p_rating_numeric)::int
    when 0 then 'lethal'
    when 1 then 'critical'
    when 2 then 'acceptable'
    when 3 then 'optimal'
    else null
  end;
$$;


ALTER FUNCTION "public"."water_quality_rating_label"("p_rating_numeric" numeric) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "archive"."production_cycle_backup" (
    "cycle_id" integer,
    "system_id" bigint,
    "cycle_start" "date",
    "cycle_end" "date",
    "ongoing_cycle" boolean,
    "delta_biomass" double precision,
    "delta_number_of_fish" bigint
);


ALTER TABLE "archive"."production_cycle_backup" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "energy"."electrical_appliance" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "energy"."electrical_appliance" OWNER TO "postgres";


ALTER TABLE "energy"."electrical_appliance" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "energy"."electrical_appliance_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "energy"."power_consumption" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "energy"."power_consumption" OWNER TO "postgres";


ALTER TABLE "energy"."power_consumption" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "energy"."power_consumption_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "energy"."solar_production_historical" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "energy"."solar_production_historical" OWNER TO "postgres";


ALTER TABLE "energy"."solar_production_historical" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "energy"."solar_production_historical_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "energy"."solar_production_prediction" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "energy"."solar_production_prediction" OWNER TO "postgres";


ALTER TABLE "energy"."solar_production_prediction" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "energy"."solar_production_prediction_id_seq"
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
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "last_sent_at" timestamp with time zone,
    "accepted_at" timestamp with time zone,
    "revoked_at" timestamp with time zone,
    CONSTRAINT "farm_user_invitation_email_check" CHECK ((POSITION(('@'::"text") IN ("email")) > 1)),
    CONSTRAINT "farm_user_invitation_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text", 'data_analyst'::"text", 'viewer'::"text"]))),
    CONSTRAINT "farm_user_invitation_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'revoked'::"text"])))
);


ALTER TABLE "private"."farm_user_invitation" OWNER TO "postgres";


CREATE UNLOGGED TABLE "public"."_affected_systems" (
    "system_id" bigint NOT NULL,
    "min_affected_date" "date" NOT NULL
);


ALTER TABLE "public"."_affected_systems" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_refresh_queue" (
    "key" "text" NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."_refresh_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."alert_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "farm_id" "uuid" NOT NULL,
    "system_id" bigint,
    "rule_code" "text" NOT NULL,
    "severity" "text" NOT NULL,
    "message" "text" NOT NULL,
    "value" numeric,
    "threshold" numeric,
    "action_taken" "text",
    "acknowledged_at" timestamp with time zone,
    "acknowledged_by" "uuid",
    "fired_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "alert_log_severity_check" CHECK (("severity" = ANY (ARRAY['info'::"text", 'warning'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."alert_log" OWNER TO "postgres";


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
    CONSTRAINT "alert_threshold_scope_check" CHECK (("scope" = ANY (ARRAY['default'::"text", 'farm'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."alert_threshold" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feed_incoming" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "feed_type_id" bigint,
    "date" "date" NOT NULL,
    "feed_amount" double precision NOT NULL,
    "farm_id" "uuid" NOT NULL
);


ALTER TABLE "public"."feed_incoming" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."analytics_feed_inventory_day" WITH ("security_invoker"='true') AS
 SELECT "fi"."farm_id",
    "fi"."date" AS "fact_date",
    ("count"(*))::integer AS "feed_delivery_count",
    "sum"(COALESCE("fi"."feed_amount", (0)::double precision)) AS "feed_incoming_amount"
   FROM "public"."feed_incoming" "fi"
  GROUP BY "fi"."farm_id", "fi"."date";


ALTER TABLE "public"."analytics_feed_inventory_day" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_fish_inventory_table" (
    "id" bigint NOT NULL,
    "inventory_date" "date" NOT NULL,
    "system_id" integer NOT NULL,
    "number_of_fish" double precision,
    "number_of_fish_stocked" numeric,
    "number_of_fish_transferred_in" double precision,
    "number_of_fish_mortality_aggregated" numeric,
    "number_of_fish_mortality" numeric,
    "number_of_fish_transferred_out" double precision,
    "number_of_fish_harvested" numeric,
    "feeding_amount" numeric,
    "feeding_amount_aggregated" numeric,
    "last_sampling_date" "date",
    "abw_last_sampling" numeric,
    "biomass_last_sampling" double precision,
    "feeding_rate" numeric,
    "system_volume" numeric,
    "biomass_density" numeric,
    "mortality_rate" double precision,
    CONSTRAINT "dfit_no_future" CHECK (("inventory_date" <= CURRENT_DATE))
);


ALTER TABLE "public"."daily_fish_inventory_table" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."feeding_record" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "system_id" bigint NOT NULL,
    "feed_type_id" bigint NOT NULL,
    "feeding_amount" double precision NOT NULL,
    "date" "date" NOT NULL,
    "feeding_response" "public"."feeding_response" NOT NULL,
    "batch_id" bigint
);


ALTER TABLE "public"."feeding_record" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fish_harvest" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "date" "date" NOT NULL,
    "system_id" bigint NOT NULL,
    "number_of_fish_harvest" bigint NOT NULL,
    "total_weight_harvest" double precision NOT NULL,
    "abw" double precision NOT NULL,
    "type_of_harvest" "public"."type_of_harvest" NOT NULL,
    "batch_id" bigint
);


ALTER TABLE "public"."fish_harvest" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fish_mortality" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "system_id" bigint NOT NULL,
    "date" "date" NOT NULL,
    "number_of_fish_mortality" bigint NOT NULL,
    "total_weight_mortality" double precision,
    "abw" double precision,
    "avg_dead_wt_g" numeric,
    "cause" "text" DEFAULT 'unknown'::"text" NOT NULL,
    "notes" "text",
    "recorded_by" "uuid",
    "farm_id" "uuid",
    "batch_id" bigint,
    "is_mass_mortality" boolean GENERATED ALWAYS AS (("number_of_fish_mortality" >= 100)) STORED,
    CONSTRAINT "fish_mortality_cause_check" CHECK (("cause" = ANY (ARRAY['unknown'::"text", 'hypoxia'::"text", 'disease'::"text", 'injury'::"text", 'handling'::"text", 'predator'::"text", 'starvation'::"text", 'temperature'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."fish_mortality" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fish_sampling_weight" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "system_id" bigint NOT NULL,
    "date" "date" NOT NULL,
    "number_of_fish_sampling" bigint NOT NULL,
    "total_weight_sampling" double precision NOT NULL,
    "abw" double precision NOT NULL,
    "batch_id" bigint,
    CONSTRAINT "fish_sampling_positive_numbers" CHECK ((("number_of_fish_sampling" > 0) AND ("total_weight_sampling" > (0)::double precision) AND ("abw" > (0)::double precision)))
);


ALTER TABLE "public"."fish_sampling_weight" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fish_stocking" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "date" "date" NOT NULL,
    "system_id" bigint NOT NULL,
    "number_of_fish_stocking" bigint NOT NULL,
    "total_weight_stocking" double precision NOT NULL,
    "abw" double precision NOT NULL,
    "batch_id" bigint NOT NULL,
    "type_of_stocking" "public"."type_of_stocking" NOT NULL
);


ALTER TABLE "public"."fish_stocking" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fish_transfer" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "origin_system_id" bigint NOT NULL,
    "target_system_id" bigint NOT NULL,
    "number_of_fish_transfer" double precision NOT NULL,
    "date" "date" NOT NULL,
    "total_weight_transfer" double precision NOT NULL,
    "abw" double precision,
    "batch_id" bigint,
    "transfer_type" "public"."transfer_type" DEFAULT 'transfer'::"public"."transfer_type" NOT NULL
);


ALTER TABLE "public"."fish_transfer" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "type" "public"."system_type" NOT NULL,
    "growth_stage" "public"."system_growth_stage" NOT NULL,
    "volume" double precision,
    "width" double precision,
    "length" double precision,
    "diameter" double precision,
    "depth" double precision,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "commissioned_at" "date",
    "decommissioned_at" "date",
    "farm_id" "uuid",
    "unit" "text"
);


ALTER TABLE "public"."system" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."analytics_system_day_mv" AS
 WITH "inventory_daily" AS (
         SELECT "dfit"."system_id",
            "dfit"."inventory_date" AS "fact_date",
            true AS "has_inventory",
            "dfit"."number_of_fish" AS "fish_end",
            "dfit"."biomass_last_sampling" AS "biomass_end",
            ("dfit"."abw_last_sampling")::double precision AS "abw",
            "dfit"."last_sampling_date" AS "sampling_end_date",
            ("dfit"."feeding_amount")::double precision AS "feeding_amount_inventory",
            ("dfit"."feeding_rate")::double precision AS "feeding_rate",
            ("dfit"."number_of_fish_mortality")::double precision AS "mortality_count_inventory",
            "dfit"."mortality_rate",
            ("dfit"."biomass_density")::double precision AS "biomass_density",
            ("dfit"."system_volume")::double precision AS "system_volume"
           FROM "public"."daily_fish_inventory_table" "dfit"
        ), "feeding_daily" AS (
         SELECT "fr"."system_id",
            "fr"."date" AS "fact_date",
            "sum"(COALESCE("fr"."feeding_amount", (0)::double precision)) AS "feeding_amount_recorded",
            ("count"(*))::integer AS "feeding_events_count"
           FROM "public"."feeding_record" "fr"
          GROUP BY "fr"."system_id", "fr"."date"
        ), "mortality_daily" AS (
         SELECT "fm"."system_id",
            "fm"."date" AS "fact_date",
            ("sum"(COALESCE("fm"."number_of_fish_mortality", (0)::bigint)))::double precision AS "mortality_count_recorded"
           FROM "public"."fish_mortality" "fm"
          GROUP BY "fm"."system_id", "fm"."date"
        ), "sampling_daily" AS (
         SELECT "fs"."system_id",
            "fs"."date" AS "fact_date",
            "avg"("fs"."abw") AS "abw_sampled",
            ("sum"(COALESCE("fs"."number_of_fish_sampling", (0)::bigint)))::double precision AS "number_of_fish_sampled",
            "sum"(COALESCE("fs"."total_weight_sampling", (0)::double precision)) AS "total_weight_sampled"
           FROM "public"."fish_sampling_weight" "fs"
          GROUP BY "fs"."system_id", "fs"."date"
        ), "stocking_daily" AS (
         SELECT "fs"."system_id",
            "fs"."date" AS "fact_date",
            ("sum"(COALESCE("fs"."number_of_fish_stocking", (0)::bigint)))::double precision AS "number_of_fish_stocked",
            "sum"(COALESCE("fs"."total_weight_stocking", (0)::double precision)) AS "total_weight_stocked"
           FROM "public"."fish_stocking" "fs"
          GROUP BY "fs"."system_id", "fs"."date"
        ), "harvest_daily" AS (
         SELECT "fh"."system_id",
            "fh"."date" AS "fact_date",
            ("sum"(COALESCE("fh"."number_of_fish_harvest", (0)::bigint)))::double precision AS "number_of_fish_harvested",
            "sum"(COALESCE("fh"."total_weight_harvest", (0)::double precision)) AS "total_weight_harvested"
           FROM "public"."fish_harvest" "fh"
          GROUP BY "fh"."system_id", "fh"."date"
        ), "transfer_out_daily" AS (
         SELECT "ft"."origin_system_id" AS "system_id",
            "ft"."date" AS "fact_date",
            "sum"(COALESCE("ft"."number_of_fish_transfer", (0)::double precision)) AS "number_of_fish_transfer_out",
            "sum"(COALESCE("ft"."total_weight_transfer", (0)::double precision)) AS "total_weight_transfer_out"
           FROM "public"."fish_transfer" "ft"
          GROUP BY "ft"."origin_system_id", "ft"."date"
        ), "transfer_in_daily" AS (
         SELECT "ft"."target_system_id" AS "system_id",
            "ft"."date" AS "fact_date",
            "sum"(COALESCE("ft"."number_of_fish_transfer", (0)::double precision)) AS "number_of_fish_transfer_in",
            "sum"(COALESCE("ft"."total_weight_transfer", (0)::double precision)) AS "total_weight_transfer_in"
           FROM "public"."fish_transfer" "ft"
          GROUP BY "ft"."target_system_id", "ft"."date"
        ), "water_quality_daily" AS (
         SELECT DISTINCT ON ("dwr"."system_id", "dwr"."rating_date") "dwr"."system_id",
            "dwr"."rating_date" AS "fact_date",
            ("dwr"."rating")::"text" AS "water_quality_rating",
            ("dwr"."rating_numeric")::double precision AS "water_quality_rating_numeric",
            ("dwr"."worst_parameter")::"text" AS "worst_parameter",
            "dwr"."worst_parameter_value",
            "dwr"."worst_parameter_unit"
           FROM "public"."daily_water_quality_rating" "dwr"
          ORDER BY "dwr"."system_id", "dwr"."rating_date", "dwr"."created_at" DESC, "dwr"."id" DESC
        ), "system_dates" AS (
         SELECT "inventory_daily"."system_id",
            "inventory_daily"."fact_date"
           FROM "inventory_daily"
        UNION
         SELECT "feeding_daily"."system_id",
            "feeding_daily"."fact_date"
           FROM "feeding_daily"
        UNION
         SELECT "mortality_daily"."system_id",
            "mortality_daily"."fact_date"
           FROM "mortality_daily"
        UNION
         SELECT "sampling_daily"."system_id",
            "sampling_daily"."fact_date"
           FROM "sampling_daily"
        UNION
         SELECT "stocking_daily"."system_id",
            "stocking_daily"."fact_date"
           FROM "stocking_daily"
        UNION
         SELECT "harvest_daily"."system_id",
            "harvest_daily"."fact_date"
           FROM "harvest_daily"
        UNION
         SELECT "transfer_out_daily"."system_id",
            "transfer_out_daily"."fact_date"
           FROM "transfer_out_daily"
        UNION
         SELECT "transfer_in_daily"."system_id",
            "transfer_in_daily"."fact_date"
           FROM "transfer_in_daily"
        UNION
         SELECT "water_quality_daily"."system_id",
            "water_quality_daily"."fact_date"
           FROM "water_quality_daily"
        )
 SELECT "s"."id" AS "system_id",
    "s"."farm_id",
    "s"."name" AS "system_name",
    "s"."growth_stage",
    COALESCE("s"."is_active", true) AS "is_active",
    "sd"."fact_date",
    COALESCE("inv"."has_inventory", false) AS "has_inventory",
    "inv"."fish_end",
    "inv"."biomass_end",
    "inv"."abw",
    "inv"."sampling_end_date",
    COALESCE("fd"."feeding_amount_recorded", "inv"."feeding_amount_inventory") AS "feeding_amount",
    "inv"."feeding_amount_inventory",
    "fd"."feeding_amount_recorded",
    "fd"."feeding_events_count",
    "inv"."feeding_rate",
    COALESCE("md"."mortality_count_recorded", "inv"."mortality_count_inventory") AS "mortality_count",
    "inv"."mortality_count_inventory",
    "md"."mortality_count_recorded",
    "inv"."mortality_rate",
    "inv"."biomass_density",
    "inv"."system_volume",
    "sm"."abw_sampled",
    "sm"."number_of_fish_sampled",
    "sm"."total_weight_sampled",
    "st"."number_of_fish_stocked",
    "st"."total_weight_stocked",
    "hv"."number_of_fish_harvested",
    "hv"."total_weight_harvested",
    "tin"."number_of_fish_transfer_in",
    "tin"."total_weight_transfer_in",
    "tout"."number_of_fish_transfer_out",
    "tout"."total_weight_transfer_out",
    "wq"."water_quality_rating",
    "wq"."water_quality_rating_numeric",
    "wq"."worst_parameter",
    "wq"."worst_parameter_value",
    "wq"."worst_parameter_unit"
   FROM (((((((((("system_dates" "sd"
     JOIN "public"."system" "s" ON (("s"."id" = "sd"."system_id")))
     LEFT JOIN "inventory_daily" "inv" ON ((("inv"."system_id" = "sd"."system_id") AND ("inv"."fact_date" = "sd"."fact_date"))))
     LEFT JOIN "feeding_daily" "fd" ON ((("fd"."system_id" = "sd"."system_id") AND ("fd"."fact_date" = "sd"."fact_date"))))
     LEFT JOIN "mortality_daily" "md" ON ((("md"."system_id" = "sd"."system_id") AND ("md"."fact_date" = "sd"."fact_date"))))
     LEFT JOIN "sampling_daily" "sm" ON ((("sm"."system_id" = "sd"."system_id") AND ("sm"."fact_date" = "sd"."fact_date"))))
     LEFT JOIN "stocking_daily" "st" ON ((("st"."system_id" = "sd"."system_id") AND ("st"."fact_date" = "sd"."fact_date"))))
     LEFT JOIN "harvest_daily" "hv" ON ((("hv"."system_id" = "sd"."system_id") AND ("hv"."fact_date" = "sd"."fact_date"))))
     LEFT JOIN "transfer_in_daily" "tin" ON ((("tin"."system_id" = "sd"."system_id") AND ("tin"."fact_date" = "sd"."fact_date"))))
     LEFT JOIN "transfer_out_daily" "tout" ON ((("tout"."system_id" = "sd"."system_id") AND ("tout"."fact_date" = "sd"."fact_date"))))
     LEFT JOIN "water_quality_daily" "wq" ON ((("wq"."system_id" = "sd"."system_id") AND ("wq"."fact_date" = "sd"."fact_date"))))
  WITH NO DATA;


ALTER TABLE "public"."analytics_system_day_mv" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."analytics_system_day" WITH ("security_invoker"='true') AS
 SELECT "analytics_system_day_mv"."system_id",
    "analytics_system_day_mv"."farm_id",
    "analytics_system_day_mv"."system_name",
    "analytics_system_day_mv"."growth_stage",
    "analytics_system_day_mv"."is_active",
    "analytics_system_day_mv"."fact_date",
    "analytics_system_day_mv"."has_inventory",
    "analytics_system_day_mv"."fish_end",
    "analytics_system_day_mv"."biomass_end",
    "analytics_system_day_mv"."abw",
    "analytics_system_day_mv"."sampling_end_date",
    "analytics_system_day_mv"."feeding_amount",
    "analytics_system_day_mv"."feeding_amount_inventory",
    "analytics_system_day_mv"."feeding_amount_recorded",
    "analytics_system_day_mv"."feeding_events_count",
    "analytics_system_day_mv"."feeding_rate",
    "analytics_system_day_mv"."mortality_count",
    "analytics_system_day_mv"."mortality_count_inventory",
    "analytics_system_day_mv"."mortality_count_recorded",
    "analytics_system_day_mv"."mortality_rate",
    "analytics_system_day_mv"."biomass_density",
    "analytics_system_day_mv"."system_volume",
    "analytics_system_day_mv"."abw_sampled",
    "analytics_system_day_mv"."number_of_fish_sampled",
    "analytics_system_day_mv"."total_weight_sampled",
    "analytics_system_day_mv"."number_of_fish_stocked",
    "analytics_system_day_mv"."total_weight_stocked",
    "analytics_system_day_mv"."number_of_fish_harvested",
    "analytics_system_day_mv"."total_weight_harvested",
    "analytics_system_day_mv"."number_of_fish_transfer_in",
    "analytics_system_day_mv"."total_weight_transfer_in",
    "analytics_system_day_mv"."number_of_fish_transfer_out",
    "analytics_system_day_mv"."total_weight_transfer_out",
    "analytics_system_day_mv"."water_quality_rating",
    "analytics_system_day_mv"."water_quality_rating_numeric",
    "analytics_system_day_mv"."worst_parameter",
    "analytics_system_day_mv"."worst_parameter_value",
    "analytics_system_day_mv"."worst_parameter_unit"
   FROM "public"."analytics_system_day_mv";


ALTER TABLE "public"."analytics_system_day" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."farm_user" (
    "farm_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
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
    "at"."created_at",
    "at"."updated_at"
   FROM "public"."alert_threshold" "at"
  WHERE ((("at"."farm_id" IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM "public"."farm_user" "fu"
          WHERE (("fu"."farm_id" = "at"."farm_id") AND ("fu"."user_id" = "auth"."uid"()))))) OR (("at"."system_id" IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM ("public"."system" "s"
             JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
          WHERE (("s"."id" = "at"."system_id") AND ("fu"."user_id" = "auth"."uid"()))))));


ALTER TABLE "public"."api_alert_thresholds" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."daily_fish_inventory" WITH ("security_invoker"='true') AS
 SELECT "t"."inventory_date",
    "t"."system_id",
    "s"."farm_id",
    "t"."number_of_fish",
    ("t"."number_of_fish_stocked")::double precision AS "number_of_fish_stocked",
    "t"."number_of_fish_transferred_in",
    ("t"."number_of_fish_mortality_aggregated")::double precision AS "number_of_fish_mortality_aggregated",
    ("t"."number_of_fish_mortality")::double precision AS "number_of_fish_mortality",
    "t"."number_of_fish_transferred_out",
    ("t"."number_of_fish_harvested")::double precision AS "number_of_fish_harvested",
    ("t"."feeding_amount")::double precision AS "feeding_amount",
    ("t"."feeding_amount_aggregated")::double precision AS "feeding_amount_aggregated",
    "t"."last_sampling_date",
    ("t"."abw_last_sampling")::double precision AS "abw_last_sampling",
    "t"."biomass_last_sampling",
    ("t"."feeding_rate")::double precision AS "feeding_rate",
    ("t"."system_volume")::double precision AS "system_volume",
    "t"."biomass_density",
    "t"."mortality_rate"
   FROM ("public"."daily_fish_inventory_table" "t"
     JOIN "public"."system" "s" ON (("s"."id" = "t"."system_id")));


ALTER TABLE "public"."daily_fish_inventory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."farm" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "location" "text",
    "owner" "text",
    "email" "text",
    "phone" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."farm" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."api_daily_fish_inventory" WITH ("security_invoker"='true') AS
 SELECT "dfi"."inventory_date",
    "dfi"."system_id",
    "dfi"."farm_id",
    "s"."name" AS "system_name",
    "f"."name" AS "farm_name",
    "dfi"."number_of_fish",
    "dfi"."number_of_fish_stocked",
    "dfi"."number_of_fish_transferred_in",
    "dfi"."number_of_fish_mortality_aggregated",
    "dfi"."number_of_fish_mortality",
    "dfi"."number_of_fish_transferred_out",
    "dfi"."number_of_fish_harvested",
    "dfi"."feeding_amount",
    "dfi"."feeding_amount_aggregated",
    "dfi"."last_sampling_date",
    "dfi"."abw_last_sampling",
    "dfi"."biomass_last_sampling",
    "dfi"."feeding_rate",
    "dfi"."system_volume",
    "dfi"."biomass_density",
    "dfi"."mortality_rate"
   FROM (("public"."daily_fish_inventory" "dfi"
     JOIN "public"."system" "s" ON (("s"."id" = "dfi"."system_id")))
     JOIN "public"."farm" "f" ON (("f"."id" = "s"."farm_id")))
  WHERE (EXISTS ( SELECT 1
           FROM "public"."farm_user" "fu"
          WHERE (("fu"."farm_id" = "s"."farm_id") AND ("fu"."user_id" = "auth"."uid"()))));


ALTER TABLE "public"."api_daily_fish_inventory" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."api_daily_water_quality_rating" WITH ("security_invoker"='true') AS
 SELECT "dwr"."system_id",
    "s"."farm_id",
    "s"."name" AS "system_name",
    "dwr"."rating_date",
    "dwr"."rating",
    "dwr"."rating_numeric",
    "dwr"."worst_parameter",
    "dwr"."worst_parameter_value",
    "dwr"."worst_parameter_unit",
    "dwr"."created_at"
   FROM ("public"."daily_water_quality_rating" "dwr"
     JOIN "public"."system" "s" ON (("s"."id" = "dwr"."system_id")))
  WHERE (EXISTS ( SELECT 1
           FROM "public"."farm_user" "fu"
          WHERE (("fu"."farm_id" = "s"."farm_id") AND ("fu"."user_id" = "auth"."uid"()))));


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


CREATE TABLE IF NOT EXISTS "public"."water_quality_measurement" (
    "id" bigint NOT NULL,
    "date" "date" NOT NULL,
    "time" time without time zone NOT NULL,
    "water_depth" double precision NOT NULL,
    "parameter_value" double precision NOT NULL,
    "system_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "parameter_name" "public"."water_quality_parameters" NOT NULL,
    "measured_at" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."water_quality_measurement" OWNER TO "postgres";


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
    "wqm"."created_at"
   FROM (("public"."water_quality_measurement" "wqm"
     JOIN "public"."system" "s" ON (("s"."id" = "wqm"."system_id")))
     JOIN "public"."water_quality_framework" "wqf" ON (("wqf"."parameter_name" = "wqm"."parameter_name")))
  WHERE (EXISTS ( SELECT 1
           FROM "public"."farm_user" "fu"
          WHERE (("fu"."farm_id" = "s"."farm_id") AND ("fu"."user_id" = "auth"."uid"()))));


ALTER TABLE "public"."api_water_quality_measurements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_config" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL
);


ALTER TABLE "public"."app_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."change_log" (
    "id" integer NOT NULL,
    "table_name" "text",
    "change_type" "text",
    "record_id" "text",
    "column_name" "text",
    "old_value" "text",
    "new_value" "text",
    "change_time" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."change_log" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."change_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."change_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."change_log_id_seq" OWNED BY "public"."change_log"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."daily_fish_inventory_table_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."daily_fish_inventory_table_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."daily_fish_inventory_table_id_seq" OWNED BY "public"."daily_fish_inventory_table"."id";



ALTER TABLE "public"."daily_water_quality_rating" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."daily_water_quality_rating_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."dashboard_time_period" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "time_period" "public"."time_period" NOT NULL,
    "days_since_start" integer NOT NULL,
    "days_since_end" bigint NOT NULL,
    "date_start" "date",
    "date_end" "date"
);


ALTER TABLE "public"."dashboard_time_period" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."dashboard" AS
 WITH "anchor" AS (
         SELECT "s"."farm_id",
            COALESCE("max"("dfit"."inventory_date"), CURRENT_DATE) AS "input_end_date"
           FROM ("public"."system" "s"
             LEFT JOIN "public"."daily_fish_inventory_table" "dfit" ON (("dfit"."system_id" = "s"."id")))
          WHERE (COALESCE("s"."is_active", true) = true)
          GROUP BY "s"."farm_id"
        ), "all_dates" AS (
         SELECT "a"."farm_id",
            ("dtp"."time_period")::"text" AS "time_period",
            ("a"."input_end_date" - (GREATEST("dtp"."days_since_start", 1) - 1)) AS "input_start_date",
            "a"."input_end_date"
           FROM ("public"."dashboard_time_period" "dtp"
             JOIN "anchor" "a" ON (true))
          WHERE ("dtp"."days_since_start" IS NOT NULL)
        ), "system_info" AS (
         SELECT "s"."id" AS "system_id",
            "s"."farm_id",
            "s"."name" AS "system_name",
            "s"."growth_stage",
            "s"."volume"
           FROM "public"."system" "s"
          WHERE (COALESCE("s"."is_active", true) = true)
        )
 SELECT "si"."system_id",
    "si"."farm_id",
    "si"."system_name",
    "si"."growth_stage",
    "ad"."input_start_date",
    "ad"."input_end_date",
    "ad"."time_period",
    NULL::"date" AS "sampling_start_date",
    NULL::"date" AS "sampling_end_date",
    NULL::double precision AS "total_feed_period",
    NULL::double precision AS "efcr_denominator_period",
    NULL::double precision AS "efcr",
    NULL::"date" AS "efcr_latest_date",
    'straight'::"public"."arrows" AS "efcr_arrow",
    NULL::double precision AS "abw",
    NULL::"date" AS "abw_latest_date",
    'straight'::"public"."arrows" AS "abw_arrow",
    NULL::double precision AS "feeding_rate",
    NULL::"date" AS "feeding_rate_latest_date",
    'straight'::"public"."arrows" AS "feeding_rate_arrow",
    NULL::double precision AS "mortality_rate",
    NULL::"date" AS "mortality_rate_latest_date",
    'straight'::"public"."arrows" AS "mortality_rate_arrow",
    NULL::double precision AS "biomass_density",
    'straight'::"public"."arrows" AS "biomass_density_arrow",
    NULL::double precision AS "average_biomass",
    NULL::double precision AS "average_number_of_fish",
    NULL::"date" AS "feeding_latest_date_recorded",
    NULL::"date" AS "feeding_latest_date_nonzero",
    NULL::"date" AS "mortality_latest_date_recorded",
    NULL::"date" AS "mortality_latest_date_nonzero",
    NULL::double precision AS "water_quality_rating_numeric_average",
    NULL::"public"."water_quality_rating" AS "water_quality_rating_average",
    NULL::"date" AS "water_quality_latest_date",
    'straight'::"public"."arrows" AS "water_quality_arrow"
   FROM ("system_info" "si"
     JOIN "all_dates" "ad" ON (("ad"."farm_id" = "si"."farm_id")))
  WITH NO DATA;


ALTER TABLE "public"."dashboard" OWNER TO "postgres";


ALTER TABLE "public"."dashboard_time_period" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."dashboard_time_period_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."production_cycle" (
    "cycle_id" integer NOT NULL,
    "system_id" bigint NOT NULL,
    "cycle_start" "date" NOT NULL,
    "cycle_end" "date",
    "ongoing_cycle" boolean NOT NULL,
    "delta_biomass" double precision,
    "delta_number_of_fish" bigint,
    CONSTRAINT "production_cycle_end_after_start" CHECK ((("cycle_end" IS NULL) OR ("cycle_end" >= "cycle_start"))),
    CONSTRAINT "production_cycle_ongoing_matches_end" CHECK (("ongoing_cycle" = ("cycle_end" IS NULL)))
);


ALTER TABLE "public"."production_cycle" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."production_summary" AS
 WITH "asof" AS (
         SELECT COALESCE(( SELECT "max"("dfit"."inventory_date") AS "max"
                   FROM "public"."daily_fish_inventory_table" "dfit"), CURRENT_DATE) AS "as_of_date"
        ), "cycle_map" AS (
         SELECT "pc"."cycle_id",
            "pc"."system_id",
            "pc"."cycle_start",
            LEAST(COALESCE("pc"."cycle_end", ( SELECT "asof"."as_of_date"
                   FROM "asof")), ( SELECT "asof"."as_of_date"
                   FROM "asof")) AS "cycle_end",
            (("pc"."cycle_end" IS NULL) OR ("pc"."cycle_end" > ( SELECT "asof"."as_of_date"
                   FROM "asof"))) AS "ongoing_cycle"
           FROM "public"."production_cycle" "pc"
        ), "base_data" AS (
         SELECT "fs"."date",
            "fs"."system_id",
            "sys"."name" AS "system_name",
            "sys"."growth_stage",
            "fs"."abw" AS "average_body_weight",
            "dfit"."number_of_fish" AS "number_of_fish_inventory",
            'sampling'::"text" AS "activity",
            2 AS "activity_rank"
           FROM (("public"."fish_sampling_weight" "fs"
             JOIN "public"."daily_fish_inventory_table" "dfit" ON ((("dfit"."inventory_date" = "fs"."date") AND ("dfit"."system_id" = "fs"."system_id"))))
             JOIN "public"."system" "sys" ON (("sys"."id" = "fs"."system_id")))
          WHERE ("fs"."date" <= ( SELECT "asof"."as_of_date"
                   FROM "asof"))
        UNION ALL
         SELECT "cm"."cycle_start" AS "date",
            "fst"."system_id",
            "sys"."name" AS "system_name",
            "sys"."growth_stage",
            "fst"."abw" AS "average_body_weight",
            ("fst"."number_of_fish_stocking")::double precision AS "number_of_fish_inventory",
            'stocking'::"text" AS "activity",
            1 AS "activity_rank"
           FROM (("cycle_map" "cm"
             JOIN "public"."fish_stocking" "fst" ON ((("fst"."system_id" = "cm"."system_id") AND ("fst"."date" = "cm"."cycle_start"))))
             JOIN "public"."system" "sys" ON (("sys"."id" = "fst"."system_id")))
          WHERE ("cm"."cycle_start" <= ( SELECT "asof"."as_of_date"
                   FROM "asof"))
        UNION ALL
         SELECT "cm"."cycle_end" AS "date",
            "fh"."system_id",
            "sys"."name" AS "system_name",
            "sys"."growth_stage",
            "fh"."abw" AS "average_body_weight",
            ("fh"."number_of_fish_harvest")::double precision AS "number_of_fish_inventory",
            'final harvest'::"text" AS "activity",
            3 AS "activity_rank"
           FROM (("cycle_map" "cm"
             JOIN "public"."fish_harvest" "fh" ON ((("fh"."system_id" = "cm"."system_id") AND ("fh"."date" = "cm"."cycle_end"))))
             JOIN "public"."system" "sys" ON (("sys"."id" = "fh"."system_id")))
          WHERE (("cm"."cycle_end" IS NOT NULL) AND ("cm"."cycle_end" <= ( SELECT "asof"."as_of_date"
                   FROM "asof")))
        ), "periods" AS (
         SELECT "cm"."cycle_id",
            "cm"."ongoing_cycle",
            "bd"."date",
            "bd"."system_id",
            "bd"."system_name",
            "bd"."growth_stage",
            "bd"."average_body_weight",
            "bd"."number_of_fish_inventory",
            "bd"."activity",
            "bd"."activity_rank",
            "lag"("bd"."date") OVER (PARTITION BY "bd"."system_id", "cm"."cycle_id" ORDER BY "bd"."date", "bd"."activity_rank") AS "previous_date"
           FROM ("base_data" "bd"
             JOIN "cycle_map" "cm" ON ((("cm"."system_id" = "bd"."system_id") AND ("bd"."date" >= "cm"."cycle_start") AND ("bd"."date" <= "cm"."cycle_end"))))
        ), "total_feed_amounts" AS (
         SELECT "p"."cycle_id",
            "p"."system_id",
            "p"."date",
            "p"."activity",
            COALESCE("sum"("fr"."feeding_amount"), (0)::double precision) AS "total_feed_amount_period"
           FROM ("periods" "p"
             LEFT JOIN "public"."feeding_record" "fr" ON ((("fr"."system_id" = "p"."system_id") AND ("p"."previous_date" IS NOT NULL) AND ((("p"."activity" = 'final harvest'::"text") AND ("fr"."date" >= "p"."previous_date") AND ("fr"."date" <= "p"."date")) OR (("p"."activity" <> 'final harvest'::"text") AND ("fr"."date" >= "p"."previous_date") AND ("fr"."date" < "p"."date"))))))
          GROUP BY "p"."cycle_id", "p"."system_id", "p"."date", "p"."activity"
        ), "mortality_amounts" AS (
         SELECT "p"."cycle_id",
            "p"."system_id",
            "p"."date",
            "p"."activity",
            (COALESCE("sum"("fm"."number_of_fish_mortality"), (0)::numeric))::double precision AS "mortality_period"
           FROM ("periods" "p"
             LEFT JOIN "public"."fish_mortality" "fm" ON ((("fm"."system_id" = "p"."system_id") AND ("p"."previous_date" IS NOT NULL) AND ("fm"."date" > "p"."previous_date") AND ("fm"."date" <= "p"."date"))))
          GROUP BY "p"."cycle_id", "p"."system_id", "p"."date", "p"."activity"
        ), "biomass_data" AS (
         SELECT "p"."cycle_id",
            "p"."ongoing_cycle",
            "p"."date",
            "p"."system_id",
            "p"."system_name",
            "p"."growth_stage",
            "p"."average_body_weight",
            "p"."number_of_fish_inventory",
            "p"."activity",
            "p"."activity_rank",
            "p"."previous_date",
            "fa"."total_feed_amount_period",
            "ma"."mortality_period" AS "daily_mortality_count",
            (("p"."average_body_weight" * "p"."number_of_fish_inventory") / (1000.0)::double precision) AS "total_biomass",
            "lag"((("p"."average_body_weight" * "p"."number_of_fish_inventory") / (1000.0)::double precision)) OVER (PARTITION BY "p"."system_id", "p"."cycle_id" ORDER BY "p"."date", "p"."activity_rank") AS "previous_total_biomass"
           FROM (("periods" "p"
             LEFT JOIN "total_feed_amounts" "fa" ON ((("fa"."cycle_id" = "p"."cycle_id") AND ("fa"."system_id" = "p"."system_id") AND ("fa"."date" = "p"."date") AND ("fa"."activity" = "p"."activity"))))
             LEFT JOIN "mortality_amounts" "ma" ON ((("ma"."cycle_id" = "p"."cycle_id") AND ("ma"."system_id" = "p"."system_id") AND ("ma"."date" = "p"."date") AND ("ma"."activity" = "p"."activity"))))
        ), "transfer_out_data" AS (
         SELECT "bd"."cycle_id",
            "bd"."system_id",
            "bd"."date",
            "bd"."activity",
            COALESCE("sum"("ft"."number_of_fish_transfer"), (0)::double precision) AS "number_of_fish_transfer_out",
            COALESCE("sum"("ft"."total_weight_transfer"), (0)::double precision) AS "total_weight_transfer_out"
           FROM ("biomass_data" "bd"
             LEFT JOIN "public"."fish_transfer" "ft" ON ((("ft"."origin_system_id" = "bd"."system_id") AND ("bd"."previous_date" IS NOT NULL) AND ("ft"."date" > "bd"."previous_date") AND ("ft"."date" <= "bd"."date") AND "public"."transfer_impacts_efcr"("ft"."transfer_type", "ft"."origin_system_id", "ft"."target_system_id"))))
          GROUP BY "bd"."cycle_id", "bd"."system_id", "bd"."date", "bd"."activity"
        ), "transfer_in_data" AS (
         SELECT "bd"."cycle_id",
            "bd"."system_id",
            "bd"."date",
            "bd"."activity",
            COALESCE("sum"("ft"."number_of_fish_transfer"), (0)::double precision) AS "number_of_fish_transfer_in",
            COALESCE("sum"("ft"."total_weight_transfer"), (0)::double precision) AS "total_weight_transfer_in"
           FROM ("biomass_data" "bd"
             LEFT JOIN "public"."fish_transfer" "ft" ON ((("ft"."target_system_id" = "bd"."system_id") AND ("bd"."previous_date" IS NOT NULL) AND ("ft"."date" > "bd"."previous_date") AND ("ft"."date" <= "bd"."date") AND "public"."transfer_impacts_efcr"("ft"."transfer_type", "ft"."origin_system_id", "ft"."target_system_id"))))
          GROUP BY "bd"."cycle_id", "bd"."system_id", "bd"."date", "bd"."activity"
        ), "harvest_data" AS (
         SELECT "bd"."cycle_id",
            "bd"."system_id",
            "bd"."date",
            "bd"."activity",
            (COALESCE("sum"("fh"."number_of_fish_harvest"), (0)::numeric))::double precision AS "number_of_fish_harvested",
            COALESCE("sum"("fh"."total_weight_harvest"), (0)::double precision) AS "total_weight_harvested"
           FROM ("biomass_data" "bd"
             LEFT JOIN "public"."fish_harvest" "fh" ON ((("fh"."system_id" = "bd"."system_id") AND ("bd"."previous_date" IS NOT NULL) AND ("fh"."date" > "bd"."previous_date") AND ("fh"."date" <= "bd"."date"))))
          GROUP BY "bd"."cycle_id", "bd"."system_id", "bd"."date", "bd"."activity"
        ), "stocking_data" AS (
         SELECT "bd"."cycle_id",
            "bd"."system_id",
            "bd"."date",
            "bd"."activity",
            (COALESCE("sum"("fs"."number_of_fish_stocking"), (0)::numeric))::double precision AS "number_of_fish_stocked",
            COALESCE("sum"("fs"."total_weight_stocking"), (0)::double precision) AS "total_weight_stocked"
           FROM ("biomass_data" "bd"
             LEFT JOIN "public"."fish_stocking" "fs" ON ((("fs"."system_id" = "bd"."system_id") AND ("bd"."previous_date" IS NOT NULL) AND ("fs"."date" > "bd"."previous_date") AND ("fs"."date" <= "bd"."date"))))
          GROUP BY "bd"."cycle_id", "bd"."system_id", "bd"."date", "bd"."activity"
        ), "consolidated" AS (
         SELECT "bd"."cycle_id",
            "bd"."date",
            "bd"."system_id",
            "bd"."system_name",
            "bd"."growth_stage",
            "bd"."ongoing_cycle",
            "bd"."average_body_weight",
            "bd"."number_of_fish_inventory",
            "bd"."total_feed_amount_period",
            "bd"."activity",
            "bd"."activity_rank",
            "bd"."total_biomass",
            COALESCE(("bd"."total_biomass" - "bd"."previous_total_biomass"), (0)::double precision) AS "biomass_increase_period",
            "sum"("bd"."total_feed_amount_period") OVER (PARTITION BY "bd"."system_id", "bd"."cycle_id" ORDER BY "bd"."date", "bd"."activity_rank") AS "total_feed_amount_aggregated",
            "sum"(COALESCE(("bd"."total_biomass" - "bd"."previous_total_biomass"), (0)::double precision)) OVER (PARTITION BY "bd"."system_id", "bd"."cycle_id" ORDER BY "bd"."date", "bd"."activity_rank") AS "biomass_increase_aggregated",
            "bd"."daily_mortality_count",
            "sum"("bd"."daily_mortality_count") OVER (PARTITION BY "bd"."system_id", "bd"."cycle_id" ORDER BY "bd"."date", "bd"."activity_rank") AS "cumulative_mortality",
            "tod"."number_of_fish_transfer_out",
            "tod"."total_weight_transfer_out",
            "sum"("tod"."total_weight_transfer_out") OVER (PARTITION BY "bd"."system_id", "bd"."cycle_id" ORDER BY "bd"."date", "bd"."activity_rank") AS "total_weight_transfer_out_aggregated",
            "tid"."number_of_fish_transfer_in",
            "tid"."total_weight_transfer_in",
            "sum"("tid"."total_weight_transfer_in") OVER (PARTITION BY "bd"."system_id", "bd"."cycle_id" ORDER BY "bd"."date", "bd"."activity_rank") AS "total_weight_transfer_in_aggregated",
            "hd"."number_of_fish_harvested",
            "hd"."total_weight_harvested",
            "sum"("hd"."total_weight_harvested") OVER (PARTITION BY "bd"."system_id", "bd"."cycle_id" ORDER BY "bd"."date", "bd"."activity_rank") AS "total_weight_harvested_aggregated",
                CASE
                    WHEN ("bd"."activity" = 'stocking'::"text") THEN "bd"."number_of_fish_inventory"
                    ELSE "sd"."number_of_fish_stocked"
                END AS "number_of_fish_stocked",
                CASE
                    WHEN ("bd"."activity" = 'stocking'::"text") THEN "bd"."total_biomass"
                    ELSE "sd"."total_weight_stocked"
                END AS "total_weight_stocked",
            "sum"(
                CASE
                    WHEN ("bd"."activity" = 'stocking'::"text") THEN "bd"."total_biomass"
                    ELSE "sd"."total_weight_stocked"
                END) OVER (PARTITION BY "bd"."system_id", "bd"."cycle_id" ORDER BY "bd"."date", "bd"."activity_rank") AS "total_weight_stocked_aggregated"
           FROM (((("biomass_data" "bd"
             LEFT JOIN "transfer_out_data" "tod" ON ((("tod"."cycle_id" = "bd"."cycle_id") AND ("tod"."system_id" = "bd"."system_id") AND ("tod"."date" = "bd"."date") AND ("tod"."activity" = "bd"."activity"))))
             LEFT JOIN "transfer_in_data" "tid" ON ((("tid"."cycle_id" = "bd"."cycle_id") AND ("tid"."system_id" = "bd"."system_id") AND ("tid"."date" = "bd"."date") AND ("tid"."activity" = "bd"."activity"))))
             LEFT JOIN "harvest_data" "hd" ON ((("hd"."cycle_id" = "bd"."cycle_id") AND ("hd"."system_id" = "bd"."system_id") AND ("hd"."date" = "bd"."date") AND ("hd"."activity" = "bd"."activity"))))
             LEFT JOIN "stocking_data" "sd" ON ((("sd"."cycle_id" = "bd"."cycle_id") AND ("sd"."system_id" = "bd"."system_id") AND ("sd"."date" = "bd"."date") AND ("sd"."activity" = "bd"."activity"))))
        )
 SELECT "c"."cycle_id",
    "c"."date",
    "c"."system_id",
    "c"."system_name",
    "c"."growth_stage",
    "c"."ongoing_cycle",
    "c"."average_body_weight",
    "c"."number_of_fish_inventory",
    "c"."total_feed_amount_period",
    "c"."activity",
    "c"."activity_rank",
    "c"."total_biomass",
    "c"."biomass_increase_period",
    "c"."total_feed_amount_aggregated",
    "c"."biomass_increase_aggregated",
    "c"."daily_mortality_count",
    "c"."cumulative_mortality",
    "c"."number_of_fish_transfer_out",
    "c"."total_weight_transfer_out",
    "c"."total_weight_transfer_out_aggregated",
    "c"."number_of_fish_transfer_in",
    "c"."total_weight_transfer_in",
    "c"."total_weight_transfer_in_aggregated",
    "c"."number_of_fish_harvested",
    "c"."total_weight_harvested",
    "c"."total_weight_harvested_aggregated",
    "c"."number_of_fish_stocked",
    "c"."total_weight_stocked",
    "c"."total_weight_stocked_aggregated",
        CASE
            WHEN (NULLIF(((((COALESCE("c"."biomass_increase_period", (0)::double precision) + "c"."total_weight_transfer_out") - "c"."total_weight_transfer_in") + "c"."total_weight_harvested") - "c"."total_weight_stocked"), (0)::double precision) IS NULL) THEN NULL::double precision
            ELSE ("c"."total_feed_amount_period" / NULLIF(((((COALESCE("c"."biomass_increase_period", (0)::double precision) + "c"."total_weight_transfer_out") - "c"."total_weight_transfer_in") + "c"."total_weight_harvested") - "c"."total_weight_stocked"), (0)::double precision))
        END AS "efcr_period",
        CASE
            WHEN (NULLIF(((((COALESCE("c"."biomass_increase_aggregated", (0)::double precision) + "c"."total_weight_transfer_out_aggregated") - "c"."total_weight_transfer_in_aggregated") + "c"."total_weight_harvested_aggregated") - "c"."total_weight_stocked_aggregated"), (0)::double precision) IS NULL) THEN NULL::double precision
            ELSE ("c"."total_feed_amount_aggregated" / NULLIF(((((COALESCE("c"."biomass_increase_aggregated", (0)::double precision) + "c"."total_weight_transfer_out_aggregated") - "c"."total_weight_transfer_in_aggregated") + "c"."total_weight_harvested_aggregated") - "c"."total_weight_stocked_aggregated"), (0)::double precision))
        END AS "efcr_aggregated"
   FROM "consolidated" "c"
  ORDER BY "c"."system_id", "c"."cycle_id", "c"."date", "c"."activity_rank"
  WITH NO DATA;


ALTER TABLE "public"."production_summary" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."efcr_period_last_sampling_view" AS
 WITH "bounds" AS (
         SELECT COALESCE("min"("dfit_1"."inventory_date"), CURRENT_DATE) AS "min_date",
            COALESCE("max"("dfit_1"."inventory_date"), CURRENT_DATE) AS "max_date"
           FROM "public"."daily_fish_inventory_table" "dfit_1"
        ), "date_series" AS (
         SELECT ("generate_series"((( SELECT "bounds"."min_date"
                   FROM "bounds"))::timestamp with time zone, (( SELECT "bounds"."max_date"
                   FROM "bounds"))::timestamp with time zone, '1 day'::interval))::"date" AS "inventory_date"
        ), "last_sampling_dates" AS (
         SELECT "fs"."system_id",
            "ds"."inventory_date",
            "max"("fs"."date") FILTER (WHERE ("fs"."date" <= "ds"."inventory_date")) AS "last_sampling_date"
           FROM ("public"."fish_sampling_weight" "fs"
             CROSS JOIN "date_series" "ds")
          WHERE ("fs"."date" <= "ds"."inventory_date")
          GROUP BY "fs"."system_id", "ds"."inventory_date"
        )
 SELECT "lsd"."system_id",
    "s"."farm_id",
    "lsd"."inventory_date",
    "lsd"."last_sampling_date",
    "ps"."efcr_period" AS "efcr_period_last_sampling",
    "dfit"."biomass_last_sampling",
    ("ps"."efcr_period" * "dfit"."biomass_last_sampling") AS "biomass_efcr_multiple"
   FROM ((("last_sampling_dates" "lsd"
     JOIN "public"."production_summary" "ps" ON ((("ps"."system_id" = "lsd"."system_id") AND ("ps"."date" = "lsd"."last_sampling_date"))))
     JOIN "public"."daily_fish_inventory_table" "dfit" ON ((("dfit"."system_id" = "lsd"."system_id") AND ("dfit"."inventory_date" = "lsd"."inventory_date"))))
     JOIN "public"."system" "s" ON (("s"."id" = "lsd"."system_id")))
  ORDER BY "lsd"."system_id", "lsd"."inventory_date"
  WITH NO DATA;


ALTER TABLE "public"."efcr_period_last_sampling_view" OWNER TO "postgres";


ALTER TABLE "public"."feed_incoming" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."feed_incoming_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."feed_plan" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "farm_id" bigint NOT NULL,
    "system_id" bigint,
    "batch_id" bigint,
    "effective_from" "date" NOT NULL,
    "effective_to" "date",
    "feed_type_id" bigint,
    "target_feeding_rate_pct" double precision NOT NULL,
    "target_efcr" double precision NOT NULL,
    "abw_min_g" double precision DEFAULT 0 NOT NULL,
    "abw_max_g" double precision,
    "notes" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "pellet_size_mm" "text",
    "feeding_sessions_per_day" smallint DEFAULT 4 NOT NULL
);


ALTER TABLE "public"."feed_plan" OWNER TO "postgres";


ALTER TABLE "public"."feed_plan" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."feed_plan_id_seq"
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
    "crude_protein_percentage" double precision NOT NULL,
    "crude_fat_percentage" double precision
);


ALTER TABLE "public"."feed_type" OWNER TO "postgres";


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



CREATE TABLE IF NOT EXISTS "public"."fingerling_batch" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "supplier_id" bigint NOT NULL,
    "date_of_delivery" "date" NOT NULL,
    "number_of_fish" bigint,
    "abw" double precision,
    "name" "text" NOT NULL,
    "farm_id" "uuid",
    CONSTRAINT "fingerling_batch_abw_positive" CHECK ((("abw" IS NULL) OR ("abw" > (0)::double precision))),
    CONSTRAINT "fingerling_batch_number_positive" CHECK ((("number_of_fish" IS NULL) OR ("number_of_fish" >= 0)))
);


ALTER TABLE "public"."fingerling_batch" OWNER TO "postgres";


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



CREATE SEQUENCE IF NOT EXISTS "public"."production_cycle_cycle_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."production_cycle_cycle_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."production_cycle_cycle_id_seq" OWNED BY "public"."production_cycle"."cycle_id";



CREATE OR REPLACE VIEW "public"."report_feed_incoming_enriched" WITH ("security_invoker"='true') AS
 SELECT "fi"."id",
    "fi"."created_at",
    "fi"."farm_id",
    "fi"."date",
    "fi"."feed_amount",
    "fi"."feed_type_id",
    "ft"."feed_line",
    ("ft"."feed_category")::"text" AS "feed_category",
    ("ft"."feed_pellet_size")::"text" AS "feed_pellet_size",
    "ft"."crude_protein_percentage",
    "ft"."crude_fat_percentage",
    COALESCE(NULLIF(TRIM(BOTH FROM "concat_ws"(' '::"text", "ft"."feed_line", ("ft"."feed_pellet_size")::"text")), ''::"text"), ('Feed '::"text" || ("fi"."feed_type_id")::"text")) AS "feed_label"
   FROM ("public"."feed_incoming" "fi"
     LEFT JOIN "public"."feed_type" "ft" ON (("ft"."id" = "fi"."feed_type_id")));


ALTER TABLE "public"."report_feed_incoming_enriched" OWNER TO "postgres";


ALTER TABLE "public"."system" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."system_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."user_profile" (
    "user_id" "uuid" NOT NULL,
    "theme" "text" DEFAULT 'light'::"text",
    "default_views" "jsonb",
    "notifications_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "full_name" "text",
    "role" "text",
    CONSTRAINT "user_profile_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'farm_manager'::"text", 'system_operator'::"text", 'data_analyst'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."user_profile" OWNER TO "postgres";


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



ALTER TABLE ONLY "public"."change_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."change_log_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."daily_fish_inventory_table" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."daily_fish_inventory_table_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."production_cycle" ALTER COLUMN "cycle_id" SET DEFAULT "nextval"('"public"."production_cycle_cycle_id_seq"'::"regclass");



ALTER TABLE ONLY "energy"."electrical_appliance"
    ADD CONSTRAINT "appliances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "energy"."power_consumption"
    ADD CONSTRAINT "power_consumption_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "energy"."solar_production_historical"
    ADD CONSTRAINT "solar_production_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "energy"."solar_production_prediction"
    ADD CONSTRAINT "solar_production_prediction_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "private"."farm_user_invitation"
    ADD CONSTRAINT "farm_user_invitation_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."_affected_systems"
    ADD CONSTRAINT "_affected_systems_pkey" PRIMARY KEY ("system_id");



ALTER TABLE ONLY "public"."_refresh_queue"
    ADD CONSTRAINT "_refresh_queue_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."alert_log"
    ADD CONSTRAINT "alert_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alert_threshold"
    ADD CONSTRAINT "alert_threshold_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_config"
    ADD CONSTRAINT "app_config_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."change_log"
    ADD CONSTRAINT "change_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_fish_inventory_table"
    ADD CONSTRAINT "daily_fish_inventory_table_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_fish_inventory_table"
    ADD CONSTRAINT "daily_fish_inventory_unique" UNIQUE ("system_id", "inventory_date");



ALTER TABLE ONLY "public"."daily_water_quality_rating"
    ADD CONSTRAINT "daily_water_quality_rating_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dashboard_time_period"
    ADD CONSTRAINT "dashboard_time_period_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dashboard_time_period"
    ADD CONSTRAINT "dashboard_time_period_time_period_key" UNIQUE ("time_period");



ALTER TABLE ONLY "public"."farm"
    ADD CONSTRAINT "farm_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."farm_user"
    ADD CONSTRAINT "farm_user_pkey" PRIMARY KEY ("farm_id", "user_id");



ALTER TABLE ONLY "public"."feed_incoming"
    ADD CONSTRAINT "feed_incoming_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feed_plan"
    ADD CONSTRAINT "feed_plan_no_duplicate_band" UNIQUE ("farm_id", "system_id", "batch_id", "abw_min_g", "effective_from");



ALTER TABLE ONLY "public"."feed_plan"
    ADD CONSTRAINT "feed_plan_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feeding_record"
    ADD CONSTRAINT "feed_record_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feed_supplier"
    ADD CONSTRAINT "feed_supplier_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feed_type"
    ADD CONSTRAINT "feed_type_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fingerling_batch"
    ADD CONSTRAINT "fingerling_batch_name_unique" UNIQUE ("name");



ALTER TABLE ONLY "public"."fingerling_batch"
    ADD CONSTRAINT "fingerling_batch_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fish_harvest"
    ADD CONSTRAINT "fish_harvest_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fish_sampling_weight"
    ADD CONSTRAINT "fish_weight_sampling_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fish_mortality"
    ADD CONSTRAINT "mortality_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."production_cycle"
    ADD CONSTRAINT "production_cycle_no_overlap" EXCLUDE USING "gist" ("system_id" WITH =, "daterange"("cycle_start", COALESCE("cycle_end", 'infinity'::"date"), '[]'::"text") WITH &&);



ALTER TABLE ONLY "public"."production_cycle"
    ADD CONSTRAINT "production_cycle_pkey_cycle_id" PRIMARY KEY ("cycle_id");



ALTER TABLE ONLY "public"."fish_stocking"
    ADD CONSTRAINT "stocking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fingerling_supplier"
    ADD CONSTRAINT "supplier_name_key" UNIQUE ("company_name");



ALTER TABLE ONLY "public"."fingerling_supplier"
    ADD CONSTRAINT "supplier_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system"
    ADD CONSTRAINT "system_name_unique" UNIQUE ("name");



ALTER TABLE ONLY "public"."system"
    ADD CONSTRAINT "system_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fish_transfer"
    ADD CONSTRAINT "transfer_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profile"
    ADD CONSTRAINT "user_profile_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."water_quality_framework"
    ADD CONSTRAINT "water_quality_framework_parameter_unique" UNIQUE ("parameter_name");



ALTER TABLE ONLY "public"."water_quality_framework"
    ADD CONSTRAINT "water_quality_framework_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."water_quality_measurement"
    ADD CONSTRAINT "water_quality_measurement_unique" UNIQUE ("system_id", "parameter_name", "date", "time", "water_depth");



ALTER TABLE ONLY "public"."water_quality_measurement"
    ADD CONSTRAINT "water_quality_measurements_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "farm_user_invitation_farm_email_key" ON "private"."farm_user_invitation" USING "btree" ("farm_id", "email");



CREATE INDEX "idx_farm_user_invitation_email" ON "private"."farm_user_invitation" USING "btree" ("email");



CREATE INDEX "idx_farm_user_invitation_status" ON "private"."farm_user_invitation" USING "btree" ("status");



CREATE UNIQUE INDEX "analytics_system_day_mv_system_date_key" ON "public"."analytics_system_day_mv" USING "btree" ("system_id", "fact_date");



CREATE INDEX "idx_alert_log_farm_fired_desc" ON "public"."alert_log" USING "btree" ("farm_id", "fired_at" DESC);



CREATE INDEX "idx_alert_log_system_fired_desc" ON "public"."alert_log" USING "btree" ("system_id", "fired_at" DESC);



CREATE INDEX "idx_alert_unacked" ON "public"."alert_log" USING "btree" ("farm_id", "severity") WHERE ("acknowledged_at" IS NULL);



CREATE INDEX "idx_analytics_system_day_mv_farm_date_desc" ON "public"."analytics_system_day_mv" USING "btree" ("farm_id", "fact_date" DESC, "system_id");



CREATE INDEX "idx_analytics_system_day_mv_system_date_desc" ON "public"."analytics_system_day_mv" USING "btree" ("system_id", "fact_date" DESC);



CREATE INDEX "idx_change_log_change_time" ON "public"."change_log" USING "btree" ("change_time");



CREATE INDEX "idx_daily_inventory_date" ON "public"."daily_fish_inventory_table" USING "btree" ("inventory_date");



CREATE INDEX "idx_daily_water_quality_rating_system_date_desc" ON "public"."daily_water_quality_rating" USING "btree" ("system_id", "rating_date" DESC, "created_at" DESC, "id" DESC);



CREATE INDEX "idx_daily_wq_rating_date" ON "public"."daily_water_quality_rating" USING "btree" ("rating_date");



CREATE INDEX "idx_daily_wq_system_date_desc" ON "public"."daily_water_quality_rating" USING "btree" ("system_id", "rating_date" DESC);



CREATE UNIQUE INDEX "idx_dashboard_system_period_end_desc" ON "public"."dashboard" USING "btree" ("system_id", "time_period", "input_end_date" DESC);



CREATE INDEX "idx_dfi_date_system" ON "public"."daily_fish_inventory_table" USING "btree" ("inventory_date", "system_id");



CREATE INDEX "idx_dfit_system_date" ON "public"."daily_fish_inventory_table" USING "btree" ("system_id", "inventory_date");



CREATE INDEX "idx_dwr_system_date" ON "public"."daily_water_quality_rating" USING "btree" ("system_id", "rating_date");



CREATE INDEX "idx_farm_user_farm_user_role" ON "public"."farm_user" USING "btree" ("farm_id", "user_id", "role");



CREATE INDEX "idx_farm_user_user_farm" ON "public"."farm_user" USING "btree" ("user_id", "farm_id");



CREATE INDEX "idx_farm_user_user_id" ON "public"."farm_user" USING "btree" ("user_id");



CREATE INDEX "idx_feed_incoming_farm_date_desc" ON "public"."feed_incoming" USING "btree" ("farm_id", "date" DESC);



CREATE INDEX "idx_feed_incoming_feed_type_date" ON "public"."feed_incoming" USING "btree" ("feed_type_id", "date" DESC);



CREATE INDEX "idx_feed_incoming_feed_type_id" ON "public"."feed_incoming" USING "btree" ("feed_type_id");



CREATE INDEX "idx_feed_type_feed_supplier" ON "public"."feed_type" USING "btree" ("feed_supplier");



CREATE INDEX "idx_fh_system_date" ON "public"."fish_harvest" USING "btree" ("system_id", "date");



CREATE INDEX "idx_fingerling_batch_farm_id" ON "public"."fingerling_batch" USING "btree" ("farm_id");



CREATE INDEX "idx_fish_harvest_batch_id" ON "public"."fish_harvest" USING "btree" ("batch_id");



CREATE INDEX "idx_fish_harvest_system_date_desc" ON "public"."fish_harvest" USING "btree" ("system_id", "date" DESC);



CREATE INDEX "idx_fish_mortality_batch_id" ON "public"."fish_mortality" USING "btree" ("batch_id");



CREATE INDEX "idx_fish_transfer_type_date_desc" ON "public"."fish_transfer" USING "btree" ("transfer_type", "date" DESC);



CREATE INDEX "idx_fm_system_date" ON "public"."fish_mortality" USING "btree" ("system_id", "date");



CREATE INDEX "idx_fr_system_date" ON "public"."feeding_record" USING "btree" ("system_id", "date");



CREATE INDEX "idx_fs_system_date" ON "public"."fish_stocking" USING "btree" ("system_id", "date");



CREATE INDEX "idx_fsw_system_date" ON "public"."fish_sampling_weight" USING "btree" ("system_id", "date");



CREATE INDEX "idx_ft_origin_date" ON "public"."fish_transfer" USING "btree" ("origin_system_id", "date");



CREATE INDEX "idx_ft_target_date" ON "public"."fish_transfer" USING "btree" ("target_system_id", "date");



CREATE INDEX "idx_system_farm_id" ON "public"."system" USING "btree" ("farm_id");



CREATE INDEX "idx_system_farm_id_id" ON "public"."system" USING "btree" ("farm_id", "id");



CREATE INDEX "idx_system_id_farm_id" ON "public"."system" USING "btree" ("id", "farm_id");



CREATE INDEX "idx_wqm_system_date_time" ON "public"."water_quality_measurement" USING "btree" ("system_id", "date", "time");



CREATE INDEX "idx_wqm_system_id" ON "public"."water_quality_measurement" USING "btree" ("system_id");



CREATE INDEX "idx_wqm_system_measured_at" ON "public"."water_quality_measurement" USING "btree" ("system_id", "measured_at");



CREATE UNIQUE INDEX "uq_one_active_cycle_per_system" ON "public"."production_cycle" USING "btree" ("system_id") WHERE ("ongoing_cycle" = true);



CREATE OR REPLACE TRIGGER "set_farm_user_invitation_updated_at" BEFORE UPDATE ON "private"."farm_user_invitation" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "after_feeding_record_update_inventory" AFTER INSERT OR DELETE OR UPDATE ON "public"."feeding_record" FOR EACH ROW EXECUTE FUNCTION "public"."after_event_update_inventory"();



CREATE OR REPLACE TRIGGER "after_fish_harvest_update_inventory" AFTER INSERT OR DELETE OR UPDATE ON "public"."fish_harvest" FOR EACH ROW EXECUTE FUNCTION "public"."after_event_update_inventory"();



CREATE OR REPLACE TRIGGER "after_fish_mortality_update_inventory" AFTER INSERT OR DELETE OR UPDATE ON "public"."fish_mortality" FOR EACH ROW EXECUTE FUNCTION "public"."after_event_update_inventory"();



CREATE OR REPLACE TRIGGER "after_fish_sampling_weight_update_inventory" AFTER INSERT OR DELETE OR UPDATE ON "public"."fish_sampling_weight" FOR EACH ROW EXECUTE FUNCTION "public"."after_event_update_inventory"();



CREATE OR REPLACE TRIGGER "after_fish_stocking_update_inventory" AFTER INSERT OR DELETE OR UPDATE ON "public"."fish_stocking" FOR EACH ROW EXECUTE FUNCTION "public"."after_event_update_inventory"();



CREATE OR REPLACE TRIGGER "after_fish_transfer_update_inventory" AFTER INSERT OR DELETE OR UPDATE ON "public"."fish_transfer" FOR EACH ROW EXECUTE FUNCTION "public"."after_event_update_inventory"();



CREATE OR REPLACE TRIGGER "change_log_alert_threshold" AFTER INSERT OR DELETE OR UPDATE ON "public"."alert_threshold" FOR EACH ROW EXECUTE FUNCTION "public"."log_row_change"();



CREATE OR REPLACE TRIGGER "change_log_farm" AFTER INSERT OR DELETE OR UPDATE ON "public"."farm" FOR EACH ROW EXECUTE FUNCTION "public"."log_row_change"();



CREATE OR REPLACE TRIGGER "change_log_system" AFTER INSERT OR DELETE OR UPDATE ON "public"."system" FOR EACH ROW EXECUTE FUNCTION "public"."log_row_change"();



CREATE OR REPLACE TRIGGER "change_log_user_profile" AFTER INSERT OR DELETE OR UPDATE ON "public"."user_profile" FOR EACH ROW EXECUTE FUNCTION "public"."log_row_change"();



CREATE OR REPLACE TRIGGER "feeding_record_changes_trigger" AFTER DELETE OR UPDATE ON "public"."feeding_record" FOR EACH ROW EXECUTE FUNCTION "public"."log_feeding_record_changes"();



CREATE OR REPLACE TRIGGER "fish_harvest_changes_trigger" AFTER DELETE OR UPDATE ON "public"."fish_harvest" FOR EACH ROW EXECUTE FUNCTION "public"."update_change_log"();



CREATE OR REPLACE TRIGGER "fish_mortality_changes_trigger" AFTER DELETE OR UPDATE ON "public"."fish_mortality" FOR EACH ROW EXECUTE FUNCTION "public"."update_change_log"();



CREATE OR REPLACE TRIGGER "fish_sampling_weight_changes_trigger" AFTER DELETE OR UPDATE ON "public"."fish_sampling_weight" FOR EACH ROW EXECUTE FUNCTION "public"."update_change_log"();



CREATE OR REPLACE TRIGGER "fish_stocking_changes_trigger" AFTER DELETE OR UPDATE ON "public"."fish_stocking" FOR EACH ROW EXECUTE FUNCTION "public"."update_change_log"();



CREATE OR REPLACE TRIGGER "fish_transfer_changes_trigger" AFTER DELETE OR UPDATE ON "public"."fish_transfer" FOR EACH ROW EXECUTE FUNCTION "public"."update_change_log"();



CREATE OR REPLACE TRIGGER "prevent_system_name_change" BEFORE UPDATE ON "public"."system" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_system_name_update"();



CREATE OR REPLACE TRIGGER "refresh_after_system" AFTER INSERT OR DELETE OR UPDATE ON "public"."system" FOR EACH ROW EXECUTE FUNCTION "public"."refresh_after_system_if_needed"();



CREATE OR REPLACE TRIGGER "trg_assign_feed_incoming_farm_if_missing" BEFORE INSERT OR UPDATE OF "farm_id" ON "public"."feed_incoming" FOR EACH ROW EXECUTE FUNCTION "public"."assign_feed_incoming_farm_if_missing"();



CREATE OR REPLACE TRIGGER "trg_close_cycle_on_final_harvest" AFTER INSERT OR UPDATE OF "type_of_harvest", "date", "system_id" ON "public"."fish_harvest" FOR EACH ROW EXECUTE FUNCTION "public"."close_cycle_on_final_harvest"();



CREATE OR REPLACE TRIGGER "trg_cycle_on_stocking" AFTER INSERT ON "public"."fish_stocking" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_cycle_on_stocking"();



CREATE OR REPLACE TRIGGER "trg_mortality_mass_alert" AFTER INSERT OR UPDATE ON "public"."fish_mortality" FOR EACH ROW EXECUTE FUNCTION "public"."trg_mortality_mass_alert"();



CREATE OR REPLACE TRIGGER "trg_production_cycle_set_ongoing" BEFORE INSERT OR UPDATE OF "cycle_end" ON "public"."production_cycle" FOR EACH ROW EXECUTE FUNCTION "public"."production_cycle_set_ongoing"();



CREATE OR REPLACE TRIGGER "trg_water_quality_alert_check" AFTER INSERT ON "public"."water_quality_measurement" FOR EACH ROW EXECUTE FUNCTION "public"."trg_wq_alert_check"();



CREATE OR REPLACE TRIGGER "water_quality_framework_refresh_daily_rating" AFTER UPDATE ON "public"."water_quality_framework" FOR EACH ROW EXECUTE FUNCTION "public"."trg_refresh_daily_water_quality_rating_from_framework"();



CREATE OR REPLACE TRIGGER "water_quality_measurement_refresh_daily_rating" AFTER INSERT OR DELETE OR UPDATE ON "public"."water_quality_measurement" FOR EACH ROW EXECUTE FUNCTION "public"."trg_refresh_daily_water_quality_rating"();



ALTER TABLE ONLY "private"."farm_user_invitation"
    ADD CONSTRAINT "farm_user_invitation_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "private"."farm_user_invitation"
    ADD CONSTRAINT "farm_user_invitation_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "private"."farm_user_invitation"
    ADD CONSTRAINT "farm_user_invitation_invited_user_id_fkey" FOREIGN KEY ("invited_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."alert_log"
    ADD CONSTRAINT "alert_log_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."alert_log"
    ADD CONSTRAINT "alert_log_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."alert_log"
    ADD CONSTRAINT "alert_log_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."alert_threshold"
    ADD CONSTRAINT "alert_threshold_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."alert_threshold"
    ADD CONSTRAINT "alert_threshold_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_fish_inventory_table"
    ADD CONSTRAINT "daily_fish_inventory_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."daily_water_quality_rating"
    ADD CONSTRAINT "daily_water_quality_rating_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."farm_user"
    ADD CONSTRAINT "farm_user_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."farm_user"
    ADD CONSTRAINT "farm_user_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feed_incoming"
    ADD CONSTRAINT "feed_incoming_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id");



ALTER TABLE ONLY "public"."feed_incoming"
    ADD CONSTRAINT "feed_incoming_feed_id_fkey" FOREIGN KEY ("feed_type_id") REFERENCES "public"."feed_type"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."feed_plan"
    ADD CONSTRAINT "feed_plan_batch_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."fingerling_batch"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."feed_plan"
    ADD CONSTRAINT "feed_plan_feed_type_fkey" FOREIGN KEY ("feed_type_id") REFERENCES "public"."feed_type"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."feed_plan"
    ADD CONSTRAINT "feed_plan_system_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."feeding_record"
    ADD CONSTRAINT "feed_record_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."feed_type"
    ADD CONSTRAINT "feed_type_feed_supplier_fkey" FOREIGN KEY ("feed_supplier") REFERENCES "public"."feed_supplier"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."feeding_record"
    ADD CONSTRAINT "feeding_record_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."fingerling_batch"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."feeding_record"
    ADD CONSTRAINT "feeding_record_feed_id_fkey" FOREIGN KEY ("feed_type_id") REFERENCES "public"."feed_type"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."fingerling_batch"
    ADD CONSTRAINT "fingerling_batch_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id");



ALTER TABLE ONLY "public"."fingerling_batch"
    ADD CONSTRAINT "fingerling_batch_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."fingerling_supplier"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."fish_harvest"
    ADD CONSTRAINT "fish_harvest_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."fingerling_batch"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."fish_harvest"
    ADD CONSTRAINT "fish_harvest_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."fish_mortality"
    ADD CONSTRAINT "fish_mortality_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."fingerling_batch"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."fish_mortality"
    ADD CONSTRAINT "fish_mortality_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id");



ALTER TABLE ONLY "public"."fish_mortality"
    ADD CONSTRAINT "fish_mortality_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."fish_sampling_weight"
    ADD CONSTRAINT "fish_sampling_weight_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."fingerling_batch"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."fish_stocking"
    ADD CONSTRAINT "fish_stocking_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."fingerling_batch"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."fish_transfer"
    ADD CONSTRAINT "fish_transfer_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."fingerling_batch"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."fish_sampling_weight"
    ADD CONSTRAINT "fish_weight_sampling_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."fish_mortality"
    ADD CONSTRAINT "mortality_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."production_cycle"
    ADD CONSTRAINT "production_cycle_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."fish_stocking"
    ADD CONSTRAINT "stocking_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."system"
    ADD CONSTRAINT "system_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fish_transfer"
    ADD CONSTRAINT "transfer_origin_system_id_fkey" FOREIGN KEY ("origin_system_id") REFERENCES "public"."system"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."fish_transfer"
    ADD CONSTRAINT "transfer_target_system_id_fkey" FOREIGN KEY ("target_system_id") REFERENCES "public"."system"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."water_quality_measurement"
    ADD CONSTRAINT "water_quality_measurement_parameter_fkey" FOREIGN KEY ("parameter_name") REFERENCES "public"."water_quality_framework"("parameter_name");



ALTER TABLE ONLY "public"."water_quality_measurement"
    ADD CONSTRAINT "water_quality_measurements_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id") ON UPDATE CASCADE;



ALTER TABLE "energy"."electrical_appliance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "energy"."power_consumption" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "energy"."solar_production_historical" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "energy"."solar_production_prediction" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Authenticated users can read change_log" ON "public"."change_log" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can read daily_fish_inventory_table" ON "public"."daily_fish_inventory_table" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can read water_quality_framework" ON "public"."water_quality_framework" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Profiles viewable by farm members" ON "public"."user_profile" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."farm_user" "fu1"
     JOIN "public"."farm_user" "fu2" ON (("fu1"."farm_id" = "fu2"."farm_id")))
  WHERE (("fu1"."user_id" = "auth"."uid"()) AND ("fu2"."user_id" = "user_profile"."user_id")))));



CREATE POLICY "Users can insert their own profile" ON "public"."user_profile" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."user_profile" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."_affected_systems" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."_refresh_queue" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "affected_systems_service" ON "public"."_affected_systems" USING (true);



ALTER TABLE "public"."alert_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "alert_log_isolation" ON "public"."alert_log" USING (("farm_id" IN ( SELECT "fu"."farm_id"
   FROM "public"."farm_user" "fu"
  WHERE ("fu"."user_id" = "auth"."uid"())))) WITH CHECK (("farm_id" IN ( SELECT "fu"."farm_id"
   FROM "public"."farm_user" "fu"
  WHERE ("fu"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."alert_threshold" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "alert_threshold_delete" ON "public"."alert_threshold" FOR DELETE TO "authenticated" USING (((("scope" = 'farm'::"text") AND "public"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"], ( SELECT "auth"."uid"() AS "uid"))) OR (("scope" = 'system'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."system" "s"
  WHERE (("s"."id" = "alert_threshold"."system_id") AND "public"."has_farm_role"("s"."farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"], ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "alert_threshold_select_farm_member" ON "public"."alert_threshold" FOR SELECT TO "authenticated" USING (((("farm_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE (("fu"."farm_id" = "alert_threshold"."farm_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) OR (("system_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "alert_threshold"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "alert_threshold_update_admin_manager" ON "public"."alert_threshold" FOR UPDATE TO "authenticated" USING (((("farm_id" IS NOT NULL) AND "public"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"])) OR (("system_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."system" "s"
  WHERE (("s"."id" = "alert_threshold"."system_id") AND "public"."has_farm_role"("s"."farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"]))))))) WITH CHECK (((("farm_id" IS NOT NULL) AND "public"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"])) OR (("system_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."system" "s"
  WHERE (("s"."id" = "alert_threshold"."system_id") AND "public"."has_farm_role"("s"."farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"])))))));



CREATE POLICY "alert_threshold_write_admin_manager" ON "public"."alert_threshold" FOR INSERT TO "authenticated" WITH CHECK (((("farm_id" IS NOT NULL) AND "public"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"])) OR (("system_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."system" "s"
  WHERE (("s"."id" = "alert_threshold"."system_id") AND "public"."has_farm_role"("s"."farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"])))))));



ALTER TABLE "public"."app_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "app_config_select" ON "public"."app_config" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."change_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_fish_inventory_table" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_water_quality_rating" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dashboard_time_period" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dashboard_time_period_select" ON "public"."dashboard_time_period" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "dwr_select_farm_member" ON "public"."daily_water_quality_rating" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "daily_water_quality_rating"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."farm" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "farm_delete" ON "public"."farm" FOR DELETE USING ("public"."has_farm_role"("id", ARRAY['admin'::"text", 'farm_manager'::"text"], ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "farm_insert" ON "public"."farm" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "farm_select" ON "public"."farm" FOR SELECT USING ("public"."is_farm_member"("id", ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "farm_update" ON "public"."farm" FOR UPDATE USING ("public"."has_farm_role"("id", ARRAY['admin'::"text", 'farm_manager'::"text"], ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."has_farm_role"("id", ARRAY['admin'::"text", 'farm_manager'::"text"], ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."farm_user" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "farm_user: read own" ON "public"."farm_user" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "farm_user_delete" ON "public"."farm_user" FOR DELETE TO "authenticated" USING ("public"."has_farm_role"("farm_id", ARRAY['admin'::"text"], ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "farm_user_insert" ON "public"."farm_user" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_farm_role"("farm_id", ARRAY['admin'::"text"], ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "farm_user_update" ON "public"."farm_user" FOR UPDATE TO "authenticated" USING ("public"."has_farm_role"("farm_id", ARRAY['admin'::"text"], ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."has_farm_role"("farm_id", ARRAY['admin'::"text"], ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."feed_incoming" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feed_incoming_delete" ON "public"."feed_incoming" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE (("fu"."farm_id" = "feed_incoming"."farm_id") AND ("fu"."user_id" = "auth"."uid"())))));



CREATE POLICY "feed_incoming_insert" ON "public"."feed_incoming" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE (("fu"."farm_id" = "feed_incoming"."farm_id") AND ("fu"."user_id" = "auth"."uid"())))));



CREATE POLICY "feed_incoming_select" ON "public"."feed_incoming" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE (("fu"."farm_id" = "feed_incoming"."farm_id") AND ("fu"."user_id" = "auth"."uid"())))));



CREATE POLICY "feed_incoming_update" ON "public"."feed_incoming" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE (("fu"."farm_id" = "feed_incoming"."farm_id") AND ("fu"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE (("fu"."farm_id" = "feed_incoming"."farm_id") AND ("fu"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."feed_plan" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feed_plan_select" ON "public"."feed_plan" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."feed_supplier" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feed_supplier_insert_authenticated" ON "public"."feed_supplier" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "feed_supplier_select" ON "public"."feed_supplier" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."feed_type" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feed_type: read if farm member" ON "public"."feed_type" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "feed_type_insert_authenticated" ON "public"."feed_type" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



ALTER TABLE "public"."feeding_record" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feeding_record: insert if farm member" ON "public"."feeding_record" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "feeding_record"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "feeding_record: read if farm member" ON "public"."feeding_record" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "feeding_record"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."fingerling_batch" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fingerling_batch: read if user is farm member" ON "public"."fingerling_batch" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "fingerling_batch_insert_farm_member" ON "public"."fingerling_batch" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_farm_member"("farm_id", ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."fingerling_supplier" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fingerling_supplier: read if farm member" ON "public"."fingerling_supplier" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."farm_user" "fu"
  WHERE ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "fingerling_supplier_insert_authenticated" ON "public"."fingerling_supplier" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



ALTER TABLE "public"."fish_harvest" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fish_harvest: insert if farm member" ON "public"."fish_harvest" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_harvest"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "fish_harvest: read if farm member" ON "public"."fish_harvest" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_harvest"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."fish_mortality" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fish_mortality: insert if farm member" ON "public"."fish_mortality" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_mortality"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "fish_mortality: read if farm member" ON "public"."fish_mortality" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_mortality"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."fish_sampling_weight" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fish_sampling_weight: insert if farm member" ON "public"."fish_sampling_weight" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_sampling_weight"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "fish_sampling_weight: read if farm member" ON "public"."fish_sampling_weight" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_sampling_weight"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."fish_stocking" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fish_stocking: insert if farm member" ON "public"."fish_stocking" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_stocking"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "fish_stocking: read if farm member" ON "public"."fish_stocking" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "fish_stocking"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."fish_transfer" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fish_transfer: insert if farm member" ON "public"."fish_transfer" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("s"."id" = "fish_transfer"."origin_system_id") OR ("s"."id" = "fish_transfer"."target_system_id"))))));



CREATE POLICY "fish_transfer: read if farm member" ON "public"."fish_transfer" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("s"."id" = "fish_transfer"."origin_system_id") OR ("s"."id" = "fish_transfer"."target_system_id"))))));



ALTER TABLE "public"."production_cycle" ENABLE ROW LEVEL SECURITY;


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



CREATE POLICY "refresh_queue_insert" ON "public"."_refresh_queue" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "refresh_queue_select" ON "public"."_refresh_queue" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."system" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "system_delete" ON "public"."system" FOR DELETE USING ("public"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"], ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "system_insert" ON "public"."system" FOR INSERT WITH CHECK ("public"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"], ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "system_select" ON "public"."system" FOR SELECT TO "authenticated" USING ("public"."is_farm_member"("farm_id", ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "system_update" ON "public"."system" FOR UPDATE USING ("public"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"], ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."has_farm_role"("farm_id", ARRAY['admin'::"text", 'farm_manager'::"text"], ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."user_profile" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_profile_insert" ON "public"."user_profile" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "user_profile_select" ON "public"."user_profile" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "user_profile_update" ON "public"."user_profile" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."water_quality_framework" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."water_quality_measurement" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "water_quality_measurement: insert if farm member" ON "public"."water_quality_measurement" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "water_quality_measurement"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "wqm_select_farm_member" ON "public"."water_quality_measurement" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."system" "s"
     JOIN "public"."farm_user" "fu" ON (("fu"."farm_id" = "s"."farm_id")))
  WHERE (("s"."id" = "water_quality_measurement"."system_id") AND ("fu"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";









GRANT USAGE ON SCHEMA "private" TO "service_role";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "private"."apply_pending_farm_user_invitations"("p_user_id" "uuid", "p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."after_event_update_inventory"() TO "anon";
GRANT ALL ON FUNCTION "public"."after_event_update_inventory"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."after_event_update_inventory"() TO "service_role";



GRANT ALL ON FUNCTION "public"."api_daily_fish_inventory"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date", "p_cursor_date" "date", "p_order_asc" boolean, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."api_daily_fish_inventory"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date", "p_cursor_date" "date", "p_order_asc" boolean, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_daily_fish_inventory"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date", "p_cursor_date" "date", "p_order_asc" boolean, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."api_daily_fish_inventory_rpc"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date", "p_cursor_date" "date", "p_cursor_system_id" bigint, "p_order_asc" boolean, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."api_daily_fish_inventory_rpc"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date", "p_cursor_date" "date", "p_cursor_system_id" bigint, "p_order_asc" boolean, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_daily_fish_inventory_rpc"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date", "p_cursor_date" "date", "p_cursor_system_id" bigint, "p_order_asc" boolean, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."api_daily_overlay"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."api_daily_overlay"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_daily_overlay"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."api_dashboard"("p_farm_id" "uuid", "p_system_id" bigint, "p_growth_stage" "text", "p_start_date" "date", "p_end_date" "date", "p_time_period" "text", "p_limit" integer, "p_order_desc" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."api_dashboard"("p_farm_id" "uuid", "p_system_id" bigint, "p_growth_stage" "text", "p_start_date" "date", "p_end_date" "date", "p_time_period" "text", "p_limit" integer, "p_order_desc" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_dashboard"("p_farm_id" "uuid", "p_system_id" bigint, "p_growth_stage" "text", "p_start_date" "date", "p_end_date" "date", "p_time_period" "text", "p_limit" integer, "p_order_desc" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."api_dashboard_consolidated"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date", "p_time_period" "text", "p_limit" integer, "p_order_desc" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."api_dashboard_consolidated"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date", "p_time_period" "text", "p_limit" integer, "p_order_desc" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_dashboard_consolidated"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date", "p_time_period" "text", "p_limit" integer, "p_order_desc" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."api_dashboard_systems"("p_farm_id" "uuid", "p_stage" "public"."system_growth_stage", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."api_dashboard_systems"("p_farm_id" "uuid", "p_stage" "public"."system_growth_stage", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_dashboard_systems"("p_farm_id" "uuid", "p_stage" "public"."system_growth_stage", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."api_efcr_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."api_efcr_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_efcr_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."api_farm_options_rpc"() TO "anon";
GRANT ALL ON FUNCTION "public"."api_farm_options_rpc"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_farm_options_rpc"() TO "service_role";



GRANT ALL ON FUNCTION "public"."api_farm_user_invitations"("p_farm_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."api_farm_user_invitations"("p_farm_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_farm_user_invitations"("p_farm_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."api_feed_type_options_rpc"() TO "anon";
GRANT ALL ON FUNCTION "public"."api_feed_type_options_rpc"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_feed_type_options_rpc"() TO "service_role";



GRANT ALL ON FUNCTION "public"."api_fingerling_batch_options_rpc"("p_farm_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."api_fingerling_batch_options_rpc"("p_farm_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_fingerling_batch_options_rpc"("p_farm_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."api_latest_water_quality_status"("p_farm_id" "uuid", "p_system_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."api_latest_water_quality_status"("p_farm_id" "uuid", "p_system_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_latest_water_quality_status"("p_farm_id" "uuid", "p_system_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."api_production_summary"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."api_production_summary"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_production_summary"("p_farm_id" "uuid", "p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."api_system_options_rpc"("p_farm_id" "uuid", "p_stage" "public"."system_growth_stage", "p_active_only" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."api_system_options_rpc"("p_farm_id" "uuid", "p_stage" "public"."system_growth_stage", "p_active_only" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_system_options_rpc"("p_farm_id" "uuid", "p_stage" "public"."system_growth_stage", "p_active_only" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."api_system_timeline_bounds"("p_farm_id" "uuid", "p_system_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."api_system_timeline_bounds"("p_farm_id" "uuid", "p_system_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_system_timeline_bounds"("p_farm_id" "uuid", "p_system_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."api_time_period_bounds"("p_farm_id" "uuid", "p_time_period" "text", "p_anchor_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."api_time_period_bounds"("p_farm_id" "uuid", "p_time_period" "text", "p_anchor_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_time_period_bounds"("p_farm_id" "uuid", "p_time_period" "text", "p_anchor_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."api_time_period_bounds_scoped"("p_farm_id" "uuid", "p_time_period" "text", "p_scope" "text", "p_anchor_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."api_time_period_bounds_scoped"("p_farm_id" "uuid", "p_time_period" "text", "p_scope" "text", "p_anchor_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_time_period_bounds_scoped"("p_farm_id" "uuid", "p_time_period" "text", "p_scope" "text", "p_anchor_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."api_time_period_options"() TO "anon";
GRANT ALL ON FUNCTION "public"."api_time_period_options"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_time_period_options"() TO "service_role";



GRANT ALL ON FUNCTION "public"."api_water_quality_sync_status"("p_farm_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."api_water_quality_sync_status"("p_farm_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_water_quality_sync_status"("p_farm_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."assign_feed_incoming_farm_if_missing"() TO "anon";
GRANT ALL ON FUNCTION "public"."assign_feed_incoming_farm_if_missing"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_feed_incoming_farm_if_missing"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "postgres";
GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "anon";
GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "service_role";



GRANT ALL ON FUNCTION "public"."claim_my_farm_user_invitations"() TO "anon";
GRANT ALL ON FUNCTION "public"."claim_my_farm_user_invitations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_my_farm_user_invitations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."classify_water_quality_measurement"("p_parameter_value" double precision, "p_optimal" "jsonb", "p_acceptable" "jsonb", "p_critical" "jsonb", "p_lethal" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."classify_water_quality_measurement"("p_parameter_value" double precision, "p_optimal" "jsonb", "p_acceptable" "jsonb", "p_critical" "jsonb", "p_lethal" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."classify_water_quality_measurement"("p_parameter_value" double precision, "p_optimal" "jsonb", "p_acceptable" "jsonb", "p_critical" "jsonb", "p_lethal" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."close_cycle_on_final_harvest"() TO "anon";
GRANT ALL ON FUNCTION "public"."close_cycle_on_final_harvest"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."close_cycle_on_final_harvest"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_farm_user_invitation"("p_farm_id" "uuid", "p_email" "text", "p_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_farm_user_invitation"("p_farm_id" "uuid", "p_email" "text", "p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_farm_user_invitation"("p_farm_id" "uuid", "p_email" "text", "p_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "postgres";
GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "anon";
GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_cycle_on_stocking"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_cycle_on_stocking"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_cycle_on_stocking"() TO "service_role";



GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "postgres";
GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "anon";
GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "service_role";



GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_farm_kpis_today"("p_farm_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_farm_kpis_today"("p_farm_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_farm_kpis_today"("p_farm_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_fcr_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_fcr_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_fcr_trend"("p_farm_id" "uuid", "p_system_id" bigint, "p_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_growth_trend"("p_system_id" bigint, "p_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_growth_trend"("p_system_id" bigint, "p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_growth_trend"("p_system_id" bigint, "p_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_running_stock"("p_farm_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_running_stock"("p_farm_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_running_stock"("p_farm_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_survival_trend"("p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_survival_trend"("p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_survival_trend"("p_system_id" bigint, "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_farm_role"("farm" "uuid", "roles" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."has_farm_role"("farm" "uuid", "roles" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_farm_role"("farm" "uuid", "roles" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."has_farm_role"("farm" "uuid", "roles" "text"[], "_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_farm_role"("farm" "uuid", "roles" "text"[], "_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_farm_role"("farm" "uuid", "roles" "text"[], "_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "postgres";
GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "anon";
GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "service_role";



GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "postgres";
GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "postgres";
GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "anon";
GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "authenticated";
GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_farm_member"("farm" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_farm_member"("farm" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_farm_member"("farm" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_farm_member"("farm" "uuid", "_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_farm_member"("farm" "uuid", "_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_farm_member"("farm" "uuid", "_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_feeding_record_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_feeding_record_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_feeding_record_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_row_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_row_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_row_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_farm_user_invitation_sent"("p_invitation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_farm_user_invitation_sent"("p_invitation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_farm_user_invitation_sent"("p_invitation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "postgres";
GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "anon";
GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_system_name_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_system_name_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_system_name_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_inventory_queue"("p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."process_inventory_queue"("p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_inventory_queue"("p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."production_cycle_set_ongoing"() TO "anon";
GRANT ALL ON FUNCTION "public"."production_cycle_set_ongoing"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."production_cycle_set_ongoing"() TO "service_role";



GRANT ALL ON FUNCTION "public"."provision_default_farm_membership"() TO "anon";
GRANT ALL ON FUNCTION "public"."provision_default_farm_membership"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."provision_default_farm_membership"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_after_system_if_needed"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_after_system_if_needed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_after_system_if_needed"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_all_materialized_views"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_all_materialized_views"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_all_materialized_views"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_daily_water_quality_rating"("p_system_id" bigint, "p_from" "date", "p_to" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_daily_water_quality_rating"("p_system_id" bigint, "p_from" "date", "p_to" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_daily_water_quality_rating"("p_system_id" bigint, "p_from" "date", "p_to" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_kpi_materialized_views"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_kpi_materialized_views"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_kpi_materialized_views"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_mortality_daily_rollup"("p_system_id" bigint, "p_batch_id" bigint, "p_event_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_mortality_daily_rollup"("p_system_id" bigint, "p_batch_id" bigint, "p_event_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_mortality_daily_rollup"("p_system_id" bigint, "p_batch_id" bigint, "p_event_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."request_matview_refresh"() TO "anon";
GRANT ALL ON FUNCTION "public"."request_matview_refresh"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_matview_refresh"() TO "service_role";



GRANT ALL ON FUNCTION "public"."revoke_farm_user_invitation"("p_invitation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."revoke_farm_user_invitation"("p_invitation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."revoke_farm_user_invitation"("p_invitation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "postgres";
GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."transfer_impacts_efcr"("p_transfer_type" "public"."transfer_type", "p_origin_system_id" bigint, "p_target_system_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."transfer_impacts_efcr"("p_transfer_type" "public"."transfer_type", "p_origin_system_id" bigint, "p_target_system_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."transfer_impacts_efcr"("p_transfer_type" "public"."transfer_type", "p_origin_system_id" bigint, "p_target_system_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_mortality_mass_alert"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_mortality_mass_alert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_mortality_mass_alert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_refresh_daily_water_quality_rating"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_refresh_daily_water_quality_rating"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_refresh_daily_water_quality_rating"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_refresh_daily_water_quality_rating_from_framework"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_refresh_daily_water_quality_rating_from_framework"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_refresh_daily_water_quality_rating_from_framework"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_wq_alert_check"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_wq_alert_check"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_wq_alert_check"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "postgres";
GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "postgres";
GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_change_log"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_change_log"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_change_log"() TO "service_role";



GRANT ALL ON FUNCTION "public"."water_quality_rating_label"("p_rating_numeric" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."water_quality_rating_label"("p_rating_numeric" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."water_quality_rating_label"("p_rating_numeric" numeric) TO "service_role";












GRANT ALL ON TABLE "energy"."electrical_appliance" TO "anon";
GRANT ALL ON TABLE "energy"."electrical_appliance" TO "authenticated";
GRANT ALL ON TABLE "energy"."electrical_appliance" TO "service_role";



GRANT ALL ON SEQUENCE "energy"."electrical_appliance_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "energy"."electrical_appliance_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "energy"."electrical_appliance_id_seq" TO "service_role";



GRANT ALL ON TABLE "energy"."power_consumption" TO "anon";
GRANT ALL ON TABLE "energy"."power_consumption" TO "authenticated";
GRANT ALL ON TABLE "energy"."power_consumption" TO "service_role";



GRANT ALL ON SEQUENCE "energy"."power_consumption_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "energy"."power_consumption_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "energy"."power_consumption_id_seq" TO "service_role";



GRANT ALL ON TABLE "energy"."solar_production_historical" TO "anon";
GRANT ALL ON TABLE "energy"."solar_production_historical" TO "authenticated";
GRANT ALL ON TABLE "energy"."solar_production_historical" TO "service_role";



GRANT ALL ON SEQUENCE "energy"."solar_production_historical_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "energy"."solar_production_historical_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "energy"."solar_production_historical_id_seq" TO "service_role";



GRANT ALL ON TABLE "energy"."solar_production_prediction" TO "anon";
GRANT ALL ON TABLE "energy"."solar_production_prediction" TO "authenticated";
GRANT ALL ON TABLE "energy"."solar_production_prediction" TO "service_role";



GRANT ALL ON SEQUENCE "energy"."solar_production_prediction_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "energy"."solar_production_prediction_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "energy"."solar_production_prediction_id_seq" TO "service_role";


















GRANT ALL ON TABLE "public"."_affected_systems" TO "anon";
GRANT ALL ON TABLE "public"."_affected_systems" TO "authenticated";
GRANT ALL ON TABLE "public"."_affected_systems" TO "service_role";



GRANT ALL ON TABLE "public"."_refresh_queue" TO "anon";
GRANT ALL ON TABLE "public"."_refresh_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."_refresh_queue" TO "service_role";



GRANT ALL ON TABLE "public"."alert_log" TO "authenticated";
GRANT ALL ON TABLE "public"."alert_log" TO "service_role";



GRANT ALL ON TABLE "public"."alert_threshold" TO "authenticated";
GRANT ALL ON TABLE "public"."alert_threshold" TO "service_role";



GRANT ALL ON TABLE "public"."feed_incoming" TO "authenticated";
GRANT ALL ON TABLE "public"."feed_incoming" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_feed_inventory_day" TO "anon";
GRANT ALL ON TABLE "public"."analytics_feed_inventory_day" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_feed_inventory_day" TO "service_role";



GRANT ALL ON TABLE "public"."daily_fish_inventory_table" TO "anon";
GRANT ALL ON TABLE "public"."daily_fish_inventory_table" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_fish_inventory_table" TO "service_role";



GRANT ALL ON TABLE "public"."daily_water_quality_rating" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_water_quality_rating" TO "service_role";



GRANT ALL ON TABLE "public"."feeding_record" TO "authenticated";
GRANT ALL ON TABLE "public"."feeding_record" TO "service_role";



GRANT ALL ON TABLE "public"."fish_harvest" TO "authenticated";
GRANT ALL ON TABLE "public"."fish_harvest" TO "service_role";



GRANT ALL ON TABLE "public"."fish_mortality" TO "authenticated";
GRANT ALL ON TABLE "public"."fish_mortality" TO "service_role";



GRANT ALL ON TABLE "public"."fish_sampling_weight" TO "authenticated";
GRANT ALL ON TABLE "public"."fish_sampling_weight" TO "service_role";



GRANT ALL ON TABLE "public"."fish_stocking" TO "authenticated";
GRANT ALL ON TABLE "public"."fish_stocking" TO "service_role";



GRANT ALL ON TABLE "public"."fish_transfer" TO "authenticated";
GRANT ALL ON TABLE "public"."fish_transfer" TO "service_role";



GRANT ALL ON TABLE "public"."system" TO "authenticated";
GRANT ALL ON TABLE "public"."system" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_system_day_mv" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_system_day_mv" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_system_day" TO "anon";
GRANT ALL ON TABLE "public"."analytics_system_day" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_system_day" TO "service_role";



GRANT ALL ON TABLE "public"."farm_user" TO "authenticated";
GRANT ALL ON TABLE "public"."farm_user" TO "service_role";



GRANT ALL ON TABLE "public"."api_alert_thresholds" TO "anon";
GRANT ALL ON TABLE "public"."api_alert_thresholds" TO "authenticated";
GRANT ALL ON TABLE "public"."api_alert_thresholds" TO "service_role";



GRANT ALL ON TABLE "public"."daily_fish_inventory" TO "anon";
GRANT ALL ON TABLE "public"."daily_fish_inventory" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_fish_inventory" TO "service_role";



GRANT ALL ON TABLE "public"."farm" TO "authenticated";
GRANT ALL ON TABLE "public"."farm" TO "service_role";



GRANT ALL ON TABLE "public"."api_daily_fish_inventory" TO "anon";
GRANT ALL ON TABLE "public"."api_daily_fish_inventory" TO "authenticated";
GRANT ALL ON TABLE "public"."api_daily_fish_inventory" TO "service_role";



GRANT ALL ON TABLE "public"."api_daily_water_quality_rating" TO "anon";
GRANT ALL ON TABLE "public"."api_daily_water_quality_rating" TO "authenticated";
GRANT ALL ON TABLE "public"."api_daily_water_quality_rating" TO "service_role";



GRANT ALL ON TABLE "public"."water_quality_framework" TO "anon";
GRANT ALL ON TABLE "public"."water_quality_framework" TO "authenticated";
GRANT ALL ON TABLE "public"."water_quality_framework" TO "service_role";



GRANT ALL ON TABLE "public"."water_quality_measurement" TO "authenticated";
GRANT ALL ON TABLE "public"."water_quality_measurement" TO "service_role";



GRANT ALL ON TABLE "public"."api_water_quality_measurements" TO "anon";
GRANT ALL ON TABLE "public"."api_water_quality_measurements" TO "authenticated";
GRANT ALL ON TABLE "public"."api_water_quality_measurements" TO "service_role";



GRANT ALL ON TABLE "public"."app_config" TO "anon";
GRANT ALL ON TABLE "public"."app_config" TO "authenticated";
GRANT ALL ON TABLE "public"."app_config" TO "service_role";



GRANT ALL ON TABLE "public"."change_log" TO "anon";
GRANT ALL ON TABLE "public"."change_log" TO "authenticated";
GRANT ALL ON TABLE "public"."change_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."change_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."change_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."change_log_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."daily_fish_inventory_table_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."daily_fish_inventory_table_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."daily_fish_inventory_table_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."daily_water_quality_rating_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."daily_water_quality_rating_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."daily_water_quality_rating_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."dashboard_time_period" TO "anon";
GRANT ALL ON TABLE "public"."dashboard_time_period" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard_time_period" TO "service_role";



GRANT ALL ON TABLE "public"."dashboard" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard" TO "service_role";



GRANT ALL ON SEQUENCE "public"."dashboard_time_period_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."dashboard_time_period_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."dashboard_time_period_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."production_cycle" TO "anon";
GRANT ALL ON TABLE "public"."production_cycle" TO "authenticated";
GRANT ALL ON TABLE "public"."production_cycle" TO "service_role";



GRANT ALL ON TABLE "public"."production_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."production_summary" TO "service_role";



GRANT ALL ON TABLE "public"."efcr_period_last_sampling_view" TO "authenticated";
GRANT ALL ON TABLE "public"."efcr_period_last_sampling_view" TO "service_role";



GRANT ALL ON SEQUENCE "public"."feed_incoming_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."feed_incoming_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."feed_incoming_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."feed_plan" TO "anon";
GRANT ALL ON TABLE "public"."feed_plan" TO "authenticated";
GRANT ALL ON TABLE "public"."feed_plan" TO "service_role";



GRANT ALL ON SEQUENCE "public"."feed_plan_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."feed_plan_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."feed_plan_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."feed_supplier" TO "anon";
GRANT ALL ON TABLE "public"."feed_supplier" TO "authenticated";
GRANT ALL ON TABLE "public"."feed_supplier" TO "service_role";



GRANT ALL ON SEQUENCE "public"."feed_supplier_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."feed_supplier_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."feed_supplier_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."feed_type" TO "anon";
GRANT ALL ON TABLE "public"."feed_type" TO "authenticated";
GRANT ALL ON TABLE "public"."feed_type" TO "service_role";



GRANT ALL ON SEQUENCE "public"."feed_type_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."feed_type_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."feed_type_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."feeding_record_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."feeding_record_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."feeding_record_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."fingerling_batch" TO "authenticated";
GRANT ALL ON TABLE "public"."fingerling_batch" TO "service_role";



GRANT ALL ON SEQUENCE "public"."fingerling_batch_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."fingerling_batch_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."fingerling_batch_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."fingerling_supplier" TO "authenticated";
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



GRANT ALL ON SEQUENCE "public"."production_cycle_cycle_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."production_cycle_cycle_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."production_cycle_cycle_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."report_feed_incoming_enriched" TO "anon";
GRANT ALL ON TABLE "public"."report_feed_incoming_enriched" TO "authenticated";
GRANT ALL ON TABLE "public"."report_feed_incoming_enriched" TO "service_role";



GRANT ALL ON SEQUENCE "public"."system_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."system_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."system_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_profile" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profile" TO "service_role";



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
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";
































-- The /feed dashboard fired 8 separate RPCs on every load / filter change
-- (api_feed_dashboard_kpis, api_feed_plan_vs_actual, api_system_feed_status,
-- api_feed_efcr_trend, api_feeding_rate_vs_target,
-- api_feeding_response_distribution, api_feed_vs_biomass_gain,
-- api_feeding_alerts) -- 8 HTTP round-trips, 8 RLS passes, each scanning the
-- same analytics.* views. This one function returns every section in a single
-- JSONB payload from one call. Body is the union of the 8 originals, unchanged
-- in logic.

create or replace function "public"."api_feed_dashboard"(
  "p_farm_id" "uuid",
  "p_system_ids" bigint[] default null::bigint[],
  "p_start_date" "date" default null::"date",
  "p_end_date" "date" default null::"date"
) returns "jsonb"
  language "plpgsql" stable security definer
  set "search_path" to 'pg_catalog', 'public', 'analytics', 'private'
  as $$
declare
  v_end_date date := coalesce(p_end_date, current_date);
  v_start_date date := coalesce(p_start_date, v_end_date - 29);
  -- The trend sections defaulted to a shorter 14-day window when unscoped.
  v_start_trend date := coalesce(p_start_date, v_end_date - 13);
  v_empty constant jsonb := jsonb_build_object(
    'kpis', '[]'::jsonb, 'plan_vs_actual', '[]'::jsonb, 'system_status', '[]'::jsonb,
    'efcr_trend', '[]'::jsonb, 'feeding_rate', '[]'::jsonb, 'feeding_response', '[]'::jsonb,
    'feed_vs_biomass', '[]'::jsonb, 'alerts', '[]'::jsonb
  );
  v_result jsonb;
begin
  if not private.is_farm_member(p_farm_id) then
    return v_empty;
  end if;

  perform private.assert_rpc_parameters(
    p_farm_id := p_farm_id,
    p_system_ids := p_system_ids,
    p_cycle_id := null::bigint,
    p_start_date := v_start_date,
    p_end_date := v_end_date
  );

  with scoped_plan as (
    select fpva.date, fpva.system_id, fpva.planned_feed_kg, fpva.actual_feed_kg
    from analytics.feed_plan_vs_actual fpva
    where fpva.farm_id = p_farm_id
      and fpva.date between v_start_date and v_end_date
      and (p_system_ids is null or fpva.system_id = any(p_system_ids))
  ),
  latest_status_min as (
    select distinct on (sfs.system_id) sfs.system_id, sfs.feeding_rate_pct, sfs.status
    from analytics.system_feed_status sfs
    where sfs.farm_id = p_farm_id
      and sfs.date between v_start_date and v_end_date
      and (p_system_ids is null or sfs.system_id = any(p_system_ids))
    order by sfs.system_id, sfs.date desc
  ),
  kpis as (
    select
      v_end_date as as_of_date,
      coalesce((select sum(coalesce(actual_feed_kg, 0))::numeric from scoped_plan where date = v_end_date), 0::numeric) as feed_used_today_kg,
      coalesce((select sum(coalesce(actual_feed_kg, 0))::numeric from scoped_plan), 0::numeric) as feed_this_period_kg,
      case
        when coalesce((select sum(coalesce(planned_feed_kg, 0))::numeric from scoped_plan), 0::numeric) = 0::numeric then null::numeric
        else round(
          (coalesce((select sum(coalesce(actual_feed_kg, 0))::numeric from scoped_plan), 0::numeric)
           / nullif((select sum(coalesce(planned_feed_kg, 0))::numeric from scoped_plan), 0::numeric)) * 100.0, 2)
      end as plan_vs_actual_pct,
      round((select avg(feeding_rate_pct) from latest_status_min), 2) as avg_feeding_rate_pct,
      coalesce((select count(*)::integer from latest_status_min where status = 'OVERFEED'), 0) as overfeeding_systems,
      coalesce((select count(*)::integer from latest_status_min where status = 'UNDERFEED'), 0) as underfeeding_systems
  ),
  plan_vs_actual as (
    select fpva.date,
           sum(coalesce(fpva.planned_feed_kg, 0))::numeric as planned_feed_kg,
           sum(coalesce(fpva.actual_feed_kg, 0))::numeric as actual_feed_kg
    from analytics.feed_plan_vs_actual fpva
    where fpva.farm_id = p_farm_id
      and fpva.date between v_start_date and v_end_date
      and (p_system_ids is null or fpva.system_id = any(p_system_ids))
    group by fpva.date
  ),
  system_status as (
    select distinct on (sfs.system_id)
      sfs.system_id, sfs.system_name, sfs.date, sfs.biomass_kg, sfs.planned_feed_kg,
      sfs.actual_feed_kg, sfs.deviation_pct, sfs.feeding_rate_pct, sfs.efcr_period, sfs.status
    from analytics.system_feed_status sfs
    where sfs.farm_id = p_farm_id
      and sfs.date between v_start_date and v_end_date
      and (p_system_ids is null or sfs.system_id = any(p_system_ids))
    order by sfs.system_id, sfs.date desc
  ),
  efcr_trend as (
    select et.date, round(avg(et.efcr_period), 4) as efcr_period
    from analytics.efcr_trend et
    where et.farm_id = p_farm_id
      and et.date between v_start_trend and v_end_date
      and (p_system_ids is null or et.system_id = any(p_system_ids))
    group by et.date
  ),
  feeding_rate as (
    select frt.date,
           round(avg(frt.actual_rate), 4) as actual_rate,
           round(avg(frt.feed_rate_min_pct), 4) as feed_rate_min_pct,
           round(avg(frt.feed_rate_max_pct), 4) as feed_rate_max_pct
    from analytics.feeding_rate_vs_target frt
    where frt.farm_id = p_farm_id
      and frt.date between v_start_trend and v_end_date
      and (p_system_ids is null or frt.system_id = any(p_system_ids))
    group by frt.date
  ),
  feeding_response as (
    select frd.feeding_response::integer as feeding_response,
           sum(frd.response_count)::bigint as count
    from analytics.feeding_response_distribution frd
    where frd.farm_id = p_farm_id
      and frd.date between v_start_date and v_end_date
      and (p_system_ids is null or frd.system_id = any(p_system_ids))
    group by frd.feeding_response
  ),
  feed_vs_biomass as (
    select fvbg.system_id, fvbg.system_name, fvbg.date, fvbg.feed_kg, fvbg.biomass_gain_kg
    from analytics.feed_vs_biomass_gain fvbg
    where fvbg.farm_id = p_farm_id
      and fvbg.date between v_start_date and v_end_date
      and (p_system_ids is null or fvbg.system_id = any(p_system_ids))
      and fvbg.feed_kg is not null
      and fvbg.biomass_gain_kg is not null
  ),
  alerts as (
    select distinct on (fa.system_id, fa.alert)
      fa.system_id, fa.system_name, fa.date, fa.alert, fa.recommendation, fa.severity
    from analytics.feeding_alerts fa
    where fa.farm_id = p_farm_id
      and fa.date between v_start_date and v_end_date
      and (p_system_ids is null or fa.system_id = any(p_system_ids))
      and fa.alert is not null
    order by fa.system_id, fa.alert, fa.date desc
  )
  select jsonb_build_object(
    'kpis', (select coalesce(jsonb_agg(to_jsonb(k)), '[]'::jsonb) from kpis k),
    'plan_vs_actual', (select coalesce(jsonb_agg(to_jsonb(p) order by p.date), '[]'::jsonb) from plan_vs_actual p),
    'system_status', (select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) from system_status s),
    'efcr_trend', (select coalesce(jsonb_agg(to_jsonb(e) order by e.date), '[]'::jsonb) from efcr_trend e),
    'feeding_rate', (select coalesce(jsonb_agg(to_jsonb(r) order by r.date), '[]'::jsonb) from feeding_rate r),
    'feeding_response', (select coalesce(jsonb_agg(to_jsonb(x) order by x.feeding_response), '[]'::jsonb) from feeding_response x),
    'feed_vs_biomass', (select coalesce(jsonb_agg(to_jsonb(b) order by b.date, b.system_name), '[]'::jsonb) from feed_vs_biomass b),
    'alerts', (select coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb) from alerts a)
  )
  into v_result;

  return coalesce(v_result, v_empty);
end;
$$;

alter function "public"."api_feed_dashboard"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") owner to "postgres";

revoke all on function "public"."api_feed_dashboard"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") from public;
grant all on function "public"."api_feed_dashboard"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") to "authenticated";
grant all on function "public"."api_feed_dashboard"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") to "service_role";

comment on function "public"."api_feed_dashboard"("p_farm_id" "uuid", "p_system_ids" bigint[], "p_start_date" "date", "p_end_date" "date") is 'L3. Component: Feed Management dashboard. One-call replacement for the 8 api_feed_*/api_feeding_* section RPCs. Reads analytics.* views. Last reviewed: 2026-09. Owner: @aquasmart-backend';

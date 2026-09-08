-- Farm-wide KPI rollup for the Cages page. Aggregates api_dashboard_systems
-- (over the same window + stage the cage table uses) plus the latest calendar
-- month's dissolved-oxygen average, so the KPI cards display backend numbers
-- verbatim instead of summing rows in the browser.
create or replace function public.api_systems_summary(
  p_farm_id uuid,
  p_stage system_growth_stage default null,
  p_start_date date default null,
  p_end_date date default null
)
returns table(
  total_live_fish double precision,
  active_cages integer,
  total_biomass_kg double precision,
  overall_efcr double precision,
  avg_dissolved_o2 double precision
)
language sql
stable
security definer
set search_path to 'pg_catalog', 'public', 'analytics', 'private'
as $function$
  with s as (
    select * from public.api_dashboard_systems(p_farm_id, null::bigint[], p_stage, p_start_date, p_end_date)
  ),
  stocked as (
    select * from s where s.fish_end is not null and s.fish_end > 0
  ),
  do_daily as (
    select wqm.system_id, wqm.date, to_char(wqm.date, 'YYYY-MM') as ym,
           avg(wqm.parameter_value) as do_avg
    from public.water_quality_measurement wqm
    join public.system sy on sy.id = wqm.system_id
    where sy.farm_id = p_farm_id
      and wqm.parameter_name::text = 'dissolved_oxygen'
      and (p_start_date is null or wqm.date >= p_start_date)
      and (p_end_date is null or wqm.date <= p_end_date)
    group by wqm.system_id, wqm.date
  ),
  do_latest_month as (
    select avg(d.do_avg)::double precision as avg_do
    from do_daily d
    where d.ym = (select max(ym) from do_daily)
  )
  select
    nullif(sum(coalesce(stocked.fish_end, 0)), 0)::double precision as total_live_fish,
    count(stocked.system_id)::integer as active_cages,
    nullif(sum(coalesce(stocked.biomass_end, 0)), 0)::double precision as total_biomass_kg,
    case
      when sum(stocked.feed_total) filter (where stocked.efcr > 0 and stocked.feed_total > 0) > 0
      then sum(stocked.feed_total) filter (where stocked.efcr > 0 and stocked.feed_total > 0)
         / nullif(sum(stocked.feed_total / stocked.efcr) filter (where stocked.efcr > 0 and stocked.feed_total > 0), 0)
      else null
    end::double precision as overall_efcr,
    (select avg_do from do_latest_month) as avg_dissolved_o2
  from stocked;
$function$;

alter function public.api_systems_summary(uuid, system_growth_stage, date, date) owner to postgres;
revoke all on function public.api_systems_summary(uuid, system_growth_stage, date, date) from public;
grant all on function public.api_systems_summary(uuid, system_growth_stage, date, date) to authenticated;
grant all on function public.api_systems_summary(uuid, system_growth_stage, date, date) to service_role;
comment on function public.api_systems_summary(uuid, system_growth_stage, date, date) is
  'L3. Farm-wide KPI rollup for the Cages page (backend-computed; no browser-side summing). Last reviewed: 2026-09. Owner: @aquasmart-backend';

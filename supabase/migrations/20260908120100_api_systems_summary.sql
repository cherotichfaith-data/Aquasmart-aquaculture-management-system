-- Farm-wide KPI rollup for the Cages page, all figures backend-computed:
--   total_live_fish / active_cages / total_biomass_kg -- current standing stock
--     valued at each cage's most recent sampling (latest analytics.daily_system_facts
--     row per active, non-retired cage: number_of_fish is live-to-date,
--     biomass_last_sampling = that count x last-sampled ABW).
--   overall_efcr -- total feed / total biomass gain over the window across every
--     active cage's current cohort (summed, not an average of per-cage ratios,
--     so one noisy interpolated cage eFCR can't swing the headline number).
--   avg_dissolved_o2 -- mean of per-cage-per-day DO averages in the latest
--     calendar month that has readings within the window.
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
  with
  latest_facts as (
    select distinct on (dsf.system_id)
      dsf.system_id, dsf.number_of_fish, dsf.biomass_last_sampling
    from analytics.daily_system_facts dsf
    join public.system sy on sy.id = dsf.system_id
    where sy.farm_id = p_farm_id
      and sy.is_active = true
      and coalesce(sy.cage_status, 'occupied'::public.cage_status_enum) <> 'retired'::public.cage_status_enum
      and (p_stage is null or sy.growth_stage = p_stage)
    order by dsf.system_id, dsf.inventory_date desc
  ),
  current_stock as (
    select * from latest_facts where number_of_fish is not null and number_of_fish > 0
  ),
  ps_efcr as (
    select
      sum(coalesce(ps.feed_over_period, 0)) as feed,
      sum(greatest(coalesce(ps.biomass_increase_over_period, 0), 0)) as gain
    from analytics.production_summary ps
    join public.system sy on sy.id = ps.system_id
    left join private.system_cohort_starts(p_farm_id) csr on csr.system_id = ps.system_id
    where sy.farm_id = p_farm_id
      and sy.is_active = true
      and coalesce(sy.cage_status, 'occupied'::public.cage_status_enum) <> 'retired'::public.cage_status_enum
      and (p_stage is null or sy.growth_stage = p_stage)
      and ps.date >= coalesce(csr.cohort_start, ps.date)
      and (p_start_date is null or ps.date >= p_start_date)
      and (p_end_date is null or ps.date <= p_end_date)
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
    nullif(sum(coalesce(cs.number_of_fish, 0)), 0)::double precision as total_live_fish,
    count(*)::integer as active_cages,
    nullif(sum(coalesce(cs.biomass_last_sampling, 0)), 0)::double precision as total_biomass_kg,
    (select case when e.gain > 0 then (e.feed / e.gain)::double precision else null end from ps_efcr e) as overall_efcr,
    (select avg_do from do_latest_month) as avg_dissolved_o2
  from current_stock cs;
$function$;

alter function public.api_systems_summary(uuid, system_growth_stage, date, date) owner to postgres;
revoke all on function public.api_systems_summary(uuid, system_growth_stage, date, date) from public;
grant all on function public.api_systems_summary(uuid, system_growth_stage, date, date) to authenticated;
grant all on function public.api_systems_summary(uuid, system_growth_stage, date, date) to service_role;
comment on function public.api_systems_summary(uuid, system_growth_stage, date, date) is
  'L3. Farm-wide KPI rollup for the Cages page (backend-computed). Live fish / cage count / biomass = current standing stock at last sampling; eFCR = total feed / total gain over the window; DO = latest calendar month mean. Last reviewed: 2026-09. Owner: @aquasmart-backend';

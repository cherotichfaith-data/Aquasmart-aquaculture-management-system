-- Analytics reports, phase 2: Forward Planning.
--
-- api_analytics_forward_planning(farm, month, months, planned_fish, planned_abw_g, scenario, target_g)
-- projects the next p_months calendar months after the reporting month:
--   * every cage that holds fish at month end is grown forward from its current ABW
--     along the growth-model curve (api_growth_standard_curve), with survival taken from
--     growth_cycle_benchmark's cumulative mortality, and is harvested the day it reaches
--     the target weight (app_config.target_harvest_weight_g unless p_target_g is given);
--   * planned stockings (p_planned_fish at p_planned_abw_g, one per month, on the 15th)
--     are grown the same way;
--   * feed = biomass x the model's feeding rate each day, split into pellet sizes by ABW.
-- One row per forecast month.
--
-- Pellet size by ABW (matches the workbook's size-class table):
--   <= 3 g 0.5-1 mm | <= 12 g 0.9-1.6 mm | <= 45 g 2 mm | <= 100 g 3 mm | <= 500 g 4 mm | > 500 g 6 mm

drop function if exists public.api_analytics_forward_planning(uuid, date, integer, double precision, double precision, text, double precision);
create function public.api_analytics_forward_planning(
  p_farm_id uuid,
  p_month date,
  p_months integer default 12,
  p_planned_fish double precision default 0,
  p_planned_abw_g double precision default 2,
  p_scenario text default 'main',
  p_target_g double precision default null
)
returns table(
  month_start date,
  juvenile_stocking double precision,
  harvest_fish double precision,
  harvest_kg double precision,
  biomass_end_kg double precision,
  total_feed_kg double precision,
  feed_0_5_1mm_kg double precision,
  feed_0_9_1_6mm_kg double precision,
  feed_2mm_kg double precision,
  feed_3mm_kg double precision,
  feed_4mm_kg double precision,
  feed_6mm_kg double precision
)
language sql
stable
security definer
set search_path to 'pg_catalog', 'public', 'analytics', 'private'
as $function$
with
params as (
  select (date_trunc('month', p_month) + interval '1 month - 1 day')::date as as_of,
         (date_trunc('month', p_month) + interval '1 month')::date as first_month,
         least(greatest(coalesce(p_months, 12), 1), 24) as n_months,
         coalesce(p_target_g, (select value::double precision from public.app_config where key = 'target_harvest_weight_g'), 500) as target_g,
         lower(coalesce(p_scenario, 'main')) as scenario
),
guard as (select 1 as ok where private.app_rpc_scope_ok(p_farm_id, null::bigint[], null::bigint, null::date, null::date)),
horizon as (
  select p.as_of, p.first_month, p.target_g, p.scenario,
         (p.first_month + (p.n_months || ' months')::interval - interval '1 day')::date as last_day
  from params p, guard
),
months as (
  select (h.first_month + (g || ' months')::interval)::date as month_start
  from horizon h, generate_series(0, (select n_months - 1 from params)) g
),
live as (
  select distinct on (d.system_id) d.system_id, d.number_of_fish::double precision as fish0,
         coalesce(d.estimated_abw_g, d.abw_last_sampling)::double precision as abw0
  from analytics.daily_system_facts d
  join public.system s on s.id = d.system_id and s.farm_id = p_farm_id, horizon h
  where d.inventory_date <= h.as_of and d.inventory_date >= h.as_of - 14
    and coalesce(d.number_of_fish, 0) > 0
    and coalesce(d.estimated_abw_g, d.abw_last_sampling) > 0
  order by d.system_id, d.inventory_date desc
),
planned as (
  select m.month_start, (m.month_start + 14) as start_date, p_planned_fish as fish0, p_planned_abw_g as abw0
  from months m where coalesce(p_planned_fish, 0) > 0 and coalesce(p_planned_abw_g, 0) > 0
),
cohorts as (
  select row_number() over () as cohort_id, h.as_of as start_date, l.fish0, l.abw0, false as is_planned, null::date as stock_month
  from live l, horizon h
  union all
  select 1000 + row_number() over (order by pl.month_start), pl.start_date, pl.fish0, pl.abw0, true, pl.month_start
  from planned pl
),
mort_pts as (
  select b.end_abw_g, b.expected_cum_mortality_pct as cum_pct
  from public.growth_cycle_benchmark b, params p where b.scenario = p.scenario
),
days as (
  select c.cohort_id, c.fish0, c.abw0, c.is_planned, (c.start_date + cv.day) as dt, cv.day as age_d, cv.expected_abw_g::double precision as abw,
         coalesce(cv.expected_feeding_rate_pct, 1.0)::double precision as rate_pct
  from cohorts c
  cross join horizon h
  cross join lateral public.api_growth_standard_curve(h.scenario, c.abw0::numeric, 450) cv
  where (c.start_date + cv.day) <= h.last_day and cv.day >= (case when c.is_planned then 0 else 1 end)
),
harvest_day as (
  select d.cohort_id, min(d.age_d) as harvest_age
  from days d, horizon h where d.abw >= h.target_g group by d.cohort_id
),
alive as (
  select d.*, hd.harvest_age,
         d.fish0 * greatest(0,
           (1 - coalesce((select mp.cum_pct from mort_pts mp where mp.end_abw_g >= d.abw order by mp.end_abw_g limit 1), (select max(mp.cum_pct) from mort_pts mp)) / 100.0)
         / nullif(1 - coalesce((select mp.cum_pct from mort_pts mp where mp.end_abw_g >= d.abw0 order by mp.end_abw_g limit 1), (select max(mp.cum_pct) from mort_pts mp)) / 100.0, 0)
         ) as fish
  from days d left join harvest_day hd on hd.cohort_id = d.cohort_id
),
daily as (
  select a.*, (a.fish * a.abw / 1000.0) as biomass,
         case when a.harvest_age is null or a.age_d < a.harvest_age then a.fish * a.abw / 1000.0 * a.rate_pct / 100.0 end as feed_kg,
         (a.harvest_age is not null and a.age_d = a.harvest_age) as is_harvest,
         (a.harvest_age is null or a.age_d < a.harvest_age) as is_growing
  from alive a
),
by_month as (
  select date_trunc('month', dy.dt)::date as month_start,
         sum(dy.fish) filter (where dy.is_harvest) as h_fish,
         sum(dy.biomass) filter (where dy.is_harvest) as h_kg,
         sum(dy.feed_kg) as feed,
         sum(dy.feed_kg) filter (where dy.abw <= 3) as f1,
         sum(dy.feed_kg) filter (where dy.abw > 3 and dy.abw <= 12) as f2,
         sum(dy.feed_kg) filter (where dy.abw > 12 and dy.abw <= 45) as f3,
         sum(dy.feed_kg) filter (where dy.abw > 45 and dy.abw <= 100) as f4,
         sum(dy.feed_kg) filter (where dy.abw > 100 and dy.abw <= 500) as f5,
         sum(dy.feed_kg) filter (where dy.abw > 500) as f6,
         sum(dy.biomass) filter (where dy.is_growing and dy.dt = (date_trunc('month', dy.dt) + interval '1 month - 1 day')::date) as bio_end
  from daily dy group by 1
),
stock_by_month as (
  select pl.month_start, sum(pl.fish0) as fish from planned pl group by 1
)
select m.month_start,
       coalesce(sm.fish, 0)::double precision,
       coalesce(bm.h_fish, 0)::double precision,
       coalesce(bm.h_kg, 0)::double precision,
       coalesce(bm.bio_end, 0)::double precision,
       coalesce(bm.feed, 0)::double precision,
       coalesce(bm.f1, 0)::double precision,
       coalesce(bm.f2, 0)::double precision,
       coalesce(bm.f3, 0)::double precision,
       coalesce(bm.f4, 0)::double precision,
       coalesce(bm.f5, 0)::double precision,
       coalesce(bm.f6, 0)::double precision
from months m
left join by_month bm on bm.month_start = m.month_start
left join stock_by_month sm on sm.month_start = m.month_start
order by m.month_start;
$function$;

alter function public.api_analytics_forward_planning(uuid, date, integer, double precision, double precision, text, double precision) owner to postgres;
revoke all on function public.api_analytics_forward_planning(uuid, date, integer, double precision, double precision, text, double precision) from public;
grant all on function public.api_analytics_forward_planning(uuid, date, integer, double precision, double precision, text, double precision) to authenticated;
grant all on function public.api_analytics_forward_planning(uuid, date, integer, double precision, double precision, text, double precision) to service_role;
comment on function public.api_analytics_forward_planning(uuid, date, integer, double precision, double precision, text, double precision) is
  'L3. Forward Planning for /analytics: monthly stocking, harvest, biomass and feed by pellet size for the next N months from the growth-model curve. Last reviewed: 2026-10. Owner: @aquasmart-backend';

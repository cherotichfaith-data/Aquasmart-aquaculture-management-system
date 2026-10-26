-- Analytics reports, phase 3: Farm-Wide Biomass and Harvest Forecast.
--
-- api_analytics_farm_forecast returns one row per month from p_months_back months before the
-- reporting month to p_months_forward months after it:
--   * biomass_forecast_kg / harvest_forecast_kg
--       past + current months: every actual stocking event is grown along the growth-model curve
--         (survival from growth_cycle_benchmark) and "harvested" the day it reaches the target
--         weight -- i.e. what the farm should hold / harvest if everything followed the model;
--       future months: api_analytics_forward_planning (live cages + planned stocking).
--   * biomass_recorded_kg / harvest_recorded_kg   what the records show (null for future months):
--       month-end biomass from each cage's latest daily fact (within 14 days of month end),
--       harvest weight from fish_harvest.
-- p_scenario picks the growth-model scenario (main / potential / slow).

drop function if exists public.api_analytics_farm_forecast(uuid, date, integer, integer, double precision, double precision, text, double precision);
create function public.api_analytics_farm_forecast(
  p_farm_id uuid,
  p_month date,
  p_months_back integer default 6,
  p_months_forward integer default 6,
  p_planned_fish double precision default 0,
  p_planned_abw_g double precision default 2,
  p_scenario text default 'main',
  p_target_g double precision default null
)
returns table(
  month_start date,
  is_forecast_only boolean,
  biomass_forecast_kg double precision,
  biomass_recorded_kg double precision,
  harvest_forecast_kg double precision,
  harvest_recorded_kg double precision
)
language sql
stable
security definer
set search_path to 'pg_catalog', 'public', 'analytics', 'private'
as $function$
with
guard as (select 1 as ok where private.app_rpc_scope_ok(p_farm_id, null::bigint[], null::bigint, null::date, null::date)),
params as (
  select p_farm_id as farm_id,
         least(greatest(coalesce(p_months_forward, 6), 0), 24) as fwd,
         least(greatest(coalesce(p_months_back, 6), 0), 24) as back,
         p_planned_fish as pfish, p_planned_abw_g as pabw,
         lower(coalesce(p_scenario, 'main')) as scen,
         (date_trunc('month', p_month) + interval '1 month - 1 day')::date as as_of,
         date_trunc('month', p_month)::date as cur_month,
         (date_trunc('month', p_month) - (least(greatest(coalesce(p_months_back, 6), 0), 24) || ' months')::interval)::date as first_month,
         coalesce(p_target_g, (select value::double precision from public.app_config where key = 'target_harvest_weight_g'), 500) as target_g
  from guard
),
past_months as (
  select (p.first_month + (g || ' months')::interval)::date as month_start,
         (p.first_month + ((g + 1) || ' months')::interval - interval '1 day')::date as month_end
  from params p, generate_series(0, (select back from params)) g
),
mort_pts as (select b.end_abw_g, b.expected_cum_mortality_pct as cum_pct from public.growth_cycle_benchmark b, params p where b.scenario = p.scen),
ev as (
  select row_number() over () as ev_id, fs.date as start_date,
         sum(fs.number_of_fish_stocking)::double precision as fish0,
         (sum(fs.total_weight_stocking) / nullif(sum(fs.number_of_fish_stocking), 0) * 1000)::double precision as abw0
  from public.fish_stocking fs
  join public.system s on s.id = fs.system_id, params p
  where s.farm_id = p.farm_id and fs.date <= p.as_of and fs.date >= p.first_month - 450
  group by fs.date, fs.batch_id
),
curve as (
  select e.ev_id, e.start_date, cv.day, cv.expected_abw_g::double precision as abw,
         e.fish0 * greatest(0,
           (1 - coalesce((select mp.cum_pct from mort_pts mp where mp.end_abw_g >= cv.expected_abw_g order by mp.end_abw_g limit 1), (select max(mp.cum_pct) from mort_pts mp)) / 100.0)
           / nullif(1 - coalesce((select mp.cum_pct from mort_pts mp where mp.end_abw_g >= e.abw0 order by mp.end_abw_g limit 1), (select max(mp.cum_pct) from mort_pts mp)) / 100.0, 0)) as fish
  from ev e cross join params p
  cross join lateral public.api_growth_standard_curve(p.scen, e.abw0::numeric, 450) cv
  where e.abw0 > 0
),
harvest_age as (select c.ev_id, min(c.day) as hday from curve c, params p where c.abw >= p.target_g group by c.ev_id),
past_forecast as (
  select m.month_start,
         (select coalesce(sum(c.fish * c.abw / 1000.0), 0) from curve c left join harvest_age h on h.ev_id = c.ev_id
           where c.day = (m.month_end - c.start_date) and (h.hday is null or c.day < h.hday)) as bio_fc,
         (select coalesce(sum(c.fish * c.abw / 1000.0), 0) from curve c join harvest_age h on h.ev_id = c.ev_id
           where c.day = h.hday and (c.start_date + c.day) between m.month_start and m.month_end) as harv_fc
  from past_months m
),
recorded as (
  select m.month_start,
         (select sum(x.b) from (
            select distinct on (d.system_id) coalesce(d.estimated_biomass_kg, d.biomass_last_sampling) as b
            from analytics.daily_system_facts d
            join public.system s on s.id = d.system_id and s.farm_id = (select farm_id from params)
            where d.inventory_date <= m.month_end and d.inventory_date >= m.month_end - 14 and coalesce(d.number_of_fish, 0) > 0
            order by d.system_id, d.inventory_date desc) x) as bio_rec,
         (select sum(h.total_weight_harvest)
            from public.fish_harvest h
            join public.system s on s.id = h.system_id and s.farm_id = (select farm_id from params)
            where h.date between m.month_start and m.month_end) as harv_rec
  from past_months m
),
fwd as (
  select f.month_start, f.biomass_end_kg as bio_fc, f.harvest_kg as harv_fc
  from params p
  cross join lateral public.api_analytics_forward_planning(p.farm_id, p.cur_month, p.fwd, p.pfish, p.pabw, p.scen, p.target_g) f
  where p.fwd > 0
)
select pf.month_start, false, pf.bio_fc::double precision, rb.bio_rec::double precision, pf.harv_fc::double precision, coalesce(rb.harv_rec, 0)::double precision
from past_forecast pf join recorded rb on rb.month_start = pf.month_start
union all
select f.month_start, true, f.bio_fc::double precision, null::double precision, f.harv_fc::double precision, null::double precision
from fwd f
order by 1;
$function$;

alter function public.api_analytics_farm_forecast(uuid, date, integer, integer, double precision, double precision, text, double precision) owner to postgres;
revoke all on function public.api_analytics_farm_forecast(uuid, date, integer, integer, double precision, double precision, text, double precision) from public;
grant all on function public.api_analytics_farm_forecast(uuid, date, integer, integer, double precision, double precision, text, double precision) to authenticated;
grant all on function public.api_analytics_farm_forecast(uuid, date, integer, integer, double precision, double precision, text, double precision) to service_role;
comment on function public.api_analytics_farm_forecast(uuid, date, integer, integer, double precision, double precision, text, double precision) is
  'L3. Farm-wide biomass and harvest forecast vs recorded, by month, for /analytics. Last reviewed: 2026-10. Owner: @aquasmart-backend';

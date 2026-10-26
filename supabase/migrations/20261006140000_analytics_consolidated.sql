-- Analytics reports, consolidated: two functions instead of seven.
--
--   api_analytics_outlook      stock profile + farm biomass/harvest forecast + forward plan   (one growth projection)
--   api_analytics_performance  detailed batch report + cage harvest report + feed vs expected
--
-- Each returns jsonb with one named section per report. p_sections (default null = all) limits which sections are
-- computed, so a page view only pays for what it shows. Every section keeps the access check of the function it
-- replaces (private.app_rpc_scope_ok). The old per-report functions are dropped in the next migration, once these
-- are verified.

drop function if exists public.api_analytics_outlook(uuid, date, date, double precision, double precision, text, double precision, integer, integer, integer, text[]);
create function public.api_analytics_outlook(
  p_farm_id uuid,
  p_month date,
  p_as_of date default null,
  p_planned_fish double precision default 0,
  p_planned_abw_g double precision default 2,
  p_scenario text default 'main',
  p_target_g double precision default null,
  p_months_back integer default 6,
  p_months_forward integer default 6,
  p_plan_months integer default 12,
  p_sections text[] default null
)
returns jsonb
language sql
stable
security definer
set search_path to 'pg_catalog', 'public', 'analytics', 'private'
as $function$
with
fwd_plan as materialized (
with
params as (
  select (date_trunc('month', p_month) + interval '1 month - 1 day')::date as as_of,
         (date_trunc('month', p_month) + interval '1 month')::date as first_month,
         least(greatest(coalesce(p_plan_months, 12), 1), 24) as n_months,
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
       coalesce(sm.fish, 0)::double precision as juvenile_stocking,
       coalesce(bm.h_fish, 0)::double precision as harvest_fish,
       coalesce(bm.h_kg, 0)::double precision as harvest_kg,
       coalesce(bm.bio_end, 0)::double precision as biomass_end_kg,
       coalesce(bm.feed, 0)::double precision as total_feed_kg,
       coalesce(bm.f1, 0)::double precision as feed_0_5_1mm_kg,
       coalesce(bm.f2, 0)::double precision as feed_0_9_1_6mm_kg,
       coalesce(bm.f3, 0)::double precision as feed_2mm_kg,
       coalesce(bm.f4, 0)::double precision as feed_3mm_kg,
       coalesce(bm.f5, 0)::double precision as feed_4mm_kg,
       coalesce(bm.f6, 0)::double precision as feed_6mm_kg
from months m
left join by_month bm on bm.month_start = m.month_start
left join stock_by_month sm on sm.month_start = m.month_start
order by m.month_start
),
profile as (
with
guard as (select 1 as ok where private.app_rpc_scope_ok(p_farm_id, null::bigint[], null::bigint, null::date, null::date)),
params as (
  select p_farm_id as farm_id, coalesce(p_as_of, (date_trunc('month', p_month) + interval '1 month - 1 day')::date) as as_of,
         greatest(coalesce(p_planned_fish, 0), 0) as pfish,
         greatest(coalesce(p_planned_abw_g, 2), 0.1) as pabw,
         lower(coalesce(p_scenario, 'main')) as scen,
         coalesce(p_target_g, (select value::double precision from public.app_config where key = 'target_harvest_weight_g'), 500) as target_g
  from guard
),
curve as (
  select cv.day, cv.expected_abw_g::double precision as abw
  from params p cross join lateral public.api_growth_standard_curve(p.scen, p.pabw::numeric, 450) cv
),
edges as (
  select (c.day / 30) as k, c.abw from curve c where c.day % 30 = 0
),
last_k as (select coalesce(min(e.k) filter (where e.abw >= (select target_g from params)), max(e.k)) as ke from edges e),
classes as (
  select g as k,
         case when g = 0 then 0::double precision else (select e.abw from edges e where e.k = g) end as lower_g,
         case when g = (select ke from last_k) then null else (select e.abw from edges e where e.k = g + 1) end as upper_g
  from last_k, generate_series(0, (select ke from last_k)) g
),
mort_pts as (select b.end_abw_g, b.expected_cum_mortality_pct as cum_pct from public.growth_cycle_benchmark b, params p where b.scenario = p.scen),
surv as (
  select c.k,
         case when c.upper_g is null then 0::double precision else
           (1 - coalesce((select mp.cum_pct from mort_pts mp where mp.end_abw_g >= (select cv.abw from curve cv where cv.day = c.k * 30 + 15) order by mp.end_abw_g limit 1), (select max(mp.cum_pct) from mort_pts mp)) / 100.0)
           / nullif(1 - coalesce((select mp.cum_pct from mort_pts mp where mp.end_abw_g >= (select pabw from params) order by mp.end_abw_g limit 1), (select max(mp.cum_pct) from mort_pts mp)) / 100.0, 0)
         end as s
  from classes c
),
live as (
  select distinct on (d.system_id) d.system_id, d.number_of_fish::double precision as fish,
         coalesce(d.estimated_abw_g, d.abw_last_sampling)::double precision as abw
  from analytics.daily_system_facts d
  join public.system s on s.id = d.system_id and s.farm_id = p_farm_id, params p
  where d.inventory_date <= p.as_of and d.inventory_date >= p.as_of - 14
    and coalesce(d.number_of_fish, 0) > 0 and coalesce(d.estimated_abw_g, d.abw_last_sampling) > 0
  order by d.system_id, d.inventory_date desc
)
select c.k::integer + 1,
       c.lower_g,
       c.upper_g,
       ((select pfish from params) * coalesce(sv.s, 0))::double precision,
       coalesce((select sum(l.fish) from live l where l.abw >= c.lower_g and (c.upper_g is null or l.abw < c.upper_g)), 0)::double precision,
       coalesce((select count(*) from live l where l.abw >= c.lower_g and (c.upper_g is null or l.abw < c.upper_g)), 0)::integer
from classes c join surv sv on sv.k = c.k
order by c.k
),
forecast as (
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
  from fwd_plan f, params p
  where p.fwd > 0 and f.month_start < (p.cur_month + ((p.fwd + 1) || ' months')::interval)::date
)
select pf.month_start, false, pf.bio_fc::double precision, rb.bio_rec::double precision, pf.harv_fc::double precision, coalesce(rb.harv_rec, 0)::double precision
from past_forecast pf join recorded rb on rb.month_start = pf.month_start
union all
select f.month_start, true, f.bio_fc::double precision, null::double precision, f.harv_fc::double precision, null::double precision
from fwd f
order by 1
)
select jsonb_build_object(
    'stock_profile', case when p_sections is null or 'stock_profile' = any(p_sections) then (
      select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
      from (select * from profile) as x(class_no, abw_from_g, abw_to_g, ideal_fish, recorded_fish, recorded_cages)
    ) end,
    'farm_forecast', case when p_sections is null or 'farm_forecast' = any(p_sections) then (
      select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
      from (select * from forecast) as x(month_start, is_forecast_only, biomass_forecast_kg, biomass_recorded_kg, harvest_forecast_kg, harvest_recorded_kg)
    ) end,
    'forward_plan', case when p_sections is null or 'forward_plan' = any(p_sections) then (
      select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
      from (select * from fwd_plan) as x(month_start, juvenile_stocking, harvest_fish, harvest_kg, biomass_end_kg, total_feed_kg, feed_0_5_1mm_kg, feed_0_9_1_6mm_kg, feed_2mm_kg, feed_3mm_kg, feed_4mm_kg, feed_6mm_kg)
    ) end
);
$function$;

alter function public.api_analytics_outlook(uuid, date, date, double precision, double precision, text, double precision, integer, integer, integer, text[]) owner to postgres;
revoke all on function public.api_analytics_outlook(uuid, date, date, double precision, double precision, text, double precision, integer, integer, integer, text[]) from public;
grant all on function public.api_analytics_outlook(uuid, date, date, double precision, double precision, text, double precision, integer, integer, integer, text[]) to authenticated;
grant all on function public.api_analytics_outlook(uuid, date, date, double precision, double precision, text, double precision, integer, integer, integer, text[]) to service_role;
comment on function public.api_analytics_outlook(uuid, date, date, double precision, double precision, text, double precision, integer, integer, integer, text[]) is
  'L3. /analytics Farm outlook: jsonb {stock_profile, farm_forecast, forward_plan} from one growth-model projection. p_sections limits what is computed. Last reviewed: 2026-10. Owner: @aquasmart-backend';

drop function if exists public.api_analytics_performance(uuid, date, date, date, text[]);
create function public.api_analytics_performance(
  p_farm_id uuid,
  p_month date,
  p_period_start date default null,
  p_period_end date default null,
  p_sections text[] default null
)
returns jsonb
language sql
stable
security definer
set search_path to 'pg_catalog', 'public', 'analytics', 'private'
as $function$
select jsonb_build_object(
    'batches', case when p_sections is null or 'batches' = any(p_sections) then (
      select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
      from (with
bounds as (
  select case when p_period_start is not null and p_period_end is not null then least(p_period_start, p_period_end) else date_trunc('month', p_month)::date end as s,
         case when p_period_start is not null and p_period_end is not null then greatest(p_period_start, p_period_end)
              else (date_trunc('month', p_month) + interval '1 month - 1 day')::date end as e
),
guard as (select 1 as ok where private.app_rpc_scope_ok(p_farm_id, null::bigint[], null::bigint, null::date, null::date)),
b as (
  select fb.id as batch_id, coalesce(nullif(fb.name, ''), 'Batch #' || fb.id::text) as batch_name
  from public.fingerling_batch fb, guard where fb.farm_id = p_farm_id
),
stock as (
  select fs.batch_id, min(fs.date) as date_in,
         sum(fs.number_of_fish_stocking)::double precision as stocked,
         sum(fs.number_of_fish_stocking) filter (where fs.date >= bd.s)::double precision as stocked_m
  from public.fish_stocking fs join b on b.batch_id = fs.batch_id, bounds bd
  where fs.date <= bd.e group by fs.batch_id
),
net_transfer as (
  select ft.batch_id,
         sum(case when ft.target_system_id is not null then ft.number_of_fish_transfer else 0 end
           - case when ft.origin_system_id is not null then ft.number_of_fish_transfer else 0 end)::double precision as net_all,
         sum(case when ft.origin_system_id is not null and ft.target_system_id is null then ft.number_of_fish_transfer else 0 end)
           filter (where ft.date >= bd.s)::double precision as lost_m
  from public.fish_transfer ft join b on b.batch_id = ft.batch_id, bounds bd
  where ft.date <= bd.e group by ft.batch_id
),
mort as (
  select fm.batch_id,
         sum(fm.number_of_fish_mortality)::double precision as mort_all,
         sum(fm.number_of_fish_mortality) filter (where fm.date >= bd.s)::double precision as mort_m
  from public.fish_mortality fm join b on b.batch_id = fm.batch_id, bounds bd
  where fm.date <= bd.e group by fm.batch_id
),
harv as (
  select fh.batch_id,
         sum(fh.number_of_fish_harvest)::double precision as harv_all,
         sum(fh.number_of_fish_harvest) filter (where fh.date >= bd.s)::double precision as harv_n_m,
         sum(fh.total_weight_harvest) filter (where fh.date >= bd.s)::double precision as harv_kg_m
  from public.fish_harvest fh join b on b.batch_id = fh.batch_id, bounds bd
  where fh.date <= bd.e group by fh.batch_id
),
feed_m as (
  select fr.batch_id, sum(fr.feeding_amount)::double precision as feed_m
  from public.feeding_record fr join b on b.batch_id = fr.batch_id, bounds bd
  where fr.date between bd.s and bd.e group by fr.batch_id
),
ps as (
  select pc.batch_id,
         sum(x.feed_over_period) filter (where x.date >= bd.s)::double precision as feed_ps_m,
         sum(greatest(x.biomass_increase_over_period, 0)) filter (where x.date >= bd.s)::double precision as growth_m,
         sum(x.feed_over_period)::double precision as feed_ps_all,
         sum(greatest(x.biomass_increase_over_period, 0))::double precision as growth_all
  from analytics.production_summary x
  join public.production_cycle pc on pc.cycle_id = x.cycle_id
  join b on b.batch_id = pc.batch_id, bounds bd
  where x.date <= bd.e group by pc.batch_id
),
abw_anchor as (
  select pc.batch_id,
         coalesce(max(x.date) filter (where x.activity = 'sampling'), max(x.date) filter (where x.activity = 'stocking')) as anchor_date,
         (max(x.date) filter (where x.activity = 'sampling')) is not null as has_sampling
  from analytics.production_summary x
  join public.production_cycle pc on pc.cycle_id = x.cycle_id
  join b on b.batch_id = pc.batch_id, bounds bd
  where x.date <= bd.e group by pc.batch_id
),
abw as (
  select a.batch_id,
         (sum(x.average_body_weight * coalesce(x.number_of_fish_end, 0)) / nullif(sum(coalesce(x.number_of_fish_end, 0)), 0))::double precision as abw_g
  from abw_anchor a
  join public.production_cycle pc on pc.batch_id = a.batch_id
  join analytics.production_summary x on x.cycle_id = pc.cycle_id and x.date = a.anchor_date
       and x.activity = (case when a.has_sampling then 'sampling' else 'stocking' end)
  group by a.batch_id
),
base as (
  select b.batch_id, b.batch_name, st.date_in, st.stocked, st.stocked_m,
         greatest(coalesce(st.stocked, 0) + coalesce(nt.net_all, 0) - coalesce(m.mort_all, 0) - coalesce(h.harv_all, 0), 0) as stock_end,
         coalesce(m.mort_m, 0) as mort_m, coalesce(nt.lost_m, 0) as lost_m,
         coalesce(h.harv_n_m, 0) as harv_n_m, coalesce(h.harv_kg_m, 0) as harv_kg_m,
         ab.abw_g, ps.feed_ps_m, ps.growth_m, ps.feed_ps_all, ps.growth_all, fm.feed_m
  from b
  join stock st on st.batch_id = b.batch_id
  left join net_transfer nt on nt.batch_id = b.batch_id
  left join mort m on m.batch_id = b.batch_id
  left join harv h on h.batch_id = b.batch_id
  left join abw ab on ab.batch_id = b.batch_id
  left join ps on ps.batch_id = b.batch_id
  left join feed_m fm on fm.batch_id = b.batch_id
),
result as (
  select
    base.batch_id,
    base.batch_name,
    base.date_in,
    ((select e from bounds) - base.date_in)::integer as age_days,
    base.stocked as total_stocked,
    base.stock_end,
    base.abw_g::double precision as abw_g,
    base.harv_n_m as harvest_number,
    base.harv_kg_m as harvest_kg,
    case when base.harv_n_m > 0 then (base.harv_kg_m / base.harv_n_m * 1000)::double precision end as harvest_abw_g,
    (base.stock_end * base.abw_g / 1000)::double precision as biomass_kg,
    (-base.lost_m)::double precision as cage_corrections,
    base.mort_m as mortality,
    (base.stock_end + base.mort_m + base.lost_m + base.harv_n_m - coalesce(base.stocked_m, 0)) as opening_n,
    base.growth_m as growth_kg,
    coalesce(base.feed_m, base.feed_ps_m) as feed_kg,
    base.feed_ps_m,
    base.feed_ps_all,
    base.growth_all
  from base
  where exists (
          select 1 from public.production_cycle pc
          where pc.batch_id = base.batch_id and pc.cycle_start <= (select e from bounds)
            and (pc.ongoing_cycle or pc.cycle_end >= (select s from bounds)))
    and (base.stock_end > 0 or base.mort_m > 0 or base.harv_n_m > 0 or base.lost_m > 0)
),
rows_out as (
  select r.batch_id, r.batch_name, r.date_in, r.age_days, r.total_stocked, r.stock_end, r.abw_g, r.harvest_number, r.harvest_kg,
         r.harvest_abw_g, r.biomass_kg, r.cage_corrections, r.mortality,
         case when r.opening_n > 0 then ((r.mortality - r.cage_corrections) / r.opening_n * 100)::double precision end as stock_loss_pct,
         r.growth_kg, r.feed_kg,
         case when coalesce(r.growth_kg, 0) > 0 then (coalesce(r.feed_ps_m, 0) / r.growth_kg)::double precision end as efcr,
         case when coalesce(r.growth_all, 0) > 0 then (coalesce(r.feed_ps_all, 0) / r.growth_all)::double precision end as acc_efcr
  from result r
),
total_row as (
  select null::bigint, 'Total'::text, null::date, null::integer,
         sum(r.total_stocked), sum(r.stock_end),
         case when sum(r.stock_end) > 0 then (sum(r.biomass_kg) / sum(r.stock_end) * 1000)::double precision end,
         sum(r.harvest_number), sum(r.harvest_kg),
         case when sum(r.harvest_number) > 0 then (sum(r.harvest_kg) / sum(r.harvest_number) * 1000)::double precision end,
         sum(r.biomass_kg), sum(r.cage_corrections), sum(r.mortality),
         case when sum(r.opening_n) > 0 then ((sum(r.mortality) - sum(r.cage_corrections)) / sum(r.opening_n) * 100)::double precision end,
         sum(r.growth_kg), sum(r.feed_kg),
         case when sum(r.growth_kg) > 0 then (sum(r.feed_ps_m) / sum(r.growth_kg))::double precision end,
         case when sum(r.growth_all) > 0 then (sum(r.feed_ps_all) / sum(r.growth_all))::double precision end
  from result r having count(*) > 0
)
select u.* from (select * from rows_out union all select * from total_row) u
order by (u.batch_id is null), u.date_in desc, u.batch_name) as x(batch_id, batch_name, date_in, age_days, total_stocked, stock_end, abw_g, harvest_number, harvest_kg, harvest_abw_g, biomass_kg, cage_corrections, mortality, stock_loss_pct, growth_kg, feed_kg, efcr, acc_efcr)
    ) end,
    'cage_harvests', case when p_sections is null or 'cage_harvests' = any(p_sections) then (
      select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
      from (with
bounds as (select case when p_period_start is not null and p_period_end is not null then greatest(p_period_start, p_period_end) else (date_trunc('month', p_month) + interval '1 month - 1 day')::date end as e),
guard as (select 1 as ok where private.app_rpc_scope_ok(p_farm_id, null::bigint[], null::bigint, null::date, null::date)),
cyc as (
  select pc.cycle_id, pc.system_id, pc.batch_id, pc.cycle_start, pc.cycle_end, pc.ongoing_cycle, s.name as cage_name
  from public.production_cycle pc
  join public.system s on s.id = pc.system_id and s.farm_id = p_farm_id, guard, bounds bd
  where pc.cycle_start <= bd.e
),
agg as (
  select c.cycle_id,
    coalesce((select sum(fs.number_of_fish_stocking) from public.fish_stocking fs where fs.cycle_id = c.cycle_id and fs.date <= bd.e), 0)
      + coalesce((select sum(ft.number_of_fish_transfer) from public.fish_transfer ft
                  where ft.target_system_id = c.system_id and ft.batch_id = c.batch_id
                    and ft.date between c.cycle_start and bd.e), 0) as stocked,
    coalesce((select sum(fs.total_weight_stocking) from public.fish_stocking fs where fs.cycle_id = c.cycle_id and fs.date <= bd.e), 0) as stocked_kg,
    coalesce((select sum(fm.number_of_fish_mortality) from public.fish_mortality fm where fm.cycle_id = c.cycle_id and fm.date <= bd.e), 0) as mort,
    coalesce((select sum(ft.number_of_fish_transfer) from public.fish_transfer ft
              where ft.origin_system_id = c.system_id and ft.target_system_id is null and ft.batch_id = c.batch_id
                and ft.date between c.cycle_start and bd.e), 0) as lost,
    coalesce((select sum(ft.number_of_fish_transfer) from public.fish_transfer ft
              where ft.origin_system_id = c.system_id and ft.target_system_id is not null and ft.batch_id = c.batch_id
                and ft.date between c.cycle_start and bd.e), 0) as moved_out,
    coalesce((select sum(fh.number_of_fish_harvest) from public.fish_harvest fh where fh.cycle_id = c.cycle_id and fh.date <= bd.e), 0) as hn,
    coalesce((select sum(fh.total_weight_harvest) from public.fish_harvest fh where fh.cycle_id = c.cycle_id and fh.date <= bd.e), 0) as hkg,
    coalesce((select sum(fr.feeding_amount) from public.feeding_record fr where fr.cycle_id = c.cycle_id and fr.date <= bd.e), 0) as feed,
    (select max(fh.date) from public.fish_harvest fh where fh.cycle_id = c.cycle_id and fh.date <= bd.e) as last_harvest
  from cyc c, bounds bd
)
select
  c.cycle_id,
  c.cage_name,
  coalesce(nullif(fb.name, ''), 'Batch #' || c.batch_id::text) as batch_name,
  c.cycle_start,
  (coalesce(case when c.ongoing_cycle then null else c.cycle_end end, a.last_harvest) - c.cycle_start)::integer as age_days,
  a.stocked::double precision,
  a.mort::double precision,
  case when a.stocked > 0 then (a.mort / a.stocked * 100)::double precision end,
  (-a.lost)::double precision,
  case when a.stocked > 0 then (-a.lost / a.stocked * 100)::double precision end,
  case when a.stocked > 0 then ((a.stocked - a.mort - a.lost - a.moved_out) / a.stocked * 100)::double precision end,
  a.hn::double precision,
  a.hkg::double precision,
  case when a.hn > 0 then (a.hkg / a.hn * 1000)::double precision end,
  a.feed::double precision,
  case when a.hkg - a.stocked_kg > 0 then (a.feed / (a.hkg - a.stocked_kg))::double precision end
from cyc c
join agg a on a.cycle_id = c.cycle_id
left join public.fingerling_batch fb on fb.id = c.batch_id
where a.hn > 0
  and (not c.ongoing_cycle or a.stocked - a.mort - a.lost - a.moved_out - a.hn <= 0)
order by a.last_harvest desc, c.cage_name) as x(cycle_id, cage_name, batch_name, original_stock_date, age_days, total_stocked, mortalities, mortality_pct, cage_corrections, cage_correction_pct, survival_pct, harvest_number, harvest_kg, harvest_abw_g, feed_kg, efcr)
    ) end,
    'feed_vs_expected', case when p_sections is null or 'feed_vs_expected' = any(p_sections) then (
      select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
      from (with
bounds as (
  select case when p_period_start is not null and p_period_end is not null then least(p_period_start, p_period_end) else date_trunc('month', p_month)::date end as s,
         case when p_period_start is not null and p_period_end is not null then greatest(p_period_start, p_period_end)
              else (date_trunc('month', p_month) + interval '1 month - 1 day')::date end as e
),
guard as (select 1 as ok where private.app_rpc_scope_ok(p_farm_id, null::bigint[], null::bigint, null::date, null::date)),
rates as (
  select abw_min_g, abw_max_g, (feed_rate_min_pct + feed_rate_max_pct) / 2.0 as rate_pct
  from public.feeding_rate_config where scenario = 'main' and is_default
),
days as (
  select d.system_id, d.batch_id, d.inventory_date, d.number_of_fish,
         coalesce(d.estimated_abw_g, d.abw_last_sampling) as abw_g,
         coalesce(d.estimated_biomass_kg, d.biomass_last_sampling) as biomass_kg
  from analytics.daily_system_facts d
  join public.system s on s.id = d.system_id and s.farm_id = p_farm_id, bounds bd, guard
  where d.inventory_date between bd.s and bd.e and coalesce(d.number_of_fish, 0) > 0
),
expd as (
  select dy.system_id, dy.batch_id,
         sum(dy.biomass_kg * coalesce(
               (select r.rate_pct from rates r where dy.abw_g >= r.abw_min_g and dy.abw_g < r.abw_max_g limit 1),
               (select r.rate_pct from rates r order by r.abw_max_g desc limit 1)) / 100.0)::double precision as expected_kg,
         (array_agg(dy.abw_g order by dy.inventory_date asc))[1] as abw_start_g,
         (array_agg(dy.abw_g order by dy.inventory_date desc))[1] as abw_end_g
  from days dy group by dy.system_id, dy.batch_id
),
fed as (
  select fr.system_id, fr.batch_id, sum(fr.feeding_amount)::double precision as fed_kg
  from public.feeding_record fr, bounds bd
  where fr.date between bd.s and bd.e group by fr.system_id, fr.batch_id
)
select
  e.system_id,
  s.name,
  coalesce(nullif(fb.name, ''), 'Batch #' || e.batch_id::text),
  coalesce(f.fed_kg, 0),
  e.expected_kg,
  e.abw_start_g::double precision,
  e.abw_end_g::double precision,
  case when e.abw_start_g > 0 then ((e.abw_end_g / e.abw_start_g - 1) * 100)::double precision end,
  case when e.expected_kg > 0 then (coalesce(f.fed_kg, 0) / e.expected_kg * 100)::double precision end
from expd e
join public.system s on s.id = e.system_id
left join public.fingerling_batch fb on fb.id = e.batch_id
left join fed f on f.system_id = e.system_id and f.batch_id = e.batch_id
order by s.name) as x(system_id, cage_name, batch_name, feed_fed_kg, feed_expected_kg, abw_start_g, abw_end_g, abw_increase_pct, feed_vs_expected_pct)
    ) end
);
$function$;

alter function public.api_analytics_performance(uuid, date, date, date, text[]) owner to postgres;
revoke all on function public.api_analytics_performance(uuid, date, date, date, text[]) from public;
grant all on function public.api_analytics_performance(uuid, date, date, date, text[]) to authenticated;
grant all on function public.api_analytics_performance(uuid, date, date, date, text[]) to service_role;
comment on function public.api_analytics_performance(uuid, date, date, date, text[]) is
  'L3. /analytics and /reports performance reports: jsonb {batches (last row = total), cage_harvests, feed_vs_expected} for the month of p_month or p_period_start..p_period_end. p_sections limits what is computed. Last reviewed: 2026-10. Owner: @aquasmart-backend';

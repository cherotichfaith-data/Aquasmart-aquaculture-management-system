-- Growth scenarios share main mortality assumptions when no scenario-specific benchmark is configured.
CREATE OR REPLACE FUNCTION public.api_analytics_outlook(p_farm_id uuid, p_month date, p_as_of date DEFAULT NULL::date, p_planned_fish double precision DEFAULT 0, p_planned_abw_g double precision DEFAULT 2, p_scenario text DEFAULT 'main'::text, p_target_g double precision DEFAULT NULL::double precision, p_months_back integer DEFAULT 6, p_months_forward integer DEFAULT 6, p_plan_months integer DEFAULT 12, p_sections text[] DEFAULT NULL::text[])
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'analytics', 'private'
AS $function$
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
  select p.as_of, p.first_month, p.target_g, p.scenario, (p.first_month + (p.n_months || ' months')::interval - interval '1 day')::date as last_day
  from params p, guard
),
months as (select (h.first_month + (g || ' months')::interval)::date as month_start from horizon h, generate_series(0, (select n_months - 1 from params)) g),
live as (
  select distinct on (d.system_id) d.system_id, d.number_of_fish::double precision as fish0, coalesce(d.estimated_abw_g, d.abw_last_sampling)::double precision as abw0
  from analytics.daily_system_facts d join public.system s on s.id = d.system_id and s.farm_id = p_farm_id, horizon h
  where d.inventory_date <= h.as_of and d.inventory_date >= h.as_of - 14 and coalesce(d.number_of_fish, 0) > 0 and coalesce(d.estimated_abw_g, d.abw_last_sampling) > 0
  order by d.system_id, d.inventory_date desc
),
planned as (select m.month_start, (m.month_start + 14) as start_date, p_planned_fish as fish0, p_planned_abw_g as abw0 from months m where coalesce(p_planned_fish, 0) > 0 and coalesce(p_planned_abw_g, 0) > 0),
cohorts as (
  select row_number() over () as cohort_id, h.as_of as start_date, l.fish0, l.abw0, false as is_planned, null::date as stock_month from live l, horizon h
  union all
  select 1000 + row_number() over (order by pl.month_start), pl.start_date, pl.fish0, pl.abw0, true, pl.month_start from planned pl
),
mort_pts as (select b.end_abw_g, b.expected_cum_mortality_pct as cum_pct from public.growth_cycle_benchmark b, params p where b.scenario = case when exists (select 1 from public.growth_cycle_benchmark configured where configured.scenario = p.scenario) then p.scenario else 'main' end),
days as (
  select c.cohort_id, c.fish0, c.abw0, c.is_planned, (c.start_date + cv.day) as dt, cv.day as age_d, cv.expected_abw_g::double precision as abw, coalesce(cv.expected_feeding_rate_pct, 1.0)::double precision as rate_pct
  from cohorts c cross join horizon h cross join lateral public.api_growth_standard_curve(h.scenario, c.abw0::numeric, 450) cv
  where (c.start_date + cv.day) <= h.last_day and cv.day >= (case when c.is_planned then 0 else 1 end)
),
harvest_day as (select d.cohort_id, min(d.age_d) as harvest_age from days d, horizon h where d.abw >= h.target_g group by d.cohort_id),
alive as (
  select d.*, hd.harvest_age,
         d.fish0 * greatest(0, (1 - coalesce((select mp.cum_pct from mort_pts mp where mp.end_abw_g >= d.abw order by mp.end_abw_g limit 1), (select max(mp.cum_pct) from mort_pts mp)) / 100.0)
         / nullif(1 - coalesce((select mp.cum_pct from mort_pts mp where mp.end_abw_g >= d.abw0 order by mp.end_abw_g limit 1), (select max(mp.cum_pct) from mort_pts mp)) / 100.0, 0)) as fish
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
stock_by_month as (select pl.month_start, sum(pl.fish0) as fish from planned pl group by 1)
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
from months m left join by_month bm on bm.month_start = m.month_start left join stock_by_month sm on sm.month_start = m.month_start
order by m.month_start
),
profile as (
with
guard as (select 1 as ok where private.app_rpc_scope_ok(p_farm_id, null::bigint[], null::bigint, null::date, null::date)),
params as (
  select p_farm_id as farm_id, coalesce(p_as_of, (date_trunc('month', p_month) + interval '1 month - 1 day')::date) as as_of,
         greatest(coalesce(p_planned_fish, 0), 0) as pfish, greatest(coalesce(p_planned_abw_g, 2), 0.1) as pabw, lower(coalesce(p_scenario, 'main')) as scen,
         coalesce(p_target_g, (select value::double precision from public.app_config where key = 'target_harvest_weight_g'), 500) as target_g
  from guard
),
curve as (select cv.day, cv.expected_abw_g::double precision as abw from params p cross join lateral public.api_growth_standard_curve(p.scen, p.pabw::numeric, 450) cv),
edges as (select (c.day / 30) as k, c.abw from curve c where c.day % 30 = 0),
last_k as (select coalesce(min(e.k) filter (where e.abw >= (select target_g from params)), max(e.k)) as ke from edges e),
classes as (
  select g as k,
         case when g = 0 then 0::double precision else (select e.abw from edges e where e.k = g) end as lower_g,
         case when g = (select ke from last_k) then null else (select e.abw from edges e where e.k = g + 1) end as upper_g
  from last_k, generate_series(0, (select ke from last_k)) g
),
mort_pts as (select b.end_abw_g, b.expected_cum_mortality_pct as cum_pct from public.growth_cycle_benchmark b, params p where b.scenario = case when exists (select 1 from public.growth_cycle_benchmark configured where configured.scenario = p.scen) then p.scen else 'main' end),
surv as (
  select c.k,
         case when c.upper_g is null then 0::double precision else
           (1 - coalesce((select mp.cum_pct from mort_pts mp where mp.end_abw_g >= (select cv.abw from curve cv where cv.day = c.k * 30 + 15) order by mp.end_abw_g limit 1), (select max(mp.cum_pct) from mort_pts mp)) / 100.0)
           / nullif(1 - coalesce((select mp.cum_pct from mort_pts mp where mp.end_abw_g >= (select pabw from params) order by mp.end_abw_g limit 1), (select max(mp.cum_pct) from mort_pts mp)) / 100.0, 0)
         end as s
  from classes c
),
live as (
  select distinct on (d.system_id) d.system_id, d.number_of_fish::double precision as fish, coalesce(d.estimated_abw_g, d.abw_last_sampling)::double precision as abw
  from analytics.daily_system_facts d join public.system s on s.id = d.system_id and s.farm_id = p_farm_id, params p
  where d.inventory_date <= p.as_of and d.inventory_date >= p.as_of - 14 and coalesce(d.number_of_fish, 0) > 0 and coalesce(d.estimated_abw_g, d.abw_last_sampling) > 0
  order by d.system_id, d.inventory_date desc
)
select c.k::integer + 1, c.lower_g, c.upper_g,
       ((select pfish from params) * coalesce(sv.s, 0))::double precision,
       coalesce((select sum(l.fish) from live l where l.abw >= c.lower_g and (c.upper_g is null or l.abw < c.upper_g)), 0)::double precision,
       coalesce((select count(*) from live l where l.abw >= c.lower_g and (c.upper_g is null or l.abw < c.upper_g)), 0)::integer,
       array(select coalesce(nullif(s.name, ''), 'Cage #' || l.system_id::text) from live l join public.system s on s.id = l.system_id where l.abw >= c.lower_g and (c.upper_g is null or l.abw < c.upper_g) order by s.name, l.system_id) as cage_names
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
         p_planned_fish as pfish, p_planned_abw_g as pabw, lower(coalesce(p_scenario, 'main')) as scen,
         (date_trunc('month', p_month) + interval '1 month - 1 day')::date as as_of,
         date_trunc('month', p_month)::date as cur_month,
         (date_trunc('month', p_month) - (least(greatest(coalesce(p_months_back, 6), 0), 24) || ' months')::interval)::date as first_month,
         coalesce(p_target_g, (select value::double precision from public.app_config where key = 'target_harvest_weight_g'), 500) as target_g
  from guard
),
past_months as (
  select (p.first_month + (g || ' months')::interval)::date as month_start, (p.first_month + ((g + 1) || ' months')::interval - interval '1 day')::date as month_end
  from params p, generate_series(0, (select back from params)) g
),
mort_pts as (select b.end_abw_g, b.expected_cum_mortality_pct as cum_pct from public.growth_cycle_benchmark b, params p where b.scenario = case when exists (select 1 from public.growth_cycle_benchmark configured where configured.scenario = p.scen) then p.scen else 'main' end),
ev as (
  select row_number() over () as ev_id, fs.date as start_date, sum(fs.number_of_fish_stocking)::double precision as fish0,
         (sum(fs.total_weight_stocking) / nullif(sum(fs.number_of_fish_stocking), 0) * 1000)::double precision as abw0
  from public.fish_stocking fs join public.system s on s.id = fs.system_id, params p
  where s.farm_id = p.farm_id and fs.date <= p.as_of and fs.date >= p.first_month - 450
  group by fs.date, fs.batch_id
),
curve as (
  select e.ev_id, e.start_date, cv.day, cv.expected_abw_g::double precision as abw,
         e.fish0 * greatest(0, (1 - coalesce((select mp.cum_pct from mort_pts mp where mp.end_abw_g >= cv.expected_abw_g order by mp.end_abw_g limit 1), (select max(mp.cum_pct) from mort_pts mp)) / 100.0)
           / nullif(1 - coalesce((select mp.cum_pct from mort_pts mp where mp.end_abw_g >= e.abw0 order by mp.end_abw_g limit 1), (select max(mp.cum_pct) from mort_pts mp)) / 100.0, 0)) as fish
  from ev e cross join params p cross join lateral public.api_growth_standard_curve(p.scen, e.abw0::numeric, 450) cv
  where e.abw0 > 0
),
harvest_age as (select c.ev_id, min(c.day) as hday from curve c, params p where c.abw >= p.target_g group by c.ev_id),
past_forecast as (
  select m.month_start,
         (select coalesce(sum(c.fish * c.abw / 1000.0), 0) from curve c left join harvest_age h on h.ev_id = c.ev_id where c.day = (m.month_end - c.start_date) and (h.hday is null or c.day < h.hday)) as bio_fc,
         (select coalesce(sum(c.fish * c.abw / 1000.0), 0) from curve c join harvest_age h on h.ev_id = c.ev_id where c.day = h.hday and (c.start_date + c.day) between m.month_start and m.month_end) as harv_fc
  from past_months m
),
recorded as (
  select m.month_start,
         (select sum(x.b) from (
            select distinct on (d.system_id) coalesce(d.estimated_biomass_kg, d.biomass_last_sampling) as b
            from analytics.daily_system_facts d join public.system s on s.id = d.system_id and s.farm_id = (select farm_id from params)
            where d.inventory_date <= m.month_end and d.inventory_date >= m.month_end - 14 and coalesce(d.number_of_fish, 0) > 0
            order by d.system_id, d.inventory_date desc) x) as bio_rec,
         (select sum(h.total_weight_harvest) from public.fish_harvest h join public.system s on s.id = h.system_id and s.farm_id = (select farm_id from params)
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
      from (select * from profile) as x(class_no, abw_from_g, abw_to_g, ideal_fish, recorded_fish, recorded_cages, cage_names)
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
$function$

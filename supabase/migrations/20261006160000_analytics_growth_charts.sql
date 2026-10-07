-- Analytics: growth analysis charts, added as sections of api_analytics_performance (no new function).
--
-- New sections (all follow the same period as the batch report):
--   growth_by_batch  per batch: biomass gain recorded in the period vs the gain the growth model expects for the
--                    same fish over the same period (stock at period end x change in model ABW).
--   abw_points       every stocking/sampling ABW of those batches up to the period end, with `age_days` (days since
--                    first stocking) and `model_age_days` (age_days plus the model age at the batch's stocking weight),
--                    so batches stocked at different sizes sit on one growth-model age axis.
--   growth_curve     the main / slow / potential model curves (ABW by model age, every 5 days from 0.1 g).
-- p_scenario picks the curve used to place batches on the model-age axis and to work out expected gain.

drop function if exists public.api_analytics_performance(uuid, date, date, date, text[]);
create function public.api_analytics_performance(
  p_farm_id uuid,
  p_month date,
  p_period_start date default null,
  p_period_end date default null,
  p_sections text[] default null,
  p_scenario text default 'main'
)
returns jsonb
language sql
stable
security definer
set search_path to 'pg_catalog', 'public', 'analytics', 'private'
as $function$
with
pb as (
  select case when p_period_start is not null and p_period_end is not null then least(p_period_start, p_period_end) else date_trunc('month', p_month)::date end as s,
         case when p_period_start is not null and p_period_end is not null then greatest(p_period_start, p_period_end)
              else (date_trunc('month', p_month) + interval '1 month - 1 day')::date end as e
),
batch_rows as materialized (
with
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
order by (u.batch_id is null), u.date_in desc, u.batch_name
),
ref as (
  select cv.day, cv.expected_abw_g::double precision as abw
  from public.api_growth_standard_curve(lower(coalesce(p_scenario, 'main')), 0.1, 600) cv
),
stk as (
  select fs.batch_id,
         sum(fs.total_weight_stocking) / nullif(sum(fs.number_of_fish_stocking), 0) * 1000 as abw0
  from public.fish_stocking fs
  where fs.batch_id in (select r.batch_id from batch_rows r where r.batch_id is not null)
    and fs.date <= (select e from pb)
  group by fs.batch_id
),
batch_age as (
  select r.batch_id, r.batch_name, r.date_in, r.stock_end, r.growth_kg,
         coalesce((select min(rf.day) from ref rf where rf.abw >= s.abw0), 0) as age0
  from batch_rows r left join stk s on s.batch_id = r.batch_id
  where r.batch_id is not null
),
gb as (
  select b.batch_id, b.batch_name, b.date_in,
         b.growth_kg as gain_recorded_kg,
         (b.stock_end * (
            (select rf.abw from ref rf where rf.day = least(b.age0 + ((select e from pb) - b.date_in), 600))
          - (select rf.abw from ref rf where rf.day = least(b.age0 + (greatest((select s from pb), b.date_in) - b.date_in), 600))
         ) / 1000.0)::double precision as gain_expected_kg
  from batch_age b
  order by b.date_in desc, b.batch_name
),
pts as (
  select pc.batch_id, x.date,
         coalesce(sum(x.average_body_weight * coalesce(x.number_of_fish_end, 0)) / nullif(sum(coalesce(x.number_of_fish_end, 0)), 0),
                  avg(x.average_body_weight))::double precision as abw_g
  from analytics.production_summary x
  join public.production_cycle pc on pc.cycle_id = x.cycle_id
  where pc.batch_id in (select r.batch_id from batch_rows r where r.batch_id is not null)
    and x.date <= (select e from pb) and x.activity in ('sampling', 'stocking') and x.average_body_weight > 0
  group by pc.batch_id, x.date
),
abw_pts as (
  select b.batch_id, b.batch_name, p.date,
         (p.date - b.date_in)::integer as age_days,
         (b.age0 + (p.date - b.date_in))::integer as model_age_days,
         p.abw_g
  from pts p join batch_age b on b.batch_id = p.batch_id
  where p.date >= b.date_in
  order by b.date_in desc, b.batch_name, p.date
),
curves as (
  select sc.scenario, cv.day::integer as day, cv.expected_abw_g::double precision as abw_g
  from unnest(array['main', 'slow', 'potential']) as sc(scenario)
  cross join lateral public.api_growth_standard_curve(sc.scenario, 0.1, 600) cv
  where cv.day % 5 = 0
  order by sc.scenario, cv.day
)
select jsonb_build_object(
    'batches', case when p_sections is null or 'batches' = any(p_sections) then (
      select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
      from (select * from batch_rows) as x(batch_id, batch_name, date_in, age_days, total_stocked, stock_end, abw_g, harvest_number, harvest_kg, harvest_abw_g, biomass_kg, cage_corrections, mortality, stock_loss_pct, growth_kg, feed_kg, efcr, acc_efcr)
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
    ) end,
    'growth_by_batch', case when p_sections is null or 'growth_by_batch' = any(p_sections) then (
      select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
      from (select * from gb) as x(batch_id, batch_name, date_in, gain_recorded_kg, gain_expected_kg)
    ) end,
    'abw_points', case when p_sections is null or 'abw_points' = any(p_sections) then (
      select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
      from (select * from abw_pts) as x(batch_id, batch_name, date, age_days, model_age_days, abw_g)
    ) end,
    'growth_curve', case when p_sections is null or 'growth_curve' = any(p_sections) then (
      select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
      from (select * from curves) as x(scenario, day, abw_g)
    ) end
);
$function$;

alter function public.api_analytics_performance(uuid, date, date, date, text[], text) owner to postgres;
revoke all on function public.api_analytics_performance(uuid, date, date, date, text[], text) from public;
grant all on function public.api_analytics_performance(uuid, date, date, date, text[], text) to authenticated;
grant all on function public.api_analytics_performance(uuid, date, date, date, text[], text) to service_role;
comment on function public.api_analytics_performance(uuid, date, date, date, text[], text) is
  'L3. /analytics and /reports performance reports: jsonb {batches (last row = total), cage_harvests, feed_vs_expected, growth_by_batch, abw_points, growth_curve} for the month of p_month or p_period_start..p_period_end. p_sections limits what is computed. Last reviewed: 2026-10. Owner: @aquasmart-backend';

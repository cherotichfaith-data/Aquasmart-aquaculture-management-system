-- Analytics reports: report the exact selected period.
-- p_period_start / p_period_end (both given) replace the calendar month for the three period reports, so
-- /reports and /analytics can report e.g. 23 Aug - 23 Sep exactly. Without them each function behaves as
-- before (the month containing p_month). The cage harvest report is cumulative per cycle, so it only uses
-- the period end. The old (uuid, date) signatures are dropped.

drop function if exists public.api_analytics_batch_report(uuid, date);
drop function if exists public.api_analytics_cage_harvest_report(uuid, date);
drop function if exists public.api_analytics_feed_vs_expected(uuid, date);

-- 1. Detailed Batch Report ---------------------------------------------------
create function public.api_analytics_batch_report(p_farm_id uuid, p_month date, p_period_start date default null, p_period_end date default null)
returns table(
  batch_id bigint,
  batch_name text,
  date_in date,
  age_days integer,
  total_stocked double precision,
  stock_end double precision,
  abw_g double precision,
  harvest_number double precision,
  harvest_kg double precision,
  harvest_abw_g double precision,
  biomass_kg double precision,
  cage_corrections double precision,
  mortality double precision,
  stock_loss_pct double precision,
  growth_kg double precision,
  feed_kg double precision,
  efcr double precision,
  acc_efcr double precision
)
language sql
stable
security definer
set search_path to 'pg_catalog', 'public', 'analytics', 'private'
as $function$
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
order by (u.batch_id is null), u.date_in desc, u.batch_name;
$function$;

-- 2. Cage Harvest Report -----------------------------------------------------
-- One row per production cycle that has harvests and is finished: the cycle was
-- closed, or the cage holds no fish any more at month end.
create function public.api_analytics_cage_harvest_report(p_farm_id uuid, p_month date, p_period_start date default null, p_period_end date default null)
returns table(
  cycle_id bigint,
  cage_name text,
  batch_name text,
  original_stock_date date,
  age_days integer,
  total_stocked double precision,
  mortalities double precision,
  mortality_pct double precision,
  cage_corrections double precision,
  cage_correction_pct double precision,
  survival_pct double precision,
  harvest_number double precision,
  harvest_kg double precision,
  harvest_abw_g double precision,
  feed_kg double precision,
  efcr double precision
)
language sql
stable
security definer
set search_path to 'pg_catalog', 'public', 'analytics', 'private'
as $function$
with
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
order by a.last_harvest desc, c.cage_name;
$function$;

-- 3. ABW increase and feed fed vs expected, per active cage ------------------
-- Expected feed = sum over the month's days of estimated biomass x the feeding
-- rate for that day's ABW (midpoint of the default 'main' feeding_rate_config band).
create function public.api_analytics_feed_vs_expected(p_farm_id uuid, p_month date, p_period_start date default null, p_period_end date default null)
returns table(
  system_id bigint,
  cage_name text,
  batch_name text,
  feed_fed_kg double precision,
  feed_expected_kg double precision,
  abw_start_g double precision,
  abw_end_g double precision,
  abw_increase_pct double precision,
  feed_vs_expected_pct double precision
)
language sql
stable
security definer
set search_path to 'pg_catalog', 'public', 'analytics', 'private'
as $function$
with
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
order by s.name;
$function$;


do $$
declare fn text;
begin
  foreach fn in array array[
    'public.api_analytics_batch_report(uuid, date, date, date)',
    'public.api_analytics_cage_harvest_report(uuid, date, date, date)',
    'public.api_analytics_feed_vs_expected(uuid, date, date, date)'
  ] loop
    execute format('alter function %s owner to postgres', fn);
    execute format('revoke all on function %s from public', fn);
    execute format('grant all on function %s to authenticated', fn);
    execute format('grant all on function %s to service_role', fn);
  end loop;
end $$;

comment on function public.api_analytics_batch_report(uuid, date, date, date) is 'L3. Detailed Batch Report for /analytics and /reports (last row = total of the rows shown). Period = the month containing p_month, or p_period_start..p_period_end. Last reviewed: 2026-10. Owner: @aquasmart-backend';
comment on function public.api_analytics_cage_harvest_report(uuid, date, date, date) is 'L3. Cage Harvest Report for /analytics: finished cage cycles with harvests as at the period end. Last reviewed: 2026-10. Owner: @aquasmart-backend';
comment on function public.api_analytics_feed_vs_expected(uuid, date, date, date) is 'L3. Per-cage ABW increase and feed fed vs expected over the period, for /analytics. Last reviewed: 2026-10. Owner: @aquasmart-backend';

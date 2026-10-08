CREATE OR REPLACE FUNCTION public.api_analytics_performance(p_farm_id uuid, p_month date, p_period_start date DEFAULT NULL::date, p_period_end date DEFAULT NULL::date, p_sections text[] DEFAULT NULL::text[], p_scenario text DEFAULT 'main'::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'analytics', 'private'
AS $function$
with
pb as (
  select case when p_period_start is not null and p_period_end is not null then least(p_period_start, p_period_end) else date_trunc('month', p_month)::date end as s,
         case when p_period_start is not null and p_period_end is not null then greatest(p_period_start, p_period_end) else (date_trunc('month', p_month) + interval '1 month - 1 day')::date end as e
),
batch_rows as materialized (
with
bounds as (
  select case when p_period_start is not null and p_period_end is not null then least(p_period_start, p_period_end) else date_trunc('month', p_month)::date end as s,
         case when p_period_start is not null and p_period_end is not null then greatest(p_period_start, p_period_end) else (date_trunc('month', p_month) + interval '1 month - 1 day')::date end as e
),
guard as (select 1 as ok where private.app_rpc_scope_ok(p_farm_id, null::bigint[], null::bigint, null::date, null::date)),
b as (select fb.id as batch_id, coalesce(nullif(fb.name, ''), 'Batch #' || fb.id::text) as batch_name from public.fingerling_batch fb, guard where fb.farm_id = p_farm_id),
stock as (select fs.batch_id, min(fs.date) as date_in, sum(fs.number_of_fish_stocking)::double precision as stocked, sum(fs.number_of_fish_stocking) filter (where fs.date >= bd.s)::double precision as stocked_m from public.fish_stocking fs join b on b.batch_id = fs.batch_id, bounds bd where fs.date <= bd.e group by fs.batch_id),
net_transfer as (select ft.batch_id, sum(case when ft.target_system_id is not null then ft.number_of_fish_transfer else 0 end - case when ft.origin_system_id is not null then ft.number_of_fish_transfer else 0 end)::double precision as net_all, sum(case when ft.origin_system_id is not null and ft.target_system_id is null then ft.number_of_fish_transfer else 0 end) filter (where ft.date >= bd.s)::double precision as lost_m from public.fish_transfer ft join b on b.batch_id = ft.batch_id, bounds bd where ft.date <= bd.e group by ft.batch_id),
mort as (select fm.batch_id, sum(fm.number_of_fish_mortality)::double precision as mort_all, sum(fm.number_of_fish_mortality) filter (where fm.date >= bd.s)::double precision as mort_m from public.fish_mortality fm join b on b.batch_id = fm.batch_id, bounds bd where fm.date <= bd.e group by fm.batch_id),
harv as (select fh.batch_id, sum(fh.number_of_fish_harvest)::double precision as harv_all, sum(fh.number_of_fish_harvest) filter (where fh.date >= bd.s)::double precision as harv_n_m, sum(fh.total_weight_harvest) filter (where fh.date >= bd.s)::double precision as harv_kg_m from public.fish_harvest fh join b on b.batch_id = fh.batch_id, bounds bd where fh.date <= bd.e group by fh.batch_id),
feed_m as (select fr.batch_id, sum(fr.feeding_amount)::double precision as feed_m from public.feeding_record fr join b on b.batch_id = fr.batch_id, bounds bd where fr.date between bd.s and bd.e group by fr.batch_id),
ps as (select pc.batch_id, sum(x.feed_over_period) filter (where x.date >= bd.s)::double precision as feed_ps_m, sum(greatest(x.biomass_increase_over_period, 0)) filter (where x.date >= bd.s)::double precision as growth_m, sum(x.feed_over_period)::double precision as feed_ps_all, sum(greatest(x.biomass_increase_over_period, 0))::double precision as growth_all from analytics.production_summary x join public.production_cycle pc on pc.cycle_id = x.cycle_id join b on b.batch_id = pc.batch_id, bounds bd where x.date <= bd.e group by pc.batch_id),
abw_anchor as (select pc.batch_id, coalesce(max(x.date) filter (where x.activity = 'sampling'), max(x.date) filter (where x.activity = 'stocking')) as anchor_date, (max(x.date) filter (where x.activity = 'sampling')) is not null as has_sampling from analytics.production_summary x join public.production_cycle pc on pc.cycle_id = x.cycle_id join b on b.batch_id = pc.batch_id, bounds bd where x.date <= bd.e group by pc.batch_id),
abw as (select a.batch_id, (sum(x.average_body_weight * coalesce(x.number_of_fish_end, 0)) / nullif(sum(coalesce(x.number_of_fish_end, 0)), 0))::double precision as abw_g from abw_anchor a join public.production_cycle pc on pc.batch_id = a.batch_id join analytics.production_summary x on x.cycle_id = pc.cycle_id and x.date = a.anchor_date and x.activity = (case when a.has_sampling then 'sampling' else 'stocking' end) group by a.batch_id),
base as (select b.batch_id, b.batch_name, st.date_in, st.stocked, st.stocked_m, greatest(coalesce(st.stocked, 0) + coalesce(nt.net_all, 0) - coalesce(m.mort_all, 0) - coalesce(h.harv_all, 0), 0) as stock_end, coalesce(m.mort_m, 0) as mort_m, coalesce(nt.lost_m, 0) as lost_m, coalesce(h.harv_n_m, 0) as harv_n_m, coalesce(h.harv_kg_m, 0) as harv_kg_m, ab.abw_g, ps.feed_ps_m, ps.growth_m, ps.feed_ps_all, ps.growth_all, fm.feed_m from b join stock st on st.batch_id = b.batch_id left join net_transfer nt on nt.batch_id = b.batch_id left join mort m on m.batch_id = b.batch_id left join harv h on h.batch_id = b.batch_id left join abw ab on ab.batch_id = b.batch_id left join ps on ps.batch_id = b.batch_id left join feed_m fm on fm.batch_id = b.batch_id),
result as (
  select base.batch_id, base.batch_name, base.date_in, ((select e from bounds) - base.date_in)::integer as age_days, base.stocked as total_stocked, base.stock_end, base.abw_g::double precision as abw_g,
    base.harv_n_m as harvest_number, base.harv_kg_m as harvest_kg,
    case when base.harv_n_m > 0 then (base.harv_kg_m / base.harv_n_m * 1000)::double precision end as harvest_abw_g,
    (base.stock_end * base.abw_g / 1000)::double precision as biomass_kg,
    (-base.lost_m)::double precision as cage_corrections, base.mort_m as mortality,
    (base.stock_end + base.mort_m + base.lost_m + base.harv_n_m - coalesce(base.stocked_m, 0)) as opening_n,
    base.growth_m as growth_kg, coalesce(base.feed_m, base.feed_ps_m) as feed_kg, base.feed_ps_m, base.feed_ps_all, base.growth_all
  from base
  where exists (select 1 from public.production_cycle pc where pc.batch_id = base.batch_id and pc.cycle_start <= (select e from bounds) and pc.ongoing_cycle = true)
    and (base.stock_end > 0 or base.mort_m > 0 or base.harv_n_m > 0 or base.lost_m > 0)
),
rows_out as (
  select r.batch_id, r.batch_name, r.date_in, r.age_days, r.total_stocked, r.stock_end, r.abw_g, r.harvest_number, r.harvest_kg, r.harvest_abw_g, r.biomass_kg, r.cage_corrections, r.mortality,
         case when r.opening_n > 0 then ((r.mortality - r.cage_corrections) / r.opening_n * 100)::double precision end as stock_loss_pct,
         r.growth_kg, r.feed_kg,
         case when coalesce(r.growth_kg, 0) > 0 then (coalesce(r.feed_ps_m, 0) / r.growth_kg)::double precision end as efcr,
         case when coalesce(r.growth_all, 0) > 0 then (coalesce(r.feed_ps_all, 0) / r.growth_all)::double precision end as acc_efcr
  from result r
),
total_row as (
  select null::bigint, 'Total'::text, null::date, null::integer, sum(r.total_stocked), sum(r.stock_end),
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
ref as (select cv.day, cv.expected_abw_g::double precision as abw from public.api_growth_standard_curve(lower(coalesce(p_scenario, 'main')), 0.1, 600) cv),
stk as (
  select fs.batch_id, sum(fs.total_weight_stocking) / nullif(sum(fs.number_of_fish_stocking), 0) * 1000 as abw0
  from public.fish_stocking fs
  where fs.batch_id in (select r.batch_id from batch_rows r where r.batch_id is not null) and fs.date <= (select e from pb)
  group by fs.batch_id
),
batch_age as (
  select r.batch_id, r.batch_name, r.date_in, r.stock_end, r.growth_kg, coalesce((select min(rf.day) from ref rf where rf.abw >= s.abw0), 0) as age0
  from batch_rows r left join stk s on s.batch_id = r.batch_id where r.batch_id is not null
),
gb as (
  select b.batch_id, b.batch_name, b.date_in, case when 'growth_custom' = any(p_sections) then b.growth_kg else (select sum(greatest(x.biomass_increase_over_period, 0))::double precision
          from analytics.production_summary x join public.production_cycle pc on pc.cycle_id = x.cycle_id
          where pc.batch_id = b.batch_id and x.date between pc.cycle_start and (select e from pb)) end as gain_recorded_kg,
         (b.stock_end * ((select rf.abw from ref rf where rf.day = least(b.age0 + ((select e from pb) - b.date_in), 600))
                       - (select rf.abw from ref rf where rf.day = least(b.age0 + case when 'growth_custom' = any(p_sections) then greatest((select s from pb), b.date_in) - b.date_in else 0 end, 600))) / 1000.0)::double precision as gain_expected_kg
  from batch_age b order by b.date_in desc, b.batch_name
),
pts as (
  select pc.batch_id, x.date,
         coalesce(sum(x.average_body_weight * coalesce(x.number_of_fish_end, 0)) / nullif(sum(coalesce(x.number_of_fish_end, 0)), 0), avg(x.average_body_weight))::double precision as abw_g
  from analytics.production_summary x join public.production_cycle pc on pc.cycle_id = x.cycle_id
  where pc.batch_id in (select r.batch_id from batch_rows r where r.batch_id is not null) and x.date <= (select e from pb) and x.activity in ('sampling', 'stocking') and x.average_body_weight > 0
  group by pc.batch_id, x.date
),
abw_pts as (
  select b.batch_id, b.batch_name, p.date, (p.date - b.date_in)::integer as age_days, (b.age0 + (p.date - b.date_in))::integer as model_age_days, p.abw_g
  from pts p join batch_age b on b.batch_id = p.batch_id where p.date >= b.date_in and (not coalesce('growth_custom' = any(p_sections), false) or p.date >= (select s from pb))
  order by b.date_in desc, b.batch_name, p.date
),
curves as (
  select sc.scenario, cv.day::integer as day, cv.expected_abw_g::double precision as abw_g
  from unnest(array['main', 'slow', 'potential']) as sc(scenario) cross join lateral public.api_growth_standard_curve(sc.scenario, 0.1, 600) cv
  where cv.day % 5 = 0 order by sc.scenario, cv.day
),

harvest_scopes as (
  select 'cage'::text scope,h.cycle_id,h.system_id,h.batch_id,max(h.date) harvest_date
  from public.fish_harvest h join public.system s on s.id=h.system_id cross join pb
  where s.farm_id=p_farm_id and h.date between pb.s and pb.e and h.number_of_fish_harvest>0
    and (p_sections is null or 'cage_harvests'=any(p_sections))
    and private.app_rpc_scope_ok(p_farm_id,null::bigint[],null::bigint,null::date,null::date)
    and (private.is_farm_member(p_farm_id) or auth.jwt()->>'role'='service_role')
  group by h.cycle_id,h.system_id,h.batch_id
  union all
  select 'batch',pc.cycle_id,null::bigint,pc.batch_id,pc.cycle_end
  from public.production_cycle pc join public.fingerling_batch fb on fb.id=pc.batch_id cross join pb
  where fb.farm_id=p_farm_id and not pc.ongoing_cycle and pc.cycle_end between pb.s and pb.e
    and (p_sections is null or 'batch_harvests'=any(p_sections))
    and private.app_rpc_scope_ok(p_farm_id,null::bigint[],null::bigint,null::date,null::date)
    and (private.is_farm_member(p_farm_id) or auth.jwt()->>'role'='service_role')
    and exists(select 1 from public.fish_harvest h where h.cycle_id=pc.cycle_id and h.type_of_harvest='final' and h.date=pc.cycle_end)
),
harvest_aggregates as (
  select hs.*,fb.name batch_name,fb.date_of_delivery original_stock_date,s.name cage_name,s.unit unit,
    st.n+tr.in_n stocked,st.kg+tr.in_kg input_kg,
    st.missing_weight+tr.missing_weight missing_weight,tr.delta,tr.ambiguous,
    tr.out_n,tr.out_kg,mo.n mort,ha.n hn,ha.kg hkg,fe.kg feed
  from harvest_scopes hs join public.production_cycle pc on pc.cycle_id=hs.cycle_id
  join public.fingerling_batch fb on fb.id=hs.batch_id left join public.system s on s.id=hs.system_id
  cross join lateral (
    select coalesce(sum(number_of_fish_stocking),0) n,coalesce(sum(total_weight_stocking),0) kg,
      count(*) filter(where total_weight_stocking is null) missing_weight
    from public.fish_stocking where cycle_id=hs.cycle_id and (hs.system_id is null or system_id=hs.system_id)
      and date between pc.cycle_start and hs.harvest_date
  ) st
  cross join lateral (
    select coalesce(sum(number_of_fish_transfer) filter(where is_in and transfer_type<>'count_check'),0) in_n,
      coalesce(sum(total_weight_transfer) filter(where is_in and transfer_type<>'count_check'),0) in_kg,
      coalesce(sum(number_of_fish_transfer) filter(where is_out and transfer_type<>'count_check'),0) out_n,
      -- Escapes/losses are not productive biomass output.
      coalesce(sum(total_weight_transfer) filter(where is_out and transfer_type not in ('count_check','external_out')),0) out_kg,
      count(*) filter(where transfer_type<>'count_check' and total_weight_transfer is null
        and (is_in or (is_out and transfer_type<>'external_out'))) missing_weight,
      coalesce(sum(case when is_in then number_of_fish_transfer when is_out then -number_of_fish_transfer else 0 end)
        filter(where transfer_type='count_check' and ((origin_system_id is null)<>(target_system_id is null))),0) delta,
      count(*) filter(where transfer_type='count_check' and origin_system_id is not null
        and target_system_id is not null and origin_system_id<>target_system_id) ambiguous
    from (
      select t.*,
        (case when hs.system_id is null then origin_system_id is null and target_system_id is not null
          else target_system_id=hs.system_id and origin_system_id is distinct from target_system_id end) is_in,
        (case when hs.system_id is null then target_system_id is null and origin_system_id is not null
          else origin_system_id=hs.system_id and target_system_id is distinct from origin_system_id end) is_out
      from public.fish_transfer t where cycle_id=hs.cycle_id
        and (hs.system_id is null or origin_system_id=hs.system_id or target_system_id=hs.system_id)
        and date between pc.cycle_start and hs.harvest_date
    ) t
  ) tr
  cross join lateral (select coalesce(sum(number_of_fish_mortality),0) n from public.fish_mortality
    where cycle_id=hs.cycle_id and (hs.system_id is null or system_id=hs.system_id)
    and date between pc.cycle_start and hs.harvest_date) mo
  cross join lateral (select coalesce(sum(number_of_fish_harvest),0) n,coalesce(sum(total_weight_harvest),0) kg from public.fish_harvest
    where cycle_id=hs.cycle_id and (hs.system_id is null or system_id=hs.system_id)
    and date between pc.cycle_start and hs.harvest_date) ha
  cross join lateral (select sum(feeding_amount) kg from public.feeding_record
    where cycle_id=hs.cycle_id and (hs.system_id is null or system_id=hs.system_id)
    and date between pc.cycle_start and hs.harvest_date) fe
),
harvest_rows as (
  select scope,cycle_id,system_id,batch_id,unit,cage_name,batch_name,original_stock_date,harvest_date,
    (harvest_date-original_stock_date)::integer age_days,
    stocked::double precision total_stocked,mort::double precision mortalities,
    (100.0*mort/nullif(stocked,0))::double precision mortality_pct,
    case when ambiguous=0 then delta::double precision end cage_corrections,
    case when ambiguous=0 then (100.0*delta/nullif(stocked,0))::double precision end cage_correction_pct,
    -- Template survival is harvest recovery against the ORIGINAL estimated count.
    (100.0*hn/nullif(stocked,0))::double precision survival_pct,
    (100.0*hn/nullif(stocked+delta,0))::double precision reconciled_recovery_pct,
    hn::double precision harvest_number,hkg::double precision harvest_kg,
    (1000.0*hkg/nullif(hn,0))::double precision harvest_abw_g,feed::double precision feed_kg,
    case when missing_weight=0 and ambiguous=0 and hkg+out_kg-input_kg>0
      then (feed/(hkg+out_kg-input_kg))::double precision end efcr
  from harvest_aggregates
  where stocked>0 and hn>0 and stocked+delta-out_n-mort-hn=0
)

select jsonb_build_object(
    'batches', case when p_sections is null or 'batches' = any(p_sections) then (
      select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
      from (select * from batch_rows) as x(batch_id, batch_name, date_in, age_days, total_stocked, stock_end, abw_g, harvest_number, harvest_kg, harvest_abw_g, biomass_kg, cage_corrections, mortality, stock_loss_pct, growth_kg, feed_kg, efcr, acc_efcr)
    ) end,
    'cage_harvests', case when p_sections is null or 'cage_harvests'=any(p_sections) then
      (select coalesce(jsonb_agg(to_jsonb(r)-'scope' order by harvest_date desc,cage_name),'[]'::jsonb) from harvest_rows r where scope='cage') end,
    'batch_harvests', case when p_sections is null or 'batch_harvests'=any(p_sections) then
      (select coalesce(jsonb_agg(to_jsonb(r)-'scope' order by harvest_date desc,batch_name),'[]'::jsonb) from harvest_rows r where scope='batch') end,
    'feed_vs_expected', case when p_sections is null or 'feed_vs_expected' = any(p_sections) then (
      select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
      from (with
bounds as (
  select case when p_period_start is not null and p_period_end is not null then least(p_period_start, p_period_end) else date_trunc('month', p_month)::date end as s,
         case when p_period_start is not null and p_period_end is not null then greatest(p_period_start, p_period_end) else (date_trunc('month', p_month) + interval '1 month - 1 day')::date end as e
),
guard as (select 1 as ok where private.app_rpc_scope_ok(p_farm_id, null::bigint[], null::bigint, null::date, null::date)),
rates as (select abw_min_g, abw_max_g, (feed_rate_min_pct + feed_rate_max_pct) / 2.0 as rate_pct from public.feeding_rate_config where scenario = 'main' and is_default),
days as (select d.system_id, d.batch_id, d.inventory_date, d.number_of_fish, coalesce(d.estimated_abw_g, d.abw_last_sampling) as abw_g, coalesce(d.estimated_biomass_kg, d.biomass_last_sampling) as biomass_kg from analytics.daily_system_facts d join public.system s on s.id = d.system_id and s.farm_id = p_farm_id, bounds bd, guard where d.inventory_date between bd.s and bd.e and coalesce(d.number_of_fish, 0) > 0
  and s.is_active = true and s.cage_status::text is distinct from 'retired'
  and exists (
    select 1 from (
      select current_stock.batch_id, current_stock.number_of_fish
      from analytics.daily_system_facts current_stock
      where current_stock.system_id = d.system_id and current_stock.inventory_date <= current_date
      order by current_stock.inventory_date desc
      limit 1
    ) current_assignment
    where current_assignment.batch_id = d.batch_id and current_assignment.number_of_fish > 0
  )
  and exists (
    select 1 from public.production_cycle pc
    join public.fingerling_batch fb on fb.id = pc.batch_id
    where pc.batch_id = d.batch_id and fb.farm_id = p_farm_id
      and pc.ongoing_cycle = true and pc.cycle_start <= bd.e
  )),
expd as (
  select dy.system_id, dy.batch_id,
         sum(dy.biomass_kg * coalesce((select r.rate_pct from rates r where dy.abw_g >= r.abw_min_g and dy.abw_g < r.abw_max_g limit 1), (select r.rate_pct from rates r order by r.abw_max_g desc limit 1)) / 100.0)::double precision as expected_kg,
         (array_agg(dy.abw_g order by dy.inventory_date asc))[1] as abw_start_g,
         (array_agg(dy.abw_g order by dy.inventory_date desc))[1] as abw_end_g
  from days dy group by dy.system_id, dy.batch_id
),
fed as (select fr.system_id, fr.batch_id, sum(fr.feeding_amount)::double precision as fed_kg from public.feeding_record fr, bounds bd where fr.date between bd.s and bd.e group by fr.system_id, fr.batch_id)
select e.system_id, s.name, coalesce(nullif(fb.name, ''), 'Batch #' || e.batch_id::text), coalesce(f.fed_kg, 0), e.expected_kg, e.abw_start_g::double precision, e.abw_end_g::double precision,
  case when e.abw_start_g > 0 then ((e.abw_end_g / e.abw_start_g - 1) * 100)::double precision end,
  case when e.expected_kg > 0 then (coalesce(f.fed_kg, 0) / e.expected_kg * 100)::double precision end
from expd e join public.system s on s.id = e.system_id left join public.fingerling_batch fb on fb.id = e.batch_id left join fed f on f.system_id = e.system_id and f.batch_id = e.batch_id
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
$function$
;

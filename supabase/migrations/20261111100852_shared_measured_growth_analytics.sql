-- One source of recorded growth and matching feed for analytics consumers.
CREATE OR REPLACE FUNCTION private.analytics_measured_intervals(p_farm_id uuid,p_as_of date)
RETURNS TABLE(batch_id bigint,cycle_id bigint,system_id bigint,date date,previous_date date,
 previous_fish double precision,previous_biomass double precision,feed double precision,gain double precision)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,public,private
AS $helper$
WITH bounds AS(SELECT p_as_of AS e),
guard AS(SELECT 1 WHERE (coalesce(auth.jwt()->>'role','')='service_role'
 OR coalesce(private.is_farm_member(p_farm_id),false))
 AND private.app_rpc_scope_ok(p_farm_id,null::bigint[],null::bigint,null::date,null::date)),
b AS(SELECT fb.id AS batch_id FROM public.fingerling_batch fb,guard WHERE fb.farm_id=p_farm_id),
interval_events as materialized (
  select fs.cycle_id, fs.system_id, fs.date, 'receipt'::text as kind,
    fs.number_of_fish_stocking::double precision as fish,
    coalesce(fs.total_weight_stocking, fs.number_of_fish_stocking * fs.abw / 1000.0)::double precision as kg
  from public.fish_stocking fs join b using (batch_id)
  union all
  select t.cycle_id, leg.system_id, t.date, leg.kind,
    leg.sign * t.number_of_fish_transfer,
    coalesce(t.total_weight_transfer, t.number_of_fish_transfer * t.abw / 1000.0)
  from public.fish_transfer t join b using (batch_id)
  cross join lateral (values (t.target_system_id, 'receipt', 1), (t.origin_system_id, 'departure', -1)) leg(system_id, kind, sign)
  where leg.system_id is not null
    and t.transfer_type in ('transfer', 'grading', 'density_thinning', 'external_out')
  union all
  select h.cycle_id, h.system_id, h.date, 'departure', -h.number_of_fish_harvest, h.total_weight_harvest
  from public.fish_harvest h join b using (batch_id)
  union all
  select m.cycle_id, m.system_id, m.date, 'mortality', -m.number_of_fish_mortality, null
  from public.fish_mortality m join b using (batch_id)
  union all
  select r.cycle_id, r.system_id, r.reconciliation_date, 'reconciliation', r.fish_delta, null
  from public.fish_inventory_reconciliation r join b using (batch_id)
),
interval_days as (
  select e.cycle_id, e.system_id, e.date,
    sum(sum(e.fish)) over (partition by e.cycle_id, e.system_id order by e.date) as fish,
    min(min(e.date) filter (where e.kind = 'receipt' and e.fish > 0)) over (partition by e.cycle_id, e.system_id) as first_receipt,
    sum(e.kg) filter (where e.kind = 'receipt') as received_kg,
    sum(e.fish) filter (where e.kind = 'receipt') as received_fish,
    sum(e.kg) filter (where e.kind = 'departure') as departed_kg,
    -sum(e.fish) filter (where e.kind = 'departure') as departed_fish,
    bool_or(e.kind = 'receipt' and not coalesce(e.fish > 0 and e.kg > 0, false)) as bad_receipt,
    bool_or(e.kind = 'departure' and not coalesce(e.fish < 0 and e.kg > 0, false)) as bad_departure
  from interval_events e cross join bounds bd
  where e.cycle_id is not null and e.system_id is not null and e.date <= bd.e
  group by e.cycle_id, e.system_id, e.date
),
report_balance_events as (
  select cycle_id,system_id,date,fish from interval_events
  union all
  select t.cycle_id,leg.system_id,t.date,leg.sign*t.number_of_fish_transfer
  from public.fish_transfer t join b using(batch_id)
  cross join lateral(values(t.target_system_id,1),(t.origin_system_id,-1)) leg(system_id,sign)
  where leg.system_id is not null and
    (t.transfer_type not in ('transfer','grading','density_thinning','external_out') or t.transfer_type is null)
),
report_balance_days as (
  select cycle_id,system_id,date,sum(sum(fish)) over(partition by cycle_id,system_id order by date) as fish
  from report_balance_events cross join bounds bd where date<=bd.e group by cycle_id,system_id,date
),
efcr_samples as (
 select w.batch_id,w.cycle_id,w.system_id,w.date,
   case when bool_and(coalesce(w.abw>0 and w.number_of_fish_sampling>0,false))
     then sum(w.abw*w.number_of_fish_sampling)/nullif(sum(w.number_of_fish_sampling),0) end as abw
 from public.fish_sampling_weight w join b using(batch_id) cross join bounds bd
 where w.date<=bd.e and w.cycle_id is not null and w.system_id is not null
 group by w.batch_id,w.cycle_id,w.system_id,w.date
),
efcr_recorded_weights as (
 select batch_id,cycle_id,system_id,date,abw,3 as priority from efcr_samples
 union all
 -- Receipts establish the entire opening population only when the cage was empty.
 select pc.batch_id,i.cycle_id,i.system_id,i.date,i.received_kg*1000/nullif(i.received_fish,0),1
 from interval_days i join public.production_cycle pc using(cycle_id)
 where i.received_fish>0 and not i.bad_receipt and coalesce((
   select d.fish from report_balance_days d where d.cycle_id=i.cycle_id and d.system_id=i.system_id
     and d.date<i.date order by d.date desc limit 1),0)=0
 union all
 -- A complete, weighed departure supplies closing biomass without inferring remaining-fish ABW.
 select pc.batch_id,i.cycle_id,i.system_id,i.date,i.departed_kg*1000/nullif(i.departed_fish,0),2
 from interval_days i join public.production_cycle pc using(cycle_id)
 where i.departed_fish>0 and not i.bad_departure and (
   select d.fish from report_balance_days d where d.cycle_id=i.cycle_id and d.system_id=i.system_id
     and d.date<=i.date order by d.date desc limit 1)=0
),
efcr_measurements as (
 select distinct on(batch_id,cycle_id,system_id,date) batch_id,cycle_id,system_id,date,abw
 from efcr_recorded_weights order by batch_id,cycle_id,system_id,date,priority desc
),
efcr_points as (
 select s.*,balance.fish,balance.fish*s.abw/1000 as biomass
 from efcr_measurements s
 left join lateral (
   select fish from report_balance_days d where d.cycle_id=s.cycle_id and d.system_id=s.system_id
     and d.date<=s.date order by d.date desc limit 1
 ) balance on true
),
efcr_pairs as (
 select p.*,lag(date) over cage as previous_date,lag(fish) over cage as previous_fish,
   lag(biomass) over cage as previous_biomass
 from efcr_points p window cage as(partition by batch_id,cycle_id,system_id order by date)
),
efcr_intervals as (
 select p.batch_id,p.cycle_id,p.system_id,p.date,p.previous_date,p.previous_fish,p.previous_biomass,
   coalesce(feed.kg,0)::double precision as feed,
   (p.biomass-p.previous_biomass+coalesce(flow.kg,0))::double precision as gain
 from efcr_pairs p
 cross join lateral (
   select sum(f.feeding_amount) as kg,
     count(*) filter(where f.feeding_amount is null or f.feeding_amount<0) as issues
   from public.feeding_record f where f.batch_id=p.batch_id
     and f.cycle_id=p.cycle_id and f.system_id=p.system_id
     and f.date>=p.previous_date and f.date<p.date
 ) feed
 cross join lateral (
   select sum(case when e.kind='departure' then e.kg when e.kind='receipt' then -e.kg end) as kg,
     count(*) filter(where e.kind='reconciliation'
       or (e.kind in ('receipt','departure') and (e.kg is null or e.kg<=0))) as issues
   from interval_events e where e.cycle_id=p.cycle_id and e.system_id=p.system_id
     and e.date>p.previous_date and e.date<=p.date
 ) flow
 where p.previous_date<p.date and p.previous_fish>0 and p.fish>=0
   and p.previous_biomass is not null and p.biomass is not null
   and flow.issues=0 and feed.issues=0
   and not exists(
     select 1 from public.fish_transfer t where t.batch_id=p.batch_id
       and t.cycle_id=p.cycle_id and p.system_id in(t.origin_system_id,t.target_system_id)
       and t.date>p.previous_date and t.date<=p.date and t.transfer_type='count_check')
)
SELECT i.batch_id::bigint,i.cycle_id::bigint,i.system_id::bigint,i.date,i.previous_date,
 i.previous_fish::double precision,i.previous_biomass::double precision,i.feed::double precision,i.gain::double precision
FROM efcr_intervals i
$helper$;
REVOKE ALL ON FUNCTION private.analytics_measured_intervals(uuid,date) FROM PUBLIC,anon,authenticated;

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
measured as materialized (select * from private.analytics_measured_intervals(p_farm_id,(select e from pb))),
batch_rows as materialized (
with
bounds as (
  select case when coalesce('stock_loss_cycle'=any(p_sections),false) then '-infinity'::date when p_period_start is not null and p_period_end is not null then least(p_period_start, p_period_end) else date_trunc('month', p_month)::date end as s,
         case when p_period_start is not null and p_period_end is not null then greatest(p_period_start, p_period_end) else (date_trunc('month', p_month) + interval '1 month - 1 day')::date end as e
),
guard as (select 1 as ok where private.app_rpc_scope_ok(p_farm_id, null::bigint[], null::bigint, null::date, null::date)),
b as (select fb.id as batch_id, coalesce(nullif(fb.name, ''), 'Batch #' || fb.id::text) as batch_name from public.fingerling_batch fb, guard where fb.farm_id = p_farm_id),
stock as (select fs.batch_id, min(fs.date) as date_in, sum(fs.number_of_fish_stocking)::double precision as stocked, sum(fs.number_of_fish_stocking) filter (where fs.date >= bd.s)::double precision as stocked_m from public.fish_stocking fs join b on b.batch_id = fs.batch_id, bounds bd where fs.date <= bd.e group by fs.batch_id
 union all select fb.id, fb.mixed_on, 0::double precision, 0::double precision from public.fingerling_batch fb join b on b.batch_id = fb.id, bounds bd where fb.is_mixed and fb.mixed_on is not null and fb.mixed_on <= bd.e and not exists (select 1 from public.fish_stocking sx where sx.batch_id = fb.id)
 union all select ft.batch_id,min(ft.date),0::double precision,0::double precision
 from public.fish_transfer ft join b using(batch_id) cross join bounds bd
 where ft.date<=bd.e and ft.target_system_id is not null and ft.origin_system_id is null
 and not exists(select 1 from public.fish_stocking sx where sx.batch_id=ft.batch_id)
 and not exists(select 1 from public.fingerling_batch fb where fb.id=ft.batch_id and fb.is_mixed)
 group by ft.batch_id),
reconciled as (
select r.batch_id,sum(r.fish_delta)::double precision delta_all,
sum(r.fish_delta) filter(where r.reconciliation_date>=bd.s and coalesce(r.reason, '') not like 'mixed\_%')::double precision delta_m
from public.fish_inventory_reconciliation r join b on b.batch_id=r.batch_id cross join bounds bd
where r.reconciliation_date<=bd.e group by r.batch_id
),
net_transfer as (select ft.batch_id, sum(case when ft.target_system_id is not null then ft.number_of_fish_transfer else 0 end - case when ft.origin_system_id is not null then ft.number_of_fish_transfer else 0 end)::double precision as net_all, sum(case when ft.origin_system_id is not null and ft.target_system_id is null then ft.number_of_fish_transfer else 0 end) filter (where ft.date >= bd.s)::double precision as lost_m from public.fish_transfer ft join b on b.batch_id = ft.batch_id, bounds bd where ft.date <= bd.e group by ft.batch_id),
mort as (select fm.batch_id, sum(fm.number_of_fish_mortality)::double precision as mort_all, sum(fm.number_of_fish_mortality) filter (where fm.date >= bd.s)::double precision as mort_m from public.fish_mortality fm join b on b.batch_id = fm.batch_id, bounds bd where fm.date <= bd.e group by fm.batch_id),
harv as (select fh.batch_id, sum(fh.number_of_fish_harvest)::double precision as harv_all, sum(fh.number_of_fish_harvest) filter (where fh.date >= bd.s)::double precision as harv_n_m, sum(fh.total_weight_harvest) filter (where fh.date >= bd.s)::double precision as harv_kg_m from public.fish_harvest fh join b on b.batch_id = fh.batch_id, bounds bd where fh.date <= bd.e group by fh.batch_id),
feed_m as (select fr.batch_id, sum(fr.feeding_amount)::double precision as feed_m from public.feeding_record fr join b on b.batch_id = fr.batch_id, bounds bd where fr.date between bd.s and bd.e group by fr.batch_id),
interval_events as materialized (
  select fs.cycle_id, fs.system_id, fs.date, 'receipt'::text as kind,
    fs.number_of_fish_stocking::double precision as fish,
    coalesce(fs.total_weight_stocking, fs.number_of_fish_stocking * fs.abw / 1000.0)::double precision as kg
  from public.fish_stocking fs join b using (batch_id)
  union all
  select t.cycle_id, leg.system_id, t.date, leg.kind,
    leg.sign * t.number_of_fish_transfer,
    coalesce(t.total_weight_transfer, t.number_of_fish_transfer * t.abw / 1000.0)
  from public.fish_transfer t join b using (batch_id)
  cross join lateral (values (t.target_system_id, 'receipt', 1), (t.origin_system_id, 'departure', -1)) leg(system_id, kind, sign)
  where leg.system_id is not null
    and t.transfer_type in ('transfer', 'grading', 'density_thinning', 'external_out')
  union all
  select h.cycle_id, h.system_id, h.date, 'departure', -h.number_of_fish_harvest, h.total_weight_harvest
  from public.fish_harvest h join b using (batch_id)
  union all
  select m.cycle_id, m.system_id, m.date, 'mortality', -m.number_of_fish_mortality, null
  from public.fish_mortality m join b using (batch_id)
  union all
  select r.cycle_id, r.system_id, r.reconciliation_date, 'reconciliation', r.fish_delta, null
  from public.fish_inventory_reconciliation r join b using (batch_id)
),
interval_days as (
  select e.cycle_id, e.system_id, e.date,
    sum(sum(e.fish)) over (partition by e.cycle_id, e.system_id order by e.date) as fish,
    min(min(e.date) filter (where e.kind = 'receipt' and e.fish > 0)) over (partition by e.cycle_id, e.system_id) as first_receipt,
    sum(e.kg) filter (where e.kind = 'receipt') as received_kg,
    sum(e.fish) filter (where e.kind = 'receipt') as received_fish,
    sum(e.kg) filter (where e.kind = 'departure') as departed_kg,
    -sum(e.fish) filter (where e.kind = 'departure') as departed_fish,
    bool_or(e.kind = 'receipt' and not coalesce(e.fish > 0 and e.kg > 0, false)) as bad_receipt,
    bool_or(e.kind = 'departure' and not coalesce(e.fish < 0 and e.kg > 0, false)) as bad_departure
  from interval_events e cross join bounds bd
  where e.cycle_id is not null and e.system_id is not null and e.date <= bd.e
  group by e.cycle_id, e.system_id, e.date
),
interval_observations as (
  select cycle_id, system_id, date, received_kg * 1000 / nullif(received_fish, 0) as abw, 1 as priority
  from interval_days opening
  where date = first_receipt and not bad_receipt
    and coalesce((
      select prior.fish from interval_days prior
      where prior.cycle_id = opening.cycle_id and prior.system_id = opening.system_id and prior.date < opening.date
      order by prior.date desc limit 1
    ), 0) = 0
  union all
  select w.cycle_id, w.system_id, w.date,
    sum(w.number_of_fish_sampling * w.abw) / nullif(sum(w.number_of_fish_sampling), 0), 3
  from public.fish_sampling_weight w join b using (batch_id) cross join bounds bd
  where w.date <= bd.e and w.cycle_id is not null and w.system_id is not null
  group by w.cycle_id, w.system_id, w.date
  union all
  select cycle_id, system_id, date, departed_kg * 1000 / nullif(departed_fish, 0), 4
  from interval_days where date > first_receipt and fish = 0 and departed_fish > 0 and not bad_departure
),
abw_anchor as (select pc.batch_id, coalesce(max(x.date) filter (where x.activity = 'sampling'), max(x.date) filter (where x.activity = 'stocking')) as anchor_date, (max(x.date) filter (where x.activity = 'sampling')) is not null as has_sampling from analytics.production_summary x join public.production_cycle pc on pc.cycle_id = x.cycle_id join b on b.batch_id = pc.batch_id, bounds bd where x.date <= bd.e group by pc.batch_id),
abw as (select a.batch_id, (sum(x.average_body_weight * coalesce(x.number_of_fish_end, 0)) / nullif(sum(coalesce(x.number_of_fish_end, 0)), 0))::double precision as abw_g from abw_anchor a join public.production_cycle pc on pc.batch_id = a.batch_id join analytics.production_summary x on x.cycle_id = pc.cycle_id and x.date = a.anchor_date and x.activity = (case when a.has_sampling then 'sampling' else 'stocking' end) group by a.batch_id),
monthly_batch_ids as (
  select pc.batch_id from public.production_cycle pc join b on b.batch_id = pc.batch_id cross join bounds bd
  where pc.cycle_start <= bd.e and (pc.cycle_end is null or pc.cycle_end >= bd.s)
  union select fs.batch_id from public.fish_stocking fs join b on b.batch_id = fs.batch_id cross join bounds bd where fs.date between bd.s and bd.e
  union select ft.batch_id from public.fish_transfer ft join b on b.batch_id = ft.batch_id cross join bounds bd where ft.date between bd.s and bd.e
  union select r.batch_id from public.fish_inventory_reconciliation r join b on b.batch_id = r.batch_id cross join bounds bd where r.reconciliation_date between bd.s and bd.e
  union select batch_id from mort where mort_m is not null
  union select batch_id from harv where harv_n_m is not null or harv_kg_m is not null
  union select batch_id from feed_m
  union select w.batch_id from public.fish_sampling_weight w join b using(batch_id) cross join bounds bd where w.date between bd.s and bd.e
),
base as (select b.batch_id, b.batch_name, st.batch_id is not null as has_stock_record, st.date_in, st.stocked, st.stocked_m, case when coalesce(st.stocked,0)+coalesce(nt.net_all,0)+coalesce(rc.delta_all,0)-coalesce(m.mort_all,0)-coalesce(h.harv_all,0)>=0 then coalesce(st.stocked,0)+coalesce(nt.net_all,0)+coalesce(rc.delta_all,0)-coalesce(m.mort_all,0)-coalesce(h.harv_all,0) end as stock_end, coalesce(m.mort_m, 0) as mort_m, (coalesce(nt.lost_m, 0) - coalesce(rc.delta_m,0)) as lost_m, coalesce(h.harv_n_m, 0) as harv_n_m, coalesce(h.harv_kg_m, 0) as harv_kg_m, ab.abw_g, fm.feed_m from b left join stock st on st.batch_id = b.batch_id left join reconciled rc on rc.batch_id=b.batch_id left join net_transfer nt on nt.batch_id = b.batch_id left join mort m on m.batch_id = b.batch_id left join harv h on h.batch_id = b.batch_id left join abw ab on ab.batch_id = b.batch_id left join feed_m fm on fm.batch_id = b.batch_id),
loss_events as (
  select fs.batch_id, fs.date, fs.number_of_fish_stocking::double precision as delta, 0::double precision as losses, false as ambiguous
    from public.fish_stocking fs join b using (batch_id)
  union all select fm.batch_id, fm.date, -fm.number_of_fish_mortality, fm.number_of_fish_mortality, false
    from public.fish_mortality fm join b using (batch_id)
  union all select h.batch_id, h.date, -h.number_of_fish_harvest, 0, false
    from public.fish_harvest h join b using (batch_id)
  union all select r.batch_id, r.reconciliation_date, r.fish_delta, 0, false
    from public.fish_inventory_reconciliation r join b using (batch_id)
  union all select t.batch_id, t.date,
    case when t.target_system_id is not null then t.number_of_fish_transfer else 0 end
      - case when t.origin_system_id is not null then t.number_of_fish_transfer else 0 end,
    case when t.transfer_type = 'external_out' and t.origin_system_id is not null then t.number_of_fish_transfer else 0 end,
    coalesce(t.transfer_type = 'count_check' and t.origin_system_id is not null and t.target_system_id is not null, false)
    from public.fish_transfer t join b using (batch_id)
    where t.origin_system_id is distinct from t.target_system_id
),
cycle_receipts as (
  select fs.batch_id, fs.date, fs.number_of_fish_stocking::double precision as fish
  from public.fish_stocking fs join b using (batch_id)
  union all
  select t.batch_id, t.date, t.number_of_fish_transfer
  from public.fish_transfer t join b using (batch_id)
  where t.origin_system_id is null and t.target_system_id is not null and t.transfer_type <> 'count_check'
  union all
  select r.batch_id, r.reconciliation_date, r.fish_delta
  from public.fish_inventory_reconciliation r join b using (batch_id)
  where r.reason = 'mixed_from_source_batch' and r.fish_delta > 0
),
loss_components as (
  select m.batch_id, m.date, m.number_of_fish_mortality::double precision as mortality,
    0::double precision as adjustment, 0::double precision as harvest
  from public.fish_mortality m join b using (batch_id)
  union all
  select r.batch_id, r.reconciliation_date,
    case when r.reason = 'discarded_fish' then -r.fish_delta else 0 end,
    case when r.reason = 'discarded_fish' or coalesce(r.notes, '') like 'Auto-reconciled at final harvest%' then 0 else -r.fish_delta end,
    case when coalesce(r.notes, '') like 'Auto-reconciled at final harvest%' then -r.fish_delta else 0 end
  from public.fish_inventory_reconciliation r join b using (batch_id)
  where left(coalesce(r.reason, ''), 6) <> 'mixed_'
  union all
  select t.batch_id, t.date, 0,
    case when t.origin_system_id is not null then t.number_of_fish_transfer else -t.number_of_fish_transfer end, 0
  from public.fish_transfer t join b using (batch_id)
  where (t.transfer_type = 'external_out' and t.origin_system_id is not null and t.target_system_id is null)
    or (t.transfer_type = 'count_check' and ((t.origin_system_id is null) <> (t.target_system_id is null)))
),
stock_loss_balances as (
  select le.batch_id,
    (select sum(cr.fish) from cycle_receipts cr where cr.batch_id=le.batch_id and cr.date<=bd.e) as opening_fish,
    bool_or(le.ambiguous) as ambiguous
  from loss_events le cross join bounds bd
  where le.date <= bd.e
  group by le.batch_id, bd.s, bd.e
),
stock_loss as (
  select balance.batch_id, balance.opening_fish,
    coalesce(c.mortality,0)+greatest(coalesce(c.adjustment,0)+coalesce(c.harvest,0),0) as lost_fish,
    coalesce(c.mortality, 0) as mortality_fish, coalesce(c.adjustment, 0) as adjustment_fish,
    coalesce(c.harvest, 0) as harvest_fish
  from stock_loss_balances balance cross join bounds bd
  cross join lateral (
    select sum(lc.mortality) as mortality, sum(lc.adjustment) as adjustment, sum(lc.harvest) as harvest
    from loss_components lc where lc.batch_id = balance.batch_id and lc.date <= bd.e
  ) c
  where balance.opening_fish > 0 and not balance.ambiguous
),
chart_stock_loss as (
  -- Every monthly chart is a cumulative snapshot, independent of the table's period metrics.
  select received.batch_id, received.population,
    coalesce(losses.mortality, 0) as mortality_fish,
    coalesce(losses.adjustment, 0) as adjustment_fish,
    coalesce(losses.harvest, 0) as harvest_fish
  from (
    select cr.batch_id, sum(cr.fish) as population
    from cycle_receipts cr cross join bounds bd where cr.date <= bd.e
    group by cr.batch_id having sum(cr.fish) > 0
  ) received
  cross join bounds bd
  cross join lateral (
    select sum(greatest(lc.mortality, 0)) as mortality,
      sum(greatest(lc.adjustment, 0)) as adjustment,
      sum(greatest(lc.harvest, 0)) as harvest
    from loss_components lc where lc.batch_id = received.batch_id and lc.date <= bd.e
  ) losses
),

-- Calendar-period biomass accounting, separate from verified-interval growth charts.
report_balance_events as (
  select cycle_id,system_id,date,fish from interval_events
  union all
  select t.cycle_id,leg.system_id,t.date,leg.sign*t.number_of_fish_transfer
  from public.fish_transfer t join b using(batch_id)
  cross join lateral(values(t.target_system_id,1),(t.origin_system_id,-1)) leg(system_id,sign)
  where leg.system_id is not null and
    (t.transfer_type not in ('transfer','grading','density_thinning','external_out') or t.transfer_type is null)
),
report_balance_days as (
  select cycle_id,system_id,date,sum(sum(fish)) over(partition by cycle_id,system_id order by date) as fish
  from report_balance_events cross join bounds bd where date<=bd.e group by cycle_id,system_id,date
),
report_cages as (
  select distinct pc.batch_id, ev.cycle_id, ev.system_id
  from report_balance_events ev join public.production_cycle pc using(cycle_id)
  cross join bounds bd where ev.date <= bd.e
),
report_weights as (
  select cycle_id, system_id, date, abw, priority from interval_observations
  union all
  select cycle_id, system_id, date, received_kg * 1000 / nullif(received_fish,0), 1
  from interval_days where received_fish > 0 and not bad_receipt
),
report_snapshots as (
  select c.batch_id, cutoff.kind, sum(coalesce(balance.fish,0)) as fish,
    case when bool_and(coalesce(balance.fish,0) >= 0 and
      (coalesce(balance.fish,0)=0 or coalesce(w.abw > 0,false)))
      then sum(case when coalesce(balance.fish,0)=0 then 0 else balance.fish*w.abw/1000 end)
    end as biomass
  from report_cages c cross join bounds bd
  cross join lateral (values ('closing',bd.e)) cutoff(kind,day)
  left join lateral (
    select fish from report_balance_days i where i.cycle_id=c.cycle_id and i.system_id=c.system_id
    and i.date<=cutoff.day order by i.date desc limit 1
  ) balance on true
  left join lateral (
    select abw from report_weights w where w.cycle_id=c.cycle_id and w.system_id=c.system_id
    and w.date<=cutoff.day and w.abw>0 order by w.date desc,w.priority desc limit 1
  ) w on true
  group by c.batch_id, cutoff.kind
),
report_feed as (
  select fr.batch_id,
    case when bool_and(fr.feeding_amount>=0) then sum(fr.feeding_amount) end as all_feed,
    case when bool_and(fr.feeding_amount>=0) filter(where coalesce('stock_loss_cycle'=any(p_sections),false) or fr.date>=bd.s)
      then sum(fr.feeding_amount) filter(where coalesce('stock_loss_cycle'=any(p_sections),false) or fr.date>=bd.s)
      when count(*) filter(where coalesce('stock_loss_cycle'=any(p_sections),false) or fr.date>=bd.s)=0 then 0 end as period_feed
  from public.feeding_record fr join b using(batch_id) cross join bounds bd
  where fr.date<=bd.e group by fr.batch_id
),
report_metrics as (
  select b.batch_id, closing.biomass,
    closing.biomass*1000/nullif(closing.fish,0) as abw,
    case when rf.batch_id is null then 0 else rf.period_feed end as feed
  from b left join report_snapshots closing on closing.batch_id=b.batch_id and closing.kind='closing'
  left join report_feed rf on rf.batch_id=b.batch_id
),

-- eFCR uses recorded stocking/transfer/sampling weights; inferred mix weights are excluded.
-- Feed days are [opening measurement, closing measurement); movements are (opening, closing].
efcr_intervals as (select * from measured),
efcr_metrics as (
 select i.batch_id,
   sum(i.feed) filter(where i.date>=bd.s) as period_feed,
   sum(i.gain) filter(where i.date>=bd.s) as period_gain,
   sum(i.feed) as all_feed,sum(i.gain) as all_gain,
   sum(projected.gain) filter(where i.date>=bd.s) as expected_gain
 from efcr_intervals i cross join bounds bd
 left join public.growth_model_scenario model on model.scenario=lower(coalesce(p_scenario,'main'))
   and (p_sections is null or 'growth_by_batch'=any(p_sections))
 cross join lateral(select i.previous_biomass*1000/nullif(i.previous_fish,0) as abw) opening
 cross join lateral(select case when model.scenario is not null then i.previous_fish/1000*greatest(0,
   model.richards_a/power(1+(
     power(model.richards_a/least(greatest(opening.abw,1),model.richards_a*0.999999),model.richards_nu)-1
   )*exp(-model.richards_k*case when opening.abw>=model.richards_a*0.999999 then 1
     else i.date-i.previous_date end),1.0/model.richards_nu)-opening.abw) end as gain) projected
 group by i.batch_id
),
result as (
  select base.batch_id, base.batch_name, base.date_in, ((select e from bounds) - base.date_in)::integer as age_days, base.stocked as total_stocked, base.stock_end, rm.abw::double precision as abw_g,
    base.harv_n_m as harvest_number, base.harv_kg_m as harvest_kg,
    case when base.harv_n_m > 0 then (base.harv_kg_m / base.harv_n_m * 1000)::double precision end as harvest_abw_g,
    rm.biomass::double precision as biomass_kg,
    (-base.lost_m)::double precision as cage_corrections, base.mort_m as mortality,
    (sl.opening_fish - least(coalesce(sl.adjustment_fish,0)+coalesce(sl.harvest_fish,0),0)) as opening_n,
    greatest(sl.lost_fish,0) as lost_fish,
    csl.population as chart_population,
    (100.0 * (csl.mortality_fish + csl.adjustment_fish + csl.harvest_fish) / csl.population)::double precision as stock_loss_chart_pct,
    (100.0 * csl.mortality_fish / csl.population)::double precision as stock_loss_mortality_pct,
    (100.0 * csl.adjustment_fish / csl.population)::double precision as stock_loss_adjustment_pct,
    (100.0 * csl.harvest_fish / csl.population)::double precision as stock_loss_harvest_pct,
    em.period_gain::double precision as growth_kg,
rm.feed::double precision as feed_kg,
em.period_feed::double precision as feed_ps_m,
em.all_feed::double precision as feed_ps_all,
em.all_gain::double precision as growth_all,
em.period_gain::double precision as efcr_growth,
em.period_gain as chart_recorded_kg, em.expected_gain as interval_expected_kg
  from base left join report_metrics rm on rm.batch_id=base.batch_id
    left join efcr_metrics em on em.batch_id=base.batch_id left join stock_loss sl on sl.batch_id = base.batch_id
    left join chart_stock_loss csl on csl.batch_id = base.batch_id
  where base.batch_name !~* '^(BATCH-|INFERRED-)'
    and base.has_stock_record
    and (coalesce('stock_loss_cycle'=any(p_sections),false)
      or exists(select 1 from monthly_batch_ids m where m.batch_id=base.batch_id))
),
rows_out as (
  select r.batch_id, r.batch_name, r.date_in, r.age_days, r.total_stocked, r.stock_end, r.abw_g, r.harvest_number, r.harvest_kg, r.harvest_abw_g, r.biomass_kg, r.cage_corrections, r.mortality,
         case when r.opening_n > 0 then (r.lost_fish / r.opening_n * 100)::double precision end as stock_loss_pct,
         r.growth_kg, r.feed_kg,
         case when r.efcr_growth > 0 and r.feed_ps_m >= 0 then (r.feed_ps_m / r.efcr_growth)::double precision end as efcr,
         case when r.growth_all > 0 and r.feed_ps_all >= 0 then (r.feed_ps_all / r.growth_all)::double precision end as acc_efcr,
         r.chart_recorded_kg, r.interval_expected_kg,
         r.stock_loss_mortality_pct, r.stock_loss_adjustment_pct, r.stock_loss_harvest_pct, r.stock_loss_chart_pct,
         r.feed_ps_m as efcr_feed_kg,r.efcr_growth as efcr_growth_kg,
         r.feed_ps_all as acc_efcr_feed_kg,r.growth_all as acc_efcr_growth_kg
  from result r
),
total_row as (
  select null::bigint, 'Total'::text, null::date, null::integer, sum(r.total_stocked), sum(r.stock_end),
         case when bool_and(r.biomass_kg is not null) and sum(r.stock_end) > 0 then (sum(r.biomass_kg) / sum(r.stock_end) * 1000)::double precision end,
         sum(r.harvest_number), sum(r.harvest_kg),
         case when sum(r.harvest_number) > 0 then (sum(r.harvest_kg) / sum(r.harvest_number) * 1000)::double precision end,
         case when bool_and(r.biomass_kg is not null) then sum(r.biomass_kg) end, sum(r.cage_corrections), sum(r.mortality),
         case when sum(r.opening_n) > 0 then (sum(r.lost_fish) / sum(r.opening_n) * 100)::double precision end,
         sum(r.growth_kg), case when bool_and(r.feed_kg is not null) then sum(r.feed_kg) end,
         case when sum(r.efcr_growth)>0 then (sum(r.feed_ps_m)/sum(r.efcr_growth))::double precision end,
         case when sum(r.growth_all)>0 then (sum(r.feed_ps_all)/sum(r.growth_all))::double precision end, null::double precision as chart_recorded_kg, null::double precision as interval_expected_kg,
    (sum(r.stock_loss_mortality_pct * r.chart_population) / nullif(sum(r.chart_population), 0))::double precision,
    (sum(r.stock_loss_adjustment_pct * r.chart_population) / nullif(sum(r.chart_population), 0))::double precision,
    (sum(r.stock_loss_harvest_pct * r.chart_population) / nullif(sum(r.chart_population), 0))::double precision,
    (sum(r.stock_loss_chart_pct * r.chart_population) / nullif(sum(r.chart_population), 0))::double precision,
    sum(r.feed_ps_m),sum(r.efcr_growth),sum(r.feed_ps_all),sum(r.growth_all)
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
  select r.batch_id, r.batch_name, r.date_in, r.stock_end, r.chart_recorded_kg, r.interval_expected_kg, coalesce((select min(rf.day) from ref rf where rf.abw >= s.abw0), 0) as age0
  from batch_rows r left join stk s on s.batch_id = r.batch_id where r.batch_id is not null
    and r.batch_name !~* '^(BATCH-|INFERRED-)'

),
gb as (
  select b.batch_id, b.batch_name, b.date_in,
         b.chart_recorded_kg as gain_recorded_kg, b.interval_expected_kg as gain_expected_kg
  from batch_age b order by b.date_in desc, b.batch_name
),
sample_abw_by_date as (
  select s.batch_id, s.date,
         1000.0 * sum(s.total_weight_sampling) / sum(s.number_of_fish_sampling) as abw_g
  from public.fish_sampling_weight s
  join batch_age b on b.batch_id = s.batch_id
  where s.date between b.date_in and (select e from pb)
    and s.number_of_fish_sampling > 0
    and s.total_weight_sampling > 0
  group by s.batch_id, s.date
),
opening_abw_by_date as (
  select b.batch_id, b.date_in as date,
         1000.0 * sum(coalesce(s.total_weight_stocking, s.number_of_fish_stocking * s.abw / 1000.0))
           / nullif(sum(s.number_of_fish_stocking), 0) as abw_g
  from batch_age b
  join public.fish_stocking s on s.batch_id = b.batch_id and s.date = b.date_in
  where s.number_of_fish_stocking > 0
    and coalesce(s.total_weight_stocking, s.number_of_fish_stocking * s.abw / 1000.0) > 0
  group by b.batch_id, b.date_in
),
summary_pts as (
  select pc.batch_id, x.date,
         coalesce(sum(x.average_body_weight * coalesce(x.number_of_fish_end, 0)) / nullif(sum(coalesce(x.number_of_fish_end, 0)), 0), avg(x.average_body_weight))::double precision as abw_g
  from analytics.production_summary x join public.production_cycle pc on pc.cycle_id = x.cycle_id
  where pc.batch_id in (select r.batch_id from batch_rows r where r.batch_id is not null) and x.date <= (select e from pb) and x.activity = 'sampling' and x.average_body_weight > 0
  group by pc.batch_id, x.date
),
pts as (
  select batch_id, date, coalesce(sample.abw_g, summary.abw_g, opening.abw_g) as abw_g
  from sample_abw_by_date sample
  full join summary_pts summary using (batch_id, date)
  full join opening_abw_by_date opening using (batch_id, date)
),
abw_pts as (
  select b.batch_id, b.batch_name, p.date, (p.date - b.date_in)::integer as age_days, (b.age0 + (p.date - b.date_in))::integer as model_age_days, p.abw_g
  from pts p join batch_age b on b.batch_id = p.batch_id where p.date >= b.date_in and (coalesce('abw_history' = any(p_sections), false) or not coalesce('growth_custom' = any(p_sections), false) or p.date >= (select s from pb))
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
    st.missing_weight+tr.missing_weight missing_weight,(tr.delta+rc.delta) as delta,tr.ambiguous,
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
  cross join lateral (
    select coalesce(sum(r.fish_delta),0) delta from public.fish_inventory_reconciliation r
    where r.cycle_id=hs.cycle_id and r.batch_id=hs.batch_id
      and (hs.system_id is null or r.system_id=hs.system_id)
      and r.reconciliation_date between pc.cycle_start and hs.harvest_date
  ) rc
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
    (1000.0*hkg/nullif(hn,0))::double precision harvest_abw_g,ha.feed::double precision feed_kg,
    case when sampled.gain>0 then sampled.feed/sampled.gain end efcr
  from harvest_aggregates ha
  cross join lateral (
    select sum(i.feed) as feed,sum(i.gain) as gain from measured i
    where i.batch_id=ha.batch_id and i.cycle_id=ha.cycle_id
      and (ha.system_id is null or i.system_id=ha.system_id)
      and i.date<=ha.harvest_date
  ) sampled
  where stocked>0 and hn>0 and stocked+delta-out_n-mort-hn=0
)

select jsonb_build_object(
    'measured_intervals',case when 'measured_intervals'=any(p_sections) then (
      select coalesce(jsonb_agg(to_jsonb(i)),'[]'::jsonb) from measured i cross join pb where i.date between pb.s and pb.e
    ) end,
    'batches', case when p_sections is null or 'batches' = any(p_sections) then (
      select coalesce(jsonb_agg(to_jsonb(x) - 'interval_expected_kg' - 'chart_recorded_kg'), '[]'::jsonb)
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
    select 1 from analytics.daily_system_facts current_stock
    where current_stock.system_id = d.system_id
      and coalesce(current_stock.number_of_fish, 0) > 0
      and current_stock.inventory_date = (
        select max(latest.inventory_date) from analytics.daily_system_facts latest
        where latest.system_id = d.system_id and latest.inventory_date <= current_date
      )
      and (
        current_stock.batch_id = d.batch_id
        or exists (
          select 1 from public.production_cycle cage_cycle
          where cage_cycle.system_id = d.system_id and cage_cycle.batch_id = d.batch_id and cage_cycle.ongoing_cycle = true
        )
      )
  )
  and exists (
    select 1 from public.production_cycle pc
    join public.fingerling_batch fb on fb.id = pc.batch_id
    where pc.batch_id = d.batch_id and fb.farm_id = p_farm_id
      and pc.ongoing_cycle = true and pc.cycle_start <= bd.e
  )),
daily as (
  select dy.system_id, dy.inventory_date,
         sum(dy.biomass_kg * coalesce((select r.rate_pct from rates r where dy.abw_g >= r.abw_min_g and dy.abw_g < r.abw_max_g limit 1), (select r.rate_pct from rates r order by r.abw_max_g desc limit 1)) / 100.0)::double precision as expected_kg,
         (sum(dy.abw_g * dy.number_of_fish) filter (where dy.abw_g is not null) / nullif(sum(dy.number_of_fish) filter (where dy.abw_g is not null), 0))::double precision as abw_g
  from days dy group by dy.system_id, dy.inventory_date
),
expd as (
  select dd.system_id, sum(dd.expected_kg)::double precision as expected_kg,
         (array_agg(dd.abw_g order by dd.inventory_date asc))[1] as abw_start_g,
         (array_agg(dd.abw_g order by dd.inventory_date desc))[1] as abw_end_g
  from daily dd group by dd.system_id
),
cage_batches as (
  select dy.system_id, dy.batch_id from days dy
  union
  select pc.system_id, pc.batch_id from public.production_cycle pc where pc.ongoing_cycle = true and pc.system_id in (select dy.system_id from days dy)
),
cage_batch_names as (
  select cb.system_id, string_agg(coalesce(nullif(fb.name, ''), 'Batch #' || cb.batch_id::text), ', ' order by fb.date_of_delivery, cb.batch_id) as names
  from cage_batches cb left join public.fingerling_batch fb on fb.id = cb.batch_id group by cb.system_id
),
fed as (select fr.system_id, sum(fr.feeding_amount)::double precision as fed_kg from public.feeding_record fr join cage_batches cb on cb.system_id = fr.system_id and cb.batch_id = fr.batch_id, bounds bd where fr.date between bd.s and bd.e group by fr.system_id)
select e.system_id, s.name, bn.names, coalesce(f.fed_kg, 0), e.expected_kg, e.abw_start_g::double precision, e.abw_end_g::double precision,
  case when e.abw_start_g > 0 then ((e.abw_end_g / e.abw_start_g - 1) * 100)::double precision end,
  case when e.expected_kg > 0 then (coalesce(f.fed_kg, 0) / e.expected_kg * 100)::double precision end
from expd e join public.system s on s.id = e.system_id left join cage_batch_names bn on bn.system_id = e.system_id left join fed f on f.system_id = e.system_id
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
) where coalesce(auth.jwt()->>'role','')='service_role'
  or coalesce(private.is_farm_member(p_farm_id),false);
$function$;

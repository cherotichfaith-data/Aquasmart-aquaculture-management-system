-- Use cage-level observed intervals for Batch Performance only.
-- Closing observations require a weighed departure and a zero ledger balance.
-- Feed uses [opening, closing); biomass movements use (opening, closing].
do $migration$
declare
  definition text := pg_get_functiondef(
    'public.api_analytics_performance(uuid,date,date,date,text[],text)'::regprocedure
  );
  legacy_intervals constant text := $before$ps as (select e.batch_id, sum(e.fa) - coalesce(sum(s.fa), 0) as feed_ps_m,
  case when bool_or(e.da is null) or bool_or(s.cycle_id is not null and s.da is null) then null::double precision else sum(e.da) - coalesce(sum(s.da), 0) end as growth_m,
  sum(e.fa)::double precision as feed_ps_all,
  case when bool_or(e.da is null) then null::double precision else sum(e.da)::double precision end as growth_all
  from (select distinct on (x.cycle_id) pc.batch_id, x.cycle_id, x.feed_aggregated as fa, x.feed_aggregated / nullif(x.efcr_aggregated, 0) as da
          from analytics.production_summary x join public.production_cycle pc on pc.cycle_id = x.cycle_id join b on b.batch_id = pc.batch_id, bounds bd
          where x.date <= bd.e and x.activity <> 'current' order by x.cycle_id, x.date desc) e
  left join (select distinct on (x.cycle_id) x.cycle_id, x.feed_aggregated as fa, case when x.feed_aggregated = 0 then 0::double precision else x.feed_aggregated / nullif(x.efcr_aggregated, 0) end as da
          from analytics.production_summary x join public.production_cycle pc on pc.cycle_id = x.cycle_id join b on b.batch_id = pc.batch_id, bounds bd
          where x.date < bd.s and x.activity <> 'current' order by x.cycle_id, x.date desc) s on s.cycle_id = e.cycle_id
  group by e.batch_id),
$before$;
  verified_intervals constant text := $after$interval_events as materialized (
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
interval_weights as (
  select distinct on (o.cycle_id, o.system_id, o.date) o.cycle_id, o.system_id, o.date,
    balance.fish, balance.fish * o.abw / 1000 as biomass
  from interval_observations o
  left join lateral (
    select d.fish from interval_days d
    where d.cycle_id = o.cycle_id and d.system_id = o.system_id and d.date <= o.date
    order by d.date desc limit 1
  ) balance on true
  where o.abw > 0
  order by o.cycle_id, o.system_id, o.date, o.priority desc
),
interval_pairs as (
  select w.*, lag(w.date) over cage as previous_date,
    lag(w.fish) over cage as previous_fish, lag(w.biomass) over cage as previous_biomass
  from interval_weights w window cage as (partition by w.cycle_id, w.system_id order by w.date)
),
verified_intervals as (
  select pc.batch_id, p.date, coalesce(feed.kg, 0) as feed,
    greatest(p.biomass - p.previous_biomass + coalesce(flow.net_kg, 0), 0) as gain
  from interval_pairs p join public.production_cycle pc using (cycle_id)
  join b on b.batch_id = pc.batch_id
  cross join lateral (
    select sum(f.feeding_amount) as kg
    from public.feeding_record f
    where f.cycle_id = p.cycle_id and f.system_id = p.system_id
      and f.date >= p.previous_date and f.date < p.date
  ) feed
  cross join lateral (
    select sum(case when e.kind = 'departure' then e.kg when e.kind = 'receipt' then -e.kg end) as net_kg,
      count(*) filter (where e.kind = 'reconciliation'
        or (e.kind in ('receipt', 'departure') and not coalesce(e.kg > 0, false))) as issues
    from interval_events e
    where e.cycle_id = p.cycle_id and e.system_id = p.system_id and e.date > p.previous_date and e.date <= p.date
  ) flow
  where p.previous_date < p.date and p.previous_fish >= 0 and p.fish >= 0
    and flow.issues = 0 and coalesce(feed.kg, 0) >= 0
),
ps as (
  select i.batch_id, sum(i.feed) filter (where i.date >= bd.s) as feed_ps_m,
    sum(i.gain) filter (where i.date >= bd.s) as growth_m,
    sum(i.feed) as feed_ps_all, sum(i.gain) as growth_all
  from verified_intervals i cross join bounds bd group by i.batch_id
),
$after$;
begin
  if strpos(definition, 'interval_events as materialized (') > 0 then
    return;
  end if;
  if strpos(definition, legacy_intervals) = 0
      or strpos(definition, 'coalesce(base.feed_m,base.feed_ps_m) as feed_kg') = 0 then
    raise exception 'Expected Batch Performance growth and feed definition was not found';
  end if;
  definition := replace(definition, legacy_intervals, verified_intervals);
  definition := replace(definition, 'coalesce(base.feed_m,base.feed_ps_m) as feed_kg',
    'coalesce(base.feed_m, 0) as feed_kg');
  execute definition;
end;
$migration$;

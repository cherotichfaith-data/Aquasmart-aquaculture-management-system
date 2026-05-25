-- Daily facts are system-day inventory facts, but their production_cycle_id must
-- follow the stocked batch lineage. Use the same resolver used by operation
-- triggers so transferred batches keep the original cycle id in analytics.

drop materialized view if exists analytics.efcr_period_last_sampling_view;

create or replace view analytics.daily_system_facts as
with activity_union as (
  select system_id, date from public.fish_stocking
  union all select system_id, date from public.feeding_record
  union all select system_id, date from public.fish_mortality
  union all select system_id, date from public.fish_sampling_weight
  union all select system_id, date from public.fish_harvest
  union all select target_system_id as system_id, date from public.fish_transfer where target_system_id is not null
  union all select origin_system_id as system_id, date from public.fish_transfer where origin_system_id is not null
),
system_bounds as (
  select
    s.id as system_id,
    s.farm_id,
    s.name as system_name,
    s.growth_stage::text as growth_stage,
    s.is_active as system_is_active,
    coalesce(min(au.date), s.commissioned_at, current_date) as start_date,
    greatest(
      coalesce(max(au.date), s.decommissioned_at, s.commissioned_at, current_date),
      coalesce(s.decommissioned_at, max(au.date), s.commissioned_at, current_date)
    ) as end_date
  from public.system s
  left join activity_union au on au.system_id = s.id
  where s.farm_id is not null
  group by s.id, s.farm_id, s.name, s.growth_stage, s.is_active, s.commissioned_at, s.decommissioned_at
),
date_spine as (
  select
    sb.system_id,
    sb.farm_id,
    sb.system_name,
    sb.growth_stage,
    sb.system_is_active,
    gs::date as inventory_date
  from system_bounds sb
  cross join lateral generate_series(sb.start_date::timestamp, sb.end_date::timestamp, interval '1 day') gs
),
daily_stocked as (
  select system_id, date as inventory_date,
    sum(number_of_fish_stocking)::double precision as qty_stocked
  from public.fish_stocking
  group by system_id, date
),
daily_mortality as (
  select system_id, date as inventory_date,
    sum(number_of_fish_mortality)::double precision as qty_mortality
  from public.fish_mortality
  group by system_id, date
),
daily_transfer_in as (
  select target_system_id as system_id, date as inventory_date,
    sum(number_of_fish_transfer)::double precision as qty_transfer_in
  from public.fish_transfer
  where target_system_id is not null
  group by target_system_id, date
),
daily_transfer_out as (
  select origin_system_id as system_id, date as inventory_date,
    sum(number_of_fish_transfer)::double precision as qty_transfer_out
  from public.fish_transfer
  where origin_system_id is not null
  group by origin_system_id, date
),
daily_harvest as (
  select system_id, date as inventory_date,
    sum(coalesce(number_of_fish_harvest, 0))::double precision as qty_harvest
  from public.fish_harvest
  group by system_id, date
),
daily_feed as (
  select system_id, date as inventory_date,
    sum(feeding_amount)::double precision as feed_kg
  from public.feeding_record
  group by system_id, date
),
daily_events as (
  select
    ds.*,
    coalesce(stk.qty_stocked, 0) as number_of_fish_stocked,
    coalesce(tin.qty_transfer_in, 0) as number_of_fish_transferred_in,
    coalesce(mort.qty_mortality, 0) as number_of_fish_mortality,
    coalesce(tout.qty_transfer_out, 0) as number_of_fish_transferred_out,
    coalesce(harv.qty_harvest, 0) as number_of_fish_harvested,
    coalesce(feed.feed_kg, 0) as feeding_amount
  from date_spine ds
  left join daily_stocked stk on stk.system_id = ds.system_id and stk.inventory_date = ds.inventory_date
  left join daily_transfer_in tin on tin.system_id = ds.system_id and tin.inventory_date = ds.inventory_date
  left join daily_mortality mort on mort.system_id = ds.system_id and mort.inventory_date = ds.inventory_date
  left join daily_transfer_out tout on tout.system_id = ds.system_id and tout.inventory_date = ds.inventory_date
  left join daily_harvest harv on harv.system_id = ds.system_id and harv.inventory_date = ds.inventory_date
  left join daily_feed feed on feed.system_id = ds.system_id and feed.inventory_date = ds.inventory_date
),
running as (
  select
    de.*,
    sum(number_of_fish_stocked + number_of_fish_transferred_in - number_of_fish_mortality - number_of_fish_transferred_out - number_of_fish_harvested)
      over (partition by system_id order by inventory_date rows between unbounded preceding and current row) as number_of_fish,
    sum(number_of_fish_mortality)
      over (partition by system_id order by inventory_date rows between unbounded preceding and current row) as number_of_fish_mortality_aggregated,
    sum(feeding_amount)
      over (partition by system_id order by inventory_date rows between unbounded preceding and current row) as feeding_amount_aggregated
  from daily_events de
),
sampling_anchor as (
  select
    w.system_id,
    w.date as anchor_date,
    coalesce(
      case
        when sum(w.number_of_fish_sampling) filter (where w.total_weight_sampling is not null) > 0
        then sum(w.total_weight_sampling) filter (where w.total_weight_sampling is not null) * 1000.0
             / nullif(sum(w.number_of_fish_sampling) filter (where w.total_weight_sampling is not null), 0)
      end,
      avg(nullif(w.abw, 0))
    )::double precision as abw_g,
    1 as anchor_rank
  from public.fish_sampling_weight w
  group by w.system_id, w.date
),
transfer_anchor as (
  select
    ft.target_system_id as system_id,
    ft.date as anchor_date,
    coalesce(
      avg(nullif(ft.abw, 0)),
      sum(ft.total_weight_transfer) * 1000.0 / nullif(sum(ft.number_of_fish_transfer), 0),
      avg(nullif(fb.abw, 0))
    )::double precision as abw_g,
    2 as anchor_rank
  from public.fish_transfer ft
  left join public.fingerling_batch fb on fb.id = ft.batch_id
  where ft.target_system_id is not null
  group by ft.target_system_id, ft.date
),
stocking_anchor as (
  select
    fs.system_id,
    fs.date as anchor_date,
    coalesce(
      avg(nullif(fs.abw, 0)),
      sum(fs.total_weight_stocking) * 1000.0 / nullif(sum(fs.number_of_fish_stocking), 0),
      avg(nullif(fb.abw, 0))
    )::double precision as abw_g,
    3 as anchor_rank
  from public.fish_stocking fs
  left join public.fingerling_batch fb on fb.id = fs.batch_id
  group by fs.system_id, fs.date
),
anchors as (
  select * from sampling_anchor
  union all select * from transfer_anchor where abw_g is not null
  union all select * from stocking_anchor where abw_g is not null
),
last_anchor as (
  select distinct on (r.system_id, r.inventory_date)
    r.system_id,
    r.inventory_date,
    a.anchor_date as last_sampling_date,
    a.abw_g as abw_last_sampling
  from running r
  left join anchors a on a.system_id = r.system_id and a.anchor_date <= r.inventory_date
  order by r.system_id, r.inventory_date, a.anchor_date desc nulls last, a.anchor_rank asc
),
system_dims as (
  select
    s.id as system_id,
    coalesce(
      nullif(s.volume, 0),
      case when s.length > 0 and s.width > 0 and s.depth > 0 then s.length * s.width * s.depth end,
      case when s.diameter > 0 and s.depth > 0 then pi() * power(s.diameter / 2.0, 2) * s.depth end
    )::double precision as system_volume
  from public.system s
),
facts as (
  select
    row_number() over (order by r.system_id, r.inventory_date)::bigint as id,
    r.inventory_date as fact_date,
    r.inventory_date,
    r.system_id::bigint,
    r.farm_id,
    r.system_name,
    case when r.number_of_fish > 0 then lineage.cycle_id::bigint else null::bigint end as production_cycle_id,
    r.growth_stage,
    r.system_is_active,
    r.number_of_fish,
    r.number_of_fish_stocked,
    r.number_of_fish_transferred_in,
    r.number_of_fish_mortality_aggregated,
    r.number_of_fish_mortality,
    r.number_of_fish_transferred_out,
    r.number_of_fish_harvested,
    r.feeding_amount,
    r.feeding_amount_aggregated,
    la.last_sampling_date,
    la.abw_last_sampling,
    (la.abw_last_sampling * r.number_of_fish / 1000.0)::double precision as biomass_last_sampling,
    sd.system_volume
  from running r
  left join last_anchor la on la.system_id = r.system_id and la.inventory_date = r.inventory_date
  left join system_dims sd on sd.system_id = r.system_id
  left join lateral public.resolve_cycle_batch_for_system_date(r.system_id, r.inventory_date) lineage on true
)
select
  f.id,
  f.fact_date,
  f.inventory_date,
  f.system_id,
  f.farm_id,
  f.system_name,
  f.production_cycle_id,
  f.growth_stage,
  f.system_is_active,
  f.number_of_fish,
  f.number_of_fish_stocked,
  f.number_of_fish_transferred_in,
  f.number_of_fish_mortality_aggregated,
  f.number_of_fish_mortality,
  f.number_of_fish_transferred_out,
  f.number_of_fish_harvested,
  f.feeding_amount,
  f.feeding_amount_aggregated,
  f.last_sampling_date,
  f.abw_last_sampling,
  f.biomass_last_sampling,
  case
    when f.biomass_last_sampling > 0
    then (f.feeding_amount / f.biomass_last_sampling * 100.0)::double precision
    else null::double precision
  end as feeding_rate,
  f.system_volume,
  case
    when f.system_volume > 0 and f.biomass_last_sampling is not null
    then greatest(f.biomass_last_sampling, 0::double precision) / f.system_volume
    else null::double precision
  end as biomass_density,
  case
    when f.number_of_fish > 0 then (f.number_of_fish_mortality / f.number_of_fish * 100.0)::double precision
    else 0::double precision
  end as mortality_rate,
  (f.last_sampling_date is not null) as has_sampling,
  (f.abw_last_sampling is not null) as has_abw,
  (f.number_of_fish is not null) as has_inventory_count,
  (f.feeding_amount > 0) as has_feed_record,
  ((case when f.last_sampling_date is not null then 1 else 0 end)
   + (case when f.abw_last_sampling is not null then 1 else 0 end)
   + (case when f.number_of_fish is not null then 1 else 0 end)
   + (case when f.feeding_amount > 0 then 1 else 0 end))::integer as data_completeness_score
from facts f;

comment on view analytics.daily_system_facts is
  'Canonical daily model input layer. Uses operation lineage to assign production_cycle_id across transfers, ABW anchors for biomass, and system volume for density.';

grant select on analytics.daily_system_facts to service_role;

create materialized view analytics.efcr_period_last_sampling_view as
select
  dsf.system_id,
  dsf.farm_id,
  dsf.inventory_date,
  dsf.last_sampling_date,
  ps.efcr_period::numeric as efcr_period_last_sampling,
  dsf.biomass_last_sampling::numeric as biomass_last_sampling,
  (ps.efcr_period::numeric * dsf.biomass_last_sampling::numeric) as biomass_efcr_multiple
from analytics.daily_system_facts dsf
join analytics.production_summary ps
  on ps.system_id = dsf.system_id
  and ps.cycle_id = dsf.production_cycle_id
  and ps.date = dsf.last_sampling_date
  and ps.activity = 'sampling'
where dsf.last_sampling_date is not null
order by dsf.system_id, dsf.inventory_date;

grant all on table analytics.efcr_period_last_sampling_view to service_role;

do $$
begin
  refresh materialized view analytics.daily_system_facts_cache;
  refresh materialized view analytics.production_summary;
  refresh materialized view analytics.efcr_period_last_sampling_view;
exception
  when undefined_table or object_not_in_prerequisite_state then
    null;
end $$;

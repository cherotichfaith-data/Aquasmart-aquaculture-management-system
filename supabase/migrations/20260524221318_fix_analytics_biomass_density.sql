-- Keep the canonical analytics layer aligned with the production cycle model:
-- stocking/transfer establishes the first ABW anchor, inventory carries biomass
-- forward, and density is derived from biomass and system volume.

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
    coalesce(
      min(au.date),
      s.commissioned_at,
      current_date
    ) as start_date,
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
cycle_map as (
  select cycle_id, system_id, cycle_start, cycle_end
  from public.production_cycle
),
facts as (
  select
    row_number() over (order by r.system_id, r.inventory_date)::bigint as id,
    r.inventory_date as fact_date,
    r.inventory_date,
    r.system_id::bigint,
    r.farm_id,
    r.system_name,
    cm.cycle_id::bigint as production_cycle_id,
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
  left join cycle_map cm on cm.system_id = r.system_id
    and r.inventory_date >= cm.cycle_start
    and (cm.cycle_end is null or r.inventory_date <= cm.cycle_end)
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
  'Canonical daily model input layer. Uses sampling, transfer, stocking, and batch ABW anchors; derives density from biomass and system volume.';

grant select on analytics.daily_system_facts to service_role;

do $$
begin
  begin
    refresh materialized view analytics.daily_system_facts_cache;
  exception
    when undefined_table or object_not_in_prerequisite_state then
      null;
  end;
end $$;

drop materialized view if exists analytics.efcr_period_last_sampling_view;
drop materialized view if exists analytics.production_summary;

create materialized view analytics.production_summary as
with production_event_dates as (
  select date as event_date from public.fish_stocking
  union all select date from public.feeding_record
  union all select date from public.fish_mortality
  union all select date from public.fish_sampling_weight
  union all select date from public.fish_harvest
  union all select date from public.fish_transfer where origin_system_id is not null
  union all select date from public.fish_transfer where target_system_id is not null
),
asof as (
  select coalesce(max(event_date), current_date) as as_of_date
  from production_event_dates
),
activity_union as (
  select system_id, date from public.fish_stocking
  union all select system_id, date from public.feeding_record
  union all select system_id, date from public.fish_mortality
  union all select system_id, date from public.fish_sampling_weight
  union all select system_id, date from public.fish_harvest
  union all select origin_system_id as system_id, date from public.fish_transfer where origin_system_id is not null
  union all select target_system_id as system_id, date from public.fish_transfer where target_system_id is not null
),
activity_bounds as (
  select system_id, min(date) as first_activity_date, max(date) as last_activity_date
  from activity_union
  group by system_id
),
explicit_cycle_map as (
  select
    pc.cycle_id,
    pc.system_id,
    pc.cycle_start,
    case
      when pc.cycle_end is null then coalesce(ab.last_activity_date, (select as_of_date from asof))
      else least(pc.cycle_end, coalesce(ab.last_activity_date, pc.cycle_end), (select as_of_date from asof))
    end as cycle_end,
    (pc.cycle_end is null or pc.cycle_end > coalesce(ab.last_activity_date, (select as_of_date from asof))) as ongoing_cycle
  from public.production_cycle pc
  left join activity_bounds ab on ab.system_id = pc.system_id
),
explicit_cycle_systems as (
  select distinct system_id from public.production_cycle
),
stocking_bounds as (
  select system_id, min(date) as first_stocking_date
  from public.fish_stocking
  group by system_id
),
harvest_bounds as (
  select system_id, max(date) as final_harvest_date
  from public.fish_harvest
  where type_of_harvest = 'final'::public.type_of_harvest
  group by system_id
),
fallback_cycle_map as (
  select
    (-s.id)::integer as cycle_id,
    s.id as system_id,
    coalesce(sb.first_stocking_date, ab.first_activity_date) as cycle_start,
    least(coalesce(hb.final_harvest_date, ab.last_activity_date), (select as_of_date from asof)) as cycle_end,
    (sb.first_stocking_date is not null and hb.final_harvest_date is null) as ongoing_cycle
  from public.system s
  left join stocking_bounds sb on sb.system_id = s.id
  left join harvest_bounds hb on hb.system_id = s.id
  left join activity_bounds ab on ab.system_id = s.id
  left join explicit_cycle_systems ecs on ecs.system_id = s.id
  where ecs.system_id is null
    and coalesce(sb.first_stocking_date, ab.first_activity_date) is not null
    and least(coalesce(hb.final_harvest_date, ab.last_activity_date), (select as_of_date from asof)) is not null
),
cycle_map as (
  select * from explicit_cycle_map
  union all
  select * from fallback_cycle_map
),
sampling_anchor as (
  select
    w.system_id,
    w.date,
    coalesce(
      case
        when sum(w.number_of_fish_sampling) filter (where w.total_weight_sampling is not null) > 0
        then sum(w.total_weight_sampling) filter (where w.total_weight_sampling is not null) * 1000.0
          / nullif(sum(w.number_of_fish_sampling) filter (where w.total_weight_sampling is not null), 0)
      end,
      avg(nullif(w.abw, 0))
    )::double precision as abw_g
  from public.fish_sampling_weight w
  group by w.system_id, w.date
),
base_data_raw as (
  select
    cm.cycle_id,
    cm.ongoing_cycle,
    fs.date,
    fs.system_id,
    sys.name as system_name,
    sys.growth_stage::text as growth_stage,
    coalesce(
      nullif(fs.abw, 0),
      case
        when fs.number_of_fish_stocking > 0 and fs.total_weight_stocking > 0
        then fs.total_weight_stocking * 1000.0 / fs.number_of_fish_stocking
      end,
      nullif(fb.abw, 0),
      dsf.abw_last_sampling
    )::double precision as average_body_weight,
    coalesce(dsf.number_of_fish, fs.number_of_fish_stocking::double precision) as number_of_fish_inventory,
    'stocking'::text as activity,
    1 as activity_rank
  from public.fish_stocking fs
  join cycle_map cm on cm.system_id = fs.system_id and fs.date >= cm.cycle_start and fs.date <= cm.cycle_end
  join public.system sys on sys.id = fs.system_id
  left join public.fingerling_batch fb on fb.id = fs.batch_id
  left join analytics.daily_system_facts dsf on dsf.system_id = fs.system_id and dsf.inventory_date = fs.date
  where fs.date <= (select as_of_date from asof)

  union all

  select
    cm.cycle_id,
    cm.ongoing_cycle,
    ft.date,
    ft.target_system_id as system_id,
    sys.name as system_name,
    sys.growth_stage::text as growth_stage,
    coalesce(
      nullif(ft.abw, 0),
      case
        when ft.number_of_fish_transfer > 0 and ft.total_weight_transfer > 0
        then ft.total_weight_transfer * 1000.0 / ft.number_of_fish_transfer
      end,
      nullif(fb.abw, 0),
      dsf.abw_last_sampling
    )::double precision as average_body_weight,
    coalesce(dsf.number_of_fish, ft.number_of_fish_transfer::double precision) as number_of_fish_inventory,
    'transfer in'::text as activity,
    1 as activity_rank
  from public.fish_transfer ft
  join cycle_map cm on cm.system_id = ft.target_system_id and ft.date >= cm.cycle_start and ft.date <= cm.cycle_end
  join public.system sys on sys.id = ft.target_system_id
  left join public.fingerling_batch fb on fb.id = ft.batch_id
  left join analytics.daily_system_facts dsf on dsf.system_id = ft.target_system_id and dsf.inventory_date = ft.date
  where ft.target_system_id is not null
    and ft.date <= (select as_of_date from asof)
    and public.transfer_impacts_efcr(ft.transfer_type, ft.origin_system_id, ft.target_system_id)

  union all

  select
    cm.cycle_id,
    cm.ongoing_cycle,
    sa.date,
    sa.system_id,
    sys.name as system_name,
    sys.growth_stage::text as growth_stage,
    coalesce(sa.abw_g, dsf.abw_last_sampling)::double precision as average_body_weight,
    dsf.number_of_fish as number_of_fish_inventory,
    'sampling'::text as activity,
    2 as activity_rank
  from sampling_anchor sa
  join cycle_map cm on cm.system_id = sa.system_id and sa.date >= cm.cycle_start and sa.date <= cm.cycle_end
  join public.system sys on sys.id = sa.system_id
  join analytics.daily_system_facts dsf on dsf.system_id = sa.system_id and dsf.inventory_date = sa.date
  where sa.date <= (select as_of_date from asof)

  union all

  select
    cm.cycle_id,
    cm.ongoing_cycle,
    fh.date,
    fh.system_id,
    sys.name as system_name,
    sys.growth_stage::text as growth_stage,
    coalesce(
      case
        when fh.number_of_fish_harvest > 0 and fh.total_weight_harvest > 0
        then fh.total_weight_harvest * 1000.0 / fh.number_of_fish_harvest
      end,
      nullif(fh.abw, 0),
      dsf.abw_last_sampling
    )::double precision as average_body_weight,
    coalesce(dsf.number_of_fish, fh.number_of_fish_harvest::double precision) as number_of_fish_inventory,
    'final harvest'::text as activity,
    3 as activity_rank
  from public.fish_harvest fh
  join cycle_map cm on cm.system_id = fh.system_id and fh.date = cm.cycle_end
  join public.system sys on sys.id = fh.system_id
  left join analytics.daily_system_facts dsf on dsf.system_id = fh.system_id and dsf.inventory_date = fh.date
  where fh.type_of_harvest = 'final'::public.type_of_harvest
    and fh.date <= (select as_of_date from asof)

  union all

  select
    cm.cycle_id,
    cm.ongoing_cycle,
    cm.cycle_end as date,
    cm.system_id,
    sys.name as system_name,
    sys.growth_stage::text as growth_stage,
    dsf.abw_last_sampling as average_body_weight,
    dsf.number_of_fish as number_of_fish_inventory,
    case when cm.ongoing_cycle then 'current status'::text else 'cycle end'::text end as activity,
    4 as activity_rank
  from cycle_map cm
  join public.system sys on sys.id = cm.system_id
  join analytics.daily_system_facts dsf on dsf.system_id = cm.system_id and dsf.inventory_date = cm.cycle_end
  left join public.fish_harvest fh on fh.system_id = cm.system_id
    and fh.date = cm.cycle_end
    and fh.type_of_harvest = 'final'::public.type_of_harvest
  where cm.cycle_end is not null
    and cm.cycle_end <= (select as_of_date from asof)
    and cm.cycle_end > cm.cycle_start
    and fh.system_id is null
),
base_data as (
  select distinct on (system_id, cycle_id, date, activity_rank)
    cycle_id,
    ongoing_cycle,
    date,
    system_id,
    system_name,
    growth_stage,
    average_body_weight,
    number_of_fish_inventory,
    activity,
    activity_rank
  from base_data_raw
  where average_body_weight is not null
    and number_of_fish_inventory is not null
  order by system_id, cycle_id, date, activity_rank, activity
),
periods as (
  select
    bd.*,
    lag(bd.date) over (partition by bd.system_id, bd.cycle_id order by bd.date, bd.activity_rank) as previous_date,
    lag((bd.average_body_weight * bd.number_of_fish_inventory) / 1000.0)
      over (partition by bd.system_id, bd.cycle_id order by bd.date, bd.activity_rank) as previous_total_biomass
  from base_data bd
),
period_events as (
  select
    p.*,
    coalesce((
      select sum(fr.feeding_amount)::double precision
      from public.feeding_record fr
      where fr.system_id = p.system_id
        and p.previous_date is not null
        and fr.date > p.previous_date
        and fr.date <= p.date
    ), 0) as total_feed_amount_period,
    coalesce((
      select sum(fm.number_of_fish_mortality)::double precision
      from public.fish_mortality fm
      where fm.system_id = p.system_id
        and p.previous_date is not null
        and fm.date > p.previous_date
        and fm.date <= p.date
    ), 0) as daily_mortality_count,
    coalesce((
      select sum(ft.number_of_fish_transfer)::double precision
      from public.fish_transfer ft
      where ft.origin_system_id = p.system_id
        and p.previous_date is not null
        and ft.date > p.previous_date
        and ft.date <= p.date
        and public.transfer_impacts_efcr(ft.transfer_type, ft.origin_system_id, ft.target_system_id)
    ), 0) as number_of_fish_transfer_out,
    coalesce((
      select sum(public.transfer_weight_kg(ft.total_weight_transfer, ft.number_of_fish_transfer, ft.abw))::double precision
      from public.fish_transfer ft
      where ft.origin_system_id = p.system_id
        and p.previous_date is not null
        and ft.date > p.previous_date
        and ft.date <= p.date
        and public.transfer_impacts_efcr(ft.transfer_type, ft.origin_system_id, ft.target_system_id)
    ), 0) as total_weight_transfer_out,
    coalesce((
      select sum(ft.number_of_fish_transfer)::double precision
      from public.fish_transfer ft
      where ft.target_system_id = p.system_id
        and p.previous_date is not null
        and ft.date > p.previous_date
        and ft.date <= p.date
        and public.transfer_impacts_efcr(ft.transfer_type, ft.origin_system_id, ft.target_system_id)
    ), 0) as number_of_fish_transfer_in,
    coalesce((
      select sum(public.transfer_weight_kg(ft.total_weight_transfer, ft.number_of_fish_transfer, ft.abw))::double precision
      from public.fish_transfer ft
      where ft.target_system_id = p.system_id
        and p.previous_date is not null
        and ft.date > p.previous_date
        and ft.date <= p.date
        and public.transfer_impacts_efcr(ft.transfer_type, ft.origin_system_id, ft.target_system_id)
    ), 0) as total_weight_transfer_in,
    coalesce((
      select sum(fh.number_of_fish_harvest)::double precision
      from public.fish_harvest fh
      where fh.system_id = p.system_id
        and p.previous_date is not null
        and fh.date > p.previous_date
        and fh.date <= p.date
    ), 0) as number_of_fish_harvested,
    coalesce((
      select sum(fh.total_weight_harvest)::double precision
      from public.fish_harvest fh
      where fh.system_id = p.system_id
        and p.previous_date is not null
        and fh.date > p.previous_date
        and fh.date <= p.date
    ), 0) as total_weight_harvested,
    coalesce((
      select sum(fs.number_of_fish_stocking)::double precision
      from public.fish_stocking fs
      where fs.system_id = p.system_id
        and ((p.previous_date is null and fs.date = p.date) or (p.previous_date is not null and fs.date > p.previous_date and fs.date <= p.date))
    ), 0) as number_of_fish_stocked,
    coalesce((
      select sum(fs.total_weight_stocking)::double precision
      from public.fish_stocking fs
      where fs.system_id = p.system_id
        and ((p.previous_date is null and fs.date = p.date) or (p.previous_date is not null and fs.date > p.previous_date and fs.date <= p.date))
    ), 0) as total_weight_stocked
  from periods p
),
consolidated as (
  select
    pe.cycle_id,
    pe.date,
    pe.system_id,
    pe.system_name,
    pe.growth_stage,
    pe.ongoing_cycle,
    pe.average_body_weight,
    pe.number_of_fish_inventory,
    pe.total_feed_amount_period,
    pe.activity,
    pe.activity_rank,
    ((pe.average_body_weight * pe.number_of_fish_inventory) / 1000.0)::double precision as total_biomass,
    case
      when pe.previous_total_biomass is null then 0::double precision
      else (((pe.average_body_weight * pe.number_of_fish_inventory) / 1000.0) - pe.previous_total_biomass)::double precision
    end as biomass_increase_period,
    pe.daily_mortality_count,
    pe.number_of_fish_transfer_out,
    pe.total_weight_transfer_out,
    pe.number_of_fish_transfer_in,
    pe.total_weight_transfer_in,
    pe.number_of_fish_harvested,
    pe.total_weight_harvested,
    pe.number_of_fish_stocked,
    pe.total_weight_stocked,
    case
      when pe.previous_total_biomass is null then null::double precision
      else (
        (((pe.average_body_weight * pe.number_of_fish_inventory) / 1000.0) - pe.previous_total_biomass)
        + pe.total_weight_transfer_out
        - pe.total_weight_transfer_in
        + pe.total_weight_harvested
        - pe.total_weight_stocked
      )::double precision
    end as efcr_denominator_period
  from period_events pe
),
final_rows as (
  select
    c.*,
    sum(c.total_feed_amount_period) over (partition by c.system_id, c.cycle_id order by c.date, c.activity_rank) as total_feed_amount_aggregated,
    sum(c.biomass_increase_period) over (partition by c.system_id, c.cycle_id order by c.date, c.activity_rank) as biomass_increase_aggregated,
    sum(c.daily_mortality_count) over (partition by c.system_id, c.cycle_id order by c.date, c.activity_rank) as cumulative_mortality,
    sum(c.total_weight_transfer_out) over (partition by c.system_id, c.cycle_id order by c.date, c.activity_rank) as total_weight_transfer_out_aggregated,
    sum(c.total_weight_transfer_in) over (partition by c.system_id, c.cycle_id order by c.date, c.activity_rank) as total_weight_transfer_in_aggregated,
    sum(c.total_weight_harvested) over (partition by c.system_id, c.cycle_id order by c.date, c.activity_rank) as total_weight_harvested_aggregated,
    sum(c.total_weight_stocked) over (partition by c.system_id, c.cycle_id order by c.date, c.activity_rank) as total_weight_stocked_aggregated,
    sum(coalesce(c.efcr_denominator_period, 0)) over (partition by c.system_id, c.cycle_id order by c.date, c.activity_rank) as efcr_denominator_aggregated
  from consolidated c
)
select
  f.cycle_id,
  f.date,
  f.system_id,
  f.system_name,
  f.growth_stage,
  f.ongoing_cycle,
  f.average_body_weight,
  f.number_of_fish_inventory,
  f.total_feed_amount_period,
  f.activity,
  f.activity_rank,
  f.total_biomass,
  f.biomass_increase_period,
  f.total_feed_amount_aggregated,
  f.biomass_increase_aggregated,
  f.daily_mortality_count,
  f.cumulative_mortality,
  f.number_of_fish_transfer_out,
  f.total_weight_transfer_out,
  f.total_weight_transfer_out_aggregated,
  f.number_of_fish_transfer_in,
  f.total_weight_transfer_in,
  f.total_weight_transfer_in_aggregated,
  f.number_of_fish_harvested,
  f.total_weight_harvested,
  f.total_weight_harvested_aggregated,
  f.number_of_fish_stocked,
  f.total_weight_stocked,
  f.total_weight_stocked_aggregated,
  case
    when f.efcr_denominator_period > 0
    then f.total_feed_amount_period / f.efcr_denominator_period
    else null::double precision
  end as efcr_period,
  case
    when f.efcr_denominator_aggregated > 0
    then f.total_feed_amount_aggregated / f.efcr_denominator_aggregated
    else null::double precision
  end as efcr_aggregated
from final_rows f
order by f.system_id, f.cycle_id, f.date, f.activity_rank;

create index production_summary_system_date_idx on analytics.production_summary using btree (system_id, date);

grant all on table analytics.production_summary to service_role;

create or replace function public.api_production_summary(
  p_farm_id uuid,
  p_system_id bigint default null::bigint,
  p_start_date date default null::date,
  p_end_date date default null::date
) returns table(
  cycle_id integer,
  date date,
  system_id bigint,
  system_name text,
  growth_stage text,
  ongoing_cycle boolean,
  average_body_weight double precision,
  number_of_fish_inventory double precision,
  total_feed_amount_period double precision,
  activity text,
  activity_rank integer,
  total_biomass double precision,
  biomass_increase_period double precision,
  total_feed_amount_aggregated double precision,
  biomass_increase_aggregated double precision,
  daily_mortality_count double precision,
  cumulative_mortality double precision,
  number_of_fish_transfer_out double precision,
  total_weight_transfer_out double precision,
  total_weight_transfer_out_aggregated double precision,
  number_of_fish_transfer_in double precision,
  total_weight_transfer_in double precision,
  total_weight_transfer_in_aggregated double precision,
  number_of_fish_harvested double precision,
  total_weight_harvested double precision,
  total_weight_harvested_aggregated double precision,
  number_of_fish_stocked double precision,
  total_weight_stocked double precision,
  total_weight_stocked_aggregated double precision,
  efcr_period double precision,
  efcr_aggregated double precision
)
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public', 'pg_temp'
as $$
declare
  v_start date := coalesce(p_start_date, date '1900-01-01');
  v_end date := coalesce(p_end_date, current_date);
begin
  if not private.is_farm_member(p_farm_id) then
    return;
  end if;

  perform private.assert_rpc_parameters(
    p_farm_id := p_farm_id,
    p_system_id := p_system_id,
    p_batch_id := null,
    p_start_date := p_start_date,
    p_end_date := p_end_date
  );

  return query
  select
    ps.cycle_id,
    ps.date,
    ps.system_id,
    ps.system_name,
    ps.growth_stage,
    ps.ongoing_cycle,
    ps.average_body_weight,
    ps.number_of_fish_inventory,
    ps.total_feed_amount_period,
    ps.activity,
    ps.activity_rank,
    ps.total_biomass,
    ps.biomass_increase_period,
    ps.total_feed_amount_aggregated,
    ps.biomass_increase_aggregated,
    ps.daily_mortality_count,
    ps.cumulative_mortality,
    ps.number_of_fish_transfer_out,
    ps.total_weight_transfer_out,
    ps.total_weight_transfer_out_aggregated,
    ps.number_of_fish_transfer_in,
    ps.total_weight_transfer_in,
    ps.total_weight_transfer_in_aggregated,
    ps.number_of_fish_harvested,
    ps.total_weight_harvested,
    ps.total_weight_harvested_aggregated,
    ps.number_of_fish_stocked,
    ps.total_weight_stocked,
    ps.total_weight_stocked_aggregated,
    ps.efcr_period,
    ps.efcr_aggregated
  from analytics.production_summary ps
  join public.system s on s.id = ps.system_id
  where s.farm_id = p_farm_id
    and (p_system_id is null or ps.system_id = p_system_id)
    and ps.date between v_start and v_end
  order by ps.system_id, ps.date, ps.activity_rank;
end;
$$;

comment on function public.api_production_summary(uuid, bigint, date, date) is
  'Intentional app-facing SECURITY DEFINER RPC. Reads analytics.production_summary and enforces farm membership/scope checks.';

revoke all on function public.api_production_summary(uuid, bigint, date, date) from public;
grant all on function public.api_production_summary(uuid, bigint, date, date) to authenticated;
grant all on function public.api_production_summary(uuid, bigint, date, date) to service_role;

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
  and ps.date = dsf.last_sampling_date
where dsf.last_sampling_date is not null
order by dsf.system_id, dsf.inventory_date;

grant all on table analytics.efcr_period_last_sampling_view to service_role;

create or replace function public.process_inventory_queue(p_limit integer default 50)
returns table(processed_system_id bigint, processed_from_date date, processed_to_date date, upserted_days integer)
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'analytics'
as $$
declare
  r record;
  v_has_queue boolean;
begin
  select exists (select 1 from public._affected_systems)
  into v_has_queue;

  if v_has_queue then
    refresh materialized view analytics.daily_fish_inventory_table;
    refresh materialized view analytics.daily_system_facts_cache;
    refresh materialized view analytics.production_summary;
    refresh materialized view analytics.efcr_period_last_sampling_view;
  end if;

  for r in
    select system_id, min_affected_date
    from public._affected_systems
    order by min_affected_date asc
    limit greatest(1, least(coalesce(p_limit, 50), 500))
  loop
    processed_system_id := r.system_id;
    processed_from_date := r.min_affected_date;
    processed_to_date := current_date;
    upserted_days := 0;
    return next;
  end loop;

  delete from public._affected_systems
  where system_id in (
    select system_id
    from public._affected_systems
    order by min_affected_date asc
    limit greatest(1, least(coalesce(p_limit, 50), 500))
  );
end;
$$;

alter function public.process_inventory_queue(integer) owner to postgres;

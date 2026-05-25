-- Production summary cycle identity must come from operation foreign keys.
-- A production cycle belongs to the stocked batch and follows that batch
-- through transfers; it is not re-inferred from the current cage alone.

drop materialized view if exists analytics.efcr_period_last_sampling_view;
drop materialized view if exists analytics.production_summary;

create materialized view analytics.production_summary as
with real_events as (
  select
    fs.cycle_id,
    fs.system_id,
    fs.date,
    'stocking'::text as activity,
    10 as activity_rank,
    sum(fs.number_of_fish_stocking)::double precision as number_of_fish_stocked,
    sum(fs.total_weight_stocking)::double precision as total_weight_stocked,
    0::double precision as total_feed_amount_period,
    0::double precision as daily_mortality_count,
    0::double precision as number_of_fish_transfer_out,
    0::double precision as total_weight_transfer_out,
    0::double precision as number_of_fish_transfer_in,
    0::double precision as total_weight_transfer_in,
    0::double precision as number_of_fish_harvested,
    0::double precision as total_weight_harvested
  from public.fish_stocking fs
  where fs.cycle_id is not null
  group by fs.cycle_id, fs.system_id, fs.date

  union all

  select
    fr.cycle_id,
    fr.system_id,
    fr.date,
    'feeding'::text as activity,
    20 as activity_rank,
    0::double precision,
    0::double precision,
    sum(fr.feeding_amount)::double precision,
    0::double precision,
    0::double precision,
    0::double precision,
    0::double precision,
    0::double precision,
    0::double precision,
    0::double precision
  from public.feeding_record fr
  where fr.cycle_id is not null
  group by fr.cycle_id, fr.system_id, fr.date

  union all

  select
    fsw.cycle_id,
    fsw.system_id,
    fsw.date,
    'sampling'::text as activity,
    30 as activity_rank,
    0::double precision,
    0::double precision,
    0::double precision,
    0::double precision,
    0::double precision,
    0::double precision,
    0::double precision,
    0::double precision,
    0::double precision,
    0::double precision
  from public.fish_sampling_weight fsw
  where fsw.cycle_id is not null
  group by fsw.cycle_id, fsw.system_id, fsw.date

  union all

  select
    fm.cycle_id,
    fm.system_id,
    fm.date,
    'mortality'::text as activity,
    40 as activity_rank,
    0::double precision,
    0::double precision,
    0::double precision,
    sum(fm.number_of_fish_mortality)::double precision,
    0::double precision,
    0::double precision,
    0::double precision,
    0::double precision,
    0::double precision,
    0::double precision
  from public.fish_mortality fm
  where fm.cycle_id is not null
  group by fm.cycle_id, fm.system_id, fm.date

  union all

  select
    ft.cycle_id,
    ft.origin_system_id as system_id,
    ft.date,
    'transfer out'::text as activity,
    50 as activity_rank,
    0::double precision,
    0::double precision,
    0::double precision,
    0::double precision,
    sum(ft.number_of_fish_transfer)::double precision,
    sum(public.transfer_weight_kg(ft.total_weight_transfer, ft.number_of_fish_transfer, ft.abw))::double precision,
    0::double precision,
    0::double precision,
    0::double precision,
    0::double precision
  from public.fish_transfer ft
  where ft.origin_system_id is not null
    and ft.cycle_id is not null
    and public.transfer_impacts_efcr(ft.transfer_type, ft.origin_system_id, ft.target_system_id)
  group by ft.cycle_id, ft.origin_system_id, ft.date

  union all

  select
    ft.cycle_id,
    ft.target_system_id as system_id,
    ft.date,
    'transfer in'::text as activity,
    60 as activity_rank,
    0::double precision,
    0::double precision,
    0::double precision,
    0::double precision,
    0::double precision,
    0::double precision,
    sum(ft.number_of_fish_transfer)::double precision,
    sum(public.transfer_weight_kg(ft.total_weight_transfer, ft.number_of_fish_transfer, ft.abw))::double precision,
    0::double precision,
    0::double precision
  from public.fish_transfer ft
  where ft.target_system_id is not null
    and ft.cycle_id is not null
    and public.transfer_impacts_efcr(ft.transfer_type, ft.origin_system_id, ft.target_system_id)
  group by ft.cycle_id, ft.target_system_id, ft.date

  union all

  select
    fh.cycle_id,
    fh.system_id,
    fh.date,
    case
      when fh.type_of_harvest = 'final'::public.type_of_harvest then 'final harvest'::text
      else 'partial harvest'::text
    end as activity,
    case
      when fh.type_of_harvest = 'final'::public.type_of_harvest then 80
      else 70
    end as activity_rank,
    0::double precision,
    0::double precision,
    0::double precision,
    0::double precision,
    0::double precision,
    0::double precision,
    0::double precision,
    0::double precision,
    sum(coalesce(fh.number_of_fish_harvest, 0))::double precision,
    sum(fh.total_weight_harvest)::double precision
  from public.fish_harvest fh
  where fh.cycle_id is not null
  group by fh.cycle_id, fh.system_id, fh.date, fh.type_of_harvest

  union all

  select
    lineage.cycle_id,
    wq.system_id,
    wq.date,
    'water quality'::text as activity,
    90 as activity_rank,
    0::double precision,
    0::double precision,
    0::double precision,
    0::double precision,
    0::double precision,
    0::double precision,
    0::double precision,
    0::double precision,
    0::double precision,
    0::double precision
  from public.water_quality_measurement wq
  join lateral public.resolve_cycle_batch_for_system_date(wq.system_id, wq.date) lineage on true
  group by lineage.cycle_id, wq.system_id, wq.date
),
events_with_cycles as (
  select
    re.cycle_id,
    pc.ongoing_cycle,
    re.date,
    re.system_id,
    s.name as system_name,
    s.growth_stage::text as growth_stage,
    re.activity,
    re.activity_rank,
    re.number_of_fish_stocked,
    re.total_weight_stocked,
    re.total_feed_amount_period,
    re.daily_mortality_count,
    re.number_of_fish_transfer_out,
    re.total_weight_transfer_out,
    re.number_of_fish_transfer_in,
    re.total_weight_transfer_in,
    re.number_of_fish_harvested,
    re.total_weight_harvested
  from real_events re
  join public.production_cycle pc on pc.cycle_id = re.cycle_id
  join public.system s on s.id = re.system_id
),
events_with_facts as (
  select
    e.*,
    dsf.abw_last_sampling as average_body_weight,
    dsf.number_of_fish as number_of_fish_inventory,
    dsf.biomass_last_sampling as total_biomass,
    lag(dsf.biomass_last_sampling) over (
      partition by e.cycle_id
      order by e.date, e.activity_rank, e.system_id
    ) as previous_total_biomass
  from events_with_cycles e
  left join analytics.daily_system_facts dsf
    on dsf.system_id = e.system_id
    and dsf.inventory_date = e.date
),
consolidated as (
  select
    e.*,
    case
      when e.previous_total_biomass is null or e.total_biomass is null then 0::double precision
      else (e.total_biomass - e.previous_total_biomass)::double precision
    end as biomass_increase_period,
    case
      when e.previous_total_biomass is null or e.total_biomass is null then null::double precision
      else (
        (e.total_biomass - e.previous_total_biomass)
        + e.total_weight_transfer_out
        - e.total_weight_transfer_in
        + e.total_weight_harvested
        - e.total_weight_stocked
      )::double precision
    end as efcr_denominator_period
  from events_with_facts e
),
final_rows as (
  select
    c.*,
    sum(c.total_feed_amount_period) over (partition by c.cycle_id order by c.date, c.activity_rank, c.system_id) as total_feed_amount_aggregated,
    sum(c.biomass_increase_period) over (partition by c.cycle_id order by c.date, c.activity_rank, c.system_id) as biomass_increase_aggregated,
    sum(c.daily_mortality_count) over (partition by c.cycle_id order by c.date, c.activity_rank, c.system_id) as cumulative_mortality,
    sum(c.total_weight_transfer_out) over (partition by c.cycle_id order by c.date, c.activity_rank, c.system_id) as total_weight_transfer_out_aggregated,
    sum(c.total_weight_transfer_in) over (partition by c.cycle_id order by c.date, c.activity_rank, c.system_id) as total_weight_transfer_in_aggregated,
    sum(c.total_weight_harvested) over (partition by c.cycle_id order by c.date, c.activity_rank, c.system_id) as total_weight_harvested_aggregated,
    sum(c.total_weight_stocked) over (partition by c.cycle_id order by c.date, c.activity_rank, c.system_id) as total_weight_stocked_aggregated,
    sum(coalesce(c.efcr_denominator_period, 0)) over (partition by c.cycle_id order by c.date, c.activity_rank, c.system_id) as efcr_denominator_aggregated
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
order by f.cycle_id, f.date, f.activity_rank, f.system_id;

create index production_summary_system_date_idx on analytics.production_summary using btree (system_id, date);
create index production_summary_cycle_date_idx on analytics.production_summary using btree (cycle_id, date);

grant all on table analytics.production_summary to service_role;

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
  and ps.activity = 'sampling'
where dsf.last_sampling_date is not null
order by dsf.system_id, dsf.inventory_date;

grant all on table analytics.efcr_period_last_sampling_view to service_role;

do $$
begin
  refresh materialized view analytics.production_summary;
  refresh materialized view analytics.efcr_period_last_sampling_view;
exception
  when object_not_in_prerequisite_state then
    null;
end $$;

drop function if exists public.api_dashboard_systems(
  uuid,
  bigint[],
  public.system_growth_stage,
  date,
  date
);

CREATE OR REPLACE FUNCTION public.api_dashboard_systems(
  p_farm_id uuid,
  p_system_ids bigint[] DEFAULT NULL::bigint[],
  p_stage public.system_growth_stage DEFAULT NULL::public.system_growth_stage,
  p_start_date date DEFAULT NULL::date,
  p_end_date date DEFAULT NULL::date
)
RETURNS TABLE(
  system_id bigint,
  system_name text,
  growth_stage public.system_growth_stage,
  input_start_date date,
  input_end_date date,
  as_of_date date,
  fish_end double precision,
  biomass_end double precision,
  sampling_end_date date,
  sample_age_days integer,
  efcr double precision,
  efcr_latest_date date,
  efcr_arrow text,
  feed_total double precision,
  abw double precision,
  abw_latest_date date,
  abw_arrow text,
  feeding_rate double precision,
  feeding_rate_latest_date date,
  feeding_rate_arrow text,
  mortality_rate double precision,
  mortality_rate_latest_date date,
  mortality_rate_arrow text,
  biomass_density double precision,
  biomass_density_latest_date date,
  biomass_density_arrow text,
  sgr double precision,
  agr double precision,
  sgr_arrow text,
  agr_arrow text,
  missing_days_count integer,
  water_quality_rating_average text,
  water_quality_rating_numeric_average double precision,
  water_quality_latest_date date,
  water_quality_arrow text,
  worst_parameter text,
  worst_parameter_value double precision,
  worst_parameter_unit text,
  cycle_day integer,
  target_weight_g double precision,
  target_weight_progress_pct double precision,
  is_complete boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $$
with sys as (
  select s.id as system_id, s.name as system_name, s.growth_stage
  from public.system s
  where s.farm_id = p_farm_id
    and private.app_rpc_scope_ok(p_farm_id, p_system_ids, null::bigint, p_start_date, p_end_date)
    and s.is_active = true
    and coalesce(s.cage_status, 'occupied'::public.cage_status_enum) <> 'retired'::public.cage_status_enum
    and (p_stage is null or s.growth_stage = p_stage)
    and (p_system_ids is null or s.id = any(p_system_ids))
),
data_anchor as (
  select coalesce(max(dsf.inventory_date), current_date) as last_data_date
  from analytics.daily_system_facts dsf
  join sys on sys.system_id = dsf.system_id
),
bounds as (
  select
    coalesce(p_start_date, da.last_data_date - interval '30 days')::date as start_date,
    coalesce(p_end_date, da.last_data_date)::date as end_date
  from data_anchor da
),
period_meta as (
  select
    b.start_date,
    b.end_date,
    greatest((b.end_date - b.start_date + 1)::integer, 1) as period_days
  from bounds b
),
periods as (
  select 'current'::text as period_label, pm.start_date, pm.end_date
  from period_meta pm
  union all
  select 'previous'::text as period_label,
    (pm.start_date - pm.period_days)::date as start_date,
    (pm.start_date - 1)::date as end_date
  from period_meta pm
),
inv as (
  select p.period_label, dsf.*
  from periods p
  join analytics.daily_system_facts dsf
    on dsf.inventory_date between p.start_date and p.end_date
  join sys on sys.system_id = dsf.system_id
),
inv_snapshot as (
  select distinct on (period_label, system_id)
    period_label,
    system_id,
    inventory_date,
    number_of_fish as fish_end,
    biomass_last_sampling as biomass_end,
    abw_last_sampling as abw,
    last_abw_date as sampling_end_date,
    feeding_rate,
    mortality_rate,
    biomass_density
  from inv
  order by period_label, system_id, inventory_date desc
),
inv_latest as (select * from inv_snapshot where period_label = 'current'),
inv_prev as (select * from inv_snapshot where period_label = 'previous'),
inv_agg as (
  select
    system_id,
    count(distinct inventory_date)::integer as days_present
  from inv
  where period_label = 'current'
  group by system_id
),
inv_period_metrics as (
  select
    period_label,
    system_id,
    case
      when sum(coalesce(number_of_fish, 0)) > 0
        then sum(coalesce(mortality_rate, 0) * coalesce(number_of_fish, 0))
             / sum(coalesce(number_of_fish, 0))
      else avg(mortality_rate)
    end as mortality_rate_period,
    avg(biomass_density) as biomass_density_period,
    case
      when sum(coalesce(biomass_last_sampling, 0)) > 0
        then sum(coalesce(feeding_rate, 0) * coalesce(biomass_last_sampling, 0))
             / sum(coalesce(biomass_last_sampling, 0))
      else avg(feeding_rate)
    end as feeding_rate_period
  from inv
  group by period_label, system_id
),
inv_current_metrics as (select * from inv_period_metrics where period_label = 'current'),
inv_prev_metrics as (select * from inv_period_metrics where period_label = 'previous'),
ps_window as (
  select p.period_label, ps.*
  from periods p
  join analytics.production_summary ps
    on ps.date between p.start_date and p.end_date
  join sys on sys.system_id = ps.system_id
),
ps_ranked as (
  select
    ps.period_label,
    ps.system_id,
    ps.cycle_id,
    ps.date,
    ps.feed_over_period::double precision as feed_over_period,
    coalesce(ps.efcr_period, ps.efcr_aggregated)::double precision as efcr,
    greatest(coalesce(ps.biomass_increase_over_period, 0), 0)::double precision as biomass_increase_over_period,
    ps.sgr::double precision as sgr,
    ps.agr::double precision as agr,
    ps.days_in_period::integer as days_in_period,
    row_number() over (
      partition by ps.period_label, ps.system_id
      order by ps.date desc
    ) as rn
  from ps_window ps
),
ps_latest as (
  select * from ps_ranked where period_label = 'current' and rn = 1
),
ps_period_metrics as (
  select
    period_label,
    system_id,
    sum(coalesce(feed_over_period, 0))::double precision as feed_total,
    sum(coalesce(feed_over_period, 0))::double precision as total_feed_period,
    sum(coalesce(biomass_increase_over_period, 0))::double precision as total_growth_period,
    case
      when sum(case when sgr > 0 then days_in_period else 0 end) > 0
        then sum(case when sgr > 0 then sgr * days_in_period else 0 end)
             / nullif(sum(case when sgr > 0 then days_in_period else 0 end), 0)
      else null
    end::double precision as sgr_period,
    case
      when sum(case when agr > 0 then days_in_period else 0 end) > 0
        then sum(case when agr > 0 then agr * days_in_period else 0 end)
             / nullif(sum(case when agr > 0 then days_in_period else 0 end), 0)
      else null
    end::double precision as agr_period
  from ps_ranked
  group by period_label, system_id
),
ps_current_metrics as (
  select
    period_label,
    system_id,
    feed_total,
    case
      when total_growth_period > 0
        then (total_feed_period / total_growth_period)::double precision
      else null::double precision
    end as efcr_period,
    sgr_period,
    agr_period
  from ps_period_metrics
  where period_label = 'current'
),
ps_prev_metrics as (
  select
    period_label,
    system_id,
    feed_total,
    case
      when total_growth_period > 0
        then (total_feed_period / total_growth_period)::double precision
      else null::double precision
    end as efcr_period,
    sgr_period,
    agr_period
  from ps_period_metrics
  where period_label = 'previous'
),
wq_window as (
  select p.period_label, wq.*
  from periods p
  join public.daily_water_quality_rating wq
    on wq.rating_date between p.start_date and p.end_date
  join sys on sys.system_id = wq.system_id
),
wq_avg as (
  select
    period_label,
    system_id,
    avg(rating_numeric::double precision) as rating_numeric_avg,
    case
      when avg(rating_numeric::double precision) >= 2.5 then 'Optimal'
      when avg(rating_numeric::double precision) >= 1.5 then 'Acceptable'
      when avg(rating_numeric::double precision) >= 0.5 then 'Critical'
      else 'Lethal'
    end as rating_label_avg
  from wq_window
  group by period_label, system_id
),
wq_current_avg as (select * from wq_avg where period_label = 'current'),
wq_prev_avg as (select * from wq_avg where period_label = 'previous'),
wq_ranked as (
  select
    wq.period_label,
    wq.system_id,
    wq.rating_date,
    wq.rating_numeric::double precision as rating_numeric,
    case
      when wq.rating_numeric >= 2.5 then 'Optimal'
      when wq.rating_numeric >= 1.5 then 'Acceptable'
      when wq.rating_numeric >= 0.5 then 'Critical'
      else 'Lethal'
    end as rating_label,
    wq.worst_parameter::text,
    wq.worst_parameter_value::double precision,
    wq.worst_parameter_unit::text,
    row_number() over (
      partition by wq.period_label, wq.system_id
      order by wq.rating_date desc, wq.created_at desc, wq.id desc
    ) as rn
  from wq_window wq
),
wq_latest as (select * from wq_ranked where period_label = 'current' and rn = 1)
select
  sys.system_id,
  sys.system_name,
  sys.growth_stage,
  b.start_date as input_start_date,
  b.end_date as input_end_date,
  b.end_date as as_of_date,
  inv_latest.fish_end,
  inv_latest.biomass_end,
  inv_latest.sampling_end_date,
  case
    when inv_latest.sampling_end_date is null then null
    else (b.end_date - inv_latest.sampling_end_date)::integer
  end as sample_age_days,
  ps_latest.efcr,
  ps_latest.date as efcr_latest_date,
  case
    when ps_current_metrics.efcr_period is null or ps_prev_metrics.efcr_period is null then null
    when ps_current_metrics.efcr_period = ps_prev_metrics.efcr_period then 'straight'
    when ps_current_metrics.efcr_period > ps_prev_metrics.efcr_period then 'up'
    else 'down'
  end as efcr_arrow,
  ps_current_metrics.feed_total,
  inv_latest.abw,
  inv_latest.sampling_end_date as abw_latest_date,
  case
    when inv_latest.abw is null or inv_prev.abw is null then null
    when inv_latest.abw = inv_prev.abw then 'straight'
    when inv_latest.abw > inv_prev.abw then 'up'
    else 'down'
  end as abw_arrow,
  inv_current_metrics.feeding_rate_period as feeding_rate,
  inv_latest.inventory_date as feeding_rate_latest_date,
  case
    when inv_current_metrics.feeding_rate_period is null or inv_prev_metrics.feeding_rate_period is null then null
    when inv_current_metrics.feeding_rate_period = inv_prev_metrics.feeding_rate_period then 'straight'
    when inv_current_metrics.feeding_rate_period > inv_prev_metrics.feeding_rate_period then 'up'
    else 'down'
  end as feeding_rate_arrow,
  inv_latest.mortality_rate,
  inv_latest.inventory_date as mortality_rate_latest_date,
  case
    when inv_current_metrics.mortality_rate_period is null or inv_prev_metrics.mortality_rate_period is null then null
    when inv_current_metrics.mortality_rate_period = inv_prev_metrics.mortality_rate_period then 'straight'
    when inv_current_metrics.mortality_rate_period > inv_prev_metrics.mortality_rate_period then 'up'
    else 'down'
  end as mortality_rate_arrow,
  inv_latest.biomass_density,
  inv_latest.inventory_date as biomass_density_latest_date,
  case
    when inv_current_metrics.biomass_density_period is null or inv_prev_metrics.biomass_density_period is null then null
    when inv_current_metrics.biomass_density_period = inv_prev_metrics.biomass_density_period then 'straight'
    when inv_current_metrics.biomass_density_period > inv_prev_metrics.biomass_density_period then 'up'
    else 'down'
  end as biomass_density_arrow,
  ps_current_metrics.sgr_period as sgr,
  ps_current_metrics.agr_period as agr,
  case
    when ps_current_metrics.sgr_period is null or ps_prev_metrics.sgr_period is null then null
    when ps_current_metrics.sgr_period > ps_prev_metrics.sgr_period then 'up'
    when ps_current_metrics.sgr_period < ps_prev_metrics.sgr_period then 'down'
    else 'straight'
  end as sgr_arrow,
  case
    when ps_current_metrics.agr_period is null or ps_prev_metrics.agr_period is null then null
    when ps_current_metrics.agr_period > ps_prev_metrics.agr_period then 'up'
    when ps_current_metrics.agr_period < ps_prev_metrics.agr_period then 'down'
    else 'straight'
  end as agr_arrow,
  greatest(0, (b.end_date - b.start_date + 1)::integer - coalesce(inv_agg.days_present, 0)) as missing_days_count,
  wq_current_avg.rating_label_avg as water_quality_rating_average,
  wq_current_avg.rating_numeric_avg as water_quality_rating_numeric_average,
  wq_latest.rating_date as water_quality_latest_date,
  case
    when wq_current_avg.rating_numeric_avg is null or wq_prev_avg.rating_numeric_avg is null then null
    when wq_current_avg.rating_numeric_avg = wq_prev_avg.rating_numeric_avg then 'straight'
    when wq_current_avg.rating_numeric_avg > wq_prev_avg.rating_numeric_avg then 'up'
    else 'down'
  end as water_quality_arrow,
  wq_latest.worst_parameter,
  wq_latest.worst_parameter_value,
  wq_latest.worst_parameter_unit,
  case
    when pc.cycle_start is null then null
    else (b.end_date - pc.cycle_start)::integer
  end as cycle_day,
  pc.target_weight_g::double precision as target_weight_g,
  case
    when pc.target_weight_g is not null and inv_latest.abw is not null
      then round((inv_latest.abw / pc.target_weight_g::double precision * 100)::numeric, 1)::double precision
    else null
  end as target_weight_progress_pct,
  case
    when inv_latest.fish_end is not null
      and inv_latest.fish_end > 0
      and inv_latest.biomass_end is not null
      and ps_current_metrics.feed_total is not null
      and ps_latest.efcr is not null
      and inv_latest.abw is not null
      and inv_latest.biomass_density is not null
    then true else false
  end as is_complete
from sys
cross join bounds b
left join inv_latest on inv_latest.system_id = sys.system_id
left join inv_prev on inv_prev.system_id = sys.system_id
left join inv_agg on inv_agg.system_id = sys.system_id
left join ps_latest on ps_latest.system_id = sys.system_id
left join public.production_cycle pc on pc.cycle_id = ps_latest.cycle_id
left join inv_current_metrics on inv_current_metrics.system_id = sys.system_id
left join inv_prev_metrics on inv_prev_metrics.system_id = sys.system_id
left join ps_current_metrics on ps_current_metrics.system_id = sys.system_id
left join ps_prev_metrics on ps_prev_metrics.system_id = sys.system_id
left join wq_current_avg on wq_current_avg.system_id = sys.system_id
left join wq_prev_avg on wq_prev_avg.system_id = sys.system_id
left join wq_latest on wq_latest.system_id = sys.system_id
order by sys.system_name;
$$;

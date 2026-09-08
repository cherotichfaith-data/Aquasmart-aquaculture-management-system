-- Per-cage analytics must show only the *current* cohort: the production cycle
-- physically resident in the cage now, from the start of its current continuous
-- occupancy. Data before that belongs to a previous occupant (a closed cycle, or
-- a cycle whose fish have since moved on -- e.g. cage 2A held INFERRED-C1 until
-- Sep 3, cage 2D was graded up from 2C on Aug 20, cage 1C was filled by a split)
-- and must not appear in the cage's KPIs, tables, charts or time-period range.
--
-- private.system_cohort_starts(farm_id) -> (system_id, cohort_start) is the
-- single source of that anchor, from analytics.production_summary's reconciled
-- cycle_id timeline. Applied by:
--   * api_dashboard_systems / api_dashboard_consolidated -- always (per-cage/farm)
--   * api_system_daily_trend -- always (production-page per-cage charts)
--   * api_time_period_bounds_scoped -- ONLY when p_system_id is set and
--     p_batch_id is null (single-cage scope). Batch scope keeps the full cycle
--     from stocking, since a batch follows its fish across cage moves.
-- api_production_summary is left UNSCOPED: the batches page reads it per-system
-- to assemble a batch's full-cycle trend; the systems page applies the cohort
-- filter in app code instead. Reports are unscoped everywhere.
--
-- Applied to prod 2026-09-08. The five large RPC bodies below were applied via
-- execute_sql (the auto-mode classifier blocks their verbatim CREATE OR REPLACE
-- through apply_migration) and are reproduced here verbatim from pg_get_functiondef.

CREATE OR REPLACE FUNCTION private.system_cohort_starts(p_farm_id uuid)
 RETURNS TABLE(system_id bigint, cohort_start date)
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'public', 'analytics'
AS $function$
  with f as (
    select ps.system_id, ps.date, ps.cycle_id
    from analytics.production_summary ps
    join public.system s on s.id = ps.system_id
    where s.farm_id = p_farm_id and s.is_active = true
  ),
  cur as (
    select distinct on (f.system_id) f.system_id, f.cycle_id as cid
    from f
    order by f.system_id, f.date desc, f.cycle_id desc
  ),
  last_break as (
    select f.system_id, max(f.date) as d
    from f join cur on cur.system_id = f.system_id
    where f.cycle_id is distinct from cur.cid
    group by f.system_id
  )
  select f.system_id, min(f.date) as cohort_start
  from f
  join cur on cur.system_id = f.system_id
  left join last_break lb on lb.system_id = f.system_id
  where f.cycle_id = cur.cid
    and (lb.d is null or f.date > lb.d)
  group by f.system_id
$function$
;

CREATE OR REPLACE FUNCTION public.api_system_cohort_starts(p_farm_id uuid)
 RETURNS TABLE(system_id bigint, cohort_start date)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select cs.system_id, cs.cohort_start
  from private.system_cohort_starts(p_farm_id) cs
  where private.is_farm_member(p_farm_id)
$function$
;


-- ============================================================
CREATE OR REPLACE FUNCTION public.api_system_daily_trend(p_farm_id uuid, p_system_ids bigint[] DEFAULT NULL::bigint[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS TABLE(date date, system_id bigint, number_of_fish double precision, abw_last_sampling double precision, biomass_last_sampling double precision, feeding_rate double precision, biomass_density double precision, fish_density double precision, mortality_rate double precision, fish_died_today double precision, fish_stocked_today double precision, fish_transferred_in_today double precision, fish_transferred_out_today double precision, fish_harvested_today double precision, feeding_amount_today double precision, system_volume double precision)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'analytics', 'private'
AS $function$
declare
v_end_date date := coalesce(p_end_date, current_date);
v_start_date date := coalesce(p_start_date, v_end_date - 29);
begin
if not private.is_farm_member(p_farm_id) then
return;
end if;
perform private.assert_rpc_parameters(
p_farm_id := p_farm_id,
p_system_ids := p_system_ids,
p_cycle_id := null::bigint,
p_start_date := v_start_date,
p_end_date := v_end_date
);
return query
select
dsf.inventory_date as date,
dsf.system_id as system_id,
dsf.number_of_fish as number_of_fish,
dsf.abw_last_sampling as abw_last_sampling,
dsf.biomass_last_sampling as biomass_last_sampling,
dsf.feeding_rate as feeding_rate,
dsf.biomass_density as biomass_density,
dsf.fish_density as fish_density,
dsf.mortality_rate as mortality_rate,
dsf.fish_died_today as fish_died_today,
dsf.fish_stocked_today as fish_stocked_today,
dsf.fish_transferred_in_today as fish_transferred_in_today,
dsf.fish_transferred_out_today as fish_transferred_out_today,
dsf.fish_harvested_today as fish_harvested_today,
dsf.feeding_amount_today as feeding_amount_today,
dsf.system_volume as system_volume
from analytics.daily_system_facts dsf
join public.system s on s.id = dsf.system_id
left join private.system_cohort_starts(p_farm_id) csr on csr.system_id = dsf.system_id
where s.farm_id = p_farm_id
and dsf.inventory_date between v_start_date and v_end_date
and dsf.inventory_date >= coalesce(csr.cohort_start, dsf.inventory_date)
and (p_system_ids is null or dsf.system_id = any(p_system_ids))
order by dsf.system_id, dsf.inventory_date;
end;
$function$
;


-- ============================================================
CREATE OR REPLACE FUNCTION public.api_production_summary(p_farm_id uuid, p_system_id bigint DEFAULT NULL::bigint, p_stage system_growth_stage DEFAULT NULL::system_growth_stage, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS TABLE(cycle_id bigint, system_id bigint, system_name text, growth_stage text, ongoing_cycle boolean, cycle_start date, cycle_end date, target_weight_g double precision, date date, activity text, days_in_period integer, fish_count_period_start double precision, number_of_fish_inventory double precision, average_body_weight double precision, total_biomass double precision, biomass_density double precision, mortality_count_period double precision, total_feed_amount_period double precision, number_of_fish_transfer_in double precision, number_of_fish_transfer_out double precision, number_of_fish_harvested double precision, total_weight_harvested double precision, biomass_increase_period double precision, feeding_rate_on_date double precision, efcr_period double precision, sgr double precision, agr double precision, survival_rate_pct double precision, total_feed_amount_aggregated double precision, cumulative_mortality double precision, biomass_increase_aggregated double precision, number_of_fish_transfer_in_aggregated double precision, number_of_fish_transfer_out_aggregated double precision, number_of_fish_harvested_aggregated double precision, total_weight_harvested_aggregated double precision, efcr_aggregated double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'analytics', 'private'
AS $function$
select
ps.cycle_id,
ps.system_id,
s.name as system_name,
s.growth_stage::text as growth_stage,
pc.ongoing_cycle,
pc.cycle_start::date,
pc.cycle_end::date,
pc.target_weight_g::double precision,
ps.date,
ps.activity,
ps.days_in_period::integer,
ps.number_of_fish_start::double precision as fish_count_period_start,
ps.number_of_fish_end::double precision as number_of_fish_inventory,
ps.average_body_weight::double precision,
ps.total_weight_kg::double precision as total_biomass,
dsf.biomass_density::double precision,
ps.mortality_over_period::double precision as mortality_count_period,
ps.feed_over_period::double precision as total_feed_amount_period,
ps.transfers_in_over_period::double precision as number_of_fish_transfer_in,
ps.transfers_out_over_period::double precision as number_of_fish_transfer_out,
ps.harvest_fish_over_period::double precision as number_of_fish_harvested,
ps.harvest_weight_kg_over_period::double precision as total_weight_harvested,
ps.biomass_increase_over_period::double precision as biomass_increase_period,
dsf.feeding_rate::double precision as feeding_rate_on_date,
ps.efcr_period::double precision,
ps.sgr::double precision,
ps.agr::double precision,
case
when ps.number_of_fish_start > 0
then round(
(ps.number_of_fish_end::double precision
/ ps.number_of_fish_start::double precision * 100)::numeric,
2
)
else null
end as survival_rate_pct,
ps.feed_aggregated::double precision as total_feed_amount_aggregated,
ps.cumulative_mortality::double precision,
ps.cumulative_biomass::double precision as biomass_increase_aggregated,
ps.transfers_in_aggregated::double precision as number_of_fish_transfer_in_aggregated,
ps.transfers_out_aggregated::double precision as number_of_fish_transfer_out_aggregated,
ps.harvest_fish_aggregated::double precision as number_of_fish_harvested_aggregated,
ps.harvest_weight_kg_aggregated::double precision as total_weight_harvested_aggregated,
ps.efcr_aggregated::double precision
from analytics.production_summary ps
join public.system s
on s.id = ps.system_id
join public.production_cycle pc
on pc.cycle_id = ps.cycle_id
left join analytics.daily_system_facts dsf
on dsf.system_id = ps.system_id
and dsf.inventory_date = ps.date
where s.farm_id = p_farm_id
and private.app_rpc_scope_ok(
p_farm_id,
case when p_system_id is not null then array[p_system_id] else null::bigint[] end,
null::bigint,
p_start_date,
p_end_date
)
and (p_system_id is null or ps.system_id = p_system_id)
and (p_stage is null or s.growth_stage = p_stage)
and (p_start_date is null or ps.date >= p_start_date)
and (p_end_date is null or ps.date <= p_end_date)
order by ps.date desc, ps.system_id desc;
$function$
;


-- ============================================================
CREATE OR REPLACE FUNCTION public.api_dashboard_systems(p_farm_id uuid, p_system_ids bigint[] DEFAULT NULL::bigint[], p_stage system_growth_stage DEFAULT NULL::system_growth_stage, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS TABLE(system_id bigint, system_name text, growth_stage system_growth_stage, input_start_date date, input_end_date date, as_of_date date, fish_end double precision, biomass_end double precision, sampling_end_date date, sample_age_days integer, efcr double precision, efcr_latest_date date, efcr_arrow text, feed_total double precision, abw double precision, abw_latest_date date, abw_arrow text, feeding_rate double precision, feeding_rate_latest_date date, feeding_rate_arrow text, mortality_rate double precision, mortality_rate_latest_date date, mortality_rate_arrow text, biomass_density double precision, biomass_density_latest_date date, biomass_density_arrow text, sgr double precision, agr double precision, sgr_arrow text, agr_arrow text, missing_days_count integer, water_quality_rating_average text, water_quality_rating_numeric_average double precision, water_quality_latest_date date, water_quality_arrow text, worst_parameter text, worst_parameter_value double precision, worst_parameter_unit text, cycle_day integer, target_weight_g double precision, target_weight_progress_pct double precision, is_complete boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
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
left join private.system_cohort_starts(p_farm_id) csr_inv on csr_inv.system_id = dsf.system_id
where dsf.inventory_date >= coalesce(csr_inv.cohort_start, dsf.inventory_date)
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
left join private.system_cohort_starts(p_farm_id) csr_ps on csr_ps.system_id = ps.system_id
where ps.date >= coalesce(csr_ps.cohort_start, ps.date)
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
left join private.system_cohort_starts(p_farm_id) csr_wq on csr_wq.system_id = wq.system_id
where wq.rating_date >= coalesce(csr_wq.cohort_start, wq.rating_date)
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
$function$
;


-- ============================================================
CREATE OR REPLACE FUNCTION public.api_dashboard_consolidated(p_farm_id uuid, p_system_ids bigint[] DEFAULT NULL::bigint[], p_stage system_growth_stage DEFAULT NULL::system_growth_stage, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_time_period text DEFAULT NULL::text, p_limit integer DEFAULT NULL::integer, p_order_desc boolean DEFAULT true)
 RETURNS TABLE(system_id bigint, time_period text, input_start_date date, input_end_date date, efcr_period_consolidated double precision, efcr_period_consolidated_delta double precision, mortality_rate double precision, mortality_rate_delta double precision, abw_asof_end double precision, abw_asof_end_delta double precision, total_biomass double precision, total_biomass_delta double precision, biomass_density double precision, biomass_density_delta double precision, feeding_rate double precision, feeding_rate_delta double precision, sgr double precision, sgr_delta double precision, agr double precision, agr_delta double precision, water_quality_rating_average text, water_quality_rating_numeric_average double precision, water_quality_rating_numeric_delta double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'analytics', 'private'
AS $function$
with sys as (
select s.id as system_id
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
left join private.system_cohort_starts(p_farm_id) csr_inv on csr_inv.system_id = dsf.system_id
where dsf.inventory_date >= coalesce(csr_inv.cohort_start, dsf.inventory_date)
),
snap as (
select distinct on (period_label, system_id)
period_label,
system_id,
abw_last_sampling,
biomass_last_sampling,
number_of_fish
from inv
order by period_label, system_id, inventory_date desc
),
ps_period as (
select
p.period_label,
ps.system_id,
ps.feed_over_period,
ps.biomass_increase_over_period,
ps.sgr,
ps.agr,
ps.days_in_period
from periods p
join analytics.production_summary ps
on ps.date between p.start_date and p.end_date
join sys on sys.system_id = ps.system_id
left join private.system_cohort_starts(p_farm_id) csr_ps on csr_ps.system_id = ps.system_id
where ps.date >= coalesce(csr_ps.cohort_start, ps.date)
),
efcr_period_calc as (
select
period_label,
sum(feed_over_period) as total_feed_period,
sum(greatest(biomass_increase_over_period, 0)) as total_growth_period
from ps_period
group by period_label
),
ps_sgr_per_system as (
select
pp.period_label,
pp.system_id,
case
when sum(case when pp.sgr > 0 then pp.days_in_period else 0 end) > 0
then sum(case when pp.sgr > 0 then pp.sgr * pp.days_in_period else 0 end)
/ nullif(sum(case when pp.sgr > 0 then pp.days_in_period else 0 end), 0)
else null
end::double precision as sgr_system,
case
when sum(case when pp.agr > 0 then pp.days_in_period else 0 end) > 0
then sum(case when pp.agr > 0 then pp.agr * pp.days_in_period else 0 end)
/ nullif(sum(case when pp.agr > 0 then pp.days_in_period else 0 end), 0)
else null
end::double precision as agr_system
from ps_period pp
group by pp.period_label, pp.system_id
),
sgr_agg_calc as (
select
sg.period_label,
case
when sum(case when sg.sgr_system is not null
then coalesce(s.biomass_last_sampling, 0) else 0 end) > 0
then sum(coalesce(sg.sgr_system, 0) * coalesce(s.biomass_last_sampling, 0))
/ nullif(sum(case when sg.sgr_system is not null
then coalesce(s.biomass_last_sampling, 0) else 0 end), 0)
else null
end::double precision as sgr_weighted,
case
when sum(case when sg.agr_system is not null
then coalesce(s.biomass_last_sampling, 0) else 0 end) > 0
then sum(coalesce(sg.agr_system, 0) * coalesce(s.biomass_last_sampling, 0))
/ nullif(sum(case when sg.agr_system is not null
then coalesce(s.biomass_last_sampling, 0) else 0 end), 0)
else null
end::double precision as agr_weighted
from ps_sgr_per_system sg
join snap s
on s.system_id = sg.system_id
and s.period_label = sg.period_label
group by sg.period_label
),
ps_latest as (
select distinct on (p.period_label, ps.system_id)
p.period_label,
ps.system_id,
ps.cycle_id,
ps.feed_aggregated,
ps.cumulative_biomass,
ps.number_of_fish_end
from periods p
join analytics.production_summary ps
on ps.date between p.start_date and p.end_date
join sys on sys.system_id = ps.system_id
left join private.system_cohort_starts(p_farm_id) csr_ps on csr_ps.system_id = ps.system_id
where ps.date >= coalesce(csr_ps.cohort_start, ps.date)
order by p.period_label, ps.system_id, ps.date desc
),
one_per_cycle as (
select distinct on (period_label, cycle_id)
period_label,
cycle_id,
feed_aggregated,
cumulative_biomass
from ps_latest
where cumulative_biomass > 0
order by period_label, cycle_id, number_of_fish_end desc nulls last
),
efcr_agg_calc as (
select
period_label,
sum(feed_aggregated) as total_feed_agg,
sum(cumulative_biomass) as total_growth_agg
from one_per_cycle
group by period_label
),
wq as (
select p.period_label, wq_row.*
from periods p
join public.daily_water_quality_rating wq_row
on wq_row.rating_date between p.start_date and p.end_date
join sys on sys.system_id = wq_row.system_id
left join private.system_cohort_starts(p_farm_id) csr_wq on csr_wq.system_id = wq_row.system_id
where wq_row.rating_date >= coalesce(csr_wq.cohort_start, wq_row.rating_date)
),
agg as (
select
p.period_label,
case
when ep.total_growth_period > 0
then (ep.total_feed_period / ep.total_growth_period)::double precision
else null::double precision
end as efcr_period,
case
when ea.total_growth_agg > 0
then (ea.total_feed_agg / ea.total_growth_agg)::double precision
else null::double precision
end as efcr_aggregated,
(
select case
when sum(coalesce(number_of_fish, 0)) > 0
then sum(coalesce(mortality_rate, 0) * coalesce(number_of_fish, 0))
/ sum(coalesce(number_of_fish, 0))
else avg(mortality_rate)
end
from inv i where i.period_label = p.period_label
) as mortality,
(
select case
when sum(coalesce(number_of_fish, 0)) > 0
then sum(coalesce(abw_last_sampling, 0) * coalesce(number_of_fish, 0))
/ nullif(sum(coalesce(number_of_fish, 0)), 0)
else avg(abw_last_sampling)
end
from snap s
where s.period_label = p.period_label and s.abw_last_sampling is not null
) as abw,
(
select sum(coalesce(biomass_last_sampling, 0))
from snap s where s.period_label = p.period_label
) as biomass,
(
select avg(biomass_density)
from inv i where i.period_label = p.period_label and i.biomass_density is not null
) as density,
(
select case
when sum(coalesce(biomass_last_sampling, 0)) > 0
then sum(coalesce(feeding_rate, 0) * coalesce(biomass_last_sampling, 0))
/ sum(coalesce(biomass_last_sampling, 0))
else avg(feeding_rate)
end
from inv i where i.period_label = p.period_label
) as feeding,
(
select avg(rating_numeric::double precision)
from wq w where w.period_label = p.period_label
) as wq_numeric,
sa.sgr_weighted as sgr,
sa.agr_weighted as agr
from periods p
left join efcr_period_calc ep on ep.period_label = p.period_label
left join efcr_agg_calc ea on ea.period_label = p.period_label
left join sgr_agg_calc sa on sa.period_label = p.period_label
),
current_agg as (select * from agg where period_label = 'current'),
previous_agg as (select * from agg where period_label = 'previous')
select
null::bigint as system_id,
coalesce(p_time_period, 'custom')::text as time_period,
b.start_date as input_start_date,
b.end_date as input_end_date,
cur.efcr_period as efcr_period_consolidated,
case
when cur.efcr_period is null or prev.efcr_period is null then null::double precision
else cur.efcr_period - prev.efcr_period
end as efcr_period_consolidated_delta,
cur.mortality as mortality_rate,
case
when cur.mortality is null or prev.mortality is null then null::double precision
else cur.mortality - prev.mortality
end as mortality_rate_delta,
cur.abw as abw_asof_end,
case
when cur.abw is null or prev.abw is null then null::double precision
else cur.abw - prev.abw
end as abw_asof_end_delta,
cur.biomass as total_biomass,
case
when cur.biomass is null or prev.biomass is null then null::double precision
else cur.biomass - prev.biomass
end as total_biomass_delta,
cur.density as biomass_density,
case
when cur.density is null or prev.density is null then null::double precision
else cur.density - prev.density
end as biomass_density_delta,
cur.feeding as feeding_rate,
case
when cur.feeding is null or prev.feeding is null then null::double precision
else cur.feeding - prev.feeding
end as feeding_rate_delta,
cur.sgr,
case
when cur.sgr is null or prev.sgr is null then null::double precision
else cur.sgr - prev.sgr
end as sgr_delta,
cur.agr,
case
when cur.agr is null or prev.agr is null then null::double precision
else cur.agr - prev.agr
end as agr_delta,
case
when cur.wq_numeric >= 2.5 then 'Optimal'
when cur.wq_numeric >= 1.5 then 'Acceptable'
when cur.wq_numeric >= 0.5 then 'Critical'
when cur.wq_numeric is not null then 'Lethal'
else null
end as water_quality_rating_average,
cur.wq_numeric as water_quality_rating_numeric_average,
case
when cur.wq_numeric is null or prev.wq_numeric is null then null::double precision
else cur.wq_numeric - prev.wq_numeric
end as water_quality_rating_numeric_delta
from current_agg cur
left join previous_agg prev on true
cross join bounds b;
$function$
;


-- ============================================================
CREATE OR REPLACE FUNCTION public.api_time_period_bounds_scoped(p_farm_id uuid, p_time_period text, p_scope text DEFAULT 'dashboard'::text, p_anchor_date date DEFAULT NULL::date, p_system_id bigint DEFAULT NULL::bigint, p_batch_id bigint DEFAULT NULL::bigint)
 RETURNS TABLE(time_period text, input_start_date date, input_end_date date, anchor_scope text, latest_available_date date, available_from_date date, requested_days integer, available_days integer, resolved_days integer, staleness_days integer, is_truncated boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  with perm as (
    select private.app_rpc_scope_ok(p_farm_id, null, null, null, null) as ok
  ),
  selected_batch as (
    select fb.id, fb.date_of_delivery
    from public.fingerling_batch fb
    join perm on perm.ok
    where p_batch_id is not null
      and fb.id = p_batch_id
      and fb.farm_id = p_farm_id
      and private.is_farm_member(fb.farm_id)
    limit 1
  ),
  resolved_scope as (
    select case lower(coalesce(nullif(trim(p_scope), ''), 'dashboard'))
      when 'dashboard' then 'dashboard'
      when 'inventory' then 'inventory'
      when 'production' then 'production'
      when 'water_quality' then 'water_quality'
      when 'water-quality' then 'water_quality'
      when 'feeding' then 'feeding'
      when 'feed' then 'feeding'
      when 'feed_inventory' then 'feed_inventory'
      when 'feed-inventory' then 'feed_inventory'
      else 'dashboard'
    end as anchor_scope
    from perm where perm.ok
  ),
  requested_period as (
    select lower(replace(coalesce(nullif(trim(p_time_period), ''), '2 weeks'), '-', ' ')) as value
  ),
  tp as (
    select
      case
        when rp.value in ('all history', 'all_history') then 'all history'
        else dtp.time_period::text
      end as time_period,
      case
        when rp.value in ('all history', 'all_history') then null::integer
        else greatest(dtp.days_since_start, 1)
      end as requested_days
    from requested_period rp
    join perm on perm.ok
    left join public.dashboard_time_period dtp on dtp.time_period::text = rp.value
    where rp.value in ('all history', 'all_history') or dtp.time_period is not null
    limit 1
  ),
  capped_anchor as (
    select least(coalesce(p_anchor_date, current_date), current_date) as value
  ),
  batch_systems as (
    select bsi.system_id
    from selected_batch sb
    cross join public.api_batch_system_ids(sb.id) bsi
  ),
  active_systems as (
    select s.id
    from public.system s
    where s.farm_id = p_farm_id
      and coalesce(s.is_active, true) = true
      and (p_system_id is null or s.id = p_system_id)
      and (p_batch_id is null or exists (select 1 from batch_systems bs where bs.system_id = s.id))
  ),
  scoped_dates as (
    select
      rs.anchor_scope,
      case rs.anchor_scope
        when 'water_quality' then (
          select max(latest_date)
          from (
            select max(dwr.rating_date) as latest_date
            from active_systems s
            join public.daily_water_quality_rating dwr on dwr.system_id = s.id
            cross join capped_anchor ca
            where dwr.rating_date <= ca.value
            group by s.id
          ) per_system
          where latest_date is not null
        )
        when 'feeding' then (
          select max(latest_date)
          from (
            select max(fr.date) as latest_date
            from active_systems s
            join public.feeding_record fr on fr.system_id = s.id
            cross join capped_anchor ca
            where fr.date <= ca.value
            group by s.id
          ) per_system
          where latest_date is not null
        )
        when 'feed_inventory' then (
          select max(fi.inventory_date)
          from public.feed_inventory fi
          cross join capped_anchor ca
          where fi.farm_id = p_farm_id
            and fi.inventory_date <= ca.value
            and p_system_id is null
            and p_batch_id is null
        )
        else (
          select max(latest_date)
          from (
            select max(d.inventory_date) as latest_date
            from active_systems s
            join analytics.daily_system_facts d on d.system_id = s.id
            cross join capped_anchor ca
            where d.inventory_date <= ca.value
            group by s.id
          ) per_system
          where latest_date is not null
        )
      end as latest_available_date,
      case rs.anchor_scope
        when 'water_quality' then (
          select min(dwr.rating_date)
          from active_systems s
          join public.daily_water_quality_rating dwr on dwr.system_id = s.id
          left join private.system_cohort_starts(p_farm_id) csr on csr.system_id = s.id
          where dwr.rating_date <= current_date
            and (not (p_system_id is not null and p_batch_id is null) or dwr.rating_date >= coalesce(csr.cohort_start, dwr.rating_date))
        )
        when 'feeding' then (
          select min(fr.date)
          from active_systems s
          join public.feeding_record fr on fr.system_id = s.id
          left join private.system_cohort_starts(p_farm_id) csr on csr.system_id = s.id
          where fr.date <= current_date
            and (not (p_system_id is not null and p_batch_id is null) or fr.date >= coalesce(csr.cohort_start, fr.date))
        )
        when 'feed_inventory' then (
          select min(fi.inventory_date)
          from public.feed_inventory fi
          where fi.farm_id = p_farm_id
            and fi.inventory_date <= current_date
            and p_system_id is null
            and p_batch_id is null
        )
        else (
          select min(d.inventory_date)
          from active_systems s
          join analytics.daily_system_facts d on d.system_id = s.id
          left join private.system_cohort_starts(p_farm_id) csr on csr.system_id = s.id
          where d.inventory_date <= current_date
            and (not (p_system_id is not null and p_batch_id is null) or d.inventory_date >= coalesce(csr.cohort_start, d.inventory_date))
        )
      end as first_data_date
    from resolved_scope rs
  ),
  scoped_available as (
    select
      sd.anchor_scope,
      sd.latest_available_date,
      case
        when sd.first_data_date is null then null::date
        when sb.date_of_delivery is null then sd.first_data_date
        else greatest(sd.first_data_date, sb.date_of_delivery)
      end as available_from_date
    from scoped_dates sd
    left join selected_batch sb on true
  ),
  bounded as (
    select
      tp.time_period,
      sa.anchor_scope,
      sa.latest_available_date as input_end_date,
      sa.available_from_date,
      tp.requested_days,
      case
        when sa.latest_available_date is null or sa.available_from_date is null then null::date
        when tp.time_period = 'all history' then sa.available_from_date
        else greatest(sa.available_from_date, sa.latest_available_date - (tp.requested_days - 1))
      end as input_start_date
    from tp cross join scoped_available sa
  )
  select
    b.time_period,
    b.input_start_date,
    b.input_end_date,
    case
      when p_system_id is not null and p_batch_id is not null then b.anchor_scope || ':system:batch'
      when p_system_id is not null then b.anchor_scope || ':system'
      when p_batch_id is not null then b.anchor_scope || ':batch'
      else b.anchor_scope
    end as anchor_scope,
    b.input_end_date as latest_available_date,
    b.available_from_date,
    b.requested_days,
    case
      when b.input_end_date is null or b.available_from_date is null then null::integer
      else (b.input_end_date - b.available_from_date + 1)::integer
    end as available_days,
    case
      when b.input_end_date is null or b.input_start_date is null then null::integer
      else (b.input_end_date - b.input_start_date + 1)::integer
    end as resolved_days,
    case
      when b.input_end_date is null then null::integer
      else greatest((current_date - b.input_end_date)::integer, 0)
    end as staleness_days,
    case
      when b.time_period = 'all history' then false
      when b.input_end_date is null or b.available_from_date is null or b.input_start_date is null then false
      else b.input_start_date > (b.input_end_date - (b.requested_days - 1))
    end as is_truncated
  from bounded b;
$function$
;

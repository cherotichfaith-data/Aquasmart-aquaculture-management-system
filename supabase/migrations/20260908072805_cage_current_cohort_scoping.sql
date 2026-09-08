-- Per-cage analytics must show only the *current* cohort: the ongoing
-- production cycle homed at that cage. Data before that cycle's start belongs
-- to a previous occupant (a closed cycle, or a cycle that has since moved on)
-- and must not appear in the cage's KPIs, tables, charts or time-period range.
--
-- private.system_cohort_start(system_id) is the single source of that anchor
-- (NULL for holding cages with no homed ongoing cycle -> no clamp). Every
-- per-cage analytics RPC applies it as a `>= coalesce(cohort_start, <date>)`
-- filter where it reads analytics.daily_system_facts / analytics.production_summary
-- / public.daily_water_quality_rating. Reports are intentionally left unscoped.
--
-- Applied to prod 2026-09-08. The three large function bodies are patched
-- in-place from their live source (pg_get_functiondef) so this migration does
-- not have to carry ~35 KB of verbatim SQL; the assertions fail loudly if the
-- expected join text is not found.

-- 1. The anchor -------------------------------------------------------------
create or replace function private.system_cohort_start(p_system_id bigint)
returns date
language sql
stable
set search_path to 'pg_catalog', 'public'
as $$
  select max(pc.cycle_start)
  from public.production_cycle pc
  where pc.system_id = p_system_id
    and pc.ongoing_cycle = true
$$;

comment on function private.system_cohort_start(bigint) is
  'Start date of the ongoing production cycle homed at this cage; NULL if none. Used to hide previous-cycle performance from per-cage analytics.';

-- 2. api_system_daily_trend: clamp the daily_system_facts scan ------------
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
where s.farm_id = p_farm_id
and dsf.inventory_date between v_start_date and v_end_date
and dsf.inventory_date >= coalesce(private.system_cohort_start(dsf.system_id), dsf.inventory_date)
and (p_system_ids is null or dsf.system_id = any(p_system_ids))
order by dsf.system_id, dsf.inventory_date;
end;
$function$;

-- 3. api_production_summary: clamp the production_summary scan ------------
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
and ps.date >= coalesce(private.system_cohort_start(ps.system_id), ps.date)
order by ps.date desc, ps.system_id desc;
$function$;

-- 4. api_dashboard_systems: clamp inv / ps_window / wq_window ------------
do $$
declare src text; nl text := chr(10); n int;
begin
  src := pg_get_functiondef('public.api_dashboard_systems(uuid,bigint[],system_growth_stage,date,date)'::regprocedure);
  if position('system_cohort_start' in src) > 0 then return; end if;
  src := replace(src,
    'on dsf.inventory_date between p.start_date and p.end_date' || nl || 'join sys on sys.system_id = dsf.system_id',
    'on dsf.inventory_date between p.start_date and p.end_date and dsf.inventory_date >= coalesce(private.system_cohort_start(dsf.system_id), dsf.inventory_date)' || nl || 'join sys on sys.system_id = dsf.system_id');
  src := replace(src,
    'on ps.date between p.start_date and p.end_date' || nl || 'join sys on sys.system_id = ps.system_id',
    'on ps.date between p.start_date and p.end_date and ps.date >= coalesce(private.system_cohort_start(ps.system_id), ps.date)' || nl || 'join sys on sys.system_id = ps.system_id');
  src := replace(src,
    'on wq.rating_date between p.start_date and p.end_date' || nl || 'join sys on sys.system_id = wq.system_id',
    'on wq.rating_date between p.start_date and p.end_date and wq.rating_date >= coalesce(private.system_cohort_start(wq.system_id), wq.rating_date)' || nl || 'join sys on sys.system_id = wq.system_id');
  select count(*) into n from regexp_matches(src, 'system_cohort_start', 'g');
  if n <> 3 then raise exception 'api_dashboard_systems: expected 3 clamp insertions, got %', n; end if;
  execute src;
end $$;

-- 5. api_dashboard_consolidated: clamp inv / ps_period / ps_latest / wq --
do $$
declare src text; nl text := chr(10); n int;
begin
  src := pg_get_functiondef('public.api_dashboard_consolidated(uuid,bigint[],system_growth_stage,date,date,text,integer,boolean)'::regprocedure);
  if position('system_cohort_start' in src) > 0 then return; end if;
  src := replace(src,
    'on dsf.inventory_date between p.start_date and p.end_date' || nl || 'join sys on sys.system_id = dsf.system_id',
    'on dsf.inventory_date between p.start_date and p.end_date and dsf.inventory_date >= coalesce(private.system_cohort_start(dsf.system_id), dsf.inventory_date)' || nl || 'join sys on sys.system_id = dsf.system_id');
  src := replace(src,
    'on ps.date between p.start_date and p.end_date' || nl || 'join sys on sys.system_id = ps.system_id',
    'on ps.date between p.start_date and p.end_date and ps.date >= coalesce(private.system_cohort_start(ps.system_id), ps.date)' || nl || 'join sys on sys.system_id = ps.system_id');
  src := replace(src,
    'on wq_row.rating_date between p.start_date and p.end_date' || nl || 'join sys on sys.system_id = wq_row.system_id',
    'on wq_row.rating_date between p.start_date and p.end_date and wq_row.rating_date >= coalesce(private.system_cohort_start(wq_row.system_id), wq_row.rating_date)' || nl || 'join sys on sys.system_id = wq_row.system_id');
  select count(*) into n from regexp_matches(src, 'system_cohort_start', 'g');
  if n <> 4 then raise exception 'api_dashboard_consolidated: expected 4 clamp refs, got %', n; end if;
  execute src;
end $$;

-- 6. api_time_period_bounds_scoped: clamp the per-scope first_data_date --
do $$
declare src text; n int;
begin
  src := pg_get_functiondef('public.api_time_period_bounds_scoped(uuid,text,text,date,bigint,bigint)'::regprocedure);
  if position('system_cohort_start' in src) > 0 then return; end if;
  src := replace(src,
    'join public.daily_water_quality_rating dwr on dwr.system_id = s.id
          where dwr.rating_date <= current_date',
    'join public.daily_water_quality_rating dwr on dwr.system_id = s.id
          where dwr.rating_date <= current_date
            and dwr.rating_date >= coalesce(private.system_cohort_start(s.id), dwr.rating_date)');
  src := replace(src,
    'join public.feeding_record fr on fr.system_id = s.id
          where fr.date <= current_date',
    'join public.feeding_record fr on fr.system_id = s.id
          where fr.date <= current_date
            and fr.date >= coalesce(private.system_cohort_start(s.id), fr.date)');
  src := replace(src,
    'join analytics.daily_system_facts d on d.system_id = s.id
          where d.inventory_date <= current_date',
    'join analytics.daily_system_facts d on d.system_id = s.id
          where d.inventory_date <= current_date
            and d.inventory_date >= coalesce(private.system_cohort_start(s.id), d.inventory_date)');
  select count(*) into n from regexp_matches(src, 'system_cohort_start', 'g');
  if n <> 3 then raise exception 'api_time_period_bounds_scoped: expected 3 clamps, got %', n; end if;
  execute src;
end $$;

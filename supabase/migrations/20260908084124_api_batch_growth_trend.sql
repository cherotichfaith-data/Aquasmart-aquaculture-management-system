-- Full-cycle growth series for one or more batches, from stocking through every
-- cage the batch's fish have moved through. Unlike api_production_summary (which
-- is cohort-clamped for per-cage views), this follows the batch: it selects
-- production_summary rows by the batch's own production_cycle, not by cage.
create or replace function public.api_batch_growth_trend(
  p_farm_id uuid,
  p_batch_ids bigint[],
  p_start_date date default null,
  p_end_date date default null
)
returns table(
  batch_id bigint,
  cycle_id bigint,
  system_id bigint,
  date date,
  activity text,
  average_body_weight double precision,
  number_of_fish_inventory double precision,
  agr double precision,
  sgr double precision,
  efcr_period double precision,
  days_in_period integer,
  biomass_increase_period double precision,
  target_weight_g double precision
)
language sql
stable
security definer
set search_path to 'pg_catalog', 'public', 'analytics'
as $$
  select
    pc.batch_id,
    ps.cycle_id,
    ps.system_id,
    ps.date,
    ps.activity,
    ps.average_body_weight::double precision,
    ps.number_of_fish_end::double precision as number_of_fish_inventory,
    ps.agr::double precision,
    ps.sgr::double precision,
    ps.efcr_period::double precision,
    ps.days_in_period::integer,
    ps.biomass_increase_over_period::double precision as biomass_increase_period,
    pc.target_weight_g::double precision
  from analytics.production_summary ps
  join public.production_cycle pc on pc.cycle_id = ps.cycle_id
  join public.system s on s.id = ps.system_id
  where s.farm_id = p_farm_id
    and private.is_farm_member(p_farm_id)
    and pc.batch_id = any(p_batch_ids)
    and (p_start_date is null or ps.date >= p_start_date)
    and (p_end_date is null or ps.date <= p_end_date)
  order by ps.date, ps.system_id;
$$;

alter function public.api_batch_growth_trend(uuid, bigint[], date, date) owner to postgres;
revoke all on function public.api_batch_growth_trend(uuid, bigint[], date, date) from public;
grant all on function public.api_batch_growth_trend(uuid, bigint[], date, date) to authenticated;
grant all on function public.api_batch_growth_trend(uuid, bigint[], date, date) to service_role;
comment on function public.api_batch_growth_trend(uuid, bigint[], date, date) is
  'L3. Full-cycle ABW/eFCR series per batch (by production_cycle, not by cage -- follows the fish across moves). Last reviewed: 2026-09. Owner: @aquasmart-backend';

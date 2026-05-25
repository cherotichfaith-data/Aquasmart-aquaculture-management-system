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
    ps.cycle_id::integer,
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

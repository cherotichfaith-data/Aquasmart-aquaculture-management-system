create or replace function public.api_system_options_rpc(
  p_farm_id uuid default null::uuid,
  p_stage public.system_growth_stage default null::public.system_growth_stage,
  p_active_only boolean default true
)
returns table(
  id bigint,
  label text,
  type text,
  growth_stage public.system_growth_stage,
  is_active boolean,
  farm_id uuid,
  farm_name text
)
language sql
stable
security definer
set search_path to 'pg_catalog', 'public', 'pg_temp'
as $$
  select s.id, s.name as label, s.type::text, s.growth_stage,
    coalesce(s.is_active, true) as is_active, s.farm_id, f.name as farm_name
  from public.system s
  join public.farm f on f.id = s.farm_id
  left join lateral (
    select min(fs.date) as first_stocking_date
    from public.fish_stocking fs
    where fs.system_id = s.id
  ) stocking on true
  left join lateral (
    select max(pc.cycle_start) as latest_cycle_start
    from public.production_cycle pc
    where pc.system_id = s.id
  ) cycle on true
  where (p_farm_id is null or s.farm_id = p_farm_id)
    and (p_stage is null or s.growth_stage = p_stage)
    and (not p_active_only or coalesce(s.is_active, true) = true)
    and (p_farm_id is null or private.is_farm_member(p_farm_id))
    and private.is_farm_member(s.farm_id)
  order by
    coalesce(s.is_active, true) desc,
    case
      when coalesce(s.is_active, true) then (stocking.first_stocking_date is not null)
      else true
    end desc,
    coalesce(stocking.first_stocking_date, cycle.latest_cycle_start, s.commissioned_at) desc nulls last,
    s.commissioned_at desc nulls last,
    s.id desc,
    s.name asc;
$$;

alter function public.api_system_options_rpc(
  uuid,
  public.system_growth_stage,
  boolean
) owner to postgres;

revoke all on function public.api_system_options_rpc(
  uuid,
  public.system_growth_stage,
  boolean
) from public;

grant all on function public.api_system_options_rpc(
  uuid,
  public.system_growth_stage,
  boolean
) to authenticated;

grant all on function public.api_system_options_rpc(
  uuid,
  public.system_growth_stage,
  boolean
) to service_role;

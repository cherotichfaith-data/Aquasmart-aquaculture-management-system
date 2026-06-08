drop function if exists public.api_fingerling_batch_options_rpc(uuid);

create or replace function public.api_fingerling_batch_options_rpc(
  p_farm_id uuid default null,
  p_active_only boolean default true
)
returns table(
  id bigint,
  farm_id uuid,
  system_id bigint,
  label text,
  date_of_delivery date,
  abw numeric,
  number_of_fish numeric,
  supplier_id bigint
)
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
select
  fb.id,
  fb.farm_id,
  active_cycle.system_id,
  coalesce(nullif(fb.name, ''), 'Batch #' || fb.id::text) as label,
  fb.date_of_delivery,
  fb.abw::numeric,
  fb.number_of_fish::numeric,
  fb.supplier_id
from public.fingerling_batch fb
join lateral (
  select pc.system_id
  from public.production_cycle pc
  where pc.batch_id = fb.id
    and pc.ongoing_cycle = true
  order by pc.cycle_start desc nulls last, pc.cycle_id desc
  limit 1
) active_cycle on true
where (p_farm_id is null or private.is_farm_member(p_farm_id))
  and (p_farm_id is null or fb.farm_id = p_farm_id)
  and exists (
    select 1
    from public.farm_user fu
    where fu.farm_id = fb.farm_id
      and fu.user_id = (select auth.uid())
  )
  and (
    coalesce(p_active_only, true) = false
    or exists (
      select 1
      from public.system s
      where s.id = active_cycle.system_id
        and s.farm_id = fb.farm_id
        and s.is_active = true
        and fb.date_of_delivery >= coalesce(s.commissioned_at, date '0001-01-01')
    )
    or exists (
      select 1
      from public.fish_stocking fs
      join public.system s on s.id = fs.system_id
      where fs.batch_id = fb.id
        and s.farm_id = fb.farm_id
        and s.is_active = true
        and fs.date >= coalesce(s.commissioned_at, date '0001-01-01')
    )
    or exists (
      select 1
      from public.fish_transfer ft
      join public.system s on s.id = ft.target_system_id
      where ft.batch_id = fb.id
        and s.farm_id = fb.farm_id
        and s.is_active = true
        and ft.date >= coalesce(s.commissioned_at, date '0001-01-01')
    )
  )
order by fb.date_of_delivery desc nulls last;
$$;

alter function public.api_fingerling_batch_options_rpc(uuid, boolean) owner to postgres;

revoke all on function public.api_fingerling_batch_options_rpc(uuid, boolean) from public;
grant all on function public.api_fingerling_batch_options_rpc(uuid, boolean) to authenticated;
grant all on function public.api_fingerling_batch_options_rpc(uuid, boolean) to service_role;

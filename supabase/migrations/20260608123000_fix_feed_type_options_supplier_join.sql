create or replace function public.api_feed_type_options_rpc(p_farm_id uuid)
returns table(
  id bigint,
  farm_id uuid,
  feed_line text,
  label text,
  feed_category text,
  feed_pellet_size text,
  crude_protein_percentage numeric,
  crude_fat_percentage numeric,
  visibility_scope text
)
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
  select
    ft.id,
    ft.farm_id,
    ft.feed_line,
    trim(both from concat_ws('  ', fs.company_name::text, ft.feed_line, ft.feed_category,
      ft.feed_pellet_size,
      case when ft.crude_protein_percentage is not null then 'CP ' || ft.crude_protein_percentage::text || '%' else null end,
      case when ft.crude_fat_percentage is not null then 'F ' || ft.crude_fat_percentage::text || '%' else null end
    )) as label,
    ft.feed_category::text,
    ft.feed_pellet_size::text,
    ft.crude_protein_percentage::numeric,
    ft.crude_fat_percentage::numeric,
    case
      when ft.farm_id = p_farm_id then 'farm'
      when exists (
        select 1
        from public.feed_inventory fi
        where fi.farm_id = p_farm_id
          and fi.feed_type_id = ft.id
      ) or exists (
        select 1
        from public.feeding_record fr
        join public.system s on s.id = fr.system_id
        where s.farm_id = p_farm_id
          and fr.feed_type_id = ft.id
      ) then 'farm_used'
      else 'shared_catalog'
    end as visibility_scope
  from public.feed_type ft
  left join public.feed_supplier fs on fs.id = ft.feed_supplier_id
  where private.is_farm_member(p_farm_id)
    and coalesce(ft.is_active, true)
    and (
      ft.farm_id is null
      or ft.farm_id = p_farm_id
      or exists (
        select 1
        from public.feed_inventory fi
        where fi.farm_id = p_farm_id
          and fi.feed_type_id = ft.id
      )
      or exists (
        select 1
        from public.feeding_record fr
        join public.system s on s.id = fr.system_id
        where s.farm_id = p_farm_id
          and fr.feed_type_id = ft.id
      )
    )
  order by
    case when ft.farm_id = p_farm_id then 0 else 1 end,
    ft.feed_line,
    ft.feed_pellet_size::text;
$function$;

alter function public.api_feed_type_options_rpc(uuid) owner to postgres;

revoke all on function public.api_feed_type_options_rpc(uuid) from public;
grant all on function public.api_feed_type_options_rpc(uuid) to authenticated;
grant all on function public.api_feed_type_options_rpc(uuid) to service_role;

comment on function public.api_feed_type_options_rpc(uuid)
  is 'Intentional app-facing SECURITY DEFINER RPC. Direct access to internal read models is revoked; callers must be authenticated and function body must enforce farm membership/scope checks.';

-- Supplier options for app forms should follow the same pattern as the
-- other option RPCs instead of relying on direct browser table reads.

create or replace function public.api_fingerling_supplier_options_rpc()
returns table(
  id bigint,
  company_name text,
  location_country text,
  location_city text
)
language sql
stable
security definer
set search_path to 'pg_catalog', 'public', 'pg_temp'
as $$
  select
    fs.id,
    fs.company_name,
    fs.location_country,
    fs.location_city
  from public.fingerling_supplier fs
  where exists (
    select 1
    from public.farm_user fu
    where fu.user_id = (select auth.uid())
  )
  order by fs.company_name asc, fs.id asc;
$$;

alter function public.api_fingerling_supplier_options_rpc() owner to postgres;

revoke all on function public.api_fingerling_supplier_options_rpc() from public;
grant all on function public.api_fingerling_supplier_options_rpc() to authenticated;
grant all on function public.api_fingerling_supplier_options_rpc() to service_role;

comment on function public.api_fingerling_supplier_options_rpc()
  is 'Intentional app-facing SECURITY DEFINER option RPC. Returns existing fingerling suppliers for authenticated farm members.';

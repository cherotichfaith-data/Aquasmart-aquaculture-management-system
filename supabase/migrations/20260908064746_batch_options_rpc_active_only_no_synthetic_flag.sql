-- The INFERRED-<cage> / BATCH-<n> fingerling_batch rows are real, closed
-- historical batches, not synthetic data. An "active batch" is simply one with
-- an ongoing production cycle -- exactly the gate this RPC already had before a
-- short-lived is_synthetic experiment (migrations 20260907145931/150012/150135,
-- since reverted). This restores the ongoing-cycle gate as the only filter.

drop function if exists "public"."api_fingerling_batch_options_rpc"("p_farm_id" "uuid", "p_active_only" boolean);

create function "public"."api_fingerling_batch_options_rpc"(
  "p_farm_id" "uuid" default null::"uuid",
  "p_active_only" boolean default true
) returns table(
  "id" bigint, "farm_id" "uuid", "system_id" bigint, "system_ids" bigint[],
  "label" "text", "date_of_delivery" "date", "abw" numeric, "number_of_fish" numeric, "supplier_id" bigint
)
  language "sql" stable security definer
  set "search_path" to 'pg_catalog', 'public'
  as $$
with batch_system_flows as (
  select fs.batch_id, fs.system_id, fs.number_of_fish_stocking::double precision as qty_delta
  from public.fish_stocking fs
  where fs.batch_id is not null and fs.system_id is not null and fs.date <= current_date
  union all
  select ft.batch_id, ft.target_system_id as system_id, ft.number_of_fish_transfer::double precision as qty_delta
  from public.fish_transfer ft
  where ft.batch_id is not null and ft.target_system_id is not null and ft.date <= current_date
  union all
  select ft.batch_id, ft.origin_system_id as system_id, -ft.number_of_fish_transfer::double precision as qty_delta
  from public.fish_transfer ft
  where ft.batch_id is not null and ft.origin_system_id is not null and ft.date <= current_date
  union all
  select fm.batch_id, fm.system_id, -fm.number_of_fish_mortality::double precision as qty_delta
  from public.fish_mortality fm
  where fm.batch_id is not null and fm.system_id is not null and fm.date <= current_date
  union all
  select fh.batch_id, fh.system_id, -coalesce(fh.number_of_fish_harvest, 0)::double precision as qty_delta
  from public.fish_harvest fh
  where fh.batch_id is not null and fh.system_id is not null and fh.date <= current_date
),
active_batch_systems as (
  select batch_system_flows.batch_id, batch_system_flows.system_id, sum(batch_system_flows.qty_delta) as fish_balance
  from batch_system_flows
  group by batch_system_flows.batch_id, batch_system_flows.system_id
  having sum(batch_system_flows.qty_delta) > 0
),
resolved_system as (
  select active_batch_systems.batch_id,
         case when count(*) = 1 then min(active_batch_systems.system_id)::bigint else null::bigint end as system_id,
         array_agg(distinct active_batch_systems.system_id::bigint) as system_ids
  from active_batch_systems
  group by active_batch_systems.batch_id
)
select
  fb.id, fb.farm_id, rs.system_id,
  coalesce(rs.system_ids, array[]::bigint[]) as system_ids,
  coalesce(nullif(fb.name, ''), 'Batch #' || fb.id::text) as label,
  fb.date_of_delivery, fb.abw::numeric, fb.number_of_fish::numeric, fb.supplier_id
from public.fingerling_batch fb
left join resolved_system rs on rs.batch_id = fb.id
where (p_farm_id is null or private.is_farm_member(p_farm_id))
  and (p_farm_id is null or fb.farm_id = p_farm_id)
  and exists (select 1 from public.farm_user fu where fu.farm_id = fb.farm_id and fu.user_id = (select auth.uid()))
  and exists (select 1 from public.production_cycle pc where pc.batch_id = fb.id and pc.ongoing_cycle = true)
  and (
    coalesce(p_active_only, true) = false
    or exists (
      select 1 from active_batch_systems abs
      join public.system s on s.id = abs.system_id
      where abs.batch_id = fb.id and s.farm_id = fb.farm_id and s.is_active = true
    )
  )
order by fb.date_of_delivery desc nulls last;
$$;

alter function "public"."api_fingerling_batch_options_rpc"("p_farm_id" "uuid", "p_active_only" boolean) owner to "postgres";
revoke all on function "public"."api_fingerling_batch_options_rpc"("p_farm_id" "uuid", "p_active_only" boolean) from public;
grant all on function "public"."api_fingerling_batch_options_rpc"("p_farm_id" "uuid", "p_active_only" boolean) to "authenticated";
grant all on function "public"."api_fingerling_batch_options_rpc"("p_farm_id" "uuid", "p_active_only" boolean) to "service_role";
comment on function "public"."api_fingerling_batch_options_rpc"("p_farm_id" "uuid", "p_active_only" boolean) is 'L3. Component: Batch Selector Dropdown. Active batches (those with an ongoing production cycle). Returns system_ids[]. Last reviewed: 2026-09. Owner: @aquasmart-backend';

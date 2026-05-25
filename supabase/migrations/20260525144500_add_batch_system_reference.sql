-- Track the intended cage for newly created batches before the stocking
-- event is recorded. Stocking and transfer records remain the source of
-- production lineage after fish are moved.
alter table public.fingerling_batch
  add column if not exists system_id bigint;

alter table public.fingerling_batch
  drop constraint if exists fingerling_batch_system_id_fkey;

alter table public.fingerling_batch
  add constraint fingerling_batch_system_id_fkey
  foreign key (system_id)
  references public.system(id)
  on update cascade
  not valid;

create index if not exists idx_fingerling_batch_system_id
  on public.fingerling_batch using btree (system_id);

with first_stocking as (
  select distinct on (fs.batch_id)
    fs.batch_id,
    fs.system_id
  from public.fish_stocking fs
  where fs.batch_id is not null
    and fs.system_id is not null
  order by fs.batch_id, fs.date asc, fs.id asc
)
update public.fingerling_batch fb
set system_id = first_stocking.system_id
from first_stocking
where fb.id = first_stocking.batch_id
  and fb.system_id is null;

alter table public.fingerling_batch
  validate constraint fingerling_batch_system_id_fkey;

drop policy if exists "fingerling_batch: insert by write roles" on public.fingerling_batch;

create policy "fingerling_batch: insert by write roles"
on public.fingerling_batch
for insert
to authenticated
with check (
  farm_id is not null
  and private.has_farm_role(
    farm_id,
    array['admin'::text, 'farm_manager'::text, 'system_operator'::text]
  )
  and (
    system_id is null
    or exists (
      select 1
      from public.system s
      where s.id = fingerling_batch.system_id
        and s.farm_id = fingerling_batch.farm_id
        and s.is_active = true
    )
  )
);

drop function if exists public.api_fingerling_batch_options_rpc(uuid);

create function public.api_fingerling_batch_options_rpc(p_farm_id uuid default null::uuid)
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
set search_path to 'pg_catalog', 'public', 'pg_temp'
as $$
  select
    fb.id,
    fb.farm_id,
    fb.system_id,
    coalesce(nullif(fb.name, ''), 'Batch #' || fb.id::text) as label,
    fb.date_of_delivery,
    fb.abw::numeric,
    fb.number_of_fish::numeric,
    fb.supplier_id
  from public.fingerling_batch fb
  where (p_farm_id is null or private.is_farm_member(p_farm_id))
    and (p_farm_id is null or fb.farm_id = p_farm_id)
    and exists (
      select 1
      from public.farm_user fu
      where fu.farm_id = fb.farm_id
        and fu.user_id = (select auth.uid())
    )
  order by fb.date_of_delivery desc nulls last;
$$;

alter function public.api_fingerling_batch_options_rpc(uuid) owner to postgres;

revoke all on function public.api_fingerling_batch_options_rpc(uuid) from public;
grant all on function public.api_fingerling_batch_options_rpc(uuid) to authenticated;
grant all on function public.api_fingerling_batch_options_rpc(uuid) to service_role;

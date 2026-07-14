-- A production cycle belongs to a fish batch. Systems are placement history only.

drop index if exists public.uq_one_active_cycle_per_system;

-- Create cycles for historically stocked batches that were incorrectly attached
-- to another batch's system-based cycle.
insert into public.production_cycle (
  system_id, batch_id, cycle_start, cycle_end, ongoing_cycle
)
select distinct on (fs.batch_id)
  fs.system_id,
  fs.batch_id,
  min(fs.date) over (partition by fs.batch_id),
  linked.cycle_end,
  linked.cycle_end is null
from public.fish_stocking fs
left join public.production_cycle existing on existing.batch_id = fs.batch_id
left join public.production_cycle linked on linked.cycle_id = fs.cycle_id
where existing.cycle_id is null
order by fs.batch_id, fs.date, fs.id;

-- Consolidate duplicate system-created cycles for the same batch into the
-- earliest cycle, preserving the full date span.
create temporary table cycle_merge on commit drop as
select
  cycle_id,
  first_value(cycle_id) over (
    partition by batch_id order by cycle_start, cycle_id
  ) as canonical_cycle_id,
  batch_id
from public.production_cycle;

update public.feeding_record r
set cycle_id = m.canonical_cycle_id
from cycle_merge m
where r.cycle_id = m.cycle_id and m.cycle_id <> m.canonical_cycle_id;

update public.fish_harvest r
set cycle_id = m.canonical_cycle_id
from cycle_merge m
where r.cycle_id = m.cycle_id and m.cycle_id <> m.canonical_cycle_id;

update public.fish_mortality r
set cycle_id = m.canonical_cycle_id
from cycle_merge m
where r.cycle_id = m.cycle_id and m.cycle_id <> m.canonical_cycle_id;

update public.fish_sampling_weight r
set cycle_id = m.canonical_cycle_id
from cycle_merge m
where r.cycle_id = m.cycle_id and m.cycle_id <> m.canonical_cycle_id;

update public.fish_stocking r
set cycle_id = m.canonical_cycle_id
from cycle_merge m
where r.cycle_id = m.cycle_id and m.cycle_id <> m.canonical_cycle_id;

update public.fish_transfer r
set cycle_id = m.canonical_cycle_id
from cycle_merge m
where r.cycle_id = m.cycle_id and m.cycle_id <> m.canonical_cycle_id;

with bounds as (
  select
    batch_id,
    min(cycle_start) as cycle_start,
    case when bool_or(cycle_end is null) then null else max(cycle_end) end as cycle_end
  from public.production_cycle
  group by batch_id
)
update public.production_cycle pc
set
  cycle_start = b.cycle_start,
  cycle_end = b.cycle_end,
  ongoing_cycle = b.cycle_end is null
from bounds b, cycle_merge m
where pc.cycle_id = m.canonical_cycle_id
  and pc.batch_id = b.batch_id
  and m.batch_id = b.batch_id;

delete from public.production_cycle pc
using cycle_merge m
where pc.cycle_id = m.cycle_id and m.cycle_id <> m.canonical_cycle_id;

-- system_id is retained only as the starting placement and must come from the
-- first stocking event, never from later movement.
with first_stocking as (
  select distinct on (batch_id) batch_id, system_id
  from public.fish_stocking
  order by batch_id, date, id
)
update public.production_cycle pc
set system_id = fs.system_id
from first_stocking fs
where fs.batch_id = pc.batch_id and pc.system_id is distinct from fs.system_id;

-- Repair any operation linked to a cycle for another batch.
update public.fish_stocking r
set cycle_id = pc.cycle_id
from public.production_cycle pc
where pc.batch_id = r.batch_id and r.cycle_id is distinct from pc.cycle_id;

create unique index uq_production_cycle_batch
  on public.production_cycle (batch_id);

alter table public.production_cycle
  add constraint production_cycle_cycle_batch_key unique (cycle_id, batch_id);

alter table public.feeding_record drop constraint if exists feeding_record_cycle_id_fkey;
alter table public.feeding_record add constraint feeding_record_cycle_batch_fkey
  foreign key (cycle_id, batch_id) references public.production_cycle (cycle_id, batch_id);
alter table public.fish_harvest drop constraint if exists fish_harvest_cycle_id_fkey;
alter table public.fish_harvest add constraint fish_harvest_cycle_batch_fkey
  foreign key (cycle_id, batch_id) references public.production_cycle (cycle_id, batch_id);
alter table public.fish_mortality drop constraint if exists fish_mortality_cycle_id_fkey;
alter table public.fish_mortality add constraint fish_mortality_cycle_batch_fkey
  foreign key (cycle_id, batch_id) references public.production_cycle (cycle_id, batch_id);
alter table public.fish_sampling_weight drop constraint if exists fish_sampling_weight_cycle_id_fkey;
alter table public.fish_sampling_weight add constraint fish_sampling_weight_cycle_batch_fkey
  foreign key (cycle_id, batch_id) references public.production_cycle (cycle_id, batch_id);
alter table public.fish_stocking drop constraint if exists fish_stocking_cycle_id_fkey;
alter table public.fish_stocking add constraint fish_stocking_cycle_batch_fkey
  foreign key (cycle_id, batch_id) references public.production_cycle (cycle_id, batch_id);
alter table public.fish_transfer drop constraint if exists fish_transfer_cycle_id_fkey;
alter table public.fish_transfer add constraint fish_transfer_cycle_batch_fkey
  foreign key (cycle_id, batch_id) references public.production_cycle (cycle_id, batch_id);

create or replace function public.ensure_cycle_on_stocking()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $$
declare
  resolved_cycle_id bigint;
  resolved_batch_id bigint;
begin
  if new.batch_id is null then
    raise exception 'fish_stocking.batch_id is required to start a production cycle';
  end if;

  if new.cycle_id is not null then
    select pc.cycle_id, pc.batch_id into resolved_cycle_id, resolved_batch_id
    from public.production_cycle pc where pc.cycle_id = new.cycle_id;
    if resolved_cycle_id is null or resolved_batch_id <> new.batch_id then
      raise exception 'Production cycle % does not belong to batch %', new.cycle_id, new.batch_id;
    end if;
  else
    select pc.cycle_id into resolved_cycle_id
    from public.production_cycle pc
    where pc.batch_id = new.batch_id;
  end if;

  if resolved_cycle_id is null then
    insert into public.production_cycle (system_id, batch_id, cycle_start, cycle_end, ongoing_cycle)
    values (new.system_id, new.batch_id, new.date, null, true)
    returning cycle_id into resolved_cycle_id;
  else
    update public.production_cycle
    set cycle_start = least(cycle_start, new.date)
    where cycle_id = resolved_cycle_id;
  end if;

  new.cycle_id := resolved_cycle_id;
  return new;
end;
$$;

create or replace function public.assign_operation_lineage_from_system()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $$
declare
  lineage record;
begin
  if new.cycle_id is not null then
    select pc.cycle_id, pc.batch_id into lineage
    from public.production_cycle pc where pc.cycle_id = new.cycle_id;
    if lineage.cycle_id is null then raise exception 'Unknown production cycle %', new.cycle_id; end if;
    if new.batch_id is not null and new.batch_id <> lineage.batch_id then
      raise exception 'Production cycle % belongs to batch %, not batch %', new.cycle_id, lineage.batch_id, new.batch_id;
    end if;
    new.batch_id := lineage.batch_id;
  elsif new.batch_id is not null then
    select pc.cycle_id, pc.batch_id into lineage
    from public.production_cycle pc where pc.batch_id = new.batch_id;
    if lineage.cycle_id is null then raise exception 'No production cycle exists for batch %', new.batch_id; end if;
    new.cycle_id := lineage.cycle_id;
  else
    select * into lineage
    from public.resolve_cycle_batch_for_system_date(new.system_id, new.date);
    if lineage.cycle_id is null then
      raise exception 'No stocked or transferred fish batch could be resolved for system % on %', new.system_id, new.date;
    end if;
    new.cycle_id := lineage.cycle_id;
    new.batch_id := lineage.batch_id;
  end if;
  return new;
end;
$$;

create or replace function public.assign_transfer_lineage_from_origin()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $$
declare
  lineage record;
begin
  if new.cycle_id is not null then
    select pc.cycle_id, pc.batch_id into lineage
    from public.production_cycle pc where pc.cycle_id = new.cycle_id;
    if lineage.cycle_id is null then raise exception 'Unknown production cycle %', new.cycle_id; end if;
    if new.batch_id is not null and new.batch_id <> lineage.batch_id then
      raise exception 'Production cycle % belongs to batch %, not batch %', new.cycle_id, lineage.batch_id, new.batch_id;
    end if;
    new.batch_id := lineage.batch_id;
  elsif new.batch_id is not null then
    select pc.cycle_id, pc.batch_id into lineage
    from public.production_cycle pc where pc.batch_id = new.batch_id;
    if lineage.cycle_id is null then raise exception 'No production cycle exists for batch %', new.batch_id; end if;
    new.cycle_id := lineage.cycle_id;
  else
    if new.origin_system_id is null then
      raise exception 'origin_system_id is required to resolve transfer batch lineage';
    end if;
    select * into lineage
    from public.resolve_cycle_batch_for_system_date(new.origin_system_id, new.date);
    if lineage.cycle_id is null then
      raise exception 'No fish batch could be resolved for transfer origin system % on %', new.origin_system_id, new.date;
    end if;
    new.cycle_id := lineage.cycle_id;
    new.batch_id := lineage.batch_id;
  end if;
  return new;
end;
$$;

create or replace function public.resolve_cycle_batch_for_system_date(p_system_id bigint, p_date date)
returns table(cycle_id integer, batch_id bigint)
language sql stable
set search_path to 'pg_catalog', 'public'
as $$
  select candidate.cycle_id::integer, candidate.batch_id
  from (
    select pc.cycle_id, pc.batch_id, 30 as priority, pc.cycle_start as event_date, pc.cycle_id as event_id
    from public.production_cycle pc
    where pc.system_id = p_system_id
      and p_date >= pc.cycle_start
      and p_date <= coalesce(pc.cycle_end, 'infinity'::date)

    union all

    select fs.cycle_id, fs.batch_id, 10, fs.date, fs.id
    from public.fish_stocking fs
    where fs.system_id = p_system_id
      and fs.date <= p_date
      and fs.cycle_id is not null
      and fs.batch_id is not null
      and not exists (
        select 1 from public.fish_transfer moved_out
        where moved_out.origin_system_id = p_system_id
          and moved_out.cycle_id = fs.cycle_id
          and moved_out.date > fs.date and moved_out.date <= p_date
      )

    union all

    select ft.cycle_id, ft.batch_id, 10, ft.date, ft.id
    from public.fish_transfer ft
    where ft.target_system_id = p_system_id
      and ft.date <= p_date
      and ft.cycle_id is not null
      and ft.batch_id is not null
      and not exists (
        select 1 from public.fish_transfer moved_out
        where moved_out.origin_system_id = p_system_id
          and moved_out.cycle_id = ft.cycle_id
          and moved_out.date > ft.date and moved_out.date <= p_date
      )
  ) candidate
  order by candidate.event_date desc, candidate.priority, candidate.event_id desc
  limit 1;
$$;

create or replace function public.close_cycle_on_final_harvest()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $$
declare
  resolved_cycle_id bigint;
begin
  if new.type_of_harvest <> 'final'::public.type_of_harvest then return null; end if;

  resolved_cycle_id := new.cycle_id;
  if resolved_cycle_id is null and new.batch_id is not null then
    select pc.cycle_id into resolved_cycle_id
    from public.production_cycle pc
    where pc.batch_id = new.batch_id;
  end if;
  if resolved_cycle_id is null then
    raise exception 'Final harvest on % for batch % has no production cycle', new.date, new.batch_id;
  end if;

  update public.production_cycle
  set cycle_end = new.date, ongoing_cycle = false
  where cycle_id = resolved_cycle_id
    and (cycle_end is null or cycle_end >= new.date);
  return null;
end;
$$;

-- Authorize cycles through their owning batch/farm, not their starting system.
drop policy if exists "production_cycle: delete by managers" on public.production_cycle;
drop policy if exists production_cycle_insert on public.production_cycle;
drop policy if exists production_cycle_select on public.production_cycle;
drop policy if exists production_cycle_update on public.production_cycle;

create policy production_cycle_select on public.production_cycle for select to authenticated
using (exists (
  select 1 from public.fingerling_batch fb
  join public.farm_user fu on fu.farm_id = fb.farm_id
  where fb.id = production_cycle.batch_id and fu.user_id = (select auth.uid())
));
create policy production_cycle_insert on public.production_cycle for insert to authenticated
with check (exists (
  select 1 from public.fingerling_batch fb
  join public.farm_user fu on fu.farm_id = fb.farm_id
  join public.system s on s.id = production_cycle.system_id and s.farm_id = fb.farm_id
  where fb.id = production_cycle.batch_id and fu.user_id = (select auth.uid())
));
create policy production_cycle_update on public.production_cycle for update to authenticated
using (exists (
  select 1 from public.fingerling_batch fb
  join public.farm_user fu on fu.farm_id = fb.farm_id
  where fb.id = production_cycle.batch_id and fu.user_id = (select auth.uid())
)) with check (exists (
  select 1 from public.fingerling_batch fb
  join public.farm_user fu on fu.farm_id = fb.farm_id
  join public.system s on s.id = production_cycle.system_id and s.farm_id = fb.farm_id
  where fb.id = production_cycle.batch_id and fu.user_id = (select auth.uid())
));
create policy "production_cycle: delete by managers" on public.production_cycle for delete to authenticated
using (exists (
  select 1 from public.fingerling_batch fb
  join public.farm_user fu on fu.farm_id = fb.farm_id
  where fb.id = production_cycle.batch_id
    and fu.user_id = (select auth.uid())
    and fu.role = any (array['admin'::text, 'farm_manager'::text])
));

comment on table public.production_cycle is
  'One biological production cycle per fish batch. system_id records the starting placement only; movements and splits are recorded by stocking/transfer/operation system fields.';

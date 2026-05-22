create or replace function public.resolve_cycle_batch_for_system_date(
  p_system_id bigint,
  p_date date
)
returns table(cycle_id int, batch_id bigint)
language sql
stable
set search_path to 'pg_catalog', 'public'
as $$
  select candidate.cycle_id, candidate.batch_id
  from (
    select
      pc.cycle_id,
      pc.batch_id,
      1 as priority,
      pc.cycle_start as event_date,
      pc.cycle_id::bigint as event_id
    from public.production_cycle pc
    where pc.system_id = p_system_id
      and p_date >= pc.cycle_start
      and p_date <= coalesce(pc.cycle_end, 'infinity'::date)

    union all

    select
      ft.cycle_id,
      ft.batch_id,
      2 as priority,
      ft.date as event_date,
      ft.id::bigint as event_id
    from public.fish_transfer ft
    where ft.target_system_id = p_system_id
      and ft.date <= p_date
      and ft.cycle_id is not null
      and ft.batch_id is not null
      and not exists (
        select 1
        from public.fish_transfer moved_out
        where moved_out.origin_system_id = p_system_id
          and moved_out.cycle_id = ft.cycle_id
          and moved_out.date > ft.date
          and moved_out.date <= p_date
      )
  ) as candidate
  order by candidate.priority, candidate.event_date desc, candidate.event_id desc
  limit 1;
$$;

create or replace function public.assign_operation_lineage_from_system()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $$
declare
  lineage record;
begin
  if new.cycle_id is null or new.batch_id is null then
    select *
      into lineage
    from public.resolve_cycle_batch_for_system_date(new.system_id, new.date);

    if lineage.cycle_id is null or lineage.batch_id is null then
      raise exception 'No stocked or transferred fish batch could be resolved for system % on %', new.system_id, new.date;
    end if;

    new.cycle_id := coalesce(new.cycle_id, lineage.cycle_id);
    new.batch_id := coalesce(new.batch_id, lineage.batch_id);
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
  if new.cycle_id is null or new.batch_id is null then
    if new.origin_system_id is null then
      raise exception 'origin_system_id is required to resolve transfer batch lineage';
    end if;

    select *
      into lineage
    from public.resolve_cycle_batch_for_system_date(new.origin_system_id, new.date);

    if lineage.cycle_id is null or lineage.batch_id is null then
      raise exception 'No stocked or transferred fish batch could be resolved for transfer origin system % on %', new.origin_system_id, new.date;
    end if;

    new.cycle_id := coalesce(new.cycle_id, lineage.cycle_id);
    new.batch_id := coalesce(new.batch_id, lineage.batch_id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_feeding_record_assign_lineage on public.feeding_record;
create trigger trg_feeding_record_assign_lineage
before insert or update of system_id, date, cycle_id, batch_id
on public.feeding_record
for each row
execute function public.assign_operation_lineage_from_system();

drop trigger if exists trg_fish_mortality_assign_lineage on public.fish_mortality;
create trigger trg_fish_mortality_assign_lineage
before insert or update of system_id, date, cycle_id, batch_id
on public.fish_mortality
for each row
execute function public.assign_operation_lineage_from_system();

drop trigger if exists trg_fish_sampling_weight_assign_lineage on public.fish_sampling_weight;
create trigger trg_fish_sampling_weight_assign_lineage
before insert or update of system_id, date, cycle_id, batch_id
on public.fish_sampling_weight
for each row
execute function public.assign_operation_lineage_from_system();

drop trigger if exists trg_fish_harvest_assign_lineage on public.fish_harvest;
create trigger trg_fish_harvest_assign_lineage
before insert or update of system_id, date, cycle_id, batch_id
on public.fish_harvest
for each row
execute function public.assign_operation_lineage_from_system();

drop trigger if exists trg_fish_transfer_assign_lineage on public.fish_transfer;
create trigger trg_fish_transfer_assign_lineage
before insert or update of origin_system_id, date, cycle_id, batch_id
on public.fish_transfer
for each row
execute function public.assign_transfer_lineage_from_origin();

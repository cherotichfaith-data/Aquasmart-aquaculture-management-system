create or replace function public.ensure_cycle_on_stocking()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $$
declare
  open_cycle_id int;
begin
  if new.batch_id is null then
    raise exception 'fish_stocking.batch_id is required to start a production cycle';
  end if;

  select pc.cycle_id
    into open_cycle_id
  from public.production_cycle pc
  where pc.system_id = new.system_id
    and pc.cycle_end is null
  order by pc.cycle_start desc, pc.cycle_id desc
  limit 1;

  if open_cycle_id is null then
    insert into public.production_cycle(system_id, batch_id, cycle_start, cycle_end, ongoing_cycle)
    values (new.system_id, new.batch_id, new.date, null, true)
    returning cycle_id into open_cycle_id;
  else
    update public.production_cycle pc
    set batch_id = coalesce(pc.batch_id, new.batch_id)
    where pc.cycle_id = open_cycle_id
      and pc.batch_id is null;
  end if;

  update public.fish_stocking fs
  set cycle_id = open_cycle_id,
      batch_id = new.batch_id
  where fs.id = new.id
    and (fs.cycle_id is distinct from open_cycle_id
      or fs.batch_id is distinct from new.batch_id);

  return null;
end;
$$;

alter table public.production_cycle
  alter column batch_id set not null;

alter table public.fish_stocking
  alter column batch_id set not null;

alter table public.fish_stocking
  alter column cycle_id set not null;

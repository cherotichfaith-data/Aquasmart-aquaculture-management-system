alter table public.fish_harvest
  add constraint fish_harvest_system_id_fkey
    foreign key (system_id) references public.system(id) on update cascade not valid;

alter table public.fish_harvest
  validate constraint fish_harvest_system_id_fkey;

update public.fish_harvest
set abw = (total_weight_harvest * 1000.0) / number_of_fish_harvest
where number_of_fish_harvest is not null
  and number_of_fish_harvest > 0
  and total_weight_harvest > 0
  and (
    abw is null
    or abs(abw - ((total_weight_harvest * 1000.0) / number_of_fish_harvest)) > 0.0001
  );

create or replace function public.set_harvest_abw()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $$
begin
  if new.number_of_fish_harvest is null or new.number_of_fish_harvest <= 0 then
    raise exception 'number_of_fish_harvest must be greater than zero';
  end if;

  if new.total_weight_harvest <= 0 then
    raise exception 'total_weight_harvest must be greater than zero';
  end if;

  new.abw := (new.total_weight_harvest * 1000.0) / new.number_of_fish_harvest;

  return new;
end;
$$;

drop trigger if exists trg_fish_harvest_set_abw on public.fish_harvest;
create trigger trg_fish_harvest_set_abw
before insert or update of number_of_fish_harvest, total_weight_harvest, abw
on public.fish_harvest
for each row
execute function public.set_harvest_abw();

create or replace function public.close_cycle_on_final_harvest()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $$
declare
  resolved_cycle_id int;
begin
  if new.type_of_harvest <> 'final'::public.type_of_harvest then
    return null;
  end if;

  resolved_cycle_id := new.cycle_id;

  if resolved_cycle_id is null then
    select pc.cycle_id
      into resolved_cycle_id
    from public.production_cycle pc
    where pc.system_id = new.system_id
      and pc.cycle_end is null
      and pc.cycle_start <= new.date
    order by pc.cycle_start desc, pc.cycle_id desc
    limit 1;
  end if;

  if resolved_cycle_id is null then
    raise exception 'Final harvest on % for system % but no production cycle exists.', new.date, new.system_id;
  end if;

  update public.production_cycle pc
  set cycle_end = new.date,
      ongoing_cycle = false
  where pc.cycle_id = resolved_cycle_id
    and (pc.cycle_end is null or pc.cycle_end >= new.date);

  return null;
end;
$$;

alter table public.fish_harvest
  add constraint fish_harvest_positive_count
    check (number_of_fish_harvest is not null and number_of_fish_harvest > 0) not valid,
  add constraint fish_harvest_positive_weight
    check (total_weight_harvest > 0) not valid,
  add constraint fish_harvest_batch_required
    check (batch_id is not null) not valid,
  add constraint fish_harvest_cycle_required
    check (cycle_id is not null) not valid,
  add constraint fish_harvest_abw_matches_total
    check (
      number_of_fish_harvest is null
      or number_of_fish_harvest <= 0
      or abs(abw - ((total_weight_harvest * 1000.0) / number_of_fish_harvest)) <= 0.01
    ) not valid;

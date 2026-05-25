-- Keep production cycle lineage assigned by the database, using the
-- operational source of truth from stocking and transfer records.

create or replace function public.ensure_cycle_on_stocking()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $$
declare
  resolved_cycle_id int;
begin
  if new.batch_id is null then
    raise exception 'fish_stocking.batch_id is required to start a production cycle';
  end if;

  resolved_cycle_id := new.cycle_id;

  if resolved_cycle_id is null then
    select pc.cycle_id
      into resolved_cycle_id
    from public.production_cycle pc
    where pc.system_id = new.system_id
      and pc.batch_id = new.batch_id
      and new.date >= pc.cycle_start
      and new.date <= coalesce(pc.cycle_end, 'infinity'::date)
    order by
      case when pc.cycle_end is null then 0 else 1 end,
      pc.cycle_start desc,
      pc.cycle_id desc
    limit 1;
  end if;

  if resolved_cycle_id is null then
    insert into public.production_cycle(system_id, batch_id, cycle_start, cycle_end, ongoing_cycle)
    values (new.system_id, new.batch_id, new.date, null, true)
    returning cycle_id into resolved_cycle_id;
  end if;

  update public.production_cycle pc
  set batch_id = new.batch_id,
      cycle_start = least(pc.cycle_start, new.date),
      ongoing_cycle = (pc.cycle_end is null)
  where pc.cycle_id = resolved_cycle_id
    and (
      pc.batch_id is distinct from new.batch_id
      or pc.cycle_start > new.date
      or pc.ongoing_cycle is distinct from (pc.cycle_end is null)
    );

  new.cycle_id := resolved_cycle_id;
  return new;
end;
$$;

drop trigger if exists trg_cycle_on_stocking on public.fish_stocking;
create trigger trg_cycle_on_stocking
before insert or update of system_id, batch_id, date, cycle_id
on public.fish_stocking
for each row
execute function public.ensure_cycle_on_stocking();

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
      20 as priority,
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
      10 as priority,
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
  order by candidate.event_date desc, candidate.priority asc, candidate.event_id desc
  limit 1;
$$;

with resolved as (
  select fs.id, pc.cycle_id
  from public.fish_stocking fs
  join lateral (
    select pc.cycle_id
    from public.production_cycle pc
    where pc.system_id = fs.system_id
      and pc.batch_id = fs.batch_id
      and fs.date >= pc.cycle_start
      and fs.date <= coalesce(pc.cycle_end, 'infinity'::date)
    order by
      case when pc.cycle_end is null then 0 else 1 end,
      pc.cycle_start desc,
      pc.cycle_id desc
    limit 1
  ) pc on true
)
update public.fish_stocking fs
set cycle_id = resolved.cycle_id
from resolved
where fs.id = resolved.id
  and fs.cycle_id is distinct from resolved.cycle_id;

with resolved as (
  select fr.id, lineage.cycle_id, lineage.batch_id
  from public.feeding_record fr
  join lateral public.resolve_cycle_batch_for_system_date(fr.system_id, fr.date) lineage on true
)
update public.feeding_record fr
set cycle_id = resolved.cycle_id,
    batch_id = resolved.batch_id
from resolved
where fr.id = resolved.id
  and (fr.cycle_id is distinct from resolved.cycle_id or fr.batch_id is distinct from resolved.batch_id);

with resolved as (
  select fm.id, lineage.cycle_id, lineage.batch_id
  from public.fish_mortality fm
  join lateral public.resolve_cycle_batch_for_system_date(fm.system_id, fm.date) lineage on true
)
update public.fish_mortality fm
set cycle_id = resolved.cycle_id,
    batch_id = resolved.batch_id
from resolved
where fm.id = resolved.id
  and (fm.cycle_id is distinct from resolved.cycle_id or fm.batch_id is distinct from resolved.batch_id);

with resolved as (
  select fsw.id, lineage.cycle_id, lineage.batch_id
  from public.fish_sampling_weight fsw
  join lateral public.resolve_cycle_batch_for_system_date(fsw.system_id, fsw.date) lineage on true
)
update public.fish_sampling_weight fsw
set cycle_id = resolved.cycle_id,
    batch_id = resolved.batch_id,
    abw = case
      when fsw.number_of_fish_sampling > 0 and fsw.total_weight_sampling > 0
        then (fsw.total_weight_sampling * 1000.0) / fsw.number_of_fish_sampling
      else fsw.abw
    end
from resolved
where fsw.id = resolved.id
  and (fsw.cycle_id is distinct from resolved.cycle_id or fsw.batch_id is distinct from resolved.batch_id);

with resolved as (
  select fh.id, lineage.cycle_id, lineage.batch_id
  from public.fish_harvest fh
  join lateral public.resolve_cycle_batch_for_system_date(fh.system_id, fh.date) lineage on true
)
update public.fish_harvest fh
set cycle_id = resolved.cycle_id,
    batch_id = resolved.batch_id,
    abw = case
      when fh.number_of_fish_harvest > 0 and fh.total_weight_harvest > 0
        then (fh.total_weight_harvest * 1000.0) / fh.number_of_fish_harvest
      else fh.abw
    end
from resolved
where fh.id = resolved.id
  and fh.number_of_fish_harvest > 0
  and fh.total_weight_harvest > 0
  and (fh.cycle_id is distinct from resolved.cycle_id or fh.batch_id is distinct from resolved.batch_id);

with resolved as (
  select ft.id, lineage.cycle_id, lineage.batch_id
  from public.fish_transfer ft
  join lateral public.resolve_cycle_batch_for_system_date(ft.origin_system_id, ft.date) lineage on true
  where ft.origin_system_id is not null
)
update public.fish_transfer ft
set cycle_id = resolved.cycle_id,
    batch_id = resolved.batch_id
from resolved
where ft.id = resolved.id
  and (ft.cycle_id is distinct from resolved.cycle_id or ft.batch_id is distinct from resolved.batch_id);

do $$
begin
  refresh materialized view analytics.daily_system_facts_cache;
  refresh materialized view analytics.production_summary;
  refresh materialized view analytics.efcr_period_last_sampling_view;
exception
  when undefined_table then
    null;
end;
$$;

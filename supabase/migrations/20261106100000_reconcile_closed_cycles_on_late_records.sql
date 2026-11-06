-- Keep the automatic final-harvest reconciliation correct when records change after the final
-- harvest was saved (late mortality, edited harvest, extra transfer, manual reconciliation...).
--
-- private.closed_cycle_remaining(cycle, cage)  -> fish still on the books at that cage's final
--   harvest, ignoring the automatic reconciliation itself (null when the cage has no final harvest).
-- private.reconcile_closed_cycle(cycle, cage)  -> replaces the automatic reconciliation so the
--   batch closes to exactly zero.
-- Row triggers on every table that moves the count call it for closed cycles only.

create or replace function private.closed_cycle_remaining(p_cycle_id bigint, p_system_id bigint)
returns table (final_date date, batch_id bigint, remaining bigint)
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  c_start date;
  c_ongoing boolean;
begin
  select cycle_start, ongoing_cycle into c_start, c_ongoing from public.production_cycle where cycle_id = p_cycle_id;
  if not found or c_ongoing then return; end if;

  select max(h.date), (array_agg(h.batch_id order by h.date desc))[1]
    into final_date, batch_id
    from public.fish_harvest h
   where h.cycle_id = p_cycle_id and h.system_id = p_system_id and h.type_of_harvest = 'final'::public.type_of_harvest;
  if final_date is null or batch_id is null then return; end if;

  remaining :=
      coalesce((select sum(number_of_fish_stocking) from public.fish_stocking
                 where cycle_id = p_cycle_id and system_id = p_system_id and date between c_start and final_date), 0)
    + coalesce((select sum(number_of_fish_transfer) from public.fish_transfer
                 where cycle_id = p_cycle_id and target_system_id = p_system_id
                   and origin_system_id is distinct from target_system_id and date between c_start and final_date), 0)
    - coalesce((select sum(number_of_fish_transfer) from public.fish_transfer
                 where cycle_id = p_cycle_id and origin_system_id = p_system_id
                   and target_system_id is distinct from origin_system_id and date between c_start and final_date), 0)
    + coalesce((select sum(fish_delta) from public.fish_inventory_reconciliation
                 where cycle_id = p_cycle_id and system_id = p_system_id
                   and reconciliation_date between c_start and final_date
                   and not (reason = 'count_difference' and notes like 'Auto-reconciled at final harvest%')), 0)
    - coalesce((select sum(number_of_fish_mortality) from public.fish_mortality
                 where cycle_id = p_cycle_id and system_id = p_system_id and date between c_start and final_date), 0)
    - coalesce((select sum(number_of_fish_harvest) from public.fish_harvest
                 where cycle_id = p_cycle_id and system_id = p_system_id and date between c_start and final_date), 0);
  return next;
end; $function$;

create or replace function private.reconcile_closed_cycle(p_cycle_id bigint, p_system_id bigint)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
declare r record;
begin
  if p_cycle_id is null or p_system_id is null then return; end if;

  delete from public.fish_inventory_reconciliation
   where cycle_id = p_cycle_id and system_id = p_system_id
     and reason = 'count_difference' and notes like 'Auto-reconciled at final harvest%';

  select * into r from private.closed_cycle_remaining(p_cycle_id, p_system_id);
  if r.final_date is null or r.remaining is null or r.remaining = 0 then return; end if;

  insert into public.fish_inventory_reconciliation
    (system_id, batch_id, cycle_id, reconciliation_date, calculated_fish, confirmed_fish, fish_delta, reason, notes)
  values
    (p_system_id, r.batch_id, p_cycle_id, r.final_date, r.remaining, 0, -r.remaining, 'count_difference',
     'Auto-reconciled at final harvest on ' || r.final_date || ': ' || r.remaining ||
     ' fish were still on the books after the final harvest and are unaccounted for.');
end; $function$;

-- The close trigger only closes the cycle; reconciliation is handled by the row triggers below
-- (they fire after it: trigger names run alphabetically).
create or replace function public.close_cycle_on_final_harvest()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $function$
declare resolved_cycle_id bigint;
begin
  if new.type_of_harvest <> 'final'::public.type_of_harvest then return null; end if;
  resolved_cycle_id := new.cycle_id;
  if resolved_cycle_id is null and new.batch_id is not null then
    select pc.cycle_id into resolved_cycle_id from public.production_cycle pc where pc.batch_id = new.batch_id;
  end if;
  if resolved_cycle_id is null then
    raise exception 'Final harvest on % for batch % has no production cycle', new.date, new.batch_id;
  end if;
  update public.production_cycle set cycle_end = new.date, ongoing_cycle = false
   where cycle_id = resolved_cycle_id and (cycle_end is null or cycle_end >= new.date);
  return null;
end; $function$;

create or replace function private.reconcile_closed_cycle_trg()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
begin
  -- Ignore the automatic reconciliation's own writes.
  if tg_table_name = 'fish_inventory_reconciliation' then
    if (tg_op <> 'INSERT' and old.reason = 'count_difference' and old.notes like 'Auto-reconciled at final harvest%')
       or (tg_op <> 'DELETE' and new.reason = 'count_difference' and new.notes like 'Auto-reconciled at final harvest%') then
      return null;
    end if;
  end if;
  if tg_op <> 'INSERT' then perform private.reconcile_closed_cycle(old.cycle_id, old.system_id); end if;
  if tg_op <> 'DELETE' then perform private.reconcile_closed_cycle(new.cycle_id, new.system_id); end if;
  return null;
end; $function$;

create or replace function private.reconcile_closed_cycle_transfer_trg()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
begin
  if tg_op <> 'INSERT' then
    perform private.reconcile_closed_cycle(old.cycle_id, old.origin_system_id);
    perform private.reconcile_closed_cycle(old.cycle_id, old.target_system_id);
  end if;
  if tg_op <> 'DELETE' then
    perform private.reconcile_closed_cycle(new.cycle_id, new.origin_system_id);
    perform private.reconcile_closed_cycle(new.cycle_id, new.target_system_id);
  end if;
  return null;
end; $function$;

drop trigger if exists trg_reconcile_closed_cycle on public.fish_harvest;
create trigger trg_reconcile_closed_cycle after insert or update or delete on public.fish_harvest
  for each row execute function private.reconcile_closed_cycle_trg();
drop trigger if exists trg_reconcile_closed_cycle on public.fish_mortality;
create trigger trg_reconcile_closed_cycle after insert or update or delete on public.fish_mortality
  for each row execute function private.reconcile_closed_cycle_trg();
drop trigger if exists trg_reconcile_closed_cycle on public.fish_stocking;
create trigger trg_reconcile_closed_cycle after insert or update or delete on public.fish_stocking
  for each row execute function private.reconcile_closed_cycle_trg();
drop trigger if exists trg_reconcile_closed_cycle on public.fish_inventory_reconciliation;
create trigger trg_reconcile_closed_cycle after insert or update or delete on public.fish_inventory_reconciliation
  for each row execute function private.reconcile_closed_cycle_trg();
drop trigger if exists trg_reconcile_closed_cycle on public.fish_transfer;
create trigger trg_reconcile_closed_cycle after insert or update or delete on public.fish_transfer
  for each row execute function private.reconcile_closed_cycle_transfer_trg();

-- A final harvest ends the cycle in that cage, so any fish still on the books after it are
-- unaccounted for. Record them as a reconciliation (count_difference, confirmed = 0) so the
-- batch closes to exactly zero and appears in the batch-harvest analytics.
--
-- Idempotent: re-firing the trigger (edited final harvest, re-save) replaces the previous
-- automatic reconciliation for that cycle + cage instead of stacking another one.
create or replace function public.close_cycle_on_final_harvest()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  resolved_cycle_id bigint;
  resolved_start date;
  remaining bigint;
begin
  if new.type_of_harvest <> 'final'::public.type_of_harvest then return null; end if;
  resolved_cycle_id := new.cycle_id;
  if resolved_cycle_id is null and new.batch_id is not null then
    select pc.cycle_id into resolved_cycle_id from public.production_cycle pc where pc.batch_id = new.batch_id;
  end if;
  if resolved_cycle_id is null then
    raise exception 'Final harvest on % for batch % has no production cycle', new.date, new.batch_id;
  end if;

  update public.production_cycle
     set cycle_end = new.date, ongoing_cycle = false
   where cycle_id = resolved_cycle_id and (cycle_end is null or cycle_end >= new.date);

  -- Unaccounted fish left in this cage after the final harvest.
  if new.system_id is not null and new.batch_id is not null then
    select cycle_start into resolved_start from public.production_cycle where cycle_id = resolved_cycle_id;

    delete from public.fish_inventory_reconciliation
     where cycle_id = resolved_cycle_id and system_id = new.system_id
       and reason = 'count_difference' and notes like 'Auto-reconciled at final harvest%';

    select
      coalesce((select sum(number_of_fish_stocking) from public.fish_stocking
                 where cycle_id = resolved_cycle_id and system_id = new.system_id
                   and date between resolved_start and new.date), 0)
    + coalesce((select sum(number_of_fish_transfer) from public.fish_transfer
                 where cycle_id = resolved_cycle_id and target_system_id = new.system_id
                   and origin_system_id is distinct from target_system_id
                   and date between resolved_start and new.date), 0)
    - coalesce((select sum(number_of_fish_transfer) from public.fish_transfer
                 where cycle_id = resolved_cycle_id and origin_system_id = new.system_id
                   and target_system_id is distinct from origin_system_id
                   and date between resolved_start and new.date), 0)
    + coalesce((select sum(fish_delta) from public.fish_inventory_reconciliation
                 where cycle_id = resolved_cycle_id and system_id = new.system_id
                   and reconciliation_date between resolved_start and new.date), 0)
    - coalesce((select sum(number_of_fish_mortality) from public.fish_mortality
                 where cycle_id = resolved_cycle_id and system_id = new.system_id
                   and date between resolved_start and new.date), 0)
    - coalesce((select sum(number_of_fish_harvest) from public.fish_harvest
                 where cycle_id = resolved_cycle_id and system_id = new.system_id
                   and date between resolved_start and new.date), 0)
    into remaining;

    if remaining <> 0 then
      insert into public.fish_inventory_reconciliation
        (system_id, batch_id, cycle_id, reconciliation_date, calculated_fish, confirmed_fish, fish_delta, reason, notes)
      values
        (new.system_id, new.batch_id, resolved_cycle_id, new.date, remaining, 0, -remaining, 'count_difference',
         'Auto-reconciled at final harvest on ' || new.date || ': ' || remaining ||
         ' fish were still on the books after the final harvest and are unaccounted for.');
    end if;
  end if;
  return null;
end; $function$;

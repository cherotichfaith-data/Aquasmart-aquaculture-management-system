-- A cage that empties through a final harvest or a reconciliation was left "occupied":
--  1. current_fish_count ignored reconciliations, so fish removed by a reconciliation still counted.
--  2. sync_cage_status only ran on stocking / mortality / transfers, never on harvests or reconciliations.
create or replace function public.current_fish_count(p_system_id bigint)
returns numeric
language sql
stable
as $function$
  select
      coalesce((select sum(number_of_fish_stocking) from public.fish_stocking where system_id = p_system_id), 0)
    + coalesce((select sum(number_of_fish_transfer)  from public.fish_transfer  where target_system_id = p_system_id), 0)
    - coalesce((select sum(number_of_fish_transfer)  from public.fish_transfer  where origin_system_id = p_system_id), 0)
    - coalesce((select sum(number_of_fish_mortality) from public.fish_mortality where system_id = p_system_id), 0)
    - coalesce((select sum(number_of_fish_harvest)   from public.fish_harvest   where system_id = p_system_id), 0)
    + coalesce((select sum(fish_delta)               from public.fish_inventory_reconciliation where system_id = p_system_id), 0);
$function$;

drop trigger if exists trg_sync_cage_status_harvest on public.fish_harvest;
create trigger trg_sync_cage_status_harvest after insert or update or delete on public.fish_harvest
  for each row execute function public.sync_cage_status();

drop trigger if exists trg_sync_cage_status_reconciliation on public.fish_inventory_reconciliation;
create trigger trg_sync_cage_status_reconciliation after insert or update or delete on public.fish_inventory_reconciliation
  for each row execute function public.sync_cage_status();

-- Refresh every non-retired cage once (only cages that were already empty but marked occupied change).
update public.system s
   set cage_status = case when public.current_fish_count(s.id) > 0 then 'occupied'::public.cage_status_enum
                          else 'available'::public.cage_status_enum end
 where s.cage_status <> 'retired'::public.cage_status_enum
   and s.cage_status is distinct from case when public.current_fish_count(s.id) > 0 then 'occupied'::public.cage_status_enum
                                           else 'available'::public.cage_status_enum end;

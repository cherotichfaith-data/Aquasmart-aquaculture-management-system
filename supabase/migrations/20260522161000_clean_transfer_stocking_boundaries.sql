-- Stocking from hatchery/supplier/external source is not a transfer. Preserve those
-- historical entry events as stocking rows before removing them from transfer history.
-- These rows already have corrected historical cycle links, so the normal stocking
-- cycle creation trigger is paused only for this data repair.
alter table public.fish_stocking disable trigger trg_cycle_on_stocking;

insert into public.fish_stocking (
  date,
  system_id,
  number_of_fish_stocking,
  total_weight_stocking,
  abw,
  batch_id,
  type_of_stocking,
  notes,
  cycle_id,
  local_id,
  synced_at
)
select
  ft.date,
  ft.target_system_id,
  ft.number_of_fish_transfer::bigint,
  coalesce(ft.total_weight_transfer, public.transfer_weight_kg(ft.total_weight_transfer, ft.number_of_fish_transfer, ft.abw)),
  coalesce(ft.abw, case when ft.number_of_fish_transfer > 0 and ft.total_weight_transfer is not null then (ft.total_weight_transfer * 1000.0) / ft.number_of_fish_transfer end),
  ft.batch_id,
  'already_stocked'::public.type_of_stocking,
  nullif(concat_ws(
    ' ',
    'Migrated from transfer import.',
    'Origin:',
    nullif(btrim(ft.external_origin_name), ''),
    nullif(btrim(ft.notes), '')
  ), ''),
  ft.cycle_id,
  'migrated-transfer-import-' || ft.id::text,
  coalesce(ft.synced_at, now())
from public.fish_transfer ft
where ft.origin_system_id is null
  and ft.target_system_id is not null
  and ft.batch_id is not null
  and ft.cycle_id is not null
on conflict (local_id) do nothing;

alter table public.fish_stocking enable trigger trg_cycle_on_stocking;

delete from public.fish_transfer
where origin_system_id is null;

alter table public.fish_transfer
  alter column target_system_id drop not null;

update public.fish_transfer
set target_system_id = null
where transfer_type = 'external_out';

create or replace function public.transfer_impacts_efcr(
  p_transfer_type public.transfer_type,
  p_origin_system_id bigint,
  p_target_system_id bigint
)
returns boolean
language sql
immutable
set search_path to 'pg_catalog', 'public'
as $$
  select case
    when coalesce(
      p_transfer_type::text,
      case when p_origin_system_id = p_target_system_id then 'count_check' else 'transfer' end
    ) in ('transfer', 'grading', 'density_thinning', 'external_out') then true
    else false
  end;
$$;

alter table public.fish_transfer
  drop constraint if exists fish_transfer_origin_present_check,
  add constraint fish_transfer_origin_required
    check (origin_system_id is not null) not valid,
  add constraint fish_transfer_batch_required
    check (batch_id is not null) not valid,
  add constraint fish_transfer_cycle_required
    check (cycle_id is not null) not valid,
  add constraint fish_transfer_movement_type
    check (transfer_type in ('transfer', 'grading', 'density_thinning', 'external_out')) not valid,
  add constraint fish_transfer_no_external_origin
    check (external_origin_name is null) not valid,
  add constraint fish_transfer_target_boundary
    check (
      (
        transfer_type = 'external_out'
        and target_system_id is null
        and nullif(btrim(external_target_name), '') is not null
      )
      or (
        transfer_type in ('transfer', 'grading', 'density_thinning')
        and target_system_id is not null
        and target_system_id <> origin_system_id
      )
    ) not valid;

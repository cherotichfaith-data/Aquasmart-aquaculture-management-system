-- Monthly workbook evidence is separate from daily operational events to prevent double counting.
create table public.production_workbook_import (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farm(id),
  source_name text not null,
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  as_of date not null,
  settings jsonb not null,
  formula_errors jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  unique(farm_id, sha256),
  unique(id, farm_id)
);
create table public.production_workbook_month (
  import_id uuid not null,
  farm_id uuid not null,
  source_slot integer not null check(source_slot > 0),
  month date not null check(extract(day from month) = 1),
  batch_name text not null,
  cage_name text not null,
  stocked_on date not null,
  stock_input_no numeric,
  mortality_no numeric,
  abw_end_kg numeric,
  feed_kg numeric,
  source_cells jsonb not null,
  model_values jsonb not null,
  primary key(import_id, source_slot, month),
  foreign key(import_id, farm_id) references public.production_workbook_import(id, farm_id)
);
create index production_workbook_month_farm_month on public.production_workbook_month(farm_id, month);
alter table public.production_workbook_import enable row level security;
alter table public.production_workbook_month enable row level security;
revoke all on public.production_workbook_import, public.production_workbook_month from anon, authenticated;
grant select on public.production_workbook_import, public.production_workbook_month to authenticated;
grant all on public.production_workbook_import, public.production_workbook_month to service_role;
create policy workbook_import_read on public.production_workbook_import for select to authenticated
using (exists(select 1 from public.farm_user f where f.farm_id = production_workbook_import.farm_id and f.user_id = (select auth.uid())));
create policy workbook_month_read on public.production_workbook_month for select to authenticated
using (exists(select 1 from public.farm_user f where f.farm_id = production_workbook_month.farm_id and f.user_id = (select auth.uid())));

-- Saved farm-specific inputs for the existing live forward planning workflow.
create table public.production_planning_settings (
  farm_id uuid primary key references public.farm(id),
  planned_fish integer not null check(planned_fish between 0 and 10000000),
  planned_abw_g numeric not null check(planned_abw_g between 0.1 and 100),
  scenario text not null check(scenario in ('main','slow','potential')),
  updated_at timestamptz not null default now()
);
alter table public.production_planning_settings enable row level security;
revoke all on public.production_planning_settings from anon, authenticated;
grant select, insert, update on public.production_planning_settings to authenticated;
grant all on public.production_planning_settings to service_role;
create policy planning_settings_read on public.production_planning_settings for select to authenticated
using (exists(select 1 from public.farm_user f where f.farm_id = production_planning_settings.farm_id and f.user_id = (select auth.uid())));
create policy planning_settings_insert on public.production_planning_settings for insert to authenticated
with check (private.has_farm_role(farm_id, array['admin','farm_manager']));
create policy planning_settings_update on public.production_planning_settings for update to authenticated
using (private.has_farm_role(farm_id, array['admin','farm_manager']))
with check (private.has_farm_role(farm_id, array['admin','farm_manager']));

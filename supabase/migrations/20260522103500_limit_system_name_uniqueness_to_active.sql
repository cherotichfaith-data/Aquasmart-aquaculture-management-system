alter table public.system
  drop constraint if exists system_name_farm_unique;

drop index if exists public.system_name_farm_unique;

create unique index if not exists system_active_name_farm_unique
  on public.system (farm_id, name)
  where is_active is true;

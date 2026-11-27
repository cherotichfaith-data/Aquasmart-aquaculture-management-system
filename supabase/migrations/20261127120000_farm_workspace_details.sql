alter table public.farm
  add column farming_environment text check (farming_environment in ('lake', 'land', 'both')),
  add column main_species text;

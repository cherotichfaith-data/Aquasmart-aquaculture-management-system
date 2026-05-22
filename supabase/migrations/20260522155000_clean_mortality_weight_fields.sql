alter table public.fish_mortality
  drop column if exists avg_dead_wt_g,
  drop column if exists abw,
  drop column if exists recorded_by;

alter table public.fish_mortality
  drop constraint if exists fish_mortality_total_weight_nonnegative;

alter table public.fish_mortality
  add constraint fish_mortality_total_weight_nonnegative
  check (total_weight_mortality is null or total_weight_mortality >= 0)
  not valid;

alter table public.fish_mortality
  drop constraint if exists fish_mortality_mass_weight_required;

alter table public.fish_mortality
  add constraint fish_mortality_mass_weight_required
  check (number_of_fish_mortality < 100 or total_weight_mortality is not null)
  not valid;

comment on column public.fish_mortality.total_weight_mortality is
  'Total dead fish weight in kg. Required for new mass mortality records of 100 or more fish.';

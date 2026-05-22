alter table public.feeding_record
  add column if not exists synced_at timestamp with time zone;

alter table public.fish_mortality
  add column if not exists synced_at timestamp with time zone;

alter table public.fish_sampling_weight
  add column if not exists synced_at timestamp with time zone;

alter table public.fish_stocking
  add column if not exists synced_at timestamp with time zone;

alter table public.fish_harvest
  add column if not exists synced_at timestamp with time zone;

alter table public.fish_transfer
  add column if not exists synced_at timestamp with time zone;

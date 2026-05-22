update public.fish_sampling_weight
set total_weight_sampling = total_weight_sampling / 1000.0
where number_of_fish_sampling > 0
  and abs(abw - (total_weight_sampling / number_of_fish_sampling)) <= 1
  and (total_weight_sampling / number_of_fish_sampling) > 0;

create or replace function public.set_sampling_weight_abw()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $$
begin
  if new.number_of_fish_sampling is null or new.number_of_fish_sampling <= 0 then
    raise exception 'number_of_fish_sampling must be greater than zero';
  end if;

  if new.total_weight_sampling is null or new.total_weight_sampling <= 0 then
    raise exception 'total_weight_sampling must be greater than zero';
  end if;

  -- Historical imports sometimes used grams for total sample weight. Normalize
  -- impossible kg-per-fish values before calculating ABW.
  if (new.total_weight_sampling / new.number_of_fish_sampling) > 20 then
    new.total_weight_sampling := new.total_weight_sampling / 1000.0;
  end if;

  new.abw := (new.total_weight_sampling * 1000.0) / new.number_of_fish_sampling;

  return new;
end;
$$;

drop trigger if exists trg_fish_sampling_weight_set_abw on public.fish_sampling_weight;
create trigger trg_fish_sampling_weight_set_abw
before insert or update of number_of_fish_sampling, total_weight_sampling, abw
on public.fish_sampling_weight
for each row
execute function public.set_sampling_weight_abw();

alter table public.fish_sampling_weight
  drop constraint if exists fish_sampling_weight_abw_matches_sample;

alter table public.fish_sampling_weight
  add constraint fish_sampling_weight_abw_matches_sample
  check (abs(abw - ((total_weight_sampling * 1000.0) / nullif(number_of_fish_sampling, 0))) <= 0.01)
  not valid;

alter table public.fish_sampling_weight
  drop constraint if exists fish_sampling_weight_batch_required;

alter table public.fish_sampling_weight
  add constraint fish_sampling_weight_batch_required
  check (batch_id is not null)
  not valid;

alter table public.fish_sampling_weight
  drop constraint if exists fish_sampling_weight_cycle_required;

alter table public.fish_sampling_weight
  add constraint fish_sampling_weight_cycle_required
  check (cycle_id is not null)
  not valid;

comment on table public.fish_sampling_weight is
  'Monthly fish growth sampling records. Each row stores the sampled fish count, total sample weight in kg, and derived ABW in grams for the stocked batch production cycle.';

comment on column public.fish_sampling_weight.total_weight_sampling is
  'Total weight of sampled fish in kg.';

comment on column public.fish_sampling_weight.abw is
  'Average body weight in grams, derived from total_weight_sampling and number_of_fish_sampling.';

alter table public.production_cycle
  add column if not exists batch_id bigint;

alter table public.production_cycle
  drop constraint if exists production_cycle_batch_id_fkey;

update public.fish_stocking fs
set cycle_id = pc.cycle_id
from public.production_cycle pc
where fs.cycle_id is null
  and pc.system_id = fs.system_id
  and fs.date >= pc.cycle_start
  and fs.date <= coalesce(pc.cycle_end, 'infinity'::date);

with first_stocking as (
  select distinct on (fs.cycle_id)
    fs.cycle_id,
    fs.batch_id
  from public.fish_stocking fs
  where fs.cycle_id is not null
    and fs.batch_id is not null
  order by fs.cycle_id, fs.date asc, fs.id asc
)
update public.production_cycle pc
set batch_id = first_stocking.batch_id
from first_stocking
where pc.cycle_id = first_stocking.cycle_id
  and pc.batch_id is distinct from first_stocking.batch_id;

update public.feeding_record fr
set cycle_id = pc.cycle_id
from public.production_cycle pc
where fr.cycle_id is null
  and fr.system_id = pc.system_id
  and fr.date >= pc.cycle_start
  and fr.date <= coalesce(pc.cycle_end, 'infinity'::date);

update public.fish_mortality fm
set cycle_id = pc.cycle_id
from public.production_cycle pc
where fm.cycle_id is null
  and fm.system_id = pc.system_id
  and fm.date >= pc.cycle_start
  and fm.date <= coalesce(pc.cycle_end, 'infinity'::date);

update public.fish_sampling_weight fsw
set cycle_id = pc.cycle_id
from public.production_cycle pc
where fsw.cycle_id is null
  and fsw.system_id = pc.system_id
  and fsw.date >= pc.cycle_start
  and fsw.date <= coalesce(pc.cycle_end, 'infinity'::date);

update public.fish_harvest fh
set cycle_id = pc.cycle_id
from public.production_cycle pc
where fh.cycle_id is null
  and fh.system_id = pc.system_id
  and fh.date >= pc.cycle_start
  and fh.date <= coalesce(pc.cycle_end, 'infinity'::date);

update public.fish_transfer ft
set cycle_id = pc.cycle_id
from public.production_cycle pc
where ft.cycle_id is null
  and ft.origin_system_id = pc.system_id
  and ft.date >= pc.cycle_start
  and ft.date <= coalesce(pc.cycle_end, 'infinity'::date);

update public.feeding_record fr
set batch_id = pc.batch_id
from public.production_cycle pc
where fr.batch_id is null
  and fr.cycle_id = pc.cycle_id
  and pc.batch_id is not null;

update public.fish_mortality fm
set batch_id = pc.batch_id
from public.production_cycle pc
where fm.batch_id is null
  and fm.cycle_id = pc.cycle_id
  and pc.batch_id is not null;

update public.fish_sampling_weight fsw
set batch_id = pc.batch_id
from public.production_cycle pc
where fsw.batch_id is null
  and fsw.cycle_id = pc.cycle_id
  and pc.batch_id is not null;

update public.fish_harvest fh
set batch_id = pc.batch_id
from public.production_cycle pc
where fh.batch_id is null
  and fh.cycle_id = pc.cycle_id
  and pc.batch_id is not null;

update public.fish_transfer ft
set batch_id = pc.batch_id
from public.production_cycle pc
where ft.batch_id is null
  and ft.cycle_id = pc.cycle_id
  and pc.batch_id is not null;

alter table public.production_cycle
  add constraint production_cycle_batch_id_fkey
  foreign key (batch_id)
  references public.fingerling_batch(id)
  on update cascade
  not valid;

alter table public.production_cycle
  validate constraint production_cycle_batch_id_fkey;

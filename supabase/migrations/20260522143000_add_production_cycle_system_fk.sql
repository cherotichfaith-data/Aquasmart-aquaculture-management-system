do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'production_cycle_system_id_fkey'
      and conrelid = 'public.production_cycle'::regclass
  ) then
    alter table public.production_cycle
      add constraint production_cycle_system_id_fkey
      foreign key (system_id)
      references public.system(id)
      on update cascade
      not valid;
  end if;
end $$;

alter table public.production_cycle
  validate constraint production_cycle_system_id_fkey;

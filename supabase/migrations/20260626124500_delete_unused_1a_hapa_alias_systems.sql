do $$
declare
  v_target_ids bigint[];
  v_ref record;
  v_ref_count bigint;
begin
  if not exists (
    select 1
    from public.system
    where name = '1A'
  ) then
    raise exception 'Cannot delete 1A hapa aliases because system 1A does not exist';
  end if;

  select coalesce(array_agg(id order by id), '{}'::bigint[])
  into v_target_ids
  from public.system
  where name in ('1A Hapa 1', '1A Hapa 2');

  if coalesce(array_length(v_target_ids, 1), 0) = 0 then
    raise notice 'No 1A hapa alias systems found to delete';
    return;
  end if;

  begin
    for v_ref in
      select
        n.nspname as schema_name,
        cls.relname as table_name,
        att.attname as column_name
      from pg_constraint c
      join pg_class cls on cls.oid = c.conrelid
      join pg_namespace n on n.oid = cls.relnamespace
      join unnest(c.conkey) with ordinality as k(attnum, ord) on true
      join pg_attribute att on att.attrelid = c.conrelid and att.attnum = k.attnum
      where c.contype = 'f'
        and c.confrelid = 'public.system'::regclass
        and not (
          n.nspname = 'public'
          and cls.relname in ('_affected_systems', 'system_name_change_log')
        )
      order by n.nspname, cls.relname, att.attname
    loop
      execute format(
        'select count(*) from %I.%I where %I = any ($1)',
        v_ref.schema_name,
        v_ref.table_name,
        v_ref.column_name
      )
      into v_ref_count
      using v_target_ids;

      if v_ref_count > 0 then
        raise exception
          'Cannot delete 1A hapa alias systems because %.%(%) still references them (% rows)',
          v_ref.schema_name,
          v_ref.table_name,
          v_ref.column_name,
          v_ref_count;
      end if;
    end loop;

    delete from public._affected_systems
    where system_id = any (v_target_ids);

    delete from public.system_name_change_log
    where system_id = any (v_target_ids);

    alter table public.system disable trigger refresh_after_system;

    delete from public.system
    where id = any (v_target_ids);

    alter table public.system enable trigger refresh_after_system;
  exception
    when others then
      alter table public.system enable trigger refresh_after_system;
      raise;
  end;
end $$;

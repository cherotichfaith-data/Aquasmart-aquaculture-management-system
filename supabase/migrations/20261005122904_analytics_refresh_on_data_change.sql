-- Refresh analytics.daily_system_facts then analytics.production_summary shortly after any
-- source-table change, instead of waiting for two unsynchronised fixed-interval cron jobs
-- (which also raced each other: both ran at :00/:30, so the summary could read stale facts).

create schema if not exists private;

create table if not exists private.analytics_refresh_state (
  id boolean primary key default true check (id),
  dirty boolean not null default false,
  marked_at timestamptz,
  refreshed_at timestamptz
);
insert into private.analytics_refresh_state (id) values (true) on conflict (id) do nothing;
revoke all on private.analytics_refresh_state from public, anon, authenticated;

create or replace function private.mark_analytics_dirty()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, private
as $$
begin
  update private.analytics_refresh_state
     set dirty = true, marked_at = now()
   where id and not dirty;
  return null;
end;
$$;
revoke all on function private.mark_analytics_dirty() from public, anon, authenticated;

create or replace function private.refresh_analytics_if_dirty(p_force boolean default false)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, private, analytics
as $$
declare
  v_run boolean;
begin
  if not pg_try_advisory_xact_lock(hashtext('analytics_refresh')) then
    return false;
  end if;

  -- Clear the flag first so changes made while refreshing mark it again. If a refresh
  -- fails this transaction rolls back and the flag stays set for the next run.
  update private.analytics_refresh_state
     set dirty = false
   where id and (dirty or p_force)
  returning true into v_run;

  if v_run is null then
    return false;
  end if;

  refresh materialized view analytics.daily_system_facts;
  refresh materialized view analytics.production_summary;

  update private.analytics_refresh_state set refreshed_at = now() where id;
  return true;
end;
$$;
revoke all on function private.refresh_analytics_if_dirty(boolean) from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'feeding_record', 'fingerling_batch', 'fish_harvest', 'fish_mortality',
    'fish_sampling_weight', 'fish_stocking', 'fish_transfer', 'production_cycle'
  ] loop
    execute format('drop trigger if exists trg_mark_analytics_dirty on public.%I', t);
    execute format(
      'create trigger trg_mark_analytics_dirty after insert or update or delete on public.%I
         for each statement execute function private.mark_analytics_dirty()', t);
  end loop;
end $$;

-- Replace the two fixed-interval jobs with: a once-a-minute dirty check (facts, then summary)
-- plus a half-hourly forced refresh as a safety net.
do $$
declare
  j record;
begin
  for j in select jobid from cron.job
            where command in ('REFRESH MATERIALIZED VIEW analytics.production_summary',
                              'REFRESH MATERIALIZED VIEW analytics.daily_system_facts')
  loop
    perform cron.unschedule(j.jobid);
  end loop;
end $$;

select cron.schedule('analytics-refresh-if-dirty', '* * * * *', 'select private.refresh_analytics_if_dirty()');
select cron.schedule('analytics-refresh-safety', '*/30 * * * *', 'select private.refresh_analytics_if_dirty(true)');

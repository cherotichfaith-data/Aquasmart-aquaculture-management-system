-- Daily planner -> Activity planner.
--
-- The daily planner (separate app) saves each report into public.daily_report. Its forward-looking parts
-- (tomorrow's priority actions with an owner, and the task list for the next 7 days) now become planned
-- activities in public.activity_planner automatically, so the Activity planner on the dashboard, its reminders
-- and its done/planned status all work on them.
--
--   * Tomorrow's priority actions -> planning_window 'tomorrow', scheduled the day after the report date,
--     notes carry the owner. One activity per distinct action per report date.
--   * Task list for the next 7 days -> planning_window 'this_week', scheduled on the Friday of the week that
--     starts tomorrow. The same list is repeated in most daily reports, so it is de-duplicated per week.
--   * Re-saving a report updates the imported rows; anything already marked done is left alone, and tomorrow
--     actions that were removed from a report are removed again unless done.
--
-- No new tables: two marker columns on activity_planner, one unique index, one trigger function.

alter table public.activity_planner
  add column if not exists source text,
  add column if not exists source_key text;

create unique index if not exists activity_planner_source_key_uidx
  on public.activity_planner (farm_id, source, source_key)
  where source is not null;

create or replace function public.tg_daily_report_import_activities()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $$
declare
  v_farm uuid;
  v_user uuid;
  v_week_start date;
  v_keys text[] := '{}';
  r record;
begin
  -- The daily planner is used by one farm, Tanlake Samaki.
  select f.id into v_farm from public.farm f where f.name = 'Tanlake Samaki' limit 1;
  if v_farm is null then return new; end if;

  -- activity_planner.created_by is required: use the farm's longest-standing admin.
  select fu.user_id into v_user
  from public.farm_user fu
  where fu.farm_id = v_farm and fu.role = 'admin'
  order by fu.created_at nulls last, fu.id
  limit 1;
  if v_user is null then return new; end if;

  -- Tomorrow's priority actions.
  for r in
    select left(btrim(a.value ->> 'text'), 120) as title,
           nullif(btrim(coalesce(a.value ->> 'owner', '')), '') as owner,
           lower(regexp_replace(btrim(a.value ->> 'text'), '\s+', ' ', 'g')) as norm
    from jsonb_array_elements(case when jsonb_typeof(new.payload -> 'tomorrowActions') = 'array' then new.payload -> 'tomorrowActions' else '[]'::jsonb end) a
    where btrim(coalesce(a.value ->> 'text', '')) <> ''
  loop
    v_keys := v_keys || ('tomorrow:' || new.report_date || ':' || r.norm);
    insert into public.activity_planner (farm_id, created_by, title, notes, scheduled_date, planning_window, source, source_key)
    values (v_farm, v_user, r.title,
            coalesce('Owner: ' || r.owner || '. ', '') || 'From the daily report of ' || new.report_date || '.',
            new.report_date + 1, 'tomorrow', 'daily_report', 'tomorrow:' || new.report_date || ':' || r.norm)
    on conflict (farm_id, source, source_key) where source is not null
    do update set title = excluded.title, notes = excluded.notes
      where activity_planner.status = 'planned';
  end loop;

  -- Actions taken out of this report again (and not done yet) are removed from the planner.
  delete from public.activity_planner ap
  where ap.farm_id = v_farm and ap.source = 'daily_report' and ap.status = 'planned'
    and ap.source_key like 'tomorrow:' || new.report_date || ':%'
    and not (ap.source_key = any (v_keys));

  -- Task list for the next 7 days, de-duplicated per week (Mon-Sun week that contains tomorrow).
  v_week_start := date_trunc('week', (new.report_date + 1)::timestamp)::date;
  for r in
    select left(btrim(regexp_replace(t.line, '^\s*(\d+\s*[\.\)]|[-*\u2022])\s*', '')), 120) as title
    from regexp_split_to_table(coalesce(new.payload -> 'plan' ->> 'weekTasks', ''), E'[\r\n]+') as t(line)
  loop
    continue when btrim(coalesce(r.title, '')) = '';
    insert into public.activity_planner (farm_id, created_by, title, notes, scheduled_date, planning_window, source, source_key)
    values (v_farm, v_user, r.title,
            'From the daily planner task list for the week of ' || v_week_start || '.',
            v_week_start + 4, 'this_week', 'daily_report',
            'week:' || v_week_start || ':' || lower(regexp_replace(btrim(r.title), '\s+', ' ', 'g')))
    on conflict (farm_id, source, source_key) where source is not null do nothing;
  end loop;

  return new;
end
$$;

drop trigger if exists daily_report_import_activities on public.daily_report;
create trigger daily_report_import_activities
  after insert or update of payload on public.daily_report
  for each row execute function public.tg_daily_report_import_activities();

revoke all on function public.tg_daily_report_import_activities() from public;

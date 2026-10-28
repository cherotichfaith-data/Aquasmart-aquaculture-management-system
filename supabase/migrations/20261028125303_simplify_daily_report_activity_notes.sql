-- Imported activities: tomorrow's actions say who is responsible; the weekly tasks are just the action.
-- (The "From daily report" tag in the planner already says where they came from.)
do $mig$
declare
  def text;
  new text;
begin
  select pg_get_functiondef(p.oid) into def
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'tg_daily_report_import_activities';
  if def is null then raise exception 'tg_daily_report_import_activities not found'; end if;

  new := replace(def,
    $a$coalesce('Owner: ' || r.owner || '. ', '') || 'From the daily report of ' || new.report_date || '.'$a$,
    $b$coalesce('Responsible person: ' || r.owner, '')$b$);
  if new = def then raise exception 'anchor not found: tomorrow notes'; end if;

  def := new;
  new := replace(def,
    $a$'From the daily planner task list for the week of ' || v_week_start || '.'$a$,
    $b$''$b$);
  if new = def then raise exception 'anchor not found: weekly notes'; end if;

  execute new;
end
$mig$;

update public.activity_planner
set notes = case
      when source_key like 'tomorrow:%'
        then coalesce('Responsible person: ' || nullif(substring(notes from '^Owner: (.*)\. From the daily report'), ''), '')
      else ''
    end
where source = 'daily_report';

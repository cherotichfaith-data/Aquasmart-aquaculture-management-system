-- Allow Growth Analysis to request measured history through the report cutoff.
do $migration$
declare
  definition text := pg_get_functiondef(
    'public.api_analytics_performance(uuid,date,date,date,text[],text)'::regprocedure
  );
  period_filter constant text := $old$where p.date >= b.date_in and (not coalesce('growth_custom' = any(p_sections), false) or p.date >= (select s from pb))$old$;
  history_filter constant text := $new$where p.date >= b.date_in and (coalesce('abw_history' = any(p_sections), false) or not coalesce('growth_custom' = any(p_sections), false) or p.date >= (select s from pb))$new$;
begin
  if strpos(definition, history_filter) > 0 then
    return;
  end if;
  if strpos(definition, period_filter) = 0 then
    raise exception 'Expected weight-at-age reporting filter was not found';
  end if;
  execute replace(definition, period_filter, history_filter);
end;
$migration$;

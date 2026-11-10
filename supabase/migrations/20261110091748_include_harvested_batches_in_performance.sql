-- Include batches harvested in the reporting period even after cycle closure.
do $migration$
declare
  definition text := pg_get_functiondef(
    'public.api_analytics_performance(uuid,date,date,date,text[],text)'::regprocedure
  );
  active_only constant text := 'where exists (select 1 from public.production_cycle pc where pc.batch_id = base.batch_id and pc.cycle_start <= (select e from bounds) and pc.ongoing_cycle = true)';
  include_harvested constant text := 'where (base.harv_n_m > 0 or exists (select 1 from public.production_cycle pc where pc.batch_id = base.batch_id and pc.cycle_start <= (select e from bounds) and pc.ongoing_cycle = true))';
begin
  if strpos(definition, include_harvested) > 0 then
    return;
  end if;
  if strpos(definition, active_only) = 0 then
    raise exception 'Expected batch performance eligibility predicate was not found';
  end if;
  execute replace(definition, active_only, include_harvested);
end;
$migration$;

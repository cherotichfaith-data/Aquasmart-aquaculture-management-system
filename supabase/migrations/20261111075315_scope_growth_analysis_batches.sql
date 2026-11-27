-- Archived cohort identifiers remain available to harvest reports, but never enter growth charts.
-- Cycle growth includes cycles active at the selected cutoff; monthly reports retain valid closed batches.
DO $migration$
DECLARE
  definition text := pg_get_functiondef('public.api_analytics_performance(uuid,date,date,date,text[],text)'::regprocedure);
  anchor constant text := $old$from batch_rows r left join stk s on s.batch_id = r.batch_id where r.batch_id is not null$old$;
BEGIN
  IF (length(definition) - length(replace(definition, anchor, ''))) / length(anchor) <> 1 THEN
    RAISE EXCEPTION 'Growth batch eligibility anchor did not match exactly once';
  END IF;
  definition := replace(definition, anchor, $new$from batch_rows r left join stk s on s.batch_id = r.batch_id where r.batch_id is not null
    and r.batch_name !~* '^(BATCH-|INFERRED-)'
    and (coalesce('growth_custom' = any(p_sections), false) or exists (
      select 1 from public.production_cycle pc
      where pc.batch_id = r.batch_id and pc.cycle_start <= (select e from pb)
        and ((pc.cycle_end is null and pc.ongoing_cycle) or pc.cycle_end > (select e from pb))
    ))$new$);
  EXECUTE definition;
END $migration$;

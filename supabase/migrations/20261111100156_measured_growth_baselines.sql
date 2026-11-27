-- Every batch uses the same recorded-weight interval calculation.
-- A single opening measurement is a baseline, not evidence of growth.
DO $migration$
DECLARE
  definition text := pg_get_functiondef('public.api_analytics_performance(uuid,date,date,date,text[],text)'::regprocedure);
  growth_anchor constant text := 'rm.gain::double precision as growth_kg';
  total_anchor constant text := 'case when bool_and(r.growth_kg is not null) then sum(r.growth_kg) end, case when bool_and(r.feed_kg is not null)';
BEGIN
  IF (length(definition)-length(replace(definition,growth_anchor,'')))/length(growth_anchor)<>1
    OR (length(definition)-length(replace(definition,total_anchor,'')))/length(total_anchor)<>1 THEN
    RAISE EXCEPTION 'Expected growth baseline anchors were not found exactly once';
  END IF;
  definition := replace(definition,growth_anchor,'em.period_gain::double precision as growth_kg');
  definition := replace(definition,total_anchor,'sum(r.growth_kg), case when bool_and(r.feed_kg is not null)');
  EXECUTE definition;
END $migration$;

-- Detailed Batch Report and its growth series use currently active batches only.
-- Keep period calculations, access checks and completed-cage harvests unchanged.
DO $migration$
DECLARE
  definition text;
BEGIN
  definition := pg_get_functiondef('public.api_analytics_performance(uuid,date,date,date,text[],text)'::regprocedure);
  IF position('(pc.ongoing_cycle or pc.cycle_end >= (select s from bounds))' in definition) = 0 THEN
    RAISE EXCEPTION 'Expected batch cycle filter not found';
  END IF;
  EXECUTE replace(definition, '(pc.ongoing_cycle or pc.cycle_end >= (select s from bounds))', 'pc.ongoing_cycle = true');
END
$migration$;

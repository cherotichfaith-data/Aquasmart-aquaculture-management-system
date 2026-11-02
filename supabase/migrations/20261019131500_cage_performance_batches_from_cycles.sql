-- /analytics cage performance: take a cage's batches from its ongoing production cycles (a batch's cycle follows it
-- into the cage it is transferred to), not from the single batch tag on analytics.daily_system_facts, which labels
-- a mixed-batch cage (e.g. G1E) with only one batch per day. Feed fed is then summed over every batch in the cage.
DO $migration$
DECLARE definition text;
BEGIN
 definition := pg_get_functiondef('public.api_analytics_performance(uuid,date,date,date,text[],text)'::regprocedure);
 IF position($old$cage_batches as (select distinct dy.system_id, dy.batch_id from days dy),$old$ in definition) = 0 THEN RAISE EXCEPTION 'Expected cage_batches CTE not found'; END IF;
 EXECUTE replace(definition, $old$cage_batches as (select distinct dy.system_id, dy.batch_id from days dy),$old$, $new$cage_batches as (select distinct pc.system_id, pc.batch_id from public.production_cycle pc where pc.ongoing_cycle = true and pc.system_id in (select dy.system_id from days dy)),$new$);
END
$migration$;

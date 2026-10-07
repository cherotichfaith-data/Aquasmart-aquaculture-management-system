-- Cage feed/ABW performance uses active batches, consistent with Detailed Batch Report.
-- Completed-cage harvest history retains its separate completion criteria.
DO $migration$
DECLARE definition text;
BEGIN
 definition := pg_get_functiondef('public.api_analytics_performance(uuid,date,date,date,text[],text)'::regprocedure);
 IF position($old$where d.inventory_date between bd.s and bd.e and coalesce(d.number_of_fish, 0) > 0)$old$ in definition) = 0 THEN
 RAISE EXCEPTION 'Expected cage-performance filter not found';
 END IF;
 EXECUTE replace(definition, $old$where d.inventory_date between bd.s and bd.e and coalesce(d.number_of_fish, 0) > 0)$old$, $new$where d.inventory_date between bd.s and bd.e and coalesce(d.number_of_fish, 0) > 0
  and exists (
    select 1 from public.production_cycle pc
    join public.fingerling_batch fb on fb.id = pc.batch_id
    where pc.batch_id = d.batch_id and fb.farm_id = p_farm_id
      and pc.ongoing_cycle = true and pc.cycle_start <= bd.e
  ))$new$);
END
$migration$;

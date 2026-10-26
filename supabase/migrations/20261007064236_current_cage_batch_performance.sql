-- Cage performance includes only active cages and their latest recorded batch assignment.
-- Read the latest inventory before testing fish count to avoid reviving an emptied cage.
DO $migration$
DECLARE definition text;
BEGIN
 definition := pg_get_functiondef('public.api_analytics_performance(uuid,date,date,date,text[],text)'::regprocedure);
 IF position($old$where d.inventory_date between bd.s and bd.e and coalesce(d.number_of_fish, 0) > 0
  and exists ($old$ in definition) = 0 THEN RAISE EXCEPTION 'Expected active batch filter not found'; END IF;
 EXECUTE replace(definition, $old$where d.inventory_date between bd.s and bd.e and coalesce(d.number_of_fish, 0) > 0
  and exists ($old$, $new$where d.inventory_date between bd.s and bd.e and coalesce(d.number_of_fish, 0) > 0
  and s.is_active = true and s.cage_status::text is distinct from 'retired'
  and exists (
    select 1 from (
      select current_stock.batch_id, current_stock.number_of_fish
      from analytics.daily_system_facts current_stock
      where current_stock.system_id = d.system_id and current_stock.inventory_date <= current_date
      order by current_stock.inventory_date desc
      limit 1
    ) current_assignment
    where current_assignment.batch_id = d.batch_id and current_assignment.number_of_fish > 0
  )
  and exists ($new$);
END
$migration$;

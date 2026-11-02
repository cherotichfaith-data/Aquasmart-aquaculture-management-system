-- /analytics cage performance, mixed-batch cages (e.g. G1E): analytics.daily_system_facts holds one row per cage per day
-- tagged with one batch (the latest event's) but the combined fish count. Keep every day of a cage that currently holds
-- fish when its batch is either the latest row's batch or a batch with an ongoing cycle in that cage, and list a cage's
-- batches as those day batches plus its ongoing-cycle batches, so feed fed and expected cover the whole combined cage.
DO $migration$
DECLARE definition text;
BEGIN
 definition := pg_get_functiondef('public.api_analytics_performance(uuid,date,date,date,text[],text)'::regprocedure);
 IF position($old$  and exists (
    select 1 from analytics.daily_system_facts current_stock
    where current_stock.system_id = d.system_id and current_stock.batch_id = d.batch_id
      and coalesce(current_stock.number_of_fish, 0) > 0
      and current_stock.inventory_date = (
        select max(latest.inventory_date) from analytics.daily_system_facts latest
        where latest.system_id = d.system_id and latest.inventory_date <= current_date
      )
  )
$old$ in definition) = 0 THEN RAISE EXCEPTION 'Expected current-batch filter not found'; END IF;
 IF position($old$cage_batches as (select distinct pc.system_id, pc.batch_id from public.production_cycle pc where pc.ongoing_cycle = true and pc.system_id in (select dy.system_id from days dy)),$old$ in definition) = 0 THEN RAISE EXCEPTION 'Expected cage_batches CTE not found'; END IF;
 definition := replace(definition, $old$  and exists (
    select 1 from analytics.daily_system_facts current_stock
    where current_stock.system_id = d.system_id and current_stock.batch_id = d.batch_id
      and coalesce(current_stock.number_of_fish, 0) > 0
      and current_stock.inventory_date = (
        select max(latest.inventory_date) from analytics.daily_system_facts latest
        where latest.system_id = d.system_id and latest.inventory_date <= current_date
      )
  )
$old$, $new$  and exists (
    select 1 from analytics.daily_system_facts current_stock
    where current_stock.system_id = d.system_id
      and coalesce(current_stock.number_of_fish, 0) > 0
      and current_stock.inventory_date = (
        select max(latest.inventory_date) from analytics.daily_system_facts latest
        where latest.system_id = d.system_id and latest.inventory_date <= current_date
      )
      and (
        current_stock.batch_id = d.batch_id
        or exists (
          select 1 from public.production_cycle cage_cycle
          where cage_cycle.system_id = d.system_id and cage_cycle.batch_id = d.batch_id and cage_cycle.ongoing_cycle = true
        )
      )
  )
$new$);
 definition := replace(definition, $old$cage_batches as (select distinct pc.system_id, pc.batch_id from public.production_cycle pc where pc.ongoing_cycle = true and pc.system_id in (select dy.system_id from days dy)),$old$, $new$cage_batches as (
  select dy.system_id, dy.batch_id from days dy
  union
  select pc.system_id, pc.batch_id from public.production_cycle pc where pc.ongoing_cycle = true and pc.system_id in (select dy.system_id from days dy)
),$new$);
 EXECUTE definition;
END
$migration$;

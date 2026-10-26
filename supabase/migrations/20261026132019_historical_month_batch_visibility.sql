-- Historical reports include cycles overlapping the selected period, even after closure.
-- ABW points retain measured cycle history for those eligible batches; monthly totals
-- still use the selected period. Exactly the same access checks and metrics are kept.
DO $migration$
DECLARE
  definition text := pg_get_functiondef('public.api_analytics_performance(uuid,date,date,date,text[],text)'::regprocedure);
BEGIN
  IF position($old0$pc.batch_id = base.batch_id and pc.cycle_start <= (select e from bounds) and pc.ongoing_cycle = true$old0$ in definition) > 0 THEN
    definition := replace(definition, $old0$pc.batch_id = base.batch_id and pc.cycle_start <= (select e from bounds) and pc.ongoing_cycle = true$old0$, $new0$pc.batch_id = base.batch_id and pc.cycle_start <= (select e from bounds)
      and (pc.ongoing_cycle or pc.cycle_end >= (select s from bounds))$new0$);
  ELSIF position($new0$pc.batch_id = base.batch_id and pc.cycle_start <= (select e from bounds)
      and (pc.ongoing_cycle or pc.cycle_end >= (select s from bounds))$new0$ in definition) = 0 THEN
    RAISE EXCEPTION 'Expected historical reporting filter 1 not found';
  END IF;
  IF position($old1$where p.date >= b.date_in and (not coalesce('growth_custom' = any(p_sections), false) or p.date >= (select s from pb))$old1$ in definition) > 0 THEN
    definition := replace(definition, $old1$where p.date >= b.date_in and (not coalesce('growth_custom' = any(p_sections), false) or p.date >= (select s from pb))$old1$, $new1$where p.date >= b.date_in$new1$);
  ELSIF position($new1$where p.date >= b.date_in$new1$ in definition) = 0 THEN
    RAISE EXCEPTION 'Expected historical reporting filter 2 not found';
  END IF;
  IF position($old2$  and s.is_active = true and s.cage_status::text is distinct from 'retired'
  and exists (
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
  and exists (
    select 1 from public.production_cycle pc
    join public.fingerling_batch fb on fb.id = pc.batch_id
    where pc.batch_id = d.batch_id and fb.farm_id = p_farm_id
      and pc.ongoing_cycle = true and pc.cycle_start <= bd.e
  ))$old2$ in definition) > 0 THEN
    definition := replace(definition, $old2$  and s.is_active = true and s.cage_status::text is distinct from 'retired'
  and exists (
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
  and exists (
    select 1 from public.production_cycle pc
    join public.fingerling_batch fb on fb.id = pc.batch_id
    where pc.batch_id = d.batch_id and fb.farm_id = p_farm_id
      and pc.ongoing_cycle = true and pc.cycle_start <= bd.e
  ))$old2$, $new2$  and exists (
    select 1 from public.production_cycle pc
    join public.fingerling_batch fb on fb.id = pc.batch_id
    where pc.batch_id = d.batch_id and fb.farm_id = p_farm_id
      and pc.cycle_start <= bd.e
      and (pc.ongoing_cycle or pc.cycle_end >= bd.s)
  ))$new2$);
  ELSIF position($new2$  and exists (
    select 1 from public.production_cycle pc
    join public.fingerling_batch fb on fb.id = pc.batch_id
    where pc.batch_id = d.batch_id and fb.farm_id = p_farm_id
      and pc.cycle_start <= bd.e
      and (pc.ongoing_cycle or pc.cycle_end >= bd.s)
  ))$new2$ in definition) = 0 THEN
    RAISE EXCEPTION 'Expected historical reporting filter 3 not found';
  END IF;
  IF position($old3$select pc.system_id, pc.batch_id from public.production_cycle pc where pc.ongoing_cycle = true and pc.system_id in (select dy.system_id from days dy)$old3$ in definition) > 0 THEN
    definition := replace(definition, $old3$select pc.system_id, pc.batch_id from public.production_cycle pc where pc.ongoing_cycle = true and pc.system_id in (select dy.system_id from days dy)$old3$, $new3$select pc.system_id, pc.batch_id from public.production_cycle pc cross join bounds bd
  where pc.cycle_start <= bd.e and (pc.ongoing_cycle or pc.cycle_end >= bd.s)
    and pc.system_id in (select dy.system_id from days dy)$new3$);
  ELSIF position($new3$select pc.system_id, pc.batch_id from public.production_cycle pc cross join bounds bd
  where pc.cycle_start <= bd.e and (pc.ongoing_cycle or pc.cycle_end >= bd.s)
    and pc.system_id in (select dy.system_id from days dy)$new3$ in definition) = 0 THEN
    RAISE EXCEPTION 'Expected historical reporting filter 4 not found';
  END IF;
  EXECUTE definition;
END
$migration$;

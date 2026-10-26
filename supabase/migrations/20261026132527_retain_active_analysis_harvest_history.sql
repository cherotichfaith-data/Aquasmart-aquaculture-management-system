-- Keep active-batch analysis unchanged; completed cohorts belong in harvest reports.
-- Retain the independent harvest reconciliation fix.
DO $migration$
DECLARE
  definition text := pg_get_functiondef('public.api_analytics_performance(uuid,date,date,date,text[],text)'::regprocedure);
BEGIN
  IF position($old0$daily as (
  select dy.system_id, dy.batch_id, dy.inventory_date,
         sum(dy.biomass_kg * coalesce((select r.rate_pct from rates r where dy.abw_g >= r.abw_min_g and dy.abw_g < r.abw_max_g limit 1), (select r.rate_pct from rates r order by r.abw_max_g desc limit 1)) / 100.0)::double precision as expected_kg,
         (sum(dy.abw_g * dy.number_of_fish) filter (where dy.abw_g is not null) / nullif(sum(dy.number_of_fish) filter (where dy.abw_g is not null), 0))::double precision as abw_g
  from days dy group by dy.system_id, dy.batch_id, dy.inventory_date
),
expd as (
  select dd.system_id, dd.batch_id, sum(dd.expected_kg)::double precision as expected_kg,
         (array_agg(dd.abw_g order by dd.inventory_date asc))[1] as abw_start_g,
         (array_agg(dd.abw_g order by dd.inventory_date desc))[1] as abw_end_g
  from daily dd group by dd.system_id, dd.batch_id
),
cage_batches as (
  select distinct dy.system_id, dy.batch_id from days dy
),
fed as (
  select fr.system_id,fr.batch_id,sum(fr.feeding_amount)::double precision as fed_kg
  from public.feeding_record fr join cage_batches cb on cb.system_id=fr.system_id and cb.batch_id=fr.batch_id, bounds bd
  where fr.date between bd.s and bd.e group by fr.system_id,fr.batch_id
)
select e.system_id, s.name, fb.name, coalesce(f.fed_kg, 0), e.expected_kg, e.abw_start_g::double precision, e.abw_end_g::double precision,
  case when e.abw_start_g > 0 then ((e.abw_end_g / e.abw_start_g - 1) * 100)::double precision end,
  case when e.expected_kg > 0 then (coalesce(f.fed_kg, 0) / e.expected_kg * 100)::double precision end
from expd e join public.system s on s.id=e.system_id join public.fingerling_batch fb on fb.id=e.batch_id
left join fed f on f.system_id=e.system_id and f.batch_id=e.batch_id
$old0$ in definition) > 0 THEN
    definition := replace(definition, $old0$daily as (
  select dy.system_id, dy.batch_id, dy.inventory_date,
         sum(dy.biomass_kg * coalesce((select r.rate_pct from rates r where dy.abw_g >= r.abw_min_g and dy.abw_g < r.abw_max_g limit 1), (select r.rate_pct from rates r order by r.abw_max_g desc limit 1)) / 100.0)::double precision as expected_kg,
         (sum(dy.abw_g * dy.number_of_fish) filter (where dy.abw_g is not null) / nullif(sum(dy.number_of_fish) filter (where dy.abw_g is not null), 0))::double precision as abw_g
  from days dy group by dy.system_id, dy.batch_id, dy.inventory_date
),
expd as (
  select dd.system_id, dd.batch_id, sum(dd.expected_kg)::double precision as expected_kg,
         (array_agg(dd.abw_g order by dd.inventory_date asc))[1] as abw_start_g,
         (array_agg(dd.abw_g order by dd.inventory_date desc))[1] as abw_end_g
  from daily dd group by dd.system_id, dd.batch_id
),
cage_batches as (
  select distinct dy.system_id, dy.batch_id from days dy
),
fed as (
  select fr.system_id,fr.batch_id,sum(fr.feeding_amount)::double precision as fed_kg
  from public.feeding_record fr join cage_batches cb on cb.system_id=fr.system_id and cb.batch_id=fr.batch_id, bounds bd
  where fr.date between bd.s and bd.e group by fr.system_id,fr.batch_id
)
select e.system_id, s.name, fb.name, coalesce(f.fed_kg, 0), e.expected_kg, e.abw_start_g::double precision, e.abw_end_g::double precision,
  case when e.abw_start_g > 0 then ((e.abw_end_g / e.abw_start_g - 1) * 100)::double precision end,
  case when e.expected_kg > 0 then (coalesce(f.fed_kg, 0) / e.expected_kg * 100)::double precision end
from expd e join public.system s on s.id=e.system_id join public.fingerling_batch fb on fb.id=e.batch_id
left join fed f on f.system_id=e.system_id and f.batch_id=e.batch_id
$old0$, $new0$daily as (
  select dy.system_id, dy.inventory_date,
         sum(dy.biomass_kg * coalesce((select r.rate_pct from rates r where dy.abw_g >= r.abw_min_g and dy.abw_g < r.abw_max_g limit 1), (select r.rate_pct from rates r order by r.abw_max_g desc limit 1)) / 100.0)::double precision as expected_kg,
         (sum(dy.abw_g * dy.number_of_fish) filter (where dy.abw_g is not null) / nullif(sum(dy.number_of_fish) filter (where dy.abw_g is not null), 0))::double precision as abw_g
  from days dy group by dy.system_id, dy.inventory_date
),
expd as (
  select dd.system_id, sum(dd.expected_kg)::double precision as expected_kg,
         (array_agg(dd.abw_g order by dd.inventory_date asc))[1] as abw_start_g,
         (array_agg(dd.abw_g order by dd.inventory_date desc))[1] as abw_end_g
  from daily dd group by dd.system_id
),
cage_batches as (
  select dy.system_id, dy.batch_id from days dy
  union
  select pc.system_id, pc.batch_id from public.production_cycle pc cross join bounds bd
  where pc.cycle_start <= bd.e and (pc.ongoing_cycle or pc.cycle_end >= bd.s)
    and pc.system_id in (select dy.system_id from days dy)
),
cage_batch_names as (
  select cb.system_id, string_agg(coalesce(nullif(fb.name, ''), 'Batch #' || cb.batch_id::text), ', ' order by fb.date_of_delivery, cb.batch_id) as names
  from cage_batches cb left join public.fingerling_batch fb on fb.id = cb.batch_id group by cb.system_id
),
fed as (select fr.system_id, sum(fr.feeding_amount)::double precision as fed_kg from public.feeding_record fr join cage_batches cb on cb.system_id = fr.system_id and cb.batch_id = fr.batch_id, bounds bd where fr.date between bd.s and bd.e group by fr.system_id)
select e.system_id, s.name, bn.names, coalesce(f.fed_kg, 0), e.expected_kg, e.abw_start_g::double precision, e.abw_end_g::double precision,
  case when e.abw_start_g > 0 then ((e.abw_end_g / e.abw_start_g - 1) * 100)::double precision end,
  case when e.expected_kg > 0 then (coalesce(f.fed_kg, 0) / e.expected_kg * 100)::double precision end
from expd e join public.system s on s.id = e.system_id left join cage_batch_names bn on bn.system_id = e.system_id left join fed f on f.system_id = e.system_id
$new0$);
  ELSIF position($new0$daily as (
  select dy.system_id, dy.inventory_date,
         sum(dy.biomass_kg * coalesce((select r.rate_pct from rates r where dy.abw_g >= r.abw_min_g and dy.abw_g < r.abw_max_g limit 1), (select r.rate_pct from rates r order by r.abw_max_g desc limit 1)) / 100.0)::double precision as expected_kg,
         (sum(dy.abw_g * dy.number_of_fish) filter (where dy.abw_g is not null) / nullif(sum(dy.number_of_fish) filter (where dy.abw_g is not null), 0))::double precision as abw_g
  from days dy group by dy.system_id, dy.inventory_date
),
expd as (
  select dd.system_id, sum(dd.expected_kg)::double precision as expected_kg,
         (array_agg(dd.abw_g order by dd.inventory_date asc))[1] as abw_start_g,
         (array_agg(dd.abw_g order by dd.inventory_date desc))[1] as abw_end_g
  from daily dd group by dd.system_id
),
cage_batches as (
  select dy.system_id, dy.batch_id from days dy
  union
  select pc.system_id, pc.batch_id from public.production_cycle pc cross join bounds bd
  where pc.cycle_start <= bd.e and (pc.ongoing_cycle or pc.cycle_end >= bd.s)
    and pc.system_id in (select dy.system_id from days dy)
),
cage_batch_names as (
  select cb.system_id, string_agg(coalesce(nullif(fb.name, ''), 'Batch #' || cb.batch_id::text), ', ' order by fb.date_of_delivery, cb.batch_id) as names
  from cage_batches cb left join public.fingerling_batch fb on fb.id = cb.batch_id group by cb.system_id
),
fed as (select fr.system_id, sum(fr.feeding_amount)::double precision as fed_kg from public.feeding_record fr join cage_batches cb on cb.system_id = fr.system_id and cb.batch_id = fr.batch_id, bounds bd where fr.date between bd.s and bd.e group by fr.system_id)
select e.system_id, s.name, bn.names, coalesce(f.fed_kg, 0), e.expected_kg, e.abw_start_g::double precision, e.abw_end_g::double precision,
  case when e.abw_start_g > 0 then ((e.abw_end_g / e.abw_start_g - 1) * 100)::double precision end,
  case when e.expected_kg > 0 then (coalesce(f.fed_kg, 0) / e.expected_kg * 100)::double precision end
from expd e join public.system s on s.id = e.system_id left join cage_batch_names bn on bn.system_id = e.system_id left join fed f on f.system_id = e.system_id
$new0$ in definition) = 0 THEN
    RAISE EXCEPTION 'Expected active analysis restoration 1 not found';
  END IF;
  IF position($old1$pc.batch_id = base.batch_id and pc.cycle_start <= (select e from bounds)
      and (pc.ongoing_cycle or pc.cycle_end >= (select s from bounds))$old1$ in definition) > 0 THEN
    definition := replace(definition, $old1$pc.batch_id = base.batch_id and pc.cycle_start <= (select e from bounds)
      and (pc.ongoing_cycle or pc.cycle_end >= (select s from bounds))$old1$, $new1$pc.batch_id = base.batch_id and pc.cycle_start <= (select e from bounds) and pc.ongoing_cycle = true$new1$);
  ELSIF position($new1$pc.batch_id = base.batch_id and pc.cycle_start <= (select e from bounds) and pc.ongoing_cycle = true$new1$ in definition) = 0 THEN
    RAISE EXCEPTION 'Expected active analysis restoration 2 not found';
  END IF;
  IF position($old2$where p.date >= b.date_in$old2$ in definition) > 0 THEN
    definition := replace(definition, $old2$where p.date >= b.date_in$old2$, $new2$where p.date >= b.date_in and (not coalesce('growth_custom' = any(p_sections), false) or p.date >= (select s from pb))$new2$);
  ELSIF position($new2$where p.date >= b.date_in and (not coalesce('growth_custom' = any(p_sections), false) or p.date >= (select s from pb))$new2$ in definition) = 0 THEN
    RAISE EXCEPTION 'Expected active analysis restoration 3 not found';
  END IF;
  IF position($old3$  and exists (
    select 1 from public.production_cycle pc
    join public.fingerling_batch fb on fb.id = pc.batch_id
    where pc.batch_id = d.batch_id and fb.farm_id = p_farm_id
      and pc.cycle_start <= bd.e
      and (pc.ongoing_cycle or pc.cycle_end >= bd.s)
  ))$old3$ in definition) > 0 THEN
    definition := replace(definition, $old3$  and exists (
    select 1 from public.production_cycle pc
    join public.fingerling_batch fb on fb.id = pc.batch_id
    where pc.batch_id = d.batch_id and fb.farm_id = p_farm_id
      and pc.cycle_start <= bd.e
      and (pc.ongoing_cycle or pc.cycle_end >= bd.s)
  ))$old3$, $new3$  and s.is_active = true and s.cage_status::text is distinct from 'retired'
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
  ))$new3$);
  ELSIF position($new3$  and s.is_active = true and s.cage_status::text is distinct from 'retired'
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
  ))$new3$ in definition) = 0 THEN
    RAISE EXCEPTION 'Expected active analysis restoration 4 not found';
  END IF;
  IF position($old4$select pc.system_id, pc.batch_id from public.production_cycle pc cross join bounds bd
  where pc.cycle_start <= bd.e and (pc.ongoing_cycle or pc.cycle_end >= bd.s)
    and pc.system_id in (select dy.system_id from days dy)$old4$ in definition) > 0 THEN
    definition := replace(definition, $old4$select pc.system_id, pc.batch_id from public.production_cycle pc cross join bounds bd
  where pc.cycle_start <= bd.e and (pc.ongoing_cycle or pc.cycle_end >= bd.s)
    and pc.system_id in (select dy.system_id from days dy)$old4$, $new4$select pc.system_id, pc.batch_id from public.production_cycle pc where pc.ongoing_cycle = true and pc.system_id in (select dy.system_id from days dy)$new4$);
  ELSIF position($new4$select pc.system_id, pc.batch_id from public.production_cycle pc where pc.ongoing_cycle = true and pc.system_id in (select dy.system_id from days dy)$new4$ in definition) = 0 THEN
    RAISE EXCEPTION 'Expected active analysis restoration 5 not found';
  END IF;
  EXECUTE definition;
END
$migration$;

-- /analytics "ABW Increase and Feed Fed vs Expectation": one row per cage that lists every batch it holds.
-- A cage can hold several batches after transfers (e.g. G1E). The previous filter kept only the single latest
-- inventory row's batch, so only one batch showed. Batches with fish on the cage's latest inventory date are all
-- kept; expected feed and fed feed are summed per cage and ABW is the fish-weighted average across its batches.
DO $migration$
DECLARE definition text;
BEGIN
 definition := pg_get_functiondef('public.api_analytics_performance(uuid,date,date,date,text[],text)'::regprocedure);
 IF position($old$  and exists (
    select 1 from (
      select current_stock.batch_id, current_stock.number_of_fish
      from analytics.daily_system_facts current_stock
      where current_stock.system_id = d.system_id and current_stock.inventory_date <= current_date
      order by current_stock.inventory_date desc
      limit 1
    ) current_assignment
    where current_assignment.batch_id = d.batch_id and current_assignment.number_of_fish > 0
  )
$old$ in definition) = 0 THEN RAISE EXCEPTION 'Expected current-batch filter not found'; END IF;
 IF position($old$expd as (
  select dy.system_id, dy.batch_id,
         sum(dy.biomass_kg * coalesce((select r.rate_pct from rates r where dy.abw_g >= r.abw_min_g and dy.abw_g < r.abw_max_g limit 1), (select r.rate_pct from rates r order by r.abw_max_g desc limit 1)) / 100.0)::double precision as expected_kg,
         (array_agg(dy.abw_g order by dy.inventory_date asc))[1] as abw_start_g,
         (array_agg(dy.abw_g order by dy.inventory_date desc))[1] as abw_end_g
  from days dy group by dy.system_id, dy.batch_id
),
fed as (select fr.system_id, fr.batch_id, sum(fr.feeding_amount)::double precision as fed_kg from public.feeding_record fr, bounds bd where fr.date between bd.s and bd.e group by fr.system_id, fr.batch_id)
select e.system_id, s.name, coalesce(nullif(fb.name, ''), 'Batch #' || e.batch_id::text), coalesce(f.fed_kg, 0), e.expected_kg, e.abw_start_g::double precision, e.abw_end_g::double precision,
  case when e.abw_start_g > 0 then ((e.abw_end_g / e.abw_start_g - 1) * 100)::double precision end,
  case when e.expected_kg > 0 then (coalesce(f.fed_kg, 0) / e.expected_kg * 100)::double precision end
from expd e join public.system s on s.id = e.system_id left join public.fingerling_batch fb on fb.id = e.batch_id left join fed f on f.system_id = e.system_id and f.batch_id = e.batch_id
$old$ in definition) = 0 THEN RAISE EXCEPTION 'Expected cage feed aggregation not found'; END IF;
 definition := replace(definition, $old$  and exists (
    select 1 from (
      select current_stock.batch_id, current_stock.number_of_fish
      from analytics.daily_system_facts current_stock
      where current_stock.system_id = d.system_id and current_stock.inventory_date <= current_date
      order by current_stock.inventory_date desc
      limit 1
    ) current_assignment
    where current_assignment.batch_id = d.batch_id and current_assignment.number_of_fish > 0
  )
$old$, $new$  and exists (
    select 1 from analytics.daily_system_facts current_stock
    where current_stock.system_id = d.system_id and current_stock.batch_id = d.batch_id
      and coalesce(current_stock.number_of_fish, 0) > 0
      and current_stock.inventory_date = (
        select max(latest.inventory_date) from analytics.daily_system_facts latest
        where latest.system_id = d.system_id and latest.inventory_date <= current_date
      )
  )
$new$);
 definition := replace(definition, $old$expd as (
  select dy.system_id, dy.batch_id,
         sum(dy.biomass_kg * coalesce((select r.rate_pct from rates r where dy.abw_g >= r.abw_min_g and dy.abw_g < r.abw_max_g limit 1), (select r.rate_pct from rates r order by r.abw_max_g desc limit 1)) / 100.0)::double precision as expected_kg,
         (array_agg(dy.abw_g order by dy.inventory_date asc))[1] as abw_start_g,
         (array_agg(dy.abw_g order by dy.inventory_date desc))[1] as abw_end_g
  from days dy group by dy.system_id, dy.batch_id
),
fed as (select fr.system_id, fr.batch_id, sum(fr.feeding_amount)::double precision as fed_kg from public.feeding_record fr, bounds bd where fr.date between bd.s and bd.e group by fr.system_id, fr.batch_id)
select e.system_id, s.name, coalesce(nullif(fb.name, ''), 'Batch #' || e.batch_id::text), coalesce(f.fed_kg, 0), e.expected_kg, e.abw_start_g::double precision, e.abw_end_g::double precision,
  case when e.abw_start_g > 0 then ((e.abw_end_g / e.abw_start_g - 1) * 100)::double precision end,
  case when e.expected_kg > 0 then (coalesce(f.fed_kg, 0) / e.expected_kg * 100)::double precision end
from expd e join public.system s on s.id = e.system_id left join public.fingerling_batch fb on fb.id = e.batch_id left join fed f on f.system_id = e.system_id and f.batch_id = e.batch_id
$old$, $new$daily as (
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
cage_batches as (select distinct dy.system_id, dy.batch_id from days dy),
cage_batch_names as (
  select cb.system_id, string_agg(coalesce(nullif(fb.name, ''), 'Batch #' || cb.batch_id::text), ', ' order by fb.date_of_delivery, cb.batch_id) as names
  from cage_batches cb left join public.fingerling_batch fb on fb.id = cb.batch_id group by cb.system_id
),
fed as (select fr.system_id, sum(fr.feeding_amount)::double precision as fed_kg from public.feeding_record fr join cage_batches cb on cb.system_id = fr.system_id and cb.batch_id = fr.batch_id, bounds bd where fr.date between bd.s and bd.e group by fr.system_id)
select e.system_id, s.name, bn.names, coalesce(f.fed_kg, 0), e.expected_kg, e.abw_start_g::double precision, e.abw_end_g::double precision,
  case when e.abw_start_g > 0 then ((e.abw_end_g / e.abw_start_g - 1) * 100)::double precision end,
  case when e.expected_kg > 0 then (coalesce(f.fed_kg, 0) / e.expected_kg * 100)::double precision end
from expd e join public.system s on s.id = e.system_id left join cage_batch_names bn on bn.system_id = e.system_id left join fed f on f.system_id = e.system_id
$new$);
 EXECUTE definition;
END
$migration$;

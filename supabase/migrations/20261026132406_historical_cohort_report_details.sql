-- Keep reused cages' cohorts separate and honour recorded inventory reconciliations.
DO $migration$
DECLARE
  definition text := pg_get_functiondef('public.api_analytics_performance(uuid,date,date,date,text[],text)'::regprocedure);
BEGIN
  IF position($old0$daily as (
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
$old0$ in definition) > 0 THEN
    definition := replace(definition, $old0$daily as (
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
$old0$, $new0$daily as (
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
$new0$);
  ELSIF position($new0$daily as (
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
$new0$ in definition) = 0 THEN
    RAISE EXCEPTION 'Expected historical cohort detail 1 not found';
  END IF;
  IF position($old1$st.missing_weight+tr.missing_weight missing_weight,tr.delta,tr.ambiguous,$old1$ in definition) > 0 THEN
    definition := replace(definition, $old1$st.missing_weight+tr.missing_weight missing_weight,tr.delta,tr.ambiguous,$old1$, $new1$st.missing_weight+tr.missing_weight missing_weight,(tr.delta+rc.delta) as delta,tr.ambiguous,$new1$);
  ELSIF position($new1$st.missing_weight+tr.missing_weight missing_weight,(tr.delta+rc.delta) as delta,tr.ambiguous,$new1$ in definition) = 0 THEN
    RAISE EXCEPTION 'Expected historical cohort detail 2 not found';
  END IF;
  IF position($old2$  ) tr
  cross join lateral (select coalesce(sum(number_of_fish_mortality),0)$old2$ in definition) > 0 THEN
    definition := replace(definition, $old2$  ) tr
  cross join lateral (select coalesce(sum(number_of_fish_mortality),0)$old2$, $new2$  ) tr
  cross join lateral (
    select coalesce(sum(r.fish_delta),0) delta from public.fish_inventory_reconciliation r
    where r.cycle_id=hs.cycle_id and r.batch_id=hs.batch_id
      and (hs.system_id is null or r.system_id=hs.system_id)
      and r.reconciliation_date between pc.cycle_start and hs.harvest_date
  ) rc
  cross join lateral (select coalesce(sum(number_of_fish_mortality),0)$new2$);
  ELSIF position($new2$  ) tr
  cross join lateral (
    select coalesce(sum(r.fish_delta),0) delta from public.fish_inventory_reconciliation r
    where r.cycle_id=hs.cycle_id and r.batch_id=hs.batch_id
      and (hs.system_id is null or r.system_id=hs.system_id)
      and r.reconciliation_date between pc.cycle_start and hs.harvest_date
  ) rc
  cross join lateral (select coalesce(sum(number_of_fish_mortality),0)$new2$ in definition) = 0 THEN
    RAISE EXCEPTION 'Expected historical cohort detail 3 not found';
  END IF;
  EXECUTE definition;
END
$migration$;

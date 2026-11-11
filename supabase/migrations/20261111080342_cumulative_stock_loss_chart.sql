-- Stock loss charts accumulate observed losses through each selected month-end.
-- Positive inventory corrections are extra fish found, never negative unaccounted losses.
-- Keep the detailed table's period stock_loss_pct separate from stock_loss_chart_pct.
DO $migration$
DECLARE definition text := pg_get_functiondef('public.api_analytics_performance(uuid,date,date,date,text[],text)'::regprocedure);
BEGIN
  IF (length(definition) - length(replace(definition, $old$result as (
  select base.batch_id$old$, ''))) / length($old$result as (
  select base.batch_id$old$) <> 1 THEN
    RAISE EXCEPTION 'Cumulative loss chart anchor 1 did not match exactly once';
  END IF;
  definition := replace(definition, $old$result as (
  select base.batch_id$old$, $new$chart_stock_loss as (
  -- Every monthly chart is a cumulative snapshot, independent of the table's period metrics.
  select received.batch_id, received.population,
    coalesce(losses.mortality, 0) as mortality_fish,
    coalesce(losses.adjustment, 0) as adjustment_fish,
    coalesce(losses.harvest, 0) as harvest_fish
  from (
    select cr.batch_id, sum(cr.fish) as population
    from cycle_receipts cr cross join bounds bd where cr.date <= bd.e
    group by cr.batch_id having sum(cr.fish) > 0
  ) received
  cross join bounds bd
  cross join lateral (
    select sum(greatest(lc.mortality, 0)) as mortality,
      sum(greatest(lc.adjustment, 0)) as adjustment,
      sum(greatest(lc.harvest, 0)) as harvest
    from loss_components lc where lc.batch_id = received.batch_id and lc.date <= bd.e
  ) losses
),
result as (
  select base.batch_id$new$);
  IF (length(definition) - length(replace(definition, $old$from base left join stock_loss sl on sl.batch_id = base.batch_id$old$, ''))) / length($old$from base left join stock_loss sl on sl.batch_id = base.batch_id$old$) <> 1 THEN
    RAISE EXCEPTION 'Cumulative loss chart anchor 2 did not match exactly once';
  END IF;
  definition := replace(definition, $old$from base left join stock_loss sl on sl.batch_id = base.batch_id$old$, $new$from base left join stock_loss sl on sl.batch_id = base.batch_id
    left join chart_stock_loss csl on csl.batch_id = base.batch_id$new$);
  IF (length(definition) - length(replace(definition, $old$(100.0 * sl.mortality_fish / nullif(sl.opening_fish, 0))::double precision as stock_loss_mortality_pct,
    (100.0 * sl.adjustment_fish / nullif(sl.opening_fish, 0))::double precision as stock_loss_adjustment_pct,
    (100.0 * sl.harvest_fish / nullif(sl.opening_fish, 0))::double precision as stock_loss_harvest_pct,$old$, ''))) / length($old$(100.0 * sl.mortality_fish / nullif(sl.opening_fish, 0))::double precision as stock_loss_mortality_pct,
    (100.0 * sl.adjustment_fish / nullif(sl.opening_fish, 0))::double precision as stock_loss_adjustment_pct,
    (100.0 * sl.harvest_fish / nullif(sl.opening_fish, 0))::double precision as stock_loss_harvest_pct,$old$) <> 1 THEN
    RAISE EXCEPTION 'Cumulative loss chart anchor 3 did not match exactly once';
  END IF;
  definition := replace(definition, $old$(100.0 * sl.mortality_fish / nullif(sl.opening_fish, 0))::double precision as stock_loss_mortality_pct,
    (100.0 * sl.adjustment_fish / nullif(sl.opening_fish, 0))::double precision as stock_loss_adjustment_pct,
    (100.0 * sl.harvest_fish / nullif(sl.opening_fish, 0))::double precision as stock_loss_harvest_pct,$old$, $new$csl.population as chart_population,
    (100.0 * (csl.mortality_fish + csl.adjustment_fish + csl.harvest_fish) / csl.population)::double precision as stock_loss_chart_pct,
    (100.0 * csl.mortality_fish / csl.population)::double precision as stock_loss_mortality_pct,
    (100.0 * csl.adjustment_fish / csl.population)::double precision as stock_loss_adjustment_pct,
    (100.0 * csl.harvest_fish / csl.population)::double precision as stock_loss_harvest_pct,$new$);
  IF (length(definition) - length(replace(definition, $old$r.stock_loss_mortality_pct, r.stock_loss_adjustment_pct, r.stock_loss_harvest_pct
  from result r$old$, ''))) / length($old$r.stock_loss_mortality_pct, r.stock_loss_adjustment_pct, r.stock_loss_harvest_pct
  from result r$old$) <> 1 THEN
    RAISE EXCEPTION 'Cumulative loss chart anchor 4 did not match exactly once';
  END IF;
  definition := replace(definition, $old$r.stock_loss_mortality_pct, r.stock_loss_adjustment_pct, r.stock_loss_harvest_pct
  from result r$old$, $new$r.stock_loss_mortality_pct, r.stock_loss_adjustment_pct, r.stock_loss_harvest_pct, r.stock_loss_chart_pct
  from result r$new$);
  IF (length(definition) - length(replace(definition, $old$(sum(r.stock_loss_mortality_pct * r.opening_n) / nullif(sum(r.opening_n), 0))::double precision,
    (sum(r.stock_loss_adjustment_pct * r.opening_n) / nullif(sum(r.opening_n), 0))::double precision,
    (sum(r.stock_loss_harvest_pct * r.opening_n) / nullif(sum(r.opening_n), 0))::double precision$old$, ''))) / length($old$(sum(r.stock_loss_mortality_pct * r.opening_n) / nullif(sum(r.opening_n), 0))::double precision,
    (sum(r.stock_loss_adjustment_pct * r.opening_n) / nullif(sum(r.opening_n), 0))::double precision,
    (sum(r.stock_loss_harvest_pct * r.opening_n) / nullif(sum(r.opening_n), 0))::double precision$old$) <> 1 THEN
    RAISE EXCEPTION 'Cumulative loss chart anchor 5 did not match exactly once';
  END IF;
  definition := replace(definition, $old$(sum(r.stock_loss_mortality_pct * r.opening_n) / nullif(sum(r.opening_n), 0))::double precision,
    (sum(r.stock_loss_adjustment_pct * r.opening_n) / nullif(sum(r.opening_n), 0))::double precision,
    (sum(r.stock_loss_harvest_pct * r.opening_n) / nullif(sum(r.opening_n), 0))::double precision$old$, $new$(sum(r.stock_loss_mortality_pct * r.chart_population) / nullif(sum(r.chart_population), 0))::double precision,
    (sum(r.stock_loss_adjustment_pct * r.chart_population) / nullif(sum(r.chart_population), 0))::double precision,
    (sum(r.stock_loss_harvest_pct * r.chart_population) / nullif(sum(r.chart_population), 0))::double precision,
    (sum(r.stock_loss_chart_pct * r.chart_population) / nullif(sum(r.chart_population), 0))::double precision$new$);
  IF (length(definition) - length(replace(definition, $old$select r.batch_id, r.reconciliation_date, 0,
    case when coalesce(r.notes, '') like 'Auto-reconciled at final harvest%' then 0 else -r.fish_delta end,
    case when coalesce(r.notes, '') like 'Auto-reconciled at final harvest%' then -r.fish_delta else 0 end$old$, ''))) / length($old$select r.batch_id, r.reconciliation_date, 0,
    case when coalesce(r.notes, '') like 'Auto-reconciled at final harvest%' then 0 else -r.fish_delta end,
    case when coalesce(r.notes, '') like 'Auto-reconciled at final harvest%' then -r.fish_delta else 0 end$old$) <> 1 THEN
    RAISE EXCEPTION 'Cumulative loss chart anchor 6 did not match exactly once';
  END IF;
  definition := replace(definition, $old$select r.batch_id, r.reconciliation_date, 0,
    case when coalesce(r.notes, '') like 'Auto-reconciled at final harvest%' then 0 else -r.fish_delta end,
    case when coalesce(r.notes, '') like 'Auto-reconciled at final harvest%' then -r.fish_delta else 0 end$old$, $new$select r.batch_id, r.reconciliation_date,
    case when r.reason = 'discarded_fish' then -r.fish_delta else 0 end,
    case when r.reason = 'discarded_fish' or coalesce(r.notes, '') like 'Auto-reconciled at final harvest%' then 0 else -r.fish_delta end,
    case when coalesce(r.notes, '') like 'Auto-reconciled at final harvest%' then -r.fish_delta else 0 end$new$);
  EXECUTE definition;
END $migration$;

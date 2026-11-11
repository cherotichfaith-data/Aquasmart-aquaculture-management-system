-- Stock loss breakdown: monthly opening stock plus receipts, or cumulative cycle receipts.
-- Mixed-batch relabelling is a movement, not a loss. Positive count corrections stay signed.
DO $migration$
DECLARE definition text := pg_get_functiondef('public.api_analytics_performance(uuid,date,date,date,text[],text)'::regprocedure);
BEGIN
  IF (length(definition) - length(replace(definition, $old$stock_loss as (
  select batch_id,
    sum(delta) filter (where date < bd.s) as opening_fish,
    coalesce(sum(losses) filter (where date >= bd.s), 0) as lost_fish
  from loss_events cross join bounds bd
  where date <= bd.e
  group by batch_id
  having sum(delta) filter (where date < bd.s) > 0
    and not bool_or(ambiguous and date < bd.s)
)$old$, ''))) / length($old$stock_loss as (
  select batch_id,
    sum(delta) filter (where date < bd.s) as opening_fish,
    coalesce(sum(losses) filter (where date >= bd.s), 0) as lost_fish
  from loss_events cross join bounds bd
  where date <= bd.e
  group by batch_id
  having sum(delta) filter (where date < bd.s) > 0
    and not bool_or(ambiguous and date < bd.s)
)$old$) <> 1 THEN
    RAISE EXCEPTION 'Stock loss migration anchor 1 did not match exactly once';
  END IF;
  definition := replace(definition, $old$stock_loss as (
  select batch_id,
    sum(delta) filter (where date < bd.s) as opening_fish,
    coalesce(sum(losses) filter (where date >= bd.s), 0) as lost_fish
  from loss_events cross join bounds bd
  where date <= bd.e
  group by batch_id
  having sum(delta) filter (where date < bd.s) > 0
    and not bool_or(ambiguous and date < bd.s)
)$old$, $new$cycle_receipts as (
  select fs.batch_id, fs.date, fs.number_of_fish_stocking::double precision as fish
  from public.fish_stocking fs join b using (batch_id)
  union all
  select t.batch_id, t.date, t.number_of_fish_transfer
  from public.fish_transfer t join b using (batch_id)
  where t.origin_system_id is null and t.target_system_id is not null and t.transfer_type <> 'count_check'
  union all
  select r.batch_id, r.reconciliation_date, r.fish_delta
  from public.fish_inventory_reconciliation r join b using (batch_id)
  where r.reason = 'mixed_from_source_batch' and r.fish_delta > 0
),
loss_components as (
  select m.batch_id, m.date, m.number_of_fish_mortality::double precision as mortality,
    0::double precision as adjustment, 0::double precision as harvest
  from public.fish_mortality m join b using (batch_id)
  union all
  select r.batch_id, r.reconciliation_date, 0,
    case when coalesce(r.notes, '') like 'Auto-reconciled at final harvest%' then 0 else -r.fish_delta end,
    case when coalesce(r.notes, '') like 'Auto-reconciled at final harvest%' then -r.fish_delta else 0 end
  from public.fish_inventory_reconciliation r join b using (batch_id)
  where left(coalesce(r.reason, ''), 6) <> 'mixed_'
  union all
  select t.batch_id, t.date, 0,
    case when t.origin_system_id is not null then t.number_of_fish_transfer else -t.number_of_fish_transfer end, 0
  from public.fish_transfer t join b using (batch_id)
  where (t.transfer_type = 'external_out' and t.origin_system_id is not null and t.target_system_id is null)
    or (t.transfer_type = 'count_check' and ((t.origin_system_id is null) <> (t.target_system_id is null)))
),
stock_loss_balances as (
  select le.batch_id,
    case when coalesce('stock_loss_cycle' = any(p_sections), false)
      then (select sum(cr.fish) from cycle_receipts cr where cr.batch_id = le.batch_id and cr.date <= bd.e)
      else coalesce(sum(le.delta) filter (where le.date < bd.s), 0)
        + coalesce((select sum(cr.fish) from cycle_receipts cr where cr.batch_id = le.batch_id and cr.date between bd.s and bd.e), 0)
    end as opening_fish,
    bool_or(le.ambiguous and (coalesce('stock_loss_cycle' = any(p_sections), false) or le.date < bd.s)) as ambiguous
  from loss_events le cross join bounds bd
  where le.date <= bd.e
  group by le.batch_id, bd.s, bd.e
),
stock_loss as (
  select balance.batch_id, balance.opening_fish,
    coalesce(c.mortality, 0) + coalesce(c.adjustment, 0) + coalesce(c.harvest, 0) as lost_fish,
    coalesce(c.mortality, 0) as mortality_fish, coalesce(c.adjustment, 0) as adjustment_fish,
    coalesce(c.harvest, 0) as harvest_fish
  from stock_loss_balances balance cross join bounds bd
  cross join lateral (
    select sum(lc.mortality) as mortality, sum(lc.adjustment) as adjustment, sum(lc.harvest) as harvest
    from loss_components lc where lc.batch_id = balance.batch_id and lc.date <= bd.e
      and (coalesce('stock_loss_cycle' = any(p_sections), false) or lc.date >= bd.s)
  ) c
  where balance.opening_fish > 0 and not balance.ambiguous
)$new$);
  IF (length(definition) - length(replace(definition, $old$where case when coalesce('growth_custom' = any(p_sections), false)$old$, ''))) / length($old$where case when coalesce('growth_custom' = any(p_sections), false)$old$) <> 1 THEN
    RAISE EXCEPTION 'Stock loss migration anchor 2 did not match exactly once';
  END IF;
  definition := replace(definition, $old$where case when coalesce('growth_custom' = any(p_sections), false)$old$, $new$where case when coalesce('stock_loss_cycle' = any(p_sections), false)
    then base.has_stock_record and exists (
      select 1 from public.production_cycle pc where pc.batch_id = base.batch_id
        and pc.cycle_start <= (select e from bounds)
        and ((pc.cycle_end is null and pc.ongoing_cycle) or pc.cycle_end > (select e from bounds)))
    when coalesce('growth_custom' = any(p_sections), false)$new$);
  IF (length(definition) - length(replace(definition, $old$sl.opening_fish as opening_n, sl.lost_fish,$old$, ''))) / length($old$sl.opening_fish as opening_n, sl.lost_fish,$old$) <> 1 THEN
    RAISE EXCEPTION 'Stock loss migration anchor 3 did not match exactly once';
  END IF;
  definition := replace(definition, $old$sl.opening_fish as opening_n, sl.lost_fish,$old$, $new$sl.opening_fish as opening_n, sl.lost_fish,
    (100.0 * sl.mortality_fish / nullif(sl.opening_fish, 0))::double precision as stock_loss_mortality_pct,
    (100.0 * sl.adjustment_fish / nullif(sl.opening_fish, 0))::double precision as stock_loss_adjustment_pct,
    (100.0 * sl.harvest_fish / nullif(sl.opening_fish, 0))::double precision as stock_loss_harvest_pct,$new$);
  IF (length(definition) - length(replace(definition, $old$r.chart_recorded_kg, r.interval_expected_kg
  from result r$old$, ''))) / length($old$r.chart_recorded_kg, r.interval_expected_kg
  from result r$old$) <> 1 THEN
    RAISE EXCEPTION 'Stock loss migration anchor 4 did not match exactly once';
  END IF;
  definition := replace(definition, $old$r.chart_recorded_kg, r.interval_expected_kg
  from result r$old$, $new$r.chart_recorded_kg, r.interval_expected_kg,
         r.stock_loss_mortality_pct, r.stock_loss_adjustment_pct, r.stock_loss_harvest_pct
  from result r$new$);
  IF (length(definition) - length(replace(definition, $old$null::double precision as chart_recorded_kg, null::double precision as interval_expected_kg
  from result r$old$, ''))) / length($old$null::double precision as chart_recorded_kg, null::double precision as interval_expected_kg
  from result r$old$) <> 1 THEN
    RAISE EXCEPTION 'Stock loss migration anchor 5 did not match exactly once';
  END IF;
  definition := replace(definition, $old$null::double precision as chart_recorded_kg, null::double precision as interval_expected_kg
  from result r$old$, $new$null::double precision as chart_recorded_kg, null::double precision as interval_expected_kg,
    (sum(r.stock_loss_mortality_pct * r.opening_n) / nullif(sum(r.opening_n), 0))::double precision,
    (sum(r.stock_loss_adjustment_pct * r.opening_n) / nullif(sum(r.opening_n), 0))::double precision,
    (sum(r.stock_loss_harvest_pct * r.opening_n) / nullif(sum(r.opening_n), 0))::double precision
  from result r$new$);
  EXECUTE definition;
END $migration$;

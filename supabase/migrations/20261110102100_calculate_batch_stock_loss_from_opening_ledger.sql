-- Compute stock loss from opening ledger balances and recorded losses.
-- Count adjustments contribute to opening stock but are separate from period losses.
do $migration$
declare
  definition text := pg_get_functiondef(
    'public.api_analytics_performance(uuid,date,date,date,text[],text)'::regprocedure
  );
begin
  if strpos(definition, 'loss_events as (') > 0 then
    return;
  end if;
  if strpos(definition, $before$result as (
  select base.batch_id$before$) = 0 then
    raise exception 'Expected stock loss function definition was not found';
  end if;
  definition := replace(definition, $before$result as (
  select base.batch_id$before$, $after$loss_events as (
  select fs.batch_id, fs.date, fs.number_of_fish_stocking::double precision as delta, 0::double precision as losses, false as ambiguous
    from public.fish_stocking fs join b using (batch_id)
  union all select fm.batch_id, fm.date, -fm.number_of_fish_mortality, fm.number_of_fish_mortality, false
    from public.fish_mortality fm join b using (batch_id)
  union all select h.batch_id, h.date, -h.number_of_fish_harvest, 0, false
    from public.fish_harvest h join b using (batch_id)
  union all select r.batch_id, r.reconciliation_date, r.fish_delta, 0, false
    from public.fish_inventory_reconciliation r join b using (batch_id)
  union all select t.batch_id, t.date,
    case when t.target_system_id is not null then t.number_of_fish_transfer else 0 end
      - case when t.origin_system_id is not null then t.number_of_fish_transfer else 0 end,
    case when t.transfer_type = 'external_out' and t.origin_system_id is not null then t.number_of_fish_transfer else 0 end,
    coalesce(t.transfer_type = 'count_check' and t.origin_system_id is not null and t.target_system_id is not null, false)
    from public.fish_transfer t join b using (batch_id)
    where t.origin_system_id is distinct from t.target_system_id
),
stock_loss as (
  select batch_id,
    sum(delta) filter (where date < bd.s) as opening_fish,
    coalesce(sum(losses) filter (where date >= bd.s), 0) as lost_fish
  from loss_events cross join bounds bd
  where date <= bd.e
  group by batch_id
  having sum(delta) filter (where date < bd.s) > 0
    and not bool_or(ambiguous and date < bd.s)
),
result as (
  select base.batch_id$after$);
  if strpos(definition, $before$(base.stock_end + base.mort_m + base.lost_m + base.harv_n_m - coalesce(base.stocked_m, 0)) as opening_n,$before$) = 0 then
    raise exception 'Expected stock loss function definition was not found';
  end if;
  definition := replace(definition, $before$(base.stock_end + base.mort_m + base.lost_m + base.harv_n_m - coalesce(base.stocked_m, 0)) as opening_n,$before$, $after$sl.opening_fish as opening_n, sl.lost_fish,$after$);
  if strpos(definition, $before$  from base
  where case$before$) = 0 then
    raise exception 'Expected stock loss function definition was not found';
  end if;
  definition := replace(definition, $before$  from base
  where case$before$, $after$  from base left join stock_loss sl on sl.batch_id = base.batch_id
  where case$after$);
  if strpos(definition, $before$((r.mortality - r.cage_corrections) / r.opening_n * 100)$before$) = 0 then
    raise exception 'Expected stock loss function definition was not found';
  end if;
  definition := replace(definition, $before$((r.mortality - r.cage_corrections) / r.opening_n * 100)$before$, $after$(r.lost_fish / r.opening_n * 100)$after$);
  if strpos(definition, $before$((sum(r.mortality) - sum(r.cage_corrections)) / sum(r.opening_n) * 100)$before$) = 0 then
    raise exception 'Expected stock loss function definition was not found';
  end if;
  definition := replace(definition, $before$((sum(r.mortality) - sum(r.cage_corrections)) / sum(r.opening_n) * 100)$before$, $after$(sum(r.lost_fish) / sum(r.opening_n) * 100)$after$);
  execute definition;
end;
$migration$;

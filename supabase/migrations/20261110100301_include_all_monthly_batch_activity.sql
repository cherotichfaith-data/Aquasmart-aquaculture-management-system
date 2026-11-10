-- The monthly analytics request already sends the growth_custom section flag.
-- Select batch rows by period overlap or dated activity, independent of current status.
do $migration$
declare
  definition text := pg_get_functiondef(
    'public.api_analytics_performance(uuid,date,date,date,text[],text)'::regprocedure
  );
begin
  if strpos(definition, 'monthly_batch_ids as (') > 0 then
    return;
  end if;
  if strpos(definition, $before$base as (select b.batch_id, b.batch_name, st.date_in$before$) = 0 then
    raise exception 'Expected batch performance function definition was not found';
  end if;
  definition := replace(definition, $before$base as (select b.batch_id, b.batch_name, st.date_in$before$, $after$monthly_batch_ids as (
  select pc.batch_id from public.production_cycle pc join b on b.batch_id = pc.batch_id cross join bounds bd
  where pc.cycle_start <= bd.e and (pc.cycle_end is null or pc.cycle_end >= bd.s)
  union select fs.batch_id from public.fish_stocking fs join b on b.batch_id = fs.batch_id cross join bounds bd where fs.date between bd.s and bd.e
  union select ft.batch_id from public.fish_transfer ft join b on b.batch_id = ft.batch_id cross join bounds bd where ft.date between bd.s and bd.e
  union select r.batch_id from public.fish_inventory_reconciliation r join b on b.batch_id = r.batch_id cross join bounds bd where r.reconciliation_date between bd.s and bd.e
  union select batch_id from mort where mort_m is not null
  union select batch_id from harv where harv_n_m is not null or harv_kg_m is not null
  union select batch_id from feed_m
),
base as (select b.batch_id, b.batch_name, st.batch_id is not null as has_stock_record, st.date_in$after$);
  if strpos(definition, $before$from b join stock st on st.batch_id = b.batch_id$before$) = 0 then
    raise exception 'Expected batch performance function definition was not found';
  end if;
  definition := replace(definition, $before$from b join stock st on st.batch_id = b.batch_id$before$, $after$from b left join stock st on st.batch_id = b.batch_id$after$);
  if strpos(definition, $before$where (base.harv_n_m > 0 or exists (select 1 from public.production_cycle pc where pc.batch_id = base.batch_id and pc.cycle_start <= (select e from bounds) and pc.ongoing_cycle = true))
    and (base.stock_end > 0 or base.mort_m > 0 or base.harv_n_m > 0 or base.lost_m > 0)$before$) = 0 then
    raise exception 'Expected batch performance function definition was not found';
  end if;
  definition := replace(definition, $before$where (base.harv_n_m > 0 or exists (select 1 from public.production_cycle pc where pc.batch_id = base.batch_id and pc.cycle_start <= (select e from bounds) and pc.ongoing_cycle = true))
    and (base.stock_end > 0 or base.mort_m > 0 or base.harv_n_m > 0 or base.lost_m > 0)$before$, $after$where case when coalesce('growth_custom' = any(p_sections), false)
    then exists (select 1 from monthly_batch_ids m where m.batch_id = base.batch_id)
    else base.has_stock_record
      and (base.harv_n_m > 0 or exists (
        select 1 from public.production_cycle pc where pc.batch_id = base.batch_id
          and pc.cycle_start <= (select e from bounds) and pc.ongoing_cycle = true))
      and (base.stock_end > 0 or base.mort_m > 0 or base.harv_n_m > 0 or base.lost_m > 0)
    end$after$);
  execute definition;
end;
$migration$;

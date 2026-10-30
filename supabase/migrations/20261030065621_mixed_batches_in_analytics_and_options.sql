-- A mixed batch (e.g. 05.26mixi) has no stocking: its fish arrive through paired reconciliation rows from its source batches.
-- 1) api_fingerling_batch_options_rpc built its "active" balance without reconciliations, so the mix (deaths, no inflow)
--    had a negative balance and fell out of the active batch selectors. Reconciliations are now part of the balance.
-- 2) api_analytics_performance joined batches to fish_stocking, which dropped the mix from the batch table, ABW points and
--    growth rows. Mixed batches now enter at their mixed_on date with 0 stocked, and the mixing reconciliations are not
--    reported as cage corrections (they move fish between batches, they are not a count correction).
DO $migration$
DECLARE
  dry boolean := false;
  opt_def text;
  perf_def text;
  perf jsonb;
  mix_row jsonb;
  a1 constant text := 'where fh.batch_id is not null and fh.system_id is not null and fh.date <= current_date';
  a2 constant text := 'where fs.date <= bd.e group by fs.batch_id),';
  a3 constant text := 'sum(r.fish_delta) filter(where r.reconciliation_date>=bd.s)::double precision delta_m';
BEGIN
  opt_def := pg_get_functiondef('public.api_fingerling_batch_options_rpc(uuid,boolean)'::regprocedure);
  perf_def := pg_get_functiondef('public.api_analytics_performance(uuid,date,date,date,text[],text)'::regprocedure);
  IF (length(opt_def) - length(replace(opt_def, a1, ''))) / length(a1) <> 1 THEN RAISE EXCEPTION 'Options anchor not found exactly once'; END IF;
  IF (length(perf_def) - length(replace(perf_def, a2, ''))) / length(a2) <> 1 THEN RAISE EXCEPTION 'Stock anchor not found exactly once'; END IF;
  IF (length(perf_def) - length(replace(perf_def, a3, ''))) / length(a3) <> 1 THEN RAISE EXCEPTION 'Reconciled anchor not found exactly once'; END IF;

  opt_def := replace(opt_def, a1, a1 || E'\n  union all\n  select r.batch_id, r.system_id, r.fish_delta::double precision as qty_delta\n  from public.fish_inventory_reconciliation r\n  where r.batch_id is not null and r.system_id is not null and r.reconciliation_date <= current_date');
  perf_def := replace(perf_def, a2, 'where fs.date <= bd.e group by fs.batch_id'
    || E'\n union all select fb.id, fb.mixed_on, 0::double precision, 0::double precision from public.fingerling_batch fb join b on b.batch_id = fb.id, bounds bd where fb.is_mixed and fb.mixed_on is not null and fb.mixed_on <= bd.e and not exists (select 1 from public.fish_stocking sx where sx.batch_id = fb.id)),');
  perf_def := replace(perf_def, a3, 'sum(r.fish_delta) filter(where r.reconciliation_date>=bd.s and coalesce(r.reason, '''') not like ''mixed\_%'')::double precision delta_m');
  EXECUTE opt_def;
  EXECUTE perf_def;

  perf := public.api_analytics_performance('ae4f719b-e29e-4f60-bae0-2429cf840c5d'::uuid, date '2026-10-01');
  SELECT e INTO mix_row FROM jsonb_array_elements(perf->'batches') e WHERE e->>'batch_name' = '05.26mixi';
  IF mix_row IS NULL THEN RAISE EXCEPTION 'The mix is still missing from the October batch table'; END IF;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(perf->'abw_points') e WHERE e->>'batch_name' = '05.26mixi') THEN RAISE EXCEPTION 'The mix is still missing from the ABW points'; END IF;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(perf->'growth_by_batch') e WHERE e->>'batch_name' = '05.26mixi') THEN RAISE EXCEPTION 'The mix is still missing from the growth rows'; END IF;

  IF dry THEN RAISE EXCEPTION 'DRY RUN OK, rolled back: mix row %', mix_row; END IF;
END
$migration$;

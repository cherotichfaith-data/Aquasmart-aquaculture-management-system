-- api_monthly_production_inputs reported fish "transferred in" from transfer rows only. A mixed batch (e.g. 05.26mixi) receives
-- its fish through paired reconciliation rows from its source batches, so it showed 0 in. Count the positive "mixed from source
-- batch" reconciliations dated in the month as fish transferred in.
DO $migration$
DECLARE
  dry boolean := false;
  farm constant uuid := 'ae4f719b-e29e-4f60-bae0-2429cf840c5d';
  def text;
  before_rows jsonb;
  after_rows jsonb;
  mix_before numeric;
  mix_after numeric;
  changed integer;
  a constant text := 'coalesce(tr.incoming_no,0) as transferred_in_no,';
BEGIN
  def := pg_get_functiondef('public.api_monthly_production_inputs(uuid,date)'::regprocedure);
  IF (length(def) - length(replace(def, a, ''))) / length(a) <> 1 THEN RAISE EXCEPTION 'Anchor not found exactly once'; END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', (select user_id from public.farm_user where farm_id = farm limit 1), 'role', 'authenticated')::text, true);
  before_rows := public.api_monthly_production_inputs(farm, date '2026-10-01');

  def := replace(def, a, 'coalesce(tr.incoming_no,0) + coalesce((select sum(rc.fish_delta) from public.fish_inventory_reconciliation rc where rc.system_id=p.system_id and rc.batch_id=p.batch_id and rc.fish_delta>0 and rc.reason like ''mixed\_from%'' and rc.reconciliation_date between bd.s and bd.e),0) as transferred_in_no,');
  EXECUTE def;
  after_rows := public.api_monthly_production_inputs(farm, date '2026-10-01');

  SELECT (e->>'transferred_in_no')::numeric INTO mix_before FROM jsonb_array_elements(before_rows) e WHERE e->>'batch_name' = '05.26mixi' LIMIT 1;
  SELECT (e->>'transferred_in_no')::numeric INTO mix_after FROM jsonb_array_elements(after_rows) e WHERE e->>'batch_name' = '05.26mixi' LIMIT 1;
  SELECT count(*) INTO changed FROM jsonb_array_elements(after_rows) aft JOIN jsonb_array_elements(before_rows) bef ON aft->>'cage_name' = bef->>'cage_name' AND aft->>'batch_name' = bef->>'batch_name' WHERE aft->>'transferred_in_no' IS DISTINCT FROM bef->>'transferred_in_no';
  IF jsonb_array_length(before_rows) <> jsonb_array_length(after_rows) THEN RAISE EXCEPTION 'Row count changed: % -> %', jsonb_array_length(before_rows), jsonb_array_length(after_rows); END IF;
  IF mix_after IS NULL OR mix_after <= coalesce(mix_before, 0) THEN RAISE EXCEPTION 'Mix transferred-in did not increase: % -> %', mix_before, mix_after; END IF;
  IF changed <> 1 THEN RAISE EXCEPTION 'Expected exactly the mix row to change, % rows changed', changed; END IF;

  IF dry THEN RAISE EXCEPTION 'DRY RUN OK, rolled back: mix transferred in % -> %, rows % unchanged apart from the mix', mix_before, mix_after, jsonb_array_length(after_rows) - 1; END IF;
END
$migration$;

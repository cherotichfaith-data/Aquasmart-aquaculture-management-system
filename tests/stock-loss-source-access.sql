BEGIN;
DO $test$
DECLARE sources jsonb; cutoff date; denied boolean := false;
BEGIN
  IF has_function_privilege('anon','public.api_stock_loss_sources(uuid,date)','EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous users must not execute stock loss sources';
  END IF;
  PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000001"}',true);
  BEGIN
    PERFORM public.api_stock_loss_sources('ae4f719b-e29e-4f60-bae0-2429cf840c5d',date '2026-11-11');
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Non-member accessed another farm'; END IF;

  PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
  FOREACH cutoff IN ARRAY ARRAY[date '2026-05-31',date '2026-09-30',date '2026-10-31',date '2026-11-11'] LOOP
    sources := public.api_stock_loss_sources('ae4f719b-e29e-4f60-bae0-2429cf840c5d',cutoff);
    IF EXISTS(SELECT 1 FROM jsonb_array_elements(sources->'batches') b
      WHERE b->>'batch_name' ~* '^(BATCH-|INFERRED-)' OR (b->>'date_in')::date>cutoff)
      OR EXISTS(SELECT 1 FROM jsonb_array_elements(sources->'events') e WHERE (e->>'date')::date>cutoff) THEN
      RAISE EXCEPTION 'Invalid batch or future record leaked into %',cutoff;
    END IF;
  END LOOP;
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(sources->'batches') b WHERE b->>'batch_name'='05.26b')
    OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(sources->'batches') b WHERE b->>'batch_name'='10.26b') THEN
    RAISE EXCEPTION 'Valid closed or newly stocked batch omitted';
  END IF;
END $test$;
ROLLBACK;

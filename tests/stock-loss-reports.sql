-- Run after the stock loss migration. Read-only report checks, rolled back.
BEGIN;
SET LOCAL request.jwt.claims = '{"role":"service_role"}';
DO $test$
DECLARE result jsonb; entry jsonb; report_month date; period_sections text[];
BEGIN
  FOREACH period_sections SLICE 1 IN ARRAY ARRAY[
    ARRAY['batches','growth_custom'], ARRAY['batches','stock_loss_cycle']
  ] LOOP
    FOR report_month IN SELECT d::date FROM generate_series(date '2026-05-01',date '2026-11-01',interval '1 month') d LOOP
      result := public.api_analytics_performance(
        'ae4f719b-e29e-4f60-bae0-2429cf840c5d',report_month,report_month,
        least((report_month + interval '1 month - 1 day')::date,date '2026-11-11'),period_sections,'main');
      FOR entry IN SELECT e FROM jsonb_array_elements(result->'batches') e LOOP
        IF (entry->>'stock_loss_adjustment_pct')::numeric < 0
          OR (entry->>'stock_loss_harvest_pct')::numeric < 0 THEN
          RAISE EXCEPTION 'Unaccounted losses must not be negative: %',entry;
        END IF;
        IF entry->>'stock_loss_chart_pct' IS NOT NULL AND abs(
          (entry->>'stock_loss_chart_pct')::numeric
          - (entry->>'stock_loss_mortality_pct')::numeric
          - (entry->>'stock_loss_adjustment_pct')::numeric
          - (entry->>'stock_loss_harvest_pct')::numeric) > 0.000001 THEN
          RAISE EXCEPTION 'Loss causes do not reconcile: %',entry;
        END IF;
        IF entry->>'date_in' IS NOT NULL AND (entry->>'date_in')::date > (report_month + interval '1 month - 1 day')::date THEN
          RAISE EXCEPTION 'Future batch leaked into historical month: %',entry;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  result := public.api_analytics_performance(
    'ae4f719b-e29e-4f60-bae0-2429cf840c5d',date '2026-10-01',date '2025-03-13',date '2026-10-31',ARRAY['batches','stock_loss_cycle'],'main');
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(result->'batches') e
    WHERE e->>'batch_name' = '10.26b' AND (e->>'stock_loss_pct')::numeric >= 0)
    OR EXISTS (SELECT 1 FROM jsonb_array_elements(result->'batches') e WHERE e->>'batch_name' LIKE 'BATCH-%') THEN
    RAISE EXCEPTION 'Cycle selection retained closed legacy batches or dropped new stocking';
  END IF;

  result := public.api_analytics_performance(
    'ae4f719b-e29e-4f60-bae0-2429cf840c5d',date '2026-10-01',date '2026-10-01',date '2026-10-31',ARRAY['batches','growth_custom'],'main');
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(result->'batches') e
    WHERE e->>'batch_name' = '03.26c' AND (e->>'stock_loss_harvest_pct')::numeric > 0) THEN
    RAISE EXCEPTION 'November harvest shortfall leaked into October';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(result->'batches') e
    WHERE e->>'batch_name' = '05.26mixi' AND (e->>'stock_loss_adjustment_pct')::numeric = 0)
    OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(result->'batches') e
    WHERE e->>'batch_name' = '05.26cK' AND (e->>'stock_loss_adjustment_pct')::numeric = 0) THEN
    RAISE EXCEPTION 'Mixed movements or extra fish were misclassified as unaccounted losses';
  END IF;

  result := public.api_analytics_performance(
    'ae4f719b-e29e-4f60-bae0-2429cf840c5d',date '2026-11-01',date '2026-11-01',date '2026-11-11',ARRAY['batches','growth_custom'],'main');
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(result->'batches') e
    WHERE e->>'batch_name' = '03.26c' AND (e->>'stock_loss_harvest_pct')::numeric > 0) THEN
    RAISE EXCEPTION 'Final harvest shortfall missing from harvest loss component';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(result->'batches') e
    WHERE e->>'batch_name' = '03.26aK' AND (e->>'stock_loss_adjustment_pct')::numeric > 0)
    OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(result->'batches') e
    WHERE e->>'batch_name' = '02.26cK' AND (e->>'stock_loss_adjustment_pct')::numeric > 0) THEN
    RAISE EXCEPTION 'Earlier transfer losses disappeared from the November cumulative chart';
  END IF;
END $test$;
ROLLBACK;

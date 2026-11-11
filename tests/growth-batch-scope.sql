BEGIN;
SET LOCAL request.jwt.claims = '{"role":"service_role"}';
DO $test$
DECLARE report jsonb; cutoff date; sections text[];
BEGIN
  FOREACH cutoff IN ARRAY ARRAY[date '2025-11-30',date '2026-05-31',date '2026-09-30',date '2026-10-31',date '2026-11-11'] LOOP
    FOREACH sections SLICE 1 IN ARRAY ARRAY[
      ARRAY['batches','growth_by_batch','abw_points','abw_history','growth_custom'],
      ARRAY['batches','growth_by_batch','abw_points','abw_history','stock_loss_cycle']
    ] LOOP
      report := public.api_analytics_performance(
        'ae4f719b-e29e-4f60-bae0-2429cf840c5d',cutoff,
        case when 'growth_custom'=any(sections) then date_trunc('month',cutoff)::date else date '2025-03-13' end,
        cutoff,sections,'main');
      IF EXISTS(SELECT 1 FROM jsonb_array_elements(report->'growth_by_batch') e
        WHERE e->>'batch_name' ~* '^(BATCH-|INFERRED-)')
        OR EXISTS(SELECT 1 FROM jsonb_array_elements(report->'abw_points') e
        WHERE e->>'batch_name' ~* '^(BATCH-|INFERRED-)') THEN
        RAISE EXCEPTION 'Archived cohort leaked into growth at %',cutoff;
      END IF;
      IF EXISTS(
        SELECT 1 FROM jsonb_array_elements(report->'batches') b
        FULL JOIN jsonb_array_elements(report->'growth_by_batch') g ON b->>'batch_id'=g->>'batch_id'
        WHERE (b->>'batch_id' IS NOT NULL OR g->>'batch_id' IS NOT NULL)
          AND (b->>'batch_id' IS NULL OR g->>'batch_id' IS NULL
            OR b->>'growth_kg' IS DISTINCT FROM g->>'gain_recorded_kg')
      ) THEN RAISE EXCEPTION 'Growth chart and table diverged at %',cutoff; END IF;
      IF cutoff>=date '2026-10-31' AND NOT EXISTS(
        SELECT 1 FROM jsonb_array_elements(report->'growth_by_batch') e WHERE e->>'batch_name'='10.26b'
      ) THEN RAISE EXCEPTION 'Valid new batch without growth was dropped'; END IF;
    END LOOP;
  END LOOP;
END $test$;
ROLLBACK;

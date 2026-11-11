BEGIN;
SET LOCAL request.jwt.claims = '{"role":"service_role"}';
DO $test$
DECLARE report jsonb; cutoff date; sections text[];
BEGIN
  FOREACH cutoff IN ARRAY ARRAY[date '2025-11-30',date '2026-05-31',date '2026-09-30',date '2026-10-31',date '2026-11-11'] LOOP
    FOREACH sections SLICE 1 IN ARRAY ARRAY[
      ARRAY['growth_by_batch','abw_points','abw_history','growth_custom'],
      ARRAY['growth_by_batch','abw_points','abw_history','growth_curve']
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
      IF NOT ('growth_custom'=any(sections)) AND EXISTS(
        SELECT 1 FROM jsonb_array_elements(report->'growth_by_batch') e
        WHERE NOT EXISTS (SELECT 1 FROM public.production_cycle pc
          WHERE pc.batch_id=(e->>'batch_id')::bigint AND pc.cycle_start<=cutoff
            AND ((pc.cycle_end IS NULL AND pc.ongoing_cycle) OR pc.cycle_end>cutoff))
      ) THEN RAISE EXCEPTION 'Closed cycle leaked into growth at %',cutoff; END IF;
      IF cutoff>=date '2026-10-31' AND NOT EXISTS(
        SELECT 1 FROM jsonb_array_elements(report->'growth_by_batch') e WHERE e->>'batch_name'='10.26b'
      ) THEN RAISE EXCEPTION 'Valid new batch without growth was dropped'; END IF;
    END LOOP;
  END LOOP;
END $test$;
ROLLBACK;

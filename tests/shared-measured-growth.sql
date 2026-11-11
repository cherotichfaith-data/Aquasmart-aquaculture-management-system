-- Run inside BEGIN/ROLLBACK. Verify separately requested views use identical scopes and growth.
SET LOCAL request.jwt.claims='{"role":"service_role"}';
DO $test$
DECLARE month date; cutoff date; mode text; flags text[]; table_rows jsonb; chart_rows jsonb; harvests jsonb;
BEGIN
 FOR month IN SELECT m::date FROM generate_series(date '2025-01-01',date '2026-11-01',interval '1 month') m LOOP
 cutoff:=least((month+interval '1 month - 1 day')::date,date '2026-11-11');
 FOREACH mode IN ARRAY ARRAY['month','cycle'] LOOP
 flags:=case when mode='month' then array['growth_custom'] else array['stock_loss_cycle'] end;
 table_rows:=public.api_analytics_performance('ae4f719b-e29e-4f60-bae0-2429cf840c5d',month,month,cutoff,array['batches']||flags,'main')->'batches';
 chart_rows:=public.api_analytics_performance('ae4f719b-e29e-4f60-bae0-2429cf840c5d',month,month,cutoff,array['growth_by_batch','abw_points','growth_curve']||flags,'main')->'growth_by_batch';
 IF EXISTS(
 SELECT 1 FROM jsonb_array_elements(table_rows) t FULL JOIN jsonb_array_elements(chart_rows) c
 ON t->>'batch_id'=c->>'batch_id'
 WHERE (t->>'batch_id' IS NOT NULL OR c->>'batch_id' IS NOT NULL)
 AND (t->>'batch_id' IS NULL OR c->>'batch_id' IS NULL
 OR (t->>'growth_kg') IS DISTINCT FROM (c->>'gain_recorded_kg'))
 ) THEN RAISE EXCEPTION 'Chart/table measured growth or batch set differs at % %',month,mode; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(chart_rows) c
 WHERE c->>'gain_recorded_kg' IS NULL AND c->>'gain_expected_kg' IS NOT NULL)
 THEN RAISE EXCEPTION 'Expected growth used a different measurement window'; END IF;
 END LOOP;
 harvests:=public.api_analytics_performance('ae4f719b-e29e-4f60-bae0-2429cf840c5d',month,month,cutoff,array['cage_harvests','batch_harvests'],'main');
 IF EXISTS(
 SELECT 1 FROM jsonb_array_elements((harvests->'cage_harvests')||(harvests->'batch_harvests')) h
 CROSS JOIN LATERAL (
 SELECT case when sum(i.gain)>0 then sum(i.feed)/sum(i.gain) end as expected
 FROM private.analytics_measured_intervals('ae4f719b-e29e-4f60-bae0-2429cf840c5d',cutoff) i
 WHERE i.cycle_id=(h->>'cycle_id')::bigint AND i.batch_id=(h->>'batch_id')::bigint
 AND (h->>'system_id' IS NULL OR i.system_id=(h->>'system_id')::bigint)
 AND i.date<=coalesce(h->>'report_cutoff',h->>'harvest_date')::date
 ) v WHERE ((h->>'efcr') IS NULL)<>(v.expected IS NULL)
 OR abs((h->>'efcr')::numeric-v.expected)>0.000001
 ) THEN RAISE EXCEPTION 'Harvest eFCR diverged from shared measured intervals at %',month; END IF;
 END LOOP;
 IF has_function_privilege('authenticated','private.analytics_measured_intervals(uuid,date)','execute')
 OR has_function_privilege('anon','private.analytics_measured_intervals(uuid,date)','execute') THEN
 RAISE EXCEPTION 'Private measurement helper is directly exposed'; END IF;
END $test$;
SELECT '46 monthly/cycle chart-table comparisons and 23 harvest periods passed' as result;

-- Run inside BEGIN/ROLLBACK. Month selects batches; losses use all entry-to-cutoff records.
SET LOCAL request.jwt.claims='{"role":"service_role"}';
DO $test$
DECLARE month date; cutoff date; sources jsonb; monthly jsonb; cycle jsonb; expected_ids jsonb; actual_ids jsonb;
BEGIN
 FOR month IN SELECT m::date FROM generate_series(date '2025-01-01',date '2026-11-01',interval '1 month') m LOOP
 cutoff:=least((month+interval '1 month - 1 day')::date,date '2026-11-11');
 sources:=public.api_stock_loss_sources('ae4f719b-e29e-4f60-bae0-2429cf840c5d',cutoff);
 monthly:=public.api_analytics_performance('ae4f719b-e29e-4f60-bae0-2429cf840c5d',month,month,cutoff,array['batches','growth_custom'],'main')->'batches';
 cycle:=public.api_analytics_performance('ae4f719b-e29e-4f60-bae0-2429cf840c5d',month,month,cutoff,array['batches','stock_loss_cycle'],'main')->'batches';
 SELECT coalesce(jsonb_agg(id order by id),'[]'::jsonb) INTO expected_ids FROM (
 SELECT (b->>'batch_id')::bigint id FROM jsonb_array_elements(sources->'batches') b
 WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(b->'active_periods') p
 WHERE (p->>'from')::date<=cutoff AND ((p->>'to') IS NULL OR (p->>'to')::date>=month))
 OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(b->'record_dates') d WHERE d::date between month and cutoff)
 OR EXISTS(SELECT 1 FROM jsonb_array_elements(sources->'events') e
 WHERE e->>'batch_id'=b->>'batch_id' AND (e->>'date')::date between month and cutoff)
 ) ids;
 SELECT coalesce(jsonb_agg((r->>'batch_id')::bigint order by (r->>'batch_id')::bigint),'[]'::jsonb)
 INTO actual_ids FROM jsonb_array_elements(monthly) r WHERE r->>'batch_id' IS NOT NULL;
 IF actual_ids IS DISTINCT FROM expected_ids THEN
 RAISE EXCEPTION 'Monthly cohort mismatch at %: % vs %',month,actual_ids,expected_ids; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(monthly) m JOIN jsonb_array_elements(cycle) c
 ON m->>'batch_id'=c->>'batch_id'
 WHERE (m->>'stock_loss_pct') IS DISTINCT FROM (c->>'stock_loss_pct')) THEN
 RAISE EXCEPTION 'Monthly losses are not cumulative at %',month; END IF;
 END LOOP;
END $test$;
SELECT '23 historical month cohorts and cumulative losses passed' as result;

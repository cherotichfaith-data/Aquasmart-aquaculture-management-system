-- Read-only regression: run inside BEGIN/ROLLBACK with the candidate function installed.
SET LOCAL request.jwt.claims='{"role":"service_role"}';
DO $test$
DECLARE month date; cutoff date; reports jsonb; h jsonb; expected_n numeric; expected_kg numeric;
DECLARE carried integer:=0;
BEGIN
 FOR month IN SELECT m::date FROM generate_series(date '2025-01-01',date '2026-11-01',interval '1 month') m LOOP
  cutoff:=least((month+interval '1 month - 1 day')::date,date '2026-11-11');
  reports:=public.api_analytics_performance('ae4f719b-e29e-4f60-bae0-2429cf840c5d',month,month,cutoff,array['cage_harvests','batch_harvests'],'main');
  FOR h IN SELECT value FROM jsonb_array_elements((reports->'cage_harvests')||(reports->'batch_harvests')) LOOP
   IF (h->>'first_harvest_date')::date>cutoff OR (h->>'harvest_date')::date>cutoff OR (h->>'report_cutoff')::date<>cutoff THEN
    RAISE EXCEPTION 'Future harvest data leaked at %',month;
   END IF;
   SELECT sum(number_of_fish_harvest),case when count(*) filter(where number_of_fish_harvest>0 and (total_weight_harvest is null or total_weight_harvest<=0))=0 then sum(total_weight_harvest) end
   INTO expected_n,expected_kg FROM public.fish_harvest
   WHERE cycle_id=(h->>'cycle_id')::bigint AND batch_id=(h->>'batch_id')::bigint AND date<=cutoff
    AND (h->>'system_id' IS NULL OR system_id=(h->>'system_id')::bigint);
   IF abs((h->>'harvest_number')::numeric-expected_n)>0.000001
     OR ((h->>'harvest_kg') IS NULL)<>(expected_kg IS NULL)
     OR abs((h->>'harvest_kg')::numeric-expected_kg)>0.000001 THEN
    RAISE EXCEPTION 'Harvest totals are not cumulative raw data at %',month;
   END IF;
   IF h->>'survival_pct' IS NOT NULL AND abs((h->>'survival_pct')::numeric-(100-(h->>'mortality_pct')::numeric+(h->>'cage_correction_pct')::numeric))>0.000001 THEN
    RAISE EXCEPTION 'Survival diverges from workbook formula at %',month;
   END IF;
   IF h->>'harvest_status'='complete' AND (h->>'stock_remaining')::numeric<>0 THEN
    RAISE EXCEPTION 'Partial harvest marked complete at %',month;
   END IF;
   IF h->>'harvest_status'='ongoing' AND (h->>'harvest_date')::date<month THEN carried:=carried+1; END IF;
  END LOOP;
  IF EXISTS (
   SELECT 1 FROM public.fish_harvest fh JOIN public.fingerling_batch b ON b.id=fh.batch_id
   WHERE b.farm_id='ae4f719b-e29e-4f60-bae0-2429cf840c5d' AND fh.date BETWEEN month AND cutoff AND fh.number_of_fish_harvest>0
   AND (NOT EXISTS (SELECT 1 FROM jsonb_array_elements(reports->'batch_harvests') report_row WHERE (report_row->>'cycle_id')::bigint=fh.cycle_id AND (report_row->>'batch_id')::bigint=fh.batch_id)
     OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(reports->'cage_harvests') report_row WHERE (report_row->>'cycle_id')::bigint=fh.cycle_id AND (report_row->>'system_id')::bigint=fh.system_id AND (report_row->>'batch_id')::bigint=fh.batch_id))
  ) THEN RAISE EXCEPTION 'Harvest activity missing from cage/batch report at %',month; END IF;
 END LOOP;
 IF carried=0 THEN RAISE EXCEPTION 'No ongoing harvests carried forward'; END IF;
END $test$;
SELECT '23 historical harvest periods: inclusion, carry-forward, cumulative totals, survival and cutoff checks passed' as result;

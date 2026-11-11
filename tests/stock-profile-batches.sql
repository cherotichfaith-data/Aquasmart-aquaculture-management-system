-- Capture baseline before applying the migration, inside BEGIN/ROLLBACK.
SET LOCAL request.jwt.claims='{"role":"service_role"}';
CREATE TEMP TABLE profile_before AS
SELECT cutoff,api_analytics_outlook(p_farm_id=>'ae4f719b-e29e-4f60-bae0-2429cf840c5d',p_month=>date_trunc('month',cutoff)::date,p_as_of=>cutoff,p_sections=>array['stock_profile'])->'stock_profile' AS rows
FROM unnest(array[date '2026-05-31',date '2026-09-30',date '2026-10-31',date '2026-11-11']) cutoff;
-- Apply the stock_profile_batch_names migration here, then run these assertions.
SET LOCAL request.jwt.claims='{"role":"service_role"}';
DO $test$
DECLARE snapshot record; after_rows jsonb;
BEGIN
 FOR snapshot IN SELECT * FROM profile_before LOOP
 after_rows:=public.api_analytics_outlook(p_farm_id=>'ae4f719b-e29e-4f60-bae0-2429cf840c5d',p_month=>date_trunc('month',snapshot.cutoff)::date,p_as_of=>snapshot.cutoff,p_sections=>array['stock_profile'])->'stock_profile';
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(snapshot.rows) oldrow
 FULL JOIN jsonb_array_elements(after_rows) newrow ON oldrow->>'class_no'=newrow->>'class_no'
 WHERE oldrow->>'cage_names' IS DISTINCT FROM newrow->>'cage_names'
 OR oldrow->>'recorded_fish' IS DISTINCT FROM newrow->>'recorded_fish'
 OR oldrow->>'recorded_cages' IS DISTINCT FROM newrow->>'recorded_cages') THEN
 RAISE EXCEPTION 'Stock profile counts or cages changed at %',snapshot.cutoff; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(after_rows) r
 WHERE (r->>'recorded_cages')::int>0 AND jsonb_array_length(r->'batch_names')=0) THEN
 RAISE EXCEPTION 'A populated weight class has no batch labels at %',snapshot.cutoff; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(after_rows) r CROSS JOIN LATERAL jsonb_array_elements_text(r->'batch_names') name
 WHERE NOT EXISTS(SELECT 1 FROM public.fingerling_batch fb WHERE fb.farm_id='ae4f719b-e29e-4f60-bae0-2429cf840c5d'
 AND coalesce(nullif(trim(fb.name),''),'Batch #'||fb.id::text)=name)) THEN
 RAISE EXCEPTION 'Batch label is not from this farm'; END IF;
 END LOOP;
 PERFORM set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000001"}',true);
 IF public.api_analytics_outlook(p_farm_id=>'ae4f719b-e29e-4f60-bae0-2429cf840c5d',p_month=>'2026-10-01',p_as_of=>'2026-10-31',p_sections=>array['stock_profile']) IS NOT NULL THEN
 RAISE EXCEPTION 'Non-member can read stock profile'; END IF;
END $test$;
SELECT 'Historical batch labels, unchanged counts, and farm access checks passed' AS result;

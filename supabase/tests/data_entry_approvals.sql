-- Run against a disposable database with the AquaSmart schema and approval migration.
-- Synthetic fixtures and all mutations are rolled back.
\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id) VALUES ('aa000000-0000-0000-0000-000000000001'),('aa000000-0000-0000-0000-000000000002'),('aa000000-0000-0000-0000-000000000003'),('aa000000-0000-0000-0000-000000000004');
INSERT INTO public.farm(id,name) VALUES ('bb000000-0000-0000-0000-000000000001','Approval test farm'),('bb000000-0000-0000-0000-000000000002','Other test farm');
INSERT INTO public.farm_user(farm_id,user_id,role) VALUES
('bb000000-0000-0000-0000-000000000001','aa000000-0000-0000-0000-000000000001','system_operator'),
('bb000000-0000-0000-0000-000000000001','aa000000-0000-0000-0000-000000000002','farm_manager'),
('bb000000-0000-0000-0000-000000000001','aa000000-0000-0000-0000-000000000003','viewer'),
('bb000000-0000-0000-0000-000000000002','aa000000-0000-0000-0000-000000000004','farm_manager');
INSERT INTO public.system(id,name,type,growth_stage,volume,farm_id) OVERRIDING SYSTEM VALUE VALUES
(91001,'TestA','cage','grow_out',100,'bb000000-0000-0000-0000-000000000001'),
(91002,'TestB','cage','grow_out',100,'bb000000-0000-0000-0000-000000000001'),
(91004,'TestEmpty','cage','grow_out',100,'bb000000-0000-0000-0000-000000000001'),
(91003,'TestOther','cage','grow_out',100,'bb000000-0000-0000-0000-000000000002');
INSERT INTO public.fingerling_supplier(id,company_name,location_country) OVERRIDING SYSTEM VALUE VALUES (91001,'Test supplier','TZ');
INSERT INTO public.fingerling_batch(id,supplier_id,date_of_delivery,number_of_fish,abw,name,farm_id) OVERRIDING SYSTEM VALUE VALUES
(91001,91001,'2026-01-01',1000,100,'Approval test batch','bb000000-0000-0000-0000-000000000001');
INSERT INTO public.feed_supplier(id,company_name,location_country) OVERRIDING SYSTEM VALUE VALUES (91001,'Test feed supplier','TZ');
INSERT INTO public.feed_type(id,feed_supplier_id,feed_category,feed_pellet_size,farm_id) OVERRIDING SYSTEM VALUE VALUES
(91001,91001,'grower','2mm','bb000000-0000-0000-0000-000000000001'),
(91002,91001,'finisher','4mm','bb000000-0000-0000-0000-000000000001');
INSERT INTO public.feeding_response_level(level,label,immediate_response,after_10_min,after_3_hours,action_guideline) VALUES (3,'Test response','Test','Test','Test','Test') ON CONFLICT DO NOTHING;
INSERT INTO public.water_quality_framework(parameter_name) VALUES ('temperature') ON CONFLICT DO NOTHING;

CREATE FUNCTION pg_temp.assert(ok boolean,msg text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %',msg; END IF; RAISE NOTICE 'PASS: %',msg; END $$;
CREATE FUNCTION pg_temp.must_fail(sql text,msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE sql; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'PASS: % (%)',msg,SQLERRM; RETURN; END;
  RAISE EXCEPTION 'FAIL: % unexpectedly succeeded',msg;
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aa000000-0000-0000-0000-000000000001',true);
SELECT public.submit_production_entries('stocking','bb000000-0000-0000-0000-000000000001',
'[{"system_id":91001,"batch_id":91001,"date":"2026-01-01","number_of_fish_stocking":1000,"total_weight_stocking":100,"type_of_stocking":"empty","local_id":"test-stock"}]');
SELECT pg_temp.assert((SELECT count(*)=1 FROM public.production_pending_entry),'operator sees own pending submission');
SELECT public.submit_production_entries('stocking','bb000000-0000-0000-0000-000000000001',
'[{"system_id":91001,"batch_id":91001,"date":"2026-01-01","number_of_fish_stocking":1000,"total_weight_stocking":100,"type_of_stocking":"empty","local_id":"test-stock"}]');
SELECT pg_temp.assert((SELECT count(*)=1 FROM public.production_pending_entry),'offline retry does not duplicate submission');
SELECT pg_temp.must_fail($q$SELECT public.submit_production_entries('stocking','bb000000-0000-0000-0000-000000000001','[{"system_id":91001,"batch_id":91001,"date":"2026-01-01","number_of_fish_stocking":900,"total_weight_stocking":100,"type_of_stocking":"empty","local_id":"test-stock"}]')$q$,'retry cannot overwrite original payload');
SELECT pg_temp.must_fail($q$SELECT public.review_production_entries('bb000000-0000-0000-0000-000000000001',ARRAY[(SELECT id FROM public.production_pending_entry LIMIT 1)],'approved')$q$,'operator cannot approve');
SELECT pg_temp.must_fail($q$INSERT INTO public.feeding_record(system_id,date,feeding_amount) VALUES (91001,'2026-01-02',0)$q$,'direct production insert cannot bypass queue');
SELECT pg_temp.must_fail($q$UPDATE public.production_pending_entry SET status='approved'$q$,'direct pending mutation denied');
SELECT pg_temp.must_fail($q$SELECT public.submit_production_entries('feeding','bb000000-0000-0000-0000-000000000001','[{"system_id":91003,"date":"2026-01-02","feeding_amount":0,"notes":"zero"}]')$q$,'cross farm system rejected');
SELECT pg_temp.must_fail($q$SELECT public.submit_production_entries('feeding','bb000000-0000-0000-0000-000000000001','[{"system_id":91001,"date":"2026-01-02","feeding_amount":0,"notes":"zero","id":1}]')$q$,'derived and unexpected fields rejected');
RESET ROLE;
SELECT pg_temp.assert((SELECT count(*)=0 FROM public.fish_stocking WHERE system_id IN (91001,91002,91003)),'pending stocking does not change official records');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aa000000-0000-0000-0000-000000000003',true);
SELECT pg_temp.assert((SELECT count(*)=0 FROM public.production_pending_entry),'viewer cannot read submissions');
SELECT pg_temp.must_fail($q$SELECT public.submit_production_entries('feeding','bb000000-0000-0000-0000-000000000001','[{"system_id":91001,"date":"2026-01-02","feeding_amount":0,"notes":"zero"}]')$q$,'viewer cannot submit');
SELECT set_config('request.jwt.claim.sub','aa000000-0000-0000-0000-000000000004',true);
SELECT pg_temp.assert((SELECT count(*)=0 FROM public.production_pending_entry),'another farm manager cannot read submissions');
SELECT set_config('request.jwt.claim.sub','aa000000-0000-0000-0000-000000000002',true);
SELECT public.review_production_entries('bb000000-0000-0000-0000-000000000001',ARRAY[(SELECT id FROM public.production_pending_entry WHERE local_id='test-stock')],'approved','Verified count');
SELECT public.review_production_entries('bb000000-0000-0000-0000-000000000001',ARRAY[(SELECT id FROM public.production_pending_entry WHERE local_id='test-stock')],'approved','Retry');
RESET ROLE;
SELECT pg_temp.assert((SELECT count(*)=1 FROM public.fish_stocking WHERE system_id IN (91001,91002,91003)),'approval retry creates one official record');
SELECT pg_temp.assert((SELECT cycle_id IS NOT NULL AND abw=100 FROM public.fish_stocking WHERE system_id IN (91001,91002,91003) LIMIT 1),'approval runs cycle and ABW triggers');
SELECT pg_temp.assert((SELECT reviewed_by='aa000000-0000-0000-0000-000000000002'::uuid AND review_reason='Verified count' FROM public.production_pending_entry LIMIT 1),'review audit facts preserved across retry');
SELECT pg_temp.must_fail($q$UPDATE public.production_pending_entry SET review_reason='overwrite'$q$,'terminal audit history immutable');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aa000000-0000-0000-0000-000000000001',true);
SELECT public.submit_production_entries('feeding','bb000000-0000-0000-0000-000000000001','[{"system_id":91001,"batch_id":91001,"date":"2026-01-02","feeding_amount":2,"feed_type_id":91001,"feeding_response":3,"local_id":"feed"}]');
SELECT public.submit_production_entries('mortality','bb000000-0000-0000-0000-000000000001','[{"system_id":91001,"batch_id":91001,"date":"2026-01-02","number_of_fish_mortality":1,"cause":"unknown","local_id":"mortality"}]');
SELECT public.submit_production_entries('sampling','bb000000-0000-0000-0000-000000000001','[{"system_id":91001,"batch_id":91001,"date":"2026-01-03","number_of_fish_sampling":10,"total_weight_sampling":1.1,"local_id":"sampling"}]');
SELECT public.submit_production_entries('transfer','bb000000-0000-0000-0000-000000000001','[{"origin_system_id":91001,"target_system_id":91002,"batch_id":91001,"date":"2026-01-04","number_of_fish_transfer":100,"total_weight_transfer":11,"transfer_type":"transfer","local_id":"transfer"}]');
SELECT public.submit_production_entries('harvest','bb000000-0000-0000-0000-000000000001','[{"system_id":91001,"batch_id":91001,"date":"2026-01-05","number_of_fish_harvest":50,"total_weight_harvest":5.5,"type_of_harvest":"partial","local_id":"harvest"}]');
SELECT public.submit_production_entries('water_quality','bb000000-0000-0000-0000-000000000001','[{"system_id":91001,"date":"2026-01-02","time":"09:00","measured_at":"2026-01-02T09:00:00Z","parameter_name":"temperature","parameter_value":27,"water_depth":1,"local_id":"water"}]');
SELECT public.submit_production_entries('feed_inventory','bb000000-0000-0000-0000-000000000001','[{"farm_id":"bb000000-0000-0000-0000-000000000001","inventory_date":"2026-01-02","feed_type_id":91001,"bag_weight":25,"amount_of_bags":4,"local_id":"feed-count"}]');
SELECT public.submit_production_entries('feeding','bb000000-0000-0000-0000-000000000001','[{"system_id":91001,"date":"2026-01-06","feeding_amount":0,"notes":"Rejected example","local_id":"reject"}]');
SELECT set_config('request.jwt.claim.sub','aa000000-0000-0000-0000-000000000002',true);
SELECT pg_temp.must_fail($q$SELECT public.review_production_entries('bb000000-0000-0000-0000-000000000001',ARRAY(SELECT id FROM public.production_pending_entry WHERE status='pending'),'approved')$q$,'bulk approval excludes physical feed counts');
SELECT public.review_production_entries('bb000000-0000-0000-0000-000000000001',ARRAY(SELECT id FROM public.production_pending_entry WHERE status='pending' AND entry_type<>'feed_inventory' AND local_id<>'reject'),'approved');
SELECT public.review_production_entries('bb000000-0000-0000-0000-000000000001',ARRAY(SELECT id FROM public.production_pending_entry WHERE local_id='feed-count'),'approved');
SELECT public.review_production_entries('bb000000-0000-0000-0000-000000000001',ARRAY(SELECT id FROM public.production_pending_entry WHERE local_id='reject'),'rejected','Incorrect entry');
SELECT pg_temp.must_fail($q$SELECT public.review_production_entries('bb000000-0000-0000-0000-000000000001',ARRAY(SELECT id FROM public.production_pending_entry WHERE local_id='reject'),'approved')$q$,'rejected record cannot later be approved');
RESET ROLE;
SELECT pg_temp.assert((SELECT count(*)=1 FROM public.feeding_record WHERE system_id IN (91001,91002,91003)),'approved feeding only; rejection does not create a record');
SELECT pg_temp.assert((SELECT count(*)=1 FROM public.fish_mortality WHERE system_id IN (91001,91002,91003)),'mortality approved');
SELECT pg_temp.assert((SELECT count(*)=1 FROM public.fish_sampling_weight WHERE system_id IN (91001,91002,91003)),'sampling approved');
SELECT pg_temp.assert((SELECT count(*)=1 FROM public.fish_transfer WHERE origin_system_id IN (91001,91002,91003) OR target_system_id IN (91001,91002,91003)),'transfer approved');
SELECT pg_temp.assert((SELECT count(*)=1 FROM public.fish_harvest WHERE system_id IN (91001,91002,91003)),'harvest approved');
SELECT pg_temp.assert((SELECT count(*)=1 FROM public.water_quality_measurement WHERE system_id IN (91001,91002,91003)),'water quality approved');
SELECT pg_temp.assert((SELECT count(*)=1 FROM public.feed_inventory WHERE farm_id='bb000000-0000-0000-0000-000000000001'),'feed count approved');

-- New checks: future date, duplicate (official + pending), and the live-count guard.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aa000000-0000-0000-0000-000000000001',true);
SELECT pg_temp.must_fail(
  format($q$SELECT public.submit_production_entries('feeding','bb000000-0000-0000-0000-000000000001','[{"system_id":91001,"date":"%s","feeding_amount":0,"notes":"future","local_id":"future"}]')$q$,(current_date+5)::text),
  'future-dated entry rejected');
SELECT pg_temp.must_fail($q$SELECT public.submit_production_entries('feeding','bb000000-0000-0000-0000-000000000001','[{"system_id":91001,"date":"2026-01-02","feeding_amount":2,"feed_type_id":91001,"feeding_response":3,"local_id":"dupe-feed"}]')$q$,'duplicate of approved feeding rejected');
SELECT pg_temp.must_fail($q$SELECT public.submit_production_entries('mortality','bb000000-0000-0000-0000-000000000001','[{"system_id":91001,"batch_id":91001,"date":"2026-01-02","number_of_fish_mortality":1,"cause":"unknown","local_id":"dupe-mort"}]')$q$,'duplicate of approved mortality rejected');
SELECT public.submit_production_entries('feeding','bb000000-0000-0000-0000-000000000001','[{"system_id":91001,"date":"2026-01-02","feeding_amount":1,"feed_type_id":91002,"feeding_response":3,"local_id":"other-feed-type-ok"}]');
SELECT pg_temp.assert((SELECT count(*)=1 FROM public.production_pending_entry WHERE local_id='other-feed-type-ok'),'a different feed type on the same day is allowed');
SELECT public.submit_production_entries('mortality','bb000000-0000-0000-0000-000000000001','[{"system_id":91002,"batch_id":91001,"date":"2026-02-01","number_of_fish_mortality":2,"cause":"unknown","local_id":"pending-mort-1"}]');
SELECT pg_temp.must_fail($q$SELECT public.submit_production_entries('mortality','bb000000-0000-0000-0000-000000000001','[{"system_id":91002,"batch_id":91001,"date":"2026-02-01","number_of_fish_mortality":3,"cause":"unknown","local_id":"pending-mort-2"}]')$q$,'duplicate of a pending mortality rejected');
SELECT public.submit_production_entries('mortality','bb000000-0000-0000-0000-000000000001','[{"system_id":91002,"batch_id":91001,"date":"2026-02-01","number_of_fish_mortality":2,"cause":"unknown","local_id":"pending-mort-1"}]');
SELECT pg_temp.assert((SELECT count(*)=1 FROM public.production_pending_entry WHERE entry_type='mortality' AND system_id=91002 AND event_date='2026-02-01'),'re-sending the same local_id is not a duplicate');
SELECT pg_temp.must_fail($q$SELECT public.submit_production_entries('mortality','bb000000-0000-0000-0000-000000000001','[{"system_id":91001,"batch_id":91001,"date":"2026-03-01","number_of_fish_mortality":900,"cause":"unknown","local_id":"over-count"}]')$q$,'mortality exceeding the live count rejected');
SELECT pg_temp.must_fail($q$SELECT public.submit_production_entries('harvest','bb000000-0000-0000-0000-000000000001','[{"system_id":91004,"batch_id":91001,"date":"2026-03-01","number_of_fish_harvest":1,"total_weight_harvest":0.1,"type_of_harvest":"partial","local_id":"empty-harvest"}]')$q$,'removal from an empty system rejected');
SELECT public.submit_production_entries('mortality','bb000000-0000-0000-0000-000000000001','[{"system_id":91001,"batch_id":91001,"date":"2026-03-01","number_of_fish_mortality":800,"total_weight_mortality":40,"cause":"unknown","local_id":"within-count"}]');
SELECT pg_temp.assert((SELECT count(*)=1 FROM public.production_pending_entry WHERE local_id='within-count'),'mortality within the live count is accepted');
SELECT pg_temp.must_fail($q$SELECT public.submit_production_entries('mortality','bb000000-0000-0000-0000-000000000001','[{"system_id":91001,"batch_id":91001,"date":"2026-04-01","number_of_fish_mortality":150,"cause":"unknown","local_id":"no-weight"}]')$q$,'mass mortality without a weight rejected');
RESET ROLE;
SELECT pg_temp.assert((SELECT count(*)=0 FROM public.production_pending_entry WHERE local_id IN ('future','dupe-feed','dupe-mort','pending-mort-2','over-count','empty-harvest','no-weight')),'no rejected submission was stored');

-- Editing a still-pending entry in place.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aa000000-0000-0000-0000-000000000001',true);
SELECT public.update_pending_entry((SELECT id FROM public.production_pending_entry WHERE local_id='within-count'),
  '{"system_id":91001,"batch_id":91001,"date":"2026-03-02","number_of_fish_mortality":700,"total_weight_mortality":35,"cause":"disease"}');
SELECT pg_temp.assert((SELECT payload->>'number_of_fish_mortality'='700' AND payload->>'cause'='disease' AND event_date='2026-03-02'
  AND local_id='within-count' AND submitted_by='aa000000-0000-0000-0000-000000000001'::uuid
  FROM public.production_pending_entry WHERE local_id='within-count'),'operator edits own pending entry; identity and local_id preserved');
SELECT pg_temp.must_fail($q$SELECT public.update_pending_entry((SELECT id FROM public.production_pending_entry WHERE local_id='within-count'),
  '{"system_id":91001,"batch_id":91001,"date":"2026-03-02","number_of_fish_mortality":999999,"total_weight_mortality":35,"cause":"disease"}')$q$,'edit that breaks the live-count guard rejected');
SELECT pg_temp.must_fail($q$SELECT public.update_pending_entry((SELECT id FROM public.production_pending_entry WHERE local_id='within-count'),
  '{"system_id":91001,"batch_id":91001,"date":"2026-03-02","number_of_fish_mortality":700,"total_weight_mortality":35,"cause":"disease","id":7}')$q$,'edit with an unexpected field rejected');
SELECT set_config('request.jwt.claim.sub','aa000000-0000-0000-0000-000000000003',true);
SELECT pg_temp.must_fail($q$SELECT public.update_pending_entry((SELECT id FROM public.production_pending_entry WHERE local_id='within-count'),
  '{"system_id":91001,"batch_id":91001,"date":"2026-03-02","number_of_fish_mortality":1,"cause":"disease"}')$q$,'viewer cannot edit');
SELECT set_config('request.jwt.claim.sub','aa000000-0000-0000-0000-000000000002',true);
SELECT public.update_pending_entry((SELECT id FROM public.production_pending_entry WHERE local_id='within-count'),
  '{"system_id":91001,"batch_id":91001,"date":"2026-03-02","number_of_fish_mortality":650,"total_weight_mortality":33,"cause":"disease"}');
SELECT pg_temp.assert((SELECT payload->>'number_of_fish_mortality'='650' FROM public.production_pending_entry WHERE local_id='within-count'),'farm manager edits an operator submission');
SELECT public.review_production_entries('bb000000-0000-0000-0000-000000000001',ARRAY[(SELECT id FROM public.production_pending_entry WHERE local_id='within-count')],'approved');
SELECT pg_temp.must_fail($q$SELECT public.update_pending_entry((SELECT id FROM public.production_pending_entry WHERE local_id='within-count'),
  '{"system_id":91001,"batch_id":91001,"date":"2026-03-02","number_of_fish_mortality":600,"total_weight_mortality":30,"cause":"disease"}')$q$,'an approved entry can no longer be edited');
RESET ROLE;
SELECT pg_temp.assert((SELECT number_of_fish_mortality=650 FROM public.fish_mortality WHERE system_id=91001 AND date='2026-03-02'),'the edited values are what got written on approval');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aa000000-0000-0000-0000-000000000001',true);
SELECT public.submit_production_entries('feeding','bb000000-0000-0000-0000-000000000001','[{"system_id":91001,"date":"2026-01-07","feeding_amount":0,"notes":"Atomic first row","local_id":"atomic-first"},{"system_id":91002,"date":"2026-01-07","feeding_amount":0,"notes":"Atomic stale scope","local_id":"atomic-second"}]');
RESET ROLE;
UPDATE public.system SET farm_id='bb000000-0000-0000-0000-000000000002' WHERE id=91002;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aa000000-0000-0000-0000-000000000002',true);
SELECT pg_temp.must_fail($q$SELECT public.review_production_entries('bb000000-0000-0000-0000-000000000001',ARRAY(SELECT id FROM public.production_pending_entry WHERE local_id LIKE 'atomic-%'),'approved')$q$,'approval revalidates changed system scope');
SELECT pg_temp.assert((SELECT count(*)=2 FROM public.production_pending_entry WHERE local_id LIKE 'atomic-%' AND status='pending'),'failed bulk approval rolls back all decisions');
RESET ROLE;
SELECT pg_temp.assert((SELECT count(*)=1 FROM public.feeding_record WHERE system_id IN (91001,91002,91003)),'failed bulk approval rolls back official inserts and trigger effects');
SET LOCAL ROLE anon;
SELECT pg_temp.must_fail($q$SELECT public.submit_production_entries('feeding','bb000000-0000-0000-0000-000000000001','[]')$q$,'anonymous RPC denied');
RESET ROLE;
ROLLBACK;

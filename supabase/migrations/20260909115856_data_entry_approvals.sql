BEGIN;

CREATE TABLE public.production_pending_entry (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  farm_id uuid NOT NULL REFERENCES public.farm(id),
  entry_type text NOT NULL CHECK (entry_type IN ('feeding','mortality','sampling','stocking','transfer','harvest','water_quality','feed_inventory')),
  system_id bigint REFERENCES public.system(id),
  event_date date NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  local_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  submitted_by uuid NOT NULL REFERENCES auth.users(id),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_reason text CHECK (length(review_reason) <= 1000),
  official_record_id bigint,
  UNIQUE (farm_id, entry_type, submitted_by, local_id),
  CHECK ((status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL AND official_record_id IS NULL)
    OR (status = 'approved' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND official_record_id IS NOT NULL)
    OR (status = 'rejected' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND official_record_id IS NULL))
);
CREATE INDEX production_pending_entry_review_idx ON public.production_pending_entry (farm_id,status,event_date DESC,id DESC);
ALTER TABLE public.production_pending_entry ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.production_pending_entry FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.production_pending_entry TO authenticated;
CREATE POLICY production_pending_entry_read ON public.production_pending_entry FOR SELECT TO authenticated
USING (private.has_farm_role(farm_id, ARRAY['admin','farm_manager'], auth.uid())
  OR (submitted_by = auth.uid() AND private.has_farm_role(farm_id, ARRAY['system_operator'], auth.uid())));

-- History is durable: a pending entry may only be revised in place (details) or moved
-- one-way to a terminal decision, which then preserves the submission, reviewer and link.
CREATE FUNCTION private.protect_production_pending_entry() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Approval history cannot be deleted'; END IF;
  IF OLD.status = 'pending' AND NEW.status = 'pending' THEN
    IF (to_jsonb(OLD) - ARRAY['payload','event_date','system_id'])
       IS DISTINCT FROM (to_jsonb(NEW) - ARRAY['payload','event_date','system_id']) THEN
      RAISE EXCEPTION 'Only the observation details of a pending entry can be changed';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.status <> 'pending' OR NEW.status NOT IN ('approved','rejected')
    OR (to_jsonb(OLD) - ARRAY['status','reviewed_by','reviewed_at','review_reason','official_record_id'])
      IS DISTINCT FROM (to_jsonb(NEW) - ARRAY['status','reviewed_by','reviewed_at','review_reason','official_record_id']) THEN
    RAISE EXCEPTION 'Approval submissions are immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_production_pending_entry BEFORE UPDATE OR DELETE ON public.production_pending_entry
FOR EACH ROW EXECUTE FUNCTION private.protect_production_pending_entry();

-- Closed mapping: clients can never select an arbitrary table or write derived columns.
CREATE FUNCTION private.production_entry_config(p_type text) RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
SELECT CASE p_type
  WHEN 'feeding' THEN jsonb_build_object('table','feeding_record','fields','system_id,batch_id,date,feed_type_id,feeding_amount,feeding_response,notes,local_id')
  WHEN 'mortality' THEN jsonb_build_object('table','fish_mortality','fields','system_id,batch_id,date,number_of_fish_mortality,total_weight_mortality,cause,notes,local_id')
  WHEN 'sampling' THEN jsonb_build_object('table','fish_sampling_weight','fields','system_id,batch_id,date,number_of_fish_sampling,total_weight_sampling,notes,local_id')
  WHEN 'stocking' THEN jsonb_build_object('table','fish_stocking','fields','system_id,batch_id,date,number_of_fish_stocking,total_weight_stocking,type_of_stocking,notes,local_id')
  WHEN 'transfer' THEN jsonb_build_object('table','fish_transfer','fields','origin_system_id,target_system_id,external_target_name,batch_id,date,number_of_fish_transfer,total_weight_transfer,transfer_type,notes,local_id')
  WHEN 'harvest' THEN jsonb_build_object('table','fish_harvest','fields','system_id,batch_id,date,number_of_fish_harvest,total_weight_harvest,type_of_harvest,local_id')
  WHEN 'water_quality' THEN jsonb_build_object('table','water_quality_measurement','fields','system_id,date,time,measured_at,water_depth,parameter_name,parameter_value,location_reference,local_id')
  WHEN 'feed_inventory' THEN jsonb_build_object('table','feed_inventory','fields','farm_id,inventory_date,inventory_time,feed_type_id,bag_weight,amount_of_bags,opened_bags,comments')
END $$;

CREATE FUNCTION private.validate_production_entry(p_type text,p_farm_id uuid,p_payload jsonb,p_pending_id bigint DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_system bigint; v_batch bigint; v_feed bigint; v_key text; v_value numeric; v_date date; v_dupe boolean; v_take numeric; v_live numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to submit entries' USING ERRCODE='42501'; END IF;
  IF NOT private.has_farm_role(p_farm_id, ARRAY['admin','farm_manager','system_operator'],auth.uid()) THEN
    RAISE EXCEPTION 'Farm write permission required' USING ERRCODE='42501';
  END IF;
  IF private.production_entry_config(p_type) IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'Invalid entry type or payload';
  END IF;
  v_date := (p_payload->>CASE WHEN p_type='feed_inventory' THEN 'inventory_date' ELSE 'date' END)::date;
  IF v_date IS NULL THEN RAISE EXCEPTION 'Entry date required'; END IF;
  -- Reject future-dated observations. The +1 day tolerates the farm running ahead of UTC.
  IF v_date > current_date + 1 THEN RAISE EXCEPTION 'Entry date % cannot be in the future', v_date; END IF;
  IF p_type <> 'feed_inventory' THEN
    v_system := (p_payload->>CASE WHEN p_type='transfer' THEN 'origin_system_id' ELSE 'system_id' END)::bigint;
    PERFORM 1 FROM public.system WHERE id=v_system AND farm_id=p_farm_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'System does not belong to this farm' USING ERRCODE='42501'; END IF;
  ELSIF (p_payload->>'farm_id')::uuid IS DISTINCT FROM p_farm_id THEN
    RAISE EXCEPTION 'Inventory farm does not match' USING ERRCODE='42501';
  END IF;
  IF p_type='transfer' THEN
    IF p_payload->>'transfer_type'='external_out' THEN
      IF nullif(btrim(p_payload->>'external_target_name'),'') IS NULL OR p_payload->>'target_system_id' IS NOT NULL THEN
        RAISE EXCEPTION 'External transfer requires a named external destination';
      END IF;
    ELSE
      IF (p_payload->>'target_system_id')::bigint IS NOT DISTINCT FROM v_system THEN RAISE EXCEPTION 'Transfer systems must differ'; END IF;
      PERFORM 1 FROM public.system WHERE id=(p_payload->>'target_system_id')::bigint AND farm_id=p_farm_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Destination must belong to the same farm' USING ERRCODE='42501'; END IF;
    END IF;
  END IF;
  v_batch := (p_payload->>'batch_id')::bigint;
  IF v_batch IS NOT NULL THEN
    PERFORM 1 FROM public.fingerling_batch WHERE id=v_batch AND farm_id=p_farm_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Batch does not belong to this farm' USING ERRCODE='42501'; END IF;
  END IF;
  IF p_type='stocking' AND v_batch IS NULL THEN RAISE EXCEPTION 'Stocking batch required'; END IF;
  v_feed := (p_payload->>'feed_type_id')::bigint;
  IF v_feed IS NOT NULL THEN
    PERFORM 1 FROM public.feed_type WHERE id=v_feed AND (farm_id=p_farm_id OR farm_id IS NULL);
    IF NOT FOUND THEN RAISE EXCEPTION 'Feed type is unavailable to this farm' USING ERRCODE='42501'; END IF;
  END IF;
  FOREACH v_key IN ARRAY CASE p_type
    WHEN 'feeding' THEN ARRAY['feeding_amount'] WHEN 'mortality' THEN ARRAY['number_of_fish_mortality']
    WHEN 'sampling' THEN ARRAY['number_of_fish_sampling','total_weight_sampling']
    WHEN 'stocking' THEN ARRAY['number_of_fish_stocking','total_weight_stocking']
    WHEN 'transfer' THEN ARRAY['number_of_fish_transfer','total_weight_transfer']
    WHEN 'harvest' THEN ARRAY['number_of_fish_harvest','total_weight_harvest']
    WHEN 'water_quality' THEN ARRAY['water_depth']
    WHEN 'feed_inventory' THEN ARRAY['bag_weight','amount_of_bags'] END
  LOOP
    v_value := (p_payload->>v_key)::numeric;
    IF v_value IS NULL OR v_value::text IN ('NaN','Infinity','-Infinity') OR v_value < 0
      OR (v_key NOT IN ('feeding_amount','number_of_fish_mortality','water_depth','amount_of_bags') AND v_value=0)
      OR (v_key LIKE 'number_of_fish_%' AND v_value<>trunc(v_value)) THEN
      RAISE EXCEPTION 'Invalid quantity for %',v_key;
    END IF;
  END LOOP;
  -- Duplicate guard: reject an observation that repeats an approved record or another
  -- still-pending submission for the same slot. Mirrors the per-form same-day guards in the UI.
  IF p_type IN ('feeding','mortality','stocking','harvest') THEN
    IF p_type='feeding' THEN
      EXECUTE 'SELECT EXISTS(SELECT 1 FROM public.feeding_record WHERE system_id=$1 AND date=$2 AND feed_type_id IS NOT DISTINCT FROM $3)'
      INTO v_dupe USING v_system, v_date, v_feed;
    ELSE
      EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I WHERE system_id=$1 AND date=$2)',
        private.production_entry_config(p_type)->>'table')
      INTO v_dupe USING v_system, v_date;
    END IF;
    IF v_dupe THEN RAISE EXCEPTION 'An approved % entry already exists for this system and date', replace(p_type,'_',' '); END IF;
    SELECT EXISTS(SELECT 1 FROM public.production_pending_entry
      WHERE entry_type=p_type AND status='pending' AND farm_id=p_farm_id
        AND system_id=v_system AND event_date=v_date
        AND (p_pending_id IS NULL OR id<>p_pending_id)
        AND NOT (submitted_by=auth.uid() AND local_id=(p_payload->>'local_id'))
        AND (p_type<>'feeding' OR (payload->>'feed_type_id')::bigint IS NOT DISTINCT FROM v_feed))
    INTO v_dupe;
    IF v_dupe THEN RAISE EXCEPTION 'A pending % entry already exists for this system and date', replace(p_type,'_',' '); END IF;
  ELSIF p_type='water_quality' THEN
    SELECT EXISTS(SELECT 1 FROM public.water_quality_measurement
      WHERE system_id=v_system AND date=v_date AND "time"=(p_payload->>'time')::time
        AND parameter_name::text=(p_payload->>'parameter_name')
        AND water_depth=(p_payload->>'water_depth')::numeric) INTO v_dupe;
    IF v_dupe THEN RAISE EXCEPTION 'That water quality parameter already has a measurement for this system, date, time and depth'; END IF;
    SELECT EXISTS(SELECT 1 FROM public.production_pending_entry
      WHERE entry_type='water_quality' AND status='pending' AND farm_id=p_farm_id
        AND system_id=v_system AND event_date=v_date
        AND (p_pending_id IS NULL OR id<>p_pending_id)
        AND NOT (submitted_by=auth.uid() AND local_id=(p_payload->>'local_id'))
        AND payload->>'time'=(p_payload->>'time')
        AND payload->>'parameter_name'=(p_payload->>'parameter_name')
        AND (payload->>'water_depth')::numeric=(p_payload->>'water_depth')::numeric) INTO v_dupe;
    IF v_dupe THEN RAISE EXCEPTION 'A pending measurement already exists for that parameter, system, date, time and depth'; END IF;
  END IF;
  -- Inventory guard: a fish removal cannot exceed the system's current live count.
  IF p_type IN ('mortality','harvest','transfer') THEN
    v_take := (p_payload->>CASE p_type WHEN 'mortality' THEN 'number_of_fish_mortality'
      WHEN 'harvest' THEN 'number_of_fish_harvest' ELSE 'number_of_fish_transfer' END)::numeric;
    v_live := public.current_fish_count(v_system);
    IF v_take > v_live THEN
      RAISE EXCEPTION '% of % fish exceeds the current live count of % for this system',
        initcap(replace(p_type,'_',' ')), v_take, v_live;
    END IF;
  END IF;
  IF p_type='feeding' THEN
    IF (p_payload->>'feeding_amount')::numeric>0 AND (v_feed IS NULL OR coalesce((p_payload->>'feeding_response')::int,0) NOT BETWEEN 1 AND 5) THEN
      RAISE EXCEPTION 'Feed type and feeding response required';
    ELSIF (p_payload->>'feeding_amount')::numeric=0 AND nullif(btrim(p_payload->>'notes'),'') IS NULL THEN
      RAISE EXCEPTION 'Explain why feeding was not done';
    END IF;
  END IF;
  -- Cross-field rules the official tables enforce, checked here so both submission and
  -- editing are blocked before the record is written rather than failing at approval.
  IF p_type='mortality' AND (p_payload->>'number_of_fish_mortality')::numeric>=100
     AND (p_payload->>'total_weight_mortality') IS NULL THEN
    RAISE EXCEPTION 'Total dead weight is required when mortality is 100 fish or more';
  END IF;
  IF p_type='water_quality' AND (p_payload->>'measured_at') IS NOT NULL
     AND ((p_payload->>'date')::date IS DISTINCT FROM ((p_payload->>'measured_at')::timestamptz AT TIME ZONE 'UTC')::date
       OR (p_payload->>'time')::time IS DISTINCT FROM ((p_payload->>'measured_at')::timestamptz AT TIME ZONE 'UTC')::time) THEN
    RAISE EXCEPTION 'Measurement date and time must match the measured-at timestamp';
  END IF;
END $$;

CREATE FUNCTION private.submit_production_entries(p_type text,p_farm_id uuid,p_payloads jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_input jsonb; v_payload jsonb; v_fields text[]; v_local text; v_entry public.production_pending_entry; v_results jsonb:='[]';
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
  IF jsonb_typeof(p_payloads)<>'array' OR jsonb_array_length(p_payloads) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Submit between 1 and 100 entries'; END IF;
  v_fields := string_to_array(private.production_entry_config(p_type)->>'fields',',');
  IF v_fields IS NULL THEN RAISE EXCEPTION 'Unsupported entry type'; END IF;
  FOR v_input IN SELECT value FROM jsonb_array_elements(p_payloads) LOOP
    IF jsonb_typeof(v_input)<>'object' OR octet_length(v_input::text)>20000 THEN RAISE EXCEPTION 'Invalid entry payload'; END IF;
    IF EXISTS (SELECT 1 FROM jsonb_object_keys(v_input) k WHERE NOT k=ANY(v_fields || ARRAY['farm_id','synced_at','local_id'])) THEN
      RAISE EXCEPTION 'Unexpected entry field';
    END IF;
    v_local := coalesce(nullif(v_input->>'local_id',''),gen_random_uuid()::text);
    IF length(v_local)>128 THEN RAISE EXCEPTION 'Invalid local identifier'; END IF;
    SELECT coalesce(jsonb_object_agg(key,value),'{}') INTO v_payload FROM jsonb_each(v_input) WHERE key=ANY(v_fields);
    IF p_type<>'feed_inventory' THEN v_payload := v_payload || jsonb_build_object('local_id',v_local); END IF;
    -- An offline retry re-sends the same local_id: return the stored row untouched rather
    -- than re-validating (its slot is legitimately "taken" by this very submission).
    SELECT * INTO v_entry FROM public.production_pending_entry
      WHERE farm_id=p_farm_id AND entry_type=p_type AND submitted_by=auth.uid() AND local_id=v_local;
    IF FOUND THEN
      IF v_entry.payload IS DISTINCT FROM v_payload THEN RAISE EXCEPTION 'This submission identifier already has different data'; END IF;
    ELSE
      PERFORM private.validate_production_entry(p_type,p_farm_id,v_payload);
      INSERT INTO public.production_pending_entry(farm_id,entry_type,system_id,event_date,payload,local_id,submitted_by)
      VALUES(p_farm_id,p_type,(v_payload->>CASE WHEN p_type='transfer' THEN 'origin_system_id' ELSE 'system_id' END)::bigint,
        (v_payload->>CASE WHEN p_type='feed_inventory' THEN 'inventory_date' ELSE 'date' END)::date,v_payload,v_local,auth.uid())
      ON CONFLICT (farm_id,entry_type,submitted_by,local_id) DO NOTHING RETURNING * INTO v_entry;
      IF NOT FOUND THEN
        SELECT * INTO STRICT v_entry FROM public.production_pending_entry WHERE farm_id=p_farm_id AND entry_type=p_type AND submitted_by=auth.uid() AND local_id=v_local;
        IF v_entry.payload IS DISTINCT FROM v_payload THEN RAISE EXCEPTION 'This submission identifier already has different data'; END IF;
      END IF;
    END IF;
    v_results := v_results || to_jsonb(v_entry);
  END LOOP;
  RETURN v_results;
END $$;

CREATE FUNCTION private.review_production_entries(p_farm_id uuid,p_ids bigint[],p_decision text,p_reason text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_entry public.production_pending_entry; v_id bigint; v_config jsonb; v_columns text; v_record_id bigint; v_results jsonb:='[]';
BEGIN
  IF auth.uid() IS NULL OR NOT private.has_farm_role(p_farm_id,ARRAY['admin','farm_manager'],auth.uid()) THEN
    RAISE EXCEPTION 'Administrator or farm manager approval required' USING ERRCODE='42501';
  END IF;
  IF p_decision NOT IN ('approved','rejected') OR p_decision IS NULL OR coalesce(cardinality(p_ids),0) NOT BETWEEN 1 AND 100 OR length(p_reason)>1000 THEN RAISE EXCEPTION 'Invalid review request'; END IF;
  -- Stable locking order prevents concurrent bulk reviews deadlocking one another.
  FOR v_id IN SELECT DISTINCT unnest(p_ids) ORDER BY 1 LOOP
    SELECT * INTO v_entry FROM public.production_pending_entry WHERE id=v_id AND farm_id=p_farm_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Submission is unavailable in this farm' USING ERRCODE='42501'; END IF;
    IF v_entry.status<> 'pending' THEN
      IF v_entry.status=p_decision THEN v_results:=v_results||to_jsonb(v_entry); CONTINUE; END IF;
      RAISE EXCEPTION 'Submission has already been reviewed';
    END IF;
    IF cardinality(p_ids)>1 AND v_entry.entry_type='feed_inventory' THEN RAISE EXCEPTION 'Review physical feed counts individually'; END IF;
    v_record_id:=NULL;
    IF p_decision='approved' THEN
      PERFORM private.validate_production_entry(v_entry.entry_type,p_farm_id,v_entry.payload,v_entry.id);
      v_config:=private.production_entry_config(v_entry.entry_type);
      SELECT string_agg(format('%I',key),',' ORDER BY key) INTO v_columns FROM jsonb_object_keys(v_entry.payload) key;
      -- Insert only supplied, whitelisted fields. Existing DB defaults and lineage/ABW/inventory triggers run atomically.
      EXECUTE format('INSERT INTO public.%I (%s) SELECT %s FROM jsonb_populate_record(NULL::public.%I,$1) RETURNING id',
        v_config->>'table',v_columns,v_columns,v_config->>'table') INTO v_record_id USING v_entry.payload;
    END IF;
    UPDATE public.production_pending_entry SET status=p_decision,reviewed_by=auth.uid(),reviewed_at=now(),
      review_reason=nullif(btrim(p_reason),''),official_record_id=v_record_id WHERE id=v_id RETURNING * INTO v_entry;
    v_results:=v_results||to_jsonb(v_entry);
  END LOOP;
  RETURN v_results;
END $$;

-- Revise a still-pending entry in place. Farm managers/admins may edit any entry in
-- their farm; an operator may edit only their own. Re-runs the full submission checks.
CREATE FUNCTION private.update_pending_entry(p_id bigint,p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_entry public.production_pending_entry; v_fields text[]; v_payload jsonb; v_manager boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
  IF jsonb_typeof(p_payload)<>'object' OR octet_length(p_payload::text)>20000 THEN RAISE EXCEPTION 'Invalid entry payload'; END IF;
  SELECT * INTO v_entry FROM public.production_pending_entry WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission is unavailable' USING ERRCODE='42501'; END IF;
  IF v_entry.status<>'pending' THEN RAISE EXCEPTION 'Only pending entries can be edited'; END IF;
  v_manager := private.has_farm_role(v_entry.farm_id,ARRAY['admin','farm_manager'],auth.uid());
  IF NOT v_manager THEN
    IF NOT private.has_farm_role(v_entry.farm_id,ARRAY['system_operator'],auth.uid()) THEN
      RAISE EXCEPTION 'Farm write permission required' USING ERRCODE='42501';
    END IF;
    IF v_entry.submitted_by<>auth.uid() THEN RAISE EXCEPTION 'You can only edit your own submissions' USING ERRCODE='42501'; END IF;
  END IF;
  v_fields := string_to_array(private.production_entry_config(v_entry.entry_type)->>'fields',',');
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(p_payload) k WHERE NOT k=ANY(v_fields || ARRAY['farm_id','synced_at','local_id'])) THEN
    RAISE EXCEPTION 'Unexpected entry field';
  END IF;
  SELECT coalesce(jsonb_object_agg(key,value),'{}') INTO v_payload FROM jsonb_each(p_payload) WHERE key=ANY(v_fields);
  IF v_entry.entry_type<>'feed_inventory' THEN v_payload := v_payload || jsonb_build_object('local_id',v_entry.local_id); END IF;
  PERFORM private.validate_production_entry(v_entry.entry_type,v_entry.farm_id,v_payload,p_id);
  UPDATE public.production_pending_entry SET payload=v_payload,
    system_id=(v_payload->>CASE WHEN v_entry.entry_type='transfer' THEN 'origin_system_id' ELSE 'system_id' END)::bigint,
    event_date=(v_payload->>CASE WHEN v_entry.entry_type='feed_inventory' THEN 'inventory_date' ELSE 'date' END)::date
  WHERE id=p_id RETURNING * INTO v_entry;
  RETURN to_jsonb(v_entry);
END $$;

-- Public RPC wrappers run as the caller; privileged code lives in the unexposed private schema.
CREATE FUNCTION public.submit_production_entries(p_type text,p_farm_id uuid,p_payloads jsonb) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT private.submit_production_entries(p_type,p_farm_id,p_payloads) $$;
CREATE FUNCTION public.review_production_entries(p_farm_id uuid,p_ids bigint[],p_decision text,p_reason text DEFAULT NULL) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT private.review_production_entries(p_farm_id,p_ids,p_decision,p_reason) $$;
CREATE FUNCTION public.update_pending_entry(p_id bigint,p_payload jsonb) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT private.update_pending_entry(p_id,p_payload) $$;

REVOKE ALL ON FUNCTION private.submit_production_entries(text,uuid,jsonb),private.review_production_entries(uuid,bigint[],text,text),
  private.update_pending_entry(bigint,jsonb),public.update_pending_entry(bigint,jsonb),
  public.submit_production_entries(text,uuid,jsonb),public.review_production_entries(uuid,bigint[],text,text),
  private.validate_production_entry(text,uuid,jsonb,bigint),private.production_entry_config(text),private.protect_production_pending_entry() FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.submit_production_entries(text,uuid,jsonb),private.review_production_entries(uuid,bigint[],text,text),
  private.update_pending_entry(bigint,jsonb),public.update_pending_entry(bigint,jsonb),
  public.submit_production_entries(text,uuid,jsonb),public.review_production_entries(uuid,bigint[],text,text) TO authenticated;

-- Enforce the queue even if an older client tries the former direct Data API write path.
REVOKE INSERT, UPDATE, DELETE ON public.feeding_record,public.fish_mortality,public.fish_sampling_weight,
  public.fish_stocking,public.fish_transfer,public.fish_harvest,public.water_quality_measurement,public.feed_inventory FROM anon,authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;

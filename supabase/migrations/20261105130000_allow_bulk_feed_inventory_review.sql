-- Feed inventory entries can now be approved or rejected in bulk, like every other entry type.
-- Only the "Review physical feed counts individually" guard is removed; validation still runs per entry
-- and the whole selection is approved atomically.
CREATE OR REPLACE FUNCTION private.review_production_entries(p_farm_id uuid, p_ids bigint[], p_decision text, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
END $function$;

-- Farm-scoped raw inputs for the shared workbook calculation. No source records are changed.
CREATE OR REPLACE FUNCTION public.api_stock_loss_sources(p_farm_id uuid, p_as_of date)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $function$
DECLARE result jsonb;
BEGIN
  IF NOT (coalesce(auth.jwt()->>'role', '') = 'service_role' OR coalesce(private.is_farm_member(p_farm_id),false))
    OR NOT coalesce(private.app_rpc_scope_ok(p_farm_id, null::bigint[], null::bigint, null::date, null::date),false) THEN
    RAISE EXCEPTION 'Not authorized for this farm' USING ERRCODE = '42501';
  END IF;
  IF p_as_of IS NULL OR p_as_of > (now() AT TIME ZONE 'Africa/Nairobi')::date THEN
    RAISE EXCEPTION 'Invalid reporting cutoff';
  END IF;
  WITH b AS MATERIALIZED (
    SELECT fb.id AS batch_id, fb.name AS batch_name,
      coalesce(fb.mixed_on, st.first_stocking, fb.date_of_delivery) AS date_in
    FROM public.fingerling_batch fb
    LEFT JOIN LATERAL (SELECT min(fs.date) AS first_stocking FROM public.fish_stocking fs WHERE fs.batch_id=fb.id) st ON true
    WHERE fb.farm_id=p_farm_id AND coalesce(fb.name, '') !~* '^(BATCH-|INFERRED-)'
      AND coalesce(fb.mixed_on, st.first_stocking, fb.date_of_delivery)<=p_as_of
  ), events AS (
    SELECT s.batch_id,s.system_id,s.date,s.number_of_fish_stocking::double precision AS delta,
      s.number_of_fish_stocking::double precision AS received,'stocking'::text AS kind,
      coalesce(1000.0*s.total_weight_stocking/nullif(s.number_of_fish_stocking,0),s.abw) AS abw,
      0::double precision AS sample_n
    FROM public.fish_stocking s JOIN b USING(batch_id)
    UNION ALL
    SELECT m.batch_id,m.system_id,m.date,-m.number_of_fish_mortality,0,'mortality',null,0
    FROM public.fish_mortality m JOIN b USING(batch_id)
    UNION ALL
    SELECT h.batch_id,h.system_id,h.date,-h.number_of_fish_harvest,0,'harvest',
      1000.0*h.total_weight_harvest/nullif(h.number_of_fish_harvest,0),0
    FROM public.fish_harvest h JOIN b USING(batch_id)
    UNION ALL
    SELECT t.batch_id,leg.system_id,t.date,leg.sign*t.number_of_fish_transfer,
      CASE WHEN t.origin_system_id IS NULL AND leg.sign=1 AND t.transfer_type<>'count_check' THEN t.number_of_fish_transfer ELSE 0 END,
      CASE WHEN t.transfer_type='count_check' AND t.origin_system_id IS NOT NULL AND t.target_system_id IS NOT NULL THEN 'ambiguous'
        WHEN t.transfer_type='count_check' THEN 'adjustment'
        WHEN t.transfer_type='external_out' AND leg.sign=-1 THEN 'adjustment' ELSE 'transfer' END,
      CASE WHEN t.transfer_type<>'count_check' THEN coalesce(1000.0*t.total_weight_transfer/nullif(t.number_of_fish_transfer,0),t.abw) END,0
    FROM public.fish_transfer t JOIN b USING(batch_id)
    CROSS JOIN LATERAL (VALUES(t.origin_system_id,-1),(t.target_system_id,1)) leg(system_id,sign)
    WHERE leg.system_id IS NOT NULL
    UNION ALL
    SELECT r.batch_id,r.system_id,r.reconciliation_date,r.fish_delta,
      CASE WHEN r.reason='mixed_from_source_batch' AND r.fish_delta>0 THEN r.fish_delta ELSE 0 END,
      CASE WHEN left(coalesce(r.reason,''),6)='mixed_' THEN 'mix'
        WHEN r.reason='discarded_fish' THEN 'discard'
        WHEN coalesce(r.notes,'') LIKE 'Auto-reconciled at final harvest%' THEN 'harvest_adjustment'
        ELSE 'adjustment' END,null,0
    FROM public.fish_inventory_reconciliation r JOIN b USING(batch_id)
    UNION ALL
    SELECT s.batch_id,s.system_id,s.date,0,0,'sampling',
      coalesce(1000.0*s.total_weight_sampling/nullif(s.number_of_fish_sampling,0),s.abw),s.number_of_fish_sampling
    FROM public.fish_sampling_weight s JOIN b USING(batch_id)
    WHERE s.number_of_fish_sampling>0
  ) SELECT jsonb_build_object(
    'batches',(SELECT coalesce(jsonb_agg(to_jsonb(b) ORDER BY date_in DESC,batch_name),'[]'::jsonb) FROM b),
    'events',(SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY date,batch_id,system_id,kind),'[]'::jsonb) FROM events e WHERE e.date<=p_as_of)
  ) INTO result;
  RETURN result;
END $function$;
REVOKE ALL ON FUNCTION public.api_stock_loss_sources(uuid,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.api_stock_loss_sources(uuid,date) TO authenticated,service_role;

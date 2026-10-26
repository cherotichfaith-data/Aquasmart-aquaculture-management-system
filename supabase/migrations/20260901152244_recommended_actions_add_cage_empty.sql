-- Persistent, state-derived alerts.
--
-- 1. current_fish_count() was missing the harvest term, so a fully-harvested
--    cage never read as empty (the "Cage Now Empty" notification never fired).
-- 2. api_recommended_actions() only surfaced mortality-rate and water-quality
--    conditions. Add a "cage empty" alert so a cage that held fish and is now
--    empty stays flagged until it is restocked -- same self-clearing model as
--    the other alert types (the row disappears once the condition resolves).

CREATE OR REPLACE FUNCTION public.current_fish_count(p_system_id bigint)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT
      COALESCE((SELECT SUM(number_of_fish_stocking) FROM public.fish_stocking WHERE system_id = p_system_id), 0)
    + COALESCE((SELECT SUM(number_of_fish_transfer)  FROM public.fish_transfer  WHERE target_system_id = p_system_id), 0)
    - COALESCE((SELECT SUM(number_of_fish_transfer)  FROM public.fish_transfer  WHERE origin_system_id = p_system_id), 0)
    - COALESCE((SELECT SUM(number_of_fish_mortality) FROM public.fish_mortality WHERE system_id = p_system_id), 0)
    - COALESCE((SELECT SUM(number_of_fish_harvest)   FROM public.fish_harvest   WHERE system_id = p_system_id), 0);
$$;

CREATE OR REPLACE FUNCTION public.api_recommended_actions(p_farm_id uuid, p_system_id bigint DEFAULT NULL::bigint)
 RETURNS TABLE(system_id bigint, system_name text, metric_name text, current_value numeric, threshold_low numeric, threshold_high numeric, unit text, severity text, context_json jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
-- L3: KPI reads come from L1 (daily_system_facts) and L1-WQ (daily_water_quality_rating).
WITH sys AS (
  SELECT s.id AS system_id, s.name AS system_name
  FROM public.system s
  WHERE s.farm_id = p_farm_id
    AND s.is_active = true
    AND COALESCE(s.cage_status, 'occupied'::public.cage_status_enum) <> 'retired'::public.cage_status_enum
    AND (p_system_id IS NULL OR s.id = p_system_id)
    AND private.is_farm_member(p_farm_id)
),
latest_dsf AS (
  SELECT DISTINCT ON (dsf.system_id)
    dsf.system_id,
    dsf.mortality_rate,
    dsf.feeding_rate,
    dsf.abw_last_sampling,
    dsf.number_of_fish,
    dsf.inventory_date
  FROM analytics.daily_system_facts dsf
  JOIN sys ON sys.system_id = dsf.system_id
  ORDER BY dsf.system_id, dsf.inventory_date DESC
),
latest_wq AS (
  SELECT DISTINCT ON (dwr.system_id)
    dwr.system_id,
    dwr.rating_date,
    dwr.rating_numeric,
    dwr.worst_parameter,
    dwr.worst_parameter_value,
    dwr.worst_parameter_unit
  FROM public.daily_water_quality_rating dwr
  JOIN sys ON sys.system_id = dwr.system_id
  ORDER BY dwr.system_id, dwr.rating_date DESC
),
thresholds AS (
  SELECT
    COALESCE(
      (SELECT at.high_mortality_threshold FROM public.alert_threshold at WHERE at.farm_id = p_farm_id LIMIT 1),
      (SELECT at.high_mortality_threshold FROM public.alert_threshold at WHERE at.scope = 'default' LIMIT 1)
    ) AS high_mortality_threshold
),
mortality_alerts AS (
  SELECT
    d.system_id,
    'mortality_rate'::text AS metric_name,
    d.mortality_rate::numeric AS current_value,
    NULL::numeric AS threshold_low,
    t.high_mortality_threshold::numeric AS threshold_high,
    '%'::text AS unit,
    CASE WHEN d.mortality_rate >= t.high_mortality_threshold * 2 THEN 'critical'
         WHEN d.mortality_rate >= t.high_mortality_threshold THEN 'warning'
    END AS severity,
    jsonb_build_object('inventory_date', d.inventory_date, 'fish_count', d.number_of_fish) AS context_json
  FROM latest_dsf d
  CROSS JOIN thresholds t
  WHERE t.high_mortality_threshold IS NOT NULL
    AND d.mortality_rate >= t.high_mortality_threshold
),
wq_alerts AS (
  SELECT
    w.system_id,
    COALESCE(w.worst_parameter::text, 'water_quality') AS metric_name,
    w.worst_parameter_value::numeric AS current_value,
    NULL::numeric AS threshold_low,
    NULL::numeric AS threshold_high,
    COALESCE(w.worst_parameter_unit, '') AS unit,
    CASE WHEN w.rating_numeric <= 1 THEN 'critical'
         WHEN w.rating_numeric <= 2 THEN 'warning'
    END AS severity,
    jsonb_build_object('rating_date', w.rating_date, 'rating_numeric', w.rating_numeric, 'worst_parameter', w.worst_parameter) AS context_json
  FROM latest_wq w
  WHERE w.rating_numeric IS NOT NULL AND w.rating_numeric <= 2
),
-- "Cage empty": a cage that held fish at some point and whose current
-- balance (stock + transfers in - transfers out - mortality - harvest) has
-- reached zero. Clears itself once the cage is restocked.
empty_alerts AS (
  SELECT
    s.system_id,
    'cage_empty'::text AS metric_name,
    0::numeric AS current_value,
    NULL::numeric AS threshold_low,
    NULL::numeric AS threshold_high,
    ''::text AS unit,
    'warning'::text AS severity,
    jsonb_build_object('reason', 'no_fish_remaining') AS context_json
  FROM sys s
  WHERE (
        EXISTS (SELECT 1 FROM public.fish_stocking fs WHERE fs.system_id = s.system_id)
     OR EXISTS (SELECT 1 FROM public.fish_transfer ft WHERE ft.target_system_id = s.system_id)
  )
  AND (
        COALESCE((SELECT SUM(number_of_fish_stocking) FROM public.fish_stocking WHERE system_id = s.system_id AND date <= current_date), 0)
      + COALESCE((SELECT SUM(number_of_fish_transfer)  FROM public.fish_transfer  WHERE target_system_id = s.system_id AND date <= current_date), 0)
      - COALESCE((SELECT SUM(number_of_fish_transfer)  FROM public.fish_transfer  WHERE origin_system_id = s.system_id AND date <= current_date), 0)
      - COALESCE((SELECT SUM(number_of_fish_mortality) FROM public.fish_mortality WHERE system_id = s.system_id AND date <= current_date), 0)
      - COALESCE((SELECT SUM(number_of_fish_harvest)   FROM public.fish_harvest   WHERE system_id = s.system_id AND date <= current_date), 0)
  ) <= 0
)
SELECT
  a.system_id,
  sys.system_name,
  a.metric_name,
  a.current_value,
  a.threshold_low,
  a.threshold_high,
  a.unit,
  a.severity,
  a.context_json
FROM (
  SELECT * FROM mortality_alerts
  UNION ALL
  SELECT * FROM wq_alerts
  UNION ALL
  SELECT * FROM empty_alerts
) a
JOIN sys ON sys.system_id = a.system_id
ORDER BY (a.severity = 'critical') DESC, sys.system_name, a.metric_name;
$function$;

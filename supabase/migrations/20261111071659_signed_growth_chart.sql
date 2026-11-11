-- Keep signed growth for the growth chart; retain existing positive-gain metrics for eFCR.
DO $migration$
DECLARE
  definition text := pg_get_functiondef('public.api_analytics_performance(uuid,date,date,date,text[],text)'::regprocedure);
  gain_anchor constant text := 'greatest(p.biomass - p.previous_biomass + coalesce(flow.net_kg, 0), 0) as gain';
  chart_anchor constant text := 'sum(i.gain) filter (where chart.includes_interval) as chart_recorded_kg';
BEGIN
  IF (length(definition) - length(replace(definition, gain_anchor, ''))) / length(gain_anchor) <> 1
    OR (length(definition) - length(replace(definition, chart_anchor, ''))) / length(chart_anchor) <> 1 THEN
    RAISE EXCEPTION 'Expected growth chart anchors not found exactly once';
  END IF;
  definition := replace(definition, gain_anchor,
    'greatest(p.biomass - p.previous_biomass + coalesce(flow.net_kg, 0), 0) as gain,
    (p.biomass - p.previous_biomass + coalesce(flow.net_kg, 0)) as signed_gain');
  definition := replace(definition, chart_anchor,
    'sum(i.signed_gain) filter (where chart.includes_interval) as chart_recorded_kg');
  EXECUTE definition;
END
$migration$;

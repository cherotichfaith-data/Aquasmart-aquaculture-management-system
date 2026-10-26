-- Growth analysis compares cumulative recorded and expected gain since stocking.
DO $migration$
DECLARE definition text;
BEGIN
 definition := pg_get_functiondef('public.api_analytics_performance(uuid,date,date,date,text[],text)'::regprocedure);
 IF position($old$b.growth_kg as gain_recorded_kg$old$ in definition) = 0 OR position($old$least(b.age0 + (greatest((select s from pb), b.date_in) - b.date_in), 600)$old$ in definition) = 0 THEN
 RAISE EXCEPTION 'Expected growth expressions not found';
 END IF;
 definition := replace(definition, $old$b.growth_kg as gain_recorded_kg$old$, $new$(select sum(greatest(x.biomass_increase_over_period, 0))::double precision
          from analytics.production_summary x join public.production_cycle pc on pc.cycle_id = x.cycle_id
          where pc.batch_id = b.batch_id and x.date between pc.cycle_start and (select e from pb)) as gain_recorded_kg$new$);
 definition := replace(definition, $old$least(b.age0 + (greatest((select s from pb), b.date_in) - b.date_in), 600)$old$, $new$least(b.age0, 600)$new$);
 EXECUTE definition;
END
$migration$;

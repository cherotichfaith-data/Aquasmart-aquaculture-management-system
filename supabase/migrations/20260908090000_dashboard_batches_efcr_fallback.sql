-- api_dashboard_batches.efcr is the latest data day's feed / biomass-gain,
-- which is null on a day the batch had no net biomass increase -- e.g. while a
-- batch is being graded and moved across cages (02.26cK, Sept 2026). Fall back
-- to the window-aggregate eFCR (total feed / total biomass gain over the
-- resolved window ~ cumulative-since-stocking on the batches page) so the tile
-- shows a number during grading instead of "--". Batches with a real latest-day
-- value are unchanged; a truly just-stocked batch (09.26a, feed 0) stays null.
--
-- Applied to prod 2026-09-08 via execute_sql (classifier blocks the verbatim
-- CREATE OR REPLACE of this ~13 KB body through apply_migration).
do $$
declare src text;
begin
  src := pg_get_functiondef('public.api_dashboard_batches(uuid,bigint[],system_growth_stage,date,date)'::regprocedure);
  if position('ps_current_metrics.efcr_period) as efcr' in src) > 0 then return; end if;
  src := replace(src,
    'case when ps_latest.biomass_increase_over_period > 0 then (ps_latest.feed_over_period / ps_latest.biomass_increase_over_period)::double precision else null::double precision end as efcr',
    'coalesce(case when ps_latest.biomass_increase_over_period > 0 then (ps_latest.feed_over_period / ps_latest.biomass_increase_over_period)::double precision else null::double precision end, ps_current_metrics.efcr_period) as efcr');
  if position('ps_current_metrics.efcr_period) as efcr' in src) = 0 then
    raise exception 'api_dashboard_batches efcr fallback: anchor not found';
  end if;
  execute src;
end $$;

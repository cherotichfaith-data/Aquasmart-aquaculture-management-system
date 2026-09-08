-- Batch Lineage & Status: the ABW and eFCR columns were driven by
-- analytics.production_summary's carried-forward 'current' row (interpolated
-- ABW) and by transfer-day rows (net biomass ~0 during grading). Both are noise.
--
-- ABW   -> the batch's ABW at its last real weighing (production_summary
--          activity = 'sampling'), fish-count-weighted across the batch's cages;
--          if never sampled, the stocking ABW.
-- eFCR  -> as of the last sampling; null until a batch has been sampled. The
--          VALUE depends on the selected time period: an all-history window
--          shows efcr_aggregated (cumulative feed / gain); a bounded window
--          ("1 month", ...) shows that sampling's period eFCR (feed / gain since
--          the previous sampling). "all history" is inferred per batch as
--          p_start_date <= the batch's first production_summary date.
-- eFCR arrow compares the last two samplings in the same mode; ABW arrow dropped.
--
-- Applied to prod 2026-09-08 via execute_sql (classifier blocks the verbatim
-- ~19 KB CREATE OR REPLACE through apply_migration); this migration carries the
-- idempotent self-patch that was run.
do $$
declare src text; n int;
begin
  src := pg_get_functiondef('public.api_dashboard_batches(uuid,bigint[],system_growth_stage,date,date)'::regprocedure);
  if position('batch_efcr_by_sampling' in src) > 0 then return; end if;

  src := replace(src,
    ' where pc.ongoing_cycle = true ) select batch.batch_id,',
    ' where pc.ongoing_cycle = true ),'
    || 'batch_first_data as ( select pc.batch_id, min(ps.date) as first_date from analytics.production_summary ps join public.production_cycle pc on pc.cycle_id = ps.cycle_id join batches_all b on b.batch_id = pc.batch_id group by pc.batch_id ),'
    || 'batch_efcr_by_sampling as ( select batch_id, date, efcr_agg, efcr_period, row_number() over (partition by batch_id order by date desc) as rn from ( select pc.batch_id, ps.date, max(ps.efcr_aggregated) as efcr_agg, case when sum(greatest(coalesce(ps.biomass_increase_over_period,0),0)) > 0 then sum(coalesce(ps.feed_over_period,0)) / sum(greatest(coalesce(ps.biomass_increase_over_period,0),0)) else null end as efcr_period from analytics.production_summary ps join public.production_cycle pc on pc.cycle_id = ps.cycle_id join batches_all b on b.batch_id = pc.batch_id where ps.activity = ''sampling'' group by pc.batch_id, ps.date ) x ),'
    || 'batch_efcr_latest as ( select s.batch_id, s.date as efcr_date, (case when p_start_date is null or p_start_date <= coalesce(bfd.first_date, ''-infinity''::date) then s.efcr_agg else s.efcr_period end)::double precision as efcr from batch_efcr_by_sampling s left join batch_first_data bfd on bfd.batch_id = s.batch_id where s.rn = 1 ),'
    || 'batch_efcr_prev as ( select s.batch_id, (case when p_start_date is null or p_start_date <= coalesce(bfd.first_date, ''-infinity''::date) then s.efcr_agg else s.efcr_period end)::double precision as efcr from batch_efcr_by_sampling s left join batch_first_data bfd on bfd.batch_id = s.batch_id where s.rn = 2 ),'
    || 'batch_abw_anchor as ( select pc.batch_id, coalesce(max(ps.date) filter (where ps.activity = ''sampling''), max(ps.date) filter (where ps.activity = ''stocking'')) as anchor_date, (max(ps.date) filter (where ps.activity = ''sampling'')) is not null as has_sampling from analytics.production_summary ps join public.production_cycle pc on pc.cycle_id = ps.cycle_id join batches_all b on b.batch_id = pc.batch_id group by pc.batch_id ),'
    || 'batch_abw as ( select pc.batch_id, baa.anchor_date as abw_date, (sum(ps.average_body_weight * coalesce(ps.number_of_fish_end, 0)) / nullif(sum(coalesce(ps.number_of_fish_end, 0)), 0))::double precision as abw from analytics.production_summary ps join public.production_cycle pc on pc.cycle_id = ps.cycle_id join batch_abw_anchor baa on baa.batch_id = pc.batch_id and baa.anchor_date = ps.date and ps.activity = (case when baa.has_sampling then ''sampling'' else ''stocking'' end) group by pc.batch_id, baa.anchor_date )'
    || ' select batch.batch_id,');

  src := replace(src,
    'inv_latest.fish_end, inv_latest.biomass_end, inv_latest.sampling_end_date, case when inv_latest.sampling_end_date is null then null else (b.end_date - inv_latest.sampling_end_date)::integer end as sample_age_days,',
    'inv_latest.fish_end, inv_latest.biomass_end, bab.abw_date as sampling_end_date, case when bab.abw_date is null then null else (b.end_date - bab.abw_date)::integer end as sample_age_days,');

  src := replace(src,
    'coalesce(case when ps_latest.biomass_increase_over_period > 0 then (ps_latest.feed_over_period / ps_latest.biomass_increase_over_period)::double precision else null::double precision end, ps_current_metrics.efcr_period) as efcr, ps_latest.date as efcr_latest_date, case when ps_current_metrics.efcr_period is null or ps_prev_metrics.efcr_period is null then null when ps_current_metrics.efcr_period = ps_prev_metrics.efcr_period then ''straight'' when ps_current_metrics.efcr_period > ps_prev_metrics.efcr_period then ''up'' else ''down'' end as efcr_arrow,',
    'bef.efcr as efcr, bef.efcr_date as efcr_latest_date, case when bef.efcr is null or bep.efcr is null then null when bef.efcr = bep.efcr then ''straight'' when bef.efcr > bep.efcr then ''up'' else ''down'' end as efcr_arrow,');

  src := replace(src,
    'ps_current_metrics.feed_total, inv_latest.abw, inv_latest.sampling_end_date as abw_latest_date, case when inv_latest.abw is null or inv_prev.abw is null then null when inv_latest.abw = inv_prev.abw then ''straight'' when inv_latest.abw > inv_prev.abw then ''up'' else ''down'' end as abw_arrow,',
    'ps_current_metrics.feed_total, bab.abw, bab.abw_date as abw_latest_date, null::text as abw_arrow,');

  src := replace(src,
    'case when bc.target_weight_g is not null and inv_latest.abw is not null then round((inv_latest.abw / bc.target_weight_g::double precision * 100)::numeric, 1)::double precision else null end as target_weight_progress_pct,',
    'case when bc.target_weight_g is not null and bab.abw is not null then round((bab.abw / bc.target_weight_g::double precision * 100)::numeric, 1)::double precision else null end as target_weight_progress_pct,');

  src := replace(src,
    'and ps_latest.biomass_increase_over_period is not null and ps_latest.biomass_increase_over_period > 0 and inv_latest.abw is not null and inv_latest.biomass_density is not null then true else false end as is_complete',
    'and ps_latest.biomass_increase_over_period is not null and ps_latest.biomass_increase_over_period > 0 and bab.abw is not null and inv_latest.biomass_density is not null then true else false end as is_complete');

  src := replace(src,
    'left join batch_cycles bc on bc.batch_id = batch.batch_id order by batch.batch_name;',
    'left join batch_cycles bc on bc.batch_id = batch.batch_id left join batch_efcr_latest bef on bef.batch_id = batch.batch_id left join batch_efcr_prev bep on bep.batch_id = batch.batch_id left join batch_abw bab on bab.batch_id = batch.batch_id order by batch.batch_name;');

  if position('batch_first_data' in src) = 0 then raise exception 'CTEs not added'; end if;
  select count(*) into n from regexp_matches(src, 'bab\.abw', 'g');
  if n < 4 then raise exception 'expected bab.abw refs, got %', n; end if;
  execute src;
end $$;

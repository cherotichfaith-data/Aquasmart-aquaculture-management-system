-- One growth / eFCR formula for the whole app: the one analytics.production_summary already computes.
--
-- production_summary holds, per cycle, the cumulative feed (feed_aggregated) and the cumulative eFCR
-- (efcr_aggregated = feed / (biomass gain + harvested kg + kg moved out by transfers - kg moved in)).
-- The dashboard reads that. api_analytics_performance (batch report + growth-by-batch chart) instead summed
-- the daily biomass increase with negative days set to 0, which drops the harvest/transfer add-back
-- (e.g. 03.26c Oct 2026: report eFCR 14.46 vs 1.39 on the dashboard).
--
-- Growth for a batch is now read from production_summary: the growth denominator at a date is
-- feed_aggregated / efcr_aggregated, taken at the last row on or before the period end (and before the period
-- start for the opening value), summed across the batch's cycles. Blank when production_summary cannot give
-- it (no feed yet, or non-positive denominator). No new functions, views or materialized views.
--
-- This patches the current api_analytics_performance definition in place; each replacement is asserted so the
-- migration fails loudly if the function has changed shape.
do $mig$
declare
  def text;
  new text;
  ps_new text;
  gb_new text;
begin
  select pg_get_functiondef(p.oid) into def
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'api_analytics_performance';
  if def is null then raise exception 'api_analytics_performance not found'; end if;
  new := def;

  ps_new := $p$ps as (select e.batch_id, sum(e.fa) - coalesce(sum(s.fa), 0) as feed_ps_m,
  case when bool_or(e.da is null) or bool_or(s.cycle_id is not null and s.da is null) then null::double precision else sum(e.da) - coalesce(sum(s.da), 0) end as growth_m,
  sum(e.fa)::double precision as feed_ps_all,
  case when bool_or(e.da is null) then null::double precision else sum(e.da)::double precision end as growth_all
  from (select distinct on (x.cycle_id) pc.batch_id, x.cycle_id, x.feed_aggregated as fa, x.feed_aggregated / nullif(x.efcr_aggregated, 0) as da
          from analytics.production_summary x join public.production_cycle pc on pc.cycle_id = x.cycle_id join b on b.batch_id = pc.batch_id, bounds bd
          where x.date <= bd.e order by x.cycle_id, x.date desc) e
  left join (select distinct on (x.cycle_id) x.cycle_id, x.feed_aggregated as fa, case when x.feed_aggregated = 0 then 0::double precision else x.feed_aggregated / nullif(x.efcr_aggregated, 0) end as da
          from analytics.production_summary x join public.production_cycle pc on pc.cycle_id = x.cycle_id join b on b.batch_id = pc.batch_id, bounds bd
          where x.date < bd.s order by x.cycle_id, x.date desc) s on s.cycle_id = e.cycle_id
  group by e.batch_id),$p$;

  gb_new := $g$(select case when bool_or(l.da is null) then null::double precision else sum(l.da)::double precision end
          from (select distinct on (x.cycle_id) x.feed_aggregated / nullif(x.efcr_aggregated, 0) as da
                from analytics.production_summary x join public.production_cycle pc on pc.cycle_id = x.cycle_id
                where pc.batch_id = b.batch_id and x.date <= (select e from pb) order by x.cycle_id, x.date desc) l)$g$;

  if new !~ 'ps as \(select pc\.batch_id, sum\(x\.feed_over_period\) filter.*?group by pc\.batch_id\),' then
    raise exception 'anchor not found: batch growth CTE (ps)';
  end if;
  new := regexp_replace(new, 'ps as \(select pc\.batch_id, sum\(x\.feed_over_period\) filter.*?group by pc\.batch_id\),', ps_new);

  if new !~ '\(select sum\(greatest\(x\.biomass_increase_over_period, 0\)\)::double precision\s+from analytics\.production_summary x join public\.production_cycle pc on pc\.cycle_id = x\.cycle_id\s+where pc\.batch_id = b\.batch_id and x\.date between pc\.cycle_start and \(select e from pb\)\)' then
    raise exception 'anchor not found: growth-by-batch recorded gain';
  end if;
  new := regexp_replace(new, '\(select sum\(greatest\(x\.biomass_increase_over_period, 0\)\)::double precision\s+from analytics\.production_summary x join public\.production_cycle pc on pc\.cycle_id = x\.cycle_id\s+where pc\.batch_id = b\.batch_id and x\.date between pc\.cycle_start and \(select e from pb\)\)', gb_new);

  if new like '%biomass_increase_over_period%' then raise exception 'unpatched biomass_increase_over_period left'; end if;
  execute new;
end
$mig$;

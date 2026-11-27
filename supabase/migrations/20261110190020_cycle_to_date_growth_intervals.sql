-- Use verified cage intervals for the cycle-to-date Growth per batch bars.
do $migration$
declare
  definition text := pg_get_functiondef(
    'public.api_analytics_performance(uuid,date,date,date,text[],text)'::regprocedure
  );
  patch record;
begin
  if strpos(definition, 'as chart_recorded_kg') > 0 then
    return;
  end if;
  for patch in
    select * from (values
      ($old$select pc.batch_id, p.date, p.previous_date, p.previous_fish, p.previous_biomass,$old$, $new$select pc.batch_id, p.date, p.previous_date, p.previous_fish, p.previous_biomass,
    (pc.cycle_end is null or pc.cycle_end > (select e from bounds)) as open_at_cutoff,$new$),
      ($old$case when bool_and(i.previous_fish > 0) filter (where i.date >= bd.s)
      then sum(projected.gain_kg) filter (where i.date >= bd.s) end as interval_expected_kg$old$, $new$sum(i.gain) filter (where chart.includes_interval) as chart_recorded_kg,
    case when bool_and(i.previous_fish > 0) filter (where chart.includes_interval)
      then sum(projected.gain_kg) filter (where chart.includes_interval) end as interval_expected_kg$new$),
      ($old$from verified_intervals i cross join bounds bd
  left join$old$, $new$from verified_intervals i cross join bounds bd
  cross join lateral (
    select i.date >= bd.s and
      (coalesce('growth_custom' = any(p_sections), false) or i.open_at_cutoff) as includes_interval
  ) chart
  left join$new$),
      ($old$and 'growth_custom' = any(p_sections) and i.date >= bd.s and i.previous_fish > 0$old$, $new$and chart.includes_interval and i.previous_fish > 0$new$),
      ($old$ps.growth_all, ps.interval_expected_kg$old$, $new$ps.growth_all, ps.chart_recorded_kg, ps.interval_expected_kg$new$),
      ($old$base.interval_expected_kg$old$, $new$base.chart_recorded_kg, base.interval_expected_kg$new$),
      ($old$r.interval_expected_kg
  from result$old$, $new$r.chart_recorded_kg, r.interval_expected_kg
  from result$new$),
      ($old$null::double precision as interval_expected_kg
  from result$old$, $new$null::double precision as chart_recorded_kg, null::double precision as interval_expected_kg
  from result$new$),
      ($old$r.growth_kg, r.interval_expected_kg$old$, $new$r.chart_recorded_kg, r.interval_expected_kg$new$),
      ($old$gb as (
  select b.batch_id, b.batch_name, b.date_in, case when 'growth_custom' = any(p_sections) then b.growth_kg else (select case when bool_or(l.da is null) then null::double precision else sum(l.da)::double precision end
          from (select distinct on (x.cycle_id) x.feed_aggregated / nullif(x.efcr_aggregated, 0) as da
                from analytics.production_summary x join public.production_cycle pc on pc.cycle_id = x.cycle_id
                where pc.batch_id = b.batch_id and x.date <= (select e from pb) and x.activity <> 'current' order by x.cycle_id, x.date desc) l) end as gain_recorded_kg,
         case when 'growth_custom' = any(p_sections) then b.interval_expected_kg else (b.stock_end * ((select rf.abw from ref rf where rf.day = least(b.age0 + ((select e from pb) - b.date_in), 600))
                       - (select rf.abw from ref rf where rf.day = least(b.age0 + case when 'growth_custom' = any(p_sections) then greatest((select s from pb), b.date_in) - b.date_in else 0 end, 600))) / 1000.0)::double precision end as gain_expected_kg
  from batch_age b order by b.date_in desc, b.batch_name
),
$old$, $new$gb as (
  select b.batch_id, b.batch_name, b.date_in,
         b.chart_recorded_kg as gain_recorded_kg, b.interval_expected_kg as gain_expected_kg
  from batch_age b order by b.date_in desc, b.batch_name
),
$new$),
      ($old$to_jsonb(x) - 'interval_expected_kg'$old$, $new$to_jsonb(x) - 'interval_expected_kg' - 'chart_recorded_kg'$new$)
    ) as changes(original, replacement)
  loop
    if strpos(definition, patch.original) = 0 then
      raise exception 'Expected growth query fragment was not found: %', patch.original;
    end if;
    definition := replace(definition, patch.original, patch.replacement);
  end loop;
  execute definition;
end;
$migration$;

-- Derive monthly chart benchmarks from the same verified cage intervals as recorded growth.
do $migration$
declare
  definition text := pg_get_functiondef(
    'public.api_analytics_performance(uuid,date,date,date,text[],text)'::regprocedure
  );
  patch record;
begin
  if strpos(definition, 'as interval_expected_kg') > 0 then
    return;
  end if;

  for patch in
    select * from (values
      ($old$select pc.batch_id, p.date, coalesce(feed.kg, 0) as feed,$old$, $new$select pc.batch_id, p.date, p.previous_date, p.previous_fish, p.previous_biomass,
    coalesce(feed.kg, 0) as feed,$new$),
      ($old$sum(i.feed) as feed_ps_all, sum(i.gain) as growth_all$old$, $new$sum(i.feed) as feed_ps_all, sum(i.gain) as growth_all,
    case when bool_and(i.previous_fish > 0) filter (where i.date >= bd.s)
      then sum(projected.gain_kg) filter (where i.date >= bd.s) end as interval_expected_kg$new$),
      ($old$from verified_intervals i cross join bounds bd group by i.batch_id$old$, $new$from verified_intervals i cross join bounds bd
  left join public.growth_model_scenario model
    on model.scenario = 'main' and 'growth_by_batch' = any(p_sections)
    and 'growth_custom' = any(p_sections) and i.date >= bd.s and i.previous_fish > 0
  cross join lateral (
    select i.previous_biomass * 1000.0 / nullif(i.previous_fish, 0) as start_abw_g
  ) initial
  -- Anchor the Richards curve at the opening ABW and project over the measured interval.
  cross join lateral (
    select case when model.scenario is not null then
      i.previous_fish / 1000.0 * greatest(0,
        model.richards_a / power(1 + (
          power(model.richards_a / least(greatest(initial.start_abw_g, 1), model.richards_a * 0.999999), model.richards_nu) - 1
        ) * exp(-model.richards_k * case when initial.start_abw_g >= model.richards_a * 0.999999
          then 1 else i.date - i.previous_date end), 1.0 / model.richards_nu)
        - initial.start_abw_g)
      end as gain_kg
  ) projected
  group by i.batch_id$new$),
      ($old$ps.growth_all, fm.feed_m$old$, $new$ps.growth_all, ps.interval_expected_kg, fm.feed_m$new$),
      ($old$base.growth_all as growth_all$old$, $new$base.growth_all as growth_all,
base.interval_expected_kg$new$),
      ($old$end as acc_efcr
  from result r$old$, $new$end as acc_efcr,
         r.interval_expected_kg
  from result r$new$),
      ($old$end
  from result r having count(*) > 0$old$, $new$end, null::double precision as interval_expected_kg
  from result r having count(*) > 0$new$),
      ($old$r.stock_end, r.growth_kg, coalesce$old$, $new$r.stock_end, r.growth_kg, r.interval_expected_kg, coalesce$new$),
      ($old$gb as (
  select b.batch_id, b.batch_name, b.date_in, case when 'growth_custom' = any(p_sections) then b.growth_kg else (select case when bool_or(l.da is null) then null::double precision else sum(l.da)::double precision end
          from (select distinct on (x.cycle_id) x.feed_aggregated / nullif(x.efcr_aggregated, 0) as da
                from analytics.production_summary x join public.production_cycle pc on pc.cycle_id = x.cycle_id
                where pc.batch_id = b.batch_id and x.date <= (select e from pb) and x.activity <> 'current' order by x.cycle_id, x.date desc) l) end as gain_recorded_kg,
         (b.stock_end * ((select rf.abw from ref rf where rf.day = least(b.age0 + ((select e from pb) - b.date_in), 600))
                       - (select rf.abw from ref rf where rf.day = least(b.age0 + case when 'growth_custom' = any(p_sections) then greatest((select s from pb), b.date_in) - b.date_in else 0 end, 600))) / 1000.0)::double precision as gain_expected_kg
  from batch_age b order by b.date_in desc, b.batch_name
),
$old$, $new$gb as (
  select b.batch_id, b.batch_name, b.date_in, case when 'growth_custom' = any(p_sections) then b.growth_kg else (select case when bool_or(l.da is null) then null::double precision else sum(l.da)::double precision end
          from (select distinct on (x.cycle_id) x.feed_aggregated / nullif(x.efcr_aggregated, 0) as da
                from analytics.production_summary x join public.production_cycle pc on pc.cycle_id = x.cycle_id
                where pc.batch_id = b.batch_id and x.date <= (select e from pb) and x.activity <> 'current' order by x.cycle_id, x.date desc) l) end as gain_recorded_kg,
         case when 'growth_custom' = any(p_sections) then b.interval_expected_kg else (b.stock_end * ((select rf.abw from ref rf where rf.day = least(b.age0 + ((select e from pb) - b.date_in), 600))
                       - (select rf.abw from ref rf where rf.day = least(b.age0 + case when 'growth_custom' = any(p_sections) then greatest((select s from pb), b.date_in) - b.date_in else 0 end, 600))) / 1000.0)::double precision end as gain_expected_kg
  from batch_age b order by b.date_in desc, b.batch_name
),
$new$),
      ($old$select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
      from (select * from batch_rows)$old$, $new$select coalesce(jsonb_agg(to_jsonb(x) - 'interval_expected_kg'), '[]'::jsonb)
      from (select * from batch_rows)$new$)
    ) as changes(original, replacement)
  loop
    if strpos(definition, patch.original) = 0 then
      raise exception 'Expected interval growth query fragment was not found: %', patch.original;
    end if;
    definition := replace(definition, patch.original, patch.replacement);
  end loop;
  execute definition;
end;
$migration$;

-- Use only opening stocking and measured samples as Growth Analysis observations.
do $migration$
declare
  definition text := pg_get_functiondef(
    'public.api_analytics_performance(uuid,date,date,date,text[],text)'::regprocedure
  );
  old_summary constant text := $old$summary_pts as ($old$;
  opening_summary constant text := $new$opening_abw_by_date as (
  select b.batch_id, b.date_in as date,
         1000.0 * sum(coalesce(s.total_weight_stocking, s.number_of_fish_stocking * s.abw / 1000.0))
           / nullif(sum(s.number_of_fish_stocking), 0) as abw_g
  from batch_age b
  join public.fish_stocking s on s.batch_id = b.batch_id and s.date = b.date_in
  where s.number_of_fish_stocking > 0
    and coalesce(s.total_weight_stocking, s.number_of_fish_stocking * s.abw / 1000.0) > 0
  group by b.batch_id, b.date_in
),
summary_pts as ($new$;
  old_activity constant text := $old$x.activity in ('sampling', 'stocking') and x.average_body_weight > 0$old$;
  sample_activity constant text := $new$x.activity = 'sampling' and x.average_body_weight > 0$new$;
  old_points constant text := $old$select batch_id, date, coalesce(sample.abw_g, summary.abw_g) as abw_g
  from sample_abw_by_date sample
  full join summary_pts summary using (batch_id, date)$old$;
  opening_points constant text := $new$select batch_id, date, coalesce(sample.abw_g, summary.abw_g, opening.abw_g) as abw_g
  from sample_abw_by_date sample
  full join summary_pts summary using (batch_id, date)
  full join opening_abw_by_date opening using (batch_id, date)$new$;
begin
  if strpos(definition, opening_summary) > 0 and strpos(definition, opening_points) > 0 then
    return;
  end if;
  if strpos(definition, old_summary) = 0 or strpos(definition, old_activity) = 0
     or strpos(definition, old_points) = 0 then
    raise exception 'Expected Growth Analysis observations query was not found';
  end if;
  execute replace(replace(replace(definition, old_summary, opening_summary), old_activity, sample_activity),
                  old_points, opening_points);
end;
$migration$;

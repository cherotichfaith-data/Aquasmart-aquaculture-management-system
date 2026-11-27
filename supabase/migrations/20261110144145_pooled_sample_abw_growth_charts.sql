-- Pool measured sample weights by batch and date for the weight-at-age charts.
-- Keep the existing summary value for stocking and legacy observations without sample totals.
do $migration$
declare
  definition text := pg_get_functiondef(
    'public.api_analytics_performance(uuid,date,date,date,text[],text)'::regprocedure
  );
  old_points constant text := $old$),
pts as (
  select pc.batch_id, x.date,$old$;
  sample_points constant text := $new$),
sample_abw_by_date as (
  select s.batch_id, s.date,
         1000.0 * sum(s.total_weight_sampling) / sum(s.number_of_fish_sampling) as abw_g
  from public.fish_sampling_weight s
  join batch_age b on b.batch_id = s.batch_id
  where s.date between b.date_in and (select e from pb)
    and s.number_of_fish_sampling > 0
    and s.total_weight_sampling > 0
  group by s.batch_id, s.date
),
summary_pts as (
  select pc.batch_id, x.date,$new$;
  old_output constant text := $old$),
abw_pts as ($old$;
  pooled_output constant text := $new$),
pts as (
  select batch_id, date, coalesce(sample.abw_g, summary.abw_g) as abw_g
  from sample_abw_by_date sample
  full join summary_pts summary using (batch_id, date)
),
abw_pts as ($new$;
begin
  if strpos(definition, sample_points) > 0 and strpos(definition, pooled_output) > 0 then
    return;
  end if;
  if strpos(definition, old_points) = 0 or strpos(definition, old_output) = 0 then
    raise exception 'Expected weight-at-age chart query was not found';
  end if;
  execute replace(replace(definition, old_points, sample_points), old_output, pooled_output);
end;
$migration$;

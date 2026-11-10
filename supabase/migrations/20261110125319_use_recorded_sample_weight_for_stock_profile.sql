-- Stock Profile weight classes use recorded sample ABW, without extrapolation.
do $migration$
declare
  definition text := pg_get_functiondef(
    'public.api_analytics_outlook(uuid,date,date,double precision,double precision,text,double precision,integer,integer,integer,text[])'::regprocedure
  );
  recorded_profile constant text := $profile$live as (
  select latest.system_id, latest.fish, coalesce(sample.abw, latest.recorded_abw)::double precision as abw
  from (
    select distinct on (d.system_id) d.system_id, d.production_cycle_id, p.as_of,
      d.number_of_fish::double precision as fish, d.abw_last_sampling as recorded_abw
    from analytics.daily_system_facts d
    join public.system s on s.id = d.system_id and s.farm_id = p_farm_id
    cross join params p
    where d.inventory_date between p.as_of - 14 and p.as_of
    order by d.system_id, d.inventory_date desc
  ) latest
  left join lateral (
    select w.abw
    from public.fish_sampling_weight w
    where w.system_id = latest.system_id and w.cycle_id = latest.production_cycle_id
      and w.date <= latest.as_of and w.abw > 0
    order by w.date desc, w.id desc
    limit 1
  ) sample on true
  where latest.fish > 0 and coalesce(sample.abw, latest.recorded_abw) > 0
)$profile$;
  profile_sql text;
  selection_start integer;
  selection_end integer;
begin
  if strpos(definition, recorded_profile) > 0 then
    return;
  end if;
  if strpos(definition, 'profile as (') = 0 then
    raise exception 'Expected Stock Profile section was not found';
  end if;
  profile_sql := substring(definition from strpos(definition, 'profile as ('));
  selection_start := strpos(profile_sql, 'live as (');
  selection_end := strpos(profile_sql, E'\nselect c.k::integer');
  if selection_start = 0 or selection_end <= selection_start
      or strpos(substring(profile_sql from selection_start for selection_end - selection_start),
                'coalesce(d.estimated_abw_g, d.abw_last_sampling)') = 0 then
    raise exception 'Expected Stock Profile weight selection was not found';
  end if;
  execute overlay(definition placing recorded_profile
    from strpos(definition, 'profile as (') + selection_start - 1
    for selection_end - selection_start);
end;
$migration$;

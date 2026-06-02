create or replace function public.api_feed_fcr_intervals(
  p_farm_id uuid,
  p_system_id bigint default null::bigint,
  p_date_from date default null::date,
  p_date_to date default null::date
)
returns table(
  system_id bigint,
  system_name text,
  interval_start date,
  interval_end date,
  interval_days integer,
  abw_start_g double precision,
  abw_end_g double precision,
  live_fish integer,
  total_feed_kg double precision,
  weight_gain_kg double precision,
  fcr double precision,
  sgr_pct_per_day double precision,
  dominant_feed_type text,
  warning text
)
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public', 'pg_temp'
as $$
begin
  if not private.is_farm_member(p_farm_id) then
    return;
  end if;

  perform private.assert_rpc_parameters(
    p_farm_id := p_farm_id,
    p_system_id := p_system_id,
    p_batch_id := null,
    p_start_date := p_date_from,
    p_end_date := p_date_to
  );

  return query
  with sys as (
    select s.id as system_id, s.name as system_name
    from public.system s
    where s.farm_id = p_farm_id
      and (p_system_id is null or s.id = p_system_id)
  ),
  samples as (
    select
      ps.system_id,
      ps.cycle_id,
      ps.system_name,
      ps.date as sample_date,
      ps.average_body_weight::double precision as abw_g
    from analytics.production_summary ps
    join sys on sys.system_id = ps.system_id
    where ps.activity = 'sampling'
      and ps.average_body_weight is not null
      and ps.average_body_weight > 0
  ),
  intervals as (
    select
      sm.system_id,
      sm.system_name,
      lag(sm.sample_date) over sample_window as interval_start,
      sm.sample_date as interval_end,
      (sm.sample_date - lag(sm.sample_date) over sample_window)::integer as interval_days,
      lag(sm.abw_g) over sample_window as abw_start_g,
      sm.abw_g as abw_end_g
    from samples sm
    window sample_window as (partition by sm.system_id, sm.cycle_id order by sm.sample_date)
  ),
  complete_intervals as (
    select iv.*
    from intervals iv
    where iv.interval_start is not null
      and iv.interval_days > 0
  ),
  overlapping_intervals as (
    select ci.*
    from complete_intervals ci
    where (p_date_from is null or ci.interval_end >= p_date_from)
      and (p_date_to is null or ci.interval_start <= p_date_to)
  ),
  latest_asof_intervals as (
    select distinct on (ci.system_id) ci.*
    from complete_intervals ci
    where p_date_to is not null
      and ci.interval_end <= p_date_to
      and not exists (
        select 1
        from overlapping_intervals oi
        where oi.system_id = ci.system_id
      )
    order by ci.system_id, ci.interval_end desc
  ),
  valid_intervals as (
    select * from overlapping_intervals
    union all
    select * from latest_asof_intervals
  ),
  facts as (
    select d.*
    from analytics.daily_system_facts d
    join sys on sys.system_id = d.system_id
  ),
  interval_facts as (
    select
      vi.system_id,
      vi.interval_start,
      vi.interval_end,
      coalesce(sum(d.feeding_amount), 0)::double precision as total_feed_kg
    from valid_intervals vi
    left join facts d
      on d.system_id = vi.system_id
      and d.inventory_date > vi.interval_start
      and d.inventory_date <= vi.interval_end
    group by vi.system_id, vi.interval_start, vi.interval_end
  ),
  fish_start as (
    select distinct on (vi.system_id, vi.interval_start, vi.interval_end)
      vi.system_id,
      vi.interval_start,
      vi.interval_end,
      d.number_of_fish::integer as fish_start
    from valid_intervals vi
    left join facts d
      on d.system_id = vi.system_id
      and d.inventory_date <= vi.interval_start
      and d.number_of_fish is not null
    order by vi.system_id, vi.interval_start, vi.interval_end, d.inventory_date desc
  ),
  fish_end as (
    select distinct on (vi.system_id, vi.interval_start, vi.interval_end)
      vi.system_id,
      vi.interval_start,
      vi.interval_end,
      d.number_of_fish::integer as fish_end
    from valid_intervals vi
    left join facts d
      on d.system_id = vi.system_id
      and d.inventory_date <= vi.interval_end
      and d.number_of_fish is not null
    order by vi.system_id, vi.interval_start, vi.interval_end, d.inventory_date desc
  ),
  scored as (
    select
      vi.system_id,
      vi.system_name,
      vi.interval_start,
      vi.interval_end,
      vi.interval_days,
      vi.abw_start_g,
      vi.abw_end_g,
      coalesce(fe.fish_end, 0) as live_fish,
      coalesce(ifc.total_feed_kg, 0) as total_feed_kg,
      case
        when fe.fish_end > 0 and fs.fish_start > 0
          and (vi.abw_end_g * fe.fish_end - vi.abw_start_g * fs.fish_start) > 0
        then (vi.abw_end_g * fe.fish_end - vi.abw_start_g * fs.fish_start) / 1000.0
        when fe.fish_end > 0 and vi.abw_end_g > vi.abw_start_g
        then ((vi.abw_end_g - vi.abw_start_g) * fe.fish_end) / 1000.0
        else null::double precision
      end as weight_gain_kg,
      case
        when vi.interval_days > 0 and vi.abw_end_g > 0 and vi.abw_start_g > 0
        then 100.0 * (ln(vi.abw_end_g) - ln(vi.abw_start_g)) / vi.interval_days
        else null::double precision
      end as sgr_pct_per_day
    from valid_intervals vi
    left join interval_facts ifc
      on ifc.system_id = vi.system_id
      and ifc.interval_start = vi.interval_start
      and ifc.interval_end = vi.interval_end
    left join fish_start fs
      on fs.system_id = vi.system_id
      and fs.interval_start = vi.interval_start
      and fs.interval_end = vi.interval_end
    left join fish_end fe
      on fe.system_id = vi.system_id
      and fe.interval_start = vi.interval_start
      and fe.interval_end = vi.interval_end
  )
  select
    sc.system_id,
    sc.system_name,
    sc.interval_start,
    sc.interval_end,
    sc.interval_days,
    sc.abw_start_g,
    sc.abw_end_g,
    sc.live_fish::integer,
    sc.total_feed_kg,
    sc.weight_gain_kg,
    case
      when sc.total_feed_kg > 0 and sc.weight_gain_kg > 0
      then sc.total_feed_kg / sc.weight_gain_kg
      else null::double precision
    end as fcr,
    sc.sgr_pct_per_day,
    null::text as dominant_feed_type,
    case
      when sc.interval_days > 60 then 'Interval > 60 days: sample data may be missing'
      when sc.total_feed_kg = 0 then 'No feeding facts in this interval'
      when sc.abw_end_g <= sc.abw_start_g then 'No positive growth in this interval'
      else null::text
    end as warning
  from scored sc
  order by sc.system_id, sc.interval_start;
end;
$$;

comment on function public.api_feed_fcr_intervals(uuid, bigint, date, date)
  is 'Intentional app-facing SECURITY DEFINER RPC. Direct access to internal read models is revoked; callers must be authenticated and function body must enforce farm membership/scope checks. Sampling intervals and feed/FCR metrics are sourced from canonical analytics objects; if a selected window has no interval, the latest completed interval as-of the end date is returned.';

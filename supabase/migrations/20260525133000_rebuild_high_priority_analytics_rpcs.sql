-- Rebuild the two highest-priority analytics RPCs on the canonical layer.
-- Core production formulas now come from analytics.production_summary and
-- analytics.daily_system_facts instead of being recalculated from raw
-- operation tables inside app-facing RPCs.

create or replace function public.api_dashboard_consolidated(
  p_farm_id uuid,
  p_system_id bigint default null::bigint,
  p_start_date date default null::date,
  p_end_date date default null::date,
  p_time_period text default null::text,
  p_limit integer default null::integer,
  p_order_desc boolean default true
)
returns table(
  system_id bigint,
  input_start_date date,
  input_end_date date,
  time_period text,
  mortality_rate double precision,
  feeding_rate double precision,
  average_biomass double precision,
  biomass_density double precision,
  efcr_period_consolidated double precision,
  water_quality_rating_numeric_average numeric,
  water_quality_rating_average text,
  efcr_period_consolidated_delta numeric,
  mortality_rate_delta numeric,
  average_biomass_delta numeric,
  biomass_density_delta numeric,
  feeding_rate_delta numeric,
  abw_asof_end double precision,
  abw_asof_end_delta numeric,
  water_quality_rating_numeric_delta numeric
)
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'pg_temp'
as $$
declare
  v_start date;
  v_end date;
  v_len integer;
  v_prev_start date;
  v_prev_end date;
  v_tp public.time_period;
begin
  if not private.is_farm_member(p_farm_id) then
    return;
  end if;

  perform private.assert_rpc_parameters(
    p_farm_id := p_farm_id,
    p_system_id := p_system_id,
    p_batch_id := null,
    p_start_date := p_start_date,
    p_end_date := p_end_date
  );

  if p_start_date is not null and p_end_date is not null then
    v_start := p_start_date;
    v_end := p_end_date;
  else
    select dtp.time_period into v_tp
    from public.dashboard_time_period dtp
    where dtp.time_period::text = coalesce(p_time_period, '2 weeks')
    limit 1;

    if v_tp is null then
      v_tp := '2 weeks'::public.time_period;
    end if;

    select b.input_start_date, b.input_end_date into v_start, v_end
    from public.api_time_period_bounds_scoped(p_farm_id, v_tp::text, 'dashboard') b;
  end if;

  if v_start is null or v_end is null then
    return;
  end if;

  v_len := (v_end - v_start) + 1;
  v_prev_end := v_start - 1;
  v_prev_start := v_prev_end - (v_len - 1);

  return query
  with sys as (
    select s.id as system_id
    from public.system s
    where s.farm_id = p_farm_id
      and coalesce(s.is_active, true) = true
      and (p_system_id is null or s.id = p_system_id)
  ),
  inv as (
    select d.*
    from analytics.daily_system_facts d
    join sys on sys.system_id = d.system_id
  ),
  cur as (
    select * from inv where inventory_date between v_start and v_end
  ),
  prev as (
    select * from inv where inventory_date between v_prev_start and v_prev_end
  ),
  cur_metrics as (
    select
      d.system_id,
      case when sum(coalesce(d.biomass_last_sampling, 0)) > 0
        then sum(coalesce(d.feeding_rate, 0) * coalesce(d.biomass_last_sampling, 0))
          / nullif(sum(coalesce(d.biomass_last_sampling, 0)), 0)
        else avg(d.feeding_rate)
      end as feeding_rate,
      case when sum(coalesce(d.number_of_fish, 0)) > 0
        then sum(coalesce(d.mortality_rate, 0) * coalesce(d.number_of_fish, 0))
          / nullif(sum(coalesce(d.number_of_fish, 0)), 0)
        else avg(d.mortality_rate)
      end as mortality_rate,
      avg(d.biomass_last_sampling) as average_biomass,
      avg(d.biomass_density) as biomass_density
    from cur d
    group by d.system_id
  ),
  prev_metrics as (
    select
      d.system_id,
      case when sum(coalesce(d.biomass_last_sampling, 0)) > 0
        then sum(coalesce(d.feeding_rate, 0) * coalesce(d.biomass_last_sampling, 0))
          / nullif(sum(coalesce(d.biomass_last_sampling, 0)), 0)
        else avg(d.feeding_rate)
      end as feeding_rate,
      case when sum(coalesce(d.number_of_fish, 0)) > 0
        then sum(coalesce(d.mortality_rate, 0) * coalesce(d.number_of_fish, 0))
          / nullif(sum(coalesce(d.number_of_fish, 0)), 0)
        else avg(d.mortality_rate)
      end as mortality_rate,
      avg(d.biomass_last_sampling) as average_biomass,
      avg(d.biomass_density) as biomass_density
    from prev d
    group by d.system_id
  ),
  cur_efcr as (
    select
      ps.system_id,
      sum(coalesce(ps.total_feed_amount_period, 0)) as feed_sum,
      sum(
        coalesce(ps.biomass_increase_period, 0)
        + coalesce(ps.total_weight_transfer_out, 0)
        - coalesce(ps.total_weight_transfer_in, 0)
        + coalesce(ps.total_weight_harvested, 0)
        - coalesce(ps.total_weight_stocked, 0)
      ) as denominator
    from analytics.production_summary ps
    join sys on sys.system_id = ps.system_id
    where ps.date between v_start and v_end
    group by ps.system_id
  ),
  prev_efcr as (
    select
      ps.system_id,
      sum(coalesce(ps.total_feed_amount_period, 0)) as feed_sum,
      sum(
        coalesce(ps.biomass_increase_period, 0)
        + coalesce(ps.total_weight_transfer_out, 0)
        - coalesce(ps.total_weight_transfer_in, 0)
        + coalesce(ps.total_weight_harvested, 0)
        - coalesce(ps.total_weight_stocked, 0)
      ) as denominator
    from analytics.production_summary ps
    join sys on sys.system_id = ps.system_id
    where ps.date between v_prev_start and v_prev_end
    group by ps.system_id
  ),
  cur_wq as (
    select s.system_id, avg(dwr.rating_numeric::numeric) as wq_num
    from sys s
    left join public.daily_water_quality_rating dwr
      on dwr.system_id = s.system_id
      and dwr.rating_date between v_start and v_end
    group by s.system_id
  ),
  prev_wq as (
    select s.system_id, avg(dwr.rating_numeric::numeric) as wq_num
    from sys s
    left join public.daily_water_quality_rating dwr
      on dwr.system_id = s.system_id
      and dwr.rating_date between v_prev_start and v_prev_end
    group by s.system_id
  ),
  cur_abw as (
    select
      s.system_id,
      (
        select d.abw_last_sampling
        from analytics.daily_system_facts d
        where d.system_id = s.system_id
          and d.inventory_date <= v_end
          and d.abw_last_sampling is not null
        order by d.inventory_date desc
        limit 1
      ) as abw_asof_end
    from sys s
  ),
  prev_abw as (
    select
      s.system_id,
      (
        select d.abw_last_sampling
        from analytics.daily_system_facts d
        where d.system_id = s.system_id
          and d.inventory_date <= v_prev_end
          and d.abw_last_sampling is not null
        order by d.inventory_date desc
        limit 1
      ) as abw_asof_end
    from sys s
  )
  select
    s.system_id,
    v_start as input_start_date,
    v_end as input_end_date,
    coalesce(p_time_period, v_tp::text) as time_period,
    cm.mortality_rate::double precision,
    cm.feeding_rate::double precision,
    cm.average_biomass::double precision,
    cm.biomass_density::double precision,
    case
      when ce.denominator is null or ce.denominator <= 0 then null::double precision
      else (ce.feed_sum::double precision / ce.denominator::double precision)
    end as efcr_period_consolidated,
    cwq.wq_num::numeric as water_quality_rating_numeric_average,
    case
      when cwq.wq_num is null then null::text
      else public.water_quality_rating_label(cwq.wq_num)
    end as water_quality_rating_average,
    (
      case
        when ce.denominator is null or ce.denominator <= 0 then null::numeric
        else (ce.feed_sum / ce.denominator)::numeric
      end
      -
      case
        when pe.denominator is null or pe.denominator <= 0 then null::numeric
        else (pe.feed_sum / pe.denominator)::numeric
      end
    ) as efcr_period_consolidated_delta,
    (cm.mortality_rate::numeric - pm.mortality_rate::numeric) as mortality_rate_delta,
    (cm.average_biomass::numeric - pm.average_biomass::numeric) as average_biomass_delta,
    (cm.biomass_density::numeric - pm.biomass_density::numeric) as biomass_density_delta,
    (cm.feeding_rate::numeric - pm.feeding_rate::numeric) as feeding_rate_delta,
    cabw.abw_asof_end::double precision as abw_asof_end,
    (cabw.abw_asof_end::numeric - pabw.abw_asof_end::numeric) as abw_asof_end_delta,
    (cwq.wq_num - pwq.wq_num) as water_quality_rating_numeric_delta
  from sys s
  left join cur_metrics cm on cm.system_id = s.system_id
  left join prev_metrics pm on pm.system_id = s.system_id
  left join cur_efcr ce on ce.system_id = s.system_id
  left join prev_efcr pe on pe.system_id = s.system_id
  left join cur_wq cwq on cwq.system_id = s.system_id
  left join prev_wq pwq on pwq.system_id = s.system_id
  left join cur_abw cabw on cabw.system_id = s.system_id
  left join prev_abw pabw on pabw.system_id = s.system_id
  order by
    case when p_order_desc then s.system_id end desc nulls last,
    case when not p_order_desc then s.system_id end asc nulls last
  limit private.clamp_rpc_limit(p_limit, 1000, 10000);
end;
$$;

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
      s.system_id,
      s.system_name,
      lag(s.sample_date) over w as interval_start,
      s.sample_date as interval_end,
      (s.sample_date - lag(s.sample_date) over w)::integer as interval_days,
      lag(s.abw_g) over w as abw_start_g,
      s.abw_g as abw_end_g
    from samples s
    window w as (partition by s.system_id, s.cycle_id order by s.sample_date)
  ),
  valid_intervals as (
    select *
    from intervals
    where interval_start is not null
      and interval_days > 0
      and (p_date_from is null or interval_end >= p_date_from)
      and (p_date_to is null or interval_start <= p_date_to)
  ),
  facts as (
    select d.*
    from analytics.daily_system_facts d
    join sys on sys.system_id = d.system_id
  ),
  interval_facts as (
    select
      i.system_id,
      i.interval_start,
      i.interval_end,
      coalesce(sum(d.feeding_amount), 0)::double precision as total_feed_kg
    from valid_intervals i
    left join facts d
      on d.system_id = i.system_id
      and d.inventory_date > i.interval_start
      and d.inventory_date <= i.interval_end
    group by i.system_id, i.interval_start, i.interval_end
  ),
  fish_start as (
    select distinct on (i.system_id, i.interval_start, i.interval_end)
      i.system_id,
      i.interval_start,
      i.interval_end,
      d.number_of_fish::integer as fish_start
    from valid_intervals i
    left join facts d
      on d.system_id = i.system_id
      and d.inventory_date <= i.interval_start
      and d.number_of_fish is not null
    order by i.system_id, i.interval_start, i.interval_end, d.inventory_date desc
  ),
  fish_end as (
    select distinct on (i.system_id, i.interval_start, i.interval_end)
      i.system_id,
      i.interval_start,
      i.interval_end,
      d.number_of_fish::integer as fish_end
    from valid_intervals i
    left join facts d
      on d.system_id = i.system_id
      and d.inventory_date <= i.interval_end
      and d.number_of_fish is not null
    order by i.system_id, i.interval_start, i.interval_end, d.inventory_date desc
  ),
  scored as (
    select
      i.system_id,
      i.system_name,
      i.interval_start,
      i.interval_end,
      i.interval_days,
      i.abw_start_g,
      i.abw_end_g,
      coalesce(fe.fish_end, 0) as live_fish,
      coalesce(f.total_feed_kg, 0) as total_feed_kg,
      case
        when fe.fish_end > 0 and fs.fish_start > 0
          and (i.abw_end_g * fe.fish_end - i.abw_start_g * fs.fish_start) > 0
        then (i.abw_end_g * fe.fish_end - i.abw_start_g * fs.fish_start) / 1000.0
        when fe.fish_end > 0 and i.abw_end_g > i.abw_start_g
        then ((i.abw_end_g - i.abw_start_g) * fe.fish_end) / 1000.0
        else null::double precision
      end as weight_gain_kg,
      case
        when i.interval_days > 0 and i.abw_end_g > 0 and i.abw_start_g > 0
        then 100.0 * (ln(i.abw_end_g) - ln(i.abw_start_g)) / i.interval_days
        else null::double precision
      end as sgr_pct_per_day,
      fs.fish_start
    from valid_intervals i
    left join interval_facts f using (system_id, interval_start, interval_end)
    left join fish_start fs using (system_id, interval_start, interval_end)
    left join fish_end fe using (system_id, interval_start, interval_end)
  )
  select
    s.system_id,
    s.system_name,
    s.interval_start,
    s.interval_end,
    s.interval_days,
    s.abw_start_g,
    s.abw_end_g,
    s.live_fish::integer,
    s.total_feed_kg,
    s.weight_gain_kg,
    case
      when s.total_feed_kg > 0 and s.weight_gain_kg > 0
      then s.total_feed_kg / s.weight_gain_kg
      else null::double precision
    end as fcr,
    s.sgr_pct_per_day,
    null::text as dominant_feed_type,
    case
      when s.interval_days > 60 then 'Interval > 60 days: sample data may be missing'
      when s.total_feed_kg = 0 then 'No feeding facts in this interval'
      when s.abw_end_g <= s.abw_start_g then 'No positive growth in this interval'
      else null::text
    end as warning
  from scored s
  order by s.system_id, s.interval_start;
end;
$$;

alter function public.api_dashboard_consolidated(uuid, bigint, date, date, text, integer, boolean) owner to postgres;
alter function public.api_feed_fcr_intervals(uuid, bigint, date, date) owner to postgres;

revoke all on function public.api_dashboard_consolidated(uuid, bigint, date, date, text, integer, boolean) from public;
grant all on function public.api_dashboard_consolidated(uuid, bigint, date, date, text, integer, boolean) to authenticated;
grant all on function public.api_dashboard_consolidated(uuid, bigint, date, date, text, integer, boolean) to service_role;

revoke all on function public.api_feed_fcr_intervals(uuid, bigint, date, date) from public;
grant all on function public.api_feed_fcr_intervals(uuid, bigint, date, date) to authenticated;
grant all on function public.api_feed_fcr_intervals(uuid, bigint, date, date) to service_role;

comment on function public.api_dashboard_consolidated(uuid, bigint, date, date, text, integer, boolean)
  is 'Intentional app-facing SECURITY DEFINER RPC. Direct access to internal read models is revoked; callers must be authenticated and function body must enforce farm membership/scope checks. Core analytics are sourced from analytics.daily_system_facts and analytics.production_summary.';

comment on function public.api_feed_fcr_intervals(uuid, bigint, date, date)
  is 'Intentional app-facing SECURITY DEFINER RPC. Direct access to internal read models is revoked; callers must be authenticated and function body must enforce farm membership/scope checks. Sampling intervals and feed/FCR metrics are sourced from canonical analytics objects.';

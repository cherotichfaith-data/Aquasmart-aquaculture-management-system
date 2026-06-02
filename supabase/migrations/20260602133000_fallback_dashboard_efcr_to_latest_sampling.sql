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
  cur_sampling_efcr as (
    select distinct on (s.system_id)
      s.system_id,
      ev.efcr_period_last_sampling::double precision as efcr
    from sys s
    left join analytics.efcr_period_last_sampling_view ev
      on ev.system_id = s.system_id
      and ev.inventory_date <= v_end
      and ev.efcr_period_last_sampling is not null
    order by s.system_id, ev.inventory_date desc
  ),
  prev_sampling_efcr as (
    select distinct on (s.system_id)
      s.system_id,
      ev.efcr_period_last_sampling::double precision as efcr
    from sys s
    left join analytics.efcr_period_last_sampling_view ev
      on ev.system_id = s.system_id
      and ev.inventory_date <= v_prev_end
      and ev.efcr_period_last_sampling is not null
    order by s.system_id, ev.inventory_date desc
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
  ),
  resolved as (
    select
      s.system_id,
      case
        when ce.denominator is null or ce.denominator <= 0 then cse.efcr
        else (ce.feed_sum::double precision / ce.denominator::double precision)
      end as cur_efcr,
      case
        when pe.denominator is null or pe.denominator <= 0 then pse.efcr
        else (pe.feed_sum::double precision / pe.denominator::double precision)
      end as prev_efcr
    from sys s
    left join cur_efcr ce on ce.system_id = s.system_id
    left join prev_efcr pe on pe.system_id = s.system_id
    left join cur_sampling_efcr cse on cse.system_id = s.system_id
    left join prev_sampling_efcr pse on pse.system_id = s.system_id
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
    r.cur_efcr::double precision as efcr_period_consolidated,
    cwq.wq_num::numeric as water_quality_rating_numeric_average,
    case
      when cwq.wq_num is null then null::text
      else public.water_quality_rating_label(cwq.wq_num)
    end as water_quality_rating_average,
    (r.cur_efcr::numeric - r.prev_efcr::numeric) as efcr_period_consolidated_delta,
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
  left join resolved r on r.system_id = s.system_id
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

comment on function public.api_dashboard_consolidated(uuid, bigint, date, date, text, integer, boolean)
  is 'Intentional app-facing SECURITY DEFINER RPC. Direct access to internal read models is revoked; callers must be authenticated and function body must enforce farm membership/scope checks. Core analytics are sourced from analytics.daily_system_facts and analytics.production_summary; eFCR falls back to latest sampling eFCR as-of the selected end date.';

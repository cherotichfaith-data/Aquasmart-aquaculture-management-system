create materialized view public.dashboard as
with
  input_anchor as (
    select
      COALESCE(
        (
          select
            i.input_end_date
          from
            input i
          order by
            i.id desc
          limit
            1
        ),
        CURRENT_DATE
      ) as input_end_date,
      (
        select
          i.input_start_date
        from
          input i
        order by
          i.id desc
        limit
          1
      ) as input_start_date
  ),
  input_dates as (
    select
      'custom'::text as time_period,
      ia.input_start_date,
      ia.input_end_date
    from
      input_anchor ia
    where
      ia.input_start_date is not null
      and ia.input_end_date is not null
  ),
  additional_dates as (
    select
      dtp.time_period::text as time_period,
      ia.input_end_date - dtp.days_since_start::integer as input_start_date,
      ia.input_end_date
    from
      dashboard_time_period dtp
      cross join input_anchor ia
    where
      dtp.days_since_start is not null
  ),
  all_dates as (
    select
      input_dates.time_period,
      input_dates.input_start_date,
      input_dates.input_end_date
    from
      input_dates
    union all
    select
      additional_dates.time_period,
      additional_dates.input_start_date,
      additional_dates.input_end_date
    from
      additional_dates
  ),
  system_info as (
    select
      s.id as system_id,
      s.name as system_name,
      s.growth_stage,
      s.volume
    from
      system s
  ),
  sampling_bounds as (
    select
      si_1.system_id,
      ad_1.time_period,
      ad_1.input_start_date,
      ad_1.input_end_date,
      (
        select
          ps.date
        from
          production_summary ps
        where
          ps.system_id = si_1.system_id
          and ps.date <= ad_1.input_start_date
          and ps.average_body_weight is not null
        order by
          ps.date desc
        limit
          1
      ) as sampling_start_date,
      (
        select
          ps.date
        from
          production_summary ps
        where
          ps.system_id = si_1.system_id
          and ps.date <= ad_1.input_end_date
          and ps.average_body_weight is not null
        order by
          ps.date desc
        limit
          1
      ) as sampling_end_date
    from
      system_info si_1
      cross join all_dates ad_1
  ),
  bound_data as (
    select
      sb.system_id,
      sb.time_period,
      sb.input_start_date,
      sb.input_end_date,
      sb.sampling_start_date,
      sb.sampling_end_date,
      ps_start.total_biomass as biomass_start,
      ps_end.total_biomass as biomass_end,
      ps_end.average_body_weight as abw_last_sampling
    from
      sampling_bounds sb
      left join production_summary ps_start on ps_start.system_id = sb.system_id
      and ps_start.date = sb.sampling_start_date
      left join production_summary ps_end on ps_end.system_id = sb.system_id
      and ps_end.date = sb.sampling_end_date
  ),
  mid_window as (
    select
      ps.system_id,
      ad_1.time_period,
      ad_1.input_start_date,
      ad_1.input_end_date,
      avg(ps.total_biomass) as avg_biomass,
      avg(ps.number_of_fish_inventory) as avg_number_of_fish,
      sum(ps.total_feed_amount_period) as feed_sum,
      sum(ps.daily_mortality_count) as mortality_sum,
      sum(ps.total_weight_harvested) as harvested_sum,
      sum(ps.total_weight_stocked) as stocked_sum,
      sum(ps.total_weight_transfer_out) as transfer_out_sum,
      sum(ps.total_weight_transfer_in) as transfer_in_sum
    from
      all_dates ad_1
      join production_summary ps on ps.date >= (ad_1.input_start_date + 1)
      and ps.date <= ad_1.input_end_date
    group by
      ps.system_id,
      ad_1.time_period,
      ad_1.input_start_date,
      ad_1.input_end_date
  ),
  feeding_rate_data as (
    select
      ps.system_id,
      ad_1.time_period,
      ad_1.input_start_date,
      ad_1.input_end_date,
      case
        when sum(ps.total_biomass) = 0::double precision then null::double precision
        else sum(ps.total_feed_amount_period) / sum(ps.total_biomass)
      end as feeding_rate
    from
      all_dates ad_1
      join production_summary ps on ps.date >= (ad_1.input_start_date + 1)
      and ps.date <= ad_1.input_end_date
    group by
      ps.system_id,
      ad_1.time_period,
      ad_1.input_start_date,
      ad_1.input_end_date
  ),
  mortality_rate_data as (
    select
      ps.system_id,
      ad_1.time_period,
      ad_1.input_start_date,
      ad_1.input_end_date,
      case
        when sum(ps.number_of_fish_inventory) = 0::double precision then null::double precision
        else sum(ps.daily_mortality_count) / sum(ps.number_of_fish_inventory)
      end as mortality_rate
    from
      all_dates ad_1
      join production_summary ps on ps.date >= (ad_1.input_start_date + 1)
      and ps.date <= ad_1.input_end_date
    group by
      ps.system_id,
      ad_1.time_period,
      ad_1.input_start_date,
      ad_1.input_end_date
  ),
  biomass_density_data as (
    select
      ps.system_id,
      ad_1.time_period,
      ad_1.input_start_date,
      ad_1.input_end_date,
      case
        when max(si_1.volume) is null
        or max(si_1.volume) = 0::double precision then null::double precision
        else avg(ps.total_biomass) / max(si_1.volume)
      end as biomass_density,
      avg(ps.total_biomass) as average_biomass
    from
      all_dates ad_1
      join production_summary ps on ps.date >= (ad_1.input_start_date + 1)
      and ps.date <= ad_1.input_end_date
      join system_info si_1 on si_1.system_id = ps.system_id
    group by
      ps.system_id,
      ad_1.time_period,
      ad_1.input_start_date,
      ad_1.input_end_date
  ),
  average_number_of_fish_data as (
    select
      ps.system_id,
      ad_1.time_period,
      ad_1.input_start_date,
      ad_1.input_end_date,
      avg(ps.number_of_fish_inventory) as average_number_of_fish
    from
      all_dates ad_1
      join production_summary ps on ps.date >= (ad_1.input_start_date + 1)
      and ps.date <= ad_1.input_end_date
    group by
      ps.system_id,
      ad_1.time_period,
      ad_1.input_start_date,
      ad_1.input_end_date
  ),
  water_quality_data as (
    select
      wqr.system_id,
      ad_1.time_period,
      ad_1.input_start_date,
      ad_1.input_end_date,
      round(avg(wqr.rating_numeric), 1) as water_quality_rating_numeric_average,
      case
        when round(avg(wqr.rating_numeric)) = 0::numeric then 'lethal'::water_quality_rating
        when round(avg(wqr.rating_numeric)) = 1::numeric then 'critical'::water_quality_rating
        when round(avg(wqr.rating_numeric)) = 2::numeric then 'acceptable'::water_quality_rating
        when round(avg(wqr.rating_numeric)) = 3::numeric then 'optimal'::water_quality_rating
        else null::water_quality_rating
      end as water_quality_rating_average
    from
      daily_water_quality_rating wqr
      cross join all_dates ad_1
    where
      wqr.rating_date >= (ad_1.input_start_date + 1)
      and wqr.rating_date <= ad_1.input_end_date
    group by
      wqr.system_id,
      ad_1.time_period,
      ad_1.input_start_date,
      ad_1.input_end_date
  ),
  efcr_data as (
    select
      bd_1.system_id,
      bd_1.time_period,
      bd_1.input_start_date,
      bd_1.input_end_date,
      bd_1.sampling_end_date as efcr_latest_date,
      COALESCE(mw.feed_sum, 0::double precision) as total_feed_period,
      COALESCE(bd_1.biomass_end, 0::double precision) - COALESCE(bd_1.biomass_start, 0::double precision) + COALESCE(mw.harvested_sum, 0::double precision) + COALESCE(mw.transfer_out_sum, 0::double precision) - COALESCE(mw.transfer_in_sum, 0::double precision) - COALESCE(mw.stocked_sum, 0::double precision) as efcr_denominator_period,
      case
        when NULLIF(
          COALESCE(bd_1.biomass_end, 0::double precision) - COALESCE(bd_1.biomass_start, 0::double precision) + COALESCE(mw.harvested_sum, 0::double precision) + COALESCE(mw.transfer_out_sum, 0::double precision) - COALESCE(mw.transfer_in_sum, 0::double precision) - COALESCE(mw.stocked_sum, 0::double precision),
          0::double precision
        ) is null then null::double precision
        else COALESCE(mw.feed_sum, 0::double precision) / NULLIF(
          COALESCE(bd_1.biomass_end, 0::double precision) - COALESCE(bd_1.biomass_start, 0::double precision) + COALESCE(mw.harvested_sum, 0::double precision) + COALESCE(mw.transfer_out_sum, 0::double precision) - COALESCE(mw.transfer_in_sum, 0::double precision) - COALESCE(mw.stocked_sum, 0::double precision),
          0::double precision
        )
      end as efcr
    from
      bound_data bd_1
      left join mid_window mw on mw.system_id = bd_1.system_id
      and mw.time_period = bd_1.time_period
      and mw.input_start_date = bd_1.input_start_date
      and mw.input_end_date = bd_1.input_end_date
  )
select
  si.system_id,
  si.system_name,
  si.growth_stage,
  ad.input_start_date,
  ad.input_end_date,
  ad.time_period,
  bd.sampling_start_date,
  bd.sampling_end_date,
  ef.efcr,
  ef.efcr_latest_date,
  'up'::arrows as efcr_arrow,
  bd.abw_last_sampling as abw,
  bd.sampling_end_date as abw_latest_date,
  'up'::arrows as abw_arrow,
  fr.feeding_rate,
  ad.input_end_date as feeding_rate_latest_date,
  'down'::arrows as feeding_rate_arrow,
  mr.mortality_rate,
  ad.input_end_date as mortality_rate_latest_date,
  'straight'::arrows as mortality_rate_arrow,
  bdens.biomass_density,
  'straight'::arrows as biomass_density_arrow,
  bdens.average_biomass,
  anf.average_number_of_fish,
  wq.water_quality_rating_numeric_average,
  wq.water_quality_rating_average,
  ad.input_end_date as water_quality_latest_date,
  'straight'::arrows as water_quality_arrow,
  ef.total_feed_period,
  ef.efcr_denominator_period
from
  all_dates ad
  cross join system_info si
  left join bound_data bd on bd.system_id = si.system_id
  and bd.time_period = ad.time_period
  and bd.input_start_date = ad.input_start_date
  and bd.input_end_date = ad.input_end_date
  left join efcr_data ef on ef.system_id = si.system_id
  and ef.time_period = ad.time_period
  and ef.input_start_date = ad.input_start_date
  and ef.input_end_date = ad.input_end_date
  left join feeding_rate_data fr on fr.system_id = si.system_id
  and fr.time_period = ad.time_period
  and fr.input_start_date = ad.input_start_date
  and fr.input_end_date = ad.input_end_date
  left join mortality_rate_data mr on mr.system_id = si.system_id
  and mr.time_period = ad.time_period
  and mr.input_start_date = ad.input_start_date
  and mr.input_end_date = ad.input_end_date
  left join biomass_density_data bdens on bdens.system_id = si.system_id
  and bdens.time_period = ad.time_period
  and bdens.input_start_date = ad.input_start_date
  and bdens.input_end_date = ad.input_end_date
  left join average_number_of_fish_data anf on anf.system_id = si.system_id
  and anf.time_period = ad.time_period
  and anf.input_start_date = ad.input_start_date
  and anf.input_end_date = ad.input_end_date
  left join water_quality_data wq on wq.system_id = si.system_id
  and wq.time_period = ad.time_period
  and wq.input_start_date = ad.input_start_date
  and wq.input_end_date = ad.input_end_date;
create materialized view public.production_summary as
with
  asof as (
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
      ) as as_of_date
  ),
  cycle_map as (
    select
      pc.cycle_id,
      pc.system_id,
      pc.cycle_start,
      LEAST(
        COALESCE(
          pc.cycle_end,
          (
            select
              asof.as_of_date
            from
              asof
          )
        ),
        (
          select
            asof.as_of_date
          from
            asof
        )
      ) as cycle_end,
      pc.cycle_end is null
      or pc.cycle_end > (
        (
          select
            asof.as_of_date
          from
            asof
        )
      ) as ongoing_cycle
    from
      production_cycle pc
  ),
  daily as (
    select
      d.inventory_date as date,
      d.system_id::bigint as system_id,
      s.name as system_name,
      s.growth_stage,
      d.abw_last_sampling::double precision as average_body_weight,
      d.number_of_fish as number_of_fish_inventory,
      COALESCE(
        d.biomass_last_sampling,
        d.number_of_fish * d.abw_last_sampling::double precision / 1000.0::double precision
      ) as total_biomass,
      COALESCE(d.feeding_amount, 0::numeric)::double precision as total_feed_amount_period,
      COALESCE(d.number_of_fish_mortality, 0::numeric)::double precision as daily_mortality_count
    from
      daily_fish_inventory_table d
      join system s on s.id = d.system_id::bigint
    where
      d.inventory_date <= (
        (
          select
            asof.as_of_date
          from
            asof
        )
      )
  ),
  daily_with_cycle as (
    select
      d.date,
      d.system_id,
      d.system_name,
      d.growth_stage,
      d.average_body_weight,
      d.number_of_fish_inventory,
      d.total_biomass,
      d.total_feed_amount_period,
      d.daily_mortality_count,
      cm.cycle_id,
      cm.ongoing_cycle
    from
      daily d
      left join cycle_map cm on cm.system_id = d.system_id
      and d.date >= cm.cycle_start
      and d.date <= cm.cycle_end
  ),
  transfers_out as (
    select
      ft.origin_system_id as system_id,
      ft.date,
      COALESCE(
        sum(ft.number_of_fish_transfer),
        0::double precision
      ) as number_of_fish_transfer_out,
      COALESCE(
        sum(ft.total_weight_transfer),
        0::double precision
      ) as total_weight_transfer_out
    from
      fish_transfer ft
    group by
      ft.origin_system_id,
      ft.date
  ),
  transfers_in as (
    select
      ft.target_system_id as system_id,
      ft.date,
      COALESCE(
        sum(ft.number_of_fish_transfer),
        0::double precision
      ) as number_of_fish_transfer_in,
      COALESCE(
        sum(ft.total_weight_transfer),
        0::double precision
      ) as total_weight_transfer_in
    from
      fish_transfer ft
    group by
      ft.target_system_id,
      ft.date
  ),
  harvest as (
    select
      fh.system_id,
      fh.date,
      COALESCE(sum(fh.number_of_fish_harvest), 0::numeric)::double precision as number_of_fish_harvested,
      COALESCE(sum(fh.total_weight_harvest), 0::double precision) as total_weight_harvested
    from
      fish_harvest fh
    group by
      fh.system_id,
      fh.date
  ),
  stocking as (
    select
      fs.system_id,
      fs.date,
      COALESCE(sum(fs.number_of_fish_stocking), 0::numeric)::double precision as number_of_fish_stocked,
      COALESCE(
        sum(fs.total_weight_stocking),
        0::double precision
      ) as total_weight_stocked
    from
      fish_stocking fs
    group by
      fs.system_id,
      fs.date
  ),
  wq as (
    select
      r.system_id,
      r.rating_date as date,
      r.rating_numeric::double precision as water_quality_rating_numeric,
      r.rating::text as water_quality_rating
    from
      daily_water_quality_rating r
  ),
  enriched as (
    select
      d.cycle_id,
      d.date,
      d.system_id,
      d.system_name,
      d.growth_stage,
      d.ongoing_cycle,
      d.average_body_weight,
      d.number_of_fish_inventory,
      d.total_biomass,
      d.total_feed_amount_period,
      COALESCE(
        d.total_biomass - lag(d.total_biomass) over (
          partition by
            d.system_id,
            d.cycle_id
          order by
            d.date
        ),
        0::double precision
      ) as biomass_increase_period,
      d.daily_mortality_count,
      COALESCE(
        to1.number_of_fish_transfer_out,
        0::double precision
      ) as number_of_fish_transfer_out,
      COALESCE(
        to1.total_weight_transfer_out,
        0::double precision
      ) as total_weight_transfer_out,
      COALESCE(
        ti1.number_of_fish_transfer_in,
        0::double precision
      ) as number_of_fish_transfer_in,
      COALESCE(ti1.total_weight_transfer_in, 0::double precision) as total_weight_transfer_in,
      COALESCE(h.number_of_fish_harvested, 0::double precision) as number_of_fish_harvested,
      COALESCE(h.total_weight_harvested, 0::double precision) as total_weight_harvested,
      COALESCE(st.number_of_fish_stocked, 0::double precision) as number_of_fish_stocked,
      COALESCE(st.total_weight_stocked, 0::double precision) as total_weight_stocked,
      w.water_quality_rating_numeric,
      w.water_quality_rating
    from
      daily_with_cycle d
      left join transfers_out to1 on to1.system_id = d.system_id
      and to1.date = d.date
      left join transfers_in ti1 on ti1.system_id = d.system_id
      and ti1.date = d.date
      left join harvest h on h.system_id = d.system_id
      and h.date = d.date
      left join stocking st on st.system_id = d.system_id
      and st.date = d.date
      left join wq w on w.system_id = d.system_id
      and w.date = d.date
  ),
  final as (
    select
      e.cycle_id,
      e.date,
      e.system_id,
      e.system_name,
      e.growth_stage,
      e.ongoing_cycle,
      e.average_body_weight,
      e.number_of_fish_inventory,
      e.total_biomass,
      e.total_feed_amount_period,
      e.biomass_increase_period,
      e.daily_mortality_count,
      e.number_of_fish_transfer_out,
      e.total_weight_transfer_out,
      e.number_of_fish_transfer_in,
      e.total_weight_transfer_in,
      e.number_of_fish_harvested,
      e.total_weight_harvested,
      e.number_of_fish_stocked,
      e.total_weight_stocked,
      e.water_quality_rating_numeric,
      e.water_quality_rating,
      sum(e.total_feed_amount_period) over (
        partition by
          e.system_id,
          e.cycle_id
        order by
          e.date
      ) as total_feed_amount_aggregated,
      sum(e.biomass_increase_period) over (
        partition by
          e.system_id,
          e.cycle_id
        order by
          e.date
      ) as biomass_increase_aggregated,
      sum(e.daily_mortality_count) over (
        partition by
          e.system_id,
          e.cycle_id
        order by
          e.date
      ) as cumulative_mortality,
      sum(e.total_weight_transfer_out) over (
        partition by
          e.system_id,
          e.cycle_id
        order by
          e.date
      ) as total_weight_transfer_out_aggregated,
      sum(e.total_weight_transfer_in) over (
        partition by
          e.system_id,
          e.cycle_id
        order by
          e.date
      ) as total_weight_transfer_in_aggregated,
      sum(e.total_weight_harvested) over (
        partition by
          e.system_id,
          e.cycle_id
        order by
          e.date
      ) as total_weight_harvested_aggregated,
      sum(e.total_weight_stocked) over (
        partition by
          e.system_id,
          e.cycle_id
        order by
          e.date
      ) as total_weight_stocked_aggregated
    from
      enriched e
  )
select
  f.cycle_id,
  f.date,
  f.system_id,
  f.system_name,
  f.growth_stage,
  f.ongoing_cycle,
  f.average_body_weight,
  f.number_of_fish_inventory,
  f.total_feed_amount_period,
  f.total_biomass,
  f.biomass_increase_period as daily_biomass_gain,
  f.biomass_increase_period,
  f.total_feed_amount_aggregated,
  f.biomass_increase_aggregated,
  f.daily_mortality_count,
  f.cumulative_mortality,
  f.number_of_fish_transfer_out,
  f.total_weight_transfer_out,
  f.total_weight_transfer_out_aggregated,
  f.number_of_fish_transfer_in,
  f.total_weight_transfer_in,
  f.total_weight_transfer_in_aggregated,
  f.number_of_fish_harvested,
  f.total_weight_harvested,
  f.total_weight_harvested_aggregated,
  f.number_of_fish_stocked,
  f.total_weight_stocked,
  f.total_weight_stocked_aggregated,
  f.water_quality_rating_numeric as water_quality_rating,
  f.water_quality_rating as water_quality_rating_label,
  case
    when NULLIF(
      COALESCE(f.biomass_increase_period, 0::double precision) + f.total_weight_transfer_out - f.total_weight_transfer_in + f.total_weight_harvested - f.total_weight_stocked,
      0::double precision
    ) is null then null::double precision
    else f.total_feed_amount_period / NULLIF(
      COALESCE(f.biomass_increase_period, 0::double precision) + f.total_weight_transfer_out - f.total_weight_transfer_in + f.total_weight_harvested - f.total_weight_stocked,
      0::double precision
    )
  end as efcr_period,
  case
    when NULLIF(
      COALESCE(
        f.biomass_increase_aggregated,
        0::double precision
      ) + f.total_weight_transfer_out_aggregated - f.total_weight_transfer_in_aggregated + f.total_weight_harvested_aggregated - f.total_weight_stocked_aggregated,
      0::double precision
    ) is null then null::double precision
    else f.total_feed_amount_aggregated / NULLIF(
      COALESCE(
        f.biomass_increase_aggregated,
        0::double precision
      ) + f.total_weight_transfer_out_aggregated - f.total_weight_transfer_in_aggregated + f.total_weight_harvested_aggregated - f.total_weight_stocked_aggregated,
      0::double precision
    )
  end as efcr_aggregated
from
  final f
order by
  f.system_id,
  f.date;
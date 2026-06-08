create or replace function public.api_time_period_bounds_scoped(
  p_farm_id uuid,
  p_time_period text,
  p_scope text default 'dashboard',
  p_anchor_date date default null,
  p_system_id bigint default null
)
returns table(
  time_period text,
  input_start_date date,
  input_end_date date,
  anchor_scope text,
  latest_available_date date,
  available_from_date date,
  requested_days integer,
  available_days integer,
  resolved_days integer,
  staleness_days integer,
  is_truncated boolean
)
language sql
security definer
set search_path to 'pg_catalog', 'public', 'pg_temp'
as $$
  with perm as (
    select private.app_rpc_scope_ok(p_farm_id, null, null, null, null) as ok
  ),
  resolved_scope as (
    select case lower(coalesce(nullif(trim(p_scope), ''), 'dashboard'))
      when 'dashboard' then 'dashboard'
      when 'inventory' then 'inventory'
      when 'production' then 'production'
      when 'water_quality' then 'water_quality'
      when 'water-quality' then 'water_quality'
      when 'feeding' then 'feeding'
      when 'feed' then 'feeding'
      when 'feed_inventory' then 'feed_inventory'
      when 'feed-inventory' then 'feed_inventory'
      else 'dashboard'
    end as anchor_scope
    from perm where perm.ok
  ),
  requested_period as (
    select lower(replace(coalesce(nullif(trim(p_time_period), ''), '2 weeks'), '-', ' ')) as value
  ),
  tp as (
    select
      case
        when rp.value in ('all history', 'all_history') then 'all history'
        else dtp.time_period::text
      end as time_period,
      case
        when rp.value in ('all history', 'all_history') then null::integer
        else greatest(dtp.days_since_start, 1)
      end as requested_days
    from requested_period rp
    join perm on perm.ok
    left join public.dashboard_time_period dtp on dtp.time_period::text = rp.value
    where rp.value in ('all history', 'all_history') or dtp.time_period is not null
    limit 1
  ),
  capped_anchor as (
    select least(coalesce(p_anchor_date, current_date), current_date) as value
  ),
  active_systems as (
    select s.id
    from public.system s
    where s.farm_id = p_farm_id
      and coalesce(s.is_active, true) = true
      and (p_system_id is null or s.id = p_system_id)
  ),
  scoped_dates as (
    select
      rs.anchor_scope,
      case rs.anchor_scope
        when 'water_quality' then (
          select min(latest_date)
          from (
            select max(dwr.rating_date) as latest_date
            from active_systems s
            join public.daily_water_quality_rating dwr on dwr.system_id = s.id
            cross join capped_anchor ca
            where dwr.rating_date <= ca.value
            group by s.id
          ) per_system
          where latest_date is not null
        )
        when 'feeding' then (
          select min(latest_date)
          from (
            select max(fr.date) as latest_date
            from active_systems s
            join public.feeding_record fr on fr.system_id = s.id
            cross join capped_anchor ca
            where fr.date <= ca.value
            group by s.id
          ) per_system
          where latest_date is not null
        )
        when 'feed_inventory' then (
          select max(fi.inventory_date)
          from public.feed_inventory fi
          cross join capped_anchor ca
          where fi.farm_id = p_farm_id
            and fi.inventory_date <= ca.value
            and p_system_id is null
        )
        else (
          select min(latest_date)
          from (
            select max(d.inventory_date) as latest_date
            from active_systems s
            join analytics.daily_system_facts d on d.system_id = s.id
            cross join capped_anchor ca
            where d.inventory_date <= ca.value
            group by s.id
          ) per_system
          where latest_date is not null
        )
      end as latest_available_date,
      case rs.anchor_scope
        when 'water_quality' then (
          select min(dwr.rating_date)
          from active_systems s
          join public.daily_water_quality_rating dwr on dwr.system_id = s.id
          where dwr.rating_date <= current_date
        )
        when 'feeding' then (
          select min(fr.date)
          from active_systems s
          join public.feeding_record fr on fr.system_id = s.id
          where fr.date <= current_date
        )
        when 'feed_inventory' then (
          select min(fi.inventory_date)
          from public.feed_inventory fi
          where fi.farm_id = p_farm_id
            and fi.inventory_date <= current_date
            and p_system_id is null
        )
        else (
          select min(d.inventory_date)
          from active_systems s
          join analytics.daily_system_facts d on d.system_id = s.id
          where d.inventory_date <= current_date
        )
      end as available_from_date
    from resolved_scope rs
  ),
  bounded as (
    select
      tp.time_period,
      sd.anchor_scope,
      sd.latest_available_date as input_end_date,
      sd.available_from_date,
      tp.requested_days,
      case
        when sd.latest_available_date is null or sd.available_from_date is null then null::date
        when tp.time_period = 'all history' then sd.available_from_date
        else greatest(sd.available_from_date, sd.latest_available_date - (tp.requested_days - 1))
      end as input_start_date
    from tp cross join scoped_dates sd
  )
  select
    b.time_period,
    b.input_start_date,
    b.input_end_date,
    case when p_system_id is null then b.anchor_scope else b.anchor_scope || ':system' end as anchor_scope,
    b.input_end_date as latest_available_date,
    b.available_from_date,
    b.requested_days,
    case
      when b.input_end_date is null or b.available_from_date is null then null::integer
      else (b.input_end_date - b.available_from_date + 1)::integer
    end as available_days,
    case
      when b.input_end_date is null or b.input_start_date is null then null::integer
      else (b.input_end_date - b.input_start_date + 1)::integer
    end as resolved_days,
    case
      when b.input_end_date is null then null::integer
      else greatest((current_date - b.input_end_date)::integer, 0)
    end as staleness_days,
    case
      when b.time_period = 'all history' then false
      when b.input_end_date is null or b.available_from_date is null or b.input_start_date is null then false
      else b.input_start_date > (b.input_end_date - (b.requested_days - 1))
    end as is_truncated
  from bounded b;
$$;

alter function public.api_time_period_bounds_scoped(uuid, text, text, date, bigint) owner to postgres;

comment on function public.api_time_period_bounds_scoped(uuid, text, text, date, bigint)
  is 'Intentional app-facing SECURITY DEFINER RPC. Anchors shared time windows to active-system data coverage so filters do not drop active systems just because another system has newer data.';

revoke all on function public.api_time_period_bounds_scoped(uuid, text, text, date, bigint) from public;
grant all on function public.api_time_period_bounds_scoped(uuid, text, text, date, bigint) to authenticated;
grant all on function public.api_time_period_bounds_scoped(uuid, text, text, date, bigint) to service_role;

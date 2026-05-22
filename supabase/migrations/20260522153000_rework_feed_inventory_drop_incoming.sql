create unique index if not exists feed_supplier_identity_idx
on public.feed_supplier (
  lower(trim(company_name)),
  lower(trim(location_country)),
  lower(coalesce(trim(location_city), ''))
);

create unique index if not exists feed_type_identity_idx
on public.feed_type (
  coalesce(farm_id, '00000000-0000-0000-0000-000000000000'::uuid),
  feed_supplier,
  lower(coalesce(trim(feed_line), '')),
  feed_category,
  feed_pellet_size,
  coalesce(crude_protein_percentage, '-1'::double precision),
  coalesce(crude_fat_percentage, '-1'::double precision)
);

alter table public.feed_inventory
  alter column feed_type_id set not null;

alter table public.feed_inventory
  drop constraint if exists feed_inventory_feed_type_id_fkey;

alter table public.feed_inventory
  add constraint feed_inventory_feed_type_id_fkey
  foreign key (feed_type_id)
  references public.feed_type(id)
  on update cascade
  on delete restrict;

comment on table public.feed_inventory is
  'Manual feed inventory stock-count snapshots. These are the feed stock source of truth, normally counted at start of day and end of day.';

comment on column public.feed_inventory.inventory_time is
  'Stock-count time. Operationally this is usually near 08:00 for start-of-day and near 16:00 for end-of-day.';

comment on column public.feed_inventory.amount_of_bags is
  'Closed/full bags counted in the feed store.';

comment on column public.feed_inventory.opened_bags is
  'Remaining feed in opened bags, recorded in grams in the historical AquaSmart data.';

create or replace function public.feed_inventory_snapshot_kg(
  p_bag_weight integer,
  p_amount_of_bags integer,
  p_opened_bags integer
)
returns numeric
language sql
immutable
set search_path to 'pg_catalog', 'public'
as $$
  select greatest(
    coalesce(p_bag_weight, 0)::numeric * coalesce(p_amount_of_bags, 0)::numeric
      + coalesce(p_opened_bags, 0)::numeric / 1000.0,
    0::numeric
  );
$$;

create or replace function public.api_feed_type_options_rpc(p_farm_id uuid)
returns table(
  id bigint,
  farm_id uuid,
  feed_line text,
  label text,
  feed_category text,
  feed_pellet_size text,
  crude_protein_percentage numeric,
  crude_fat_percentage numeric,
  visibility_scope text
)
language sql
stable
security definer
set search_path to 'pg_catalog', 'public', 'pg_temp'
as $$
  select
    ft.id,
    ft.farm_id,
    ft.feed_line,
    trim(both from concat_ws('  ', fs.company_name::text, ft.feed_line, ft.feed_category,
      ft.feed_pellet_size,
      case when ft.crude_protein_percentage is not null then 'CP ' || ft.crude_protein_percentage::text || '%' else null end,
      case when ft.crude_fat_percentage is not null then 'F ' || ft.crude_fat_percentage::text || '%' else null end
    )) as label,
    ft.feed_category::text,
    ft.feed_pellet_size::text,
    ft.crude_protein_percentage::numeric,
    ft.crude_fat_percentage::numeric,
    case
      when ft.farm_id = p_farm_id then 'farm'
      when exists (
        select 1
        from public.feed_inventory fi
        where fi.farm_id = p_farm_id
          and fi.feed_type_id = ft.id
      ) or exists (
        select 1
        from public.feeding_record fr
        join public.system s on s.id = fr.system_id
        where s.farm_id = p_farm_id
          and fr.feed_type_id = ft.id
      ) then 'farm_used'
      else 'shared_catalog'
    end as visibility_scope
  from public.feed_type ft
  left join public.feed_supplier fs on fs.id = ft.feed_supplier
  where private.is_farm_member(p_farm_id)
    and coalesce(ft.is_active, true)
    and (
      ft.farm_id is null
      or ft.farm_id = p_farm_id
      or exists (
        select 1
        from public.feed_inventory fi
        where fi.farm_id = p_farm_id
          and fi.feed_type_id = ft.id
      )
      or exists (
        select 1
        from public.feeding_record fr
        join public.system s on s.id = fr.system_id
        where s.farm_id = p_farm_id
          and fr.feed_type_id = ft.id
      )
    )
  order by
    case when ft.farm_id = p_farm_id then 0 else 1 end,
    ft.feed_line,
    ft.feed_pellet_size::text;
$$;

create or replace function public.get_running_stock(p_farm_id uuid)
returns table(
  feed_type_id bigint,
  feed_type_name text,
  pellet_size text,
  current_stock_kg numeric,
  avg_daily_usage_kg numeric,
  days_remaining numeric,
  stock_status text,
  last_delivery_date date
)
language sql
stable
set search_path to 'pg_catalog', 'public'
as $$
with latest_inventory_date as (
  select max(fi.inventory_date) as inventory_date
  from public.feed_inventory fi
  where fi.farm_id = p_farm_id
    and fi.inventory_date <= current_date
),
latest_snapshot as (
  select distinct on (fi.feed_type_id)
    fi.feed_type_id,
    public.feed_inventory_snapshot_kg(fi.bag_weight, fi.amount_of_bags, fi.opened_bags) as stock_kg,
    fi.inventory_date as last_inventory_date
  from public.feed_inventory fi
  join latest_inventory_date lid on lid.inventory_date = fi.inventory_date
  where fi.farm_id = p_farm_id
  order by fi.feed_type_id, fi.inventory_date desc, fi.inventory_time desc nulls last, fi.id desc
),
usage_7d as (
  select fr.feed_type_id, greatest(sum(fr.feeding_amount)::numeric / 7.0, 0.001) as avg_d
  from public.feeding_record fr
  join public.system s on s.id = fr.system_id
  where s.farm_id = p_farm_id
    and fr.feed_type_id is not null
    and fr.date >= current_date - 7
  group by fr.feed_type_id
),
used_types as (
  select distinct fr.feed_type_id
  from public.feeding_record fr
  join public.system s on s.id = fr.system_id
  where s.farm_id = p_farm_id
    and fr.feed_type_id is not null
),
base as (
  select
    ft.id as feed_type_id,
    concat_ws(' ', coalesce(ft.feed_line, ''), ft.feed_category::text,
      ft.feed_pellet_size::text, concat('CP', ft.crude_protein_percentage::text))::text as feed_type_name,
    ft.feed_pellet_size::text as pellet_size,
    coalesce(ls.stock_kg, 0) as stock_kg,
    u7.avg_d,
    ls.last_inventory_date
  from public.feed_type ft
  left join latest_snapshot ls on ls.feed_type_id = ft.id
  left join usage_7d u7 on u7.feed_type_id = ft.id
  left join used_types ut on ut.feed_type_id = ft.id
  where coalesce(ft.is_active, true)
    and (ls.feed_type_id is not null or ut.feed_type_id is not null)
)
select
  b.feed_type_id,
  b.feed_type_name,
  b.pellet_size,
  round(b.stock_kg, 2),
  round(coalesce(b.avg_d, 0), 2),
  case when coalesce(b.avg_d, 0) > 0 then round(b.stock_kg / b.avg_d, 1) else null end as days_remaining,
  case
    when coalesce(b.avg_d, 0) = 0 then 'no_data'
    when b.stock_kg / b.avg_d < 7 then 'critical'
    when b.stock_kg / b.avg_d < 14 then 'low'
    when b.stock_kg / b.avg_d < 30 then 'reorder'
    else 'ok'
  end as stock_status,
  b.last_inventory_date as last_delivery_date
from base b
order by b.stock_kg asc;
$$;

create or replace function public.api_feed_demand_forecast(p_farm_id uuid, p_days_ahead integer default 14)
returns table(
  feed_type_id bigint,
  feed_line text,
  feed_category text,
  feed_pellet_size text,
  avg_daily_kg double precision,
  forecast_7d_kg double precision,
  forecast_total_kg double precision,
  current_stock_kg numeric,
  days_of_stock double precision,
  stock_status text
)
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public', 'pg_temp'
as $$
declare
  v_ref_start date := current_date - 14;
  v_ref_end date := current_date - 1;
begin
  if not private.is_farm_member(p_farm_id) then
    return;
  end if;

  perform private.assert_rpc_parameters(
    p_farm_id := p_farm_id,
    p_system_id := null,
    p_batch_id := null,
    p_start_date := null,
    p_end_date := null
  );

  return query
  with farm_feed_types as (
    select distinct fi.feed_type_id
    from public.feed_inventory fi
    where fi.farm_id = p_farm_id

    union

    select distinct fr.feed_type_id
    from public.feeding_record fr
    join public.system s on s.id = fr.system_id
    where s.farm_id = p_farm_id
      and fr.feed_type_id is not null
  ),
  recent_feeding as (
    select
      fr.feed_type_id,
      sum(fr.feeding_amount)::double precision / greatest(count(distinct fr.date), 1) as avg_daily_kg
    from public.feeding_record fr
    join public.system s on s.id = fr.system_id
    where s.farm_id = p_farm_id
      and fr.feed_type_id is not null
      and fr.date between v_ref_start and v_ref_end
    group by fr.feed_type_id
  ),
  latest_inventory_date as (
    select max(fi.inventory_date) as inventory_date
    from public.feed_inventory fi
    where fi.farm_id = p_farm_id
      and fi.inventory_date <= current_date
  ),
  latest_snapshot as (
    select distinct on (fi.feed_type_id)
      fi.feed_type_id,
      public.feed_inventory_snapshot_kg(fi.bag_weight, fi.amount_of_bags, fi.opened_bags) as stock_kg
    from public.feed_inventory fi
    join latest_inventory_date lid on lid.inventory_date = fi.inventory_date
    where fi.farm_id = p_farm_id
    order by fi.feed_type_id, fi.inventory_date desc, fi.inventory_time desc nulls last, fi.id desc
  )
  select
    ft.id as feed_type_id,
    ft.feed_line,
    ft.feed_category::text,
    ft.feed_pellet_size::text,
    coalesce(rf.avg_daily_kg, 0)::double precision as avg_daily_kg,
    (coalesce(rf.avg_daily_kg, 0) * least(7, p_days_ahead))::double precision as forecast_7d_kg,
    (coalesce(rf.avg_daily_kg, 0) * p_days_ahead)::double precision as forecast_total_kg,
    coalesce(ls.stock_kg, 0) as current_stock_kg,
    case
      when rf.avg_daily_kg > 0 then coalesce(ls.stock_kg, 0)::double precision / rf.avg_daily_kg
      else null
    end as days_of_stock,
    case
      when rf.avg_daily_kg is null or rf.avg_daily_kg = 0 then 'unknown'
      when coalesce(ls.stock_kg, 0) = 0 then 'critical'
      when coalesce(ls.stock_kg, 0)::double precision / rf.avg_daily_kg <= 7 then 'critical'
      when coalesce(ls.stock_kg, 0)::double precision / rf.avg_daily_kg <= 14 then 'low'
      else 'ok'
    end as stock_status
  from farm_feed_types fft
  join public.feed_type ft on ft.id = fft.feed_type_id
  left join recent_feeding rf on rf.feed_type_id = ft.id
  left join latest_snapshot ls on ls.feed_type_id = ft.id
  where coalesce(ft.is_active, true)
    and (coalesce(rf.avg_daily_kg, 0) > 0
     or coalesce(ls.stock_kg, 0) > 0
    )
  order by coalesce(rf.avg_daily_kg, 0) desc, ft.id;
end;
$$;

create or replace function public.api_time_period_bounds_scoped(
  p_farm_id uuid,
  p_time_period text,
  p_scope text default 'dashboard'::text,
  p_anchor_date date default null::date
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
      when 'dashboard'      then 'dashboard'
      when 'inventory'      then 'inventory'
      when 'production'     then 'production'
      when 'water_quality'  then 'water_quality'
      when 'water-quality'  then 'water_quality'
      when 'feeding'        then 'feeding'
      when 'feed'           then 'feeding'
      when 'feed_inventory' then 'feed_inventory'
      when 'feed-inventory' then 'feed_inventory'
      else 'dashboard'
    end as anchor_scope
    from perm where perm.ok
  ),
  tp as (
    select dtp.time_period::text as time_period,
           greatest(dtp.days_since_start, 1) as requested_days
    from public.dashboard_time_period dtp
    join perm on perm.ok
    where dtp.time_period::text = p_time_period
    limit 1
  ),
  scoped_dates as (
    select
      rs.anchor_scope,
      case rs.anchor_scope
        when 'water_quality' then (
          select max(dwr.rating_date)
          from public.daily_water_quality_rating dwr
          join public.system s on s.id = dwr.system_id
          where s.farm_id = p_farm_id
            and (p_anchor_date is null or dwr.rating_date <= p_anchor_date)
        )
        when 'feeding' then (
          select max(fr.date)
          from public.feeding_record fr
          join public.system s on s.id = fr.system_id
          where s.farm_id = p_farm_id
            and (p_anchor_date is null or fr.date <= p_anchor_date)
        )
        when 'feed_inventory' then (
          select max(fi.inventory_date)
          from public.feed_inventory fi
          where fi.farm_id = p_farm_id
            and (p_anchor_date is null or fi.inventory_date <= p_anchor_date)
        )
        else (
          select max(d.inventory_date)
          from analytics.daily_system_facts d
          join public.system s on s.id = d.system_id
          where s.farm_id = p_farm_id
            and (p_anchor_date is null or d.inventory_date <= p_anchor_date)
        )
      end as latest_available_date,
      case rs.anchor_scope
        when 'water_quality' then (
          select min(dwr.rating_date)
          from public.daily_water_quality_rating dwr
          join public.system s on s.id = dwr.system_id
          where s.farm_id = p_farm_id
        )
        when 'feeding' then (
          select min(fr.date)
          from public.feeding_record fr
          join public.system s on s.id = fr.system_id
          where s.farm_id = p_farm_id
        )
        when 'feed_inventory' then (
          select min(fi.inventory_date)
          from public.feed_inventory fi
          where fi.farm_id = p_farm_id
        )
        else (
          select min(d.inventory_date)
          from analytics.daily_system_facts d
          join public.system s on s.id = d.system_id
          where s.farm_id = p_farm_id
        )
      end as available_from_date
    from resolved_scope rs
  ),
  bounded as (
    select
      tp.time_period, sd.anchor_scope,
      sd.latest_available_date as input_end_date,
      sd.available_from_date, tp.requested_days,
      case
        when sd.latest_available_date is null or sd.available_from_date is null then null::date
        else greatest(sd.available_from_date, sd.latest_available_date - (tp.requested_days - 1))
      end as input_start_date
    from tp cross join scoped_dates sd
  )
  select
    b.time_period, b.input_start_date, b.input_end_date, b.anchor_scope,
    b.input_end_date as latest_available_date,
    b.available_from_date, b.requested_days,
    case when b.input_end_date is null or b.available_from_date is null then null::integer
         else (b.input_end_date - b.available_from_date + 1)::integer end as available_days,
    case when b.input_end_date is null or b.input_start_date is null then null::integer
         else (b.input_end_date - b.input_start_date + 1)::integer end as resolved_days,
    case when b.input_end_date is null then null::integer
         else greatest((current_date - b.input_end_date)::integer, 0) end as staleness_days,
    case when b.input_end_date is null or b.available_from_date is null or b.input_start_date is null then false
         else b.input_start_date > (b.input_end_date - (b.requested_days - 1)) end as is_truncated
  from bounded b;
$$;

do $$
begin
  if to_regclass('public.feed_incoming') is not null then
    drop trigger if exists trg_assign_feed_incoming_farm_if_missing on public.feed_incoming;
  end if;
end $$;

drop function if exists public.assign_feed_incoming_farm_if_missing();
drop table if exists public.feed_incoming;

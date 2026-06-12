DROP FUNCTION IF EXISTS "public"."api_time_period_bounds_scoped"(
  "p_farm_id" "uuid",
  "p_time_period" "text",
  "p_scope" "text",
  "p_anchor_date" "date",
  "p_system_id" bigint
);

CREATE OR REPLACE FUNCTION "public"."api_time_period_bounds_scoped"(
  "p_farm_id" "uuid",
  "p_time_period" "text",
  "p_scope" "text" DEFAULT 'dashboard'::"text",
  "p_anchor_date" "date" DEFAULT NULL::"date",
  "p_system_id" bigint DEFAULT NULL::bigint,
  "p_batch_id" bigint DEFAULT NULL::bigint
) RETURNS TABLE(
  "time_period" "text",
  "input_start_date" "date",
  "input_end_date" "date",
  "anchor_scope" "text",
  "latest_available_date" "date",
  "available_from_date" "date",
  "requested_days" integer,
  "available_days" integer,
  "resolved_days" integer,
  "staleness_days" integer,
  "is_truncated" boolean
)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
  with perm as (
    select private.app_rpc_scope_ok(p_farm_id, null, null, null, null) as ok
  ),
  selected_batch as (
    select fb.id, fb.date_of_delivery
    from public.fingerling_batch fb
    join perm on perm.ok
    where p_batch_id is not null
      and fb.id = p_batch_id
      and fb.farm_id = p_farm_id
      and private.is_farm_member(fb.farm_id)
    limit 1
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
  batch_systems as (
    select bsi.system_id
    from selected_batch sb
    cross join public.api_batch_system_ids(sb.id) bsi
  ),
  active_systems as (
    select s.id
    from public.system s
    where s.farm_id = p_farm_id
      and coalesce(s.is_active, true) = true
      and (p_system_id is null or s.id = p_system_id)
      and (p_batch_id is null or exists (select 1 from batch_systems bs where bs.system_id = s.id))
  ),
  scoped_dates as (
    select
      rs.anchor_scope,
      case rs.anchor_scope
        when 'water_quality' then (
          select max(latest_date)
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
          select max(latest_date)
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
            and p_batch_id is null
        )
        else (
          select max(latest_date)
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
            and p_batch_id is null
        )
        else (
          select min(d.inventory_date)
          from active_systems s
          join analytics.daily_system_facts d on d.system_id = s.id
          where d.inventory_date <= current_date
        )
      end as first_data_date
    from resolved_scope rs
  ),
  scoped_available as (
    select
      sd.anchor_scope,
      sd.latest_available_date,
      case
        when sd.first_data_date is null then null::date
        when sb.date_of_delivery is null then sd.first_data_date
        else greatest(sd.first_data_date, sb.date_of_delivery)
      end as available_from_date
    from scoped_dates sd
    left join selected_batch sb on true
  ),
  bounded as (
    select
      tp.time_period,
      sa.anchor_scope,
      sa.latest_available_date as input_end_date,
      sa.available_from_date,
      tp.requested_days,
      case
        when sa.latest_available_date is null or sa.available_from_date is null then null::date
        when tp.time_period = 'all history' then sa.available_from_date
        else greatest(sa.available_from_date, sa.latest_available_date - (tp.requested_days - 1))
      end as input_start_date
    from tp cross join scoped_available sa
  )
  select
    b.time_period,
    b.input_start_date,
    b.input_end_date,
    case
      when p_system_id is not null and p_batch_id is not null then b.anchor_scope || ':system:batch'
      when p_system_id is not null then b.anchor_scope || ':system'
      when p_batch_id is not null then b.anchor_scope || ':batch'
      else b.anchor_scope
    end as anchor_scope,
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

ALTER FUNCTION "public"."api_time_period_bounds_scoped"(
  "p_farm_id" "uuid",
  "p_time_period" "text",
  "p_scope" "text",
  "p_anchor_date" "date",
  "p_system_id" bigint,
  "p_batch_id" bigint
) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."api_time_period_bounds_scoped"(
  "p_farm_id" "uuid",
  "p_time_period" "text",
  "p_scope" "text",
  "p_anchor_date" "date",
  "p_system_id" bigint,
  "p_batch_id" bigint
) IS 'Intentional app-facing SECURITY DEFINER RPC. Anchors shared time windows to the latest scoped farm data, with optional system and batch scoping; downstream snapshot RPCs carry system state forward to the shared filter end date.';

REVOKE ALL ON FUNCTION "public"."api_time_period_bounds_scoped"(
  "p_farm_id" "uuid",
  "p_time_period" "text",
  "p_scope" "text",
  "p_anchor_date" "date",
  "p_system_id" bigint,
  "p_batch_id" bigint
) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_time_period_bounds_scoped"(
  "p_farm_id" "uuid",
  "p_time_period" "text",
  "p_scope" "text",
  "p_anchor_date" "date",
  "p_system_id" bigint,
  "p_batch_id" bigint
) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_time_period_bounds_scoped"(
  "p_farm_id" "uuid",
  "p_time_period" "text",
  "p_scope" "text",
  "p_anchor_date" "date",
  "p_system_id" bigint,
  "p_batch_id" bigint
) TO "service_role";

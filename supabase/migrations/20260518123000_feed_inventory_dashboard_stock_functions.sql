CREATE OR REPLACE FUNCTION "public"."get_running_stock"("p_farm_id" "uuid") RETURNS TABLE("feed_type_id" bigint, "feed_type_name" "text", "pellet_size" "text", "current_stock_kg" numeric, "avg_daily_usage_kg" numeric, "days_remaining" numeric, "stock_status" "text", "last_delivery_date" "date")
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
WITH latest_inventory AS (
  SELECT DISTINCT ON (fi.feed_type_id)
    fi.feed_type_id,
    fi.feed_type_label,
    ((COALESCE(fi.amount_of_bags, 0) + COALESCE(fi.opened_bags, 0)) * COALESCE(fi.bag_weight, 0))::numeric AS stock_kg,
    fi.inventory_date AS last_delivery_date
  FROM public.feed_inventory fi
  WHERE fi.farm_id = p_farm_id
    AND fi.feed_type_id IS NOT NULL
  ORDER BY fi.feed_type_id, fi.inventory_date DESC, fi.inventory_time DESC NULLS LAST, fi.created_at DESC
),
usage_7d AS (
  SELECT fr.feed_type_id, GREATEST(SUM(fr.feeding_amount)::numeric / 7.0, 0.001) AS avg_d
  FROM public.feeding_record fr JOIN public.system s ON s.id = fr.system_id
  WHERE s.farm_id = p_farm_id AND fr.date >= CURRENT_DATE - 7 GROUP BY fr.feed_type_id
),
base AS (
  SELECT ft.id AS feed_type_id,
    COALESCE(NULLIF(li.feed_type_label, ''), CONCAT_WS(' ', COALESCE(ft.feed_line,''), ft.feed_category::text,
      ft.feed_pellet_size::text, CONCAT('CP', ft.crude_protein_percentage::text)))::text AS feed_type_name,
    ft.feed_pellet_size::text AS pellet_size,
    COALESCE(li.stock_kg, 0) AS stock_kg,
    u7.avg_d,
    li.last_delivery_date
  FROM public.feed_type ft
  LEFT JOIN latest_inventory li ON li.feed_type_id = ft.id
  LEFT JOIN usage_7d u7 ON u7.feed_type_id = ft.id
  WHERE li.feed_type_id IS NOT NULL OR u7.feed_type_id IS NOT NULL
)
SELECT b.feed_type_id, b.feed_type_name, b.pellet_size,
  ROUND(b.stock_kg, 2), ROUND(COALESCE(b.avg_d, 0), 2),
  CASE WHEN COALESCE(b.avg_d, 0) > 0 THEN ROUND(b.stock_kg / b.avg_d, 1) ELSE NULL END AS days_remaining,
  CASE WHEN COALESCE(b.avg_d, 0) = 0 THEN 'no_data'
    WHEN b.stock_kg <= 0 THEN 'critical'
    ELSE 'ok' END AS stock_status,
  b.last_delivery_date
FROM base b ORDER BY b.stock_kg ASC;
$$;

CREATE OR REPLACE FUNCTION "public"."api_feed_demand_forecast"("p_farm_id" "uuid", "p_days_ahead" integer DEFAULT 14) RETURNS TABLE("feed_type_id" bigint, "feed_line" "text", "feed_category" "text", "feed_pellet_size" "text", "avg_daily_kg" double precision, "forecast_7d_kg" double precision, "forecast_total_kg" double precision, "current_stock_kg" numeric, "days_of_stock" double precision, "stock_status" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
DECLARE
  v_ref_start date := CURRENT_DATE - 14;
  v_ref_end date := CURRENT_DATE - 1;
BEGIN
  IF NOT private.is_farm_member(p_farm_id) THEN
    RETURN;
  END IF;

  PERFORM private.assert_rpc_parameters(
    p_farm_id := p_farm_id,
    p_system_id := NULL,
    p_batch_id := NULL,
    p_start_date := NULL,
    p_end_date := NULL
  );

  RETURN QUERY
  WITH farm_feed_types AS (
    SELECT DISTINCT fi.feed_type_id
    FROM public.feed_inventory fi
    WHERE fi.farm_id = p_farm_id
      AND fi.feed_type_id IS NOT NULL

    UNION

    SELECT DISTINCT fr.feed_type_id
    FROM public.feeding_record fr
    JOIN public.system s ON s.id = fr.system_id
    WHERE s.farm_id = p_farm_id
  ),
  recent_feeding AS (
    SELECT
      fr.feed_type_id,
      SUM(fr.feeding_amount)::double precision / GREATEST(COUNT(DISTINCT fr.date), 1) AS avg_daily_kg
    FROM public.feeding_record fr
    JOIN public.system s ON s.id = fr.system_id
    WHERE s.farm_id = p_farm_id
      AND fr.date BETWEEN v_ref_start AND v_ref_end
    GROUP BY fr.feed_type_id
  ),
  latest_inventory AS (
    SELECT DISTINCT ON (fi.feed_type_id)
      fi.feed_type_id,
      ((COALESCE(fi.amount_of_bags, 0) + COALESCE(fi.opened_bags, 0)) * COALESCE(fi.bag_weight, 0))::numeric AS stock_kg
    FROM public.feed_inventory fi
    WHERE fi.farm_id = p_farm_id
      AND fi.feed_type_id IS NOT NULL
      AND fi.inventory_date <= CURRENT_DATE
    ORDER BY fi.feed_type_id, fi.inventory_date DESC, fi.inventory_time DESC NULLS LAST, fi.created_at DESC
  )
  SELECT
    ft.id AS feed_type_id,
    ft.feed_line,
    ft.feed_category::text,
    ft.feed_pellet_size::text,
    COALESCE(rf.avg_daily_kg, 0)::double precision AS avg_daily_kg,
    (COALESCE(rf.avg_daily_kg, 0) * LEAST(7, p_days_ahead))::double precision AS forecast_7d_kg,
    (COALESCE(rf.avg_daily_kg, 0) * p_days_ahead)::double precision AS forecast_total_kg,
    COALESCE(li.stock_kg, 0) AS current_stock_kg,
    CASE
      WHEN rf.avg_daily_kg > 0 THEN COALESCE(li.stock_kg, 0)::double precision / rf.avg_daily_kg
      ELSE NULL
    END AS days_of_stock,
    CASE
      WHEN rf.avg_daily_kg IS NULL OR rf.avg_daily_kg = 0 THEN 'unknown'
      WHEN COALESCE(li.stock_kg, 0) = 0 THEN 'critical'
      ELSE 'ok'
    END AS stock_status
  FROM farm_feed_types fft
  JOIN public.feed_type ft ON ft.id = fft.feed_type_id
  LEFT JOIN recent_feeding rf ON rf.feed_type_id = ft.id
  LEFT JOIN latest_inventory li ON li.feed_type_id = ft.id
  WHERE COALESCE(rf.avg_daily_kg, 0) > 0
     OR COALESCE(li.stock_kg, 0) > 0
  ORDER BY COALESCE(rf.avg_daily_kg, 0) DESC, ft.id;
END;
$$;

-- Old and new feed of the same type are recorded as separate inventory rows (the old feed is
-- used first). Running stock must add every row of the latest snapshot, not pick one row.
CREATE OR REPLACE FUNCTION public.get_running_stock(p_farm_id uuid)
 RETURNS TABLE(feed_type_id bigint, feed_type_name text, pellet_size text, current_stock_kg numeric, avg_daily_usage_kg numeric, days_remaining numeric, stock_status text, last_delivery_date date)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
WITH auth_check AS (
  SELECT private.is_farm_member(p_farm_id) AS ok
),
latest_inventory_date AS (
  SELECT max(fi.inventory_date) AS inventory_date
  FROM public.feed_inventory fi
  WHERE fi.farm_id = p_farm_id
    AND fi.inventory_date <= current_date
),
latest_snapshot AS (
  SELECT
    fi.feed_type_id,
    sum(public.feed_inventory_snapshot_kg(fi.bag_weight, fi.amount_of_bags, fi.opened_bags)) AS stock_kg,
    max(fi.inventory_date) AS last_inventory_date
  FROM public.feed_inventory fi
  JOIN latest_inventory_date lid ON lid.inventory_date = fi.inventory_date
  WHERE fi.farm_id = p_farm_id
    AND coalesce(fi.inventory_time, time '00:00') = (
      SELECT max(coalesce(f2.inventory_time, time '00:00'))
      FROM public.feed_inventory f2
      WHERE f2.farm_id = fi.farm_id
        AND f2.feed_type_id = fi.feed_type_id
        AND f2.inventory_date = fi.inventory_date
    )
  GROUP BY fi.feed_type_id
),
usage_7d AS (
  SELECT fr.feed_type_id, GREATEST(SUM(fr.feeding_amount)::numeric / 7.0, 0.001) AS avg_d
  FROM public.feeding_record fr
  JOIN public.system s ON s.id = fr.system_id
  WHERE s.farm_id = p_farm_id
    AND fr.feed_type_id IS NOT NULL
    AND fr.date >= current_date - 7
  GROUP BY fr.feed_type_id
),
used_types AS (
  SELECT DISTINCT fr.feed_type_id
  FROM public.feeding_record fr
  JOIN public.system s ON s.id = fr.system_id
  WHERE s.farm_id = p_farm_id AND fr.feed_type_id IS NOT NULL
),
base AS (
  SELECT
    ft.id AS feed_type_id,
    CONCAT_WS(' ', COALESCE(ft.feed_line, ''), ft.feed_category::text,
      ft.feed_pellet_size::text, CONCAT('CP', ft.crude_protein_percentage::text))::text AS feed_type_name,
    ft.feed_pellet_size::text AS pellet_size,
    COALESCE(ls.stock_kg, 0) AS stock_kg,
    u7.avg_d,
    ls.last_inventory_date
  FROM public.feed_type ft
  LEFT JOIN latest_snapshot ls ON ls.feed_type_id = ft.id
  LEFT JOIN usage_7d u7 ON u7.feed_type_id = ft.id
  LEFT JOIN used_types ut ON ut.feed_type_id = ft.id
  WHERE COALESCE(ft.is_active, true)
    AND (ls.feed_type_id IS NOT NULL OR ut.feed_type_id IS NOT NULL)
)
SELECT
  b.feed_type_id,
  b.feed_type_name,
  b.pellet_size,
  ROUND(b.stock_kg, 2),
  ROUND(COALESCE(b.avg_d, 0), 2),
  CASE WHEN COALESCE(b.avg_d, 0) > 0 THEN ROUND(b.stock_kg / b.avg_d, 1) ELSE NULL END AS days_remaining,
  CASE
    WHEN COALESCE(b.avg_d, 0) = 0 THEN 'no_data'
    WHEN b.stock_kg / b.avg_d < 7  THEN 'critical'
    WHEN b.stock_kg / b.avg_d < 14 THEN 'low'
    WHEN b.stock_kg / b.avg_d < 30 THEN 'reorder'
    ELSE 'ok'
  END AS stock_status,
  b.last_inventory_date AS last_delivery_date
FROM base b
CROSS JOIN auth_check ac
WHERE ac.ok = true
ORDER BY b.stock_kg ASC;
$function$;

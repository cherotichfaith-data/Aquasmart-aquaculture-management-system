CREATE OR REPLACE FUNCTION "public"."api_feed_demand_forecast"(
  "p_farm_id" "uuid",
  "p_days_ahead" integer DEFAULT 14
) RETURNS TABLE(
  "feed_type_id" bigint,
  "feed_line" "text",
  "feed_category" "text",
  "feed_pellet_size" "text",
  "avg_daily_kg" double precision,
  "forecast_7d_kg" double precision,
  "forecast_total_kg" double precision,
  "current_stock_kg" numeric,
  "days_of_stock" double precision,
  "stock_status" "text"
)
LANGUAGE "plpgsql" STABLE SECURITY DEFINER
SET "search_path" TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_ref_start date := CURRENT_DATE - 14;
  v_ref_end date := CURRENT_DATE - 1;
BEGIN
  IF NOT public.is_farm_member(p_farm_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH farm_feed_types AS (
    SELECT DISTINCT fi.feed_type_id
    FROM public.feed_incoming fi
    WHERE fi.farm_id = p_farm_id

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
  current_stock AS (
    SELECT
      fi.feed_type_id,
      SUM(fi.feed_amount)::numeric AS stock_kg
    FROM public.feed_incoming fi
    WHERE fi.farm_id = p_farm_id
      AND fi.date <= CURRENT_DATE
    GROUP BY fi.feed_type_id
  ),
  feed_consumed AS (
    SELECT
      fr.feed_type_id,
      SUM(fr.feeding_amount)::numeric AS consumed_kg
    FROM public.feeding_record fr
    JOIN public.system s ON s.id = fr.system_id
    WHERE s.farm_id = p_farm_id
    GROUP BY fr.feed_type_id
  ),
  net_stock AS (
    SELECT
      cs.feed_type_id,
      GREATEST(cs.stock_kg - COALESCE(fc.consumed_kg, 0), 0) AS remaining_kg
    FROM current_stock cs
    LEFT JOIN feed_consumed fc ON fc.feed_type_id = cs.feed_type_id
  )
  SELECT
    ft.id AS feed_type_id,
    ft.feed_line,
    ft.feed_category::text,
    ft.feed_pellet_size::text,
    COALESCE(rf.avg_daily_kg, 0)::double precision AS avg_daily_kg,
    (COALESCE(rf.avg_daily_kg, 0) * LEAST(7, p_days_ahead))::double precision AS forecast_7d_kg,
    (COALESCE(rf.avg_daily_kg, 0) * p_days_ahead)::double precision AS forecast_total_kg,
    COALESCE(ns.remaining_kg, 0) AS current_stock_kg,
    CASE
      WHEN rf.avg_daily_kg > 0 THEN COALESCE(ns.remaining_kg, 0)::double precision / rf.avg_daily_kg
      ELSE NULL
    END AS days_of_stock,
    CASE
      WHEN rf.avg_daily_kg IS NULL OR rf.avg_daily_kg = 0 THEN 'unknown'
      WHEN COALESCE(ns.remaining_kg, 0) = 0 THEN 'critical'
      WHEN COALESCE(ns.remaining_kg, 0)::double precision / rf.avg_daily_kg <= 7 THEN 'critical'
      WHEN COALESCE(ns.remaining_kg, 0)::double precision / rf.avg_daily_kg <= 14 THEN 'low'
      ELSE 'ok'
    END AS stock_status
  FROM farm_feed_types fft
  JOIN public.feed_type ft ON ft.id = fft.feed_type_id
  LEFT JOIN recent_feeding rf ON rf.feed_type_id = ft.id
  LEFT JOIN net_stock ns ON ns.feed_type_id = ft.id
  WHERE COALESCE(rf.avg_daily_kg, 0) > 0
     OR COALESCE(ns.remaining_kg, 0) > 0
  ORDER BY COALESCE(rf.avg_daily_kg, 0) DESC, ft.id;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."api_feed_rate_analysis"(
  "p_farm_id" "uuid",
  "p_system_id" bigint DEFAULT NULL::bigint,
  "p_date_from" "date" DEFAULT NULL::"date",
  "p_date_to" "date" DEFAULT NULL::"date"
) RETURNS TABLE(
  "system_id" bigint,
  "system_name" "text",
  "feed_date" "date",
  "feed_kg" double precision,
  "biomass_kg" double precision,
  "abw_g" double precision,
  "live_fish" integer,
  "feed_rate_pct" double precision,
  "lower_band_pct" double precision,
  "upper_band_pct" double precision,
  "pellet_size" "text",
  "status" "text",
  "detail" "text"
)
LANGUAGE "plpgsql" STABLE SECURITY DEFINER
SET "search_path" TO 'pg_catalog', 'public'
AS $$
BEGIN
  IF NOT public.is_farm_member(p_farm_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH pellet_guide (min_abw_g, max_abw_g, pellet, lower_pct, upper_pct) AS (
    VALUES
      (0.0::double precision, 1.0::double precision, 'Crumble / powder'::text, 15.0::double precision, 20.0::double precision),
      (1.0::double precision, 10.0::double precision, '1.0-1.5 mm'::text, 8.0::double precision, 15.0::double precision),
      (10.0::double precision, 50.0::double precision, '2.0 mm'::text, 5.0::double precision, 8.0::double precision),
      (50.0::double precision, 200.0::double precision, '3.0 mm'::text, 3.0::double precision, 5.0::double precision),
      (200.0::double precision, NULL::double precision, '4-6 mm'::text, 2.0::double precision, 3.0::double precision)
  ),
  daily_feed AS (
    SELECT
      fr.system_id,
      fr.date AS feed_date,
      SUM(fr.feeding_amount)::double precision AS feed_kg
    FROM public.feeding_record fr
    JOIN public.system s ON s.id = fr.system_id
    WHERE s.farm_id = p_farm_id
      AND (p_system_id IS NULL OR fr.system_id = p_system_id)
      AND (p_date_from IS NULL OR fr.date >= p_date_from)
      AND (p_date_to IS NULL OR fr.date <= p_date_to)
    GROUP BY fr.system_id, fr.date
  ),
  inv AS (
    SELECT
      dfit.system_id,
      dfit.inventory_date,
      NULLIF(dfit.biomass_last_sampling, 0)::double precision AS biomass_kg,
      NULLIF(dfit.abw_last_sampling, 0)::double precision AS abw_g,
      dfit.number_of_fish::integer AS live_fish
    FROM public.daily_fish_inventory_table dfit
    JOIN public.system s ON s.id = dfit.system_id
    WHERE s.farm_id = p_farm_id
      AND (p_system_id IS NULL OR dfit.system_id = p_system_id)
      AND (p_date_from IS NULL OR dfit.inventory_date >= p_date_from)
      AND (p_date_to IS NULL OR dfit.inventory_date <= p_date_to)
  )
  SELECT
    s.id AS system_id,
    s.name AS system_name,
    df.feed_date,
    df.feed_kg,
    inv.biomass_kg,
    inv.abw_g,
    inv.live_fish,
    CASE
      WHEN inv.biomass_kg > 0 THEN ((df.feed_kg / inv.biomass_kg) * 100.0)::double precision
      ELSE NULL
    END AS feed_rate_pct,
    pg.lower_pct::double precision AS lower_band_pct,
    pg.upper_pct::double precision AS upper_band_pct,
    pg.pellet AS pellet_size,
    CASE
      WHEN inv.biomass_kg IS NULL OR inv.abw_g IS NULL THEN 'missing'
      WHEN pg.lower_pct IS NULL THEN 'no_target'
      WHEN (df.feed_kg / inv.biomass_kg) * 100.0 > pg.upper_pct THEN 'above'
      WHEN (df.feed_kg / inv.biomass_kg) * 100.0 < pg.lower_pct THEN 'below'
      ELSE 'in_target'
    END AS status,
    CASE
      WHEN inv.biomass_kg IS NULL OR inv.abw_g IS NULL THEN 'No inventory data for this date'
      WHEN pg.lower_pct IS NULL THEN 'ABW outside pellet guide range'
      WHEN (df.feed_kg / inv.biomass_kg) * 100.0 > pg.upper_pct
        THEN concat(
          round(((df.feed_kg / inv.biomass_kg) * 100.0)::numeric, 1),
          ' % BW/day (target max ',
          round(pg.upper_pct::numeric, 1),
          ' %)'
        )
      WHEN (df.feed_kg / inv.biomass_kg) * 100.0 < pg.lower_pct
        THEN concat(
          round(((df.feed_kg / inv.biomass_kg) * 100.0)::numeric, 1),
          ' % BW/day (target min ',
          round(pg.lower_pct::numeric, 1),
          ' %)'
        )
      ELSE concat(
        round(((df.feed_kg / inv.biomass_kg) * 100.0)::numeric, 1),
        ' % BW/day - within band ',
        round(pg.lower_pct::numeric, 1),
        '-',
        round(pg.upper_pct::numeric, 1),
        ' %'
      )
    END AS detail
  FROM daily_feed df
  JOIN public.system s ON s.id = df.system_id
  LEFT JOIN inv ON inv.system_id = df.system_id AND inv.inventory_date = df.feed_date
  LEFT JOIN pellet_guide pg ON inv.abw_g >= pg.min_abw_g AND (pg.max_abw_g IS NULL OR inv.abw_g < pg.max_abw_g)
  ORDER BY df.system_id, df.feed_date;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."api_harvest_forecast"(
  "p_farm_id" "uuid",
  "p_system_id" bigint DEFAULT NULL::bigint
) RETURNS TABLE(
  "system_id" bigint,
  "system_name" "text",
  "current_abw_g" double precision,
  "last_sample_date" "date",
  "sample_age_days" integer,
  "adg_g_day" double precision,
  "target_weight_g" double precision,
  "days_to_target" integer,
  "projected_harvest_date" "date",
  "status" "text",
  "confidence" "text"
)
LANGUAGE "plpgsql" STABLE SECURITY DEFINER
SET "search_path" TO 'pg_catalog', 'public'
AS $$
BEGIN
  IF NOT public.is_farm_member(p_farm_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH ranked_samples AS (
    SELECT
      fsw.system_id,
      fsw.date AS sample_date,
      fsw.abw::double precision AS abw_g,
      LAG(fsw.date) OVER w AS prev_date,
      LAG(fsw.abw::double precision) OVER w AS prev_abw_g,
      ROW_NUMBER() OVER w AS rn
    FROM public.fish_sampling_weight fsw
    JOIN public.system s ON s.id = fsw.system_id
    WHERE s.farm_id = p_farm_id
      AND s.is_active
      AND (p_system_id IS NULL OR fsw.system_id = p_system_id)
    WINDOW w AS (PARTITION BY fsw.system_id ORDER BY fsw.date DESC)
  ),
  intervals AS (
    SELECT
      rs.system_id,
      rs.sample_date,
      rs.abw_g,
      rs.prev_date,
      rs.prev_abw_g,
      rs.rn,
      CASE
        WHEN rs.prev_date IS NOT NULL AND (rs.sample_date - rs.prev_date) > 0
          THEN (rs.abw_g - rs.prev_abw_g) / (rs.sample_date - rs.prev_date)::double precision
        ELSE NULL
      END AS interval_adg
    FROM ranked_samples rs
    WHERE rs.rn <= 4
  ),
  adg_weighted AS (
    SELECT
      i.system_id,
      FIRST_VALUE(i.abw_g) OVER (PARTITION BY i.system_id ORDER BY i.rn) AS latest_abw_g,
      FIRST_VALUE(i.sample_date) OVER (PARTITION BY i.system_id ORDER BY i.rn) AS last_sample_date,
      SUM(
        CASE
          WHEN i.rn = 2 THEN i.interval_adg * 3
          WHEN i.rn = 3 THEN i.interval_adg * 2
          WHEN i.rn = 4 THEN i.interval_adg
          ELSE NULL
        END
      ) OVER (PARTITION BY i.system_id)
      /
      NULLIF(SUM(
        CASE
          WHEN i.rn = 2 AND i.interval_adg IS NOT NULL THEN 3
          WHEN i.rn = 3 AND i.interval_adg IS NOT NULL THEN 2
          WHEN i.rn = 4 AND i.interval_adg IS NOT NULL THEN 1
          ELSE 0
        END
      ) OVER (PARTITION BY i.system_id), 0) AS weighted_adg,
      COUNT(i.interval_adg) FILTER (WHERE i.rn > 1 AND i.interval_adg IS NOT NULL)
        OVER (PARTITION BY i.system_id) AS interval_count
    FROM intervals i
  ),
  latest AS (
    SELECT DISTINCT ON (aw.system_id)
      aw.system_id,
      aw.latest_abw_g,
      aw.last_sample_date,
      aw.weighted_adg,
      aw.interval_count
    FROM adg_weighted aw
    ORDER BY aw.system_id
  ),
  targets AS (
    SELECT
      pc.system_id,
      COALESCE(pc.target_weight_g, 400)::double precision AS target_weight_g
    FROM public.production_cycle pc
    WHERE pc.ongoing_cycle = TRUE
  )
  SELECT
    s.id AS system_id,
    s.name AS system_name,
    la.latest_abw_g AS current_abw_g,
    la.last_sample_date,
    (CURRENT_DATE - la.last_sample_date)::integer AS sample_age_days,
    la.weighted_adg AS adg_g_day,
    COALESCE(t.target_weight_g, 400::double precision) AS target_weight_g,
    CASE
      WHEN la.weighted_adg > 0 AND la.latest_abw_g < COALESCE(t.target_weight_g, 400)
        THEN CEIL((COALESCE(t.target_weight_g, 400) - la.latest_abw_g) / la.weighted_adg)::integer
      WHEN la.latest_abw_g >= COALESCE(t.target_weight_g, 400)
        THEN 0
      ELSE NULL
    END AS days_to_target,
    CASE
      WHEN la.weighted_adg > 0 AND la.latest_abw_g < COALESCE(t.target_weight_g, 400)
        THEN CURRENT_DATE + CEIL((COALESCE(t.target_weight_g, 400) - la.latest_abw_g) / la.weighted_adg)::integer
      WHEN la.latest_abw_g >= COALESCE(t.target_weight_g, 400)
        THEN CURRENT_DATE
      ELSE NULL
    END AS projected_harvest_date,
    CASE
      WHEN la.latest_abw_g IS NULL THEN 'no_data'
      WHEN la.latest_abw_g >= COALESCE(t.target_weight_g, 400) THEN 'ready'
      WHEN la.weighted_adg IS NULL OR la.weighted_adg <= 0 THEN 'no_data'
      WHEN la.weighted_adg < 1.5 THEN 'slow_growth'
      ELSE 'on_track'
    END AS status,
    CASE
      WHEN la.interval_count >= 2 AND (CURRENT_DATE - la.last_sample_date) <= 30 THEN 'high'
      ELSE 'low'
    END AS confidence
  FROM public.system s
  LEFT JOIN latest la ON la.system_id = s.id
  LEFT JOIN targets t ON t.system_id = s.id
  WHERE s.farm_id = p_farm_id
    AND s.is_active
    AND (p_system_id IS NULL OR s.id = p_system_id)
  ORDER BY
    CASE WHEN la.latest_abw_g >= COALESCE(t.target_weight_g, 400) THEN 0 ELSE 1 END,
    CASE
      WHEN la.weighted_adg > 0 AND la.latest_abw_g < COALESCE(t.target_weight_g, 400)
        THEN CEIL((COALESCE(t.target_weight_g, 400) - la.latest_abw_g) / la.weighted_adg)::integer
      WHEN la.latest_abw_g >= COALESCE(t.target_weight_g, 400)
        THEN 0
      ELSE NULL
    END ASC NULLS LAST;
END;
$$;

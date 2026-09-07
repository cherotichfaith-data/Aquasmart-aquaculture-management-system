-- api_growth_standard_curve: the single source for every "expected growth" line.
--
-- Given a scenario, a starting ABW and a horizon in days, returns the expected
-- ABW / SGR / feeding-rate for each day, computed in closed form from the
-- scenario's Richards parameters (public.growth_model_scenario):
--
--   ABW(t) = A / (1 + (A^nu - 1) * exp(-k*t))^(1/nu)          [W0 = 1 g]
--
-- The starting ABW is mapped onto the curve's biological-day axis by inverting
-- the same equation, so callers can anchor the curve at a batch's real ABW:
--
--   t0 = -ln( ((A/W)^nu - 1) / (A^nu - 1) ) / k
--
-- Feeding rate comes from feeding_rate_config for the same scenario / ABW band.
-- This is reference data (no farm scoping) so it is a plain STABLE function
-- granted to authenticated.

CREATE OR REPLACE FUNCTION "public"."api_growth_standard_curve"(
    "p_scenario" text DEFAULT 'main',
    "p_start_abw_g" numeric DEFAULT 1,
    "p_days" integer DEFAULT 365
)
RETURNS TABLE(
    "day" integer,
    "expected_abw_g" numeric,
    "expected_sgr_pct_day" numeric,
    "expected_feeding_rate_pct" numeric
)
LANGUAGE "plpgsql" STABLE
SET "search_path" TO 'pg_catalog', 'public'
AS $$
DECLARE
    v_a numeric;
    v_k numeric;
    v_nu numeric;
    v_scenario text := lower(coalesce(p_scenario, 'main'));
    v_start_abw numeric := greatest(coalesce(p_start_abw_g, 1), 0.01);
    v_days integer := least(greatest(coalesce(p_days, 365), 1), 1200);
    v_t0 numeric;
    v_anu numeric;
BEGIN
    SELECT s.richards_a, s.richards_k, s.richards_nu
      INTO v_a, v_k, v_nu
      FROM public.growth_model_scenario s
     WHERE s.scenario = v_scenario;

    IF v_a IS NULL THEN
        RETURN;
    END IF;

    -- clamp the starting weight below the asymptote so the inversion is defined
    v_start_abw := least(v_start_abw, v_a * 0.999);
    v_anu := power(v_a, v_nu) - 1;

    v_t0 := (-1.0 / v_k) * ln( (power(v_a / v_start_abw, v_nu) - 1) / v_anu );
    IF v_t0 < 0 THEN
        v_t0 := 0;
    END IF;

    RETURN QUERY
    WITH series AS (
        SELECT gs AS day,
               round(
                   (v_a / power(1 + v_anu * exp(-v_k * (v_t0 + gs)), 1.0 / v_nu))::numeric,
                   3
               ) AS abw_g
        FROM generate_series(0, v_days) AS gs
    ),
    with_sgr AS (
        SELECT s.day,
               s.abw_g,
               CASE
                   WHEN lag(s.abw_g) OVER (ORDER BY s.day) IS NULL OR lag(s.abw_g) OVER (ORDER BY s.day) <= 0
                       THEN NULL
                   ELSE round((ln(s.abw_g / lag(s.abw_g) OVER (ORDER BY s.day)) * 100)::numeric, 4)
               END AS sgr_pct_day
        FROM series s
    )
    SELECT w.day,
           w.abw_g,
           w.sgr_pct_day,
           frc.feed_rate_mid_pct
    FROM with_sgr w
    LEFT JOIN LATERAL (
        SELECT round(((fc.feed_rate_min_pct + fc.feed_rate_max_pct) / 2.0)::numeric, 4) AS feed_rate_mid_pct
        FROM public.feeding_rate_config fc
        WHERE fc.scenario = v_scenario
          AND w.abw_g >= fc.abw_min_g
          AND (fc.abw_max_g IS NULL OR w.abw_g <= fc.abw_max_g)
          AND (fc.valid_to IS NULL OR fc.valid_to >= CURRENT_DATE)
        ORDER BY fc.abw_min_g DESC, fc.phase_id DESC
        LIMIT 1
    ) frc ON true
    ORDER BY w.day;
END;
$$;

ALTER FUNCTION "public"."api_growth_standard_curve"(text, numeric, integer) OWNER TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."api_growth_standard_curve"(text, numeric, integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."api_growth_standard_curve"(text, numeric, integer) TO "service_role";

COMMENT ON FUNCTION "public"."api_growth_standard_curve"(text, numeric, integer) IS
    'Expected ABW / SGR / feeding-rate per day for a growth scenario, anchored at p_start_abw_g. Closed-form Richards curve from public.growth_model_scenario. Reference data -- no farm scoping.';

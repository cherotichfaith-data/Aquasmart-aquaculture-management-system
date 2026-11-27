-- Farm-fitted growth bands + harvest forecast.
--
-- farm_growth_band holds a per-farm planning model fitted from that farm's own records:
-- growth (SGR), feed conversion and recorded mortality per weight band, in three scenarios
-- (main = median of observed sampling intervals, slow / potential = lower / upper quartile).
--
-- api_harvest_forecast projects every occupied cage forward day by day from its latest weight
-- sample until it reaches the target harvest weight, like the forecast columns of the TB
-- workbook's Growth Model sheet, but with the harvest date derived instead of typed in.

CREATE TABLE IF NOT EXISTS "public"."farm_growth_band" (
    "farm_id" uuid NOT NULL REFERENCES "public"."farm"("id") ON DELETE CASCADE,
    "scenario" text NOT NULL,
    "abw_min_g" numeric(10,3) NOT NULL,
    "abw_max_g" numeric(10,3),
    "sgr_pct_per_day" numeric(10,4) NOT NULL,
    "efcr" numeric(10,4),
    "mortality_pct_per_30d" numeric(10,4),
    "fitted_on" date,
    "source_note" text DEFAULT ''::text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "farm_growth_band_pkey" PRIMARY KEY ("farm_id", "scenario", "abw_min_g"),
    CONSTRAINT "farm_growth_band_scenario_check"
        CHECK (("scenario" = ANY (ARRAY['main'::text, 'potential'::text, 'slow'::text]))),
    CONSTRAINT "farm_growth_band_bounds_check"
        CHECK ((("abw_max_g" IS NULL) OR ("abw_max_g" > "abw_min_g"))),
    CONSTRAINT "farm_growth_band_positive_check"
        CHECK ((("sgr_pct_per_day" > (0)::numeric)
            AND (("efcr" IS NULL) OR ("efcr" > (0)::numeric))
            AND (("mortality_pct_per_30d" IS NULL) OR ("mortality_pct_per_30d" >= (0)::numeric))))
);

ALTER TABLE "public"."farm_growth_band" OWNER TO "postgres";
ALTER TABLE "public"."farm_growth_band" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "farm_growth_band_select_member" ON "public"."farm_growth_band";
CREATE POLICY "farm_growth_band_select_member" ON "public"."farm_growth_band"
FOR SELECT TO "authenticated" USING ("private"."is_farm_member"("farm_id"));

CREATE OR REPLACE TRIGGER "trg_farm_growth_band_updated_at"
BEFORE UPDATE ON "public"."farm_growth_band"
FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();

GRANT SELECT ON TABLE "public"."farm_growth_band" TO "authenticated";
GRANT ALL ON TABLE "public"."farm_growth_band" TO "service_role";

-- Tanganyika Blue, fitted 2026-11-11 from 248 clean sampling intervals (Jan 2024 - Oct 2026).
-- SGR: median (main) and quartiles (slow / potential) of 100*ln(w2/w1)/days per start-weight band.
--   potential 140-210 g capped at the 70-140 g value; slow >= 450 g held at the 320-450 g value
--   (its observed lower quartile is negative).
-- eFCR: pooled feed / biomass gain over intervals with a plausible ratio (0.5-3.5); >= 450 g has
--   no usable feed data and carries the 320-450 g value.
-- Mortality: recorded deaths / fish-days per band. Excludes losses booked as reconciliations.
INSERT INTO "public"."farm_growth_band"
    ("farm_id", "scenario", "abw_min_g", "abw_max_g", "sgr_pct_per_day", "efcr", "mortality_pct_per_30d", "fitted_on", "source_note")
SELECT f.id, v.scenario, v.abw_min_g, v.abw_max_g, v.sgr, v.efcr, v.mort, DATE '2026-11-11',
       'Fitted from farm sampling, feeding and mortality records'
FROM "public"."farm" f
CROSS JOIN (VALUES
    ('main',        0::numeric,   1::numeric, 4.94, 1.50, 1.75),
    ('main',        1,            5,          3.31, 1.33, 1.20),
    ('main',        5,           10,          2.52, 1.40, 0.12),
    ('main',       10,           70,          1.77, 1.29, 0.65),
    ('main',       70,          140,          1.30, 1.56, 0.61),
    ('main',      140,          210,          0.92, 1.22, 1.14),
    ('main',      210,          320,          0.69, 2.14, 0.36),
    ('main',      320,          450,          0.46, 2.20, 0.34),
    ('main',      450,         NULL,          0.42, 2.20, 0.03),
    ('slow',        0,            1,          3.74, 1.50, 1.75),
    ('slow',        1,            5,          2.62, 1.33, 1.20),
    ('slow',        5,           10,          2.35, 1.40, 0.12),
    ('slow',       10,           70,          1.22, 1.29, 0.65),
    ('slow',       70,          140,          1.02, 1.56, 0.61),
    ('slow',      140,          210,          0.71, 1.22, 1.14),
    ('slow',      210,          320,          0.33, 2.14, 0.36),
    ('slow',      320,          450,          0.19, 2.20, 0.34),
    ('slow',      450,         NULL,          0.19, 2.20, 0.03),
    ('potential',   0,            1,          5.62, 1.50, 1.75),
    ('potential',   1,            5,          4.72, 1.33, 1.20),
    ('potential',   5,           10,          3.16, 1.40, 0.12),
    ('potential',  10,           70,          2.34, 1.29, 0.65),
    ('potential',  70,          140,          1.53, 1.56, 0.61),
    ('potential', 140,          210,          1.53, 1.22, 1.14),
    ('potential', 210,          320,          0.74, 2.14, 0.36),
    ('potential', 320,          450,          0.51, 2.20, 0.34),
    ('potential', 450,         NULL,          0.49, 2.20, 0.03)
) AS v(scenario, abw_min_g, abw_max_g, sgr, efcr, mort)
WHERE f.name = 'Tanganyika Blue'
ON CONFLICT ("farm_id", "scenario", "abw_min_g") DO NOTHING;

-- One row per occupied cage.
--   * Start point: the cage's latest weight sample and its fish count on p_as_of.
--   * Daily step: weight grows by the band's SGR; from p_as_of onward the count shrinks by the
--     band's mortality and feed accrues as gain x eFCR.
--   * Target: the cycle's target_weight_g when p_use_cycle_target and one is set, else
--     p_default_target_g.
--   * harvest_date uses the main scenario; earliest / latest use potential / slow.
--   * Farms without their own bands fall back to public.growth_phase (growth only).
CREATE OR REPLACE FUNCTION "public"."api_harvest_forecast"(
    "p_farm_id" uuid,
    "p_as_of" date DEFAULT NULL::date,
    "p_default_target_g" numeric DEFAULT 450,
    "p_use_cycle_target" boolean DEFAULT true,
    "p_horizon_days" integer DEFAULT 730
)
RETURNS TABLE(
    "system_id" bigint,
    "system_name" text,
    "batch_id" bigint,
    "batch_name" text,
    "as_of_date" date,
    "fish_count" double precision,
    "last_sample_date" date,
    "last_sample_abw_g" double precision,
    "projected_abw_g" double precision,
    "target_weight_g" double precision,
    "harvest_date" date,
    "harvest_date_earliest" date,
    "harvest_date_latest" date,
    "days_to_harvest" integer,
    "fish_at_harvest" double precision,
    "harvest_kg" double precision,
    "feed_to_harvest_kg" double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'analytics', 'private'
AS $$
with recursive
scope as (
  select private.app_rpc_scope_ok(p_farm_id, null::bigint[], null::bigint, null::date, null::date) as ok
),
latest as (
  -- Each cage's most recent inventory row. Cages do not all have a row on the same last day,
  -- so this is per cage, looking back at most 14 days.
  select distinct on (f.system_id) f.*
  from analytics.daily_system_facts f
  join public.system s on s.id = f.system_id
  where s.farm_id = p_farm_id
    and f.inventory_date <= coalesce(p_as_of, current_date)
    and f.inventory_date >= coalesce(p_as_of, current_date) - 14
  order by f.system_id, f.inventory_date desc
),
has_own as (
  select exists (select 1 from public.farm_growth_band b where b.farm_id = p_farm_id) as yes
),
bands_raw as (
  select b.scenario, b.abw_min_g::float8 as lo, b.abw_max_g::float8 as hi, b.sgr_pct_per_day::float8 as sgr,
         b.efcr::float8 as efcr, coalesce(b.mortality_pct_per_30d, 0)::float8 as mort
  from public.farm_growth_band b
  where b.farm_id = p_farm_id
  union all
  select g.scenario, g.abw_min_g::float8, g.abw_max_g::float8, g.sgr_pct_per_day::float8, null::float8, 0::float8
  from public.growth_phase g
  where not (select yes from has_own)
),
bands as (
  -- The lowest band also covers anything below its lower bound.
  select r.*, (r.lo = min(r.lo) over (partition by r.scenario)) as is_lowest from bands_raw r
),
cages as (
  select f.system_id, s.name as system_name, f.batch_id,
         coalesce(nullif(fb.name, ''), 'Batch #' || f.batch_id::text) as batch_name,
         coalesce(p_as_of, current_date) as as_of_date, f.number_of_fish::float8 as fish_count,
         f.last_abw_date as sample_date, f.abw_last_sampling::float8 as sample_abw,
         case when p_use_cycle_target and pc.target_weight_g is not null
              then pc.target_weight_g::float8 else p_default_target_g::float8 end as target_g
  from latest f
  join public.system s on s.id = f.system_id
  left join public.fingerling_batch fb on fb.id = f.batch_id
  left join public.production_cycle pc on pc.cycle_id = f.production_cycle_id
  where s.farm_id = p_farm_id and (select ok from scope)
    and coalesce(s.cage_status, 'occupied'::public.cage_status_enum) <> 'retired'::public.cage_status_enum
    and f.number_of_fish > 0 and f.abw_last_sampling > 0 and f.last_abw_date is not null
),
sim as (
  select c.system_id, sc.scenario, c.sample_date as d, c.sample_abw as w, c.fish_count as n, 0::float8 as feed,
         c.as_of_date, c.target_g
  from cages c
  cross join (select distinct scenario from bands) sc
  union all
  select s.system_id, s.scenario, s.d + 1, s.w * exp(b.sgr / 100.0),
         case when s.d >= s.as_of_date then s.n * (1 - b.mort / 3000.0) else s.n end,
         case when s.d >= s.as_of_date
              then s.feed + s.n * s.w * (exp(b.sgr / 100.0) - 1) / 1000.0 * b.efcr else s.feed end,
         s.as_of_date, s.target_g
  from sim s
  join bands b on b.scenario = s.scenario
    and (s.w >= b.lo or b.is_lowest) and (b.hi is null or s.w < b.hi)
  where s.w < s.target_g and s.d < s.as_of_date + greatest(coalesce(p_horizon_days, 730), 1)
),
hit as (
  -- First day at or above target; never earlier than the as-of date.
  select distinct on (s.system_id, s.scenario) s.system_id, s.scenario,
         greatest(s.d, s.as_of_date) as harvest_date, s.n, s.w, s.feed
  from sim s
  where s.w >= s.target_g
  order by s.system_id, s.scenario, s.d
),
today as (
  select s.system_id, s.w from sim s where s.scenario = 'main' and s.d = s.as_of_date
)
select c.system_id, c.system_name, c.batch_id, c.batch_name, c.as_of_date, c.fish_count,
       c.sample_date, c.sample_abw,
       coalesce(t.w, c.sample_abw) as projected_abw_g,
       c.target_g,
       hm.harvest_date, hp.harvest_date, hs.harvest_date,
       (hm.harvest_date - c.as_of_date)::integer,
       round(hm.n::numeric, 0)::float8,
       round((hm.n * hm.w / 1000.0)::numeric, 0)::float8,
       round(hm.feed::numeric, 0)::float8
from cages c
left join today t on t.system_id = c.system_id
left join hit hm on hm.system_id = c.system_id and hm.scenario = 'main'
left join hit hp on hp.system_id = c.system_id and hp.scenario = 'potential'
left join hit hs on hs.system_id = c.system_id and hs.scenario = 'slow'
order by hm.harvest_date nulls last, c.system_name;
$$;

ALTER FUNCTION "public"."api_harvest_forecast"(uuid, date, numeric, boolean, integer) OWNER TO "postgres";

REVOKE ALL ON FUNCTION "public"."api_harvest_forecast"(uuid, date, numeric, boolean, integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."api_harvest_forecast"(uuid, date, numeric, boolean, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."api_harvest_forecast"(uuid, date, numeric, boolean, integer) TO "service_role";

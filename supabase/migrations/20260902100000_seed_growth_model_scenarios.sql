-- Master growth model: Richards curve scenarios + legacy "TB month" cycle benchmark.
--
-- Source of truth is the farm's calibrated spreadsheet
-- (tanganyika_tilapia_growth_master_2026-06-11.xlsx): a capped Richards growth
-- curve fitted to real farm sampling data, in three scenarios --
--   main      -- typical realised growth (already seeded into growth_phase)
--   potential -- faster selected cohorts; the feeding-rate target
--   slow      -- conservative / risk scenario
--
-- growth_phase already holds the `main` SGR bands. This migration adds:
--   1. growth_model_scenario     -- Richards params (A, k, nu) per scenario
--   2. growth_cycle_benchmark    -- the spreadsheet `old_TB_table`: expected
--                                   ABW / SGR / cumulative mortality / eFCR per
--                                   14-day cycle period (the ACMS "TB month" line)
--   3. growth_phase              -- `potential` + `slow` SGR bands
--   4. feeding_rate_config       -- `potential` + `slow` feed-rate bands
--
-- All four are farm-agnostic reference data: any authenticated user may read
-- them; writes are reserved for migrations / service_role.

-- 1. Richards scenario parameters -------------------------------------------------

CREATE TABLE IF NOT EXISTS "public"."growth_model_scenario" (
    "scenario" text NOT NULL,
    "label" text NOT NULL,
    "richards_a" numeric(12,6) NOT NULL,
    "richards_k" numeric(14,12) NOT NULL,
    "richards_nu" numeric(14,12) NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "source_note" text DEFAULT ''::text NOT NULL,
    "calibrated_at" date,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "growth_model_scenario_pkey" PRIMARY KEY ("scenario"),
    CONSTRAINT "growth_model_scenario_scenario_check"
        CHECK (("scenario" = ANY (ARRAY['main'::text, 'potential'::text, 'slow'::text]))),
    CONSTRAINT "growth_model_scenario_positive_params"
        CHECK (("richards_a" > (0)::numeric AND "richards_k" > (0)::numeric AND "richards_nu" > (0)::numeric))
);

ALTER TABLE "public"."growth_model_scenario" OWNER TO "postgres";
ALTER TABLE "public"."growth_model_scenario" ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE "public"."growth_model_scenario" TO "authenticated";
GRANT ALL ON TABLE "public"."growth_model_scenario" TO "service_role";

CREATE POLICY "growth_model_scenario_select_authenticated" ON "public"."growth_model_scenario"
FOR SELECT TO "authenticated" USING (true);

CREATE OR REPLACE TRIGGER "trg_growth_model_scenario_updated_at"
BEFORE UPDATE ON "public"."growth_model_scenario"
FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();

INSERT INTO "public"."growth_model_scenario"
    ("scenario", "label", "richards_a", "richards_k", "richards_nu", "is_default", "source_note", "calibrated_at")
VALUES
    ('main', 'Main (typical realised growth)',
        988.697607, 0.007057037027, 0.033282766648, true,
        'Capped Richards fit, binned weights, cohort offsets; full TAFIRI grow-out dataset. tanganyika_tilapia_growth_master 2026-06-11.',
        '2026-06-11'),
    ('potential', 'Potential (feeding-rate target)',
        1025.902188, 0.007319637478, 0.001881443605, false,
        'Selected faster-growing cohorts (C4, C5, C3A/C4/C6 batches). Used as the feeding-rate target. tanganyika_tilapia_growth_master 2026-06-11.',
        '2026-06-11'),
    ('slow', 'Slow (conservative / risk)',
        931.842953, 0.006435527329, 0.082854271443, false,
        'Selected slower-growing cohorts. Conservative planning scenario. tanganyika_tilapia_growth_master 2026-06-11.',
        '2026-06-11')
ON CONFLICT ("scenario") DO NOTHING;

-- 2. Legacy "TB month" cycle benchmark (spreadsheet old_TB_table) ---------------

CREATE TABLE IF NOT EXISTS "public"."growth_cycle_benchmark" (
    "scenario" text NOT NULL,
    "period_no" integer NOT NULL,
    "cycle_month" integer NOT NULL,
    "start_day" integer NOT NULL,
    "end_day" integer NOT NULL,
    "start_abw_g" numeric(10,3) NOT NULL,
    "end_abw_g" numeric(10,3) NOT NULL,
    "expected_sgr_pct_day" numeric(10,4) NOT NULL,
    "expected_cum_mortality_pct" numeric(6,3) NOT NULL,
    "expected_feed_per_fish_g" numeric(12,4) NOT NULL,
    "expected_efcr" numeric(6,3),
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "growth_cycle_benchmark_pkey" PRIMARY KEY ("scenario", "period_no"),
    CONSTRAINT "growth_cycle_benchmark_scenario_fkey"
        FOREIGN KEY ("scenario") REFERENCES "public"."growth_model_scenario"("scenario") ON DELETE CASCADE
);

ALTER TABLE "public"."growth_cycle_benchmark" OWNER TO "postgres";
ALTER TABLE "public"."growth_cycle_benchmark" ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE "public"."growth_cycle_benchmark" TO "authenticated";
GRANT ALL ON TABLE "public"."growth_cycle_benchmark" TO "service_role";

CREATE POLICY "growth_cycle_benchmark_select_authenticated" ON "public"."growth_cycle_benchmark"
FOR SELECT TO "authenticated" USING (true);

-- old_TB_table: 14-day periods, ~15 000 fish start cohort. Cumulative mortality
-- and feed are converted to per-fish / percentage terms so they apply to any
-- cohort size. expected_efcr is the spreadsheet "Expected eFCR" column.
INSERT INTO "public"."growth_cycle_benchmark"
    ("scenario", "period_no", "cycle_month", "start_day", "end_day",
     "start_abw_g", "end_abw_g", "expected_sgr_pct_day",
     "expected_cum_mortality_pct", "expected_feed_per_fish_g", "expected_efcr")
VALUES
    ('main',  1, 1,   1,  13,   1.019,   2.148, 5.7329,  0.000, 1.8552, 1.644),
    ('main',  2, 1,  14,  27,   2.285,   5.124, 5.7670,  0.812, 4.4316, 1.512),
    ('main',  3, 2,  28,  41,   5.451,  11.195, 5.1403,  1.680, 8.8049, 1.474),
    ('main',  4, 2,  42,  55,  11.740,  19.969, 3.7942,  2.540, 12.5198, 1.456),
    ('main',  5, 3,  56,  69,  20.683,  30.891, 2.8653,  3.392, 15.7038, 1.474),
    ('main',  6, 3,  70,  83,  31.744,  43.686, 2.2808,  4.237, 18.8803, 1.521),
    ('main',  7, 4,  84,  97,  44.669,  58.302, 1.9026,  5.075, 22.1378, 1.569),
    ('main',  8, 4,  98, 111,  59.418,  74.840, 1.6483,  5.905, 25.6334, 1.614),
    ('main',  9, 5, 112, 125,  76.100,  93.487, 1.4698,  6.728, 29.5538, 1.658),
    ('main', 10, 5, 126, 139,  94.905, 114.445, 1.3373,  7.544, 33.7726, 1.692),
    ('main', 11, 6, 140, 153, 116.035, 137.867, 1.2314,  8.353, 37.7606, 1.700),
    ('main', 12, 6, 154, 167, 139.635, 163.778, 1.1391,  9.154, 41.7371, 1.705),
    ('main', 13, 7, 168, 181, 165.721, 192.010, 1.0517,  9.949, 45.4155, 1.710),
    ('main', 14, 7, 182, 195, 194.106, 222.123, 0.9631, 10.736, 48.4857, 1.721),
    ('main', 15, 7, 196, 209, 224.328, 253.333, 0.8685, 11.517, 50.5902, 1.745),
    ('main', 16, 8, 210, 223, 255.575, 284.581, 0.7679, 12.291, 51.0317, 1.774),
    ('main', 17, 8, 224, 237, 286.802, 315.536, 0.6820, 13.058, 51.0251, 1.810),
    ('main', 18, 9, 238, 251, 317.736, 346.208, 0.6130, 13.818, 51.0251, 1.846),
    ('main', 19, 9, 252, 259, 348.388, 363.610, 0.5345, 14.572, 29.1572, NULL)
ON CONFLICT ("scenario", "period_no") DO NOTHING;

-- 3. growth_phase: potential + slow SGR bands ----------------------------------
-- (main is already seeded.) Values are the spreadsheet SGR %/day per weight band.
--
-- growth_phase and feeding_rate_config each carry an AFTER-STATEMENT trigger
-- that REFRESHes analytics.feeding_model_output. That matview reads other
-- matviews that are unpopulated on a fresh local replay, so the refresh would
-- error. The feeding model is also hard-scoped to the `main` scenario, so
-- adding `potential` / `slow` rows cannot change its output -- suppress the
-- trigger for these seed inserts and skip the pointless refresh.
ALTER TABLE "public"."growth_phase" DISABLE TRIGGER "trg_growth_phase_refresh_feeding_model";
ALTER TABLE "public"."feeding_rate_config" DISABLE TRIGGER "trg_feeding_rate_config_refresh_feeding_model";

-- `main` is already seeded on deployed environments; these rows make a fresh
-- environment (local replay) self-contained. ON CONFLICT keeps prod untouched.
INSERT INTO "public"."growth_phase" ("scenario", "phase_id", "abw_min_g", "abw_max_g", "sgr_pct_per_day")
VALUES
    ('main', 1,   1.000,   5.000, 3.8000),
    ('main', 2,   5.000,  10.000, 3.1000),
    ('main', 3,  10.000,  70.000, 2.3500),
    ('main', 4,  70.000, 140.000, 1.5500),
    ('main', 5, 140.000, 210.000, 1.2000),
    ('main', 6, 210.000, 320.000, 0.9200),
    ('main', 7, 320.000, 450.000, 0.6600),
    ('main', 8, 450.000,    NULL, 0.4800),
    ('potential', 1,   1.000,   5.000, 4.3498),
    ('potential', 2,   5.000,  10.000, 3.6481),
    ('potential', 3,  10.000,  70.000, 2.5945),
    ('potential', 4,  70.000, 140.000, 1.6906),
    ('potential', 5, 140.000, 210.000, 1.3080),
    ('potential', 6, 210.000, 320.000, 1.0029),
    ('potential', 7, 320.000, 450.000, 0.7254),
    ('potential', 8, 450.000,    NULL, 0.5281),
    ('slow', 1,   1.000,   5.000, 3.0367),
    ('slow', 2,   5.000,  10.000, 2.5672),
    ('slow', 3,  10.000,  70.000, 1.9266),
    ('slow', 4,  70.000, 140.000, 1.3078),
    ('slow', 5, 140.000, 210.000, 1.0137),
    ('slow', 6, 210.000, 320.000, 0.7800),
    ('slow', 7, 320.000, 450.000, 0.5499),
    ('slow', 8, 450.000,    NULL, 0.3935)
ON CONFLICT ("scenario", "phase_id") DO NOTHING;

-- 4. feeding_rate_config: main (fresh-env self-containment) + potential + slow -
-- Feed rate as % body weight is a management target by weight class and is not
-- scenario-specific in the current model, so potential/slow reuse the main bands.

INSERT INTO "public"."feeding_rate_config"
    ("version", "scenario", "phase_id", "abw_min_g", "abw_max_g",
     "feed_rate_min_pct", "feed_rate_max_pct", "is_default", "valid_from", "valid_to")
VALUES
    ('v1.0', 'main', 1,   1.000,   5.000, 5.0000, 6.0000, true, '2000-01-01', NULL),
    ('v1.0', 'main', 2,   5.000,  10.000, 4.0000, 5.0000, true, '2000-01-01', NULL),
    ('v1.0', 'main', 3,  10.000,  70.000, 2.5000, 3.0000, true, '2000-01-01', NULL),
    ('v1.0', 'main', 4,  70.000, 140.000, 1.8000, 2.2000, true, '2000-01-01', NULL),
    ('v1.0', 'main', 5, 140.000, 210.000, 1.4000, 1.8000, true, '2000-01-01', NULL),
    ('v1.0', 'main', 6, 210.000, 320.000, 1.2000, 1.5000, true, '2000-01-01', NULL),
    ('v1.0', 'main', 7, 320.000, 450.000, 1.0000, 1.2000, true, '2000-01-01', NULL),
    ('v1.0', 'main', 8, 450.000,    NULL, 0.8000, 1.0000, true, '2000-01-01', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO "public"."feeding_rate_config"
    ("version", "scenario", "phase_id", "abw_min_g", "abw_max_g",
     "feed_rate_min_pct", "feed_rate_max_pct", "is_default", "valid_from", "valid_to")
SELECT frc."version", s.scenario, frc."phase_id", frc."abw_min_g", frc."abw_max_g",
       frc."feed_rate_min_pct", frc."feed_rate_max_pct", frc."is_default", frc."valid_from", frc."valid_to"
FROM "public"."feeding_rate_config" frc
CROSS JOIN (VALUES ('potential'), ('slow')) AS s(scenario)
WHERE frc."scenario" = 'main'
  AND NOT EXISTS (
        SELECT 1 FROM "public"."feeding_rate_config" x
        WHERE x."scenario" = s.scenario AND x."phase_id" = frc."phase_id"
  );

ALTER TABLE "public"."growth_phase" ENABLE TRIGGER "trg_growth_phase_refresh_feeding_model";
ALTER TABLE "public"."feeding_rate_config" ENABLE TRIGGER "trg_feeding_rate_config_refresh_feeding_model";

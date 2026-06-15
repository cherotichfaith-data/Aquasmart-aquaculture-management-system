-- Complete local_id conflict targets for routes that also use
-- `.upsert(..., { onConflict: "local_id" })`.

CREATE UNIQUE INDEX IF NOT EXISTS "fish_sampling_weight_local_id_key"
ON "public"."fish_sampling_weight" ("local_id");

CREATE UNIQUE INDEX IF NOT EXISTS "water_quality_measurement_local_id_key"
ON "public"."water_quality_measurement" ("local_id");

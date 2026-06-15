-- Make data-entry offline retry upserts valid for PostgREST.
--
-- The Next.js write routes use `.upsert(..., { onConflict: "local_id" })`.
-- PostgREST requires a plain unique/exclusion target matching `local_id`;
-- composite partial indexes such as `(system_id, local_id) WHERE local_id IS NOT NULL`
-- do not satisfy `ON CONFLICT (local_id)`.

CREATE UNIQUE INDEX IF NOT EXISTS "feeding_record_local_id_key"
ON "public"."feeding_record" ("local_id");

CREATE UNIQUE INDEX IF NOT EXISTS "fish_harvest_local_id_key"
ON "public"."fish_harvest" ("local_id");

CREATE UNIQUE INDEX IF NOT EXISTS "fish_mortality_local_id_key"
ON "public"."fish_mortality" ("local_id");

CREATE UNIQUE INDEX IF NOT EXISTS "fish_stocking_local_id_key"
ON "public"."fish_stocking" ("local_id");

CREATE UNIQUE INDEX IF NOT EXISTS "fish_transfer_local_id_key"
ON "public"."fish_transfer" ("local_id");

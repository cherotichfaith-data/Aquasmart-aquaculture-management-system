-- Historical reconstruction created stand-in fingerling_batch rows
-- (INFERRED-<cage>-<date>, BATCH-<n>-<date>) purely because
-- production_cycle.batch_id and fish_stocking.batch_id are NOT NULL. They are
-- not real batches and must never appear in any batch listing.
--
-- Flag them once; the batch RPCs exclude them at the source so the frontend
-- needs no name-matching or scrubbing.

alter table "public"."fingerling_batch"
  add column if not exists "is_synthetic" boolean not null default false;

comment on column "public"."fingerling_batch"."is_synthetic" is
  'True for data-repair stand-in batches created during historical reconstruction. Excluded from all batch listings.';

update "public"."fingerling_batch"
  set "is_synthetic" = true
  where "name" ~* '^\s*(INFERRED-|BATCH-\d)'
    and "is_synthetic" = false;

-- Drop the short-lived is_synthetic flag. The database holds no synthetic data:
-- the INFERRED-<cage> / BATCH-<n> rows are real, closed historical batches.
-- Both batch RPCs now gate on an ongoing production cycle instead, so nothing
-- references this column any more.

alter table "public"."fingerling_batch" drop column if exists "is_synthetic";

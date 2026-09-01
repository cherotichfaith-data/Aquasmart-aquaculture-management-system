-- Cage names were persisted as `<unit>.<number>` (e.g. "G1.A") by an older
-- version of buildPersistedSystemName, while the UI everywhere else renders
-- `<unit><number>` with no separator (e.g. "G1A"). The code now persists the
-- separator-free form; this backfills existing rows so the two agree.
--
-- Only rows whose name begins with exactly `<unit>.` are touched -- the dot
-- immediately after the unit prefix is removed and nothing else changes.

UPDATE public.system
SET name = unit || substr(name, length(unit) + 2)
WHERE unit IS NOT NULL
  AND unit <> ''
  AND name IS NOT NULL
  AND left(name, length(unit) + 1) = unit || '.';

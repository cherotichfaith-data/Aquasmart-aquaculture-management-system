-- Allow explicit "no feed given" records to be saved without a feed type.
-- Positive feeding amounts are still validated by the application API.
alter table public.feeding_record
  alter column feed_type_id drop not null;

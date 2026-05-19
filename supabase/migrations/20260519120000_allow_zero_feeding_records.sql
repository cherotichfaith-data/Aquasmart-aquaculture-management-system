alter table public.feeding_record
  alter column feed_type_id drop not null,
  alter column feeding_response drop not null;

alter table public.feeding_record
  drop constraint if exists feeding_amount_check;

alter table public.feeding_record
  add constraint feeding_amount_check
  check (
    feeding_amount >= 0::double precision
    and feeding_amount < 1000::double precision
  );

comment on column public.feeding_record.feed_type_id is
  'Optional when no feed was given and feeding_amount is 0; required by the app for positive feeding entries.';

comment on column public.feeding_record.feeding_response is
  'Optional when no feed was given and feeding_amount is 0. Appetite level 1-5 for positive feeding entries.';

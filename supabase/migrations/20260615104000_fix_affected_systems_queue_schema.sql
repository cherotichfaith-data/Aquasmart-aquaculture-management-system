-- The system refresh trigger records the earliest date that needs recomputation,
-- but older queue schema snapshots only created the system_id column.
alter table public._affected_systems
  add column if not exists min_affected_date date not null default current_date;

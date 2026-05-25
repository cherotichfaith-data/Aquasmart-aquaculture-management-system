-- Allow operational data-entry users to create batches needed for stocking.
-- Updates/deletes remain restricted to managers by the existing policies.
drop policy if exists "fingerling_batch: insert by managers" on public.fingerling_batch;

create policy "fingerling_batch: insert by write roles"
on public.fingerling_batch
for insert
to authenticated
with check (
  farm_id is not null
  and private.has_farm_role(
    farm_id,
    array['admin'::text, 'farm_manager'::text, 'system_operator'::text]
  )
);

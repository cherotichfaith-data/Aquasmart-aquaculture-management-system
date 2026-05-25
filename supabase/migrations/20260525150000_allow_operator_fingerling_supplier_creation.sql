-- Data-entry users can create a missing fingerling source while setting up
-- a batch. Supplier updates/deletes remain manager-only.
drop policy if exists "fingerling_supplier: insert by managers" on public.fingerling_supplier;

create policy "fingerling_supplier: insert by write roles"
on public.fingerling_supplier
for insert
to authenticated
with check (
  exists (
    select 1
    from public.farm_user fu
    where fu.user_id = (select auth.uid())
      and fu.role = any (array['admin'::text, 'farm_manager'::text, 'system_operator'::text])
  )
);

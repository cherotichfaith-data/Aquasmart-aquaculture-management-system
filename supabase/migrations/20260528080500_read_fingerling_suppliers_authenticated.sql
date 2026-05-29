-- Fingerling suppliers are global source/reference rows used by data-entry
-- forms, matching feed_supplier behavior. Authenticated users need to read
-- existing suppliers before creating batches.
drop policy if exists "fingerling_supplier: read if farm member" on public.fingerling_supplier;

create policy "fingerling_supplier_select"
on public.fingerling_supplier
for select
to authenticated
using (true);

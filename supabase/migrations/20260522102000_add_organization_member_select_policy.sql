do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'organization'
      and policyname = 'organization_select_owner_or_farm_member'
  ) then
    create policy "organization_select_owner_or_farm_member"
      on public.organization
      for select
      to authenticated
      using (
        owner_id = (select auth.uid())
        or exists (
          select 1
          from public.farm f
          join public.farm_user fu on fu.farm_id = f.id
          where f.organization_id = organization.id
            and fu.user_id = (select auth.uid())
        )
      );
  end if;
end
$$;

-- Onboarding trigger:
-- 1) Ensure public.profiles row exists for each new auth user
-- 2) Auto-assign farm membership in public.farm_user for single-farm setups
--    - Prefer raw_user_meta_data.farm_id when provided
--    - Fallback to the first available farm

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  role_text text;
  target_farm_id uuid;
begin
  role_text := coalesce(new.raw_user_meta_data ->> 'role', 'viewer');

  insert into public.profiles (id, email, role)
  values (new.id, new.email, role_text)
  on conflict (id) do update
  set email = excluded.email,
      role = excluded.role;

  -- Prefer an explicit farm_id from signup metadata.
  begin
    if coalesce(new.raw_user_meta_data ->> 'farm_id', '') <> '' then
      target_farm_id := (new.raw_user_meta_data ->> 'farm_id')::uuid;
    end if;
  exception
    when others then
      target_farm_id := null;
  end;

  -- Single-farm fallback: first farm in the system.
  if target_farm_id is null then
    select f.id
      into target_farm_id
    from public.farm f
    order by f.id
    limit 1;
  end if;

  -- Insert farm membership when a farm is resolvable.
  if target_farm_id is not null then
    insert into public.farm_user (farm_id, user_id, role)
    values (target_farm_id, new.id, role_text)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();


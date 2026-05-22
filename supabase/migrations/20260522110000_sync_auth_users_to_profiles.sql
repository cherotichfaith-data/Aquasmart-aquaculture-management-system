alter table public.user_profile
  add column if not exists email text;

create or replace function private.apply_pending_farm_user_invitations(p_user_id uuid, p_email text)
returns integer
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_rows int := 0;
begin
  if p_user_id is null or v_email = '' then
    return 0;
  end if;

  insert into public.farm_user (farm_id, user_id, role)
  select
    i.farm_id,
    p_user_id,
    i.role
  from private.farm_user_invitation i
  where i.email = v_email
    and i.status = 'pending'
  on conflict (farm_id, user_id) do nothing;

  update private.farm_user_invitation
  set
    status = 'accepted',
    invited_user_id = p_user_id,
    accepted_at = coalesce(accepted_at, timezone('utc', now())),
    revoked_at = null
  where email = v_email
    and status = 'pending';

  get diagnostics v_rows = row_count;

  insert into public.user_profile (
    user_id,
    email,
    farm_id,
    organization_id,
    role
  )
  select
    p_user_id,
    v_email,
    fu.farm_id,
    f.organization_id,
    fu.role
  from public.farm_user fu
  join public.farm f on f.id = fu.farm_id
  where fu.user_id = p_user_id
  order by fu.created_at asc nulls last
  limit 1
  on conflict (user_id) do update
  set
    email = coalesce(public.user_profile.email, excluded.email),
    farm_id = coalesce(public.user_profile.farm_id, excluded.farm_id),
    organization_id = coalesce(public.user_profile.organization_id, excluded.organization_id),
    role = excluded.role,
    updated_at = timezone('utc', now());

  return v_rows;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $$
declare
  v_email text := lower(trim(coalesce(new.email, '')));
  v_full_name text := nullif(
    trim(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')),
    ''
  );
  v_role text := coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'viewer');
begin
  insert into public.user_profile (
    user_id,
    email,
    full_name,
    role
  )
  values (
    new.id,
    v_email,
    v_full_name,
    v_role
  )
  on conflict (user_id) do update
  set
    email = coalesce(excluded.email, public.user_profile.email),
    full_name = coalesce(public.user_profile.full_name, excluded.full_name),
    role = case
      when exists (select 1 from public.farm_user fu where fu.user_id = new.id)
        then public.user_profile.role
      else coalesce(public.user_profile.role, excluded.role)
    end,
    updated_at = timezone('utc', now());

  perform private.apply_pending_farm_user_invitations(new.id, v_email);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.user_profile (
  user_id,
  email,
  full_name,
  role
)
select
  u.id,
  lower(trim(u.email)),
  nullif(trim(coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')), ''),
  coalesce(nullif(u.raw_user_meta_data->>'role', ''), 'viewer')
from auth.users u
on conflict (user_id) do update
set
  email = coalesce(public.user_profile.email, excluded.email),
  full_name = coalesce(public.user_profile.full_name, excluded.full_name),
  role = coalesce(public.user_profile.role, excluded.role),
  updated_at = timezone('utc', now());

with first_membership as (
  select distinct on (fu.user_id)
    fu.user_id,
    fu.farm_id,
    f.organization_id,
    fu.role
  from public.farm_user fu
  join public.farm f on f.id = fu.farm_id
  order by fu.user_id, fu.created_at asc nulls last
)
update public.user_profile up
set
  farm_id = coalesce(up.farm_id, fm.farm_id),
  organization_id = coalesce(up.organization_id, fm.organization_id),
  role = fm.role,
  updated_at = timezone('utc', now())
from first_membership fm
where fm.user_id = up.user_id;

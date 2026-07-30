create table if not exists public.api_rate_limit_counter (
  scope text not null,
  user_id uuid not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_request_ip inet null,
  constraint api_rate_limit_counter_pkey primary key (scope, user_id, window_start)
);

create index if not exists api_rate_limit_counter_lookup_idx
  on public.api_rate_limit_counter (scope, user_id, window_start desc);

create or replace function public.enforce_api_rate_limit(
  p_scope text,
  p_user_id uuid,
  p_limit integer,
  p_window_seconds integer,
  p_ip_address inet default null
)
returns table (
  allowed boolean,
  current_count integer,
  remaining integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_window_start timestamptz;
  v_reset_at timestamptz;
  v_current_count integer;
begin
  if p_scope is null or btrim(p_scope) = '' then
    raise exception 'p_scope is required';
  end if;

  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;

  if p_limit is null or p_limit < 1 then
    raise exception 'p_limit must be greater than zero';
  end if;

  if p_window_seconds is null or p_window_seconds < 1 then
    raise exception 'p_window_seconds must be greater than zero';
  end if;

  v_window_start := to_timestamp(floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds);
  v_reset_at := v_window_start + make_interval(secs => p_window_seconds);

  insert into public.api_rate_limit_counter as counter (
    scope,
    user_id,
    window_start,
    request_count,
    last_request_ip
  )
  values (
    p_scope,
    p_user_id,
    v_window_start,
    1,
    p_ip_address
  )
  on conflict (scope, user_id, window_start) do update
  set
    request_count = counter.request_count + 1,
    updated_at = v_now,
    last_request_ip = excluded.last_request_ip
  returning counter.request_count into v_current_count;

  delete from public.api_rate_limit_counter
  where scope = p_scope
    and user_id = p_user_id
    and window_start < v_window_start;

  return query
  select
    v_current_count <= p_limit,
    v_current_count,
    greatest(p_limit - v_current_count, 0),
    v_reset_at;
end;
$$;

revoke all on function public.enforce_api_rate_limit(text, uuid, integer, integer, inet) from public;
grant execute on function public.enforce_api_rate_limit(text, uuid, integer, integer, inet) to service_role;

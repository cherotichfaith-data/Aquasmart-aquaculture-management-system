create or replace function public.api_system_options_rpc(
  p_farm_id uuid default null,
  p_stage public.system_growth_stage default null,
  p_active_only boolean default true
)
returns table(
  id bigint,
  farm_id uuid,
  farm_name text,
  label text,
  name text,
  unit text,
  type text,
  growth_stage public.system_growth_stage,
  is_active boolean
)
language sql
stable
security definer
set search_path to 'pg_catalog', 'public', 'pg_temp'
as $$
  select
    s.id,
    s.farm_id,
    f.name as farm_name,
    case
      when nullif(trim(s.unit), '') is not null
        and nullif(trim(s.name), '') is not null
        and lower(trim(s.name)) like lower(trim(s.unit)) || '%'
          then trim(s.name)
      when nullif(trim(s.unit), '') is not null
        and nullif(trim(s.name), '') is not null
          then trim(s.unit) || trim(s.name)
      when nullif(trim(s.name), '') is not null then trim(s.name)
      when nullif(trim(s.unit), '') is not null then trim(s.unit)
      else 'Missing cage name'
    end as label,
    s.name,
    s.unit,
    s.type::text,
    s.growth_stage,
    s.is_active
  from public.system s
  join public.farm f on f.id = s.farm_id
  where (p_farm_id is null or s.farm_id = p_farm_id)
    and (p_stage is null or s.growth_stage = p_stage)
    and (not p_active_only or s.is_active = true)
  order by s.is_active desc, s.id desc;
$$;

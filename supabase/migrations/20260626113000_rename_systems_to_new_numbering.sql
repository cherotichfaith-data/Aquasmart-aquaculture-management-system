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
set search_path to 'pg_catalog', 'public', 'private'
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
          then trim(s.unit) || ' - ' || trim(s.name)
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
    and (p_farm_id is null or private.is_farm_member(p_farm_id))
    and (p_stage is null or s.growth_stage = p_stage)
    and (not coalesce(p_active_only, true) or s.is_active = true)
  order by s.is_active desc, s.commissioned_at desc nulls last, s.id desc;
$$;

update public.system
set
  name = case name
    when 'A1' then '2A'
    when 'A2' then '2B'
    when 'A3' then '2C'
    when 'A4' then '2D'
    when 'A5' then '2E'
    when 'A6' then '2F'
    when 'B1' then '1A'
    when 'B2' then '1B'
    when 'B3' then '1C'
    when 'B4' then '1D'
    when 'B5' then '1E'
    when 'B6' then '1F'
    when 'C1' then '3A'
    when 'C2' then '3B'
    when 'C3' then '3C'
    when 'C4' then '3D'
    when 'C5' then '3E'
    when 'C6' then '3F'
    else name
  end,
  unit = case name
    when 'A1' then '2'
    when 'A2' then '2'
    when 'A3' then '2'
    when 'A4' then '2'
    when 'A5' then '2'
    when 'A6' then '2'
    when 'B1' then '1'
    when 'B2' then '1'
    when 'B3' then '1'
    when 'B4' then '1'
    when 'B5' then '1'
    when 'B6' then '1'
    when 'C1' then '3'
    when 'C2' then '3'
    when 'C3' then '3'
    when 'C4' then '3'
    when 'C5' then '3'
    when 'C6' then '3'
    else unit
  end
where name in (
  'A1', 'A2', 'A3', 'A4', 'A5', 'A6',
  'B1', 'B2', 'B3', 'B4', 'B5', 'B6',
  'C1', 'C2', 'C3', 'C4', 'C5', 'C6'
);

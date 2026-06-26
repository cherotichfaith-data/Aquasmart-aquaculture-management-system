update public.system
set
  name = case name
    when 'B1 Hapa 1' then '1A Hapa 1'
    when 'B1 Hapa 2' then '1A Hapa 2'
    else name
  end,
  unit = case unit
    when 'B1 Hapa' then '1A Hapa'
    else unit
  end
where name in ('B1 Hapa 1', 'B1 Hapa 2');

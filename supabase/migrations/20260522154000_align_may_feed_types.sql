update public.feed_supplier
set company_name = 'Aller Aqua',
    location_country = 'Egypt'
where lower(company_name) = 'aller aqua';

update public.feed_type
set feed_supplier = (select id from public.feed_supplier where lower(company_name) = 'aller aqua' limit 1),
    feed_line = 'til-pro',
    feed_category = 'starter',
    feed_pellet_size = '0.9-1.6mm'::public.feed_pellet_size,
    crude_protein_percentage = 44,
    crude_fat_percentage = null,
    is_active = true
where id = 17;

update public.feed_type
set feed_supplier = (select id from public.feed_supplier where lower(company_name) = 'aller aqua' limit 1),
    feed_line = 'til-pro',
    feed_category = 'pre-grower',
    feed_pellet_size = '2mm'::public.feed_pellet_size,
    crude_protein_percentage = 36,
    is_active = true
where id = 18;

update public.feed_type
set feed_supplier = (select id from public.feed_supplier where lower(company_name) = 'aller aqua' limit 1),
    feed_line = 'til-pro',
    feed_category = 'grower',
    feed_pellet_size = '3mm'::public.feed_pellet_size,
    crude_protein_percentage = 36,
    crude_fat_percentage = null,
    is_active = true
where id = 22;

update public.feed_type
set feed_supplier = (select id from public.feed_supplier where lower(company_name) = 'aller aqua' limit 1),
    feed_line = 'til-pro',
    feed_category = 'grower',
    feed_pellet_size = '4.5mm'::public.feed_pellet_size,
    crude_protein_percentage = 34,
    crude_fat_percentage = null,
    is_active = true
where id = 23;

update public.feed_type
set feed_supplier = (select id from public.feed_supplier where lower(company_name) = 'aller aqua' limit 1),
    feed_line = 'til-pro',
    feed_category = 'pre-starter',
    feed_pellet_size = '0.5mm'::public.feed_pellet_size,
    crude_protein_percentage = 44,
    crude_fat_percentage = null,
    is_active = true
where id = 36;

with supplier as (
  select id
  from public.feed_supplier
  where lower(company_name) = 'aller aqua'
  limit 1
),
inserted as (
  insert into public.feed_type (
    feed_supplier,
    feed_line,
    feed_category,
    feed_pellet_size,
    crude_protein_percentage,
    crude_fat_percentage,
    farm_id,
    is_active
  )
  select
    supplier.id,
    'til-pro',
    'pre-starter'::public.feed_category,
    '0.5-1.0mm'::public.feed_pellet_size,
    44,
    null,
    null,
    true
  from supplier
  where not exists (
    select 1
    from public.feed_type ft
    where ft.feed_supplier = supplier.id
      and ft.feed_line = 'til-pro'
      and ft.feed_category = 'pre-starter'
      and ft.feed_pellet_size = '0.5-1.0mm'::public.feed_pellet_size
      and ft.crude_protein_percentage = 44
      and ft.farm_id is null
  )
  returning id
),
resolved as (
  select id from inserted
  union all
  select ft.id
  from public.feed_type ft
  join supplier on supplier.id = ft.feed_supplier
  where ft.feed_line = 'til-pro'
    and ft.feed_category = 'pre-starter'
    and ft.feed_pellet_size = '0.5-1.0mm'::public.feed_pellet_size
    and ft.crude_protein_percentage = 44
    and ft.farm_id is null
  limit 1
)
update public.feed_inventory fi
set feed_type_id = resolved.id
from resolved
where fi.feed_type_label ilike '0.5-1.0mm%Aller%Til-Pro%44%';

update public.feed_inventory
set feed_type_label = case
  when feed_type_id = 17 then '0.9-1.6mm Aller Aqua Til-Pro 44%'
  when feed_type_id = 18 then '2mm Aller Aqua Til-Pro 36%'
  when feed_type_id = 22 then '3mm Aller Aqua Til-Pro 36%'
  when feed_type_id = 23 then '4.5mm Aller Aqua Til-Pro 34%'
  when feed_type_id = 36 then '0.5mm Aller Aqua Til-Pro 44%'
  else feed_type_label
end
where feed_type_id in (17, 18, 22, 23, 36);

select setval(
  pg_get_serial_sequence('public.feed_type', 'id'),
  (select max(id) from public.feed_type),
  true
);

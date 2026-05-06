-- Normalize legacy role names to the five backend-supported roles.
-- This migration updates persisted role values, auth metadata role payloads,
-- and the remaining RLS/view definitions that still referenced legacy names.

update public.farm_user
set role = case role
  when 'farm_technician' then 'system_operator'
  when 'inventory_storekeeper' then 'system_operator'
  when 'analyst_planner' then 'data_analyst'
  when 'viewer_auditor' then 'viewer'
  else role
end
where role in ('farm_technician', 'inventory_storekeeper', 'analyst_planner', 'viewer_auditor');

update public.user_profile
set role = case role
  when 'farm_technician' then 'system_operator'
  when 'inventory_storekeeper' then 'system_operator'
  when 'analyst_planner' then 'data_analyst'
  when 'viewer_auditor' then 'viewer'
  else role
end
where role in ('farm_technician', 'inventory_storekeeper', 'analyst_planner', 'viewer_auditor');

update auth.users
set
  raw_user_meta_data = case
    when coalesce(raw_user_meta_data ->> 'role', '') in ('farm_technician', 'inventory_storekeeper', 'analyst_planner', 'viewer_auditor')
      then jsonb_set(
        coalesce(raw_user_meta_data, '{}'::jsonb),
        '{role}',
        to_jsonb(
          case raw_user_meta_data ->> 'role'
            when 'farm_technician' then 'system_operator'
            when 'inventory_storekeeper' then 'system_operator'
            when 'analyst_planner' then 'data_analyst'
            when 'viewer_auditor' then 'viewer'
            else raw_user_meta_data ->> 'role'
          end
        ),
        true
      )
    else raw_user_meta_data
  end,
  raw_app_meta_data = case
    when coalesce(raw_app_meta_data ->> 'role', '') in ('farm_technician', 'inventory_storekeeper', 'analyst_planner', 'viewer_auditor')
      then jsonb_set(
        coalesce(raw_app_meta_data, '{}'::jsonb),
        '{role}',
        to_jsonb(
          case raw_app_meta_data ->> 'role'
            when 'farm_technician' then 'system_operator'
            when 'inventory_storekeeper' then 'system_operator'
            when 'analyst_planner' then 'data_analyst'
            when 'viewer_auditor' then 'viewer'
            else raw_app_meta_data ->> 'role'
          end
        ),
        true
      )
    else raw_app_meta_data
  end
where
  coalesce(raw_user_meta_data ->> 'role', '') in ('farm_technician', 'inventory_storekeeper', 'analyst_planner', 'viewer_auditor')
  or coalesce(raw_app_meta_data ->> 'role', '') in ('farm_technician', 'inventory_storekeeper', 'analyst_planner', 'viewer_auditor');

create or replace view public.api_daily_water_quality_rating
with (security_invoker = true) as
select
  dwr.system_id,
  s.farm_id,
  s.name as system_name,
  dwr.rating_date,
  dwr.rating,
  dwr.rating_numeric,
  dwr.worst_parameter,
  coalesce(a.canonical_name, dwr.worst_parameter::text) as worst_parameter_normalized,
  dwr.worst_parameter_value,
  dwr.worst_parameter_unit,
  dwr.created_at
from public.daily_water_quality_rating dwr
join public.system s on s.id = dwr.system_id
left join public.aliases a
  on a.category = 'water_quality'
 and a.alias = dwr.worst_parameter::text
where exists (
  select 1
  from public.user_profile up
  where up.user_id = auth.uid()
    and up.farm_id = s.farm_id
    and up.role = any (array['admin'::text, 'farm_manager'::text, 'system_operator'::text])
);

alter view public.api_daily_water_quality_rating owner to postgres;

create or replace view public.api_water_quality_measurements
with (security_invoker = true) as
select
  wqm.id,
  wqm.system_id,
  s.farm_id,
  s.name as system_name,
  wqm.date,
  wqm.time,
  wqm.parameter_name,
  wqm.parameter_value,
  wqm.water_depth,
  wqf.unit,
  wqm.created_at,
  coalesce(a.canonical_name, wqm.parameter_name::text) as parameter_name_normalized
from public.water_quality_measurement wqm
join public.system s on s.id = wqm.system_id
join public.water_quality_framework wqf on wqf.parameter_name = wqm.parameter_name
left join public.aliases a
  on a.category = 'water_quality'
 and a.alias = wqm.parameter_name::text
where exists (
  select 1
  from public.user_profile up
  where up.user_id = auth.uid()
    and up.farm_id = s.farm_id
    and up.role = any (array['admin'::text, 'farm_manager'::text, 'system_operator'::text])
);

alter view public.api_water_quality_measurements owner to postgres;

drop policy if exists "feed_incoming: insert by inventory roles" on public.feed_incoming;
create policy "feed_incoming: insert by inventory roles"
on public.feed_incoming
for insert
with check (
  exists (
    select 1
    from public.farm_user fu
    where fu.farm_id = feed_incoming.farm_id
      and fu.user_id = (select auth.uid())
      and fu.role = any (array['admin'::text, 'farm_manager'::text, 'system_operator'::text])
  )
);

drop policy if exists "feed_incoming: update by inventory roles" on public.feed_incoming;
create policy "feed_incoming: update by inventory roles"
on public.feed_incoming
for update
using (
  exists (
    select 1
    from public.farm_user fu
    where fu.farm_id = feed_incoming.farm_id
      and fu.user_id = (select auth.uid())
      and fu.role = any (array['admin'::text, 'farm_manager'::text, 'system_operator'::text])
  )
)
with check (
  exists (
    select 1
    from public.farm_user fu
    where fu.farm_id = feed_incoming.farm_id
      and fu.user_id = (select auth.uid())
      and fu.role = any (array['admin'::text, 'farm_manager'::text, 'system_operator'::text])
  )
);

drop policy if exists "feeding_record: insert by write roles" on public.feeding_record;
create policy "feeding_record: insert by write roles"
on public.feeding_record
for insert
with check (
  exists (
    select 1
    from public.system s
    join public.farm_user fu on fu.farm_id = s.farm_id
    where s.id = feeding_record.system_id
      and fu.user_id = (select auth.uid())
      and fu.role = any (array['admin'::text, 'farm_manager'::text, 'system_operator'::text])
  )
);

drop policy if exists "fish_harvest: insert by write roles" on public.fish_harvest;
create policy "fish_harvest: insert by write roles"
on public.fish_harvest
for insert
with check (
  exists (
    select 1
    from public.system s
    join public.farm_user fu on fu.farm_id = s.farm_id
    where s.id = fish_harvest.system_id
      and fu.user_id = (select auth.uid())
      and fu.role = any (array['admin'::text, 'farm_manager'::text, 'system_operator'::text])
  )
);

drop policy if exists "fish_mortality: insert by write roles" on public.fish_mortality;
create policy "fish_mortality: insert by write roles"
on public.fish_mortality
for insert
with check (
  exists (
    select 1
    from public.system s
    join public.farm_user fu on fu.farm_id = s.farm_id
    where s.id = fish_mortality.system_id
      and fu.user_id = (select auth.uid())
      and fu.role = any (array['admin'::text, 'farm_manager'::text, 'system_operator'::text])
  )
);

drop policy if exists "fish_sampling_weight: insert by write roles" on public.fish_sampling_weight;
create policy "fish_sampling_weight: insert by write roles"
on public.fish_sampling_weight
for insert
with check (
  exists (
    select 1
    from public.system s
    join public.farm_user fu on fu.farm_id = s.farm_id
    where s.id = fish_sampling_weight.system_id
      and fu.user_id = (select auth.uid())
      and fu.role = any (array['admin'::text, 'farm_manager'::text, 'system_operator'::text])
  )
);

drop policy if exists "fish_stocking: insert by write roles" on public.fish_stocking;
create policy "fish_stocking: insert by write roles"
on public.fish_stocking
for insert
with check (
  exists (
    select 1
    from public.system s
    join public.farm_user fu on fu.farm_id = s.farm_id
    where s.id = fish_stocking.system_id
      and fu.user_id = (select auth.uid())
      and fu.role = any (array['admin'::text, 'farm_manager'::text, 'system_operator'::text])
  )
);

drop policy if exists "fish_transfer: insert by write roles" on public.fish_transfer;
create policy "fish_transfer: insert by write roles"
on public.fish_transfer
for insert
with check (
  exists (
    select 1
    from public.system s
    join public.farm_user fu on fu.farm_id = s.farm_id
    where s.id = fish_transfer.origin_system_id
      and fu.user_id = (select auth.uid())
      and fu.role = any (array['admin'::text, 'farm_manager'::text, 'system_operator'::text])
  )
);

drop policy if exists "system_insert" on public.system;
create policy "system_insert"
on public.system
for insert
with check (
  public.has_farm_role(
    farm_id,
    array['admin'::text, 'farm_manager'::text, 'system_operator'::text],
    (select auth.uid())
  )
);

drop policy if exists "system_update" on public.system;
create policy "system_update"
on public.system
for update
using (
  public.has_farm_role(
    farm_id,
    array['admin'::text, 'farm_manager'::text, 'system_operator'::text],
    (select auth.uid())
  )
)
with check (
  public.has_farm_role(
    farm_id,
    array['admin'::text, 'farm_manager'::text, 'system_operator'::text],
    (select auth.uid())
  )
);

drop policy if exists "water_quality_measurement: insert by write roles" on public.water_quality_measurement;
create policy "water_quality_measurement: insert by write roles"
on public.water_quality_measurement
for insert
with check (
  exists (
    select 1
    from public.system s
    join public.farm_user fu on fu.farm_id = s.farm_id
    where s.id = water_quality_measurement.system_id
      and fu.user_id = (select auth.uid())
      and fu.role = any (array['admin'::text, 'farm_manager'::text, 'system_operator'::text])
  )
);

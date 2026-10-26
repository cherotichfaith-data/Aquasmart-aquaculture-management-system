-- Immutable, farm-scoped snapshots; never alter daily production or monthly reviews.
create table public.cage_feed_plan (
 id uuid primary key default gen_random_uuid(),
 farm_id uuid not null references public.farm(id),
 starts_on date not null,
 ends_on date not null check (ends_on >= starts_on and ends_on-starts_on < 62),
 source_as_of date not null check (source_as_of <= starts_on),
 model_version text not null check (model_version='tb-workbook-v1'),
 rows jsonb not null check (jsonb_typeof(rows)='array' and jsonb_array_length(rows) between 1 and 500),
 created_at timestamptz not null default now(),
 created_by uuid not null default auth.uid() references auth.users(id)
);
create index cage_feed_plan_farm_date on public.cage_feed_plan(farm_id,created_at desc);
alter table public.cage_feed_plan enable row level security;
revoke all on public.cage_feed_plan from anon,authenticated;
grant select,insert on public.cage_feed_plan to authenticated;
create policy feed_plan_read on public.cage_feed_plan for select to authenticated
using (exists(select 1 from public.farm_user f where f.farm_id=cage_feed_plan.farm_id and f.user_id=(select auth.uid())));
create policy feed_plan_create on public.cage_feed_plan for insert to authenticated
with check (created_by=(select auth.uid()) and private.has_farm_role(farm_id,array['admin','farm_manager']));

create function private.validate_cage_feed_plan() returns trigger language plpgsql set search_path=pg_catalog,public as $$
declare r jsonb;
begin
 if new.source_as_of > (now() at time zone 'Africa/Nairobi')::date then raise exception 'Source date cannot be in the future'; end if;
 for r in select value from jsonb_array_elements(new.rows) loop
  if not exists(select 1 from public.system where id=(r->>'system_id')::bigint and farm_id=new.farm_id)
   or not exists(select 1 from public.fingerling_batch where id=(r->>'batch_id')::bigint and farm_id=new.farm_id) then
   raise exception 'Cage and batch must belong to the farm';
  end if;
 end loop;
 new.created_at:=clock_timestamp(); new.created_by:=auth.uid();
 return new;
end $$;
revoke all on function private.validate_cage_feed_plan() from public,anon,authenticated;
create trigger validate_cage_feed_plan before insert on public.cage_feed_plan for each row execute function private.validate_cage_feed_plan();

-- Private analytics source is exposed only after an explicit membership check.
create function public.api_cage_feed_plan_sources(p_farm_id uuid,p_as_of date) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public,analytics as $$
declare result jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.farm_user where farm_id=p_farm_id and user_id=auth.uid()) then
  raise exception 'Not authorized for this farm' using errcode='42501';
 end if;
 if p_as_of is null or p_as_of > (now() at time zone 'Africa/Nairobi')::date then raise exception 'Invalid source date'; end if;
 with latest as (
  select s.id as system_id,s.name as cage_name,d.batch_id,d.production_cycle_id,d.number_of_fish as stock_no,d.inventory_date as stock_date
  from public.system s cross join lateral (
   select x.* from analytics.daily_system_facts x where x.system_id=s.id and x.inventory_date<=p_as_of order by x.inventory_date desc limit 1
  ) d
  where s.farm_id=p_farm_id and s.is_active and s.cage_status::text is distinct from 'retired'
   and (s.decommissioned_at is null or s.decommissioned_at>p_as_of) and d.number_of_fish>0
 ), source_rows as (
  select l.system_id,l.cage_name,l.batch_id,b.name as batch_name,l.stock_no,l.stock_date,
   ab.abw as abw_g,ab.date as sampled_on
  from latest l join public.fingerling_batch b on b.id=l.batch_id and b.farm_id=p_farm_id
  left join lateral (
   select x.abw,x.date from public.fish_sampling_weight x
   where x.system_id=l.system_id and x.batch_id=l.batch_id and x.date<=p_as_of and x.abw>0
    and (x.cycle_id=l.production_cycle_id or x.cycle_id is null)
   order by x.date desc,x.id desc limit 1
  ) ab on true
 ) select coalesce(jsonb_agg(to_jsonb(source_rows) order by cage_name,batch_name),'[]'::jsonb) into result from source_rows;
 return result;
end $$;
revoke all on function public.api_cage_feed_plan_sources(uuid,date) from public,anon;
grant execute on function public.api_cage_feed_plan_sources(uuid,date) to authenticated;

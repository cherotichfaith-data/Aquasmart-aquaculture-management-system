-- Read-only source for automatic planning. Production records remain authoritative.
create or replace function public.api_automatic_feed_plan_sources(p_farm_id uuid, p_as_of date)
returns jsonb language plpgsql stable security definer
set search_path = pg_catalog, public, analytics as $$
declare result jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.farm_user where farm_id=p_farm_id and user_id=auth.uid()) then
  raise exception 'Not authorized for this farm' using errcode='42501';
 end if;
 if p_as_of is null or p_as_of > (now() at time zone 'Africa/Nairobi')::date then raise exception 'Invalid source date'; end if;
 with sources as (
  select s.id as system_id, s.name as cage_name, coalesce(b.name,'Mixed / recorded stock') as batch_name,
   d.number_of_fish as stock_no, d.inventory_date as stock_date,
   d.abw_last_sampling as abw_g, d.last_abw_date as sampled_on,
   coalesce(a.feed,0) as actual_feed_kg, coalesce(a.morts,0) as actual_mortality
  from public.system s
  cross join lateral (
   select x.* from analytics.daily_system_facts x
   where x.system_id=s.id and x.inventory_date<=p_as_of
   order by x.inventory_date desc limit 1
  ) d
  left join public.fingerling_batch b on b.id=d.batch_id and b.farm_id=p_farm_id
  left join lateral (
   select sum(x.feeding_amount_today) as feed, sum(x.fish_died_today) as morts
   from analytics.daily_system_facts x where x.system_id=s.id
   and x.inventory_date between date_trunc('month',p_as_of)::date and p_as_of
  ) a on true
  where s.farm_id=p_farm_id and s.is_active and s.cage_status::text is distinct from 'retired'
  and (s.decommissioned_at is null or s.decommissioned_at>p_as_of) and d.number_of_fish>0
 ) select coalesce(jsonb_agg(to_jsonb(sources) order by cage_name),'[]'::jsonb) into result from sources;
 return result;
end $$;
revoke all on function public.api_automatic_feed_plan_sources(uuid,date) from public,anon;
grant execute on function public.api_automatic_feed_plan_sources(uuid,date) to authenticated;
comment on function public.api_automatic_feed_plan_sources(uuid,date) is 'Current fish counts and measured ABW with source dates; feed and mortality month-to-date come from daily production facts. Farm membership required.';

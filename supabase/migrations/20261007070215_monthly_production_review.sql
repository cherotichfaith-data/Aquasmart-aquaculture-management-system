-- Reviewed monthly values override this sheet only, never daily operational records.
create table public.production_monthly_review (
  farm_id uuid not null references public.farm(id),
  month date not null check (extract(day from month)=1),
  system_id bigint not null references public.system(id),
  batch_id bigint not null references public.fingerling_batch(id),
  stocked_no integer check (stocked_no between 0 and 10000000),
  mortality_no integer check (mortality_no between 0 and 10000000),
  abw_end_g numeric check (abw_end_g > 0 and abw_end_g <= 100000),
  feed_kg numeric check (feed_kg >= 0 and feed_kg <= 100000000),
  notes text not null default '' check (length(notes)<=1000),
  revision integer not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid not null default auth.uid(),
  primary key(farm_id,month,system_id,batch_id)
);
alter table public.production_monthly_review enable row level security;
revoke all on public.production_monthly_review from anon, authenticated;
grant select,insert,update on public.production_monthly_review to authenticated;
grant all on public.production_monthly_review to service_role;
create policy monthly_review_read on public.production_monthly_review for select to authenticated
using (exists(select 1 from public.farm_user f where f.farm_id=production_monthly_review.farm_id and f.user_id=(select auth.uid())));
create policy monthly_review_insert on public.production_monthly_review for insert to authenticated
with check (private.has_farm_role(farm_id,array['admin','farm_manager','system_operator']));
create policy monthly_review_update on public.production_monthly_review for update to authenticated
using (private.has_farm_role(farm_id,array['admin','farm_manager','system_operator']))
with check (private.has_farm_role(farm_id,array['admin','farm_manager','system_operator']));

create function private.validate_monthly_review() returns trigger language plpgsql
set search_path=pg_catalog,public as $$
begin
  if not exists(select 1 from public.system s where s.id=new.system_id and s.farm_id=new.farm_id)
     or not exists(select 1 from public.fingerling_batch b where b.id=new.batch_id and b.farm_id=new.farm_id) then
    raise exception 'Cage and batch must belong to the selected farm';
  end if;
  if new.month > date_trunc('month',current_date)::date then raise exception 'Future months cannot be reviewed'; end if;
  if tg_op='UPDATE' then
    if (new.farm_id,new.month,new.system_id,new.batch_id) is distinct from (old.farm_id,old.month,old.system_id,old.batch_id) then
      raise exception 'Monthly row identity cannot be changed';
    end if;
    new.revision:=old.revision+1;
  else new.revision:=1;
  end if;
  new.updated_by:=auth.uid();
  new.updated_at:=clock_timestamp();
  return new;
end $$;
revoke all on function private.validate_monthly_review() from public,anon,authenticated;
create trigger validate_monthly_review before insert or update on public.production_monthly_review
for each row execute function private.validate_monthly_review();

create function public.api_monthly_production_inputs(p_farm_id uuid,p_month date) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public,analytics,private as $$
declare result jsonb;
begin
  if auth.uid() is null or not exists(select 1 from public.farm_user f where f.farm_id=p_farm_id and f.user_id=auth.uid()) then
    raise exception 'Not authorized for this farm' using errcode='42501';
  end if;
  if p_month is null then raise exception 'Month is required'; end if;
  with bounds as (
    select date_trunc('month',p_month)::date as s,
      least((date_trunc('month',p_month)+interval '1 month - 1 day')::date,current_date) as e
  ), cages as (select id,name from public.system where farm_id=p_farm_id),
  batches as (select id,name,date_of_delivery from public.fingerling_batch where farm_id=p_farm_id),
  stocking as (select x.system_id,x.batch_id,sum(x.number_of_fish_stocking) as n from public.fish_stocking x join cages c on c.id=x.system_id cross join bounds bd where x.date between bd.s and bd.e group by 1,2),
  mortality as (select x.system_id,x.batch_id,sum(x.number_of_fish_mortality) as n from public.fish_mortality x join cages c on c.id=x.system_id cross join bounds bd where x.date between bd.s and bd.e group by 1,2),
  feeding as (select x.system_id,x.batch_id,sum(x.feeding_amount) as kg from public.feeding_record x join cages c on c.id=x.system_id cross join bounds bd where x.date between bd.s and bd.e group by 1,2),
  sampled as (select distinct x.system_id,x.batch_id from public.fish_sampling_weight x join cages c on c.id=x.system_id cross join bounds bd where x.date between bd.s and bd.e),
  present as (select distinct x.system_id,x.batch_id from analytics.daily_system_facts x join cages c on c.id=x.system_id cross join bounds bd where x.inventory_date between bd.s and bd.e and x.number_of_fish>0),
  reviewed as (select r.* from public.production_monthly_review r cross join bounds bd where r.farm_id=p_farm_id and r.month=bd.s),
  pairs as (
    select system_id,batch_id from present union select system_id,batch_id from stocking
    union select system_id,batch_id from mortality union select system_id,batch_id from feeding
    union select system_id,batch_id from sampled union select system_id,batch_id from reviewed
  ), rows as (
    select p.system_id,p.batch_id,c.name as cage_name,b.name as batch_name,b.date_of_delivery as stocked_on,
      coalesce(op.number_of_fish,0) as opening_no,
      coalesce(tr.incoming_no,0) as transferred_in_no,
      coalesce(st.n,0) as source_stocked_no,coalesce(mo.n,0) as source_mortality_no,
      ab.abw as source_abw_end_g,ab.date as abw_date,coalesce(fe.kg,0) as source_feed_kg,
      rv.stocked_no,rv.mortality_no,rv.abw_end_g,rv.feed_kg,coalesce(rv.notes,'') as notes,rv.revision,rv.updated_at
    from pairs p join cages c on c.id=p.system_id join batches b on b.id=p.batch_id cross join bounds bd
    left join stocking st using(system_id,batch_id)
    left join mortality mo using(system_id,batch_id)
    left join feeding fe using(system_id,batch_id)
    left join reviewed rv using(system_id,batch_id)
    left join lateral(select d.number_of_fish from analytics.daily_system_facts d where d.system_id=p.system_id and d.batch_id=p.batch_id and d.inventory_date=bd.s-1 limit 1) op on true
    left join lateral(select x.abw,x.date from public.fish_sampling_weight x where x.system_id=p.system_id and x.batch_id=p.batch_id and x.date<=bd.e order by x.date desc,x.id desc limit 1) ab on true
    left join lateral(select sum(x.number_of_fish_transfer) as incoming_no from public.fish_transfer x where x.target_system_id=p.system_id and x.batch_id=p.batch_id and x.origin_system_id is distinct from x.target_system_id and x.date between bd.s and bd.e) tr on true
  ) select coalesce(jsonb_agg(to_jsonb(rows) order by cage_name,batch_name),'[]'::jsonb) into result from rows;
  return result;
end $$;
revoke all on function public.api_monthly_production_inputs(uuid,date) from public,anon;
grant execute on function public.api_monthly_production_inputs(uuid,date) to authenticated;
comment on table public.production_monthly_review is 'Reviewed monthly summaries. NULL numeric overrides follow daily sources. Not included in live operational analytics.';

-- Read-only regression against the farm's actual records. Run inside BEGIN/ROLLBACK.
SET LOCAL request.jwt.claims='{"role":"service_role"}';
CREATE TEMP TABLE batch_performance_check AS
with periods as (
 select m::date as month,least((m+interval '1 month - 1 day')::date,date '2026-11-11') finish,mode
 from generate_series(date '2025-01-01',date '2026-11-01',interval '1 month') m
 cross join (values('month'),('cycle')) modes(mode)
)
select p.*,r.*
from periods p cross join lateral jsonb_to_recordset(public.api_analytics_performance(
 'ae4f719b-e29e-4f60-bae0-2429cf840c5d',p.month,p.month,p.finish,
 case when mode='month' then array['batches','growth_custom'] else array['batches','stock_loss_cycle'] end,'main')->'batches')
as r(batch_id bigint,batch_name text,stock_end numeric,abw_g numeric,biomass_kg numeric,growth_kg numeric,
 feed_kg numeric,efcr numeric,acc_efcr numeric,stock_loss_pct numeric);
DO $test$
BEGIN
 if exists(select 1 from batch_performance_check where batch_name ~* '^(BATCH-|INFERRED-)') then
 raise exception 'Legacy batches leaked into table'; end if;
 if exists(select 1 from batch_performance_check where efcr is not null and
   (growth_kg<=0 or feed_kg<0 or abs(efcr-feed_kg/growth_kg)>0.000001)) then
 raise exception 'eFCR does not match the visible row'; end if;
 if exists(select 1 from batch_performance_check where stock_loss_pct<0 or stock_end<0) then
 raise exception 'Invalid stock loss or fish count'; end if;
 if exists(select 1 from batch_performance_check where batch_id is not null and stock_end>0 and biomass_kg is not null
   and abs(biomass_kg-stock_end*abw_g/1000)>0.00001) then
 raise exception 'Closing biomass and weighted ABW do not reconcile'; end if;
 if exists(select 1 from batch_performance_check where mode='cycle' and efcr is distinct from acc_efcr) then
 raise exception 'Cycle eFCR differs from accumulated eFCR'; end if;
 if exists(
 select batch_id from batch_performance_check where batch_id is not null
 group by batch_id
 having bool_and(growth_kg is not null) filter(where mode='month')
 and abs(sum(growth_kg) filter(where mode='month')-
   max(growth_kg) filter(where mode='cycle' and month=date '2026-11-01'))>0.00001
 ) then raise exception 'Monthly growth does not telescope to cycle growth'; end if;
 if exists(
 select c.month,c.mode from batch_performance_check c group by c.month,c.mode
 having abs(max(feed_kg) filter(where batch_id is null)-sum(feed_kg) filter(where batch_id is not null))>0.00001
 ) then raise exception 'Total feed differs from rows'; end if;
 if exists(
 select 1 from batch_performance_check c cross join lateral(
 select coalesce(sum(fr.feeding_amount),0) kg from public.feeding_record fr where fr.batch_id=c.batch_id
 and fr.date<=c.finish and (c.mode='cycle' or fr.date>=c.month)
 ) raw where c.batch_id is not null and abs(c.feed_kg-raw.kg)>0.00001
 ) then raise exception 'Feed differs from actual records'; end if;
END $test$;
DO $access_test$
BEGIN
 if has_function_privilege('anon','public.api_analytics_performance(uuid,date,date,date,text[],text)','execute') then
 raise exception 'Anonymous users can execute performance reports'; end if;
 perform set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000001"}',true);
 if public.api_analytics_performance('ae4f719b-e29e-4f60-bae0-2429cf840c5d','2026-10-01','2026-10-01','2026-10-31',array['batches'],'main') is not null then
 raise exception 'Non-member can read farm performance'; end if;
 perform set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',
 (select user_id from public.farm_user where farm_id='ae4f719b-e29e-4f60-bae0-2429cf840c5d' limit 1))::text,true);
 if coalesce(jsonb_array_length(public.api_analytics_performance('ae4f719b-e29e-4f60-bae0-2429cf840c5d',
 '2026-10-01','2026-10-01','2026-10-31',array['batches'],'main')->'batches'),0)=0 then
 raise exception 'Farm member cannot load report'; end if;
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
END $access_test$;
SELECT count(*) as checked_rows,count(distinct (month,mode)) as checked_periods,
 count(*) filter(where growth_kg<0) as negative_growth_rows,
 count(*) filter(where growth_kg is null) as unavailable_growth_rows
FROM batch_performance_check;

-- Read-only production regression; session claims reset by rollback.
begin;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $test$
declare r jsonb; b jsonb; c jsonb;
begin
r:=public.api_analytics_performance('ae4f719b-e29e-4f60-bae0-2429cf840c5d','2026-10-01','2026-10-01','2026-10-31',array['cage_harvests','batch_harvests']);
select x into b from jsonb_array_elements(r->'batch_harvests') x where x->>'batch_name'='03.26b';
select x into c from jsonb_array_elements(r->'cage_harvests') x where x->>'cage_name'='3D';
if b is null or c is null then raise exception 'Missing completed batch/cage'; end if;
if (b->>'total_stocked')::numeric<>4828 or (c->>'total_stocked')::numeric<>4770
or (b->>'cage_corrections')::numeric<>286 or (c->>'cage_corrections')::numeric<>286
or (b->>'mortalities')::numeric<>128 or (c->>'mortalities')::numeric<>70
or (b->>'harvest_number')::numeric<>4982 or (b->>'harvest_kg')::numeric<>608.2
or abs((b->>'feed_kg')::numeric-964.954)>0.001 or abs((c->>'feed_kg')::numeric-676.286)>0.001
or round((b->>'efcr')::numeric,2)<>1.72 or round((c->>'efcr')::numeric,2)<>1.74
or (b->>'age_days')::int<>194 then raise exception 'Harvest report regression'; end if;
r:=public.api_analytics_performance('ae4f719b-e29e-4f60-bae0-2429cf840c5d','2026-09-01','2026-09-01','2026-09-30',array['cage_harvests','batch_harvests']);
if exists(select 1 from jsonb_array_elements(r->'cage_harvests') x where x->>'cage_name'='3D')
or exists(select 1 from jsonb_array_elements(r->'batch_harvests') x where x->>'batch_name'='03.26b')
then raise exception 'Partial harvest shown as complete'; end if;
r:=public.api_analytics_performance('ae4f719b-e29e-4f60-bae0-2429cf840c5d','2026-10-01','2026-10-06','2026-10-06',array['batch_harvests']);
if jsonb_array_length(r->'batch_harvests')<>1 or r->'cage_harvests'<>'null'::jsonb then raise exception 'Date/section filter failed'; end if;
perform set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000001"}',true);
r:=public.api_analytics_performance('ae4f719b-e29e-4f60-bae0-2429cf840c5d','2026-10-01','2026-10-01','2026-10-31',array['cage_harvests','batch_harvests']);
if r->'batch_harvests'<>'[]'::jsonb or r->'cage_harvests'<>'[]'::jsonb then raise exception 'Non-member access'; end if;
end $test$;
rollback;

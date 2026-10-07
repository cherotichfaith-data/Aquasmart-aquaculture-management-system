create or replace function private.validate_cage_feed_plan() returns trigger language plpgsql set search_path=pg_catalog,public as $$
declare r jsonb; k text; seen text[]:=array[]::text[]; pair text;
begin
 if new.source_as_of > (now() at time zone 'Africa/Nairobi')::date then raise exception 'Source date cannot be in the future'; end if;
 for r in select value from jsonb_array_elements(new.rows) loop
  if jsonb_typeof(r) is distinct from 'object' then raise exception 'Invalid plan row'; end if;
  foreach k in array array['system_id','batch_id','stock_no','source_stock_no','abw_g'] loop
   if jsonb_typeof(r->k) is distinct from 'number' then raise exception 'Missing numeric input %',k; end if;
  end loop;
  foreach k in array array['cage_name','batch_name','sampled_on','stock_date'] loop
   if jsonb_typeof(r->k) is distinct from 'string' then raise exception 'Missing input %',k; end if;
  end loop;
  if (r->>'stock_no')::numeric not between 0 and 10000000 or trunc((r->>'stock_no')::numeric)<>(r->>'stock_no')::numeric
    or (r->>'abw_g')::numeric not between .3 and 1000
    or (r->>'sampled_on')::date>new.source_as_of or (r->>'stock_date')::date>new.source_as_of then raise exception 'Invalid starting values'; end if;
  if jsonb_typeof(r->'result') is distinct from 'object' then raise exception 'Missing results'; end if;
  foreach k in array array['phase','days','growth_pct','mortality_pct','efcr','deaths','end_fish','end_abw_g','feed_kg','average_daily_kg'] loop
   if jsonb_typeof(r->'result'->k) is distinct from 'number' or (r->'result'->>k)::numeric<0 then raise exception 'Invalid result %',k; end if;
  end loop;
  if (r->'result'->>'days')::numeric<>new.ends_on-new.starts_on+1 then raise exception 'Result period mismatch'; end if;
  if not exists(select 1 from public.system where id=(r->>'system_id')::bigint and farm_id=new.farm_id)
   or not exists(select 1 from public.fingerling_batch where id=(r->>'batch_id')::bigint and farm_id=new.farm_id) then raise exception 'Cage and batch must belong to the farm'; end if;
  pair:=(r->>'system_id')||':'||(r->>'batch_id');
  if pair=any(seen) then raise exception 'Duplicate cage/batch'; end if;
  seen:=array_append(seen,pair);
 end loop;
 new.created_at:=clock_timestamp();new.created_by:=auth.uid();return new;
end $$;

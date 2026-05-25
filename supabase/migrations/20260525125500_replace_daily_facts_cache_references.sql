-- After collapsing analytics.daily_system_facts_cache into
-- analytics.daily_system_facts, rewrite remaining RPC bodies that still
-- referenced the removed cache relation.

do $$
declare
  v_function_sql text;
begin
  select pg_get_functiondef(
    'public.api_dashboard_consolidated(uuid,bigint,date,date,text,integer,boolean)'::regprocedure
  )
  into v_function_sql;

  execute replace(
    v_function_sql,
    'analytics.daily_system_facts_cache',
    'analytics.daily_system_facts'
  );

  select pg_get_functiondef(
    'public.api_kpi_coverage(uuid,date,date)'::regprocedure
  )
  into v_function_sql;

  execute replace(
    v_function_sql,
    'analytics.daily_system_facts_cache',
    'analytics.daily_system_facts'
  );
end $$;

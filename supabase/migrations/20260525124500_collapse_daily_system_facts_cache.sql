-- Collapse analytics.daily_system_facts + analytics.daily_system_facts_cache
-- into one materialized canonical facts object. The cache was only SELECT *
-- FROM the view, so keep the current view definition and materialize it
-- directly under the canonical name.

do $$
declare
  v_daily_sql text;
  v_production_sql text;
  v_efcr_sql text;
begin
  select pg_get_viewdef('analytics.daily_system_facts'::regclass, true)
  into v_daily_sql;

  select pg_get_viewdef('analytics.production_summary'::regclass, true)
  into v_production_sql;

  select pg_get_viewdef('analytics.efcr_period_last_sampling_view'::regclass, true)
  into v_efcr_sql;

  drop materialized view if exists analytics.efcr_period_last_sampling_view;
  drop materialized view if exists analytics.production_summary;
  drop materialized view if exists analytics.daily_system_facts_cache;
  drop view if exists analytics.daily_system_facts;

  execute 'create materialized view analytics.daily_system_facts as ' || v_daily_sql;

  create unique index daily_system_facts_pk
    on analytics.daily_system_facts using btree (system_id, inventory_date);

  create index daily_system_facts_farm_date_idx
    on analytics.daily_system_facts using btree (farm_id, inventory_date, system_id);

  create index daily_system_facts_system_date_desc_idx
    on analytics.daily_system_facts using btree (system_id, inventory_date desc);

  comment on materialized view analytics.daily_system_facts is
    'Canonical materialized daily model input layer. Uses operation lineage across transfers, ABW anchors for biomass, system volume for density, and clamps analytical live inventory/biomass at zero.';

  grant select on analytics.daily_system_facts to service_role;

  execute 'create materialized view analytics.production_summary as ' || v_production_sql;

  create index production_summary_system_date_idx
    on analytics.production_summary using btree (system_id, date);

  create index production_summary_cycle_date_idx
    on analytics.production_summary using btree (cycle_id, date);

  grant all on table analytics.production_summary to service_role;

  execute 'create materialized view analytics.efcr_period_last_sampling_view as ' || v_efcr_sql;

  grant all on table analytics.efcr_period_last_sampling_view to service_role;
end $$;

create or replace function public.process_inventory_queue(p_limit integer default 50)
returns table(processed_system_id bigint, processed_from_date date, processed_to_date date, upserted_days integer)
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'analytics'
as $$
declare
  r record;
  v_has_queue boolean;
begin
  select exists (select 1 from public._affected_systems)
  into v_has_queue;

  if v_has_queue then
    refresh materialized view analytics.daily_fish_inventory_table;
    refresh materialized view analytics.daily_system_facts;
    refresh materialized view analytics.production_summary;
    refresh materialized view analytics.efcr_period_last_sampling_view;
  end if;

  for r in
    select system_id, min_affected_date
    from public._affected_systems
    order by min_affected_date asc
    limit greatest(1, least(coalesce(p_limit, 50), 500))
  loop
    processed_system_id := r.system_id;
    processed_from_date := r.min_affected_date;
    processed_to_date := current_date;
    upserted_days := 0;
    return next;
  end loop;

  delete from public._affected_systems
  where system_id in (
    select system_id
    from public._affected_systems
    order by min_affected_date asc
    limit greatest(1, least(coalesce(p_limit, 50), 500))
  );
end;
$$;

alter function public.process_inventory_queue(integer) owner to postgres;

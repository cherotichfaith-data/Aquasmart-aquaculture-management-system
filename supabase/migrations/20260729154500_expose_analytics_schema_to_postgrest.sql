alter role authenticator set pgrst.db_schemas = 'public,storage,graphql_public,analytics';
alter role authenticator set pgrst.db_extra_search_path = 'public,extensions,analytics';

grant usage on schema analytics to anon, authenticated, service_role;
grant select on table analytics.production_summary to anon, authenticated, service_role;
grant select on table analytics.daily_system_facts to anon, authenticated, service_role;

notify pgrst, 'reload config';
notify pgrst, 'reload schema';

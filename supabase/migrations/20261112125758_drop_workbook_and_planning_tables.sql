-- Remove the workbook-import, monthly-review and planning-defaults tables. The data came from the
-- production workbook / is no longer used by the app (rows backed up to JSON before this ran).
-- api_monthly_production_inputs read production_monthly_review, so it goes with it.
begin;
drop function if exists public.api_monthly_production_inputs(uuid, date);
drop table if exists public.production_workbook_month;
drop table if exists public.production_workbook_import;
drop table if exists public.production_monthly_review;
drop table if exists public.production_planning_settings;
commit;

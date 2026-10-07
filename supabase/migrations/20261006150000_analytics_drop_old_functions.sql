-- Drop the per-report analytics functions replaced by api_analytics_outlook / api_analytics_performance.
drop function if exists public.api_analytics_batch_report(uuid, date, date, date);
drop function if exists public.api_analytics_cage_harvest_report(uuid, date, date, date);
drop function if exists public.api_analytics_feed_vs_expected(uuid, date, date, date);
drop function if exists public.api_analytics_forward_planning(uuid, date, integer, double precision, double precision, text, double precision);
drop function if exists public.api_analytics_farm_forecast(uuid, date, integer, integer, double precision, double precision, text, double precision);

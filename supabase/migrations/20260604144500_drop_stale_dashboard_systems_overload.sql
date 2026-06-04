-- Migration: drop_stale_dashboard_systems_overload
-- Date: 2026-06-04
-- Summary:
--   Remove the pre-clean_matviews api_dashboard_systems overload whose
--   argument order conflicts with PostgREST RPC resolution.

DROP FUNCTION IF EXISTS public.api_dashboard_systems(
  uuid,
  public.system_growth_stage,
  bigint,
  date,
  date
);

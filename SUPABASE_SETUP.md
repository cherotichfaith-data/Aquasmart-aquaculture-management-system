# Supabase Dashboard Materialized View Setup

This document provides instructions for setting up the materialized view in Supabase that provides pre-calculated KPI metrics across different time periods.

## Prerequisites

The following tables must already exist in your Supabase database:

**Source Tables (containing raw data):**
- `public.fish_sampling_weight` - Fish weight samples
- `public.daily_fish_inventory_table` - Daily fish counts
- `public.production_cycle` - Production cycle records
- `public.fish_stocking` - Fish stocking records
- `public.fish_harvest` - Fish harvest records
- `public.fish_transfer` - Fish transfer records
- `public.fish_mortality` - Fish mortality records
- `public.feeding_record` - Feeding records
- `public.system` - System/tank information

**Configuration Tables (must be created if not present):**
- `public.input` - Stores the current date range bounds
- `public.dashboard_time_period` - Defines time periods (7d, 30d, 90d, 180d, 365d)

**Enums:**
- `time_period`, `system_growth_stage`, `water_quality_rating`, `arrows`

## Step 1: Create the Materialized Views

### Step 1a: Create Production Summary View (Required First)

1. Open your Supabase SQL Editor
2. Create a new query
3. Copy the SQL from [create_production_summary_materialized_view.sql](./supabase/migrations/create_production_summary_materialized_view.sql)
4. Paste and execute the entire SQL statement

**This creates:**
- Materialized view `public.production_summary` with aggregated production metrics
- Indexes for faster queries by system_id, cycle_id, and date

### Step 1b: Create Dashboard View (Required Second)

1. Create another new query in Supabase SQL Editor
2. Copy the SQL from [create_dashboard_materialized_view.sql](./supabase/migrations/create_dashboard_materialized_view.sql)
3. Paste and execute the entire SQL statement

**This creates:**
- Materialized view `public.dashboard` with pre-calculated KPI metrics
- Indexes for faster queries by time_period and system_id

## Step 5: Populate Input Table

Ensure the `input` table has a record with today's date as the end date:

```sql
-- Check existing records
SELECT * FROM public.input ORDER BY created_at DESC LIMIT 1;

-- If no record exists, or if the record is stale, insert a new one:
-- First, delete old records (keep only 1 active)
DELETE FROM public.input 
WHERE created_at < NOW() - INTERVAL '1 day';

-- Insert current date range (today as end date)
INSERT INTO public.input (input_start_date, input_end_date)
VALUES (CURRENT_DATE - INTERVAL '1 year', CURRENT_DATE)
ON CONFLICT DO NOTHING;
```

## Step 6: Populate dashboard_time_period Table

Ensure time period records exist with correct day counts:

```sql
-- Check existing records
SELECT * FROM public.dashboard_time_period ORDER BY time_period;

-- If records don't exist, insert them:
INSERT INTO public.dashboard_time_period (time_period, days_since_start, days_since_end)
VALUES
  ('day', 0, 0),
  ('week', 7, 0),
  ('2 weeks', 14, 0),
  ('month', 30, 0),
  ('quarter', 90, 0),
  ('6 months', 180, 0),
  ('year', 365, 0)
ON CONFLICT (time_period) DO UPDATE
SET 
  days_since_start = EXCLUDED.days_since_start,
  days_since_end = EXCLUDED.days_since_end;
```

## Step 7: Refresh the Materialized Views

Execute the refresh commands to populate both views with calculated data:

```sql
-- Refresh production_summary first (it's the base for dashboard)
REFRESH MATERIALIZED VIEW CONCURRENTLY public.production_summary;

-- Wait for completion, then refresh dashboard
REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard;
```

**Note:** Use `REFRESH MATERIALIZED VIEW CONCURRENTLY` to avoid locking queries during refresh.
Both views may take 1-2 minutes to calculate depending on your data size.

## Step 8: Set Up Automatic Refresh (Optional)

If the `input` table has triggers set up to refresh views, ensure the trigger function exists:

```sql
-- Check if trigger exists
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'refresh_after_input';

-- If you need to create the trigger function:
CREATE OR REPLACE FUNCTION trigger_refresh_all_materialized_views()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to input table (if not already created)
CREATE TRIGGER refresh_after_input
AFTER UPDATE OF input_start_date, input_end_date ON input
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_all_materialized_views();
```

## Verification

### Query the materialized views to verify they're working:

```sql
-- Check production_summary view
SELECT COUNT(*) as record_count FROM public.production_summary;

SELECT 
  system_id, 
  system_name, 
  date,
  activity,
  efcr_period,
  efcr_aggregated
FROM public.production_summary
ORDER BY date DESC
LIMIT 10;

-- Check dashboard view
SELECT COUNT(*) as record_count FROM public.dashboard;

SELECT 
  system_id, 
  system_name, 
  time_period,
  efcr,
  mortality_rate,
  average_biomass,
  water_quality_rating_numeric_average
FROM public.dashboard
WHERE time_period = 'week'
LIMIT 10;
```

## Frontend Integration

The frontend components are now configured to:
1. Query the `dashboard` materialized view directly
2. Pass `time_period` as a filter parameter
3. Display pre-calculated metrics (eFCR, mortality rate, biomass density, water quality)
4. Include date ranges from the materialized view in URL parameters

### Components Updated:
- `components/dashboard/kpi-overview.tsx` - Displays 4 main KPI cards
- `components/dashboard/systems-table.tsx` - Displays all systems with metrics
- `lib/supabase-queries.ts` - Queries dashboard view with time_period filter

## Troubleshooting

### View returns no data
- Check that `production_summary` table has data
- Verify `input` table has a current record with today's date
- Verify `dashboard_time_period` table has records for all periods
- Run `REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard;`

### Slow queries
- Ensure indexes were created: `idx_dashboard_time_period_system` and `idx_dashboard_system_id`
- Check query performance in Supabase Dashboard > Query Performance

### Permission errors
- Ensure your Supabase user has SELECT permissions on all source tables
- Ensure service_role has permissions to create and refresh materialized views

## Maintenance

### Update date ranges
Edit the `input` table to change the analysis period:
```sql
UPDATE public.input 
SET input_end_date = CURRENT_DATE, input_start_date = CURRENT_DATE - INTERVAL '2 years'
WHERE id = (SELECT id FROM public.input ORDER BY created_at DESC LIMIT 1);

REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard;
```

### Update time periods
If you want to add or modify time periods:
```sql
INSERT INTO public.dashboard_time_period (time_period, days_since_start)
VALUES ('3 months', 90)
ON CONFLICT (time_period) DO UPDATE
SET days_since_start = 90;

REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard;
```

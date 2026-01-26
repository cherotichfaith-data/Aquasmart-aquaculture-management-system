# Quick Start: Complete the Dashboard Setup

## ✅ What's Done
- ✅ Frontend components refactored to use materialized view
- ✅ SQL migration created with complete view definition
- ✅ Date range computation delegated to database (not client)
- ✅ KPI cards, systems table updated
- ✅ Build errors resolved
- ✅ No TypeScript errors

## 🔧 What You Need to Do

### Step 1: Execute Production Summary Migration (Required First)

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Create a new query
3. Copy the entire SQL from: `supabase/migrations/create_production_summary_materialized_view.sql`
4. Paste and execute

**⚠️ Important:** This must be created FIRST because the dashboard view depends on it.
This will take 1-2 minutes as it calculates metrics for all production cycles.

**After execution, refresh the view:**
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY public.production_summary;
```

### Step 2: Execute Dashboard Migration (Required Second)

1. Create a new query in Supabase SQL Editor
2. Copy the entire SQL from: `supabase/migrations/create_dashboard_materialized_view.sql`
3. Paste and execute

**⚠️ Important:** Execute this AFTER production_summary view is created and refreshed.

```sql
-- After execution, refresh the view
REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard;
```

### Step 3: Verify Input Table (Required)

The `input` table must have a record with today's date:

```sql
-- Copy this to Supabase SQL Editor

-- Check current record
SELECT * FROM public.input ORDER BY created_at DESC LIMIT 1;

-- If no record or stale data, insert:
DELETE FROM public.input WHERE id > 0;

INSERT INTO public.input (input_start_date, input_end_date)
VALUES (
  CURRENT_DATE - INTERVAL '2 years',  -- 2 year history
  CURRENT_DATE                         -- Today
);
```

### Step 4: Verify dashboard_time_period Table (Required)

```sql
-- Copy this to Supabase SQL Editor

-- Check existing records
SELECT * FROM public.dashboard_time_period ORDER BY time_period;

-- Insert time periods (if not present):
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

### Step 5: Refresh the Materialized Views (Required)

```sql
-- Copy this to Supabase SQL Editor
-- This populates the dashboard view with calculated metrics

REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard;

-- Wait for completion (may take 1-2 minutes depending on data size)
```

### Step 5: Verify Data in Dashboard View

```sql
-- Copy this to verify the view has data

SELECT 
  time_period,
  COUNT(*) as record_count,
  COUNT(DISTINCT system_id) as system_count
FROM public.dashboard
GROUP BY time_period
ORDER BY time_period;

-- Should show records for: week, month, quarter, 6 months, year
```

## 🚀 Test the Dashboard

1. Start the development server: `npm run dev`
2. Navigate to the dashboard
3. Verify:
   - [ ] KPI cards display values (eFCR, Mortality, Biomass, Water Quality)
   - [ ] Time period selector changes values when clicked
   - [ ] Switching between week/month/quarter/year updates the display
   - [ ] Systems table shows all systems with their metrics
   - [ ] Clicking a system navigates to the production page with date range

## 📊 Expected Data Flow

```
Time Period: "week" (7 days)
    ↓
Dashboard materialized view filters by time_period = "week"
    ↓
Returns pre-calculated metrics for last 7 days
    ↓
KPI cards display: eFCR, Mortality%, Biomass(kg), Water Quality(0-3)
    ↓
Systems table shows all systems with these metrics
```

## 🔍 Troubleshooting

### Dashboard shows "No KPI data available"
- **Check 1:** Run `SELECT COUNT(*) FROM public.production_summary;` - should be > 0
- **Check 2:** Run `SELECT COUNT(*) FROM public.dashboard;` - should be > 0
- **Check 3:** Verify source tables (fish_sampling_weight, fish_stocking, fish_harvest, etc.) have data
- **Check 4:** Refresh views: 
  ```sql
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.production_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard;
  ```
- **Check 5:** Check browser console for errors (Ctrl+F12)

### Time period selector doesn't update KPI values
- **Check:** Ensure materialized view was refreshed successfully
- **Fix:** Run refresh command again: `REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard;`

### Metrics show as "NaN" or "--"
- **Likely cause:** No data for selected time period in production_summary
- **Fix:** Insert test data or select a different time period

### Slow loading / timeout
- **Cause:** Materialized view calculation is still running
- **Fix:** Wait for refresh to complete, check `dashboard_time_period` records

## 📝 File Documentation

| File | Purpose |
|------|---------|
| `SUPABASE_SETUP.md` | Complete setup guide with all SQL commands |
| `IMPLEMENTATION_SUMMARY.md` | Technical overview of all changes |
| `supabase/migrations/create_dashboard_materialized_view.sql` | SQL migration with view definition |
| `components/dashboard/kpi-overview.tsx` | KPI cards component |
| `components/dashboard/systems-table.tsx` | Systems metrics table |

## 🎯 Next Steps After Setup

1. ✅ Complete steps 1-5 above
2. ✅ Verify data appears in dashboard
3. Optional: Set up automatic refresh trigger
   ```sql
   -- Run this to enable auto-refresh when input dates change:
   CREATE OR REPLACE FUNCTION trigger_refresh_all_materialized_views()
   RETURNS TRIGGER AS $$
   BEGIN
     REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;
   
   CREATE TRIGGER refresh_after_input
   AFTER UPDATE OF input_start_date, input_end_date ON input
   FOR EACH STATEMENT
   EXECUTE FUNCTION trigger_refresh_all_materialized_views();
   ```

## ❓ Questions?

Check `SUPABASE_SETUP.md` for detailed explanation of each component and SQL query.

---

**Status:** Ready for Supabase configuration ✅

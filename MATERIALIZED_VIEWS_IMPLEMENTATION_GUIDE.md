## 🚀 AQUASMART MATERIALIZED VIEWS - IMPLEMENTATION GUIDE

**Last Updated:** January 23, 2026  
**Status:** Ready for Production Deployment

---

## 📋 Overview

This guide covers the **improved materialized views system** designed for responsive frontend integration and optimal database performance. The improvements focus on:

- ✅ **Time Period Logic**: Simplified, parameterizable date range calculations
- ✅ **Frontend Responsiveness**: Direct WHERE clause filtering (no post-processing)
- ✅ **Efficient Computation**: Reduced CTEs, better join strategies
- ✅ **Real-time Data**: New health snapshot view for immediate status
- ✅ **Trend Detection**: Built-in delta calculations for trend arrows
- ✅ **Caching Awareness**: Timestamps for cache invalidation

---

## 🏗️ Architecture Overview

### Three Optimized Materialized Views

```
┌──────────────────────────────────────────────────────────────┐
│                    AQUASMART DATA LAYER                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. production_summary (Base Layer)                          │
│     ├─ All production events with aggregated metrics         │
│     ├─ Refreshed: Weekly                                     │
│     └─ Query Pattern: WHERE system_id = ? AND date BETWEEN  │
│                                                              │
│  2. dashboard (Time-Period KPIs)                             │
│     ├─ Pre-calculated KPIs per system × time period          │
│     ├─ Metrics: eFCR, ABW, mortality, feeding rate, etc     │
│     ├─ Refreshed: Nightly (or on-demand)                     │
│     └─ Query Pattern: WHERE system_id = ? AND time_period = ?│
│                                                              │
│  3. dashboard_consolidated (Farm-Wide Summary)              │
│     ├─ Aggregated metrics across all systems                 │
│     ├─ Includes trend deltas vs previous period              │
│     ├─ Refreshed: Nightly (or on-demand)                     │
│     └─ Query Pattern: WHERE time_period = ?                  │
│                                                              │
│  4. system_health_snapshot (Real-Time Status) ⭐ NEW         │
│     ├─ Latest metrics without time period filtering          │
│     ├─ Always current (refreshed frequently)                 │
│     └─ Query Pattern: WHERE system_id = ? OR SELECT *        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔧 Implementation Steps

### Step 1: Deploy SQL Migrations

1. **Open Supabase Dashboard** → SQL Editor
2. **Copy SQL from** `IMPROVED_MATERIALIZED_VIEWS.sql`
3. **Execute in order**:
   ```sql
   -- First: production_summary (takes 1-2 minutes)
   -- Then: dashboard (takes 2-3 minutes)
   -- Then: dashboard_consolidated (takes 1-2 minutes)
   -- Finally: system_health_snapshot (takes <1 minute)
   ```

**⚠️ Important Notes:**
- Execute each view separately (don't paste all at once)
- Wait for each to complete before proceeding to next
- Monitor **Supabase → Database → Index Usage** to verify indexes are created
- If errors occur, check that `dashboard_time_period` table exists with at least 5 rows

### Step 2: Populate Configuration Tables

Ensure these tables are populated in Supabase:

```sql
-- dashboard_time_period table (required)
INSERT INTO public.dashboard_time_period (time_period, days_since_start)
VALUES 
  ('week', 7),
  ('month', 30),
  ('quarter', 90),
  ('6 months', 180),
  ('year', 365)
ON CONFLICT (time_period) DO NOTHING;

-- input table (required for date ranges)
INSERT INTO public.input (input_start_date, input_end_date)
VALUES (CURRENT_DATE - INTERVAL '365 days', CURRENT_DATE)
ON CONFLICT DO NOTHING;
```

### Step 3: Update Frontend Queries

Replace old queries in your React components:

**Before (Old):**
```typescript
// Old inefficient approach
const result = await fetchDashboardSnapshot({ system_id: 1, time_period: 'month' })
const metrics = computeMetricsOnClient(result)
```

**After (Optimized):**
```typescript
// New efficient approach
import { fetchSystemDashboard, fetchComprehensiveDashboard } from '@/lib/supabase-queries-improved'

const kpi = await fetchSystemDashboard(1, 'month')
// All metrics already computed at database level
console.log(kpi?.efcr, kpi?.abw, kpi?.mortality_rate)
```

### Step 4: Set Up Automated Refresh

Create a scheduled job to refresh materialized views:

**Option A: Supabase Cron (Recommended)**
```sql
-- Refresh daily at 2 AM UTC
SELECT cron.schedule(
  'refresh-dashboard-views',
  '0 2 * * *',
  $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY production_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard;
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_consolidated;
  REFRESH MATERIALIZED VIEW CONCURRENTLY system_health_snapshot;
  $$
);
```

**Option B: External Service (e.g., GitHub Actions, Vercel Cron)**
```typescript
// api/cron/refresh-views.ts
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  const supabase = createClient(URL, KEY)
  
  await supabase.rpc('refresh_all_materialized_views')
  
  return new Response(JSON.stringify({ success: true }))
}
```

Create helper function in database:
```sql
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY production_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard;
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_consolidated;
  REFRESH MATERIALIZED VIEW CONCURRENTLY system_health_snapshot;
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 Frontend Query Patterns

### Pattern 1: Single System KPI Dashboard

```typescript
// Fetch KPIs for one system, one time period
const kpi = await fetchSystemDashboard(systemId, 'month')

if (kpi) {
  return (
    <div>
      <KPICard label="eFCR" value={kpi.efcr} trend="up" />
      <KPICard label="ABW" value={kpi.abw} unit="g" trend="up" />
      <KPICard label="Mortality" value={kpi.mortality_rate * 100} unit="%" trend="down" />
    </div>
  )
}
```

### Pattern 2: System Trends Comparison

```typescript
// Compare system across multiple time periods
const trends = await fetchSystemDashboardTrends(systemId)

const chartData = transformDashboardForCharts(trends)

return <LineChart data={chartData} />
```

### Pattern 3: Farm Overview

```typescript
// Get everything for farm dashboard
const farmData = await fetchFarmOverview('month')

return (
  <div>
    {/* Farm-wide summary */}
    <FarmSummaryCard data={farmData.summary} />
    
    {/* All systems' KPIs */}
    <SystemsGrid systems={farmData.systems} />
    
    {/* Real-time health status */}
    <HealthStatusBoard health={farmData.health} />
  </div>
)
```

### Pattern 4: System Detail Page

```typescript
// Complete system detail with all contexts
const data = await fetchComprehensiveDashboard(systemId, 'month')

return (
  <div>
    {/* KPIs for selected time period */}
    <KPISection kpi={data.kpi} />
    
    {/* Real-time health snapshot */}
    <HealthSnapshotCard health={data.health} />
    
    {/* Recent production history */}
    <ProductionHistory records={data.recent} />
    
    {/* Trend chart across all time periods */}
    <TrendChart trends={data.trends} />
  </div>
)
```

### Pattern 5: Real-Time Status Without Time Period

```typescript
// Quick health check (no time period needed)
const health = await fetchSystemHealth(systemId)

return (
  <QuickStatus
    abw={health?.latest_abw}
    biomassPerM3={health?.latest_biomass_density}
    waterQuality={health?.latest_water_quality_status}
  />
)
```

---

## ⚡ Performance Characteristics

### Query Latency

| Query | Expected Latency | Notes |
|-------|------------------|-------|
| `fetchSystemDashboard()` | < 50ms | Direct index lookup |
| `fetchAllSystemsDashboard()` | 50-200ms | Single time period scan |
| `fetchComprehensiveDashboard()` | 100-300ms | Parallel queries |
| `fetchFarmOverview()` | 150-400ms | Farm-wide aggregation |
| `fetchSystemHealth()` | < 30ms | Real-time snapshot |

### Database Load

- **Read-Only**: All queries are SELECT only
- **Index Coverage**: All critical filters have indexes
- **CONCURRENTLY Support**: Views can be refreshed without locking reads
- **Materialized**: Pre-computed, no live calculation overhead

---

## 🎯 Time Period Logic Explained

### How Time Periods Work

```
Current Date: 2024-12-15

time_period = 'week' (7 days)
├─ start_date: 2024-12-08
└─ end_date: 2024-12-15

time_period = 'month' (30 days)
├─ start_date: 2024-11-15
└─ end_date: 2024-12-15

time_period = 'custom'
├─ Uses dates from `input` table
└─ start_date & end_date from last row
```

### Adding Custom Time Periods

To add a new time period (e.g., "2 weeks"):

```sql
INSERT INTO dashboard_time_period (time_period, days_since_start)
VALUES ('2 weeks', 14);

-- Then refresh views
REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard;
```

Frontend automatically includes new period:
```typescript
const trends = await fetchSystemDashboardTrends(systemId, 
  ['week', '2 weeks', 'month', 'quarter', 'year'])
```

---

## 🔍 Monitoring & Troubleshooting

### Check View Freshness

```typescript
const freshness = await getViewFreshness('dashboard')
console.log(`Dashboard view generated ${freshness} seconds ago`)

if (freshness > 3600) {
  console.warn('Dashboard is stale, consider refreshing')
}
```

### Verify View Data Quality

```sql
-- Check row counts
SELECT 'production_summary' as view, COUNT(*) FROM production_summary
UNION ALL
SELECT 'dashboard', COUNT(*) FROM dashboard
UNION ALL
SELECT 'dashboard_consolidated', COUNT(*) FROM dashboard_consolidated;

-- Check for NULL values
SELECT system_id, time_period, 
  COUNT(*) as null_efcr,
  SUM(CASE WHEN efcr IS NULL THEN 1 ELSE 0 END) as missing
FROM dashboard
GROUP BY system_id, time_period
HAVING SUM(CASE WHEN efcr IS NULL THEN 1 ELSE 0 END) > 0;
```

### Refresh a Specific View

```sql
-- Manual refresh (blocks reads for duration)
REFRESH MATERIALIZED VIEW production_summary;

-- Non-blocking refresh (recommended)
REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard;
```

### Performance Monitoring

```sql
-- Check index usage
SELECT 
  schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename IN ('dashboard', 'production_summary', 'system_health_snapshot')
ORDER BY idx_scan DESC;

-- Check query performance
EXPLAIN ANALYZE
SELECT * FROM dashboard 
WHERE system_id = 1 AND time_period = 'month';
```

---

## 🚨 Common Issues & Solutions

### Issue 1: "Materialized view does not exist"

**Cause**: SQL not executed successfully  
**Solution**:
1. Check Supabase SQL Editor for error messages
2. Verify `dashboard_time_period` table exists
3. Re-run individual CREATE statements

### Issue 2: Null values in eFCR or other metrics

**Cause**: Data mismatch or sampling gaps  
**Solution**:
```sql
-- Check for sampling data
SELECT system_id, COUNT(*) FROM production_summary 
WHERE activity = 'sampling' 
GROUP BY system_id;

-- If zero results, insert test data
INSERT INTO fish_sampling_weight (system_id, date, abw)
VALUES (1, CURRENT_DATE, 50.0);
```

### Issue 3: View refresh takes too long

**Cause**: Large dataset, complex CTEs  
**Solution**:
1. Refresh during off-peak hours
2. Increase `work_mem` in Supabase settings
3. Refresh non-critical views less frequently
4. Consider partitioning large views by year

### Issue 4: Frontend queries return stale data

**Cause**: View refresh didn't complete  
**Solution**:
```typescript
// Add freshness check before using data
const freshness = await getViewFreshness('dashboard')
if (freshness && freshness > 7200) {
  console.warn('Data is >2 hours old')
  // Show warning to user
}
```

---

## 📈 New Trend Detection System

The improved views include automatic trend detection:

```typescript
// Access trend status directly from consolidated view
const farm = await fetchFarmDashboard('month')

console.log(farm.efcr_trend)           // 'up' | 'down' | 'stable'
console.log(farm.abw_trend)            // 'up' | 'down' | 'stable'
console.log(farm.mortality_trend)      // 'up' | 'down' | 'stable'
console.log(farm.biomass_density_trend) // 'up' | 'down' | 'stable'
```

Trend thresholds (configurable):
- **eFCR**: ±0.1 change = trend
- **ABW**: ±10g change = trend
- **Mortality**: ±0.01 (1%) change = trend
- **Biomass Density**: ±0.5 kg/m³ change = trend

---

## 🎓 Testing Checklist

Before deploying to production:

- [ ] Deploy all 4 materialized views
- [ ] Populate `dashboard_time_period` table
- [ ] Populate `input` table with date ranges
- [ ] Run test queries for each view
- [ ] Verify index creation in Supabase
- [ ] Test frontend queries with new functions
- [ ] Set up automated refresh schedule
- [ ] Monitor view freshness for 24 hours
- [ ] Document time period update procedures
- [ ] Train team on new query patterns

---

## 📚 Related Files

- `IMPROVED_MATERIALIZED_VIEWS.sql` - SQL migrations
- `lib/supabase-queries-improved.ts` - TypeScript query functions
- `ARCHITECTURE.md` - Original architecture reference
- `README_DASHBOARD.md` - Dashboard overview

---

## 🔗 Quick Reference

### Import & Use Pattern

```typescript
import {
  fetchSystemDashboard,
  fetchComprehensiveDashboard,
  fetchFarmOverview,
  fetchSystemHealth,
  transformDashboardForCharts,
  calculateTrend,
  formatKPI,
} from '@/lib/supabase-queries-improved'

// Example usage
const data = await fetchComprehensiveDashboard(1, 'month')
const trend = calculateTrend(data.kpi?.efcr_delta)
const formatted = formatKPI(data.kpi?.efcr, 'efcr')
```

---

**Questions or Issues?** Refer to the troubleshooting section or check view freshness and data quality.

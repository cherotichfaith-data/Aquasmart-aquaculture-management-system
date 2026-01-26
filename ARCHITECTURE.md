# Dashboard Architecture - Complete Guide

## System Overview

The dashboard uses a **pre-computed materialized view** pattern that calculates KPI metrics at the database level, rather than computing them on the client or in complex queries.

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Time Period Selector: week | month | quarter | year       │ │
│  └────────────────────────────────────────────────────────────┘ │
│           ↓                                    ↓                 │
│    ┌──────────────┐              ┌────────────────────┐        │
│    │  KPI Cards   │              │  Systems Table     │        │
│    │ - eFCR       │              │ - All metrics      │        │
│    │ - Mortality  │              │ - With pagination  │        │
│    │ - Biomass    │              │ - Click for detail │        │
│    │ - Water Q.   │              └────────────────────┘        │
│    └──────────────┘                                            │
└──────────────────┬─────────────────────────┬──────────────────┘
                   │                         │
                   └─────────┬───────────────┘
                             │
                   ┌─────────▼────────┐
                   │  Supabase Query  │
                   │  time_period=?   │
                   └─────────┬────────┘
                             │
                   ┌─────────▼──────────────────┐
                   │ Materialized View: public. │
                   │     dashboard             │
                   │ (pre-calculated metrics)  │
                   └─────────┬──────────────────┘
                             │
        ┌────────────┬────────┼────────┬──────────┐
        │            │        │        │          │
    ┌───▼───┐   ┌───▼───┐   ┌▼───┐  ┌▼──────┐  ┌▼─────────┐
    │ start │   │  end  │   │    │  │ water │  │ biomass  │
    │ data  │   │ data  │   │efcr│  │quality│  │ density  │
    └───┬───┘   └───┬───┘   └┬───┘  └┬──────┘  └┬─────────┘
        │           │        │       │         │
        └───────────┼────────┼───────┴─────────┘
                    │        │
            ┌───────▼───────┬▼─────────────────┐
            │ CTEs Calculate:                   │
            │ - eFCR from feed/biomass         │
            │ - Mortality from fish counts     │
            │ - Biomass from system volume    │
            │ - Water quality from ratings    │
            └───────┬─────────────────────────┘
                    │
        ┌───────────┴────────────┐
        │ Source Tables:         │
        │ - production_summary   │
        │ - system               │
        │ - daily_water_quality_ │
        │   rating               │
        │ - input (date range)   │
        │ - dashboard_time_      │
        │   period (periods)     │
        └────────────────────────┘
```

## Database Layer: Materialized Views

The dashboard uses **two materialized views** that work together:

```
┌──────────────────────────────────────────────────┐
│ Source Tables:                                   │
│ - fish_sampling_weight                           │
│ - daily_fish_inventory_table                     │
│ - production_cycle, fish_stocking, fish_harvest  │
│ - fish_transfer, fish_mortality                  │
│ - feeding_record                                 │
│ - system                                         │
│ - daily_water_quality_rating                     │
└────────────┬─────────────────────────────────────┘
             │
   ┌─────────▼──────────────────────┐
   │ View 1: production_summary      │
   │ ├── 17 CTEs                     │
   │ ├── Feed aggregations           │
   │ ├── Mortality tracking          │
   │ ├── Transfer data               │
   │ ├── Harvest & stocking          │
   │ └── eFCR calculations           │
   │ (Period & Aggregated)           │
   └────────────┬────────────────────┘
                │ (source for)
   ┌────────────▼──────────────────────┐
   │ View 2: dashboard                 │
   │ ├── 24 CTEs                       │
   │ ├── Time period calculations      │
   │ ├── Metric aggregations           │
   │ ├── Water quality averaging       │
   │ └── Pre-calculated KPIs           │
   │ (Ready for UI)                    │
   └─────────────────────────────────┘
```

### View 1: Production Summary Materialized View

**Purpose:** Pre-aggregates all production data (feeding, mortality, transfers, harvest, stocking) at each activity point in the production cycle.

**Structure:** Contains 30+ columns with period and aggregated metrics:
- Feed amounts (period and cumulative)
- Biomass data (individual and aggregated)
- Mortality counts (daily and cumulative)
- Fish transfers (in/out, period and aggregated)
- Harvest data (period and aggregated)
- Stocking data (period and aggregated)
- eFCR calculations (both period and aggregated forms)

**Key Calculation:** eFCR = Feed / (Biomass Increase + Transfers Out - Transfers In + Harvested - Stocked)

**Data Points:** One row per activity per cycle (stocking, sampling, harvest)

---

### View 2: Dashboard Materialized View

A materialized view is a database object that stores the **result** of a query, like a cached table. Benefits:

1. **Performance**: Queries run in milliseconds instead of seconds
2. **Consistency**: Single source of truth for all metrics
3. **Simplicity**: Pre-calculated values reduce client-side logic
4. **Scalability**: Refresh happens server-side on a schedule

### The Dashboard View Structure

The `public.dashboard` view contains **24 columns**:

```
Core Dimensions:
- system_id, system_name, growth_stage
- input_start_date, input_end_date (analysis period)
- time_period (week, month, quarter, 6 months, year)
- sampling_start_date, sampling_end_date

eFCR Metrics:
- efcr (feed conversion ratio)
- efcr_latest_date
- efcr_arrow (up/down/straight indicator)

ABW (Average Body Weight):
- abw (in grams)
- abw_latest_date
- abw_arrow

Feeding Rate:
- feeding_rate (kg per day per kg biomass)
- feeding_rate_latest_date
- feeding_rate_arrow

Mortality Rate:
- mortality_rate (decimal, e.g., 0.05 = 5%)
- mortality_rate_latest_date
- mortality_rate_arrow

Biomass Metrics:
- biomass_density (kg per m³)
- average_biomass (total biomass in system)
- biomass_density_arrow

Average Number of Fish:
- average_number_of_fish

Water Quality:
- water_quality_rating_numeric_average (0-3 scale)
- water_quality_rating_average (optimal/acceptable/critical/lethal enum)
- water_quality_latest_date
- water_quality_arrow
```

### Calculation Method

The dashboard view depends on the production_summary view and uses **sampling dates** from actual production records:

1. **Production Summary View (prerequisite)**:
   - Aggregates all feeding, mortality, transfer, harvest, and stocking data
   - Calculates period and aggregated eFCR for each activity
   - One row per activity per production cycle

2. **Dashboard Date Calculation CTEs**:
   - Gets date bounds from `input` table
   - Calculates relative dates using `dashboard_time_period` records
   - Creates date ranges for each time period

3. **Sampling Date Selection**:
   - Finds the actual production_summary date closest to the start date
   - Finds the actual production_summary date closest to the end date
   - Uses these real dates instead of fixed intervals

4. **Metric Calculation** (from production_summary data):
   - eFCR: Pre-calculated in production_summary, aggregated for period
   - Mortality: (cumulative_mortality) / (average_fish_count)
   - Feeding Rate: (feed_consumed) / (average_biomass)
   - Biomass Density: (total_biomass) / (system_volume)
   - Water Quality: Average of ratings within period

### Why This Two-View Approach?

**Production Summary View:**
- Consolidates complex production data calculations
- Calculates eFCR for both period and full cycle
- Single source of truth for all production metrics

**Dashboard View:**
- Handles time period conversions
- Presents pre-filtered KPI data ready for UI
- Minimal processing needed by frontend

**vs. Client-side Computation:**
- ❌ Client would need large datasets and complex calculations
- ✅ Database pre-computes once, client gets simple results

**vs. On-demand Calculation:**
- ❌ Every query would repeat same calculations
- ✅ Materialized view caches results, refreshed on schedule

**vs. Multiple Views:**
- ❌ Multiple views would have duplicate logic
- ✅ Single view is source of truth

## Frontend Layer: React Components

### 1. KPI Overview Component
📁 `components/dashboard/kpi-overview.tsx`

**Props:**
```typescript
{
  stage: "all" | "grow_out" | "nursing"
  timePeriod: "week" | "month" | "quarter" | "6 months" | "year"
  system?: string  // optional: specific system ID
  batch?: string   // optional: fingerling batch
}
```

**Data Flow:**
```typescript
timePeriod changes → useEffect triggers → 
fetchDashboardSnapshot({ time_period: timePeriod }) →
Query materialized view →
Receive pre-calculated metrics →
Display in 4 KPI cards with trend arrows
```

**Metrics Displayed:**
1. **eFCR** (eFCR): Lower is better (inverted trend)
2. **Mortality Rate**: Percentage, lower is better (inverted trend)
3. **Average Biomass**: In kg, higher is better
4. **Water Quality**: 0-3 scale, higher is better

### 2. Systems Table Component
📁 `components/dashboard/systems-table.tsx`

**Features:**
- Lists all active systems
- Shows metrics for selected time period
- Paginated (8 rows per page)
- Click to navigate to production detail page

**Columns:**
- System Name
- eFCR (2 decimals)
- ABW (grams)
- Feeding Rate (3 decimals)
- Mortality Rate (%)
- Biomass Density
- Water Quality (status badge)

### 3. KPI Card Component
📁 `components/dashboard/kpi-card.tsx`

**Props:**
```typescript
{
  title: string           // "eFCR", "Mortality Rate", etc.
  average: number         // metric value
  trend?: number          // trend indicator (positive/negative/null)
  decimals?: number       // decimal places to show
  formatUnit?: string     // "kg", "%", etc.
  invertTrend?: boolean   // true if lower is better (e.g., mortality)
  neutral?: boolean       // don't color-code the trend
  href?: string           // link to detail page
  onClick?: () => void    // alternative to href
}
```

**Rendering:**
- Shows metric value with unit
- Displays sparkline chart
- Shows trend arrow (↑ ↓ →) with color coding
  - Green: positive metric
  - Red: negative metric
  - Gray: flat/neutral

## Query Functions

### `fetchDashboardSnapshot(filters)`
📁 `lib/supabase-queries.ts`

```typescript
async function fetchDashboardSnapshot(filters?: {
  system_id?: number
  time_period?: "week" | "month" | "quarter" | "6 months" | "year"
  growth_stage?: "grow_out" | "nursing"
}): Promise<DashboardRow | null>
```

**Query:**
```sql
SELECT * FROM public.dashboard
WHERE 
  (system_id = ? OR system_id IS NULL)
  AND (time_period = ? OR time_period IS NULL)
  AND (growth_stage = ? OR growth_stage IS NULL)
ORDER BY input_end_date DESC
LIMIT 1
```

**Returns:** Single row with pre-calculated metrics

### `fetchSystemsDashboard(filters)`

```typescript
async function fetchSystemsDashboard(filters?: {
  growth_stage?: "grow_out" | "nursing"
  system_id?: number
  time_period?: "week" | "month" | "quarter" | "6 months" | "year"
}): Promise<QueryResult<DashboardRow[]>>
```

**Returns:** All systems matching filters with metrics

## Data Update Flow

### Manual Refresh
```
Admin runs in Supabase SQL Editor:
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard;
  
  ↓
  
View processes all CTEs:
  - Calculates dates for each time period
  - Finds sampling dates for each system
  - Computes eFCR, mortality, feeding rate, etc.
  
  ↓
  
Results stored in materialized view table
(takes 1-2 minutes depending on data volume)
  
  ↓
  
Frontend queries immediately return new data
```

### Automatic Refresh (Optional)
```
Trigger: UPDATE input table
  ↓
Execute: trigger_refresh_all_materialized_views()
  ↓
Action: REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard
  ↓
Result: View updates without explicit call
```

## Time Period Mapping

| Frontend | Database | Days | SQL Computation |
|----------|----------|------|-----------------|
| "day" | time_period='day' | 0 | N/A (not typically used) |
| "week" | time_period='week' | 7 | input_end_date - 7 days |
| "2 weeks" | time_period='2 weeks' | 14 | input_end_date - 14 days |
| "month" | time_period='month' | 30 | input_end_date - 30 days |
| "quarter" | time_period='quarter' | 90 | input_end_date - 90 days |
| "6 months" | time_period='6 months' | 180 | input_end_date - 180 days |
| "year" | time_period='year' | 365 | input_end_date - 365 days |

**Note:** Exact dates used are actual sampling dates from `production_summary`, not calculated dates.

## Performance Characteristics

| Operation | Time | Notes |
|-----------|------|-------|
| View refresh | 1-2 min | Happens server-side, users not blocked |
| KPI card query | < 100 ms | Single index lookup |
| Systems table query | < 500 ms | Multiple rows, with pagination |
| Time period change | < 100 ms | Just switches filter parameter |

## Testing Workflow

1. **Verify Source Data**
   ```sql
   SELECT COUNT(*) FROM production_summary;
   SELECT COUNT(*) FROM daily_water_quality_rating;
   ```

2. **Check View Status**
   ```sql
   SELECT COUNT(*) FROM public.dashboard;
   SELECT time_period, COUNT(*) FROM public.dashboard GROUP BY time_period;
   ```

3. **Test Specific Query**
   ```sql
   SELECT * FROM public.dashboard 
   WHERE time_period = 'week' 
   LIMIT 5;
   ```

4. **Load Dashboard**
   - Browser: http://localhost:3000/dashboard
   - Check console (F12) for fetch status
   - Verify KPI cards display values
   - Change time period, verify values update

## Troubleshooting Decision Tree

```
Problem: KPI shows "No data"
  │
  ├─ Check: SELECT COUNT(*) FROM public.dashboard;
  │  │
  │  ├─ Result: 0 rows
  │  │  └─ Run: REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard;
  │  │
  │  └─ Result: > 0 rows
  │     └─ Check: Browser console for fetch error (F12)
  │
  ├─ Check: SELECT * FROM public.input;
  │  │
  │  └─ No rows? Insert current date:
  │     INSERT INTO public.input VALUES (CURRENT_DATE, CURRENT_DATE);
  │
  └─ Check: SELECT * FROM public.dashboard_time_period;
     │
     └─ Missing records? Insert:
        INSERT INTO dashboard_time_period (time_period, days_since_start)
        VALUES ('week', 7), ('month', 30), ...;

Problem: Time period doesn't change values
  │
  ├─ Check: Is view properly refreshed?
  │  └─ Run: REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard;
  │
  ├─ Check: Does selected period have data?
  │  └─ Run: SELECT * FROM public.dashboard WHERE time_period = 'month';
  │
  └─ Check: Browser cache?
     └─ Hard refresh: Ctrl+Shift+R or clear cookies
```

---

**Last Updated:** January 23, 2026
**Status:** Implementation Complete - Ready for Supabase Setup

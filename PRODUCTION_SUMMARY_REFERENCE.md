# Production Summary Materialized View - Reference Guide

## Overview

The `public.production_summary` materialized view is the foundation for all production metrics in AquaSmart. It aggregates data from 9 different production tables and provides both period-based and aggregated calculations.

## Purpose

Pre-calculate all production metrics at each activity point in a production cycle so that:
1. Dashboard view can be calculated efficiently
2. Production page can display detailed metrics
3. Historical analysis can be performed
4. eFCR calculations are consistent across the system

## Data Sources

The view combines data from:

| Table | Purpose | Data Used |
|-------|---------|-----------|
| `fish_sampling_weight` | Weight sampling events | Sample dates, ABW, fish counts |
| `daily_fish_inventory_table` | Daily fish inventory | Fish counts at sampling |
| `production_cycle` | Production cycle tracking | Cycle start/end dates |
| `fish_stocking` | Initial stocking | Stocking date, ABW, number stocked |
| `fish_harvest` | Final harvest | Harvest date, ABW, number harvested |
| `fish_transfer` | Fish transfers between systems | Transfer dates, weights |
| `fish_mortality` | Fish mortality records | Mortality counts by date |
| `feeding_record` | Feeding logs | Feed amounts by date |
| `system` | System information | System name, volume, growth stage |
| `input` | Analysis date range | As-of date for calculations |

## Output Structure

The view produces **30+ columns** with period and aggregated metrics:

### Identifiers & Dimensions
```sql
cycle_id               -- Production cycle identifier
date                   -- Activity date
system_id              -- System identifier
system_name            -- System name
growth_stage           -- System growth stage (grow_out/nursing)
ongoing_cycle          -- Boolean: cycle still active
average_body_weight    -- ABW at activity (grams)
number_of_fish_inventory -- Fish count at activity
activity               -- Activity type (stocking/sampling/final harvest)
activity_rank          -- Sort order (1=stocking, 2=sampling, 3=harvest)
```

### Feed Metrics
```sql
total_feed_amount_period       -- Feed between previous and current activity
total_feed_amount_aggregated   -- Cumulative feed from cycle start
feeding_rate_per_fish          -- Daily feeding rate per fish (kg/fish)
                               -- total_feed_amount_period / number_of_fish_inventory
feeding_rate_per_biomass       -- Feeding rate per biomass (kg/t)
                               -- (total_feed_amount_period / total_biomass) * 1000
```

### Biomass Metrics
```sql
total_biomass                    -- Current total biomass (ABW * count / 1000)
biomass_increase_period          -- Biomass change since previous activity
biomass_increase_aggregated      -- Cumulative biomass increase from start
```

### Mortality Metrics
```sql
daily_mortality_count           -- Mortality in period
cumulative_mortality            -- Total mortality from cycle start
daily_mortality_rate            -- Mortality rate for period (%)
                                -- (daily_mortality_count / number_of_fish_inventory) * 100
cumulative_mortality_rate       -- Cumulative mortality rate (%)
                                -- (cumulative_mortality / number_of_fish_inventory) * 100
```

### Transfer Metrics (Out)
```sql
number_of_fish_transfer_out     -- Fish transferred out in period
total_weight_transfer_out       -- Weight transferred out in period
total_weight_transfer_out_aggregated -- Cumulative weight out
```

### Transfer Metrics (In)
```sql
number_of_fish_transfer_in      -- Fish transferred in in period
total_weight_transfer_in        -- Weight transferred in in period
total_weight_transfer_in_aggregated -- Cumulative weight in
```

### Harvest Metrics
```sql
number_of_fish_harvested        -- Fish harvested in period
total_weight_harvested          -- Weight harvested in period
total_weight_harvested_aggregated -- Cumulative weight harvested
```

### Stocking Metrics
```sql
number_of_fish_stocked          -- Fish stocked in period
total_weight_stocked            -- Weight stocked in period
total_weight_stocked_aggregated -- Cumulative weight stocked
```

### eFCR Calculations
```sql
efcr_period                     -- Feed conversion ratio for this period
                                -- Feed / (Biomass Increase + Out - In + Harvested - Stocked)

efcr_aggregated                 -- Feed conversion ratio since cycle start
                                -- Total Feed / (Cumulative Biomass + Out - In + Harvested)
```

## Key Calculations

### eFCR (Feed Conversion Ratio)

**Period eFCR:**
```
EFCR_period = Total Feed Amount (period) 
            / (Biomass Increase + Transfers Out - Transfers In + Harvested - Stocked)
```

**Aggregated eFCR:**
```
EFCR_aggregated = Total Feed (cumulative)
                / (Biomass Increase Cumulative + Out - In + Harvested)
                
Special case for final harvest:
  Denominator = Total Weight Harvested + Out - In - Stocked
```

### Mortality Rates

**Daily Mortality Rate (%):**
```
Daily_Mortality_Rate = (Mortality Count in Period / Average Fish Inventory) × 100

Example:
  - If 50 fish died in a period with 5,000 fish inventory
  - Daily_Mortality_Rate = (50 / 5,000) × 100 = 1%
```

**Cumulative Mortality Rate (%):**
```
Cumulative_Mortality_Rate = (Total Mortality Since Start / Initial Stocking Count) × 100

Example:
  - If 500 fish died out of initial 10,000 stocked
  - Cumulative_Mortality_Rate = (500 / 10,000) × 100 = 5%
```

### Feeding Rates

**Feeding Rate Per Fish (kg/fish):**
```
Feeding_Rate_Per_Fish = Total Feed in Period / Number of Fish

Example:
  - If 500 kg fed to 5,000 fish in a period
  - Feeding_Rate_Per_Fish = 500 / 5,000 = 0.1 kg/fish
```

**Feeding Rate Per Biomass (kg/t):**
```
Feeding_Rate_Per_Biomass = (Total Feed in Period / Total Biomass) × 1000

Example:
  - If 500 kg fed to biomass of 2.5 tons
  - Feeding_Rate_Per_Biomass = (500 / 2.5) × 1000 = 200 kg/t
  
Interpretation:
  - Lower rates may indicate efficient feeding
  - Higher rates may indicate slower growth or feed waste
```

### Biomass Calculations
```
Total Biomass = (Average Body Weight grams / 1000) * Number of Fish
              (converts from grams to kilograms)

Biomass Increase = Current Biomass - Previous Activity Biomass
```

### Activity Rank
```
1 = stocking      (cycle_start)
2 = sampling      (any date with fish_sampling_weight)
3 = final harvest (cycle_end)
```

## Data Flow

```
Production Cycle
├── Stocking (Activity 1)
│   └── Records: fish stocked, initial ABW
│       Calculations: total_biomass = ABW * count
│
├── Sampling (Activity 2, 3, 4...)
│   └── Records: ABW, fish count, feeding, mortality, transfers
│       Calculations: biomass_increase, cumulative aggregations
│
└── Final Harvest (Activity 3)
    └── Records: fish harvested, harvest ABW
        Calculations: final eFCR, total cycle metrics
```

## Window Functions Used

The view uses window functions to create aggregated values:

```sql
-- Cumulative sum from cycle start
SUM(column) OVER (PARTITION BY cycle_id ORDER BY date, activity_rank)

-- Previous row for period calculations
LAG(column) OVER (PARTITION BY system_id, cycle_id ORDER BY date, activity_rank)
```

This allows tracking both:
- **Period metrics**: Between two activities
- **Aggregated metrics**: From cycle start to current activity

## Time Range Filtering

The view respects the `input` table's `as_of_date`:

```sql
-- Only includes data up to as_of_date
WHERE date <= (SELECT input_end_date FROM input ORDER BY id DESC LIMIT 1)
```

This ensures consistent historical data - old cycles don't change as new production data arrives.

## Indexing Strategy

Four indexes optimize common queries:

```sql
-- Query by system
CREATE INDEX idx_production_summary_system_id ON public.production_summary(system_id);

-- Query by cycle
CREATE INDEX idx_production_summary_cycle_id ON public.production_summary(cycle_id);

-- Query by date range
CREATE INDEX idx_production_summary_date ON public.production_summary(date);

-- Combined query (system + date)
CREATE INDEX idx_production_summary_system_date ON public.production_summary(system_id, date);
```

## Refresh & Maintenance

### Manual Refresh
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY public.production_summary;
```

### Automatic Refresh (Optional)
Set up a scheduled job to refresh daily or when production data is updated:

```sql
SELECT cron.schedule('refresh_production_summary', '0 * * * *', 
  'REFRESH MATERIALIZED VIEW CONCURRENTLY public.production_summary'
);
```

### Refresh Order
**IMPORTANT:** Always refresh production_summary BEFORE dashboard:
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY public.production_summary;
REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard;
```

## Usage Examples

### Get All Activities for a Cycle
```sql
SELECT * FROM public.production_summary
WHERE cycle_id = 123
ORDER BY date, activity_rank;
```

### Get Current Cycle Status
```sql
SELECT 
  system_id,
  system_name,
  activity,
  date,
  efcr_aggregated,
  biomass_increase_aggregated,
  cumulative_mortality
FROM public.production_summary
WHERE ongoing_cycle = true
  AND activity = 'sampling'  -- Latest sampling data
ORDER BY date DESC;
```

### Compare eFCR Across Cycles
```sql
SELECT 
  ps1.cycle_id,
  ps2.cycle_id as previous_cycle_id,
  ps1.efcr_aggregated,
  ps2.efcr_aggregated,
  (ps1.efcr_aggregated - ps2.efcr_aggregated) as efcr_change
FROM public.production_summary ps1
JOIN public.production_summary ps2 
  ON ps1.system_id = ps2.system_id
  AND ps1.cycle_id = ps2.cycle_id - 1
WHERE ps1.activity = 'final harvest'
  AND ps2.activity = 'final harvest';
```

### Get Feeding Data for Period
```sql
SELECT 
  system_id,
  system_name,
  SUM(total_feed_amount_period) as total_feed,
  SUM(biomass_increase_period) as total_biomass_increase,
  SUM(total_feed_amount_period) / NULLIF(SUM(biomass_increase_period), 0) as fcr_period
FROM public.production_summary
WHERE cycle_id = 123
  AND activity != 'stocking'
GROUP BY system_id, system_name;
```

## Troubleshooting

### View Returns No Data
1. Check that `production_cycle` table has records
2. Check that at least one of these tables has data:
   - `fish_sampling_weight`
   - `fish_stocking`
   - `fish_harvest`
3. Verify `system` table has matching system_ids
4. Refresh the view: `REFRESH MATERIALIZED VIEW CONCURRENTLY public.production_summary;`

### eFCR Shows NULL
- **Cause:** Denominator was zero (no biomass change or transfers)
- **Expected:** Occurs at stocking (no previous biomass to compare)
- **Normal:** Can occur if feeding happened but no biomass change recorded

### Missing Activities
- Check if data exists in source tables for that activity
- Verify dates are <= as_of_date in input table
- Ensure production_cycle has matching cycle records

### Slow Refresh
- Check index statistics: `ANALYZE public.production_summary;`
- Monitor query performance: check source table sizes
- Consider increasing refresh interval if data volume is large

## Related Views

- **public.dashboard** - Uses production_summary to calculate KPIs by time period
- **public.input** - Provides as_of_date for time range filtering
- **public.dashboard_time_period** - Defines time period windows for dashboard view

## Performance Notes

- Refresh takes 1-2 minutes depending on data volume
- Uses concurrent refresh to avoid locking
- Indexes optimize queries by system, cycle, and date
- Suitable for cycles with 100+ sampling events

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 23, 2026 | Initial creation with 17 CTEs, eFCR calculations |

---

**Last Updated:** January 23, 2026

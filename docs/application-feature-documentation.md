# AquaSmart Application Feature Documentation

## Purpose

This document describes the implemented AquaSmart application as it exists in the current codebase.

It covers:

- top-level pages and routes
- shared layout and navigation behavior
- the major screens and sections on each page
- important calculations and derived metrics
- charts, tables, and drilldowns
- the Supabase tables, views, and RPCs used by each feature
- the operational data-entry workflows and what they write

This is implementation-oriented documentation, not aspirational product copy.

## Application Structure

### Route inventory

| Route | User-facing label | Main purpose |
| --- | --- | --- |
| `/` | Dashboard for signed-in users, Landing page for signed-out users | Core operational overview and KPI monitoring |
| `/feed` | Feed | Feed performance, feed-rate control, FCR, feed stock, and cage-level feed analysis |
| `/sampling` | Growth | Growth analytics, ABW trend, projection, and capacity planning |
| `/mortality` | Mortality | Mortality risk ranking, alerts, driver analysis, and recent loss review |
| `/water-quality` | Water Quality | Water-quality health, alerts, sensor activity, environmental indicators, and depth profiles |
| `/production` | Production | System-level production metric charting and detail table |
| `/reports` | Reports | Period summaries and CSV/PDF exports across performance, feeding, mortality, growth, and water quality |
| `/data-entry` | Data Capture | Operational event capture for systems, stocking, feeding, mortality, sampling, transfer, harvest, water quality, and incoming feed |
| `/settings` | Settings | Farm profile and alert-threshold configuration |
| `/onboarding` | Workspace Setup | First-farm provisioning and initial threshold setup |
| `/auth` | Sign In / Create Account | Password-based sign-in and sign-up |

### Shared shell and navigation

Authenticated operational pages use `DashboardLayout`, which provides:

- collapsible left sidebar grouped into `Operate`, `Analyze`, `Capture`, and `Configure`
- sticky header with active farm name, user role badge, theme toggle, notifications, and user menu
- shared filter toolbar with:
  - time period selector
  - farm/system/batch/stage selector
- a dashboard-only `Add Data` quick-entry menu
- keyboard shortcuts:
  - `Ctrl/Cmd + K`: open quick actions dialog
  - `Ctrl/Cmd + N`: go to data capture
  - `Ctrl/Cmd + Shift + F`: go to feeding entry
  - `Ctrl/Cmd + Shift + S`: go to sampling entry

### Shared UX patterns

Most analytics pages use the same presentation conventions:

- section headings and metric cards
- chart cards with loading, fetching, and error states
- explicit empty states when no trustworthy data exists
- filter-driven URL state via query params
- `TimelineIntegrityNote` to explain resolved time windows
- `SystemHistorySheet` as the main drilldown drawer for a selected system

### Authentication and farm gating

App access is tenant-gated:

- unauthenticated users see the marketing landing page
- authenticated users without any farm are redirected to `/onboarding`
- authenticated users with a farm are routed to operational pages

This behavior is implemented by `FarmOnboardingGate`.

## Core Data Model

### Main write tables

- `farm`
- `farm_user`
- `system`
- `fish_stocking`
- `feeding_record`
- `fish_sampling_weight`
- `fish_mortality`
- `fish_transfer`
- `fish_harvest`
- `water_quality_measurement`
- `feed_incoming`
- `alert_threshold`

### Main read models, views, and RPCs

- `api_dashboard_systems`
- `api_dashboard_consolidated`
- `api_production_summary`
- `api_daily_fish_inventory_rpc`
- `api_daily_water_quality_rating`
- `api_water_quality_measurements`
- `api_latest_water_quality_status`
- `api_water_quality_sync_status`
- `api_daily_overlay`
- `api_feed_type_options_rpc`
- `api_fingerling_batch_options_rpc`
- `api_system_options_rpc`
- `api_farm_options_rpc`

### Cross-feature support tables/views

- `change_log` for water-quality activity attribution
- `alert_threshold` and `api_alert_thresholds` for threshold-aware calculations

## Page-by-Page Documentation

## 1. Landing Page and Entry Flow

### `/` when signed out

Purpose:

- public marketing entry point
- explains the major modules
- routes the user to `/auth`

Presentation:

- large gradient hero
- shader-based dithering background effect
- card-based feature grid
- minimal footer

Content modules:

- Dashboard and Core KPIs
- Inventory and Feed Control
- Water Quality Monitoring
- Sampling and Health
- Compliance and Reporting
- Operations Intelligence

### `/auth`

Purpose:

- password sign-in
- password sign-up

Behavior:

- validates email format
- validates minimum password length for sign-up
- signs in with Supabase password auth
- signs up with Supabase and sends email confirmation redirecting to `/auth/callback?next=/onboarding`

Presentation:

- full-screen auth card
- theme toggle
- transient in-page toast stack
- shader/dithering visual treatment

### `/onboarding`

Purpose:

- creates the first farm workspace for a newly authenticated user

Collected fields:

- farm name
- location
- owner
- contact email
- phone
- low DO threshold
- high ammonia threshold
- high mortality threshold

Server-side effects:

- inserts a `farm`
- upserts `farm_user` membership with role `admin`
- inserts farm-level `alert_threshold`
- updates user metadata with role and farm descriptors
- stores the new farm as the active farm in local storage

## 2. Dashboard

### Route

- `/`

### Purpose

This is the main daily operations page. It answers: what needs attention now, which systems are performing, what was recorded recently, and what actions should be scheduled next.

### Main sections

1. `Core Performance Overview`
2. `Feed Efficiency and Water Quality Monitoring`
3. `System Status`
4. `Production Summary Metrics`
5. `Recent Activity`
6. `Recommended Actions`

### Shared filters used

- farm
- system
- batch
- stage
- time period

### Main calculations

#### KPI Overview

Derived from `api_daily_fish_inventory_rpc`, `api_production_summary`, `api_daily_water_quality_rating`, and optionally `api_dashboard_consolidated`.

Metrics:

- `eFCR`
  - computed from feed divided by gain-adjusted biomass growth
  - prefers `api_dashboard_consolidated.efcr_period_consolidated` when available
- `Mortality Rate`
  - weighted from inventory mortality rate or derived from production rows
- `Avg Body Weight`
  - average ABW in scope, overridden by the latest consolidated event-anchor row when available
- `Avg Biomass`
  - average biomass in scope
- `Biomass Density`
  - average biomass density
- `Feeding Rate`
  - weighted by biomass
- `Water Quality`
  - average numeric water-quality rating mapped to `Optimal`, `Acceptable`, `Critical`, or `Lethal`

Trend deltas are taken from `api_dashboard_consolidated` when present.

#### Production summary metrics

Derived from `api_production_summary` and `fish_transfer`.

Totals:

- total stocked fish
- total mortalities
- net transfer adjustments
- total harvested fish
- total harvested kilograms

Net transfer adjustments are computed as:

- `+count` for fish transferred into scoped systems from outside scope
- `-count` for fish transferred out of scoped systems to outside scope
- `0` for internal transfers within scope

#### Recommended actions

Built from inventory and water-quality analytics.

The dashboard recommends actions when the selected scope shows issues such as:

- poor water quality
- weak feed efficiency
- stock or supply pressure

### Visualizations and tables

#### KPI cards

- compact summary cards with trend directions and tones

#### Population / production trend area

- production trend section using preloaded production rows

#### Water quality index card

- summarizes current water-quality health and system risk

#### System Status table

Dense system table with:

- system name
- fish count
- biomass
- feed total
- eFCR
- ABW
- feeding rate
- mortality rate
- biomass density
- average water-quality rating
- flags such as missing days, stale sampling, and critical water quality

Modes:

- all systems
- top 5 by best eFCR
- bottom 5 by worst eFCR
- missing data

Each row opens `SystemHistorySheet`.

#### Recent Activity panel

Shows latest entries merged across:

- mortality
- feeding
- sampling
- transfer
- harvest
- water quality
- incoming feed
- stocking
- system creation

#### Recommended Actions cards

Action cards include:

- title
- priority
- description
- due label
- placeholder `Schedule` action

### Drilldown: `SystemHistorySheet`

The dashboard opens a shared right-side sheet for any selected system.

The sheet provides:

- resolved production timeline metadata
- live fish, biomass, ABW, and survival KPIs
- biomass/ABW/feed trend chart
- operations timeline containing stocking, feeding, sampling, mortality, transfer, and harvest
- water-quality trend chart for DO and temperature
- latest measurement-by-parameter list
- quick links into feeding, sampling, and mortality capture

### Data sources

- `api_dashboard_systems`
- `api_dashboard_consolidated`
- `api_production_summary`
- `api_daily_fish_inventory_rpc`
- `api_daily_water_quality_rating`
- `api_water_quality_measurements`
- `api_alert_thresholds`
- `fish_transfer`
- recent reads from:
  - `fish_mortality`
  - `feeding_record`
  - `fish_sampling_weight`
  - `fish_transfer`
  - `fish_harvest`
  - `water_quality_measurement`
  - `feed_incoming`
  - `fish_stocking`
  - `system`

## 3. Feed

### Route

- `/feed`

### Purpose

This page evaluates whether feeding is on target, whether FCR is deteriorating, whether appetite signals are weakening, and whether feed stock is sufficient.

### Main sections

The page is split into four top-level sub-sections:

1. `Overview`
2. `Per-cage performance`
3. `Feed & FCR`
4. `Operations`

### Core computations

#### Feed-rate percentage

For each inventory day:

- `feedRatePct = (feedKg / biomassKg) * 100`

Where feed is taken from:

- `feeding_amount_aggregated`, or
- `feeding_amount`

#### Feed target band

Target feed-rate bands come from:

1. the most specific applicable feed plan, if available
2. otherwise a built-in pellet guide by ABW band

Feed-plan band tolerance:

- `target +/- max(target * 0.1, 0.25)`

Built-in ABW guide:

- fry: 15% to 20%
- fingerling: 8% to 15%
- juvenile: 5% to 8%
- grow-out: 3% to 5%
- late grow-out: 2% to 3%

#### Consecutive poor appetite alerts

If two consecutive feeding responses for a system are `Fair` or `Poor`, the page raises a poor-appetite alert.

#### FCR interval warning logic

For each FCR trend interval:

- matched feed plan target eFCR is used if available
- upper warning threshold = `target eFCR * 1.1`
- lower warning threshold = `target eFCR * 0.85`

If no feed-plan target exists, fallback thresholds are applied.

#### Operational exception rules

The page builds an exception rail from:

- feed rate above target
- feed rate below target
- repeated poor/fair responses
- low growth where latest `SGR < 0.7%/day`
- low survival where `survival < 95%`
- low dissolved oxygen where latest `DO` falls below the configured low-DO threshold (default `5 mg/L`)
- low feed stock cover where `days_remaining < 30`
  - stock on hand uses the latest feed inventory snapshot when available, then adjusts for later receipts and feed use

#### KPI counts

The top-level feed page highlights:

- feed today
- systems fed today
- active systems
- minimum stock days
- overfeeding count
- poor appetite count
- low growth count
- survival-risk count
- worst observed FCR

### Visualizations and tables

#### Overview

- KPI cards:
  - feed input
  - harvested kg
  - farm eFCR
  - total mortality
- composed chart:
  - feed input vs harvest output by time bucket
- mortality bar chart by time bucket
- DO mean line chart by time bucket

#### Per-cage performance

- per-cage table:
  - total feed
  - total harvest
  - crude FCR
  - latest ABW
  - overall SGR
  - mortality
  - status
- crude FCR by cage chart with benchmark line at `2.0`

#### Feed & FCR

- feed input bar chart by time bucket
- feeding response pie chart
- top feed types by volume horizontal bar chart
- feed-rate section
- FCR section

#### Operations

- feed deviation matrix / heatmap
  - statuses: above, below, in target, no target, missing
- exceptions rail
- compact feed-stock panel

### Data sources

- `feeding_record`
- `api_daily_fish_inventory_rpc`
- `api_production_summary`
- report-oriented feed plan reads
- report-oriented FCR trend reads
- report-oriented growth trend reads
- report-oriented survival trend reads
- `api_water_quality_measurements` filtered to dissolved oxygen
- feed stock/running stock reads
- `api_feed_type_options_rpc`
- `api_system_options_rpc`

## 4. Growth

### Route

- `/sampling`

The route is named `sampling`, but the navigation label and page title are `Growth`.

### Purpose

This page answers whether fish are growing to plan, when they are likely to reach move or harvest weight, and whether a selected system is approaching density capacity.

### Core computations

#### ABW from samples

Sampling form records:

- sampled fish count
- total sampled weight
- computed `ABW = (total_weight_kg * 1000) / number_of_fish`

The growth page aggregates ABW by date using sample-count weighting.

#### Target curve interpolation

The page uses either:

- configured `growth_curve_points`, or
- a default growth curve

Target ABW at any day offset is linearly interpolated between configured points.

#### Overall SGR

For each system:

- `SGR = ((ln(last ABW) - ln(first ABW)) / days) * 100`

#### Growth efficiency

- `growthEfficiency = (latestAbw / latestTargetAbw) * 100`

Action is flagged when growth efficiency drops below `90%`.

#### Projection to move/harvest date

Using the last two valid ABW samples:

- compute recent SGR
- project days to target weight:
  - `daysToTarget = (ln(targetWeight) - ln(lastAbw)) / (sgr / 100)`

Targets:

- nursing systems use configured move weight
- grow-out systems use configured harvest weight

Projection is marked `Low confidence` when projected days exceed 365.

#### Capacity planning

Using configured target density and system volume:

- `targetBiomassKg = volumeM3 * targetDensityKgM3`
- `abwKg = abwForCapacity / 1000`
- `maxFish = targetBiomassKg / abwKg`
- `utilization = currentFish / maxFish`

Utilization states:

- `OK`
- `Grade soon`
- `Grade now`

### Visualizations and tables

- KPI cards:
  - total samples
  - latest ABW
  - ABW volatility as coefficient of variation over time
  - average sample size
  - growth efficiency
  - projected move or harvest date
  - latest SGR
- capacity planning cards
- ABW trajectory line chart for the best-documented system
- current ABW by cage bar chart
- SGR by cage bar chart
- cumulative harvest-weight timeline for top harvested systems

### Data sources

- `fish_sampling_weight`
- `api_production_summary`
- dashboard system table rows
- system volume options
- app-config values:
  - `target_density_kg_m3`
  - `target_harvest_weight_g`
  - `target_move_weight_g`
  - `growth_curve_points`

## 5. Mortality

### Route

- `/mortality`

### Purpose

This page prioritizes systems by mortality risk and correlates losses with survival deterioration, low oxygen, alerts, appetite issues, and recent measurements.

### Core computations

#### Mortality risk row

Each scoped system gets a risk row with:

- deaths today
- deaths in the last 7 days
- latest survival percentage
- latest DO
- latest temperature
- age of last sample
- survival trend direction
- unresolved alert count
- investigation status
- repeated low DO flag
- repeat-loss flag
- poor appetite flag
- unexplained losses
- overall risk score

#### Survival slope

The page computes a simple regression slope over recent survival points.

Interpretation:

- worsening if slope `< -0.03`
- improving if slope `> 0.03`
- otherwise stable

#### Repeated low DO flag

For mortality dates, the page averages dissolved oxygen from:

- the same day
- the previous day

If the average is below `4 mg/L` on at least two mortality dates, the system is marked as repeated low DO.

#### Poor appetite flag

If two consecutive feeding responses in the last 7 days are `Poor`, the system is marked with poor appetite.

#### Unexplained losses

Counts mortality records whose causes are:

- `unknown`
- `other`

#### Risk score

The page adds points for conditions such as:

- deaths today
- deaths in the last 7 days
- increasing deaths versus yesterday
- repeat-loss pattern
- worsening survival
- repeated low DO
- poor appetite
- critical or warning alerts
- unexplained losses
- latest DO below threshold

Risk queue ordering:

1. higher `atRiskScore`
2. higher deaths today
3. higher deaths in the last 7 days

#### Investigation status persistence

Investigation status is client-side persisted in local storage by farm and system. It is not server-backed.

### Visualizations and tables

- KPI cards:
  - deaths today
  - 7-day deaths
  - open alerts
  - worst survival
  - systems at risk
  - unexplained losses
- `Mortality Risk Queue` table with investigation selector
- `Active Alerts` list
- `Likely Drivers` list
- `Investigation Status` counters
- `Deaths Trend` bar chart
- `Survival Trend` dual-axis line chart
- `Mortality Driver Correlation` composed chart with:
  - deaths
  - average DO
  - average temperature
  - poor feeding responses
- `Compact Mortality Log` table with cause and flags

### Data sources

- `fish_mortality`
- alert log queries for:
  - `MASS_MORTALITY`
  - `ELEVATED_MORTALITY`
- survival trend data
  - survival adjusts for stocking, transfers, harvests, and mortality rather than using a fixed opening stock
- `feeding_record`
- `fish_sampling_weight`
- `api_water_quality_measurements`
- `api_system_options_rpc`

## 6. Water Quality

### Route

- `/water-quality`

### Purpose

This page monitors environmental conditions and turns measurement, rating, threshold, overlay, and sensor-freshness data into operational water-quality views.

### Tabs

- `Overview`
- `Alerts`
- `Sensor Activity`
- `Parameter Analysis`
- `Environmental Indicators`
- `Stratification Analysis`

### Core computations

#### Water Quality Index (WQI)

WQI is based on dissolved oxygen and temperature.

DO scoring:

- 90 when DO is comfortably above threshold
- 60 when DO is above threshold
- 30 when DO is slightly below threshold
- 0 when DO is materially below threshold

Temperature scoring:

- compare temperature against overall mean and standard deviation
- if temperature variance is `0`, an exact match to the mean still scores as optimal instead of being treated as missing data
- 90 within 1 standard deviation
- 60 within 2 standard deviations
- 30 within 3 standard deviations
- 0 outside that band

Final WQI:

- `WQI = (DO score + temperature score) / 2`
- in all-systems views, the displayed score is the average of per-system WQI values, not a WQI recomputed from pooled average readings

WQI label mapping:

- `Good` for `>= 70`
- `Moderate` for `50-69`
- `Poor` for `< 50`

#### Nutrient load

- `nitrate + nitrite + ammonia`

Levels:

- low
- moderate
- high

#### Algal activity

Derived from Secchi disk depth:

- `value = clamp(50 - secchiDepth * 10, 0, 50)`

Levels:

- low
- moderate
- high

#### Rating trend per system

The page computes a slope over the last seven daily rating values per system.

#### Current alerts

Current threshold breaches come from latest status rows:

- DO below threshold
- ammonia above threshold

#### Emerging risks

The page raises narrative warnings when:

- 7-day DO trend slope is falling
- 7-day ammonia trend slope is rising
- rating volatility is high
- the worst parameter changes too frequently

#### Parameter trend rolling average

For the selected parameter, the page computes:

- daily mean
- 7-day rolling average
- overlay of feed and mortality totals by day

#### Depth profile and stratification

For a selected system and date, the page groups measurements by water depth and averages:

- dissolved oxygen
- temperature
- pH

It then derives:

- surface DO
- bottom DO
- DO gradient
- temperature gradient
- `isStratified` when bottom DO is very low and surface DO remains healthy

### Visualizations and tables

#### Overview

- average WQI summary
- alert count
- online sensor count
- system risk list

#### Alerts tab

- critical system rows
- current alert messages
- emerging risk messages

#### Sensor Activity tab

- sensor counts by status:
  - online
  - warning
  - offline
- system-by-system sensor freshness list

Sensor freshness is based on time since last measurement:

- online: within 6 hours
- warning: within 24 hours
- offline: older or missing

#### Parameter Analysis tab

- selected parameter line chart with rolling average
- optional overlays for feeding and mortality
- daily DO variation chart
- daily temperature average chart

#### Environmental Indicators tab

- WQI and environmental indicator cards
- all-systems WQI comparison

#### Stratification Analysis tab

- depth-profile series for DO and temperature
- profile date selector
- stratification and gradient summaries

### Data sources

- `api_water_quality_sync_status`
- `api_latest_water_quality_status`
- `api_daily_water_quality_rating`
- `api_water_quality_measurements`
- `api_daily_overlay`
- `change_log` filtered to `water_quality_measurement`
- `api_alert_thresholds`
- `api_system_options_rpc`

## 7. Production

### Route

- `/production`

### Purpose

This page provides system-level production metric trend analysis and a synchronized production-detail table.

### Metrics available

- periodic eFCR
- aggregated eFCR
- mortality rate
- ABW
- feeding rate
- biomass density

### Core computations

Trend rows are rebuilt per selected metric.

Rules:

- periodic eFCR: weighted by feed amount
- aggregated eFCR: weighted by feed amount
- ABW: weighted by fish count
- mortality rate: averaged from inventory rows and shown as `%/day`
- feeding rate: averaged from inventory rows and shown as `% BW/day`
- biomass density: averaged from inventory rows

### Visualizations and tables

- metric filter control
- single area chart for the currently selected metric
- `Production Detail` table with:
  - date
  - system
  - fish
  - biomass
  - ABW
  - biomass increase
  - feed
  - periodic eFCR

### Data sources

- `api_production_summary`
- `api_daily_fish_inventory_rpc` for inventory-backed metrics
- `api_system_options_rpc`
- batch-to-system report reads for scoped system filtering

## 8. Reports

### Route

- `/reports`

### Purpose

This page groups historical review and export workflows into tabbed report surfaces.

### Shared behavior

All report tabs inherit current farm, system, batch, stage, and date-range context from the shared filter state.

Most report sections support:

- CSV export
- branded PDF export
- configurable record limits
- detailed record tables hidden behind a toggle

### Report tabs

#### Performance

Summary:

- consolidated eFCR
- feeding rate
- average biomass
- mortality rate

Charts:

- eFCR and biomass over time
- latest biomass comparison by system

Benchmark status:

- eFCR benchmark `1.5`
- mortality benchmark `0.02`

Primary data source:

- `api_production_summary`

#### Feeding

Summary:

- total kg fed
- average eFCR
- average protein percentage weighted by feed quantity
- cost per kg gain placeholder (`Awaiting cost data`)

Charts:

- feeding amounts over time
- eFCR trend over time

Breakdown:

- by system total feed
- entries count
- average protein
- last feed date

Primary data sources:

- `feeding_record`
- `api_production_summary`

#### Mortality

Summary:

- latest mortality date
- total mortality
- mortality percent against inventory
- mass-event count

Charts and breakdowns:

- mortality trend
- cause breakdown

Primary data sources:

- `fish_mortality`
- `api_daily_fish_inventory_rpc`

#### Growth

Summary:

- latest ABW
- biomass increase
- total biomass
- total feed in period

Charts:

- ABW trend
- biomass / biomass-increase trend

Primary data source:

- `api_production_summary`

#### Water Quality

Summary:

- total readings in period
- excursion count
- farm low DO threshold
- farm high ammonia threshold

Logic:

- flags excursion when:
  - DO is below threshold, or
  - ammonia is above threshold

Table:

- most recent excursion records only

Export:

- CSV and PDF of excursion-focused compliance rows

Primary data sources:

- `api_water_quality_measurements`
- `api_alert_thresholds`

## 9. Data Capture

### Route

- `/data-entry`

### Purpose

This page is the operational write surface for farm events. It is designed as a left-side capture menu with a form and recent-entry list for the active capture type.

### Shared behavior

- loads systems, batches, feed types, and recent entries
- can deep-link directly to a tab using `?type=...`
- can preselect `system` and `batch`
- shows a first-system setup state when no systems exist
- recent-entry lists are shown below each form

### Capture tabs

| Tab | Writes to | Key fields | Derived values / special behavior |
| --- | --- | --- | --- |
| System | `system` | commissioned date, cage unit, name, type, growth stage, volume, depth, length, width, diameter | creates an active system tied to current farm |
| Stocking | `fish_stocking` | system, batch, date, fish count, total weight, stocking type, notes | computes `abw`; can quick-create a batch if none exists |
| Mortality | `fish_mortality` | system, optional batch, date, fish count, cause, notes | requires active farm; stores cause and optional notes |
| Feeding | `feeding_record` | system, optional batch, date, feed type, kg fed, feeding response | reads duplicate same-day records, inventory, feed plans, and DO to inform entry; can quick-create feed types |
| Sampling | `fish_sampling_weight` | system, optional batch, date, sample count, total sampled weight (kg) | computes `abw` as `(sample weight kg * 1000) / fish sampled` |
| Transfer | `fish_transfer` | origin system, target system, transfer type, optional batch, date, fish count, total weight | computes `abw`; blocks same origin/target except for `count_check` |
| Harvest | `fish_harvest` | system, optional batch, date, fish count, harvest kg, harvest type | computes `abw` |
| Water Quality | `water_quality_measurement` | system, date, time, depth, temperature, DO, pH, ammonia, nitrite, nitrate, salinity, Secchi disk | inserts one row per parameter entered; requires at least one measurement |
| Incoming Feed | `feed_incoming` | date, feed type, quantity | requires active farm; can quick-create feed types if none exist |

### Mutation side effects

After entry, forms invalidate relevant analytics caches.

Examples:

- feeding invalidates dashboard, inventory, recent activity, and recent entries
- sampling invalidates dashboard, inventory, production, recent activity, and recent entries
- harvest invalidates dashboard, inventory, production, recent activity, and recent entries
- water quality invalidates dashboard, water-quality, recent activity, and recent entries

### Recent entries panel

Each capture tab shows recent rows of the same type, using the same core tables listed above.

## 10. Settings

### Route

- `/settings`

### Purpose

This page edits farm profile metadata and farm-level alert thresholds.

### Sections

#### Farm Information

Editable fields:

- farm name
- location
- owner name
- email
- phone
- current farm role

#### Alert Thresholds

Editable fields:

- low DO alert threshold
- high ammonia threshold
- high mortality threshold

### Save behavior

Saving updates:

- `farm`
- `alert_threshold`
- `farm_user`

### Data loading behavior

The page:

- reads farm-linked alert-threshold data when permitted
- falls back gracefully if threshold reads are denied
- surfaces farm-assignment issues if no farm exists for the user

## Presentation Notes

### Overall visual language

The operational UI uses:

- card-heavy dashboard composition
- rounded panels and badges
- dense but readable data tables
- charts via Recharts
- consistent loading, fetching, error, and empty states

### Main presentation motifs by surface

- landing and auth pages use stronger gradients and shader effects
- operational pages are cleaner and denser, optimized for repeated daily use
- water-quality and feed pages have the most sectioned analytics layouts
- data-entry pages prioritize direct form completion and immediate recency feedback

## Feature-to-Data Matrix

| Feature | Main data reads | Main writes |
| --- | --- | --- |
| Dashboard | `api_dashboard_systems`, `api_dashboard_consolidated`, `api_production_summary`, `api_daily_fish_inventory_rpc`, `api_daily_water_quality_rating`, `api_water_quality_measurements`, `api_alert_thresholds` | none |
| Feed | `feeding_record`, `api_daily_fish_inventory_rpc`, `api_production_summary`, feed-plan reads, growth/survival trend reads, `api_water_quality_measurements` | `feeding_record` |
| Growth | `fish_sampling_weight`, `api_production_summary`, system volumes, app config | `fish_sampling_weight` |
| Mortality | `fish_mortality`, alert-log reads, survival trend, feeding, sampling, water-quality measurements | `fish_mortality` |
| Water Quality | sync status, latest status, daily ratings, measurements, overlays, thresholds, change log | `water_quality_measurement` |
| Production | `api_production_summary`, `api_daily_fish_inventory_rpc` | none |
| Reports | production summary, feeding records, mortality, inventory, water-quality measurements, thresholds | none |
| Data Capture | systems, batches, feed types, recent entries | `system`, `fish_stocking`, `feeding_record`, `fish_sampling_weight`, `fish_mortality`, `fish_transfer`, `fish_harvest`, `water_quality_measurement`, `feed_incoming` |
| Settings | `farm`, `alert_threshold`, `farm_user` | `farm`, `alert_threshold`, `farm_user` |
| Onboarding | `api_farm_options_rpc` | `farm`, `farm_user`, `alert_threshold`, auth user metadata |

## Maintenance Note

If the application evolves, update this document when:

- a new top-level route is added
- a page adds or removes a major chart or table
- a derived metric formula changes
- a feature switches to different views/RPCs/tables
- a data-entry form changes its payload or write target

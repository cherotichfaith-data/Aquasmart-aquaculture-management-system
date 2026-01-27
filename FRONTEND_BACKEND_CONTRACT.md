# Frontend ↔ Backend Contract (AquaSmart)

This document describes everything the frontend expects from the backend to function smoothly. It is derived from the current frontend codebase and should be treated as the source-of-truth contract for backend data shape, behavior, and permissions.

If the backend diverges from these expectations, the UI may show empty charts/KPIs, missing tables, or errors on data entry.

---

## 1) Environment & Auth

### Required environment variables (client + server)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

The frontend instantiates Supabase directly in the browser and server components using these public values. Missing values block login and all data access.

### Auth flow
- Email OTP (magic link) via `supabase.auth.signInWithOtp({ email })`.
- Auth callback endpoint: `GET /auth/callback?code=...`
  - Must exchange code for session via Supabase.
  - Supabase redirect URLs must include:
    - `{APP_ORIGIN}/auth/callback`
    - `{APP_ORIGIN}/auth/verify-success` (used for success redirect)
    - `{APP_ORIGIN}/auth/auth-error` (for errors)

### Session usage
The app expects Supabase auth session cookies to be available (SSR + client). Middleware (`utils/supabase/middleware.ts`) redirects unauthenticated users to `/auth` unless already on auth routes.

---

## 2) General Data Conventions

- **Dates**: strings in `YYYY-MM-DD` or ISO format parseable by `new Date(...)`.
- **Times**: strings in `HH:mm` (24h) for water quality entries.
- **Enums**: must match exactly (case-sensitive). See section 6.
- **Numeric fields**: should be numeric (not strings) to avoid chart formatting errors.
- **Null handling**: optional fields are often allowed to be `null`; the UI renders `--` when missing.
- **Ordering**: most list queries are ordered descending by date (latest first).

---

## 3) Required Tables / Views / RPC

The frontend uses Supabase `select`, `insert`, and `update` directly. RLS policies must allow access for authenticated users, and for some public reads if needed.

### 3.1 Core identity & farm context

#### `profiles` (Auth profile)
Used by: `components/auth-provider.tsx`, `hooks/use-profile.tsx`
Required columns:
- `id` (string, Supabase user id)
- `email` (string)
- `role` (string: user role)
- `farm_name`, `location`, `owner`, `phone` (nullable strings)
- `created_at` (timestamp)

Operations:
- `select * where id = user.id`
- `upsert` (update profile on settings save)

#### `user_profile` (UI preferences)
Used by: `app/settings/page.tsx`
Required columns:
- `user_id` (string, Supabase user id)
- `theme` (string, nullable)
- `default_views` (json, nullable)
- `notifications_enabled` (boolean, nullable)
- `created_at`, `updated_at`

Operations:
- `select * where user_id = user.id`
- `upsert` on save

#### `farm`
Used by: `hooks/use-active-farm.tsx`, `app/settings/page.tsx`
Required columns:
- `id` (string)
- `name`
- `location`, `owner`, `email`, `phone`
- `created_at`

Operations:
- `select * where id = farm_id`
- `insert` (create farm if none exists)
- `update` by `id`

#### `farm_user` (user → farm mapping)
Used by: `hooks/use-active-farm.tsx`, `app/settings/page.tsx`
Required columns:
- `farm_id` (string)
- `user_id` (string)
- `role` (string)
- `created_at`

Operations:
- `select farm_id where user_id = current user (limit 1)`
- `insert` when creating a farm

#### `alert_threshold`
Used by: `app/settings/page.tsx`
Required columns:
- `id` (string)
- `scope` (string, expected `"farm"`)
- `farm_id` (string, nullable)
- `system_id` (number, nullable)
- `low_do_threshold`, `high_ammonia_threshold`, `high_mortality_threshold` (numbers, nullable)
- `created_at`, `updated_at`

Operations:
- `select * where scope = 'farm' and farm_id = current farm`
- `insert`/`update` on settings save

---

### 3.2 Production & analytics data

#### `production_summary`
Used by: dashboards, reports, analytics, metrics explorer
Required columns (subset used by UI):
- Identifiers: `date`, `system_id`, `system_name`, `growth_stage`
- Biomass & fish: `total_biomass`, `average_body_weight`, `number_of_fish_inventory`
- Feeding: `total_feed_amount_period`, `total_feed_amount_aggregated`
- eFCR: `efcr_period`, `efcr_aggregated`
- Mortality: `daily_mortality_count`, `cumulative_mortality`
- Growth: `daily_biomass_gain`, `biomass_increase_period`, `biomass_increase_aggregated`
- Water quality: `water_quality_rating` (numeric or mapped value)
- Transfers/harvest/stocking (used in backend materialized views):
  - `total_weight_transfer_out_aggregated`, `total_weight_transfer_in_aggregated`
  - `total_weight_harvested_aggregated`, `total_weight_stocked_aggregated`
  - `total_feed_amount_aggregated`, `biomass_increase_aggregated`

Frontend expectations:
- `date` must be parseable by `new Date(date)` for charts.
- Latest rows should be returned first (queries use `order: "date.desc"`).

#### `dashboard` (materialized view)
Used by: `KPIOverview`, `SystemsTable`, `HealthSummary`
Required columns:
- `system_id`, `system_name`, `growth_stage`
- `time_period` (string enum values; see section 6)
- `input_start_date`, `input_end_date`
- `sampling_start_date`, `sampling_end_date`
- KPI fields: `efcr`, `abw`, `feeding_rate`, `mortality_rate`, `biomass_density`, `average_biomass`
- Water quality: `water_quality_rating_average`, `water_quality_rating_numeric_average`
- Optional arrows: `*_arrow` fields (not critical for UI)

Frontend behavior:
- Queries use `eq` filters (system_id, growth_stage, time_period) and `order: "input_end_date.desc"` with `limit: 1`.
- Systems table expects multiple rows for the selected `time_period` and takes the first per system.

#### `dashboard_consolidated` (farm-level snapshot)
Used by: `KPIOverview` when `system = "all"`
Required columns:
- `time_period`, `input_start_date`, `input_end_date`
- `efcr_period_consolidated`, `efcr_period_consolidated_delta`
- `mortality_rate`, `mortality_rate_delta`
- `average_biomass`, `average_biomass_delta`
- `feeding_rate`
- Optional: `biomass_density`, `biomass_density_delta`

Fallback:
- If this view is empty, the frontend derives farm-level KPIs by aggregating `dashboard` rows.

#### `daily_fish_inventory_table`
Used by: metrics explorer (daily aggregation)
Required columns:
- `inventory_date`
- `system_id`
- `number_of_fish_mortality`
- `mortality_rate`
- `abw_last_sampling`
- `feeding_rate`
- `biomass_density`
- Optional: `feeding_amount`, `feeding_amount_aggregated`, `biomass_last_sampling`

#### `daily_water_quality_rating`
Used by: water quality alerts, health summary, metrics explorer
Required columns:
- `rating_date`
- `system_id`
- `rating` (string: `optimal|acceptable|critical|lethal`)
- `rating_numeric` (number)
- `worst_parameter` (string)
- `worst_parameter_value` (number, nullable)
- `worst_parameter_unit` (string, nullable)

Note: `HealthSummary` also handles `"moderate"` (legacy) but enum typically excludes it.

---

### 3.3 Data entry tables (inserts from UI)

All inserts happen directly from the client (Supabase anon key + auth session).

#### `feeding_record`
Insert fields:
- `system_id` (number)
- `batch_id` (number | null)
- `date` (string)
- `feed_type_id` (number)
- `feeding_amount` (number)
- `feeding_response` (enum)

#### `fish_mortality`
Insert fields:
- `system_id`
- `batch_id` (nullable)
- `date`
- `number_of_fish_mortality`
- `total_weight_mortality` (nullable)
- `abw` (nullable)

#### `fish_sampling_weight`
Insert fields:
- `system_id`
- `batch_id` (nullable)
- `date`
- `number_of_fish_sampling`
- `total_weight_sampling`
- `abw`

#### `fish_transfer`
Insert fields:
- `origin_system_id`
- `target_system_id`
- `batch_id` (nullable)
- `date`
- `number_of_fish_transfer`
- `total_weight_transfer`
- `abw` (nullable)

#### `fish_harvest`
Insert fields:
- `system_id`
- `batch_id` (nullable)
- `date`
- `number_of_fish_harvest`
- `total_weight_harvest`
- `type_of_harvest` (enum)
- `abw`

#### `fish_stocking`
Insert fields:
- `system_id`
- `batch_id`
- `date`
- `number_of_fish_stocking`
- `total_weight_stocking`
- `abw`
- `type_of_stocking` (enum)

#### `water_quality_measurement`
Insert fields (one row per parameter):
- `system_id`
- `date`
- `time`
- `water_depth`
- `parameter_name` (enum)
- `parameter_value` (number)

---

### 3.4 Reference tables

#### `system`
Used by selectors, systems table, and inserts
Required columns:
- `id`, `name`
- `type` (enum), `growth_stage` (enum)
- `volume`, `depth`, `length`, `width`, `diameter` (nullable)
- `is_active` (boolean)
- `farm_id` (nullable)

#### `fingerling_batch`
Used by selectors
Required columns:
- `id`, `name`

#### `feed_type`
Used by feed inventory & data entry
Required columns:
- `id`, `feed_line`
- `feed_category` (enum)
- `crude_protein_percentage` (number)
- `feed_pellet_size` (enum)

#### `feed_incoming`
Used by inventory and data entry
Required columns:
- `id`
- `feed_type_id`
- `feed_amount`
- `date`

#### `suppliers`
Loaded for data entry (not yet used in UI fields, but expected)
Required columns:
- `id`, `name` (plus any supplier metadata)

#### `water_quality_framework`
Joined for unit display
Required columns:
- `unit`
Relation name used in query: `water_quality_framework(unit)`

---

### 3.5 Change log / activity stream

#### `change_log`
Used by: activity cards and transactions
Required columns:
- `id`
- `table_name`
- `change_type`
- `change_time` (timestamp)
- `record_id`
- `column_name` (nullable)
- `old_value` (nullable)
- `new_value` (nullable)

The UI expects recent changes to feeding, sampling, water quality, mortality, transfer, harvest, incoming feed, stocking, and systems.

---

### 3.6 Optional / currently expected but not enforced in types

The UI references the following fields from `dashboard` snapshots, even though they are not defined in the type file. If these fields exist in the backend, the UI will display them; if not, it will show “N/A”.

Expected on dashboard snapshot (farm-level):
- `farm_efcr`
- `farm_biomass`
- `farm_mortality_count`
- `farm_survival_rate`
- `farm_avg_water_quality`

If these are not part of `dashboard`, consider:
- Adding them to a dedicated consolidated view or
- Updating frontend to use `dashboard_consolidated` instead.

---

## 4) Materialized Views & Refresh Expectations

The frontend **does not** trigger view refreshes. The backend must keep the following up-to-date:

- `dashboard` (materialized view)
- `dashboard_consolidated` (materialized view, if used)

Recommended backend strategies:
- Scheduled refresh (cron / Supabase scheduled job)
- Trigger-based refresh when source tables change
- RPC functions (e.g., `refresh_all_materialized_views`) invoked by backend jobs

The `dashboard` materialized view depends on:
- `production_summary`
- `system`
- `daily_water_quality_rating`
- `dashboard_time_period`
- `input` (for custom period)

Ensure these base tables are populated and consistent.

---

## 5) API/Query Patterns Used by Frontend

### Common Supabase query patterns
All queries use standard `select` with:
- `eq` filters (system_id, growth_stage, time_period, etc.)
- `order` with `.desc`
- `limit`

No RPC queries are called directly by the UI.

### Expected pagination & limits
- KPI & dashboard: `limit: 1`
- Production summary: `limit: 50–500` depending on screen
- Metrics explorer: dynamic limits up to ~2000
- Recent activity: `limit: 5–10`

The backend should allow those limits without timeouts.

---

## 6) Enums (must match values)

### `time_period`
- `day`
- `week`
- `2 weeks`
- `month`
- `quarter`
- `6 months`
- `year`

### `system_growth_stage`
- `nursing`
- `grow_out`

### `system_type` (subset used by UI)
- `rectangular_cage`
- `circular_cage`
- `pond`
- `tank`

### `feeding_response`
- `very_good`
- `good`
- `bad`

### `type_of_harvest`
- `partial`
- `final`

### `type_of_stocking`
- `empty`
- `already_stocked`

### `water_quality_parameters`
- `pH`
- `temperature`
- `dissolved_oxygen`
- `secchi_disk_depth`
- `nitrite`
- `nitrate`
- `ammonia_ammonium`
- `salinity`

### `water_quality_rating`
- `optimal`
- `acceptable`
- `critical`
- `lethal`

---

## 7) Permissions (RLS) Expectations

At minimum, authenticated users need:
- `select` on all tables/views listed above
- `insert` on data entry tables (`feeding_record`, `fish_mortality`, `fish_sampling_weight`, `fish_transfer`, `fish_harvest`, `fish_stocking`, `water_quality_measurement`, `feed_incoming`, `system`)
- `update` on `farm`, `alert_threshold`, `user_profile`, `profiles`

If public (unauthenticated) access is desired, adjust policies accordingly.

---

## 8) Observability / Debug Signals

The UI logs errors to console but does not show detailed backend errors.
To support operations:
- Ensure PostgREST errors are meaningful (message, details).
- Consider adding server-side logging for insert/update failures.

---

## 9) Quick Test Checklist (Backend)

Use this to validate backend readiness:
- [ ] Auth magic link works; callback exchanges code.
- [ ] `profiles` row exists for test user.
- [ ] `farm_user` maps user to a farm.
- [ ] `dashboard` has rows for all time periods.
- [ ] `dashboard_consolidated` returns a row for each time period (or frontend fallback is acceptable).
- [ ] `production_summary` has recent rows with dates parseable by JS.
- [ ] Water quality ratings exist and non-optimal ratings show alerts.
- [ ] Data entry inserts work for all forms.

---

## 10) Source References (Frontend Files)

Key files that define expectations:
- `lib/supabase-queries.ts`
- `components/dashboard/*`
- `components/metrics/metrics-explorer.tsx`
- `components/data-entry/*`
- `app/settings/page.tsx`
- `hooks/use-active-farm.tsx`
- `components/auth-provider.tsx`


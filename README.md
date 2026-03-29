# AquaSmart

AquaSmart is a Next.js + Supabase aquaculture operations platform. It supports daily farm workflows around water quality, feeding, fish sampling, mortality, stocking, harvest, transfers, embedded inventory tracking, and reporting.

The current product structure follows a simple aquaculture software pattern:

- `Operate`: dashboard, feed, growth, mortality, water quality
- `Analyze`: reports
- `Capture`: data capture
- `Configure`: settings

See [product-structure.md](/C:/Users/Admin/Downloads/aquasmart1/docs/product-structure.md) for the current information architecture and feature ownership.
See [code-organization.md](/C:/Users/Admin/Downloads/aquasmart1/docs/code-organization.md) for the current code-organization rules.

## What The App Currently Covers

- Farm dashboard with KPI summaries, production signals, and recent operational activity
- Feed management with feeding analysis, feed deliveries, stock coverage, and feed-related trends
- Sampling and growth review for fish weight and growth progress
- Water-quality monitoring with ratings, thresholds, status, overlays, and compliance-focused views
- Reports for performance, feeding, growth, mortality, and water quality
- Data-entry workflows for the core farm events
- Settings for farm profile and alert-threshold configuration

## Pages

### `/`

- Signed-out state presents the marketing landing page
- Signed-in state presents the farm dashboard
- The dashboard shows KPI overview cards, production summary metrics, recommended actions, water-quality indicators, systems tables, and recent activities

### `/auth`

- Sign-in and auth flow entry
- Includes auth callback, error, and verification-success routes

### `/feed`

- Feed control-tower for ration variance, feed-rate trend, FCR trend, cage exceptions, and stock coverage

### `/sampling`

- Sampling and growth-focused analysis
- Weight/growth presentation based on production and sampling data

### `/water-quality`

- Water-quality status, thresholds, measurements, overlays, and alerts
- Daily ratings and latest status views
- Period-based filtering now resolves against water-quality data freshness, not inventory freshness

### `/reports`

- Performance, feeding, growth, mortality, and water-quality report screens
- Export-oriented report presentation

### `/settings`

- Farm profile management
- Alert-threshold management

### `/data-entry`

- Operational forms for:
  - systems
  - stocking
  - mortality
  - feeding
  - sampling
  - transfer
  - harvest
  - water quality
  - incoming feed
- Recent-entry lists for operator feedback after submission

## Feature Modules

### `src/features/dashboard`

- Dashboard filters, server queries, and dashboard-specific data shaping
- Drives KPI, systems, health, recommendation, and recent-activity presentation

### `src/features/feed`

- Feed-page filters and queries
- Combines feeding records, inventory context, and water-quality overlays for feed analysis

### `src/features/water-quality`

- Water-quality filters, measurement reads, ratings, overlays, thresholds, latest status, and sync status

### `src/features/farm`

- Farm-level server concerns and ownership context

## UI Modules

### `src/components/dashboard`

- KPI overview
- Population/production overview
- Systems table
- Water-quality index
- Recommended actions
- Recent activities

### `src/components/data-entry`

- Modular data-entry forms and recent-entry UI

### `src/components/reports`

- Report components used by the reports screen

### `src/components/notifications`

- Notification and background-refresh related UI providers

## Backend Shape

### Frontend Data Path

- App Router pages load server data from `src/features/*/queries.server.ts`
- Shared API access lives in `src/lib/api/*`
- React Query hooks live in `src/lib/hooks/*`
- Supabase is the backend for auth, RLS, tables, views, RPCs, and materialized views

### Current Analytics Read Model

- Canonical system-day analytics source: `analytics_system_day`
- Materialized backing store and refresh orchestration exist for the analytics path
- Dashboard RPCs and related analytics have been refactored to reduce repeated recomputation

### Time-Period Logic

- Supported preset periods:
  - `day`
  - `week`
  - `2 weeks`
  - `month`
  - `quarter`
  - `6 months`
  - `year`
- Period bounds are resolved in the backend
- Scope-aware period resolution exists for dashboard, water quality, and feeding
- Water-quality periods are anchored to water-quality freshness
- Dashboard periods are anchored to inventory-backed analytics freshness

### Feed Inventory

- `feed_incoming` is being refined into a farm-scoped feed-inventory source
- Reporting already uses enriched feed projections instead of repeated feed-type joins

## Important Backend Objects

- `api_dashboard_systems`
- `api_dashboard_consolidated`
- `api_daily_fish_inventory_rpc`
- `api_production_summary`
- `api_time_period_bounds`
- `api_latest_water_quality_status`
- `api_water_quality_sync_status`
- `analytics_system_day`
- `production_summary`

## Project Structure

- `src/app/`: App Router routes
- `src/components/`: UI modules and reusable presentation
- `src/features/`: active route-facing server-query modules and domain server boundaries
- `src/lib/api/`: Supabase RPC/table read helpers
- `src/lib/hooks/`: React Query hooks and mutation invalidation helpers
- `src/lib/types/`: generated database types
- `src/lib/supabase/`: Supabase client/server/auth helpers
- `docs/`: architecture notes and implementation reference docs
- `supabase/`: migrations and backend project config

## Running Locally

Prerequisites:

- Node.js 18+
- npm
- Supabase project credentials

Install:

```bash
npm install
```

Environment:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

Run:

```bash
npm run dev
```

Database types:

```bash
npm run db:types
```

- This repo intentionally does not install the Supabase CLI locally.
- Generate `src/lib/types/database.ts` in a trusted external environment such as CI, WSL, or another machine.

Type-check:

```bash
npx tsc --noEmit
```

## Notes

- Reads are intended to go through approved RPCs, views, projections, or constrained table reads
- The backend is under active refinement toward lower-cost analytics reads and clearer domain-scoped projections
- See [architecture-blueprint.md](/C:/Users/Admin/Downloads/aquasmart1/docs/architecture-blueprint.md) for the structural target
- See [README.md](/C:/Users/Admin/Downloads/aquasmart1/src/features/README.md) for active feature-slice rules

## License

Proprietary. All rights reserved.

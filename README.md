# AquaSmart - Aquaculture Farm Intelligence Platform

AquaSmart is a real-time operational intelligence dashboard for modern aquaculture farms. Built with Next.js and Supabase, it supports KPI monitoring, inventory, feeding, mortality, water quality, and compliance-ready reporting.

---

## Vision
Enable data-driven decision-making in aquaculture through:
- Real-time visibility into farm performance
- Automated alerts for critical anomalies
- Role-based access control and auditability
- Regulatory compliance and reporting
- Scalable architecture for single or multi-farm operations

Current scope: Phase 1 focuses on the Farm Manager role with core modules for KPIs, inventory, feeding, sampling, mortality, and water quality.

---

## Core Features (v1.0)
### Dashboard and KPIs
- ABW, eFCR, mortality, water quality, feeding rate, biomass
- Drill-down by system, batch, and growth stage
- Alerts and recent activity feed

### Inventory
- Fish inventory snapshots
- Feed inventory tracking
- Reconciliation views

### Data Entry
- Feeding, mortality, sampling, transfer, harvest, stocking, water quality
- Recent entries lists

### Reporting
- Performance, growth, feeding, mortality reports

### Security
- Email/password authentication with verification
- Row Level Security enforced in Supabase
- Read access via `api_*` views, writes to base tables

---

## Tech Stack
- Frontend: Next.js (App Router), TypeScript, Tailwind CSS
- Backend: Supabase (PostgreSQL, Auth, Realtime, Storage)
- Data: TanStack Query (React Query) for client-side caching and mutations
- Auth: Supabase Auth (email/password)
- Deployment: Vercel + Supabase Cloud

---

## Project Structure

Root
- `app/` Next.js App Router pages
- `components/` UI and feature components
- `hooks/` React hooks
- `lib/` data access, React Query hooks, helpers, types
- `lib/api/` Supabase read APIs (views and base table reads)
- `lib/hooks/` React Query hooks for pages and features
- `lib/react-query/` Query client configuration
- `utils/` Supabase client + middleware helpers
- `public/` static assets
- `styles/` global styles
- `supabase/` local Supabase CLI artifacts

Route pattern
- `app/*/page.tsx` server component guard (auth + data preflight)
- `app/*/page.client.tsx` client UI and React Query hooks

---

## File Catalog (Per-File Purpose)

Root
- `.env.local` local environment variables.
- `.eslintrc.json` ESLint configuration.
- `.gitignore` Git ignore rules.
- `components.json` shadcn/ui configuration.
- `proxy.ts` Next.js proxy that syncs Supabase session and redirects unauthenticated users.
- `next-env.d.ts` Next.js TypeScript globals.
- `next.config.mjs` Next.js configuration.
- `package.json` project dependencies and scripts.
- `package-lock.json` npm lockfile.
- `postcss.config.mjs` PostCSS configuration.
- `README.md` project documentation.
- `tsconfig.json` TypeScript configuration.

App Router
- `app/layout.tsx` root layout and providers.
- `app/page.tsx` root route (landing vs dashboard).
- `app/*/page.tsx` server shells (auth + data preflight).
- `app/*/page.client.tsx` client UIs (React Query + UI composition).

Core components
- `components/providers/*` app providers (auth, theme, react-query).
- `components/layout/*` shared dashboard layout.
- `components/dashboard/*` KPI dashboards and widgets.
- `components/data-entry/*` data entry forms.
- `components/reports/*` reporting UI.
- `components/shared/*` shared selectors and providers.
- `components/ui/*` shadcn/ui primitives.

Data layer
- `lib/api/*` Supabase read APIs (views + base reads).
- `lib/hooks/*` React Query hooks (queries + mutations).
- `lib/supabase-queries*.ts` shared Supabase read helpers.
- `lib/supabase-actions.ts` base table writes.
- `lib/react-query/query-client.ts` React Query defaults.
- `lib/types/database.ts` generated Supabase types.

Supabase utils
- `utils/supabase/*` client/server helpers, middleware, auth guard.

---

## API/View Usage (Per File)

Legend
- `api_*` = read-only views
- `base` = base tables (writes)
- `rpc` = stored procedures

app/
- `app/data-entry/page.tsx` reads: `api_system_options`, `api_fingerling_batch_options`, `api_feed_type_options`; base reads: `suppliers`, recent base event tables via `fetchRecent*` helpers.
- `app/feed/page.client.tsx` reads: `api_efcr_trend`, `api_dashboard`, `api_dashboard_consolidated`, `api_feed_type_options`, `feed_incoming` (via `feed_incoming` + `feed_type` join).
- `app/inventory/page.client.tsx` reads: `api_daily_fish_inventory`, `api_feed_type_options`, `feed_incoming`.
- `app/metrics/page.client.tsx` reads: via `metrics-explorer` (see components/metrics).
- `app/mortality/page.client.tsx` reads: `api_system_options`, `api_fingerling_batch_options`, `fish_mortality` (history).
- `app/production/page.client.tsx` reads: `api_production_summary`, `api_efcr_trend`, `api_dashboard`.
- `app/reports/page.client.tsx` reads: `api_production_summary`, `api_dashboard`.
- `app/sampling/page.client.tsx` reads: `api_system_options`, `api_fingerling_batch_options`, `fish_sampling_weight` (history).
- `app/settings/page.client.tsx` reads: `user_profile` (RLS), `alert_threshold` (RLS); writes: `farm`, `farm_user`, `alert_threshold`, `user_profile`, `profiles`.
- `app/transactions/page.client.tsx` reads: `change_log` (RLS) and activity helpers.
- `app/water-quality/page.client.tsx` reads: `api_system_options`, `water_quality_measurement` (history).

components/dashboard/
- `components/dashboard/health-summary.tsx` reads: `api_dashboard`, `api_dashboard_consolidated`, `api_daily_fish_inventory`, `daily_water_quality_rating`.
- `components/dashboard/kpi-overview.tsx` reads: `api_system_options`, `api_dashboard`, `api_dashboard_consolidated`, `api_daily_fish_inventory`, `api_production_summary`, `daily_water_quality_rating`.
- `components/dashboard/systems-table.tsx` reads: `api_system_options`, `api_dashboard`, `api_daily_fish_inventory`, `api_production_summary`, `daily_water_quality_rating`.
- `components/dashboard/recent-activities.tsx` reads: `change_log`.
- `components/dashboard/recommended-actions.tsx` reads: `api_daily_fish_inventory`, `daily_water_quality_rating`.

components/data-entry/
- `components/data-entry/feeding-form.tsx` reads: `api_system_options`, `api_feed_type_options`, `api_fingerling_batch_options`; writes: `feeding_record` (base).
- `components/data-entry/harvest-form.tsx` reads: `api_system_options`, `api_fingerling_batch_options`; writes: `fish_harvest` (base).
- `components/data-entry/incoming-feed-form.tsx` reads: `api_feed_type_options`; writes: `feed_incoming` (base).
- `components/data-entry/mortality-form.tsx` reads: `api_system_options`, `api_fingerling_batch_options`; writes: `fish_mortality` (base).
- `components/data-entry/sampling-form.tsx` reads: `api_system_options`, `api_fingerling_batch_options`; writes: `fish_sampling_weight` (base).
- `components/data-entry/stocking-form.tsx` reads: `api_system_options`, `api_fingerling_batch_options`; writes: `fish_stocking` (base).
- `components/data-entry/transfer-form.tsx` reads: `api_system_options`, `api_fingerling_batch_options`; writes: `fish_transfer` (base).
- `components/data-entry/water-quality-form.tsx` reads: `api_system_options`; writes: `water_quality_measurement` (base).
- `components/data-entry/system-form.tsx` writes: `system` (base).

components/inventory/
- `components/inventory/fish-inventory.tsx` reads: `api_daily_fish_inventory`.
- `components/inventory/feed-inventory.tsx` reads: `api_feed_type_options`, `feed_incoming`.

components/metrics/
- `components/metrics/metrics-explorer.tsx` reads: `api_daily_fish_inventory`, `api_production_summary`, `daily_water_quality_rating`.

components/notifications/
- `components/notifications/notifications-provider.tsx` reads: `api_system_options`, `alert_threshold` (RLS); realtime: `water_quality_measurement` and `daily_fish_inventory_table` inserts.

components/onboarding/
- `components/onboarding/onboarding-screen.tsx` writes: `profiles` (base).

components/reports/
- `components/reports/performance-report.tsx` reads: `api_dashboard`, `api_production_summary`.
- `components/reports/feeding-report.tsx` reads: `feeding_record` + `feed_type`.
- `components/reports/mortality-report.tsx` reads: `fish_mortality`.
- `components/reports/growth-report.tsx` reads: `api_production_summary`.

components/shared/
- `components/shared/farm-selector.tsx` reads: `api_system_options`, `api_fingerling_batch_options`.
- `components/shared/time-period-selector.tsx` no API use.

components/water-quality/
- `components/water-quality/water-quality-history.tsx` reads: `water_quality_measurement`.
- `components/water-quality/water-quality-charts.tsx` reads: `water_quality_measurement`.
- `components/water-quality/water-quality-form.tsx` reads: `api_system_options`; writes: `water_quality_measurement`.

lib/
- `lib/supabase-queries.ts` centralizes reads for `api_*` views and base tables.
- `lib/supabase-actions.ts` base table writes (insert/update/delete).
- `lib/supabase-client.ts` shared query wrapper for all reads.
- `lib/api/*` thin modules that wrap Supabase reads for features.
- `lib/hooks/*` React Query hooks that consume `lib/api/*` and coordinate cache/mutations.

---

## Getting Started

Prerequisites
- Node.js 18+
- npm or pnpm
- Supabase project

Install
```bash
npm install
# or
pnpm install
```

Environment
```bash
cp .env.local.example .env.local
```

`.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Run
```bash
npm run dev
```

Open http://localhost:3000

---

## Authentication and RLS Notes
- Read access uses `api_*` views.
- Writes use base tables and are protected by RLS.
- Middleware checks user session on protected routes.
- Server `page.tsx` shells call `requireUser()` before rendering `page.client.tsx`.

---

## License
Proprietary - Copyright 2026 AquaSmart. All rights reserved.

# AquaSmart

AquaSmart is a Next.js and Supabase aquaculture operations platform for farm teams that need to capture daily production events, monitor cage performance, track feed and water-quality risk, and report on farm performance from a shared source of truth.

The app is built around authenticated workspaces, farm-level role access, Supabase RLS, database RPCs, server-seeded React Query data, and offline-friendly data capture for field workflows.

Additional documentation:

- Product and system notes: `docs/AQUASMART.md`
- Route and backend flow notes: `docs/FLOW_LOGIC.md`
- Feature-slice conventions: `src/features/README.md`

## Current App Scope

AquaSmart currently covers:

- Farm dashboard KPIs, system status, production health, water-quality signals, actions, and recent activity
- Production analysis for biomass, ABW, fish count, density, feed use, eFCR, mortality, and harvest movement
- Feed analysis for ration variance, feed-rate trends, feed inventory, stock coverage, and feed exceptions
- Sampling and growth review for fish weight progress and sample freshness
- Mortality review and investigation workflows
- Water-quality monitoring with parameter, environment, depth, alert, and compliance views
- Reports for performance, feeding, growth, mortality, and water quality
- Data-entry workflows for systems, stocking, feeding, feed inventory, sampling, mortality, transfer, harvest, and water quality
- Onboarding, workspace selection, farm setup, user management, farm settings, and alert-threshold configuration
- PWA/offline support for operational capture and background sync status

## Routes

### Public and Auth

- `/` shows the marketing page when signed out and routes signed-in users into the app.
- `/auth` handles sign-in.
- `/auth/callback`, `/auth/confirm`, `/auth/auth-error`, `/auth/set-password`, and `/forgot-password` support the Supabase auth flow.
- `/onboarding`, `/onboarding/create-workspace`, and `/onboarding/select-workspace` handle first-run and workspace selection.

### Main App

- `/dashboard`: main farm dashboard with shared filters, KPI cards, system table, water-quality summary, forecasts, actions, and recent activity.
- `/production`: production dashboard and production table.
- `/feed`: feed dashboard, feed trends, ration variance, inventory coverage, and feed exceptions.
- `/sampling`: sampling and growth dashboard.
- `/mortality`: mortality dashboard and investigation views.
- `/water-quality`: water-quality dashboard with `environment`, `parameter`, `depth`, and `alerts` tabs.
- `/reports`: report screens and export-oriented report presentation.
- `/data-entry`: operational data capture for farm events and recent-entry feedback.
- `/settings`: farm profile and alert-threshold settings.
- `/users`: user management.
- `/actions`: operational action list.
- `/unauthorized`: access-denied page.

Older `/dashboard/<feature>` URLs for standalone feature pages are redirected to the canonical standalone routes by `src/proxy.ts`. The dashboard root remains `/dashboard`; data entry remains `/data-entry`.

## Role Model

Farm access is role-based. Current canonical roles are:

- `admin`: full workspace and farm administration.
- `farm_manager`: operational management and analytics access.
- `system_operator`: data-entry and day-to-day operational access.
- `data_analyst`: analytics and reporting-focused access.
- `viewer`: read-only dashboard and reporting access.

Legacy role names are normalized in `src/lib/app-entry.ts` for compatibility:

- `farm_technician` and `inventory_storekeeper` map to `system_operator`.
- `analyst_planner` maps to `data_analyst`.
- `viewer_auditor` maps to `viewer`.

## Data Flow

The app uses a server-first read path:

- App Router pages in `src/app/**/page.tsx` fetch route data on the server.
- Feature read logic lives in `src/features/**/queries.server.ts`.
- Server pages seed React Query with `HydrationBoundary` and `dehydrate`.
- Client pages and widgets read hydrated state through hooks in `src/lib/hooks`.
- Shared Supabase read helpers live in `src/lib/api`.
- Offline-critical writes use API routes under `src/app/api/**`.
- Server-action writes live in feature slices such as `src/features/feed`, `src/features/farm`, `src/features/settings`, and `src/features/onboarding`.

Reads should prefer approved RPCs, views, projections, or narrow table reads. Frontend code should not re-own database business rules when an RPC already owns that behavior.

## Database and Analytics

Supabase provides auth, RLS, tables, views, RPCs, generated TypeScript types, and analytics projections.

Important app-facing RPCs and read models include:

- `api_dashboard_systems`
- `api_dashboard_consolidated`
- `api_daily_fish_inventory_rpc`
- `api_production_summary`
- `api_time_period_bounds_scoped`
- `api_fingerling_batch_options_rpc`
- `api_system_options_rpc`
- `api_feed_type_options_rpc`
- direct `feed_supplier` reads where applicable
- `api_efcr_trend`
- `api_daily_overlay`
- `api_latest_water_quality_status`
- `api_water_quality_sync_status`
- `analytics.daily_system_facts`
- `analytics.production_summary`

Recent backend expectations:

- Batch options are scoped by `api_fingerling_batch_options_rpc(p_farm_id, p_active_only)`.
- System options are sourced from `api_system_options_rpc`.
- Feed type options are sourced from `api_feed_type_options_rpc`; the frontend does not apply an extra feed-type existence filter.
- Time-period bounds are resolved through `api_time_period_bounds_scoped`, not client-side date math.
- Production reads use `api_production_summary` and related analytics sources. The frontend should not synthesize production fallback rows from raw tables when analytics is stale; refresh the backend projection/RPC instead.

## Shared Filters and Time Periods

Shared filters support:

- time window
- batch
- growth stage
- system

Supported time-period enum values come from `Constants.public.Enums.time_period` in `src/lib/types/database.ts`:

- `day`
- `week`
- `2 weeks`
- `month`
- `quarter`
- `6 months`
- `year`

The UI also supports `all history` as a frontend-only sentinel where a full-range view is needed.

`api_time_period_bounds_scoped` resolves date windows by farm, scope, selected period, anchor date, and optional system. Dashboard windows are backend-scoped so active systems do not disappear simply because one system has newer data than the others.

## Data Entry

The data-entry page supports:

- system creation
- stocking
- feeding
- feed inventory receipt
- sampling
- mortality
- transfer
- harvest
- water-quality measurement
- quick batch creation
- quick feed type creation
- recent-entry feedback
- offline save and sync status

Feed type and batch dropdowns are DB-backed. They should be fixed at the RPC layer rather than filled with frontend fallbacks.

## Offline and PWA

The app uses `@ducanh2912/next-pwa`, Dexie, and app-level sync providers for offline-friendly operator workflows.

Relevant files:

- `public/sw.js`: generated service worker build output.
- `public/workbox-*.js`: Workbox runtime output.
- `src/components/offline/*`: offline status and sync UI.
- `src/lib/offline/*`: offline storage and sync logic.

Generated service worker files can change when the app is built because the cached Next.js build ID and chunk hashes change.

## Project Structure

- `src/app`: App Router routes, route handlers, layouts, loading states, and error states.
- `src/components`: reusable UI, data-entry forms, reports, layout, providers, offline UI, and shared controls.
- `src/features`: route-facing server reads, feature mutations, feature-local types, and shaping logic.
- `src/lib/api`: client-side Supabase read helpers.
- `src/lib/hooks`: React Query hooks, shared filter hooks, and dashboard hooks.
- `src/lib/types`: generated Supabase database types and shared app types.
- `src/lib/supabase`: Supabase browser, server, admin, auth, and access-token clients.
- `src/lib/offline`: offline storage and sync support.
- `supabase/migrations`: database migrations.
- `supabase/functions`: Supabase Edge Functions, maintained outside the Next.js TypeScript app build.
- `public`: static assets and generated PWA files.

## Local Development

Prerequisites:

- Node.js 18+
- npm
- Supabase project credentials

Install dependencies:

```bash
npm install
```

Create `.env.local` with at least:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

Optional environment variables used by parts of the app:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_DEBUG=false
SUPABASE_ACCESS_TOKEN=your_supabase_access_token
```

Run the app:

```bash
npm run dev
```

Run with demo overrides:

```bash
npm run dev:demo
```

Build and start:

```bash
npm run build
npm run start
```

## Database Types

Regenerate Supabase database types after DB migrations that change tables, enums, views, or RPC signatures:

```bash
npm run db:types
```

The script loads `.env.local`, runs `supabase@latest gen types`, and writes:

```text
src/lib/types/database.ts
```

If the command returns `Unauthorized`, refresh `SUPABASE_ACCESS_TOKEN` in `.env.local` or your shell environment.

## Quality Checks

Run before committing application changes:

```bash
npx.cmd tsc --noEmit
npm.cmd run lint
git diff --check
```

On non-Windows shells, use `npx tsc --noEmit` and `npm run lint`.

## Conventions

- Keep read logic server-first and feature-scoped.
- Prefer DB-backed enums and constants from `src/lib/types/database.ts`.
- Keep UI-scoped subsets documented in shared constants, such as transfer types and system form types.
- Do not add frontend fallback lists for DB-owned options.
- Do not duplicate active-batch, system-option, or time-period rules in the frontend when the RPC owns them.
- Use shared mutation schemas where practical so forms and API routes do not drift.
- Treat analytics refresh as a backend concern.

## License

Proprietary. All rights reserved.

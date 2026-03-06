# AquaSmart — Aquaculture Farm Intelligence Platform

AquaSmart is a Next.js + Supabase platform for aquaculture operations. It provides real-time KPIs, feed management, inventory, sampling/growth analysis, mortality tracking, water‑quality monitoring, and compliance-ready reporting.

---

**What It Delivers**
- Operational dashboards with farm, system, batch, and stage filters
- Time‑bounded analytics driven by a single time‑period RPC
- Feed efficiency and nutrition analytics with anomaly detection
- Inventory monitoring (fish + feed) and reconciliation
- Data entry workflows for all core farm events
- Water‑quality monitoring with thresholds, alerts, and compliance exports
- Transactions/activity log with operator and system analysis

---

**Architecture At A Glance**
- Frontend: Next.js App Router + React Query + Tailwind
- Backend: Supabase (Postgres + Auth + RLS)
- Data flow: Pages → React Query hooks → `lib/api/*` → Supabase RPCs / tables
- Auth: Supabase session required for all reads (except public landing)

---

**API Surface (Backend Contract)**

**KPI / Analytics RPCs (frontend-safe)**
- `api_dashboard(...)`
- `api_dashboard_systems(...)`
- `api_dashboard_consolidated(...)`
- `api_daily_fish_inventory(...)` (paged: cursor/order/limit)
- `api_daily_overlay(...)`
- `api_production_summary(...)`
- `api_efcr_trend(...)`
- `api_water_quality_as_of(...)`
- `api_water_quality_status(...)`
- `api_time_period_bounds(p_farm_id, p_time_period)`
- `api_time_period_options()`

**Options RPCs (replacing PostgREST option views)**
- `api_farm_options_rpc()`
- `api_system_options_rpc(p_farm_id, p_stage, p_active_only)`
- `api_fingerling_batch_options_rpc(p_farm_id)`
- `api_feed_type_options_rpc()`

**Raw Table Reads**
- Only allowed in `lib/api/reports.ts` (plus water-quality mutations).

---

**Time Period Logic (How Today / Week / Month / Year Works)**
- Preset enum values: `day`, `week`, `2 weeks`, `month`, `quarter`, `6 months`, `year`
- Backend table: `dashboard_time_period(time_period, days_since_start)`
- Single source of truth: `api_time_period_bounds(p_farm_id, p_time_period)`
- `input_end_date` = max inventory date for the farm (from `daily_fish_inventory_table`)
- `input_start_date` = `input_end_date - days_since_start`
- Frontend validates selection via `parseDateToTimePeriod` and always resolves bounds via the RPC.

---

**Pages & Screens**

**Home ("/")**
- Shows marketing landing when signed out and the dashboard when signed in.
- Landing highlights product value and routes to auth.

**Auth (`/auth`, `/auth/auth-error`, `/auth/verify-success`)**
Both login and verification flow for Supabase auth.

**Dashboard (`/`)**
- KPI overview cards for eFCR, mortality, ABW, biomass, feeding, water quality.
- Systems table with drilldown and exception flags.
- Health summary and recommended actions.
- Production summary metrics and recent activities timeline.

**Feed Management (`/feed`)**
- eFCR trend line with target reference.
- Nutrition analysis (protein/fat mix by feed type).
- Feeding anomalies and attention table (fair/poor responses).
- Feed incoming inventory table.

**Inventory (`/inventory`)**
- Fish inventory tab: live inventory, filters by system/batch/stage.
- Feed stock tab: incoming feed history and current stock state.
- Reconciliation tab: cross-checks inventory consistency.

**Production (`/production`)**
- System‑level analysis with KPI trend chart and table.
- Metric filter (eFCR periodic/aggregated, ABW, mortality, feeding, density).
- Range resolved via time‑period bounds or explicit date range.

**Sampling & Growth (`/sampling`)**
- ABW trend with projected growth curve and target weight overlays.
- Sample quality calculator (mean, std dev, CV, sample size validation).
- Drill‑down sampling table by system/batch/stage.

**Reports (`/reports`)**
- Consolidated performance, feeding, mortality, growth, and water‑quality reports.
- CSV/PDF export from report components.

**Transactions & Activity (`/transactions`)**
- Consolidated change‑log activity feed.
- Operator summaries and system activity tables.
- Filters by event type, operator, system, stage, batch, and time period.

**Water Quality (`/water-quality`)**
- Status panels for DO and ammonia thresholds.
- Measurement log and compliance reporting table.
- Trend chart with feeding/mortality overlays.
- Threshold configuration and predictive alerts.

**Settings (`/settings`)**
- Farm profile fields (name, location, owner, contact).
- Farm‑level alert thresholds (DO, ammonia, mortality).
- Creates farm and farm_user linkage when needed.

**Data Entry (`/data-entry`)**
- Modular forms for: system, stocking, mortality, feeding, sampling, transfer, harvest, water quality, incoming feed.
- Recent entries list per entry type.
- Deep‑linking via URL parameters for form presets.

---

**Modules (What Each Contains / Presents)**

**Dashboard Module**
- KPI cards, health summary, population overview, systems table, recent activity, recommended actions.

**Feed Module**
- eFCR trend, nutrition analysis, feeding anomalies, feed incoming inventory.

**Inventory Module**
- Fish inventory view, feed inventory view, reconciliation report.

**Production Module**
- KPI trend chart with metric selector and production table.

**Reports Module**
- Performance, growth, feeding, mortality, water‑quality compliance reports with exports.

**Water‑Quality Module**
- Measurement logs, daily ratings, overlays, thresholds, predictive alerts.

**Data‑Entry Module**
- All operational input forms + recent entries feed.

---

**Project Structure**
- `app/` Next.js routes (server shell + client UI)
- `components/` UI and feature modules
- `hooks/` shared UI hooks (filters, auth helpers)
- `lib/api/` Supabase read APIs (RPCs + allowed table reads)
- `lib/hooks/` React Query hooks for data access
- `lib/types/` Supabase database types
- `lib/utils/` shared helpers (date parsing, reporting exports)
- `utils/` Supabase client/server/session/log helpers

---

**Getting Started**

Prerequisites
- Node.js 18+
- Supabase project

Install
```bash
npm install
```

Env
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Run
```bash
npm run dev
```

---

**Security & RLS**
- All read access uses RPCs or approved views with RLS.
- Write access uses base tables with RLS and audited server rules.
- Sessions are required for all data reads in production routes.

---

**License**
Proprietary — Copyright 2026 AquaSmart. All rights reserved.

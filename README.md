# Samaki360 – Aquaculture Farm Intelligence Platform

Samaki360 is a real-time operational intelligence platform for modern aquaculture farms. Built with Next.js and Supabase, it lets farm teams capture daily production data in the field (online or offline), monitor key performance indicators, manage feed and stock, track sampling and mortality, watch water quality, and generate compliance-ready reports — all from a single, secure interface.

---

## 🎯 Vision

Enable data-driven decision-making in aquaculture through:
- Real-time visibility into farm performance
- Automated alerts for critical anomalies
- Role-based access control and auditability
- Regulatory compliance and reporting
- Offline-friendly field data capture
- Scalable architecture for single- or multi-farm operations

---

## 🧩 Core Features

### ✅ Dashboard & Core KPIs
- Live ABW, eFCR, biomass, survival, and mortality across the farm
- Drill-down by cage/system, batch, and growth stage
- Configurable threshold alerts with an alert-history feed
- Activity planner for scheduled operational tasks

### ✅ Production & Batches
- Per-cage and per-batch production trends over any time window
- Batch lineage: stocking source, quantities, ABW at stock, current status
- Growth, eFCR, mortality, and ABW-projection charts scoped to the selected period and filters

### ✅ Feed Management
- Daily feeding logs with operator attribution
- Feed inventory with reorder-point awareness
- Effective Feed Conversion Ratio (eFCR) and consumption trends

### ✅ Sampling & Mortality
- ABW sampling with statistical summaries and growth projection vs. target harvest weight
- Mortality logging with cause classification and trend dashboards

### ✅ Water Quality
- Manual logging of DO, temperature, pH, ammonia, and depth
- Per-parameter threshold status and historical trends
- Compliance-ready exports

### ✅ Reporting & Exports
- Pre-built performance, feed, mortality, and water-quality reports
- One-click CSV export from data views
- Branded PDF templates with farm details and commentary

### ✅ Offline Field Capture
- Standalone data-entry PWA that works with no connection
- Local queue (IndexedDB) with background sync when connectivity returns

### ✅ Security & Access Control
- Supabase email/password authentication with verification
- Role-Based Access Control across five roles
- PostgreSQL Row-Level Security enforced at the database layer
- Reviewable migration history for every schema and policy change

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS |
| Charts | Tremor, Chart.js (`react-chartjs-2`) |
| Data layer | TanStack Query, TanStack Table |
| Forms & validation | React Hook Form, Zod |
| Offline | Dexie (IndexedDB), `@ducanh2912/next-pwa` service worker |
| Backend | Supabase (PostgreSQL, Auth, Row-Level Security) |
| Transactional email | Resend (planned-activity reminders) |
| Deployment | Vercel (web + cron), Supabase Cloud (database) |

---

## 📁 Project Structure

```
samaki360/
├── src/
│   ├── app/            # Next.js App Router: routes, layouts, API handlers, page shells
│   ├── components/     # Shared UI and layout primitives
│   ├── features/       # Domain modules — reads, writes, hooks, components, selectors, types
│   │                   #   dashboard, production, feed, sampling, water-quality, batches,
│   │                   #   systems, reports, data-entry, actions, settings, onboarding, farm
│   ├── lib/            # Infrastructure: Supabase clients, server auth, caching, offline, helpers
│   └── proxy.ts        # Edge middleware
├── supabase/
│   ├── migrations/     # One file per schema/RLS change
│   ├── seed.sql        # Synthetic seed data for local environments
│   └── config.toml
├── public/             # Static assets
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- npm
- A Supabase project (free tier is fine)

### 1. Clone the repo
```bash
git clone https://github.com/cherotichfaith-data/Samaki360-aquaculture-management-system.git
cd Samaki360-aquaculture-management-system
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create `.env.local` in the project root:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key   # server-only, admin tasks

NEXT_PUBLIC_APP_URL=http://localhost:3000         # canonical site URL for metadata/links

# Optional — planned-activity reminder emails (Vercel Cron + Resend)
RESEND_API_KEY=your_resend_key
REMINDER_EMAIL_FROM="Samaki360 <no-reply@yourdomain>"
CRON_SECRET=your_cron_secret
```

> 🔐 `.env.local` is gitignored — never commit it.

### 4. Run the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

Other scripts: `npm run build`, `npm run start`, `npm run lint`, `npm run db:types` (regenerate `src/lib/types/database.ts` from the live schema).

---

## 🔒 Authentication & Roles

Authentication is Supabase Auth (email/password). Five roles, each with its own entry point:

| Role | Lands on | Access |
|---|---|---|
| `admin` | Dashboard | Full access, including settings and user management |
| `farm_manager` | Dashboard | Full operational access for assigned farms |
| `system_operator` | Data entry | Field data capture |
| `data_analyst` | Production | Analytics and reporting, read-oriented |
| `viewer` | Reports | Read-only |

Authorization is enforced by **PostgreSQL Row-Level Security**, not by application code. Server code reads and writes through the session-scoped client from `resolveServerUser()` / `requireApiUser()` (`src/lib/server/auth.ts`) and lets the database decide what the user can see and do. The service-role client (`src/lib/supabase/admin.ts`) is reserved for the narrow set of cases documented in its doc comment.

---

## 📊 Database Changes

Every schema change — a new table, a new or updated RLS policy, a new column — goes in its own file under `supabase/migrations`, created with `supabase migration new <description>` and reviewed like any other code change. Don't edit the schema live in the Supabase dashboard and catch git up later; by the time that happens the migration history no longer describes how the schema actually got here, and there's no reviewable diff for what changed or why.

`20260817090000_add_planned_activities_and_reminders.sql` is the reference shape: table, indexes, foreign keys, `ENABLE ROW LEVEL SECURITY`, and every policy the table needs, all in the one migration that introduces the table — not bolted on later once something bypassing RLS turns out to need them.

---

## 🧪 Quality Checks

There is no automated test suite yet. Before pushing:
```bash
npm run lint          # ESLint
npx tsc --noEmit      # type check
npm run build         # production build
```

---

## 📅 Roadmap

- Automated test coverage for KPI calculators and data transforms
- Multi-farm rollups and comparison views
- Custom report builder
- REST API for external integrations
- IoT sensor auto-sync (water quality, feeders)
- Predictive alerts from trend analysis

---

## 📄 License

Proprietary – © 2026 Samaki360. All rights reserved.

---

## 🙋 Support

For issues or feature requests, open an issue on this repository or contact the product team.

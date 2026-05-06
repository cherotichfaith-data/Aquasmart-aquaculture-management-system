# AquaSmart — Scalable Supabase Backend: Production Setup Guide

> **Scope:** This guide treats AquaSmart as a greenfield production project and walks through every layer of the Supabase backend — from environment bootstrap to schema design, RLS, connection pooling, indexing, materialized-view strategy, Edge Functions, cron jobs, Storage, Realtime, CI/CD, backups, and security hardening. Every recommendation is grounded in Supabase's official documentation and production experience at scale.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Project Bootstrap & Environment](#2-project-bootstrap--environment)
3. [Schema Design Principles](#3-schema-design-principles)
4. [Multi-Tenant Row-Level Security (RLS)](#4-multi-tenant-row-level-security-rls)
5. [Indexes & Query Performance](#5-indexes--query-performance)
6. [Materialized Views & Refresh Strategy](#6-materialized-views--refresh-strategy)
7. [Connection Pooling (Supavisor / pgBouncer)](#7-connection-pooling-supavisor--pgbouncer)
8. [TypeScript Types & End-to-End Safety](#8-typescript-types--end-to-end-safety)
9. [Edge Functions](#9-edge-functions)
10. [Scheduled Jobs with pg_cron](#10-scheduled-jobs-with-pg_cron)
11. [Background Jobs & Queues (pgmq)](#11-background-jobs--queues-pgmq)
12. [File Storage & CDN](#12-file-storage--cdn)
13. [Realtime (Alerts & Live Data)](#13-realtime-alerts--live-data)
14. [Migrations & CI/CD Pipeline](#14-migrations--cicd-pipeline)
15. [Backup, Recovery & PITR](#15-backup-recovery--pitr)
16. [Security Hardening](#16-security-hardening)
17. [Monitoring & Observability](#17-monitoring--observability)
18. [AquaSmart-Specific Schema Recommendations](#18-aquasmart-specific-schema-recommendations)
19. [Production Checklist](#19-production-checklist)

---

## 1. Architecture Overview

AquaSmart is a **multi-tenant aquaculture management platform**. The backend is built entirely on Supabase (managed Postgres + Auth + Storage + Realtime + Edge Functions). The tenancy hierarchy is:

```
Organization  ──has many──▶  Farm  ──has many──▶  System (cage/pond/tank)
     │                          │                        │
     └── farm_user (roles)       └── production data      └── sensor / measurement data
```

The core principle for scalability: **every data table carries a `farm_id` column**, and Row-Level Security (RLS) policies enforce farm membership at the database layer — not in application code. This means even if application bugs exist, data isolation is guaranteed by Postgres itself.

### Component Map

| Layer | Supabase Service | Purpose |
|---|---|---|
| Auth | Supabase Auth | Email/password + OAuth login, JWT |
| Data | Postgres 15+ | All operational data, analytics functions |
| API | PostgREST (auto) | REST + GraphQL from schema |
| Real-time | Supabase Realtime | Water quality alerts, live dashboard |
| Storage | Supabase Storage + CDN | Raw upload files, lab reports |
| Compute | Edge Functions (Deno) | Email notifications, webhooks, ML inference |
| Scheduling | pg_cron + Supabase Cron | Materialized view refresh, nightly rollups |
| Queuing | pgmq | Async report generation, file processing |

---

## 2. Project Bootstrap & Environment

### 2.1 Install the Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# npm (cross-platform)
npm install -g supabase

# Verify
supabase --version
```

### 2.2 Initialise a New Project

```bash
# In the AquaSmart repo root
supabase init

# This creates:
#   supabase/
#     config.toml          ← local dev config
#     migrations/          ← versioned SQL migrations
#     seed.sql             ← dev seed data
#     functions/           ← Edge Functions
```

### 2.3 Link to Your Production Project

```bash
# Get your project ref from dashboard.supabase.com
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>
```

### 2.4 Environment Variables

Create a `.env.local` for Next.js (never commit this file):

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>          # safe to expose — RLS protects data
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>       # server-only, never in browser bundles
SUPABASE_DB_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres
```

Add to `.gitignore`:

```
.env
.env.local
.env.production
```

### 2.5 supabase/config.toml Key Settings

```toml
[db]
port = 54322
shadow_port = 54320
major_version = 15

[api]
enabled = true
port = 54321
schemas = ["public", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000          # prevent runaway queries on public API

[auth]
site_url = "https://app.aquasmart.io"
additional_redirect_urls = ["http://localhost:3000"]
jwt_expiry = 3600        # 1 hour; refresh token = 30 days

[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = true

[realtime]
enabled = true

[storage]
enabled = true
file_size_limit = "50MiB"
```

---

## 3. Schema Design Principles

### 3.1 Tenancy Columns on Every Table

Every operational table must include:

```sql
farm_id   uuid NOT NULL REFERENCES farm(id) ON DELETE CASCADE,
```

This single column is the anchor for all RLS policies and the primary partition key for all B-tree indexes. Never omit it.

### 3.2 Use `uuid` for Cross-Service IDs, `bigint` for High-Volume Rows

```sql
-- Cross-service / externally referenced entities → uuid
CREATE TABLE organization (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ...
);

-- High-volume transactional tables → bigint identity (smaller, faster joins)
CREATE TABLE water_quality_measurement (
  id        bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  farm_id   uuid NOT NULL REFERENCES farm(id),
  system_id bigint NOT NULL REFERENCES system(id),
  ...
);
```

### 3.3 Always Include Audit Timestamps

```sql
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now()
```

Add the trigger to auto-update `updated_at`:

```sql
CREATE OR REPLACE FUNCTION private.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply to every table that needs it
CREATE TRIGGER trg_set_updated_at
BEFORE UPDATE ON public.water_quality_measurement
FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();
```

### 3.4 Idempotent Offline Sync — `local_id`

AquaSmart supports offline data entry. Every event table carries a `local_id` text column with a partial unique index to deduplicate re-syncs:

```sql
ALTER TABLE feeding_record ADD COLUMN local_id text;
CREATE UNIQUE INDEX uix_feeding_record_local_id
  ON feeding_record(local_id) WHERE local_id IS NOT NULL;
```

This is already in place. Keep this pattern for every new event table.

### 3.5 Private Schema for Sensitive Internal Tables

Tables that should never be reachable via the auto-generated PostgREST API belong in the `private` schema:

```sql
CREATE SCHEMA IF NOT EXISTS private;
-- farm_user_invitation, internal audit logs, system config
CREATE TABLE private.farm_user_invitation (...);
```

PostgREST only exposes the `public` schema by default. Sensitive operations are exposed only through `SECURITY DEFINER` RPC functions.

### 3.6 Full AquaSmart Table Inventory (Current)

| Schema | Table | Purpose |
|---|---|---|
| public | organization | Top-level tenant |
| public | farm | Farm within an org |
| public | farm_user | User-to-farm membership + role |
| public | user_profile | Auth user metadata |
| public | system | Cage / pond / tank |
| public | production_cycle | Active growing cycle per system |
| public | fish_stocking | Stocking events |
| public | fish_harvest | Harvest events |
| public | fish_mortality | Mortality records |
| public | fish_sampling_weight | ABW sampling events |
| public | fish_transfer | Fish transfer between systems |
| public | feeding_record | Daily feed records |
| public | feed_type | Feed product catalogue |
| public | feed_supplier | Supplier master |
| public | feed_incoming | Inventory deliveries |
| public | fingerling_batch | Fingerling batch records |
| public | fingerling_supplier | Fingerling supplier master |
| public | water_quality_measurement | Raw WQ sensor/manual readings |
| public | daily_water_quality_rating | Daily WQ score per system |
| public | water_quality_framework | Rating thresholds config |
| public | alert_threshold | Custom alert configs |
| public | normalization_review | Data quality flags |
| public | raw_uploads | Uploaded data files |
| public | cage_id_aliases | Alias mappings for systems |
| public | feed_type_aliases | Feed type normalisation |
| public | wq_parameter_aliases | WQ parameter normalisation |
| public | app_config | App-level configuration |
| public | dashboard_time_period | Preset time windows |
| private | farm_user_invitation | Pending invitations |

---

## 4. Multi-Tenant Row-Level Security (RLS)

### 4.1 Enable RLS on Every Public Table

```sql
-- Run for every table in public schema
ALTER TABLE public.farm ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_quality_measurement ENABLE ROW LEVEL SECURITY;
-- ... repeat for all tables
```

### 4.2 Core Helper Functions (Security Definer)

Wrap membership checks in `SECURITY DEFINER` functions. This is the single most important RLS performance technique — Postgres can cache the result once per query rather than re-evaluating per row.

```sql
-- Returns true if the calling user is a member of the given farm
CREATE OR REPLACE FUNCTION public.is_farm_member(farm uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.farm_user
    WHERE farm_user.farm_id = farm
      AND farm_user.user_id = (SELECT auth.uid())
  );
$$;

-- Returns true if the calling user has one of the specified roles on the farm
CREATE OR REPLACE FUNCTION public.has_farm_role(farm uuid, roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.farm_user
    WHERE farm_user.farm_id = farm
      AND farm_user.user_id = (SELECT auth.uid())
      AND farm_user.role = ANY(roles)
  );
$$;
```

**Why `(SELECT auth.uid())` instead of `auth.uid()`?**
Wrapping in `SELECT` turns the function call into an `initPlan` — Postgres evaluates it once and caches the UUID for the entire statement, instead of calling it on every row. This gives >100x speedup on large tables.

### 4.3 Standard RLS Policy Patterns

**Read: farm members only**
```sql
CREATE POLICY "farm_member_read"
ON public.water_quality_measurement FOR SELECT
TO authenticated
USING (public.is_farm_member(farm_id));
```

**Write: admin or farm_manager only**
```sql
CREATE POLICY "manager_insert"
ON public.feeding_record FOR INSERT
TO authenticated
WITH CHECK (public.has_farm_role(farm_id, ARRAY['admin', 'farm_manager']));
```

**User can only read their own profile**
```sql
CREATE POLICY "own_profile_read"
ON public.user_profile FOR SELECT
USING (user_id = (SELECT auth.uid()));
```

### 4.4 RLS-Safe API Functions (SECURITY DEFINER RPCs)

For complex analytical queries (dashboards, KPIs), bypass row-by-row RLS by writing `SECURITY DEFINER` functions that verify membership once at the start:

```sql
CREATE OR REPLACE FUNCTION public.api_dashboard_consolidated(
  p_farm_id uuid,
  ...
)
RETURNS TABLE(...)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Single membership check — no per-row RLS overhead
  IF NOT public.is_farm_member(p_farm_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT ... FROM public.daily_fish_inventory_table
    WHERE farm_id = p_farm_id ...;
END;
$$;
```

**Grant execute to authenticated only — never to anon:**
```sql
GRANT EXECUTE ON FUNCTION public.api_dashboard_consolidated(uuid, ...) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.api_dashboard_consolidated(uuid, ...) FROM anon;
```

### 4.5 RLS Performance Anti-Patterns to Avoid

```sql
-- ❌ BAD: correlated subquery re-executed per row
USING (EXISTS (
  SELECT 1 FROM farm_user
  WHERE farm_user.farm_id = system.farm_id
    AND farm_user.user_id = auth.uid()    -- called per row
));

-- ✅ GOOD: IN with subquery (Postgres can hash-join this)
USING (farm_id IN (
  SELECT farm_id FROM farm_user
  WHERE user_id = (SELECT auth.uid())
));

-- ✅ BEST: security definer function with cached uid
USING (public.is_farm_member(farm_id));
```

---

## 5. Indexes & Query Performance

### 5.1 Mandatory Index Pattern for Every Event Table

Every time-series table (measurements, feeding, mortality, etc.) needs a composite index on `(system_id, date DESC)` and `(farm_id, date DESC)`:

```sql
-- For every event table following this pattern:
CREATE INDEX idx_wqm_system_date ON water_quality_measurement (system_id, date DESC);
CREATE INDEX idx_wqm_farm_date   ON water_quality_measurement (farm_id,   date DESC);
```

### 5.2 Partial Indexes for Rare Conditions

```sql
-- Only index rows where local_id is set (sparse column)
CREATE UNIQUE INDEX uix_feeding_record_local_id
  ON feeding_record(local_id) WHERE local_id IS NOT NULL;

-- Only index ongoing cycles (most queries filter by ongoing_cycle = true)
CREATE UNIQUE INDEX uq_one_active_cycle_per_system
  ON production_cycle(system_id) WHERE ongoing_cycle = true;
```

### 5.3 GiST / GIN for JSONB Columns

Water quality thresholds are stored as JSONB (`optimal`, `acceptable`, `critical`, `lethal` bands):

```sql
-- Enable fast containment / existence queries on threshold JSONB
CREATE INDEX idx_wqf_thresholds_gin
  ON water_quality_framework USING gin(optimal, acceptable, critical, lethal);
```

### 5.4 Index the RLS Lookup Column

```sql
-- farm_user is the heart of all RLS checks — these must be fast
CREATE INDEX idx_farm_user_user_id ON farm_user(user_id);
CREATE INDEX idx_farm_user_farm_user_role ON farm_user(farm_id, user_id, role);
```

### 5.5 Enable pg_stat_statements for Slow Query Analysis

```sql
-- Already enabled via Supabase — query the view:
SELECT
  query,
  calls,
  round((total_exec_time / calls)::numeric, 2) AS avg_ms,
  round(total_exec_time::numeric, 2) AS total_ms,
  rows
FROM pg_stat_statements
ORDER BY avg_ms DESC
LIMIT 20;
```

Run this monthly and index any column appearing in high-cost WHERE clauses.

### 5.6 VACUUM and Autovacuum Tuning

Supabase manages autovacuum automatically, but for very high-write tables (water_quality_measurement, feeding_record), lower the scale factor:

```sql
ALTER TABLE water_quality_measurement SET (
  autovacuum_vacuum_scale_factor = 0.01,   -- vacuum after 1% of rows change
  autovacuum_analyze_scale_factor = 0.01
);
```

---

## 6. Materialized Views & Refresh Strategy

AquaSmart uses three materialized views that power dashboard performance:

| View | Source Data | Refresh Frequency |
|---|---|---|
| `daily_fish_inventory_table` | All event tables | After each event write |
| `production_summary` | daily_fish_inventory_table | After inventory refresh |
| `efcr_period_last_sampling_view` | production_summary | After production refresh |

### 6.1 CONCURRENT Refresh (Never Block Reads)

Always use `CONCURRENTLY` in production so the view remains readable during refresh:

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY public.daily_fish_inventory_table;
```

**Prerequisite:** The view must have at least one unique index:

```sql
CREATE UNIQUE INDEX daily_fish_inventory_table_sys_date
  ON daily_fish_inventory_table(system_id, inventory_date);
```

### 6.2 Trigger-Based Refresh (Event-Driven)

Use pg_net (already enabled) to call a lightweight Edge Function after writes to event tables:

```sql
CREATE OR REPLACE FUNCTION public.trigger_inventory_refresh()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM net.http_post(
    url := current_setting('app.edge_function_url') || '/refresh-inventory',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := jsonb_build_object('farm_id', NEW.farm_id)
  );
  RETURN NEW;
END;
$$;
```

### 6.3 pg_cron Scheduled Refresh (Safety Net)

Even with event-driven refreshes, schedule a nightly full refresh as a safety net:

```sql
SELECT cron.schedule(
  'refresh-inventory-nightly',
  '0 2 * * *',    -- 2 AM every night
  $$
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.daily_fish_inventory_table;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.production_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.efcr_period_last_sampling_view;
  $$
);
```

### 6.4 Add an Index on the Unique Key Before First Refresh

```sql
-- MUST exist before CONCURRENT refresh can run
CREATE UNIQUE INDEX IF NOT EXISTS daily_fish_inventory_table_sys_date
  ON public.daily_fish_inventory_table(system_id, inventory_date);

CREATE UNIQUE INDEX IF NOT EXISTS production_summary_unique
  ON public.production_summary(system_id, date);
```

---

## 7. Connection Pooling (Supavisor / pgBouncer)

### 7.1 Why This Matters for AquaSmart

Next.js (especially with App Router) runs many short-lived serverless invocations. Each request that goes direct to Postgres costs a new TCP connection — each costs ~10 MB RAM and a ~5ms setup overhead. With 100 concurrent users, that's 100+ direct connections consuming your plan's limit.

### 7.2 Connection Strings

Supabase provides two connection strings per project:

| String | Port | Mode | Use For |
|---|---|---|---|
| **Direct** | 5432 | Session | Long-running processes, migrations |
| **Pooler (Supavisor)** | 6543 | Transaction | Next.js API routes, Edge Functions, all app queries |

```bash
# Direct (migrations only — use supabase CLI)
postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres

# Pooler — use this in your app
postgresql://postgres.<ref>:<password>@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### 7.3 Configure Pool Size

In **Settings → Database → Connection Pooling** in the Supabase dashboard:

- Set pool size to **15–20** for most Pro plan projects (Postgres default is ~100 connections; PostgREST needs ~25).
- Rule: `Pool size ≤ (max_connections × 0.4)` when heavily using PostgREST.
- Each Supavisor port (session + transaction) can use up to the configured pool size independently.

### 7.4 Use Transaction Mode in the Supabase Client

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/lib/types/database"

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options))
        },
      },
    },
  )
}
```

PostgREST (the auto REST layer) connects through the pooler automatically — no configuration needed.

### 7.5 Avoid Prepared Statements in Transaction Mode

pgBouncer transaction mode does not support server-side prepared statements. PostgREST handles this correctly, but if you run raw SQL via `pg` node driver, use `?` placeholders and disable `prepare`:

```typescript
import { Pool } from "pg"
const pool = new Pool({
  connectionString: process.env.POOLER_URL,
  // Transaction mode — no prepared statements
  statement_timeout: 30000,
})
```

---

## 8. TypeScript Types & End-to-End Safety

### 8.1 Generate Types from the Remote Database

```bash
supabase gen types typescript \
  --project-id <YOUR_PROJECT_REF> \
  --schema public,private \
  > src/lib/types/database.ts
```

### 8.2 Use the Generated Type Everywhere

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/lib/types/database"

export function supabaseBrowser() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
```

### 8.3 Automate Type Regeneration in CI

```yaml
# .github/workflows/update-types.yml
name: Update Supabase Types

on:
  schedule:
    - cron: "0 3 * * *"   # nightly
  workflow_dispatch:

jobs:
  update-types:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: |
          supabase gen types typescript \
            --project-id ${{ secrets.SUPABASE_PROJECT_REF }} \
            > src/lib/types/database.ts
      - uses: peter-evans/create-pull-request@v6
        with:
          commit-message: "chore: regenerate supabase types"
          title: "chore: regenerate supabase types"
          branch: chore/regenerate-types
```

### 8.4 Typed Helper Utilities

```typescript
// src/lib/types/helpers.ts
import type { Database } from "./database"

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]

export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]

export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]

// Usage:
type WaterQualityMeasurement = Tables<"water_quality_measurement">
type NewFeedingRecord = InsertTables<"feeding_record">
```

---

## 9. Edge Functions

Edge Functions run on Deno Deploy, globally distributed, and start in < 50 ms. Use them for operations that must not block the database directly.

### 9.1 File Structure

```
supabase/functions/
  _shared/
    cors.ts           ← shared CORS headers
    supabase.ts       ← admin client factory
  refresh-inventory/
    index.ts          ← triggered after event writes
  send-alert/
    index.ts          ← email/push notifications
  process-upload/
    index.ts          ← parse raw CSV uploads
  invite-user/
    index.ts          ← send invitation emails
```

### 9.2 Shared Admin Client

```typescript
// supabase/functions/_shared/supabase.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import type { Database } from "../../src/lib/types/database.ts"

export const supabaseAdmin = () =>
  createClient<Database>(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  )
```

### 9.3 Refresh Inventory Edge Function

```typescript
// supabase/functions/refresh-inventory/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { supabaseAdmin } from "../_shared/supabase.ts"

serve(async (req: Request) => {
  const { farm_id } = await req.json()

  const client = supabaseAdmin()

  // Refresh only the views; keep RPC side-effect free
  await client.rpc("refresh_farm_inventory" as any, { p_farm_id: farm_id })

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  })
})
```

Corresponding DB function:
```sql
CREATE OR REPLACE FUNCTION public.refresh_farm_inventory(p_farm_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.daily_fish_inventory_table;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.production_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.efcr_period_last_sampling_view;
END;
$$;
```

### 9.4 Deploy Edge Functions

```bash
# Deploy a single function
supabase functions deploy refresh-inventory --project-ref <ref>

# Deploy all functions
supabase functions deploy --project-ref <ref>

# Set secrets (never hardcode in function files)
supabase secrets set RESEND_API_KEY=<key> --project-ref <ref>
supabase secrets set SENDGRID_API_KEY=<key> --project-ref <ref>
```

---

## 10. Scheduled Jobs with pg_cron

### 10.1 Enable pg_cron

Already enabled on all Supabase projects. Verify:

```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

### 10.2 AquaSmart Cron Schedule

```sql
-- 1. Nightly materialized view refresh (2 AM)
SELECT cron.schedule(
  'nightly-inventory-refresh',
  '0 2 * * *',
  $$ SELECT public.refresh_farm_inventory(NULL) $$
);

-- 2. Hourly water quality rating computation
SELECT cron.schedule(
  'hourly-wq-rating',
  '5 * * * *',
  $$ SELECT public.compute_pending_wq_ratings() $$
);

-- 3. Daily alert check (7 AM — before farmers start work)
SELECT cron.schedule(
  'daily-alert-check',
  '0 7 * * *',
  $$ SELECT public.process_pending_alerts() $$
);

-- 4. Weekly dead invitation cleanup
SELECT cron.schedule(
  'cleanup-expired-invitations',
  '0 0 * * 0',
  $$
    UPDATE private.farm_user_invitation
    SET revoked_at = now()
    WHERE revoked_at IS NULL
      AND accepted_at IS NULL
      AND created_at < now() - interval '30 days';
  $$
);

-- 5. Monthly pg_stat_statements reset (keep it lean)
SELECT cron.schedule(
  'monthly-stat-reset',
  '0 0 1 * *',
  $$ SELECT pg_stat_statements_reset() $$
);
```

### 10.3 Monitor Cron Job Health

```sql
-- View all scheduled jobs
SELECT jobname, schedule, command, active FROM cron.job;

-- View recent run history (last 24 hours)
SELECT
  jobname,
  status,
  start_time,
  end_time,
  return_message
FROM cron.job_run_details
WHERE start_time > now() - interval '24 hours'
ORDER BY start_time DESC;
```

### 10.4 Cron Job Limits

Per Supabase guidance: no more than **8 jobs running concurrently**, each running no more than **10 minutes**. Space out heavy jobs by at least 30 minutes.

---

## 11. Background Jobs & Queues (pgmq)

For operations that could take > 10 seconds (CSV processing, PDF report generation, bulk data imports), use pgmq — a Postgres-native message queue built into Supabase.

### 11.1 Enable pgmq

```sql
CREATE EXTENSION IF NOT EXISTS pgmq;
```

### 11.2 Create Queues for AquaSmart Workloads

```sql
-- Raw file processing queue
SELECT pgmq.create('raw_upload_processing');

-- Report generation queue
SELECT pgmq.create('report_generation');

-- Outbound notification queue
SELECT pgmq.create('notifications');
```

### 11.3 Enqueue a Job (from Application or Trigger)

```sql
-- After a raw_uploads row is inserted, enqueue processing
CREATE OR REPLACE FUNCTION public.enqueue_raw_upload_processing()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pgmq.send(
    'raw_upload_processing',
    jsonb_build_object(
      'upload_id', NEW.id,
      'farm_id',   NEW.farm_id,
      'file_path', NEW.file_path
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enqueue_upload
AFTER INSERT ON public.raw_uploads
FOR EACH ROW EXECUTE FUNCTION public.enqueue_raw_upload_processing();
```

### 11.4 Worker Edge Function

```typescript
// supabase/functions/process-upload/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { supabaseAdmin } from "../_shared/supabase.ts"

serve(async () => {
  const client = supabaseAdmin()

  // Read up to 5 messages at once, 30s visibility timeout
  const { data: messages } = await client.rpc("pgmq_read" as any, {
    queue_name: "raw_upload_processing",
    vt: 30,
    qty: 5,
  })

  for (const msg of messages ?? []) {
    try {
      await processUpload(msg.message)
      // Ack the message on success
      await client.rpc("pgmq_delete" as any, {
        queue_name: "raw_upload_processing",
        msg_id: msg.msg_id,
      })
    } catch (err) {
      console.error("Upload processing failed:", err)
      // Leave message in queue — it will become visible again after vt expires
    }
  }

  return new Response(JSON.stringify({ processed: messages?.length ?? 0 }))
})

async function processUpload(message: Record<string, unknown>) {
  // Parse CSV, normalise column names, insert into staging tables
  console.log("Processing upload:", message.upload_id)
}
```

Schedule the worker via pg_cron to run every minute:

```sql
SELECT cron.schedule(
  'process-uploads',
  '* * * * *',
  $$ SELECT net.http_post(
    url := current_setting('app.edge_function_url') || '/process-upload',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key')),
    body := '{}'::jsonb
  ) $$
);
```

---

## 12. File Storage & CDN

### 12.1 Bucket Structure for AquaSmart

```
Storage buckets:
  raw-uploads/          ← CSV/Excel files uploaded by users (private)
    {farm_id}/{year}/{month}/{upload_id}.csv

  reports/              ← Generated PDF reports (private, signed URLs)
    {farm_id}/{report_type}/{date}/{report_id}.pdf

  assets/               ← Farm photos, avatars (public with CDN)
    farms/{farm_id}/logo.png
    users/{user_id}/avatar.png
```

### 12.2 Create Buckets via Migration

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('raw-uploads', 'raw-uploads', false, 52428800, ARRAY['text/csv', 'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('reports',     'reports',     false, 52428800, ARRAY['application/pdf']),
  ('assets',      'assets',      true,  5242880,  ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT DO NOTHING;
```

### 12.3 Storage RLS Policies

```sql
-- raw-uploads: farm members can upload; only admins can delete
CREATE POLICY "farm_member_upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'raw-uploads' AND
  public.is_farm_member(
    (storage.foldername(name))[1]::uuid   -- first path segment is farm_id
  )
);

CREATE POLICY "farm_member_read_uploads"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'raw-uploads' AND
  public.is_farm_member(
    (storage.foldername(name))[1]::uuid
  )
);

CREATE POLICY "farm_admin_delete_uploads"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'raw-uploads' AND
  public.has_farm_role(
    (storage.foldername(name))[1]::uuid,
    ARRAY['admin']
  )
);
```

### 12.4 Generating Signed URLs for Private Files

```typescript
// Valid for 1 hour
const { data, error } = await supabase.storage
  .from("reports")
  .createSignedUrl(`${farmId}/harvest-report-2026-01.pdf`, 3600)

// With image transformation (for assets bucket)
const { data: avatarUrl } = await supabase.storage
  .from("assets")
  .getPublicUrl(`users/${userId}/avatar.png`, {
    transform: { width: 64, height: 64, resize: "cover" },
  })
```

### 12.5 Smart CDN for Public Assets

Enable Smart CDN in **Settings → Storage** to cache signed URLs at the CDN edge globally (285+ cities). Cache-control headers:

```typescript
// Upload with long cache TTL for static assets
await supabase.storage.from("assets").upload(path, file, {
  cacheControl: "public, max-age=31536000, immutable",  // 1 year for logos
  upsert: false,
})
```

---

## 13. Realtime (Alerts & Live Data)

### 13.1 When to Use Realtime vs Polling

| Use Case | Recommendation |
|---|---|
| Water quality alert threshold breached | **Realtime Broadcast** via Edge Function |
| Live dashboard KPI updates | **Polling** (30–60s interval) — simpler, cheaper |
| Collaborative data entry (rare) | **Realtime Broadcast** |
| Notifications (new invitation) | **Realtime Postgres Changes** on a small table |

### 13.2 Postgres Changes for Notifications

Subscribe to the `farm_user_invitation` table for invitation notifications:

```typescript
// src/hooks/useInvitationNotifications.ts
const channel = supabase
  .channel("invitations")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "private",
      table: "farm_user_invitation",
      filter: `email=eq.${userEmail}`,
    },
    (payload) => {
      toast(`You have a new invitation to join ${payload.new.farm_id}`)
    },
  )
  .subscribe()
```

### 13.3 Broadcast for High-Frequency Alerts

For water quality alerts (potentially many events per minute across many farms), use Broadcast — not Postgres Changes. Broadcast does not go through Postgres WAL and scales far better.

```typescript
// Server: Edge Function sends alert via Broadcast
const channel = supabase.channel(`farm:${farmId}:alerts`)
await channel.send({
  type: "broadcast",
  event: "wq_alert",
  payload: {
    system_id: systemId,
    parameter: "dissolved_oxygen",
    value: 3.2,
    threshold: 4.0,
    severity: "critical",
  },
})

// Client: dashboard subscribes
const alerts = supabase
  .channel(`farm:${farmId}:alerts`)
  .on("broadcast", { event: "wq_alert" }, (payload) => {
    showAlert(payload.payload)
  })
  .subscribe()
```

### 13.4 Always Use Private Channels in Production

```typescript
// Channels created with a JWT-restricted topic are private
const channel = supabase.channel(`private:farm:${farmId}`, {
  config: { private: true },  // enforces auth
})
```

### 13.5 Realtime Limits (Pro Plan)

| Metric | Limit |
|---|---|
| Concurrent connections | 500 |
| Messages per second | 200 |
| Channels per connection | 100 |

For > 500 concurrent users per farm, use Broadcast with server-side fan-out (one Edge Function broadcasts to all subscribers) rather than Postgres Changes subscriptions per user.

---

## 14. Migrations & CI/CD Pipeline

### 14.1 Migration Workflow

```bash
# 1. Create a new migration (timestamped automatically)
supabase migration new add_alert_escalation_table

# 2. Write SQL in supabase/migrations/<timestamp>_add_alert_escalation_table.sql

# 3. Test locally
supabase db reset    # applies all migrations + seed.sql from scratch

# 4. Diff check (never run manual SQL on prod)
supabase db diff --use-migra

# 5. Push to staging
supabase db push --project-ref <STAGING_PROJECT_REF>

# 6. Verify on staging, then push to production
supabase db push --project-ref <PROD_PROJECT_REF>
```

### 14.2 GitHub Actions CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: supabase db push --project-ref ${{ secrets.STAGING_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      - run: supabase functions deploy --project-ref ${{ secrets.STAGING_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

  deploy-production:
    runs-on: ubuntu-latest
    environment: production
    needs: deploy-staging
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: supabase db push --project-ref ${{ secrets.PROD_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      - run: supabase functions deploy --project-ref ${{ secrets.PROD_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

### 14.3 Supabase Branching

Enable **Database Branching** in the Supabase dashboard for preview environments:

- Each pull request automatically gets a Supabase preview branch (ephemeral Postgres instance).
- Migrations in the PR are applied to the branch automatically.
- The branch is destroyed when the PR is merged or closed.
- **Persistent branches** (for staging/QA) are long-lived and never auto-paused.

### 14.4 Migration Safety Rules

1. **Never drop columns directly in production.** Instead: (1) deprecate by renaming with `_deprecated` suffix, (2) remove in a future migration after verifying no app reads it.
2. **Never rename tables.** Create a view with the old name instead.
3. **All DDL migrations must be backward-compatible.** The app and the DB are never updated atomically.
4. **Test on a restored backup copy before running any destructive migration.**

---

## 15. Backup, Recovery & PITR

### 15.1 Backup Tiers

| Plan | Backup Type | Retention |
|---|---|---|
| Free | Daily logical | 1 day |
| Pro | Daily logical | 7 days |
| Pro + PITR add-on | Continuous WAL archiving | Up to 7 days, second-level granularity |
| Enterprise | Physical + PITR | Up to 30 days |

### 15.2 Enable PITR (Strongly Recommended for Production)

In **Settings → Add-ons → Point-in-Time Recovery** — enable PITR. Requires at least the **Small compute add-on**.

PITR allows recovery to any second in the retention window, not just daily snapshots. This is essential for:
- Accidental `DELETE` or `UPDATE` without `WHERE` clause
- Corrupted migration rollback
- Ransomware recovery

### 15.3 Manual Backup Before Destructive Migrations

```bash
# Logical backup via Supabase CLI (use direct connection, not pooler)
pg_dump \
  --dbname="postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres" \
  --format=custom \
  --no-privileges \
  --no-owner \
  -f "backup-$(date +%Y%m%d-%H%M%S).dump"
```

### 15.4 Test Your Restore Process Quarterly

```bash
# Restore to a shadow/test project
pg_restore \
  --dbname="postgresql://postgres:<password>@db.<TEST_REF>.supabase.co:5432/postgres" \
  --clean \
  --no-owner \
  backup-20260401-120000.dump
```

---

## 16. Security Hardening

### 16.1 API Key Management

| Key | Exposure Rule |
|---|---|
| `anon` key | Safe in browser — RLS enforces access |
| `service_role` key | Server-only (Edge Functions, CI/CD); **never in browser bundles** |
| Database password | Server-only; never in `.env` committed to git |

### 16.2 Use Supabase Vault for Secrets in Functions

```sql
-- Store a secret in Vault (dashboard or SQL)
SELECT vault.create_secret('resend_api_key', '<actual-key>', 'Resend email API key');

-- Read it in a trigger or function (never exposed via API)
CREATE OR REPLACE FUNCTION private.send_invitation_email(p_email text, p_farm_name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_api_key text;
BEGIN
  SELECT decrypted_secret INTO v_api_key
  FROM vault.decrypted_secrets
  WHERE name = 'resend_api_key';

  -- Use pg_net to call the email API
  PERFORM net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_api_key),
    body := jsonb_build_object(
      'to', p_email,
      'subject', 'You have been invited to ' || p_farm_name
    )
  );
END;
$$;
```

### 16.3 Rotate Keys Quarterly

```bash
# Supabase CLI — rotate JWT secret
supabase secrets set JWT_SECRET=<new-strong-secret> --project-ref <ref>
```

After rotation, all existing sessions are invalidated. Schedule rotation during low-traffic windows and notify users.

### 16.4 Disable Unused Auth Providers

In **Authentication → Providers**, disable all providers you don't use (GitHub, Google, etc.) to reduce attack surface.

### 16.5 Email Confirm Before Activation

```sql
-- In Auth settings: double_confirm_changes = true, enable_confirmations = true
-- Prevents fake account creation
```

### 16.6 Service Role Isolation

Never use the service role key in Next.js server components or API routes that handle user requests. Use it only in:
- Edge Functions running internal background jobs
- GitHub Actions CI/CD
- Admin scripts on secure machines

Use `getSession()` (cookie-based, no network) for all routing and auth checks.

### 16.7 Restrict the `anon` Role

By default `anon` can SELECT from any public table without RLS. Audit your tables:

```sql
-- Find tables with RLS disabled (security risk)
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;

-- Enable RLS on all of them
-- Then confirm anon cannot read anything sensitive:
SET ROLE anon;
SELECT * FROM farm LIMIT 1;   -- should return 0 rows
RESET ROLE;
```

---

## 17. Monitoring & Observability

### 17.1 Supabase Built-In Monitoring

Access in your Supabase dashboard:
- **Database → Query Performance** — pg_stat_statements, slow queries, cache hit ratio.
- **Database → Roles** — connection count per role.
- **Reports → API** — request counts, error rates, latency percentiles.
- **Reports → Realtime** — connection count, message rates, lag.
- **Logs → Postgres** — raw database error logs.
- **Logs → API** — PostgREST request/response logs.
- **Logs → Edge Functions** — Deno function stdout/stderr.

### 17.2 Key Metrics to Monitor

```sql
-- Cache hit ratio (should be > 99% in production)
SELECT
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) AS cache_hit_ratio
FROM pg_statio_user_tables;

-- Active connections
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

-- Longest running query
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC
LIMIT 5;

-- Table sizes (watch for bloat)
SELECT
  relname AS table,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- Materialized view staleness
SELECT schemaname, matviewname, last_refresh
FROM pg_matviews
ORDER BY last_refresh ASC;
```

### 17.3 Set Up Alerting

Use a cron job + Edge Function to push a daily health report to Slack or email:

```sql
SELECT cron.schedule(
  'daily-health-report',
  '0 8 * * *',
  $$ SELECT net.http_post(
    url := current_setting('app.edge_function_url') || '/health-report',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key')),
    body := '{}'::jsonb
  ) $$
);
```

The Edge Function queries pg_stat_statements, pg_stat_activity, and the cron job history, then sends a summary.

### 17.4 External APM (Optional)

For end-to-end tracing across Next.js + Supabase, integrate OpenTelemetry:

```typescript
// next.config.mjs — instrumentation hook
export const experimental = {
  instrumentationHook: true,
}

// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { NodeSDK } = await import("@opentelemetry/sdk-node")
    const sdk = new NodeSDK({ /* Honeycomb / Datadog / Sentry exporter */ })
    sdk.start()
  }
}
```

---

## 18. AquaSmart-Specific Schema Recommendations

These are production improvements specifically for AquaSmart based on current schema analysis.

### 18.1 Add a `organization` Reference to `farm`

Currently `farm` does not have a direct FK to `organization`. Add it if not already present:

```sql
ALTER TABLE public.farm ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organization(id);
CREATE INDEX IF NOT EXISTS idx_farm_organization_id ON public.farm(organization_id);
```

### 18.2 Partition `water_quality_measurement` by Year (TimescaleDB Alternative)

This table will grow to millions of rows. Use native Postgres range partitioning:

```sql
-- Convert to partitioned table (do in a migration, not on live table)
CREATE TABLE public.water_quality_measurement_partitioned (
  LIKE public.water_quality_measurement INCLUDING ALL
) PARTITION BY RANGE (measured_at);

-- Annual partitions
CREATE TABLE wqm_2025 PARTITION OF water_quality_measurement_partitioned
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE wqm_2026 PARTITION OF water_quality_measurement_partitioned
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
-- ... add future partitions via pg_cron each January
```

Alternatively, use the `pg_partman` extension (available on Supabase) to manage partitions automatically.

### 18.3 Separate the Alert Delivery Table

Currently `alert_threshold` stores configuration. Add an `alert_event` table to track fired alerts:

```sql
CREATE TABLE public.alert_event (
  id          bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  farm_id     uuid NOT NULL REFERENCES farm(id),
  system_id   bigint REFERENCES system(id),
  threshold_id bigint REFERENCES alert_threshold(id),
  parameter   text NOT NULL,
  value       double precision NOT NULL,
  fired_at    timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.alert_event ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_alert_event_farm_fired
  ON alert_event(farm_id, fired_at DESC);
CREATE INDEX idx_alert_event_system_unack
  ON alert_event(system_id, acknowledged_at)
  WHERE acknowledged_at IS NULL;

CREATE POLICY "alert_event_read_farm_member"
ON public.alert_event FOR SELECT TO authenticated
USING (public.is_farm_member(farm_id));
```

### 18.4 Add a `data_version` Column for Offline Conflict Resolution

For tables edited offline, add a monotonically increasing `data_version` to detect staleness:

```sql
ALTER TABLE public.feeding_record    ADD COLUMN IF NOT EXISTS data_version int NOT NULL DEFAULT 1;
ALTER TABLE public.fish_stocking     ADD COLUMN IF NOT EXISTS data_version int NOT NULL DEFAULT 1;
ALTER TABLE public.water_quality_measurement ADD COLUMN data_version int NOT NULL DEFAULT 1;

-- Auto-increment on update
CREATE OR REPLACE FUNCTION public.increment_data_version()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.data_version = OLD.data_version + 1;
  RETURN NEW;
END;
$$;
```

### 18.5 Computed `organization_id` Column in `farm_user`

Currently `farm_user.organization_id` is set by the application. Add a foreign key and computed trigger:

```sql
-- Ensure farm_user.organization_id always matches farm.organization_id
CREATE OR REPLACE FUNCTION public.sync_farm_user_organization()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.organization_id := (
    SELECT organization_id FROM public.farm WHERE id = NEW.farm_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_farm_user_org
BEFORE INSERT OR UPDATE ON public.farm_user
FOR EACH ROW EXECUTE FUNCTION public.sync_farm_user_organization();
```

### 18.6 Add `deleted_at` Soft-Delete to Systems and Farms

Never hard-delete farms or systems — they have historical data. Use soft-delete:

```sql
ALTER TABLE public.system ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.farm   ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Update all RLS policies to exclude deleted records
-- Example:
DROP POLICY IF EXISTS "farm_select" ON public.farm;
CREATE POLICY "farm_select"
ON public.farm FOR SELECT
USING (
  deleted_at IS NULL AND
  public.is_farm_member(id, (SELECT auth.uid()))
);
```

---

## 19. Production Checklist

Use this checklist before going live and when onboarding new infrastructure.

### Security
- [ ] RLS enabled on **every** table in the `public` schema
- [ ] `anon` role cannot SELECT from any table with user data
- [ ] `service_role` key not in any client-side bundle or committed to git
- [ ] `.env` files in `.gitignore`
- [ ] Supabase Vault used for all third-party API keys
- [ ] Auth email confirmation enabled
- [ ] Unused Auth providers disabled
- [ ] API key rotation schedule established (quarterly minimum)

### Database
- [ ] Composite indexes on `(system_id, date DESC)` for all event tables
- [ ] Index on `(user_id)` and `(farm_id, user_id, role)` in `farm_user`
- [ ] Partial unique index on `local_id` for all offline-sync tables
- [ ] RLS helper functions are `SECURITY DEFINER` + `STABLE`
- [ ] All `SECURITY DEFINER` functions have `SET search_path = pg_catalog, public`
- [ ] All analytical RPC functions check membership before returning data
- [ ] Autovacuum scale factor tuned on high-write tables
- [ ] `pg_stat_statements` reviewed and slow queries indexed

### Materialized Views
- [ ] Unique index on every materialized view (required for CONCURRENT refresh)
- [ ] pg_cron nightly refresh scheduled
- [ ] Trigger-based or Edge Function refresh set up for real-time accuracy

### Connection Pooling
- [ ] App uses pooler URL (port 6543), not direct URL (port 5432)
- [ ] Pool size set to ≤ 40% of max_connections
- [ ] No prepared statements in transaction mode

### CI/CD
- [ ] Migrations stored in `supabase/migrations/`, committed to git
- [ ] GitHub Actions deploys migrations to staging before production
- [ ] TypeScript types auto-regenerated nightly via GitHub Actions
- [ ] Supabase branching enabled for PR preview environments

### Backup & Recovery
- [ ] PITR add-on enabled (Pro plan)
- [ ] Manual backup taken before every destructive migration
- [ ] Restore process tested at least quarterly

### Monitoring
- [ ] Query performance dashboard bookmarked and reviewed weekly
- [ ] Cache hit ratio alert set (< 95% = investigate)
- [ ] Active connection alert set (> 80% of max)
- [ ] Cron job health check running daily
- [ ] Edge Function error rate < 0.1% monitored

### Performance
- [ ] Dashboard queries respond in < 500ms (use materialized views)
- [ ] No N+1 queries in data-entry flows
- [ ] Large dataset queries use cursor-based pagination (not OFFSET)
- [ ] Storage CDN enabled for public assets bucket

---

*Guide version: April 2026. Aligned with Supabase Postgres 15, Supavisor 1.x, Edge Functions Deno 1.x.*

*Maintained alongside AquaSmart codebase — update whenever schema changes or Supabase releases major features.*

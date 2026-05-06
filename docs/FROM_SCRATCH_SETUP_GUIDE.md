# AquaSmart — Backend Setup Guide: Starting From Zero

> **Premise:** You have manually collected data in Excel spreadsheets. No Supabase project exists yet. No code is running. This guide takes you from a blank screen to a fully working, production-ready AquaSmart backend — step by step, in order, with nothing assumed.
>
> **Your data, as we found it:**
> | File | Records | Date span |
> |---|---|---|
> | Feed inventory | 1,078 rows | Feb 2024 → Apr 2026 |
> | Feed record | 716 rows | Dec 2023 → Apr 2026 |
> | Mortality (cages) | 169 rows | Oct 2025 → Apr 2026 |
> | Water quality | 1,304 rows | Oct 2025 → Mar 2026 |
> | Fish transfer | 21 rows | Oct 2025 → Jan 2026 |
> | Fish sampling | 18 rows | Jan 2026 → Mar 2026 |
> | Fish stocking | 7 rows | Feb 2026 → Mar 2026 |
>
> Cages found: A1–A6, B1–B4, C1–C9B. Feed types: 9 Aller products (0.5 mm → 4.5 mm). WQ parameters: Temperature, Dissolved Oxygen. This is a cage aquaculture operation on Lake Victoria.

---

## Table of Contents

1. [What We Are Building](#1-what-we-are-building)
2. [Prerequisites: Tools to Install First](#2-prerequisites-tools-to-install-first)
3. [Step 1 — Create Your Supabase Project](#3-step-1--create-your-supabase-project)
4. [Step 2 — Initialize Local Development](#4-step-2--initialize-local-development)
5. [Step 3 — Design the Schema (Your Tables)](#5-step-3--design-the-schema-your-tables)
6. [Step 4 — Write Your First Migration](#6-step-4--write-your-first-migration)
7. [Step 5 — Enable Row-Level Security](#7-step-5--enable-row-level-security)
8. [Step 6 — Seed Reference Data (Feed Types, WQ Framework, etc.)](#8-step-6--seed-reference-data)
9. [Step 7 — Import Your Historical Excel Data](#9-step-7--import-your-historical-excel-data)
10. [Step 8 — Set Up Authentication](#10-step-8--set-up-authentication)
11. [Step 9 — Configure Custom SMTP (Production Email)](#11-step-9--configure-custom-smtp)
12. [Step 10 — Connect the Next.js App](#12-step-10--connect-the-nextjs-app)
13. [Step 11 — Push to Production](#13-step-11--push-to-production)
14. [Step 12 — Verify Everything Works](#14-step-12--verify-everything-works)
15. [Ongoing Maintenance](#15-ongoing-maintenance)
16. [Quick Reference: CLI Commands](#16-quick-reference-cli-commands)

---

## 1. What We Are Building

AquaSmart tracks a cage fish farm. Farmers record data manually on paper and in Excel. The backend will:

- Store all historical and future operational records in a structured database
- Enforce that each farm's data is private to that farm's users
- Power a dashboard showing fish inventory, feed efficiency, water quality, mortality, and forecasts
- Let farm managers invite team members by email
- Accept new data entered from the web app or uploaded as Excel files

The data model has one tenancy hierarchy:

```
Organization → Farm → System (cage/pond/tank) → Event records
```

Everything connects to a `farm_id`. A user joins a farm with a role (admin, farm_manager, viewer). That is the entire security boundary.

---

## 2. Prerequisites: Tools to Install First

You need these four tools before doing anything else.

### 2.1 Node.js (v20+)

```bash
# Check if installed
node --version   # should print v20.x.x or higher

# If not installed, download from https://nodejs.org
```

### 2.2 Docker Desktop

Supabase local development runs inside Docker containers.

```
Download from: https://www.docker.com/products/docker-desktop
```

After installing, open Docker Desktop and make sure it is **running** (the whale icon in your taskbar should be green/active). **This must be running before you do anything with Supabase locally.**

### 2.3 Supabase CLI

```bash
# macOS / Linux with Homebrew
brew install supabase/tap/supabase

# Windows (via Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Or via npm (all platforms)
npm install -g supabase

# Verify
supabase --version
# Expected output: 1.x.x or higher
```

### 2.4 Python 3 with openpyxl (for data import only)

```bash
# Check Python
python3 --version

# Install openpyxl for reading Excel files
pip install openpyxl --break-system-packages
```

---

## 3. Step 1 — Create Your Supabase Project

### 3.1 Sign In to Supabase

Go to **https://supabase.com** → click **Start your project** → sign in with GitHub or email.

### 3.2 Create a New Organisation

- Click **New organisation**
- Name: `AquaSmart` (or your company name)
- Plan: **Pro** (required for PITR backups and custom SMTP in production)

### 3.3 Create a New Project

- Click **New project**
- **Name:** `aquasmart-production`
- **Database password:** Generate a strong one (32+ characters). **Save it immediately — you cannot retrieve it later.**
- **Region:** Choose the region closest to your farm (e.g. `eu-west-1` for East Africa / Europe, or `ap-southeast-1` for Asia/Pacific)
- Click **Create new project**

Wait about 2 minutes for provisioning.

### 3.4 Copy Your Keys

Once the project is ready, go to **Project Settings → API**. Copy these three values and save them:

| Key | Where it goes |
|---|---|
| **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` |
| **anon / public key** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **service_role / secret key** | `SUPABASE_SERVICE_ROLE_KEY` (server only — never in browser) |

Also go to **Project Settings → Database** and copy the **Connection string** (Direct, port 5432) — you will use this when pushing migrations.

---

## 4. Step 2 — Initialize Local Development

You will always build and test locally first, then push to the cloud. Never write SQL directly in the Supabase dashboard on production.

### 4.1 Create a .env.local File

In the root of the AquaSmart repository:

```bash
# .env.local  — DO NOT commit this file
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

Add to `.gitignore`:

```
.env.local
.env.production
.env
```

### 4.2 Initialize the Supabase Project

```bash
cd /path/to/aquasmart

# Initialize (creates supabase/ folder)
supabase init

# You should now have:
# supabase/
#   config.toml
#   migrations/   (empty)
#   seed.sql      (empty)
```

### 4.3 Configure supabase/config.toml

Open `supabase/config.toml` and set:

```toml
[api]
max_rows = 1000

[auth]
site_url = "http://localhost:3000"
additional_redirect_urls = ["https://app.aquasmart.io"]
jwt_expiry = 3600

[auth.email]
enable_signup = true
enable_confirmations = true
double_confirm_changes = true
```

### 4.4 Link to Your Remote Project

```bash
# Log in to Supabase CLI
supabase login
# This opens a browser to authenticate

# Link this local project to your cloud project
supabase link --project-ref xxxxxxxxxxxxxxxxxxxx
# Your project ref is the string after https:// in your Project URL
```

### 4.5 Start the Local Stack

```bash
supabase start
```

This downloads and starts local containers for Postgres, Auth, Storage, and the Supabase Studio. First run takes a few minutes to download images.

When it finishes it prints something like:

```
API URL: http://localhost:54321
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
Anon key: eyJhbGci...
Service role key: eyJhbGci...
```

Open **http://localhost:54323** in your browser — this is your local Supabase Studio. You will use it to verify your schema after each migration.

---

## 5. Step 3 — Design the Schema (Your Tables)

Before writing any SQL, understand what the Excel data tells us about the domain.

### 5.1 Entities Discovered From Your Excel Files

From reading all seven spreadsheets, the domain has:

**Structural entities (master data)**
- **Organization** — the company that owns farms
- **Farm** — the physical fish farm (you have one: on Lake Victoria)
- **System** — individual cages. You have: A1–A6, B1–B4, C1–C9B. Some are "CAGES UNIT", some "HATCHERY UNIT"
- **User / Farm member** — farm staff with roles

**Reference data**
- **Feed type** — 9 Aller products (0.5 mm starter → 4.5 mm finisher), each with pellet size and protein percentage
- **Feed supplier** — e.g. the Aller company
- **Fingerling supplier** — e.g. Kipili Farm, Kimbwela Hatchery
- **Water quality framework** — acceptable/critical/lethal bands for each parameter

**Event data (one row = one thing that happened)**
- **Fish stocking** — fish put into a cage (7 records, from Feb 2026)
- **Fish transfer** — fish moved between cages or to external location (21 records)
- **Fish mortality** — dead fish counted per cage per day (169 records)
- **Fish sampling weight** — weight samples to calculate ABW (18 records)
- **Feeding record** — daily feed per cage (716 records)
- **Feed inventory** — feed stock deliveries and running balance (1,078 records)
- **Water quality measurement** — Temperature and DO per cage (1,304 records)

### 5.2 The Table Dependency Order (Most Important Concept)

Always create tables in this order. A table cannot reference another table that doesn't exist yet.

```
auth.users (Supabase manages this — already exists)
    └── organization
        └── farm
            ├── farm_user  ──────────────────────── auth.users
            ├── user_profile ───────────────────── auth.users
            ├── system
            │   ├── production_cycle
            │   ├── fish_stocking ─────────────── fingerling_batch
            │   ├── fish_transfer
            │   ├── fish_mortality
            │   ├── fish_sampling_weight
            │   ├── feeding_record ────────────── feed_type
            │   └── water_quality_measurement ─── water_quality_framework
            ├── feed_supplier
            ├── feed_type ─────────────────────── feed_supplier
            ├── feed_incoming ─────────────────── feed_type
            ├── fingerling_supplier
            ├── fingerling_batch ──────────────── fingerling_supplier
            └── alert_threshold
```

---

## 6. Step 4 — Write Your First Migration

A migration is a `.sql` file that describes one change to the database. Every change must go through a migration — never write SQL manually in the dashboard on production.

### 6.1 Create the Migration File

```bash
supabase migration new initial_schema
```

This creates: `supabase/migrations/YYYYMMDDHHMMSS_initial_schema.sql`

Open that file and paste the full schema below.

### 6.2 The Complete Initial Schema Migration

```sql
-- =============================================================
-- AquaSmart Initial Schema
-- Starting from scratch — all tables, types, and indexes
-- =============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"       WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto"        WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_net"          WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA extensions;

-- ── Private schema for sensitive tables ──────────────────────
CREATE SCHEMA IF NOT EXISTS private;

-- ── ENUMs ────────────────────────────────────────────────────
CREATE TYPE public.system_type AS ENUM ('cage', 'pond', 'tank', 'raceway');
CREATE TYPE public.system_growth_stage AS ENUM ('nursing', 'grow_out');
CREATE TYPE public.feeding_response AS ENUM ('excellent', 'good', 'fair', 'poor', 'none');
CREATE TYPE public.transfer_type AS ENUM ('internal', 'external_out', 'external_in');
CREATE TYPE public.type_of_stocking AS ENUM ('initial', 'restocking', 'transfer_in');
CREATE TYPE public.type_of_harvest AS ENUM ('partial', 'full', 'emergency');
CREATE TYPE public.feed_category AS ENUM ('starter', 'grower', 'finisher', 'special');
CREATE TYPE public.feed_pellet_size AS ENUM ('0.5mm', '1mm', '2mm', '3mm', '4mm', '4.5mm', '6mm', '8mm');
CREATE TYPE public.water_quality_rating AS ENUM ('optimal', 'acceptable', 'critical', 'lethal');
CREATE TYPE public.units AS ENUM ('mg/l', 'ppt', 'pH', 'm', 'celsius', 'ntu');

-- =============================================================
-- STRUCTURAL TABLES
-- =============================================================

-- ── Organization ─────────────────────────────────────────────
CREATE TABLE public.organization (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text UNIQUE,
  owner_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Farm ─────────────────────────────────────────────────────
CREATE TABLE public.farm (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organization(id) ON DELETE CASCADE,
  name            text NOT NULL,
  location        text,
  owner           text,
  email           text,
  phone           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz   -- soft delete: never hard-delete a farm
);

CREATE INDEX idx_farm_organization_id ON public.farm(organization_id);

-- ── Farm User (membership + role) ────────────────────────────
-- Roles: admin | farm_manager | data_entry | viewer_auditor
CREATE TABLE public.farm_user (
  farm_id         uuid NOT NULL REFERENCES public.farm(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organization(id),
  role            text NOT NULL DEFAULT 'viewer_auditor',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (farm_id, user_id)
);

CREATE INDEX idx_farm_user_user_id        ON public.farm_user(user_id);
CREATE INDEX idx_farm_user_farm_user_role ON public.farm_user(farm_id, user_id, role);

-- ── User Profile ─────────────────────────────────────────────
CREATE TABLE public.user_profile (
  user_id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organization(id),
  farm_id         uuid REFERENCES public.farm(id),
  role            text,
  full_name       text,
  avatar_url      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── System (cage / pond / tank) ──────────────────────────────
CREATE TABLE public.system (
  id            bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  farm_id       uuid NOT NULL REFERENCES public.farm(id) ON DELETE CASCADE,
  name          text NOT NULL,                    -- "C4", "A1", "B2"
  system_type   public.system_type NOT NULL DEFAULT 'cage',
  growth_stage  public.system_growth_stage,       -- nursing or grow_out
  volume_m3     numeric,                          -- cage volume for density calcs
  is_active     boolean NOT NULL DEFAULT true,
  deleted_at    timestamptz,                      -- soft delete
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_system_farm_id ON public.system(farm_id);

-- =============================================================
-- REFERENCE / MASTER DATA TABLES
-- =============================================================

-- ── Feed Supplier ─────────────────────────────────────────────
CREATE TABLE public.feed_supplier (
  id               bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  company_name     text NOT NULL,
  location_country text,
  location_city    text,
  contact_email    text,
  contact_phone    text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ── Feed Type ─────────────────────────────────────────────────
-- Normalised catalogue: one row per product
CREATE TABLE public.feed_type (
  id                       bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  feed_supplier            bigint REFERENCES public.feed_supplier(id),
  feed_line                text NOT NULL,          -- "Aller Til Pro"
  feed_category            public.feed_category,
  feed_pellet_size         public.feed_pellet_size,
  crude_protein_percentage numeric,                -- 32%, 36%, 44% etc.
  crude_fat_percentage     numeric,
  bag_weight_kg            numeric DEFAULT 25,
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_feed_type_supplier ON public.feed_type(feed_supplier);

-- ── Fingerling Supplier ──────────────────────────────────────
CREATE TABLE public.fingerling_supplier (
  id            bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  company_name  text NOT NULL,              -- "Kipili Farm", "Kimbwela Hatchery"
  location      text,
  contact_email text,
  contact_phone text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Fingerling Batch ─────────────────────────────────────────
CREATE TABLE public.fingerling_batch (
  id                bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  farm_id           uuid NOT NULL REFERENCES public.farm(id) ON DELETE CASCADE,
  supplier_id       bigint REFERENCES public.fingerling_supplier(id),
  batch_number      text,                  -- "Batch no:0501K"
  date_of_delivery  date,
  number_of_fish    numeric,
  total_weight_kg   numeric,
  abw_g             numeric,               -- average body weight at arrival (grams)
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fingerling_batch_farm_id ON public.fingerling_batch(farm_id);

-- ── Water Quality Framework ──────────────────────────────────
-- Defines the acceptable/critical/lethal bands for each parameter
CREATE TABLE public.water_quality_framework (
  id                   bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  parameter_name       text UNIQUE NOT NULL,  -- "dissolved_oxygen", "temperature", "pH"
  unit                 text,                  -- "mg/l", "celsius", "pH"
  parameter_optimal    jsonb,                 -- {"min": 5.5}  or  {"min": 24, "max": 30}
  parameter_acceptable jsonb,
  parameter_critical   jsonb,
  parameter_lethal     jsonb,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ── Alert Threshold ──────────────────────────────────────────
CREATE TABLE public.alert_threshold (
  id                        bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  farm_id                   uuid REFERENCES public.farm(id) ON DELETE CASCADE,
  system_id                 bigint REFERENCES public.system(id) ON DELETE CASCADE,
  scope                     text NOT NULL DEFAULT 'farm',   -- 'farm' or 'system'
  low_do_threshold          numeric DEFAULT 4.0,
  high_ammonia_threshold    numeric DEFAULT 0.10,
  high_mortality_threshold  numeric DEFAULT 2.0,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- ── App Config ───────────────────────────────────────────────
CREATE TABLE public.app_config (
  key        text PRIMARY KEY,
  value      text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Dashboard Time Period ─────────────────────────────────────
CREATE TABLE public.dashboard_time_period (
  id        bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  label     text NOT NULL,    -- "Last 7 days", "Last 30 days"
  days      integer NOT NULL,
  is_default boolean NOT NULL DEFAULT false
);

-- =============================================================
-- EVENT / TRANSACTIONAL TABLES
-- Each row = one thing that happened. All have farm_id + system_id.
-- All have local_id for offline deduplication.
-- =============================================================

-- ── Production Cycle ─────────────────────────────────────────
-- One row per growing cycle per system
CREATE TABLE public.production_cycle (
  cycle_id      bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  system_id     bigint NOT NULL REFERENCES public.system(id) ON DELETE CASCADE,
  farm_id       uuid NOT NULL REFERENCES public.farm(id) ON DELETE CASCADE,
  cycle_start   date NOT NULL,
  cycle_end     date,
  ongoing_cycle boolean NOT NULL DEFAULT true,
  growth_stage  public.system_growth_stage,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Only one active cycle per system at a time
CREATE UNIQUE INDEX uq_one_active_cycle_per_system
  ON public.production_cycle(system_id) WHERE ongoing_cycle = true;

CREATE INDEX idx_production_cycle_farm_id ON public.production_cycle(farm_id);

-- ── Fish Stocking ─────────────────────────────────────────────
CREATE TABLE public.fish_stocking (
  id              bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  farm_id         uuid NOT NULL REFERENCES public.farm(id) ON DELETE CASCADE,
  system_id       bigint NOT NULL REFERENCES public.system(id) ON DELETE CASCADE,
  batch_id        bigint REFERENCES public.fingerling_batch(id),
  date            date NOT NULL,
  number_of_fish  numeric NOT NULL,
  total_weight_kg numeric,
  abw_g           numeric,
  stocking_type   public.type_of_stocking DEFAULT 'initial',
  source          text,                            -- "Kipili Farm", "Kimbwela Hatchery"
  comments        text,
  local_id        text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fish_stocking_system_date ON public.fish_stocking(system_id, date DESC);
CREATE INDEX idx_fish_stocking_farm_date   ON public.fish_stocking(farm_id,   date DESC);
CREATE UNIQUE INDEX uix_fish_stocking_local_id
  ON public.fish_stocking(local_id) WHERE local_id IS NOT NULL;

-- ── Fish Transfer ─────────────────────────────────────────────
CREATE TABLE public.fish_transfer (
  id                  bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  farm_id             uuid NOT NULL REFERENCES public.farm(id) ON DELETE CASCADE,
  origin_system_id    bigint REFERENCES public.system(id),
  target_system_id    bigint REFERENCES public.system(id),
  origin_label        text,     -- raw text when system not in DB ("KIMBWELA C4")
  target_label        text,
  transfer_type       public.transfer_type NOT NULL DEFAULT 'internal',
  date                date NOT NULL,
  number_of_fish      numeric NOT NULL,
  total_weight_kg     numeric,
  average_weight_g    numeric,
  comments            text,
  local_id            text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fish_transfer_origin_date ON public.fish_transfer(origin_system_id, date DESC);
CREATE INDEX idx_fish_transfer_farm_date   ON public.fish_transfer(farm_id, date DESC);
CREATE UNIQUE INDEX uix_fish_transfer_local_id
  ON public.fish_transfer(local_id) WHERE local_id IS NOT NULL;

-- ── Fish Mortality ────────────────────────────────────────────
CREATE TABLE public.fish_mortality (
  id              bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  farm_id         uuid NOT NULL REFERENCES public.farm(id) ON DELETE CASCADE,
  system_id       bigint NOT NULL REFERENCES public.system(id) ON DELETE CASCADE,
  date            date NOT NULL,
  number_of_fish  integer NOT NULL,
  cause           text,
  comments        text,
  local_id        text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fish_mortality_system_date ON public.fish_mortality(system_id, date DESC);
CREATE INDEX idx_fish_mortality_farm_date   ON public.fish_mortality(farm_id,   date DESC);
CREATE UNIQUE INDEX uix_fish_mortality_local_id
  ON public.fish_mortality(local_id) WHERE local_id IS NOT NULL;

-- ── Fish Sampling Weight ──────────────────────────────────────
CREATE TABLE public.fish_sampling_weight (
  id              bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  farm_id         uuid NOT NULL REFERENCES public.farm(id) ON DELETE CASCADE,
  system_id       bigint NOT NULL REFERENCES public.system(id) ON DELETE CASCADE,
  date            date NOT NULL,
  number_sampled  integer NOT NULL,
  total_weight_g  numeric NOT NULL,
  abw_g           numeric GENERATED ALWAYS AS
                    (CASE WHEN number_sampled > 0
                     THEN total_weight_g / number_sampled ELSE NULL END) STORED,
  comments        text,
  local_id        text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fish_sampling_system_date ON public.fish_sampling_weight(system_id, date DESC);
CREATE UNIQUE INDEX uix_fish_sampling_local_id
  ON public.fish_sampling_weight(local_id) WHERE local_id IS NOT NULL;

-- ── Feeding Record ────────────────────────────────────────────
CREATE TABLE public.feeding_record (
  id                bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  farm_id           uuid NOT NULL REFERENCES public.farm(id) ON DELETE CASCADE,
  system_id         bigint NOT NULL REFERENCES public.system(id) ON DELETE CASCADE,
  feed_type_id      bigint REFERENCES public.feed_type(id),
  date              date NOT NULL,
  feeding_amount_kg numeric NOT NULL,
  feeding_response  public.feeding_response,
  comments          text,
  local_id          text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_feeding_record_system_date ON public.feeding_record(system_id, date DESC);
CREATE INDEX idx_feeding_record_farm_date   ON public.feeding_record(farm_id,   date DESC);
CREATE UNIQUE INDEX uix_feeding_record_local_id
  ON public.feeding_record(local_id) WHERE local_id IS NOT NULL;

-- ── Feed Incoming (Inventory Deliveries) ─────────────────────
CREATE TABLE public.feed_incoming (
  id              bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  farm_id         uuid NOT NULL REFERENCES public.farm(id) ON DELETE CASCADE,
  feed_type_id    bigint REFERENCES public.feed_type(id),
  date            date NOT NULL,
  time            text,
  number_of_bags  numeric,
  bag_weight_kg   numeric,
  total_weight_kg numeric GENERATED ALWAYS AS
                    (COALESCE(number_of_bags * bag_weight_kg, 0)) STORED,
  open_bags_kg    numeric,                -- running balance from Excel "OPEN BAGS" col
  comments        text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_feed_incoming_farm_date ON public.feed_incoming(farm_id, date DESC);

-- ── Water Quality Measurement ─────────────────────────────────
CREATE TABLE public.water_quality_measurement (
  id               bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  farm_id          uuid NOT NULL REFERENCES public.farm(id) ON DELETE CASCADE,
  system_id        bigint NOT NULL REFERENCES public.system(id) ON DELETE CASCADE,
  date             date NOT NULL,
  time             text,
  measured_at      timestamptz,             -- combined date+time if available
  parameter_name   text NOT NULL,           -- "dissolved_oxygen", "temperature"
  parameter_value  double precision NOT NULL,
  water_depth      numeric,                 -- measurement depth in metres
  unit             text,
  location         text,
  local_id         text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wqm_system_date       ON public.water_quality_measurement(system_id, date DESC);
CREATE INDEX idx_wqm_farm_date         ON public.water_quality_measurement(farm_id, date DESC);
CREATE INDEX idx_wqm_param_system_date ON public.water_quality_measurement(parameter_name, system_id, date DESC);
CREATE UNIQUE INDEX uix_wqm_local_id
  ON public.water_quality_measurement(local_id) WHERE local_id IS NOT NULL;

-- ── Daily Water Quality Rating ────────────────────────────────
-- Computed/derived — one aggregate score per system per day
CREATE TABLE public.daily_water_quality_rating (
  id             bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  farm_id        uuid NOT NULL REFERENCES public.farm(id) ON DELETE CASCADE,
  system_id      bigint NOT NULL REFERENCES public.system(id) ON DELETE CASCADE,
  rating_date    date NOT NULL,
  rating         public.water_quality_rating,
  rating_numeric double precision,
  worst_parameter text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dwr_system_date  ON public.daily_water_quality_rating(system_id, rating_date DESC);
CREATE UNIQUE INDEX uix_dwr_system_date
  ON public.daily_water_quality_rating(system_id, rating_date);

-- ── Normalization Review (data quality flags) ─────────────────
CREATE TABLE public.normalization_review (
  id          bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  farm_id     uuid NOT NULL REFERENCES public.farm(id) ON DELETE CASCADE,
  table_name  text NOT NULL,
  row_id      bigint,
  issue       text NOT NULL,
  raw_value   text,
  resolved    boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_norm_review_farm_unresolved
  ON public.normalization_review(farm_id, resolved, created_at DESC);

-- ── Raw Uploads (Excel files submitted by users) ──────────────
CREATE TABLE public.raw_uploads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id     uuid NOT NULL REFERENCES public.farm(id) ON DELETE CASCADE,
  file_name   text NOT NULL,
  file_path   text NOT NULL,          -- path in Supabase Storage
  file_type   text,
  status      text NOT NULL DEFAULT 'pending',  -- pending | processing | done | error
  error_msg   text,
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX idx_raw_uploads_farm_status
  ON public.raw_uploads(farm_id, status, uploaded_at DESC);

-- ── Pending Farm User Invitations ────────────────────────────
CREATE TABLE private.farm_user_invitation (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id         uuid NOT NULL REFERENCES public.farm(id) ON DELETE CASCADE,
  email           text NOT NULL,
  role            text NOT NULL DEFAULT 'viewer_auditor',
  status          text NOT NULL DEFAULT 'pending',
  invited_by      uuid REFERENCES auth.users(id),
  invited_user_id uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  last_sent_at    timestamptz,
  accepted_at     timestamptz,
  revoked_at      timestamptz
);

-- Prevent duplicate pending invitations for the same email+farm
CREATE UNIQUE INDEX farm_user_invitation_active_unique
  ON private.farm_user_invitation(farm_id, email)
  WHERE revoked_at IS NULL AND accepted_at IS NULL;

-- =============================================================
-- TRIGGERS
-- =============================================================

-- Auto-update updated_at on every UPDATE
CREATE OR REPLACE FUNCTION private.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply to all tables with updated_at
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'public.organization','public.farm','public.farm_user','public.user_profile',
    'public.system','public.production_cycle','public.fish_stocking',
    'public.fish_transfer','public.fish_mortality','public.fish_sampling_weight',
    'public.feeding_record','public.feed_incoming','public.water_quality_measurement',
    'public.water_quality_framework','public.alert_threshold',
    'private.farm_user_invitation'
  ]
  LOOP
    EXECUTE format('
      CREATE TRIGGER trg_set_updated_at
      BEFORE UPDATE ON %s
      FOR EACH ROW EXECUTE FUNCTION private.set_updated_at()', t);
  END LOOP;
END;
$$;

-- Auto-create user_profile row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public AS $$
BEGIN
  INSERT INTO public.user_profile (user_id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sync organization_id on farm_user from farm table
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

-- =============================================================
-- DASHBOARD TIME PERIODS (static reference data)
-- =============================================================
INSERT INTO public.dashboard_time_period (label, days, is_default) VALUES
  ('Last 7 days',   7,   false),
  ('Last 14 days',  14,  false),
  ('Last 30 days',  30,  true),
  ('Last 60 days',  60,  false),
  ('Last 90 days',  90,  false),
  ('Last 180 days', 180, false);
```

### 6.3 Apply the Migration Locally

```bash
# Resets local DB and applies all migrations + seed.sql
supabase db reset
```

Open http://localhost:54323 → **Table Editor**. You should see all the tables listed in the left panel.

---

## 7. Step 5 — Enable Row-Level Security

### 7.1 Create the RLS Migration

```bash
supabase migration new enable_rls
```

Open the new migration file and paste:

```sql
-- =============================================================
-- Row-Level Security (RLS)
-- Every user only sees data belonging to farms they are members of
-- =============================================================

-- ── Enable RLS on all public tables ──────────────────────────
ALTER TABLE public.organization                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_user                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profile                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_cycle            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fish_stocking               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fish_transfer               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fish_mortality              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fish_sampling_weight        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feeding_record              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_incoming               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_type                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_supplier               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fingerling_batch            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fingerling_supplier         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_quality_measurement   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_water_quality_rating  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_quality_framework     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_threshold             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.normalization_review        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_uploads                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_time_period       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config                  ENABLE ROW LEVEL SECURITY;

-- ── Core membership helper functions ─────────────────────────
-- These are SECURITY DEFINER so Postgres caches the result per statement
-- (avoids re-running the subquery on every row)

CREATE OR REPLACE FUNCTION public.is_farm_member(farm uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.farm_user
    WHERE farm_user.farm_id = farm
      AND farm_user.user_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.has_farm_role(farm uuid, roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.farm_user
    WHERE farm_user.farm_id = farm
      AND farm_user.user_id = (SELECT auth.uid())
      AND farm_user.role = ANY(roles)
  );
$$;

-- ── RLS POLICIES ─────────────────────────────────────────────

-- Organization: owner can read; owner can update
CREATE POLICY "org_owner_read" ON public.organization FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()));
CREATE POLICY "org_owner_write" ON public.organization FOR ALL TO authenticated
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));

-- Farm: members can read; only admin/manager can write
CREATE POLICY "farm_read" ON public.farm FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.is_farm_member(id));
CREATE POLICY "farm_insert" ON public.farm FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "farm_update" ON public.farm FOR UPDATE TO authenticated
  USING (public.has_farm_role(id, ARRAY['admin','farm_manager']))
  WITH CHECK (public.has_farm_role(id, ARRAY['admin','farm_manager']));

-- Farm User: each user can see their own memberships; admin manages others
CREATE POLICY "farm_user_own_read" ON public.farm_user FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "farm_user_admin_read" ON public.farm_user FOR SELECT TO authenticated
  USING (public.has_farm_role(farm_id, ARRAY['admin','farm_manager']));
CREATE POLICY "farm_user_admin_write" ON public.farm_user FOR ALL TO authenticated
  USING (public.has_farm_role(farm_id, ARRAY['admin']))
  WITH CHECK (public.has_farm_role(farm_id, ARRAY['admin']));

-- User Profile: own profile only
CREATE POLICY "profile_own_read" ON public.user_profile FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "profile_own_update" ON public.user_profile FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- System: farm members read; managers write
CREATE POLICY "system_read" ON public.system FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.is_farm_member(farm_id));
CREATE POLICY "system_write" ON public.system FOR ALL TO authenticated
  USING (public.has_farm_role(farm_id, ARRAY['admin','farm_manager']))
  WITH CHECK (public.has_farm_role(farm_id, ARRAY['admin','farm_manager']));

-- Event tables: farm members read; data_entry and above can insert
-- (Reusable macro pattern applied to each table)

-- fish_stocking
CREATE POLICY "fish_stocking_read" ON public.fish_stocking FOR SELECT TO authenticated
  USING (public.is_farm_member(farm_id));
CREATE POLICY "fish_stocking_write" ON public.fish_stocking FOR INSERT TO authenticated
  WITH CHECK (public.has_farm_role(farm_id, ARRAY['admin','farm_manager','data_entry']));
CREATE POLICY "fish_stocking_update" ON public.fish_stocking FOR UPDATE TO authenticated
  USING (public.has_farm_role(farm_id, ARRAY['admin','farm_manager']));
CREATE POLICY "fish_stocking_delete" ON public.fish_stocking FOR DELETE TO authenticated
  USING (public.has_farm_role(farm_id, ARRAY['admin']));

-- fish_mortality (same pattern)
CREATE POLICY "fish_mortality_read" ON public.fish_mortality FOR SELECT TO authenticated
  USING (public.is_farm_member(farm_id));
CREATE POLICY "fish_mortality_write" ON public.fish_mortality FOR INSERT TO authenticated
  WITH CHECK (public.has_farm_role(farm_id, ARRAY['admin','farm_manager','data_entry']));
CREATE POLICY "fish_mortality_update" ON public.fish_mortality FOR UPDATE TO authenticated
  USING (public.has_farm_role(farm_id, ARRAY['admin','farm_manager']));
CREATE POLICY "fish_mortality_delete" ON public.fish_mortality FOR DELETE TO authenticated
  USING (public.has_farm_role(farm_id, ARRAY['admin']));

-- fish_transfer
CREATE POLICY "fish_transfer_read" ON public.fish_transfer FOR SELECT TO authenticated
  USING (public.is_farm_member(farm_id));
CREATE POLICY "fish_transfer_write" ON public.fish_transfer FOR INSERT TO authenticated
  WITH CHECK (public.has_farm_role(farm_id, ARRAY['admin','farm_manager','data_entry']));
CREATE POLICY "fish_transfer_update" ON public.fish_transfer FOR UPDATE TO authenticated
  USING (public.has_farm_role(farm_id, ARRAY['admin','farm_manager']));
CREATE POLICY "fish_transfer_delete" ON public.fish_transfer FOR DELETE TO authenticated
  USING (public.has_farm_role(farm_id, ARRAY['admin']));

-- fish_sampling_weight
CREATE POLICY "fish_sampling_read" ON public.fish_sampling_weight FOR SELECT TO authenticated
  USING (public.is_farm_member(farm_id));
CREATE POLICY "fish_sampling_write" ON public.fish_sampling_weight FOR INSERT TO authenticated
  WITH CHECK (public.has_farm_role(farm_id, ARRAY['admin','farm_manager','data_entry']));
CREATE POLICY "fish_sampling_update" ON public.fish_sampling_weight FOR UPDATE TO authenticated
  USING (public.has_farm_role(farm_id, ARRAY['admin','farm_manager']));
CREATE POLICY "fish_sampling_delete" ON public.fish_sampling_weight FOR DELETE TO authenticated
  USING (public.has_farm_role(farm_id, ARRAY['admin']));

-- feeding_record
CREATE POLICY "feeding_record_read" ON public.feeding_record FOR SELECT TO authenticated
  USING (public.is_farm_member(farm_id));
CREATE POLICY "feeding_record_write" ON public.feeding_record FOR INSERT TO authenticated
  WITH CHECK (public.has_farm_role(farm_id, ARRAY['admin','farm_manager','data_entry']));
CREATE POLICY "feeding_record_update" ON public.feeding_record FOR UPDATE TO authenticated
  USING (public.has_farm_role(farm_id, ARRAY['admin','farm_manager']));
CREATE POLICY "feeding_record_delete" ON public.feeding_record FOR DELETE TO authenticated
  USING (public.has_farm_role(farm_id, ARRAY['admin']));

-- feed_incoming
CREATE POLICY "feed_incoming_read" ON public.feed_incoming FOR SELECT TO authenticated
  USING (public.is_farm_member(farm_id));
CREATE POLICY "feed_incoming_write" ON public.feed_incoming FOR INSERT TO authenticated
  WITH CHECK (public.has_farm_role(farm_id, ARRAY['admin','farm_manager','data_entry']));
CREATE POLICY "feed_incoming_update" ON public.feed_incoming FOR UPDATE TO authenticated
  USING (public.has_farm_role(farm_id, ARRAY['admin','farm_manager']));
CREATE POLICY "feed_incoming_delete" ON public.feed_incoming FOR DELETE TO authenticated
  USING (public.has_farm_role(farm_id, ARRAY['admin']));

-- water_quality_measurement
CREATE POLICY "wqm_read" ON public.water_quality_measurement FOR SELECT TO authenticated
  USING (public.is_farm_member(farm_id));
CREATE POLICY "wqm_write" ON public.water_quality_measurement FOR INSERT TO authenticated
  WITH CHECK (public.has_farm_role(farm_id, ARRAY['admin','farm_manager','data_entry']));
CREATE POLICY "wqm_update" ON public.water_quality_measurement FOR UPDATE TO authenticated
  USING (public.has_farm_role(farm_id, ARRAY['admin','farm_manager']));
CREATE POLICY "wqm_delete" ON public.water_quality_measurement FOR DELETE TO authenticated
  USING (public.has_farm_role(farm_id, ARRAY['admin']));

-- daily_water_quality_rating
CREATE POLICY "dwr_read" ON public.daily_water_quality_rating FOR SELECT TO authenticated
  USING (public.is_farm_member(farm_id));

-- Reference tables: any authenticated user can read
CREATE POLICY "wqf_read" ON public.water_quality_framework FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "feed_type_read" ON public.feed_type FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "feed_supplier_read" ON public.feed_supplier FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "fingerling_supplier_read" ON public.fingerling_supplier FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "dashboard_time_read" ON public.dashboard_time_period FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "app_config_read" ON public.app_config FOR SELECT TO authenticated
  USING (true);

-- fingerling_batch: farm-scoped
CREATE POLICY "fingerling_batch_read" ON public.fingerling_batch FOR SELECT TO authenticated
  USING (public.is_farm_member(farm_id));
CREATE POLICY "fingerling_batch_write" ON public.fingerling_batch FOR INSERT TO authenticated
  WITH CHECK (public.has_farm_role(farm_id, ARRAY['admin','farm_manager']));

-- alert_threshold
CREATE POLICY "alert_threshold_read" ON public.alert_threshold FOR SELECT TO authenticated
  USING (farm_id IS NULL OR public.is_farm_member(farm_id));
CREATE POLICY "alert_threshold_write" ON public.alert_threshold FOR ALL TO authenticated
  USING (public.has_farm_role(farm_id, ARRAY['admin','farm_manager']))
  WITH CHECK (public.has_farm_role(farm_id, ARRAY['admin','farm_manager']));

-- normalization_review
CREATE POLICY "norm_review_read" ON public.normalization_review FOR SELECT TO authenticated
  USING (public.is_farm_member(farm_id));

-- raw_uploads
CREATE POLICY "raw_uploads_read" ON public.raw_uploads FOR SELECT TO authenticated
  USING (public.is_farm_member(farm_id));
CREATE POLICY "raw_uploads_insert" ON public.raw_uploads FOR INSERT TO authenticated
  WITH CHECK (public.has_farm_role(farm_id, ARRAY['admin','farm_manager','data_entry']));
```

Apply it:

```bash
supabase db reset
```

---

## 8. Step 6 — Seed Reference Data

### 8.1 Create the Seed Migration

```bash
supabase migration new seed_reference_data
```

Paste the following — this sets up the feed types you discovered in the Excel files:

```sql
-- =============================================================
-- AquaSmart Reference Data
-- Feed types, suppliers, WQ framework, time periods
-- =============================================================

-- ── Feed Supplier ─────────────────────────────────────────────
INSERT INTO public.feed_supplier (company_name, location_country, location_city)
VALUES ('Aller Aqua', 'Denmark', 'Christiansfeld')
ON CONFLICT DO NOTHING;

-- ── Feed Types (from your actual Excel data) ──────────────────
-- Pattern from Feed record (1).xlsx and Feed inventory.xlsx:
-- Pellet size → growth stage → protein %
-- 0.5 mm starter (44%) → 2 mm grower (36%) → 3 mm grower (32%) → 4.5 mm finisher (34%)

WITH supplier AS (
  SELECT id FROM public.feed_supplier WHERE company_name = 'Aller Aqua'
)
INSERT INTO public.feed_type
  (feed_supplier, feed_line, feed_category, feed_pellet_size, crude_protein_percentage, bag_weight_kg)
SELECT
  supplier.id,
  name,
  category::public.feed_category,
  pellet::public.feed_pellet_size,
  protein,
  25
FROM supplier, (VALUES
  ('Aller Til Pro 44%',  'starter',  '0.5mm',  44),
  ('Aller Til Pro 44%',  'starter',  '1mm',    44),
  ('Aller Til Pro 36%',  'grower',   '2mm',    36),
  ('Aller Til Pro 34%',  'grower',   '3mm',    34),
  ('Aller Til Pro 32%',  'grower',   '3mm',    32),
  ('Aller Til Pro 34%',  'finisher', '4mm',    34),
  ('Aller Til Pro 34%',  'finisher', '4.5mm',  34)
) AS t(name, category, pellet, protein)
ON CONFLICT DO NOTHING;

-- ── Fingerling Suppliers (from Fish Stocking + Transfer Excel) ─
INSERT INTO public.fingerling_supplier (company_name, location)
VALUES
  ('Kipili Farm',       'Tanzania'),
  ('Kimbwela Hatchery', 'Tanzania')
ON CONFLICT DO NOTHING;

-- ── Water Quality Framework ───────────────────────────────────
-- Based on Nile Tilapia best-practice thresholds.
-- Parameters found in your Excel: Temperature (celsius), Dissolved Oxygen (mg/l)
-- Also include pH, ammonia, nitrite, nitrate, salinity for future data entry.

INSERT INTO public.water_quality_framework
  (parameter_name, unit, parameter_optimal, parameter_acceptable, parameter_critical, parameter_lethal)
VALUES
  (
    'dissolved_oxygen', 'mg/l',
    '{"min": 5.5}',
    '{"min": 4.0}',
    '{"min": 3.0}',
    '{"max": 2.99}'
  ),
  (
    'temperature', 'celsius',
    '{"min": 24, "max": 30}',
    '{"min": 22, "max": 32}',
    '{"min": 18, "max": 35}',
    '{"max": 17.99}'
  ),
  (
    'pH', 'pH',
    '{"min": 6.5, "max": 8.5}',
    '{"min": 6.0, "max": 9.0}',
    '{"min": 5.5, "max": 9.5}',
    '{"max": 5.49}'
  ),
  (
    'ammonia', 'mg/l',
    '{"max": 0.05}',
    '{"max": 0.10}',
    '{"max": 0.20}',
    '{"min": 0.21}'
  ),
  (
    'nitrite', 'mg/l',
    '{"max": 0.05}',
    '{"max": 0.10}',
    '{"max": 0.20}',
    '{"min": 0.21}'
  ),
  (
    'secchi_disk_depth', 'm',
    '{"min": 0.35, "max": 0.60}',
    '{"min": 0.25, "max": 0.70}',
    '{"min": 0.15, "max": 0.80}',
    '{"max": 0.14}'
  )
ON CONFLICT (parameter_name) DO UPDATE SET
  parameter_optimal    = EXCLUDED.parameter_optimal,
  parameter_acceptable = EXCLUDED.parameter_acceptable,
  parameter_critical   = EXCLUDED.parameter_critical,
  parameter_lethal     = EXCLUDED.parameter_lethal;
```

Apply:

```bash
supabase db reset
```

---

## 9. Step 7 — Import Your Historical Excel Data

This is where your manually collected data becomes your database. Run this script **once** after you push to production. It connects directly to the database (using the direct connection string, not the pooler).

### 9.1 Install Required Python Libraries

```bash
pip install openpyxl psycopg2-binary --break-system-packages
```

### 9.2 The Import Script

Save this as `scripts/import_historical_data.py`:

```python
#!/usr/bin/env python3
"""
AquaSmart Historical Data Import
Imports all manually collected Excel files into the Supabase database.
Run once after the schema has been pushed to production.

Usage:
  python3 scripts/import_historical_data.py \
    --db-url "postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres" \
    --farm-id "<your-farm-uuid>" \
    --data-dir "/path/to/excel/files"
"""

import argparse
import datetime
import re
import sys
import openpyxl
import psycopg2
import psycopg2.extras
from pathlib import Path

# ── Helpers ──────────────────────────────────────────────────────────────────

def clean_str(v):
    if v is None:
        return None
    s = str(v).strip()
    return s if s else None

def clean_date(v):
    if v is None:
        return None
    if isinstance(v, (datetime.datetime, datetime.date)):
        return v.date() if isinstance(v, datetime.datetime) else v
    return None

def clean_float(v):
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None

def clean_int(v):
    f = clean_float(v)
    return int(f) if f is not None else None

def normalise_feeding_response(v):
    if v is None:
        return None
    s = str(v).strip().lower()
    if 'excel' in s or s.startswith('ex'):   return 'excellent'
    if s.startswith('good') or s == 'g':     return 'good'
    if s.startswith('fair') or s == 'f':     return 'fair'
    if s.startswith('poor') or s == 'p':     return 'poor'
    if 'none' in s:                           return 'none'
    return None

def read_excel(path):
    wb = openpyxl.load_workbook(path, read_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    wb.close()
    return rows

# ── Lookup helpers ────────────────────────────────────────────────────────────

def get_or_create_system(cur, farm_id, name, system_type='cage'):
    """Return system id for a cage name, creating it if needed."""
    cur.execute(
        "SELECT id FROM public.system WHERE farm_id = %s AND name = %s",
        (farm_id, name)
    )
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute(
        """INSERT INTO public.system (farm_id, name, system_type)
           VALUES (%s, %s, %s) RETURNING id""",
        (farm_id, name, system_type)
    )
    print(f"  Created system: {name}")
    return cur.fetchone()[0]

def get_feed_type_id(cur, raw_name):
    """Best-effort match of raw feed name to feed_type id."""
    if not raw_name:
        return None
    s = str(raw_name).lower().strip()
    # Extract pellet size hint
    pellet = None
    for p in ['0.5', '0.9', '1mm', '2mm', '3mm', '4.5mm', '4mm']:
        if p in s:
            pellet = p.replace('mm','') + 'mm' if not p.endswith('mm') else p
            break
    if pellet:
        cur.execute(
            "SELECT id FROM public.feed_type WHERE feed_pellet_size = %s LIMIT 1",
            (pellet,)
        )
        row = cur.fetchone()
        if row:
            return row[0]
    return None

# ── Importers ─────────────────────────────────────────────────────────────────

def import_mortality(cur, farm_id, rows):
    """Mortality (cages) (1).xlsx"""
    # Headers: DATE, CAGE NUMBER, NUMBER OF DEAD FISH, COMMENTS
    inserted = 0
    for r in rows[1:]:
        date = clean_date(r[0])
        cage = clean_str(r[1])
        count = clean_int(r[2])
        comments = clean_str(r[3])
        if date is None or cage is None or count is None:
            continue
        sys_id = get_or_create_system(cur, farm_id, cage)
        cur.execute("""
            INSERT INTO public.fish_mortality
              (farm_id, system_id, date, number_of_fish, comments)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
        """, (farm_id, sys_id, date, count, comments))
        inserted += cur.rowcount
    return inserted

def import_water_quality(cur, farm_id, rows):
    """Water quality (cages) (1).xlsx"""
    # Headers: DATE, TIME, PARAMETER NAME, WATER DEPTH, PARAMETER VALUE, CAGE UNIT, SYSTEM ID, LOCATION
    # Note: SYSTEM ID column (col 6) holds the cage name like "C4"
    inserted = 0
    param_map = {
        'dissolved oxygen': 'dissolved_oxygen',
        'temperature':      'temperature',
        'ph':               'pH',
        'ammonia':          'ammonia',
        'nitrite':          'nitrite',
        'secchi':           'secchi_disk_depth',
    }
    for r in rows[1:]:
        date = clean_date(r[0])
        time_str = clean_str(r[1])
        param_raw = clean_str(r[2])
        depth = clean_float(r[3])
        value = clean_float(r[4])
        cage = clean_str(r[6]) or clean_str(r[5])   # col 6 = SYSTEM ID, col 5 = CAGE UNIT
        if date is None or param_raw is None or value is None or cage is None:
            continue
        param = param_map.get(param_raw.lower().strip(), param_raw.lower().strip())
        sys_id = get_or_create_system(cur, farm_id, cage)
        cur.execute("""
            INSERT INTO public.water_quality_measurement
              (farm_id, system_id, date, time, parameter_name, parameter_value, water_depth)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
        """, (farm_id, sys_id, date, time_str, param, value, depth))
        inserted += cur.rowcount
    return inserted

def import_feeding_record(cur, farm_id, rows):
    """Feed record (1).xlsx"""
    # Headers: DATE, CAGE UNIT, CAGE NUMBER, FEEDING AMOUNT(kg), FEEDING TYPE, FEEDING RESPONSE, COMMENTS
    inserted = 0
    for r in rows[1:]:
        date = clean_date(r[0])
        cage = clean_str(r[2]) or clean_str(r[1])
        amount = clean_float(r[3])
        feed_type_raw = clean_str(r[4])
        response_raw = clean_str(r[5])
        comments = clean_str(r[6])
        if date is None or cage is None or amount is None:
            continue
        sys_id = get_or_create_system(cur, farm_id, cage)
        feed_type_id = get_feed_type_id(cur, feed_type_raw)
        response = normalise_feeding_response(response_raw)
        cur.execute("""
            INSERT INTO public.feeding_record
              (farm_id, system_id, feed_type_id, date, feeding_amount_kg, feeding_response, comments)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
        """, (farm_id, sys_id, feed_type_id, date, amount, response, comments))
        inserted += cur.rowcount
    return inserted

def import_feed_inventory(cur, farm_id, rows):
    """Feed inventory.xlsx"""
    # Headers: DATE, TIME, FEED TYPE, BAG WEIGHT (kg), AMOUNT OF BAGS, OPEN BAGS (kg), COMMENTS
    inserted = 0
    for r in rows[1:]:
        date = clean_date(r[0])
        time_str = clean_str(r[1])
        feed_type_raw = clean_str(r[2])
        bag_weight = clean_float(r[3])
        num_bags = clean_float(r[4])
        open_bags_kg = clean_float(r[5])
        comments = clean_str(r[6])
        if date is None:
            continue
        feed_type_id = get_feed_type_id(cur, feed_type_raw)
        cur.execute("""
            INSERT INTO public.feed_incoming
              (farm_id, feed_type_id, date, time, number_of_bags, bag_weight_kg, open_bags_kg, comments)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
        """, (farm_id, feed_type_id, date, time_str, num_bags, bag_weight, open_bags_kg, comments))
        inserted += cur.rowcount
    return inserted

def import_fish_sampling(cur, farm_id, rows):
    """Fish Sampling (1).xlsx"""
    # Headers: DATE, CAGE UNIT, CAGE NUMBER, NUMBER OF FISH, TOTAL WEIGHT(G), ABW(G), COMMENTS
    inserted = 0
    for r in rows[1:]:
        date = clean_date(r[0])
        cage = clean_str(r[2]) or clean_str(r[1])
        n_fish = clean_int(r[3])
        total_g = clean_float(r[4])
        comments = clean_str(r[6])
        if date is None or cage is None or n_fish is None or total_g is None:
            continue
        sys_id = get_or_create_system(cur, farm_id, cage)
        cur.execute("""
            INSERT INTO public.fish_sampling_weight
              (farm_id, system_id, date, number_sampled, total_weight_g, comments)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
        """, (farm_id, sys_id, date, n_fish, total_g, comments))
        inserted += cur.rowcount
    return inserted

def import_fish_stocking(cur, farm_id, rows):
    """Fish Stocking (2).xlsx"""
    # Headers: DATE, CAGE UNIT, CAGE NUMBER, NUMBER OF FISH, TOTAL WEIGHT(KG), ABW(G), SOURCE, STOCKING TYPE, BATCH NUMBER, COMMENTS
    inserted = 0
    for r in rows[1:]:
        date = clean_date(r[0])
        cage_unit = clean_str(r[1])   # "A", "B"
        cage_num  = clean_str(r[2])   # 2, 3 …
        cage_name = f"{cage_unit}{cage_num}" if cage_unit and cage_num else None
        n_fish = clean_int(r[3])
        total_kg = clean_float(r[4])
        abw_g = clean_float(r[5])
        source = clean_str(r[6])
        stocking_type_raw = clean_str(r[7])
        batch_num = clean_str(r[8])
        comments = clean_str(r[9])
        if date is None or cage_name is None or n_fish is None:
            continue
        stocking_type = 'initial' if stocking_type_raw and 'empty' in stocking_type_raw.lower() \
                        else 'restocking' if stocking_type_raw and 'stock' in stocking_type_raw.lower() \
                        else 'initial'
        sys_id = get_or_create_system(cur, farm_id, cage_name)

        # Look up or create fingerling batch
        batch_id = None
        if batch_num:
            cur.execute(
                "SELECT id FROM public.fingerling_batch WHERE batch_number = %s AND farm_id = %s",
                (batch_num, farm_id)
            )
            row = cur.fetchone()
            if row:
                batch_id = row[0]
            else:
                # Find supplier if source name matches
                cur.execute(
                    "SELECT id FROM public.fingerling_supplier WHERE company_name ILIKE %s",
                    (f"%{source}%",) if source else ('%',)
                )
                sup = cur.fetchone()
                cur.execute("""
                    INSERT INTO public.fingerling_batch
                      (farm_id, supplier_id, batch_number, date_of_delivery, number_of_fish, total_weight_kg, abw_g)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (farm_id, sup[0] if sup else None, batch_num, date, n_fish, total_kg, abw_g))
                batch_id = cur.fetchone()[0]

        cur.execute("""
            INSERT INTO public.fish_stocking
              (farm_id, system_id, batch_id, date, number_of_fish, total_weight_kg, abw_g,
               stocking_type, source, comments)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s::public.type_of_stocking, %s, %s)
            ON CONFLICT DO NOTHING
        """, (farm_id, sys_id, batch_id, date, n_fish, total_kg, abw_g, stocking_type, source, comments))
        inserted += cur.rowcount
    return inserted

def import_fish_transfer(cur, farm_id, rows):
    """Fish Transfer.xlsx"""
    # Headers: DATE, ORIGIN CAGE, DESTINATION CAGE, SYSTEM, NUMBER OF FISH, TOTAL WEIGHT, AVG WEIGHT, COMMENT
    inserted = 0
    for r in rows[1:]:
        date = clean_date(r[0])
        origin_raw = clean_str(r[1])
        dest_raw   = clean_str(r[2])
        n_fish     = clean_int(r[4])
        total_kg   = clean_float(r[5])
        avg_g      = clean_float(r[6])
        comments   = clean_str(r[7])
        if date is None or n_fish is None:
            continue
        # Try to match origin to an internal system; dest often external (Kimbwela)
        origin_sys_id = None
        dest_sys_id = None
        if origin_raw:
            cur.execute("SELECT id FROM public.system WHERE farm_id=%s AND name ILIKE %s", (farm_id, origin_raw))
            row = cur.fetchone()
            if row:
                origin_sys_id = row[0]
        is_external = dest_raw and ('kimbwela' in dest_raw.lower() or 'kipili' in dest_raw.lower())
        transfer_type = 'external_out' if is_external else 'internal'
        cur.execute("""
            INSERT INTO public.fish_transfer
              (farm_id, origin_system_id, target_system_id, origin_label, target_label,
               transfer_type, date, number_of_fish, total_weight_kg, average_weight_g, comments)
            VALUES (%s, %s, %s, %s, %s, %s::public.transfer_type, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
        """, (farm_id, origin_sys_id, dest_sys_id, origin_raw, dest_raw,
              transfer_type, date, n_fish, total_kg, avg_g, comments))
        inserted += cur.rowcount
    return inserted

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--db-url',  required=True)
    parser.add_argument('--farm-id', required=True)
    parser.add_argument('--data-dir', required=True)
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    farm_id  = args.farm_id

    print(f"Connecting to database...")
    conn = psycopg2.connect(args.db_url)
    conn.autocommit = False
    cur  = conn.cursor()

    tasks = [
        ("Mortality",      "Mortality (cages) (1).xlsx", import_mortality),
        ("Water quality",  "Water quality (cages) (1).xlsx", import_water_quality),
        ("Feeding record", "Feed record (1).xlsx", import_feeding_record),
        ("Feed inventory", "Feed inventory.xlsx", import_feed_inventory),
        ("Fish sampling",  "Fish Sampling (1).xlsx", import_fish_sampling),
        ("Fish stocking",  "Fish Stocking (2).xlsx", import_fish_stocking),
        ("Fish transfer",  "Fish Transfer.xlsx", import_fish_transfer),
    ]

    for label, filename, importer in tasks:
        path = data_dir / filename
        if not path.exists():
            print(f"  ⚠ SKIPPED (file not found): {filename}")
            continue
        print(f"\nImporting {label} from {filename}...")
        rows = read_excel(path)
        try:
            n = importer(cur, farm_id, rows)
            conn.commit()
            print(f"  ✓ {n} rows inserted")
        except Exception as e:
            conn.rollback()
            print(f"  ✗ ERROR: {e}")

    cur.close()
    conn.close()
    print("\nDone.")

if __name__ == '__main__':
    main()
```

### 9.3 How to Run the Import

**Step 1 — Create the farm and organization in the database first** (via the app's Create Workspace flow, or manually in the Studio).

After creating the workspace, note down the `farm_id` UUID from the `farm` table.

**Step 2 — Run the import script:**

```bash
python3 scripts/import_historical_data.py \
  --db-url "postgresql://postgres:<PASSWORD>@db.<REF>.supabase.co:5432/postgres" \
  --farm-id "your-farm-uuid-here" \
  --data-dir "/path/to/your/excel/files"
```

Expected output:
```
Connecting to database...

Importing Mortality from Mortality (cages) (1).xlsx...
  Created system: C4
  Created system: A1
  ... (all unique cage names)
  ✓ 169 rows inserted

Importing Water quality from Water quality (cages) (1).xlsx...
  ✓ 1304 rows inserted

Importing Feeding record from Feed record (1).xlsx...
  ✓ 716 rows inserted

Importing Feed inventory from Feed inventory.xlsx...
  ✓ 1078 rows inserted

Importing Fish sampling from Fish Sampling (1).xlsx...
  ✓ 18 rows inserted

Importing Fish stocking from Fish Stocking (2).xlsx...
  ✓ 7 rows inserted

Importing Fish transfer from Fish Transfer.xlsx...
  ✓ 21 rows inserted

Done.
```

### 9.4 Verify the Import

Open the Supabase dashboard → **Table Editor**. Check:
- `system` table should have one row per unique cage name (A1–A6, B1–B4, C1–C9B)
- `fish_mortality` should have 169 rows
- `water_quality_measurement` should have 1,304 rows
- `feeding_record` should have 716 rows

---

## 10. Step 8 — Set Up Authentication

### 10.1 Dashboard: Auth Settings

Go to **Authentication → Configuration → Auth** in the Supabase dashboard:

- **Site URL:** `https://app.aquasmart.io` (your production URL)
- **Redirect URLs:** Add `http://localhost:3000` for local development
- **JWT expiry:** 3600 (1 hour)
- **Enable email confirmations:** ON
- **Enable double confirm changes:** ON

### 10.2 Create the First Admin User

The first user cannot be created via the public signup flow (there is no farm yet). Create them directly in the Supabase dashboard:

**Authentication → Users → Add user → Create new user**

Enter:
- Email: the farm admin's email address
- Password: a strong temporary password
- ☑ Auto Confirm User

After creating, go to the app and log in. Complete the Create Workspace flow. This creates the organization, farm, and links the admin user.

### 10.3 Invite Team Members (After Farm Is Created)

Once the admin is logged in and the farm exists, the invitation system works via the `private.farm_user_invitation` table + an Edge Function. The app's "Invite user" feature handles this automatically.

For bulk inviting team members before the invitation UI is ready:

```sql
-- In the Supabase SQL editor — invite a user to an existing farm
SELECT public.create_farm_user_invitation(
  p_farm_id := 'your-farm-uuid',
  p_email   := 'fieldworker@aquasmart.io',
  p_role    := 'data_entry'
);
```

Roles available:
| Role | Can do |
|---|---|
| `admin` | Everything: manage users, delete records, change settings |
| `farm_manager` | Add/edit all records, invite users |
| `data_entry` | Add new records; cannot edit past records or manage users |
| `viewer_auditor` | Read-only access to all farm data |

---

## 11. Step 9 — Configure Custom SMTP

Supabase's built-in email is rate-limited to 2 emails/hour (testing only). For production, you need your own SMTP.

### 11.1 Choose an Email Provider

Recommended options for small-scale use:
- **Resend** — free tier: 3,000 emails/month. Best developer experience.
- **SendGrid** — free tier: 100 emails/day
- **Brevo (formerly Sendinblue)** — free tier: 300 emails/day
- **Gmail SMTP** — for very small teams only; limited to ~500/day

### 11.2 Configure in Supabase Dashboard

**Authentication → Configuration → SMTP**

Fill in:
```
Sender name:    AquaSmart
Sender email:   noreply@aquasmart.io
Host:           smtp.resend.com           (or your provider's host)
Port:           465
Username:       resend                    (or your username)
Password:       re_xxxxxxxxxxxxxxxxxxxx   (your SMTP API key)
Minimum interval: 60                      (seconds between emails to same address)
```

Enable: **Custom SMTP** toggle ON.

### 11.3 Customise Email Templates

**Authentication → Configuration → Email Templates**

Update the **Invitation** template to mention AquaSmart:

```html
<h2>You have been invited to AquaSmart</h2>
<p>You have been invited to join a farm workspace on AquaSmart.</p>
<p><a href="{{ .ConfirmationURL }}">Accept invitation</a></p>
<p>This link expires in 24 hours.</p>
```

---

## 12. Step 10 — Connect the Next.js App

### 12.1 Install Supabase Packages

```bash
npm install @supabase/supabase-js @supabase/ssr
```

### 12.2 Browser Client (Used in Components and Client Actions)

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/lib/types/database"

let _client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function supabaseBrowser() {
  if (_client) return _client
  _client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  return _client
}
```

### 12.3 Server Client (Used in Server Components and Route Handlers)

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

### 12.4 Generate TypeScript Types

```bash
supabase gen types typescript \
  --project-id your-project-ref \
  --schema public \
  > src/lib/types/database.ts
```

Run this every time you add or change a table.

---

## 13. Step 11 — Push to Production

### 13.1 Push Schema Migrations

```bash
# Push all migrations in supabase/migrations/ to your production project
supabase db push --project-ref your-project-ref
```

This applies every migration that hasn't been applied yet, in order. It compares against the `supabase_migrations.schema_migrations` table in your production DB.

### 13.2 Verify Migrations Applied

In the Supabase dashboard → **Database → Migrations** — you should see all your migrations listed with green checkmarks.

### 13.3 Import Historical Data to Production

```bash
python3 scripts/import_historical_data.py \
  --db-url "postgresql://postgres:<PASSWORD>@db.<REF>.supabase.co:5432/postgres" \
  --farm-id "your-real-farm-uuid" \
  --data-dir "/path/to/your/excel/files"
```

### 13.4 Enable PITR (Backups)

In **Settings → Add-ons → Point in Time Recovery** — enable it. This gives you second-level recovery for up to 7 days. Essential before going live.

### 13.5 Set Connection Pooling

In **Settings → Database → Connection Pooling**:
- Pool mode: **Transaction**
- Pool size: **15**

### 13.6 Deploy the Next.js App

Add environment variables to your hosting platform (Vercel, Railway, etc.):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

The `SUPABASE_SERVICE_ROLE_KEY` must be in **Server-Side Environment Variables** only (not prefixed with `NEXT_PUBLIC_`).

---

## 14. Step 12 — Verify Everything Works

Run through this checklist after deploying:

### Auth
- [ ] Sign up with a new email → confirmation email arrives
- [ ] Confirm email → redirected to Create Workspace
- [ ] Create workspace (org + farm) → redirected to dashboard
- [ ] Log out → redirected to login
- [ ] Log in again → dashboard loads with data

### Data Isolation (Critical)
- [ ] Create a second test account
- [ ] Invite it to the farm with `viewer_auditor` role
- [ ] Log in as viewer → can see farm data
- [ ] Create a third account with NO farm membership
- [ ] Log in as third account → sees no data at all

### Historical Data
- [ ] Mortality table: 169 rows visible in dashboard
- [ ] Water quality table: 1,304 rows visible
- [ ] Feeding record: 716 rows visible
- [ ] All cage names (C4, A1, A2, B1, etc.) visible in system selector

### Data Entry
- [ ] Enter one new mortality record as `data_entry` role → appears immediately
- [ ] Try to delete it as `data_entry` → should be blocked
- [ ] Delete it as `admin` → succeeds

---

## 15. Ongoing Maintenance

### Adding a New Table (Any Future Feature)

1. `supabase migration new add_<table_name>`
2. Write CREATE TABLE + indexes + RLS policies in the new file
3. `supabase db reset` (test locally)
4. `supabase db push --project-ref <ref>` (deploy to production)
5. `supabase gen types typescript ...` (regenerate TypeScript types)

### After Adding New Farm Staff

1. Admin goes to Settings → Team in the app → Invite by email
2. Invited user receives email, clicks link, sets password
3. They are added to `farm_user` table automatically with the assigned role

### Weekly: Review Slow Queries

Open Supabase dashboard → **Database → Query Performance**. If any query is regularly > 200ms, add a covering index.

### Monthly: Check Table Growth

```sql
-- Run in SQL editor
SELECT
  relname,
  pg_size_pretty(pg_total_relation_size(relid)) AS size,
  n_live_tup AS rows
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 15;
```

If `water_quality_measurement` grows past 10 million rows, consider partitioning by year (see `BACKEND_PRODUCTION_GUIDE.md` for the partitioning migration).

---

## 16. Quick Reference: CLI Commands

```bash
# ── Daily development ─────────────────────────────────────────────────────────
supabase start                          # Start local stack (Docker must be running)
supabase stop                           # Stop local stack
supabase status                         # Show local service URLs and keys

# ── Schema changes ───────────────────────────────────────────────────────────
supabase migration new <name>           # Create a new empty migration file
supabase db reset                       # Wipe local DB + reapply all migrations + seed.sql
supabase db diff                        # Show changes not yet captured in a migration

# ── Sync types ───────────────────────────────────────────────────────────────
supabase gen types typescript \
  --project-id <ref> \
  --schema public \
  > src/lib/types/database.ts

# ── Deploy to production ─────────────────────────────────────────────────────
supabase db push --project-ref <ref>    # Apply unapplied migrations to remote
supabase functions deploy --project-ref <ref>   # Deploy Edge Functions

# ── Secrets (Edge Function environment variables) ─────────────────────────────
supabase secrets set KEY=value --project-ref <ref>
supabase secrets list --project-ref <ref>

# ── Inspect remote ───────────────────────────────────────────────────────────
supabase db pull --project-ref <ref>    # Pull remote schema to local (for audit)
supabase db diff --linked               # Diff local migrations vs remote
```

---

*Created: April 2026. Specific to AquaSmart cage aquaculture, Lake Victoria operation.*
*When your schema evolves, run `supabase migration new <name>` — never edit existing migration files.*

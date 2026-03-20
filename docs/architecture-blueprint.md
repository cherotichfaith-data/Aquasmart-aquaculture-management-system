# AquaSmart Architecture Blueprint

## Verdict

AquaSmart should evolve as a **server-first modular monolith**.

It should **not** move to microservices at this stage.

This is the cleanest fit for the current product because AquaSmart has:

- one product surface
- one main team/codebase
- strong coupling between operational data entry and analytics
- a database-centric domain with farm, system, batch, feeding, mortality, inventory, and water-quality flows sharing the same core entities

## Why This Verdict Fits AquaSmart

### 1. The current repo is mostly client-driven

Observed in this codebase:

- `src/app/*/page.tsx` routes usually hand off to `page.client.tsx`
- there are `104` files marked with `"use client"`
- React Query is acting as the main page data transport layer
- browser-side Supabase access is still the dominant read path
- writes are funneled through a generic `insertData(table, payload)` helper

That model works, but it pushes too much application ownership into the browser:

- auth-aware reads
- mutation policies
- cache orchestration
- page composition

### 2. The stack is already biased toward a server-first design

The current stack is:

- Next.js App Router
- Supabase
- React Query
- Postgres-backed analytics and operational workflows

That stack is strongest when responsibilities are split like this:

- server owns page composition, auth checks, data reads, and commands
- database owns joins, filtering, projections, and analytics-heavy read models
- client owns interaction, optimistic UX, and local state

### 3. AquaSmart is a good modular-monolith domain

The major product areas are related but separable:

- auth and tenant/farm access
- systems
- stocking
- feeding
- mortality
- sampling
- transfer and harvest
- water quality
- inventory
- reports

These are ideal **feature slices** inside one codebase. They are not yet strong candidates for service extraction.

## External Guidance Behind The Verdict

### Next.js

Current Next.js App Router guidance favors:

- Server Components by default
- server-side data fetching
- streaming where useful
- selective client boundaries
- cache invalidation through tags/revalidation

That is directly aligned with a server-first AquaSmart.

### TanStack Query

TanStack Query remains useful, but not as the default page transport in App Router.

Best use in AquaSmart:

- optimistic data-entry UX
- client-owned interactions
- polling or realtime panels
- hydrated server-prefetched queries where interactive reuse is needed

### Supabase

Supabase supports this architecture well when AquaSmart uses:

- server-side clients for authenticated reads and commands
- RLS as a hard boundary
- RPCs and focused read models for analytics
- careful table exposure and typed access

### PostgreSQL

Postgres is already the right place for AquaSmart's heavy read logic:

- projections
- reporting queries
- time-windowed analytics
- partial indexes
- materialized views for expensive aggregates

### Research on architecture evolution

Recent research continues to show that moving from monoliths to microservices is costly and operationally expensive, and that decomposition quality is difficult to automate or get right early.

For AquaSmart, the research supports:

- starting with or retaining a modular monolith
- tightening internal boundaries first
- extracting only after clear operational pressure exists

## Target Architecture

## Core Principle

**Server-first, feature-sliced, database-backed, client-enhanced.**

## Runtime Responsibilities

### Server owns

- route-level auth checks
- active farm resolution
- page composition
- initial data loading
- domain commands
- permission-aware reads
- cache tagging/revalidation

### Client owns

- forms
- optimistic feedback
- tab state
- filter controls
- chart interactions
- realtime subscriptions where needed

### Database owns

- RLS
- analytics RPCs
- canonical derived read models
- heavy aggregation
- cross-table projections
- consistency-sensitive write rules where SQL is the best home

## Recommended Folder Structure

```text
src/app/
  (marketing)/
  (auth)/
  (ops)/
    layout.tsx
    page.tsx
    data-entry/page.tsx
    feed/page.tsx
    mortality/page.tsx
    reports/page.tsx
    sampling/page.tsx
    settings/page.tsx
    water-quality/page.tsx

src/features/
  auth/
    queries.server.ts
    commands.server.ts
    policies.ts
    schemas.ts

  farm/
  systems/
  stocking/
  feeding/
  mortality/
  sampling/
  transfer/
  harvest/
  water-quality/
  inventory/
  reports/

src/components/
  ui/

src/lib/
  supabase/
  cache/
  api/
  hooks/
```

## Recommended Feature Slice Layout

Each business domain should look like this:

```text
src/features/<domain>/
  commands.server.ts
  queries.server.ts
  query-keys.ts
  schemas.ts
  mappers.ts
  types.ts
```

Rules:

- `queries.server.ts` contains server-owned reads
- `commands.server.ts` contains explicit write operations
- `schemas.ts` contains zod validation and input contracts
- `mappers.ts` converts DB rows into UI-facing shapes
- `src/components/` only renders UI

## Data Access Model

## Reads

Preferred pattern:

1. server route/layout resolves auth and farm scope
2. server query function reads from Supabase server client
3. query uses RPC/read model/materialized view when analytics-heavy
4. result is rendered directly by Server Components
5. hydrate into client only when interactivity requires it

Example pattern:

```text
src/app/(ops)/feed/page.tsx
  -> src/features/feed/queries.server.ts
  -> src/lib/supabase/server client
  -> RPC or read model
  -> optional client hydration
```

## Writes

Preferred pattern:

1. client form submits validated input
2. explicit server command handles auth and business rules
3. command performs write or transactional RPC
4. cache tags are refreshed
5. client gets typed result

Replace this style:

```ts
insertData("feeding_record", payload)
```

With this style:

```ts
recordFeeding(input)
createFingerlingBatch(input)
recordWaterQuality(input)
```

That change improves:

- auditability
- business-rule clarity
- testability
- type safety
- long-term maintainability

## Cache Strategy

Use Next.js cache semantics for server-owned data and keep React Query for interactive client state.

Recommended split:

- Next.js tags for page/query invalidation
- React Query for optimistic local updates and live client widgets

Suggested tag families:

- `farm:{farmId}`
- `systems:{farmId}`
- `inventory:{farmId}`
- `feeding:{farmId}:{systemId?}`
- `sampling:{farmId}:{systemId?}`
- `water-quality:{farmId}:{systemId?}`
- `reports:{farmId}:{reportName}`

## Database Architecture

## Keep

- RPCs for analytics and constrained option lists
- RLS on exposed tables
- typed Supabase schema generation

## Add

- explicit write RPCs or SQL functions for complex multi-table commands
- materialized views for heavy report screens
- partial/composite indexes on real filter patterns
- projection tables if certain dashboards are recomputed too often

## Likely High-Value Index Areas

Based on the current domain model, AquaSmart likely benefits from focused indexes around:

- `farm_id`
- `system_id`
- `batch_id`
- `date`
- `created_at`
- mixed filter combinations used by reports and dashboard screens

Examples:

- `(system_id, date desc)`
- `(batch_id, date desc)`
- partial indexes for active systems only

## Security Model

The clean model is:

- auth verified on the server first
- RLS enforced in the database
- client never decides access rules
- only explicit commands perform writes

That means AquaSmart should move away from generic browser-owned mutation helpers for business writes.

## Recommended App-Level Boundaries

## 1. Tenant boundary

Everything should operate inside a resolved farm context.

That context should be resolved once on the server, then passed down.

## 2. Domain boundary

Each feature owns:

- reads
- writes
- validation
- UI
- query keys

No cross-feature mutation logic should live in page files.

## 3. Shared boundary

Shared code should stay limited to:

- UI primitives
- low-level infrastructure
- generic helpers with no domain behavior

If a helper knows about feeding, inventory, batches, or systems, it is probably not shared infrastructure anymore.

## Concrete Refactor Targets In This Repo

## High priority

### 1. Replace `page.client.tsx` route ownership

Today many routes are:

- server shell
- full client page beneath

Target:

- server page owns auth and initial data
- client components are smaller islands inside the page

### 2. Replace generic table writes

Current write path:

- `lib/supabase-actions.ts`
- generic `insertData(table, payload)`

Target:

- feature-specific commands
- server-owned validation
- explicit invalidation

### 3. Move reads to server query modules

Current reads are mostly browser-side through `lib/api/*`.

Target:

- `features/*/queries.server.ts`
- only hydrate into client when necessary

### 4. Narrow React Query's role

Keep React Query for:

- optimistic data entry
- background refresh
- realtime interaction

Reduce React Query usage for:

- initial route fetches
- auth-gated page composition
- static or semi-static option loading

### 5. Replace page-centric feature wiring

Avoid business logic in:

- `app/*/page.client.tsx`

Move it to:

- feature modules
- server query/command files

## Medium priority

### 6. Introduce an architecture decision record habit

For major structural choices, keep short ADRs in `docs/adr/`.

Examples:

- server-first rendering
- modular-monolith decision
- read model strategy
- write-command strategy

### 7. Add performance review to the DB layer

For the heaviest queries:

- use `EXPLAIN`
- verify indexes
- identify repeated aggregations
- promote expensive queries to projections/materialized views

### 8. Add command/query tests

Minimum target:

- command validation tests
- query contract tests
- RLS-sensitive integration tests

## Migration Plan

## Phase 1: Establish the skeleton

- create `features/` slices
- create `queries.server.ts` and `commands.server.ts` patterns
- add cache tag conventions
- document domain ownership rules

## Phase 2: Serverize the read-heavy screens

Start with:

- dashboard
- feed
- reports

These gain the most from server-side query ownership.

## Phase 3: Convert data entry writes to explicit commands

Start with:

- feeding
- mortality
- sampling
- transfer
- harvest
- stocking
- water quality

Then remove generic write helpers from the critical path.

## Phase 4: Optimize analytics reads

- identify hot RPCs and report queries
- add indexes
- add materialized views/projections where justified

## Phase 5: Reduce client sprawl

- shrink full-page client components
- keep only interactive islands as client components

## Non-Goals Right Now

- microservices
- separate per-domain deployment units
- event-driven distributed architecture
- multiple databases per domain

Those add operational overhead without solving AquaSmart's current bottlenecks.

## Clean Product Rules

- default to Server Components
- use client only for real interactivity
- domain commands must be explicit
- route files compose; feature files implement
- DB-heavy analytics stay close to Postgres
- React Query enhances UX; it does not define the architecture

## Recommended First Execution Plan

If work continues incrementally, the first three concrete refactors should be:

1. keep only feature slices that are imported by real routes
2. replace generic write calls with explicit server commands for the highest-risk data-entry paths
3. convert page-level analytics reads to server-owned feature queries with optional hydration

That will establish the pattern without forcing a full rewrite.

## Sources

- Next.js App Router docs: https://nextjs.org/docs/app
- Next.js data fetching: https://nextjs.org/docs/app/building-your-application/data-fetching
- Next.js caching and revalidation: https://nextjs.org/docs/app/building-your-application/caching
- Next.js `updateTag`: https://nextjs.org/docs/app/api-reference/functions/updateTag
- TanStack Query advanced SSR guide: https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr
- TanStack Query overview: https://tanstack.com/query/latest/docs/framework/react/overview
- Supabase + Next.js guide: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase query optimization: https://supabase.com/docs/guides/database/query-optimization
- PostgreSQL partial indexes: https://www.postgresql.org/docs/current/indexes-partial.html
- PostgreSQL materialized views: https://www.postgresql.org/docs/current/rules-materializedviews.html
- Scientific review on monolith decomposition and migration complexity: https://doi.org/10.1109/TSE.2023.3287297
- Scientific study on migration tradeoffs and incremental evolution: https://doi.org/10.1016/j.peva.2024.102411

# Samaki360

Samaki360 is a Next.js and Supabase aquaculture operations platform for farm teams that need daily production capture, operational dashboards, reporting, and offline-friendly field workflows.

## Current App Scope

- Dashboard
- Production
- Feed
- Sampling
- Mortality
- Water quality
- Reports
- Data entry
- Settings and users
- Onboarding and workspace selection

## Project Structure

- `src/app`: App Router routes, layouts, handlers, and page shells
- `src/components`: shared UI and layout primitives
- `src/features`: domain-facing reads, writes, hooks, components, selectors, and types
- `src/lib`: shared infrastructure, helpers, hooks, Supabase clients, and offline support
- `supabase`: migrations, SQL, and backend support files
- `public`: static assets

## Database Changes

Every schema change — a new table, a new or updated RLS policy, a new column — goes in its own file under `supabase/migrations`, created with `supabase migration new <description>` and reviewed like any other code change. Don't edit the schema live in the Supabase dashboard and catch git up later; by the time that happens the migration history no longer describes how the schema actually got here, and there's no reviewable diff for what changed or why. `20260817090000_add_planned_activities_and_reminders.sql` is the reference shape: table, indexes, foreign keys, `ENABLE ROW LEVEL SECURITY`, and every policy the table needs, all in the one migration that introduces the table — not added later once something bypassing RLS turns out to need them.

That last part matters specifically here: this app uses Postgres RLS as the actual authorization layer, not just a backstop. Application code should read/write through the session-scoped client `resolveServerUser()` / `requireApiUser()` already provides (`lib/server/auth.ts`) and let the database enforce who can do what — not re-check a `farm_user` role by hand next to a service-role query. See the doc comment on `createAdminClient()` (`src/lib/supabase/admin.ts`) for the short list of cases where the service role is actually the right call.

## Local Development

Install dependencies and run the app:

```bash
npm install
npm run dev
```

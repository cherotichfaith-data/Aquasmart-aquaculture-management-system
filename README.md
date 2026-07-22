# AquaSmart

AquaSmart is a Next.js and Supabase aquaculture operations platform for farm teams that need daily production capture, operational dashboards, reporting, and offline-friendly field workflows.

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

## Local Development

Install dependencies and run the app:

```bash
npm install
npm run dev
```

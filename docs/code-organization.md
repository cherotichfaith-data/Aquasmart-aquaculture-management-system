# Code Organization

This repo should stay as a modular monolith with a small number of clear boundaries:

```text
src/app/        route entrypoints and page composition
src/features/   route-facing server reads and commands
src/components/ reusable UI and page sections
src/lib/        shared infrastructure, API clients, hooks, and low-level helpers
supabase/       database migrations and backend config
```

Rules:

- Put route-specific server reads in `src/features/<domain>/queries.server.ts`.
- Put route-specific writes in `src/features/<domain>/commands.server.ts` only when that feature is server-first.
- Keep browser and server Supabase helpers in one place under `src/lib/supabase/`.
- Keep generic React Query hooks in `src/lib/hooks/`.
- Keep route-local visualization helpers close to the route when they are not reused elsewhere.
- Prefer route-private folders like `src/app/<route>/_lib/` for route-local selectors, mappers, and helper modules.
- Do not keep speculative scaffold folders or duplicate feature slices.

Preferred direction:

- `src/app/` should compose data that already exists in `src/features/` and `src/components/`.
- `src/features/` should grow only for domains that are actually imported by pages.
- shared formatting, timeline, and query-result helpers should stay centralized instead of being copied per page.

# Feature Slices

This folder contains only feature slices that are actively wired into the app.

Each active feature should own:

- route-level server reads in `queries.server.ts`
- explicit writes in `commands.server.ts` when the feature is server-first
- feature types and schemas
- feature-local mapping and shaping logic

Recommended shape:

```text
src/features/<domain>/
  queries.server.ts
  commands.server.ts
  types.ts
  schemas.ts
```

Ownership rules:

- `src/app/` composes routes and page shells.
- `src/features/` owns domain-facing server logic.
- `src/components/ui/` contains shared primitives only.
- `src/lib/` contains infra, client hooks, and generic helpers.

Current active slices:

- `dashboard`
- `feed`
- `farm`
- `shared`
- `water-quality`

Rule for cleanup:

- do not keep scaffold-only slices in `src/features/`
- add a slice only when a route or component imports it

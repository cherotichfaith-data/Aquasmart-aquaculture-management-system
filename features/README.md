# Feature Slices

This folder is the target home for AquaSmart's domain logic.

Each feature owns:

- server queries
- server commands
- validation schemas
- query key definitions
- mappers and types
- feature-specific UI components

## Slice Contract

Recommended shape:

```text
features/<domain>/
  commands.server.ts
  queries.server.ts
  query-keys.ts
  schemas.ts
  types.ts
  mappers.ts
  components/
```

## Ownership Rules

- `app/` composes routes, enforces route-level auth, and wires page layout.
- `features/` owns business behavior.
- `components/ui/` only contains shared primitives.
- `lib/` contains low-level infrastructure, not domain rules.

## Server-First Rules

- Reads should move into `queries.server.ts`.
- Writes should move into explicit `commands.server.ts`.
- Commands should validate input with zod and invalidate cache tags intentionally.
- Generic table helpers are infrastructure only, not the long-term application boundary.

## Current Phase 1 Scope

The initial scaffold is created for:

- `systems`
- `feeding`
- `stocking`
- `water-quality`

These are the first domains targeted for the server-first migration pattern.

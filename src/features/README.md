# Feature Slices

This folder contains only feature slices that are actively wired into the app.

Each active feature should own:

- route-level server reads in `queries.server.ts`
- explicit writes in `mutations.server.ts`
- feature types and schemas
- feature-local mapping and shaping logic

Recommended shape:

```text
src/features/<domain>/
  queries.server.ts
  mutations.server.ts
  types.ts
  schemas.ts
```

Ownership rules:

- `src/app/` composes routes and page shells.
- `src/features/` owns domain-facing server logic.
- `src/components/app-ui/` contains shared MUI-backed primitives only.
- `src/lib/` contains infra, client hooks, and generic helpers.
- `src/lib/api/*` is legacy client transport only; table and RPC reads do not belong there anymore.
- `src/lib/server/*` is infra only; transactional and analytics reads belong in feature `queries.server.ts` files.

Current active slices:

- `data-entry`
- `dashboard`
- `feed`
- `farm`
- `onboarding`
- `production`
- `reports`
- `sampling`
- `settings`
- `shared`
- `water-quality`

Notes:

- Dashboard-specific components live in `src/features/dashboard/components`
- Shared analytics types were moved out of a feature slice and now live in `src/lib/types/insights.ts`
- Shared transactional reads now live in `src/features/shared/queries.server.ts`
- App routing is canonical under `src/app/*`, with auth and onboarding flow enforced in `src/proxy.ts`
- Online-only mutations now live in feature-scoped `mutations.server.ts` files; offline-critical writes stay on API routes
- Feed inventory now also lives in the Server Action bucket; API write routes remain only for offline-critical capture paths
- App Router reads should prefer server-side React Query hydration: load on the server, seed a `QueryClient`, wrap the page with `HydrationBoundary`, and let client hooks read from the hydrated cache
- Dashboard pages, widgets, and shared query hooks should not accept `initialData` props; hydrated reads must resolve through the shared React Query cache only
- Onboarding now follows the same pattern: server reads live in `src/features/onboarding/queries.server.ts` and `src/app/onboarding/page.tsx` seeds the cache before rendering the client form

Hydration convention:

```text
src/app/<route>/page.tsx
  -> fetch server data in feature `queries.server.ts`
  -> `const queryClient = createQueryClient()`
  -> `queryClient.setQueryData(queryKeys..., data)`
  -> `<HydrationBoundary state={dehydrate(queryClient)}>`
  -> render client page/widget tree

src/features/<domain>/components/*.tsx
  -> call `useQuery(...)` hooks only
  -> do not accept `initialData` props for hydrated reads

src/lib/hooks/**/*.ts
  -> do not expose `initialData` parameters for hydrated reads
  -> rely on `HydrationBoundary + dehydrate()` seeded cache state instead
```

Intentional client-first exceptions:

- `src/components/notifications/notifications-provider.tsx` remains provider-scoped and lazy-loaded; it is not page-hydrated so global notifications do not force app-wide SSR prefetching
- `src/lib/hooks/app/use-active-farm.tsx` and `src/lib/hooks/use-active-farm-role.ts` remain app-state/session hooks; dashboard pages should preseed their query keys when SSR parity matters, but the hooks still support client-side farm switching and refresh flows

Rule for cleanup:

- do not keep scaffold-only slices in `src/features/`
- add a slice only when a route or component imports it
- frontend reads must flow through feature `queries.server.ts` boundaries; direct table/RPC reads in UI code are not allowed

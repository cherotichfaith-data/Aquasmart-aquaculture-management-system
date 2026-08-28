// Injected into the generated service worker (see `worker/index.ts` picked up
// automatically by @ducanh2912/next-pwa's `customWorkerSrc`, which defaults to
// this `worker/` directory). Workbox continues to own precaching/routing --
// this file only adds a Background Sync handler on top of it, so a record
// saved offline can flush the moment the OS/browser regains connectivity,
// even if no Samaki360 tab is open (see src/lib/offline/background-sync.ts
// for the client-side registration half of this).
//
// Per next-pwa's own guidance, this is a best-effort enhancement, not
// something the app depends on: the existing setInterval + 'online'-listener
// loop in src/lib/offline/use-sync.ts is the reliable path and keeps working
// unchanged regardless of whether Background Sync fires, is supported, or
// this file fails to load for any reason.
//
// Deliberately avoids the ambient "webworker" lib types (ServiceWorkerGlobalScope,
// ExtendableEvent, SyncEvent) since the app's tsconfig only includes "dom" --
// self is cast through `unknown` instead so this compiles under either.

import { runSync } from "../src/lib/offline/sync"

const OFFLINE_SYNC_TAG = "aquasmart-offline-sync"

interface SyncEventLike {
  tag: string
  waitUntil: (promise: Promise<unknown>) => void
}

const scope = self as unknown as {
  addEventListener: (type: string, listener: (event: SyncEventLike) => void) => void
}

scope.addEventListener("sync", (event) => {
  if (event.tag !== OFFLINE_SYNC_TAG) return
  event.waitUntil(runSync().catch(() => undefined))
})

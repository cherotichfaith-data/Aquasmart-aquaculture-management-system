# Data Entry as a Standalone App — Research & Recommendations

Date: July 31, 2026
Scope: `src/app/data-entry`, `src/features/data-entry`, `src/lib/offline`, PWA config

## 1. Goal

Turn the Data Entry page from "a page inside the dashboard" into a focused, installable, mobile-first, offline-first app in its own right — the way Farm360 (formerly Aquanetix) and comparable field-data-capture apps work: farm staff open one app on their phone, it works with no signal, and every save is instant and durable.

## 2. Where AquaSmart already stands

The codebase has more of this built than a first look suggests.

**Already in place**
- A PWA manifest (`public/manifest.json`) with `start_url: "/data-entry"` and `display: "standalone"` — the intent to make data entry the app's front door is already declared.
- `@ducanh2912/next-pwa` (Workbox) wired into `next.config.mjs`, generating `public/sw.js`, disabled in dev.
- A real offline write path, not just a cache: `src/lib/offline/db.ts` defines a Dexie (IndexedDB) database with one table per record type (feeding, mortality, water quality, sampling, stocking, harvest, transfer), each row tagged `syncStatus: pending | synced | conflict | failed`.
- `useOfflineMutation` (`src/lib/offline/use-offline-mutation.ts`) tries a direct network POST first, and only falls back to the local queue on a real network failure (`isNetworkSaveError`) — so online saves stay fast and don't round-trip through IndexedDB unnecessarily.
- Exponential backoff on retries (`src/lib/offline/sync.ts`): 30s → 60s → 2m → 4m → 8m, capped, with a `failed` state after 5 attempts so bad records don't retry forever.
- A sync controller (`use-sync.ts`) that runs on mount, on the `online` event, and every 60s, plus a manual trigger — and a visible "Saved Offline" badge (`offline-save-badge.tsx`).
- 409 responses are treated as "already synced" (server-side idempotency via `local_id`), not as hard errors — a sane conflict default.

**Gaps between what exists and "an app of its own"**

1. **The data-entry route still renders full dashboard chrome.** `DataEntryPageClient` wraps everything in `DashboardLayout`, and even with `hideHeader`, `DashboardLayout` still mounts the full desktop `<Sidebar>` and applies `md:ml-[dashboard-offset]`. On mobile, hiding the header also hides the only control that opens the sidebar — the page isn't lightweight, it's just missing a menu button. A true standalone app needs its own minimal shell (no dashboard sidebar, no desktop-oriented offset math), not the dashboard layout with pieces switched off.
2. **Offline coverage is incomplete.** `OfflineTableName` covers 7 record types, but `feed_inventory` and `system` (system setup) have no offline table and no route through `useOfflineMutation` — those two forms in `data-entry-interface.tsx` will simply fail if a worker is offline.
3. **Reference/lookup data isn't offline-aware.** Systems, batches, and feed types are passed in as server-fetched props (`initialSystems`, `initialBatches`, `initialFeeds`). If a worker opens the app after several offline days, or a new system/batch was added since their last sync, the dropdowns are stale and there's no local cache of this reference data to fall back on.
4. **Sync only runs while the tab is alive.** The `setInterval(60_000)` and `online` listener in `use-sync.ts` stop the moment the PWA is backgrounded or the browser is closed — there's no Background Sync / Periodic Background Sync registration in the service worker, so a record saved offline may sit until the user manually reopens the app.
5. **No install prompt or onboarding.** Nothing in the app surfaces "Add to Home Screen" / `beforeinstallprompt` — which matters a lot for field workers who won't think to do this themselves.
6. **Manifest is minimal.** Two icon sizes, no `purpose: "maskable"` icon (Android will letterbox/crop the icon without one), no `shortcuts` (e.g., long-press → "Log Feeding"), no `screenshots` (used by richer install UI on Android/desktop).
7. **No stated offline-auth story.** Supabase auth tokens expire; if a session token lapses while a worker is offline for an extended period, direct network POSTs and background sync pushes will start failing with 401s that look like generic network errors today (`isNetworkSaveError` only recognizes network-level failures, not auth failures) — worth an explicit decision (e.g., long-lived refresh token handling, or a clear "please reconnect to sync" auth-specific error state).

## 3. Competitor research: Farm360 (Innovasea) / Aquanetix

Aquanetix was acquired by Innovasea and rebranded as **Farm360** — so "Farm360" and "Aquanetix" are effectively the same product lineage today, sold as a companion mobile app to a web planning tool.

- **Split by role, not by device.** Farm managers plan and configure on the web app; farm workers use the phone app purely to execute — record feedings, mortalities, health/net status, and husbandry events from stocking to harvest. The mobile app is deliberately narrow in scope.
- **Sampling recorded on-site, at the moment it happens** — the value proposition is capturing data at the point of work, not transcribing notes later.
- **Feed inventory is a first-class mobile flow**: purchases, movements between warehouses, real-time stock checks — not bolted on.
- **Push-style prompts drive data capture**: the app proactively prompts workers to log mortality, net condition, and fish state *every time they feed* — turning data entry into a habit attached to an existing task rather than a separate chore.
- **Notifications for gaps**: alerts for missed feedings and missing water-parameter readings, delivered on-device.
- **Built and marketed explicitly around offline + cloud sync** — "works online and offline" is a headline feature, not a footnote.
- Distributed as a dedicated native-feeling mobile app (iOS/Android), separate from their desktop/web management console, reinforcing the "one focused app for the field" model AquaSmart is aiming for.

Sources: [Farm360 – Google Play](https://play.google.com/store/apps/details?id=uk.co.aquanetixmobile), [Farm360 Aquaculture – App Store](https://apps.apple.com/us/app/farm360-aquaculture/id6502832864), [Innovasea Farm Management Software](https://www.innovasea.com/aquaculture-intelligence/farm-management-software/), [Farm360 by Innovasea – International Aquafeed](https://www.aquafeed.co.uk/farm360-by-innovasea/), [Aquaculture data-collection app provides cloud coverage – Global Seafood Alliance](https://www.globalseafood.org/advocate/data-collection-app-provides-cloud-coverage/), [Aquanetix](https://aquanetix.co.uk/)

## 4. Broader mobile-first, offline-first patterns worth adopting

**Architecture**
- Local-first is the default expectation now, not a stretch goal: Gartner projects over 65% of enterprise mobile apps will treat offline as standard architecture by end of 2026. AquaSmart's Dexie-based queue is already aligned with this.
- The write-through pattern AquaSmart already uses (try network → fall back to local queue → background retry) is the accepted best practice; the missing piece is background sync so it doesn't depend on the app being open.
- Conflict resolution should stay simple and explicit: last-write-wins with a server timestamp is fine for single-worker-per-system data entry (which this mostly is); reserve "prompt user to choose" for cases where two people could legitimately edit the same record.
- `next-pwa`/Workbox works, but several current guides point to **Serwist** as the actively maintained successor for newer Next.js versions if `next-pwa` maintenance becomes a blocker — not urgent, but worth knowing before the next major Next.js upgrade.

**UX for field conditions**
- High contrast and large text for outdoor/direct-sunlight readability.
- Large touch targets and thumb-reachable primary actions for one-handed use (a worker holding a net or feed bag in the other hand).
- Icon-forward, minimal-text flows where possible — useful for multilingual farm crews.
- Always-visible, unambiguous online/offline and sync-status indicators (AquaSmart has the pieces — `SyncStatusBar`, `OfflineSaveBadge` — this is about making them louder and consistent inside a standalone shell).
- Optimistic UI: the record should feel saved the instant the worker taps save, with sync status resolving quietly in the background — which is exactly what `useOfflineMutation` already does; it just needs to be paired with a shell that doesn't bury that feedback in dashboard chrome.

Sources: [Fulcrum – best practices for field data collection apps](https://www.fulcrumapp.com/blog/best-practices-for-creating-mobile-apps-for-data-collection/), [Gapsy – UI/UX guide to agriculture app design](https://gapsystudio.com/blog/agriculture-app-design/), [LogRocket – Next.js 16 PWA with true offline support](https://blog.logrocket.com/nextjs-16-pwa-offline-support/), [Offline-first PWA with Next.js & IndexedDB](https://www.wellally.tech/blog/build-offline-first-pwa-nextjs-indexeddb), [Building offline apps with Next.js and Serwist](https://sukechris.medium.com/building-offline-apps-with-next-js-and-serwist-a395ed4ae6ba)

## 5. Recommended next steps, roughly in priority order

1. **Give data entry its own app shell.** A minimal layout (top status bar with sync state + farm name, bottom tab bar for the 9 record types, no dashboard sidebar) used only when the app is launched standalone (`display-mode: standalone` or the `/data-entry` route family), instead of reusing `DashboardLayout`.
2. **Close the offline gap for `feed_inventory` and `system`.** Add Dexie tables + sync configs so every data-entry form works offline, matching the other seven.
3. **Cache reference data locally.** Mirror `systems`, `batches`, and `feed` options into IndexedDB on every successful fetch, and read from that cache when offline or stale, so dropdowns keep working after days without signal.
4. **Register Background Sync in the service worker** so queued records flush even if the app isn't in the foreground when connectivity returns.
5. **Add an install prompt** (capture `beforeinstallprompt`, surface a "Install AquaSmart" CTA) plus a maskable icon and `shortcuts` in the manifest (e.g., jump straight to Feeding or Mortality).
6. **Make sync status impossible to miss** in the new shell — persistent pending-count chip, last-synced timestamp, tap-to-retry.
7. **Decide the offline-auth story explicitly** — how long a session stays valid offline, and what the user sees if a sync fails specifically because of an expired token versus no network.

Happy to turn any of these into an implementation plan or start on the app shell first — that's the item with the most visible payoff.

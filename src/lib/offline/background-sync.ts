"use client"

/** Must match the tag string checked in worker/index.ts. */
export const OFFLINE_SYNC_TAG = "aquasmart-offline-sync"

type SyncManagerLike = { register: (tag: string) => Promise<void> }

/**
 * Best-effort registration of a one-shot Background Sync so the offline queue
 * can flush even if the tab is backgrounded or fully closed when connectivity
 * returns. Only Chromium-based browsers support the Background Sync API
 * (Safari and Firefox don't expose `sync` on the registration at all), so this
 * silently no-ops everywhere else -- the existing setInterval + 'online'
 * listener in use-sync.ts is the actual reliable sync path and is unaffected
 * either way.
 */
export async function registerBackgroundSync() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return

  try {
    const registration = await navigator.serviceWorker.ready
    const sync = (registration as ServiceWorkerRegistration & { sync?: SyncManagerLike }).sync
    if (!sync) return
    await sync.register(OFFLINE_SYNC_TAG)
  } catch {
    // Registration is a nice-to-have, not a requirement -- swallow and rely
    // on the foreground sync loop.
  }
}

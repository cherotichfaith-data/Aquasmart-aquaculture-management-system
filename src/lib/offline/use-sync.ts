"use client"

import { useCallback, useEffect, useRef } from "react"
import { registerBackgroundSync } from "@/lib/offline/background-sync"
import { getPendingCount, runSync } from "@/lib/offline/sync"
import { useSyncStore } from "@/lib/offline/sync-store"

export function useSyncController() {
  const { setIsSyncing, setPendingCount, setLastSyncedAt, setSyncError, setManualSync, setNeedsReauth } =
    useSyncStore()
  const syncingRef = useRef(false)

  const triggerSync = useCallback(async () => {
    if (syncingRef.current) return

    syncingRef.current = true
    setIsSyncing(true)
    setSyncError(null)

    try {
      const count = await getPendingCount()
      setPendingCount(count)
      if (count === 0) {
        setNeedsReauth(false)
        return
      }

      const result = await runSync()
      setLastSyncedAt(new Date())

      if (result.authErrors > 0) {
        setNeedsReauth(true)
        setSyncError(
          `${result.authErrors} record(s) can't sync until you sign in again.`,
        )
      } else {
        setNeedsReauth(false)
        if (result.errors > 0) {
          setSyncError(`${result.errors} record(s) failed to sync and will retry automatically.`)
        }
      }

      if (result.pushed > 0 || result.conflicts > 0) {
        window.dispatchEvent(new CustomEvent("offline-sync-complete", { detail: result }))
      }
    } catch {
      setSyncError("Sync failed. Data remains saved locally.")
    } finally {
      syncingRef.current = false
      setIsSyncing(false)
      void getPendingCount().then(setPendingCount)
    }
  }, [setIsSyncing, setLastSyncedAt, setNeedsReauth, setPendingCount, setSyncError])

  useEffect(() => {
    setManualSync(triggerSync)
    void getPendingCount().then(setPendingCount)
    void triggerSync()
    // Best-effort: lets the offline queue flush via the service worker even
    // if this tab gets backgrounded/closed before connectivity returns. See
    // background-sync.ts -- no-ops entirely on browsers without support.
    void registerBackgroundSync()

    window.addEventListener("online", triggerSync)

    const intervalId = window.setInterval(() => {
      void triggerSync()
    }, 60_000)

    return () => {
      setManualSync(null)
      window.removeEventListener("online", triggerSync)
      window.clearInterval(intervalId)
    }
  }, [setManualSync, setPendingCount, triggerSync])

  return { triggerSync }
}

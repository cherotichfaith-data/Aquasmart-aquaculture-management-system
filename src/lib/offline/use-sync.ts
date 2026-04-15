"use client"

import { useCallback, useEffect, useRef } from "react"
import { getPendingCount, runSync } from "@/lib/offline/sync"
import { useSyncStore } from "@/lib/offline/sync-store"

export function useSyncController() {
  const { setIsSyncing, setPendingCount, setLastSyncedAt, setSyncError, setManualSync } = useSyncStore()
  const syncingRef = useRef(false)

  const triggerSync = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return

    syncingRef.current = true
    setIsSyncing(true)
    setSyncError(null)

    try {
      const count = await getPendingCount()
      setPendingCount(count)
      if (count === 0) return

      const result = await runSync()
      setLastSyncedAt(new Date())

      if (result.errors > 0) {
        setSyncError(`${result.errors} record(s) failed to sync and will retry automatically.`)
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
  }, [setIsSyncing, setLastSyncedAt, setPendingCount, setSyncError])

  useEffect(() => {
    setManualSync(triggerSync)
    void getPendingCount().then(setPendingCount)
    if (navigator.onLine) {
      void triggerSync()
    }

    window.addEventListener("online", triggerSync)

    const intervalId = window.setInterval(() => {
      if (navigator.onLine) {
        void triggerSync()
      }
    }, 60_000)

    return () => {
      setManualSync(null)
      window.removeEventListener("online", triggerSync)
      window.clearInterval(intervalId)
    }
  }, [setManualSync, setPendingCount, triggerSync])

  return { triggerSync }
}

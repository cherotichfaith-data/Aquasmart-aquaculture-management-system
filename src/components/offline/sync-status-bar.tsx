"use client"

import { useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { AlertTriangle, CheckCircle2, Loader2, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSyncStore } from "@/lib/offline/sync-store"

export function SyncStatusBar() {
  const { isSyncing, pendingCount, lastSyncedAt, syncError, manualSync } = useSyncStore()
  const [hasMounted, setHasMounted] = useState(false)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setHasMounted(true)
    setIsOnline(navigator.onLine)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  if (!hasMounted) {
    return null
  }

  const canSyncNow = Boolean(manualSync) && isOnline && !isSyncing && pendingCount > 0
  const syncButton = canSyncNow ? (
    <Button size="sm" variant="outline" className="h-7 rounded-full px-3 text-[11px]" onClick={() => void manualSync?.()}>
      Sync now
    </Button>
  ) : null

  if (syncError) {
    return (
      <div className="flex flex-col gap-2 border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>{syncError}</span>
        </div>
        {syncButton}
      </div>
    )
  }

  if (isSyncing) {
    return (
      <div className="flex flex-col gap-2 border-b border-blue-200 bg-blue-50 px-4 py-2 text-xs text-blue-700 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Syncing to server...</span>
        </div>
      </div>
    )
  }

  if (pendingCount > 0) {
    return (
      <div className="flex flex-col gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <WifiOff className="h-3.5 w-3.5" />
          <span>
            {pendingCount} record{pendingCount > 1 ? "s" : ""} pending upload and saved locally.
          </span>
        </div>
        {syncButton}
      </div>
    )
  }

  if (lastSyncedAt) {
    return (
      <div className="flex items-center gap-2 border-b border-green-200 bg-green-50 px-4 py-1.5 text-xs text-green-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span>All synced {formatDistanceToNow(lastSyncedAt, { addSuffix: true })}</span>
      </div>
    )
  }

  return null
}

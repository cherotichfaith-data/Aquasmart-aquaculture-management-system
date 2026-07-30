"use client"

import { useSyncExternalStore } from "react"
import { formatDistanceToNow } from "date-fns"
import { AlertTriangle, CheckCircle2, Loader2, WifiOff } from "lucide-react"
import { Button } from "@/components/app-ui/button"
import { useSyncStore } from "@/lib/offline/sync-store"
import { cn } from "@/lib/utils"

const barClassName = "flex items-center border-b px-4 py-2"

const severityClassName = {
  error: "border-destructive/30 bg-[color-mix(in_srgb,var(--color-destructive)_8%,transparent)] text-destructive",
  info: "border-info/30 bg-[color-mix(in_srgb,var(--color-info)_8%,transparent)] text-info",
  warning: "border-warning/30 bg-[color-mix(in_srgb,var(--color-warning)_8%,transparent)] text-[color:var(--warning-foreground)]",
  success: "border-success/30 bg-[color-mix(in_srgb,var(--color-success)_8%,transparent)] text-[color:var(--success-foreground)]",
} as const

export function SyncStatusBar() {
  const { isSyncing, pendingCount, lastSyncedAt, syncError, manualSync } = useSyncStore()
  const hasMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  if (!hasMounted) {
    return null
  }

  const canSyncNow = Boolean(manualSync) && !isSyncing && pendingCount > 0
  const syncButton = canSyncNow ? (
    <Button size="sm" variant="outline" onClick={() => void manualSync?.()} className="min-h-7 rounded-full px-3 text-[11px]">
      Sync now
    </Button>
  ) : null

  if (syncError) {
    return (
      <div className={cn(barClassName, severityClassName.error)}>
        <div className="flex w-full flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="shrink-0" />
            <span className="text-xs">{syncError}</span>
          </div>
          {syncButton}
        </div>
      </div>
    )
  }

  if (isSyncing) {
    return (
      <div className={cn(barClassName, severityClassName.info)}>
        <div className="flex items-center gap-2">
          <Loader2 size={14} className="shrink-0 animate-spin" />
          <span className="text-xs">Syncing to server...</span>
        </div>
      </div>
    )
  }

  if (pendingCount > 0) {
    return (
      <div className={cn(barClassName, severityClassName.warning)}>
        <div className="flex w-full flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <WifiOff size={14} className="shrink-0" />
            <span className="text-xs">
              {pendingCount} record{pendingCount > 1 ? "s" : ""} pending upload and saved locally.
            </span>
          </div>
          {syncButton}
        </div>
      </div>
    )
  }

  if (lastSyncedAt) {
    return (
      <div className={cn(barClassName, severityClassName.success)}>
        <div className="flex items-center gap-2">
          <CheckCircle2 size={14} className="shrink-0" />
          <span className="text-xs">All synced {formatDistanceToNow(lastSyncedAt, { addSuffix: true })}</span>
        </div>
      </div>
    )
  }

  return null
}

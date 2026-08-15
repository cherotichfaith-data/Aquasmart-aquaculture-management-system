"use client"

import Link from "next/link"
import { useSyncExternalStore } from "react"
import { formatDistanceToNow } from "date-fns"
import { AlertTriangle, CheckCircle2, LogIn, Loader2, WifiOff } from "lucide-react"
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
  const { isSyncing, pendingCount, lastSyncedAt, syncError, manualSync, needsReauth, isOffline } = useSyncStore()
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
    <Button size="sm" variant="outline" onClick={() => void manualSync?.()} className="min-h-7 rounded-full px-3 text-tag">
      Sync now
    </Button>
  ) : null

  // Checked ahead of the generic syncError bar -- a "Sync now" button is useless
  // here since retrying without a fresh session will just 401 again. Signing
  // back in re-establishes the session, and the existing 60s/online-triggered
  // sync loop picks the queued records up automatically after that.
  if (needsReauth) {
    return (
      <div className={cn(barClassName, severityClassName.error)}>
        <div className="flex w-full flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="shrink-0" />
            <span className="text-xs">
              {syncError ?? "Your session expired. Sign in again to sync your saved records."}
            </span>
          </div>
          <Button size="sm" variant="outline" asChild className="min-h-7 rounded-full px-3 text-tag">
            <Link href="/auth">
              <LogIn size={12} />
              Sign in
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  // Checked ahead of the pendingCount/lastSynced states below: while offline,
  // a "Sync now" button would just fail, and staying silent until something
  // happens to be queued would leave a crew with no way to tell the app even
  // noticed the connection dropped. This fires the moment we're offline,
  // pending records or not.
  if (isOffline) {
    return (
      <div className={cn(barClassName, severityClassName.warning)}>
        <div className="flex items-center gap-2">
          <WifiOff size={14} className="shrink-0" />
          <span className="text-xs">
            {pendingCount > 0
              ? `Offline -- ${pendingCount} record${pendingCount > 1 ? "s" : ""} saved locally and will sync when you're back online.`
              : "Offline -- entries you save now will sync when you're back online."}
          </span>
        </div>
      </div>
    )
  }

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

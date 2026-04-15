"use client"

import { HardDriveDownload } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { hasPendingSyncMeta } from "@/lib/offline/result"

export function OfflineSaveBadge({ result }: { result: unknown }) {
  if (!hasPendingSyncMeta(result) || !result.meta.pendingSync) {
    return null
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            <HardDriveDownload className="h-3 w-3" />
            Saved Offline
          </Badge>
          <span className="text-xs sm:text-sm">This submission is stored on the device and queued for sync.</span>
        </div>
      </div>
    </div>
  )
}

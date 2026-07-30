"use client"

import { HardDriveDownload } from "lucide-react"
import { hasPendingSyncMeta } from "@/lib/offline/result"
import { Badge } from "@/components/app-ui/badge"

export function OfflineSaveBadge({ result }: { result: unknown }) {
  if (!hasPendingSyncMeta(result) || !result.meta.pendingSync) {
    return null
  }

  return (
    <div className="rounded-lg border border-[color-mix(in_srgb,var(--color-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-warning)_10%,transparent)] px-3 py-2.5 text-[color:var(--warning-foreground)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="gap-1 border-[color-mix(in_srgb,var(--color-warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-warning)_14%,transparent)] text-inherit"
          >
            <HardDriveDownload size={12} />
            Saved Offline
          </Badge>
          <p className="text-xs sm:text-sm">This submission is stored on the device and queued for sync.</p>
        </div>
      </div>
    </div>
  )
}

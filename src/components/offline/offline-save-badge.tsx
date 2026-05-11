"use client"

import Alert from "@mui/material/Alert"
import Chip from "@mui/material/Chip"
import Typography from "@mui/material/Typography"
import { HardDriveDownload } from "lucide-react"
import { hasPendingSyncMeta } from "@/lib/offline/result"

export function OfflineSaveBadge({ result }: { result: unknown }) {
  if (!hasPendingSyncMeta(result) || !result.meta.pendingSync) {
    return null
  }

  return (
    <Alert
      severity="warning"
      icon={false}
      sx={{
        borderRadius: 2,
        border: "1px solid color-mix(in srgb, var(--color-warning) 30%, transparent)",
        bgcolor: "color-mix(in srgb, var(--color-warning) 10%, transparent)",
        color: "var(--warning-foreground)",
        "& .MuiAlert-message": {
          width: "100%",
        },
      }}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Chip
            size="small"
            icon={<HardDriveDownload size={12} />}
            label="Saved Offline"
            variant="outlined"
            sx={{
              borderColor: "color-mix(in srgb, var(--color-warning) 40%, transparent)",
              bgcolor: "color-mix(in srgb, var(--color-warning) 14%, transparent)",
              color: "inherit",
              "& .MuiChip-icon": {
                color: "inherit",
              },
            }}
          />
          <Typography variant="body2" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
            This submission is stored on the device and queued for sync.
          </Typography>
        </div>
      </div>
    </Alert>
  )
}

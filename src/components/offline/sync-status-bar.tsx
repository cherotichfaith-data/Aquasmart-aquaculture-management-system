"use client"

import { useSyncExternalStore } from "react"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Typography from "@mui/material/Typography"
import { formatDistanceToNow } from "date-fns"
import { AlertTriangle, CheckCircle2, Loader2, WifiOff } from "lucide-react"
import { useSyncStore } from "@/lib/offline/sync-store"

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
    <Button size="small" variant="outlined" onClick={() => void manualSync?.()} sx={{ minHeight: 28, borderRadius: 999, px: 1.5, fontSize: "0.6875rem" }}>
      Sync now
    </Button>
  ) : null

  const barSx = {
    borderRadius: 0,
    borderTop: 0,
    borderLeft: 0,
    borderRight: 0,
    px: 2,
    py: 1,
    alignItems: "center",
    "& .MuiAlert-message": {
      width: "100%",
    },
  } as const

  if (syncError) {
    return (
      <Alert severity="error" icon={<AlertTriangle size={14} />} sx={barSx}>
        <Box sx={{ display: "flex", gap: 1, flexDirection: { xs: "column", sm: "row" }, alignItems: { sm: "center" }, justifyContent: "space-between" }}>
          <Typography variant="caption" sx={{ fontSize: "0.75rem" }}>
            {syncError}
          </Typography>
          {syncButton}
        </Box>
      </Alert>
    )
  }

  if (isSyncing) {
    return (
      <Alert severity="info" icon={<Loader2 size={14} className="animate-spin" />} sx={barSx}>
        <Typography variant="caption" sx={{ fontSize: "0.75rem" }}>
          Syncing to server...
        </Typography>
      </Alert>
    )
  }

  if (pendingCount > 0) {
    return (
      <Alert severity="warning" icon={<WifiOff size={14} />} sx={barSx}>
        <Box sx={{ display: "flex", gap: 1, flexDirection: { xs: "column", sm: "row" }, alignItems: { sm: "center" }, justifyContent: "space-between" }}>
          <Typography variant="caption" sx={{ fontSize: "0.75rem" }}>
            {pendingCount} record{pendingCount > 1 ? "s" : ""} pending upload and saved locally.
          </Typography>
          {syncButton}
        </Box>
      </Alert>
    )
  }

  if (lastSyncedAt) {
    return (
      <Alert
        severity="success"
        icon={<CheckCircle2 size={14} />}
        sx={{
          ...barSx,
          bgcolor: "color-mix(in srgb, var(--color-success) 8%, transparent)",
        }}
      >
        <Typography variant="caption" sx={{ fontSize: "0.75rem" }}>
          All synced {formatDistanceToNow(lastSyncedAt, { addSuffix: true })}
        </Typography>
      </Alert>
    )
  }

  return null
}

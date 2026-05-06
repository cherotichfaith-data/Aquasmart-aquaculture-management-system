"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Chip from "@mui/material/Chip"
import Typography from "@mui/material/Typography"
import { alpha } from "@mui/material/styles"
import { AlertTriangle, Inbox, RefreshCw } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export function DataFetchingBadge({
  isFetching,
  isLoading,
}: {
  isFetching: boolean
  isLoading?: boolean
}) {
  if (!isFetching || isLoading) return null

  return (
    <Chip
      size="small"
      icon={<RefreshCw size={12} className="animate-spin" />}
      label="Refreshing"
      sx={{
        borderRadius: 999,
        bgcolor: (theme) => alpha(theme.palette.background.paper, 0.12),
        px: 0.5,
        fontSize: "0.65625rem",
        fontWeight: 700,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "& .MuiChip-icon": {
          color: "inherit",
          ml: 0.75,
        },
      }}
    />
  )
}

export function DataUpdatedAt({ updatedAt }: { updatedAt?: number | null }) {
  const [label, setLabel] = useState<string | null>(null)
  const [ageMs, setAgeMs] = useState<number | null>(null)

  useEffect(() => {
    if (!updatedAt) {
      setLabel(null)
      setAgeMs(null)
      return
    }

    setLabel(formatDistanceToNow(updatedAt, { addSuffix: true }))
    setAgeMs(Date.now() - updatedAt)
  }, [updatedAt])

  if (!updatedAt || !label || ageMs == null) return null

  const ageMin = ageMs / 60_000
  const color =
    ageMin < 5 ? "text.secondary" : ageMin < 60 ? "warning.main" : "error.main"

  return (
    <Typography variant="caption" sx={{ fontSize: "0.6875rem", fontWeight: 500, letterSpacing: "0.02em", color }}>
      Updated {label}
    </Typography>
  )
}

export function DataErrorState({
  title = "Unable to load data",
  description = "Please check your connection or try again.",
  onRetry,
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <Alert
      severity="error"
      icon={<AlertTriangle size={16} />}
      sx={{
        alignItems: "flex-start",
        borderRadius: 3,
        border: (theme) => `1px solid ${alpha(theme.palette.error.main, 0.35)}`,
        bgcolor: (theme) => alpha(theme.palette.error.main, 0.06),
        "& .MuiAlert-message": {
          width: "100%",
        },
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography variant="caption" sx={{ display: "block", mt: 0.75, color: "#991b1b" }}>
        {description}
      </Typography>
      {onRetry ? (
        <Button
          type="button"
          variant="outlined"
          size="small"
          color="error"
          onClick={onRetry}
          sx={{ mt: 1.5, borderRadius: 2 }}
        >
          Try Again
        </Button>
      ) : null}
    </Alert>
  )
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
}: {
  title: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  action?: React.ReactNode
}) {
  return (
    <Box
      sx={{
        borderRadius: 3,
        border: (theme) => `1px dashed ${theme.palette.divider}`,
        bgcolor: (theme) => alpha(theme.palette.text.primary, 0.03),
        p: 3,
        textAlign: "center",
      }}
    >
      <Box
        sx={{
          mx: "auto",
          display: "flex",
          width: 48,
          height: 48,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 2.5,
          bgcolor: "action.hover",
        }}
      >
        <Icon className="h-5 w-5 text-muted-foreground" />
      </Box>
      <Typography variant="body2" sx={{ mt: 1.5, fontWeight: 700 }}>
        {title}
      </Typography>
      {description ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
          {description}
        </Typography>
      ) : null}
      {action ? <Box sx={{ mt: 2, display: "flex", justifyContent: "center" }}>{action}</Box> : null}
    </Box>
  )
}

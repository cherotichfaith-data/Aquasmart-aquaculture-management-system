"use client"

import type React from "react"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Typography from "@mui/material/Typography"
import { AlertTriangle, Inbox } from "lucide-react"

export function DataFetchingBadge({
  isFetching,
  isLoading,
}: {
  isFetching: boolean
  isLoading?: boolean
}) {
  void isFetching
  void isLoading
  return null
}

export function DataUpdatedAt({ updatedAt }: { updatedAt?: number | null }) {
  void updatedAt
  return null
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
        border: "1px solid color-mix(in srgb, var(--color-destructive) 35%, transparent)",
        bgcolor: "color-mix(in srgb, var(--color-destructive) 6%, transparent)",
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
          border: "1px dashed var(--color-border)",
          bgcolor: "color-mix(in srgb, var(--color-foreground) 3%, transparent)",
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

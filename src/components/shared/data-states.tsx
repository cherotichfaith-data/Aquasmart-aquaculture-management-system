"use client"

import type React from "react"
import { AlertTriangle, Inbox, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
    <Badge variant="secondary" className="gap-1 rounded-full bg-background/70 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] shadow-[0_12px_28px_-24px_rgba(15,23,32,0.3)] animate-pulse">
      <RefreshCw className="h-3 w-3 animate-spin" />
      Refreshing
    </Badge>
  )
}

export function DataUpdatedAt({ updatedAt }: { updatedAt?: number | null }) {
  if (!updatedAt) return null
  const label = formatDistanceToNow(updatedAt, { addSuffix: true })
  return <span className="text-[11px] font-medium tracking-[0.02em] text-muted-foreground">Updated {label}</span>
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
    <div className="rounded-[1.5rem] border border-destructive/40 bg-destructive/5 p-5 text-sm text-destructive shadow-sm">
      <div className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="h-4 w-4" />
        <span>{title}</span>
      </div>
      <p className="mt-2 text-xs text-destructive/90">{description}</p>
      {onRetry ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-3 border-destructive/40 text-destructive hover:bg-destructive/10"
        >
          Try Again
        </Button>
      ) : null}
    </div>
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
    <div className="rounded-[1.5rem] border border-dashed border-border bg-muted/20 p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
      {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}

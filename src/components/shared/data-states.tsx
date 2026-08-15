"use client"

import type React from "react"
import { AlertTriangle, Inbox } from "lucide-react"
import { Button } from "@/components/app-ui/button"
import { cn } from "@/lib/utils"

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
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-[color-mix(in_srgb,var(--color-destructive)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-destructive)_6%,transparent)] px-3.5 py-3"
    >
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-destructive" />
      <div className="w-full min-w-0">
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="mt-0.75 text-xs text-[color-mix(in_srgb,var(--color-destructive)_70%,black)]">{description}</p>
        {onRetry ? (
          <Button type="button" variant="outline" size="sm" onClick={onRetry} className="mt-1.5 rounded-lg border-destructive/40 text-destructive hover:bg-destructive/10">
            Try Again
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: {
  title: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border bg-[color-mix(in_srgb,var(--color-foreground)_3%,transparent)] p-6 text-center",
        className,
      )}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="mt-3 text-sm font-bold text-foreground">{title}</p>
      {description ? <p className="mt-1 block text-xs text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}

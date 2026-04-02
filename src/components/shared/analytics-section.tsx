"use client"

import type { ReactNode } from "react"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt } from "@/components/shared/data-states"

export function AnalyticsSection({
  errorTitle,
  errorMessage,
  onRetry,
  updatedAt,
  isFetching,
  isLoading,
  statusContent,
  children,
}: {
  errorTitle: string
  errorMessage?: string | null
  onRetry?: () => void
  updatedAt?: number | null
  isFetching?: boolean
  isLoading?: boolean
  statusContent?: ReactNode
  children: ReactNode
}) {
  if (errorMessage) {
    return (
      <DataErrorState
        title={errorTitle}
        description={errorMessage}
        onRetry={onRetry}
      />
    )
  }

  return (
    <div className="space-y-6">
      {statusContent ?? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <DataUpdatedAt updatedAt={updatedAt ?? 0} />
          <DataFetchingBadge isFetching={Boolean(isFetching)} isLoading={Boolean(isLoading)} />
        </div>
      )}
      {children}
    </div>
  )
}

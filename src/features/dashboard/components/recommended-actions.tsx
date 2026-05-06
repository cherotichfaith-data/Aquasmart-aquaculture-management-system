"use client"

import { useMemo } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowRight, ChevronRight, Info, SlidersHorizontal } from "lucide-react"
import type { Enums } from "@/lib/types/database"
import { useRecommendedActions } from "@/lib/hooks/use-dashboard"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt, EmptyState } from "@/components/shared/data-states"
import { getErrorMessage } from "@/lib/utils/query-result"
import type { TimePeriod } from "@/lib/time-period"

const priorityStyles = {
  High: "bg-destructive text-destructive-foreground",
  Medium: "bg-warning text-warning-foreground",
  Info: "bg-muted-foreground text-background",
}

const priorityIcons = {
  High: AlertTriangle,
  Medium: SlidersHorizontal,
  Info: Info,
}

export default function RecommendedActions({
  stage,
  batch,
  system,
  timePeriod,
  scopedSystemIds,
  dateFrom,
  dateTo,
  farmId: initialFarmId,
  maxItems = 2,
  showHeader = true,
}: {
  stage?: "all" | Enums<"system_growth_stage">
  batch?: string
  system?: string
  timePeriod?: TimePeriod
  scopedSystemIds?: number[] | null
  dateFrom?: string
  dateTo?: string
  farmId?: string | null
  maxItems?: number
  showHeader?: boolean
}) {
  const { farmId: activeFarmId } = useActiveFarm()
  const farmId = activeFarmId ?? initialFarmId
  const boundsReady = Boolean(dateFrom && dateTo)
  const actionsQuery = useRecommendedActions({
    farmId,
    stage: stage ?? "all",
    batch: batch ?? "all",
    system,
    timePeriod,
    scopedSystemIds,
    dateFrom: dateFrom ?? null,
    dateTo: dateTo ?? null,
  })

  const actions = useMemo(() => (actionsQuery.data ?? []).slice(0, maxItems), [actionsQuery.data, maxItems])
  const loading = actionsQuery.isLoading
  const errorMessage = getErrorMessage(actionsQuery.error)

  if (actionsQuery.isError) {
    return (
      <DataErrorState
        title="Unable to load recommended actions"
        description={errorMessage ?? "Please retry or check your connection."}
        onRetry={() => actionsQuery.refetch()}
      />
    )
  }

  if (!boundsReady || loading) {
    return (
      <div className="rounded-[1.2rem] border border-border/80 bg-card">
        {showHeader ? (
          <div className="flex items-center justify-between border-b border-border/80 px-5 py-4">
            <h2 className="text-[1.15rem] font-semibold text-primary">Recommended Actions</h2>
            <Link href="/dashboard/actions" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              <span>View All</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : null}
        <div className="space-y-3 p-4">
          {Array.from({ length: maxItems }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl border border-border/70 bg-muted/20 p-4 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-[1.2rem] border border-border/80 bg-card">
      {showHeader ? (
        <div className="flex items-center justify-between border-b border-border/80 px-5 py-4">
          <div>
            <h2 className="text-[1.15rem] font-semibold text-primary">Recommended Actions</h2>
            <DataUpdatedAt updatedAt={actionsQuery.dataUpdatedAt} />
          </div>
          <div className="flex items-center gap-3">
            <DataFetchingBadge isFetching={actionsQuery.isFetching} isLoading={actionsQuery.isLoading} />
            <Link href="/dashboard/actions" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              <span>View All</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : null}
      {actions.length === 0 ? (
        <div className="p-4">
          <EmptyState title="No recommended actions" description="All systems are within target ranges." />
        </div>
      ) : null}
      <div className="space-y-3 p-4">
        {actions.map((action) => {
          const Icon = priorityIcons[action.priority]
          return (
            <div
              key={action.title}
              className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/15 p-4 transition-colors hover:bg-muted/30"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white ${priorityStyles[action.priority]}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-primary">{action.title}</p>
                    <p className="mt-1 text-sm text-foreground">{action.description}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Due: {action.due}</p>
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-primary" />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

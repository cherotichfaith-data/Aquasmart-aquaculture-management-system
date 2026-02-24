"use client"

import { useMemo } from "react"
import type { Enums } from "@/lib/types/database"
import { useRecommendedActions } from "@/lib/hooks/use-dashboard"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt, EmptyState } from "@/components/shared/data-states"
import { getErrorMessage } from "@/lib/utils/query-result"

const priorityStyles = {
  High: "bg-destructive/15 text-destructive",
  Medium: "bg-chart-4/15 text-chart-4",
  Info: "bg-chart-2/15 text-chart-2",
}

export default function RecommendedActions({
  stage,
  batch,
  system,
  timePeriod,
}: {
  stage?: "all" | Enums<"system_growth_stage">
  batch?: string
  system?: string
  timePeriod?: Enums<"time_period">
}) {
  const { farmId } = useActiveFarm()
  const actionsQuery = useRecommendedActions({
    farmId,
    stage: stage ?? "all",
    batch: batch ?? "all",
    system,
    timePeriod,
  })

  const actions = useMemo(() => actionsQuery.data ?? [], [actionsQuery.data])
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

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array(3)
          .fill(0)
          .map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-4 h-40 animate-pulse" />
          ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <DataUpdatedAt updatedAt={actionsQuery.dataUpdatedAt} />
        <DataFetchingBadge isFetching={actionsQuery.isFetching} isLoading={actionsQuery.isLoading} />
      </div>
      {actions.length === 0 ? (
        <EmptyState title="No recommended actions" description="All systems are within target ranges." />
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {actions.map((action) => (
        <div key={action.title} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="h-2 bg-sidebar-primary" />
          <div className="p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-sm">{action.title}</h3>
              <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${priorityStyles[action.priority]}`}>
                {action.priority} Priority
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-3">{action.description}</p>
            <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
              <span>Due: {action.due}</span>
              <button className="cursor-pointer text-primary font-semibold hover:underline">Schedule</button>
            </div>
          </div>
        </div>
      ))}
      </div>
    </div>
  )
}

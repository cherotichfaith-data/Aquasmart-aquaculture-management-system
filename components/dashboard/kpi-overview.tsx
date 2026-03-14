"use client"

import KPICard from "./kpi-card"
import type { DashboardPageInitialData } from "@/features/dashboard/types"
import type { Enums } from "@/lib/types/database"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { useKpiOverview } from "@/lib/hooks/use-dashboard"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt, EmptyState } from "@/components/shared/data-states"
import { getErrorMessage } from "@/lib/utils/query-result"

const kpiHrefMap: Record<string, string> = {
  efcr: "/feed",
  mortality: "/mortality",
  abw: "/sampling",
  biomass: "/sampling",
  biomass_density: "/sampling",
  feeding: "/feed",
}

interface KPIOverviewProps {
  stage: "all" | Enums<"system_growth_stage">
  timePeriod?: Enums<"time_period">
  batch?: string
  system?: string
  periodParam?: string | null
  dateFrom?: string
  dateTo?: string
  farmId?: string | null
  initialData?: DashboardPageInitialData["kpiOverview"]
}

export default function KPIOverview({
  stage,
  timePeriod = "2 weeks",
  batch = "all",
  system = "all",
  periodParam,
  dateFrom,
  dateTo,
  farmId: initialFarmId,
  initialData,
}: KPIOverviewProps) {
  const { farmId: activeFarmId } = useActiveFarm()
  const farmId = initialFarmId ?? activeFarmId
  const metricsQuery = useKpiOverview({
    farmId,
    stage,
    timePeriod,
    batch,
    system,
    periodParam,
    dateFrom: dateFrom ?? null,
    dateTo: dateTo ?? null,
    initialData,
  })

  const metrics = metricsQuery.data?.metrics ?? []
  const errorMessage = getErrorMessage(metricsQuery.error)

  if (metricsQuery.isError) {
    return (
      <DataErrorState
        title="Unable to load KPI overview"
        description={errorMessage ?? "Please retry or check your connection."}
        onRetry={() => metricsQuery.refetch()}
      />
    )
  }

  if (metricsQuery.isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array(4)
          .fill(0)
          .map((_, i) => (
            <div key={i} className="bg-muted/30 rounded-2xl p-4 h-28 animate-pulse"></div>
          ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <DataUpdatedAt updatedAt={metricsQuery.dataUpdatedAt} />
        <DataFetchingBadge isFetching={metricsQuery.isFetching} isLoading={metricsQuery.isLoading} />
      </div>
      {!metrics.length ? (
        <EmptyState
          title="No KPI data available"
          description="Try a different period or confirm data entry is up to date."
        />
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const href = kpiHrefMap[metric.key] ?? "/reports"
          return (
            <KPICard
              key={metric.key}
              title={metric.label}
              average={metric.value}
              trend={metric.trend}
              decimals={metric.decimals}
              formatUnit={metric.unit}
              invertTrend={metric.invertTrend}
              href={href}
            />
          )
        })}
      </div>
    </div>
  )
}

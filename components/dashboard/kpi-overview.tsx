"use client"

import KPICard from "./kpi-card"
import type { DashboardPageInitialData } from "@/features/dashboard/types"
import type { Enums } from "@/lib/types/database"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { useKpiOverview } from "@/lib/hooks/use-dashboard"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt, EmptyState } from "@/components/shared/data-states"
import { getErrorMessage } from "@/lib/utils/query-result"
import type { TimePeriod } from "@/lib/time-period"

const kpiProductionFilterMap: Record<string, string | null> = {
  efcr: "efcr_periodic",
  mortality: "mortality",
  abw: "abw",
  biomass: null,
  biomass_density: "density",
  feeding: "feeding",
}

interface KPIOverviewProps {
  stage: "all" | Enums<"system_growth_stage">
  timePeriod?: TimePeriod
  batch?: string
  system?: string
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
    dateFrom: dateFrom ?? null,
    dateTo: dateTo ?? null,
    initialData,
  })

  const metrics = metricsQuery.data?.metrics ?? []
  const errorMessage = getErrorMessage(metricsQuery.error)
  const buildProductionHref = (metricKey: string) => {
    const params = new URLSearchParams()
    if (system !== "all") params.set("system", system)
    if (stage !== "all") params.set("stage", stage)
    if (batch !== "all") params.set("batch", batch)
    params.set("period", timePeriod)

    const mappedFilter = kpiProductionFilterMap[metricKey]
    if (mappedFilter) params.set("filter", mappedFilter)

    return `/production?${params.toString()}`
  }

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
          const href = buildProductionHref(metric.key)
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

"use client"

import KPICard from "./kpi-card"
import type { Enums } from "@/lib/types/database"
import { DataErrorState, DataFetchingBadge, EmptyState } from "@/components/shared/data-states"
import { toTimePeriodUrlValue, type TimePeriod } from "@/lib/time-period"
import { toDashboardPath } from "@/lib/app-entry"
import type { KPIOverviewMetric } from "../types"

const kpiProductionFilterMap: Record<string, string | null> = {
  efcr: "efcr",
  mortality: "mortality",
  abw: "abw",
  sgr: "sgr",
  agr: null,
  biomass: "biomass",
  biomass_density: "density",
  feeding: "feeding",
}

interface KPIOverviewProps {
  metrics: KPIOverviewMetric[]
  isLoading: boolean
  isFetching: boolean
  isError?: boolean
  errorMessage?: string | null
  onRetry?: () => void
  stage: "all" | Enums<"system_growth_stage">
  timePeriod?: TimePeriod
  batch?: string
  system?: string
}

export default function KPIOverview({
  metrics,
  isLoading,
  isFetching,
  isError = false,
  errorMessage,
  onRetry,
  stage,
  timePeriod = "month",
  batch = "all",
  system = "all",
}: KPIOverviewProps) {
  const buildProductionHref = (metricKey: string) => {
    const params = new URLSearchParams()
    if (system !== "all") params.set("system", system)
    if (stage !== "all") params.set("stage", stage)
    if (batch !== "all") params.set("batch", batch)
    params.set("date", toTimePeriodUrlValue(timePeriod))

    const mappedFilter = kpiProductionFilterMap[metricKey]
    if (mappedFilter) params.set("filter", mappedFilter)

    return `${toDashboardPath("/production")}?${params.toString()}`
  }

  if (isError) {
    return (
      <DataErrorState
        title="Unable to load KPI overview"
        description={errorMessage ?? "Please retry or check your connection."}
        onRetry={onRetry}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted/50" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span />
        <DataFetchingBadge isFetching={isFetching} isLoading={isLoading} />
      </div>
      {!metrics.length ? (
        <EmptyState
          title="No KPI data available"
          description="Try a different period or confirm data entry is up to date."
        />
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const href = buildProductionHref(metric.key)
          return (
            <div key={metric.key}>
              <KPICard
                title={metric.label}
                average={metric.value}
                trend={metric.trend}
                decimals={metric.decimals}
                formatUnit={metric.unit}
                trendFormat={metric.trendFormat}
                trendDecimals={metric.trendDecimals}
                trendUnit={metric.trendUnit}
                invertTrend={metric.invertTrend}
                href={href}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

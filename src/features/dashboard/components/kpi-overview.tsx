"use client"

import KPICard from "./kpi-card"
import Grid from "@mui/material/Grid"
import Box from "@mui/material/Box"
import Skeleton from "@mui/material/Skeleton"
import type { Enums } from "@/lib/types/database"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useKpiOverview } from "@/lib/hooks/use-dashboard"
import { DataErrorState, DataFetchingBadge, EmptyState } from "@/components/shared/data-states"
import { getErrorMessage } from "@/lib/utils/query-result"
import { toTimePeriodUrlValue, type TimePeriod } from "@/lib/time-period"
import { toDashboardPath } from "@/lib/app-entry"
import type { KPIOverviewMetric } from "../types"

const kpiProductionFilterMap: Record<string, string | null> = {
  efcr: "efcr_periodic",
  mortality: "mortality",
  abw: "abw",
  sgr: "sgr",
  agr: null,
  biomass: null,
  biomass_density: "density",
  feeding: "feeding",
}

interface KPIOverviewProps {
  stage: "all" | Enums<"system_growth_stage">
  timePeriod?: TimePeriod
  batch?: string
  system?: string
  scopedSystemIds?: number[] | null
  dateFrom?: string
  dateTo?: string
  farmId?: string | null
}

export default function KPIOverview({
  stage,
  timePeriod = "month",
  batch = "all",
  system = "all",
  scopedSystemIds,
  dateFrom,
  dateTo,
  farmId: initialFarmId,
}: KPIOverviewProps) {
  const { farmId: activeFarmId } = useActiveFarm()
  const farmId = initialFarmId ?? activeFarmId
  const metricsQuery = useKpiOverview({
    farmId,
    stage,
    timePeriod,
    batch,
    system,
    scopedSystemIds,
    dateFrom: dateFrom ?? null,
    dateTo: dateTo ?? null,
  })

  const metrics: KPIOverviewMetric[] = metricsQuery.data?.metrics ?? []
  const errorMessage = getErrorMessage(metricsQuery.error)
  const waitingForBounds = !dateFrom || !dateTo
  const buildProductionHref = (metricKey: string) => {
    const params = new URLSearchParams()
    if (system !== "all") params.set("system", system)
    if (stage !== "all") params.set("stage", stage)
    if (batch !== "all") params.set("batch", batch)
    params.set("period", toTimePeriodUrlValue(timePeriod))

    const mappedFilter = kpiProductionFilterMap[metricKey]
    if (mappedFilter) params.set("filter", mappedFilter)

    return `${toDashboardPath("/production")}?${params.toString()}`
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

  if (waitingForBounds || metricsQuery.isLoading) {
    return (
      <Grid container spacing={2}>
        {Array(4).fill(0).map((_, i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, lg: 3 }}>
            <Skeleton variant="rounded" height={112} sx={{ borderRadius: 2 }} />
          </Grid>
        ))}
      </Grid>
    )
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span />
        <DataFetchingBadge isFetching={metricsQuery.isFetching} isLoading={metricsQuery.isLoading} />
      </Box>
      {!metrics.length ? (
        <EmptyState
          title="No KPI data available"
          description="Try a different period or confirm data entry is up to date."
        />
      ) : null}
      <Grid container spacing={2}>
        {metrics.map((metric) => {
          const href = buildProductionHref(metric.key)
          return (
            <Grid key={metric.key} size={{ xs: 12, sm: 6, lg: 3 }}>
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
            </Grid>
          )
        })}
      </Grid>
    </Box>
  )
}

"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { DataErrorState } from "@/components/shared/data-states"
import { useAnalyticsPageBootstrap } from "@/lib/hooks/app/use-analytics-page-bootstrap"
import { useScopedSystemIds } from "@/lib/hooks/use-scoped-system-ids"
import { useSystemOptions } from "@/lib/hooks/use-options"
import { useSamplingData, useScopedGrowthTrend } from "@/lib/hooks/use-reports"
import { useHarvestForecast } from "@/lib/hooks/use-analytics"
import { getErrorMessage, getQueryResultError } from "@/lib/utils/query-result"
import { normalizeStageFilter } from "@/lib/stage-filter"
import { getSystemFilterUrlValue, resolveSystemIdFromFilterValue } from "@/lib/system-options"
import { resolveTimePeriod, toTimePeriodUrlValue } from "@/lib/time-period"
import type { SharedFiltersState } from "@/lib/hooks/app/use-shared-filters"
import {
  SamplingGrowthDashboard,
  type BackendGrowthPoint,
  type SamplingPoint,
} from "./_components/sampling-growth-dashboard"

export default function SamplingPage({
  initialFarmId,
  initialFarmName,
  initialFilters,
}: {
  initialFarmId?: string | null
  initialFarmName?: string | null
  initialFilters?: Partial<SharedFiltersState>
}) {
  const searchParams = useSearchParams()
  const periodParam = searchParams.get("period")
  const systemParam = searchParams.get("cage") ?? searchParams.get("system")
  const batchParam = searchParams.get("batch")
  const stageParam = searchParams.get("stage")
  const filterSystemsQuery = useSystemOptions({ farmId: initialFarmId, activeOnly: true })
  const filterSystemOptions = filterSystemsQuery.data?.status === "success" ? filterSystemsQuery.data.data : []
  const selectedSystemUrlValue = useMemo(() => {
    const systemId = resolveSystemIdFromFilterValue(systemParam, filterSystemOptions)
    if (systemId == null) return systemParam ?? undefined
    return getSystemFilterUrlValue(filterSystemOptions.find((system) => system.id === systemId)) || (systemParam ?? undefined)
  }, [filterSystemOptions, systemParam])
  const filterOverrides = useMemo(() => {
    const selectedSystemId = resolveSystemIdFromFilterValue(systemParam ?? "all", filterSystemOptions)
    return {
      selectedBatch: batchParam ?? "all",
      selectedSystem: selectedSystemId != null ? String(selectedSystemId) : systemParam ?? "all",
      selectedStage: normalizeStageFilter(stageParam),
      timePeriod: resolveTimePeriod(periodParam, initialFilters?.timePeriod ?? "quarter"),
    }
  }, [batchParam, filterSystemOptions, initialFilters?.timePeriod, periodParam, stageParam, systemParam])
  const filterUrlValues = useMemo(() => {
    const timePeriodValue = toTimePeriodUrlValue(filterOverrides.timePeriod)
    if (selectedSystemUrlValue && selectedSystemUrlValue !== "all") {
      return { selectedSystem: selectedSystemUrlValue, timePeriod: timePeriodValue }
    }
    return { timePeriod: timePeriodValue }
  }, [filterOverrides.timePeriod, selectedSystemUrlValue])

  const {
    farmId,
    selectedBatch,
    selectedSystem,
    selectedStage,
    dateFrom,
    dateTo,
    boundsReady,
  } = useAnalyticsPageBootstrap({
    initialFarmId,
    initialFarmName,
    defaultTimePeriod: "quarter",
    initialFilters,
    boundsScope: "production",
    filterOverrides,
    filterUrlValues,
  })

  const {
    selectedSystemId: systemId,
    hasSystem,
    batchId,
    scopedSystemIdList,
    scopedSystemIds,
    systemsQuery,
    batchSystemsQuery,
  } = useScopedSystemIds({
    farmId,
    selectedStage,
    selectedBatch,
    selectedSystem,
  })

  const samplingEnabled = boundsReady && (hasSystem || scopedSystemIdList.length > 0)
  const samplingQuery = useSamplingData({
    systemId: hasSystem ? (systemId as number) : undefined,
    systemIds: !hasSystem ? scopedSystemIdList : undefined,
    batchId: Number.isFinite(batchId) ? batchId : undefined,
    dateFrom,
    dateTo,
    limit: 2000,
    enabled: samplingEnabled,
  })
  const growthTrendQuery = useScopedGrowthTrend({
    farmId,
    systemIds: scopedSystemIdList,
    dateFrom,
    dateTo,
    enabled: samplingEnabled,
  })
  const harvestReadinessQuery = useHarvestForecast({
    farmId,
    systemId: hasSystem ? (systemId as number) : undefined,
  })

  const systemNameById = useMemo(() => {
    const map = new Map<number, string>()
    if (systemsQuery.data?.status === "success") {
      systemsQuery.data.data.forEach((row) => {
        if (row.id == null) return
        map.set(row.id, row.label ?? `System ${row.id}`)
      })
    }
    return map
  }, [systemsQuery.data])

  const samplingRows = samplingQuery.data?.status === "success" ? samplingQuery.data.data : []
  const scopedSamplingRows = useMemo(
    () => samplingRows.filter((row) => row.system_id != null && scopedSystemIds.has(row.system_id)),
    [samplingRows, scopedSystemIds],
  )
  const samplingPoints = useMemo<SamplingPoint[]>(
    () =>
      scopedSamplingRows
        .filter((row) => typeof row.abw === "number" && Number.isFinite(row.abw) && Boolean(row.date))
        .map((row) => ({
          systemId: row.system_id,
          systemLabel: systemNameById.get(row.system_id) ?? `System ${row.system_id}`,
          date: row.date,
          abw: row.abw,
          fishSampled: row.number_of_fish_sampling ?? null,
          totalWeight: row.total_weight_sampling ?? null,
        }))
        .sort((left, right) =>
          left.systemId === right.systemId
            ? left.date.localeCompare(right.date)
            : left.systemId - right.systemId,
        ),
    [scopedSamplingRows, systemNameById],
  )
  const latestSample = useMemo(
    () => samplingPoints.slice().sort((left, right) => right.date.localeCompare(left.date))[0] ?? null,
    [samplingPoints],
  )

  const growthRowsRaw = growthTrendQuery.data?.status === "success" ? growthTrendQuery.data.data : []
  const growthPoints = useMemo<BackendGrowthPoint[]>(
    () =>
      growthRowsRaw
        .filter((row) => row.system_id != null && scopedSystemIds.has(row.system_id))
        .map((row) => {
          const benchmark = row as typeof row & {
            age_days?: number | null
            expected_abw_g?: number | null
            growth_deviation_pct?: number | null
          }
          return {
            systemId: row.system_id,
            systemLabel: systemNameById.get(row.system_id) ?? `System ${row.system_id}`,
            sampleDate: row.sample_date,
            abwG: row.abw_g,
            adgGDay: row.adg_g_day,
            sgrPctDay: row.sgr_pct_day,
            ageDays: benchmark.age_days ?? null,
            expectedAbwG: benchmark.expected_abw_g ?? null,
            growthDeviationPct: benchmark.growth_deviation_pct ?? null,
          }
        })
        .sort((left, right) =>
          left.systemId === right.systemId
            ? left.sampleDate.localeCompare(right.sampleDate)
            : left.systemId - right.systemId,
        ),
    [growthRowsRaw, scopedSystemIds, systemNameById],
  )

  const errorMessages = [
    getErrorMessage(samplingQuery.error),
    getQueryResultError(samplingQuery.data),
    getErrorMessage(growthTrendQuery.error),
    getQueryResultError(growthTrendQuery.data),
    getErrorMessage(harvestReadinessQuery.error),
    getQueryResultError(harvestReadinessQuery.data),
    getErrorMessage(systemsQuery.error),
    getQueryResultError(systemsQuery.data),
    getErrorMessage(batchSystemsQuery.error),
    getQueryResultError(batchSystemsQuery.data),
  ].filter(Boolean) as string[]
  const harvestReadinessRows =
    harvestReadinessQuery.data?.status === "success" ? harvestReadinessQuery.data.data : []
  const loading =
    samplingQuery.isLoading ||
    growthTrendQuery.isLoading ||
    harvestReadinessQuery.isLoading ||
    systemsQuery.isLoading ||
    batchSystemsQuery.isLoading

  return (
    <DashboardLayout initialFarmId={initialFarmId} initialFarmName={initialFarmName}>
      <div className="space-y-6">
        {errorMessages.length > 0 ? (
          <DataErrorState
            title="Unable to load sampling data"
            description={errorMessages[0]}
            onRetry={() => {
              samplingQuery.refetch()
              growthTrendQuery.refetch()
              harvestReadinessQuery.refetch()
              systemsQuery.refetch()
              batchSystemsQuery.refetch()
            }}
          />
        ) : null}
        <SamplingGrowthDashboard
          sampleCount={scopedSamplingRows.length}
          latestAbw={latestSample?.abw ?? null}
          latestSampleSize={latestSample?.fishSampled ?? null}
          loading={loading}
          samplingPoints={samplingPoints}
          growthPoints={growthPoints}
          harvestReadinessRows={harvestReadinessRows}
        />
      </div>
    </DashboardLayout>
  )
}

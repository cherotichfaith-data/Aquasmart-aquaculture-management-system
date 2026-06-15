"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { useAnalyticsPageBootstrap } from "@/lib/hooks/app/use-analytics-page-bootstrap"
import { useScopedSystemIds } from "@/lib/hooks/use-scoped-system-ids"
import { useSystemOptions } from "@/lib/hooks/use-options"
import {
  useFeedingRecords,
  useMortalityData,
  useScopedEfcrTrend,
} from "@/lib/hooks/use-reports"
import { useProductionSummary } from "@/lib/hooks/use-production"
import { useFeedRateAnalysis } from "@/lib/hooks/use-analytics"
import { getErrorMessage, getQueryResultError } from "@/lib/utils/query-result"
import type { FeedPageInitialFilters } from "@/features/feed/types"
import { normalizeStageFilter } from "@/lib/stage-filter"
import { getSystemFilterUrlValue, resolveSystemIdFromFilterValue } from "@/lib/system-options"
import { resolveTimePeriod, toTimePeriodUrlValue } from "@/lib/time-period"
import {
  buildFeedRatePointsFromAnalysis,
  type EfcrTrendPoint,
} from "./_lib/feed-analytics"
import { FeedDashboard } from "./_components/feed-dashboard"

export default function FeedManagementPage({
  initialFarmId,
  initialFarmName,
  initialFilters,
}: {
  initialFarmId: string | null
  initialFarmName?: string | null
  initialFilters: FeedPageInitialFilters
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
      timePeriod: resolveTimePeriod(periodParam, initialFilters.timePeriod),
    }
  }, [batchParam, filterSystemOptions, initialFilters.timePeriod, periodParam, stageParam, systemParam])
  const filterUrlValues = useMemo(() => {
    const timePeriodValue = toTimePeriodUrlValue(filterOverrides.timePeriod)
    if (selectedSystemUrlValue && selectedSystemUrlValue !== "all") {
      return {
        selectedSystem: selectedSystemUrlValue,
        timePeriod: timePeriodValue,
      }
    }
    return { timePeriod: timePeriodValue }
  }, [filterOverrides.timePeriod, selectedSystemUrlValue])
  const {
    farmId,
    selectedBatch,
    selectedSystem,
    selectedStage,
    timePeriod,
    dateFrom: boundsStart,
    dateTo: boundsEnd,
    boundsReady,
  } = useAnalyticsPageBootstrap({
    initialFarmId,
    initialFarmName,
    defaultTimePeriod: "quarter",
    boundsScope: "feeding",
    initialFilters,
    filterOverrides,
    filterUrlValues,
  })

  const selectedFeedType = "all"

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

  const dateFrom = boundsStart
  const dateTo = boundsEnd
  const feedingEnabled = (hasSystem || scopedSystemIdList.length > 0) && boundsReady

  const feedingRecordsQuery = useFeedingRecords({
    farmId,
    systemId: hasSystem ? (systemId as number) : undefined,
    systemIds: !hasSystem ? scopedSystemIdList : undefined,
    batchId: Number.isFinite(batchId) ? (batchId as number) : undefined,
    dateFrom,
    dateTo,
    enabled: feedingEnabled,
  })
  const efcrTrendQuery = useScopedEfcrTrend({
    farmId,
    systemIds: scopedSystemIdList,
    dateFrom,
    dateTo,
    enabled: feedingEnabled,
  })

  const feedRateScopeIds = useMemo(() => {
    if (hasSystem) return systemId != null ? [systemId as number] : []
    if (selectedStage === "all" && selectedBatch === "all" && selectedSystem === "all") return null
    return scopedSystemIdList
  }, [hasSystem, scopedSystemIdList, selectedBatch, selectedStage, selectedSystem, systemId])

  const feedRateAnalysisQuery = useFeedRateAnalysis({
    farmId,
    systemIds: feedRateScopeIds,
    dateFrom,
    dateTo,
    enabled: feedingEnabled,
  })
  const productionSummaryQuery = useProductionSummary({
    farmId,
    systemId: hasSystem ? (systemId as number) : undefined,
    stage: selectedStage !== "all" ? selectedStage : undefined,
    dateFrom,
    dateTo,
    limit: 5000,
    enabled: feedingEnabled,
  })
  const mortalityQuery = useMortalityData({
    systemId: hasSystem ? (systemId as number) : undefined,
    systemIds: !hasSystem ? scopedSystemIdList : undefined,
    batchId: Number.isFinite(batchId) ? (batchId as number) : undefined,
    dateFrom,
    dateTo,
    limit: 5000,
    enabled: feedingEnabled,
  })

  const systems = systemsQuery.data?.status === "success" ? systemsQuery.data.data : []
  const systemNameById = useMemo(() => {
    const map = new Map<number, string>()
    systems.forEach((row) => {
      if (row.id == null) return
      map.set(row.id, row.label ?? `System ${row.id}`)
    })
    return map
  }, [systems])

  const feedingRecordsRaw = feedingRecordsQuery.data?.status === "success" ? feedingRecordsQuery.data.data : []
  const efcrTrendRowsRaw = efcrTrendQuery.data?.status === "success" ? efcrTrendQuery.data.data : []
  const feedRateAnalysisRowsRaw = feedRateAnalysisQuery.data?.status === "success" ? feedRateAnalysisQuery.data.data : []
  const productionRowsRaw = productionSummaryQuery.data?.status === "success" ? productionSummaryQuery.data.data : []
  const mortalityRowsRaw = mortalityQuery.data?.status === "success" ? mortalityQuery.data.data : []

  const feedingRecords = useMemo(() => {
    return feedingRecordsRaw
      .filter((row) => row.system_id != null && scopedSystemIds.has(row.system_id))
      .filter((row) => {
        if (selectedFeedType === "all") return true
        return String(row.feed_type_id ?? "") === selectedFeedType
      })
  }, [feedingRecordsRaw, scopedSystemIds, selectedFeedType])

  const feedRateAnalysisRows = useMemo(
    () => feedRateAnalysisRowsRaw.filter((row) => scopedSystemIds.has(row.system_id)),
    [feedRateAnalysisRowsRaw, scopedSystemIds],
  )

  const feedRatePoints = useMemo(
    () => buildFeedRatePointsFromAnalysis(feedRateAnalysisRows),
    [feedRateAnalysisRows],
  )

  const efcrTrendPoints = useMemo<EfcrTrendPoint[]>(
    () =>
      efcrTrendRowsRaw
        .filter((row) => row.system_id != null && scopedSystemIds.has(row.system_id))
        .map((row) => ({
          systemId: row.system_id,
          date: row.inventory_date,
          efcr: row.efcr_period,
        }))
        .sort((a, b) => (a.systemId === b.systemId ? a.date.localeCompare(b.date) : a.systemId - b.systemId)),
    [efcrTrendRowsRaw, scopedSystemIds],
  )
  const productionRows = useMemo(
    () => productionRowsRaw.filter((row) => scopedSystemIds.has(row.system_id)),
    [productionRowsRaw, scopedSystemIds],
  )
  const mortalityRows = useMemo(
    () => mortalityRowsRaw.filter((row) => row.system_id != null && scopedSystemIds.has(row.system_id)),
    [mortalityRowsRaw, scopedSystemIds],
  )

  const errorMessages = [
    getErrorMessage(feedingRecordsQuery.error),
    getQueryResultError(feedingRecordsQuery.data),
    getErrorMessage(efcrTrendQuery.error),
    getQueryResultError(efcrTrendQuery.data),
    getErrorMessage(feedRateAnalysisQuery.error),
    getQueryResultError(feedRateAnalysisQuery.data),
    getErrorMessage(productionSummaryQuery.error),
    getQueryResultError(productionSummaryQuery.data),
    getErrorMessage(mortalityQuery.error),
    getQueryResultError(mortalityQuery.data),
    getErrorMessage(systemsQuery.error),
    getQueryResultError(systemsQuery.data),
    getErrorMessage(batchSystemsQuery.error),
    getQueryResultError(batchSystemsQuery.data),
  ].filter(Boolean) as string[]

  const loading =
    feedingRecordsQuery.isLoading ||
    efcrTrendQuery.isLoading ||
    feedRateAnalysisQuery.isLoading ||
    productionSummaryQuery.isLoading ||
    mortalityQuery.isLoading

  return (
    <DashboardLayout initialFarmId={initialFarmId} initialFarmName={initialFarmName}>
      <div className="space-y-6">
        <FeedDashboard
          timePeriod={timePeriod}
          errorMessage={errorMessages[0] ?? null}
          onRetry={() => {
            feedingRecordsQuery.refetch()
            efcrTrendQuery.refetch()
            feedRateAnalysisQuery.refetch()
            productionSummaryQuery.refetch()
            mortalityQuery.refetch()
            systemsQuery.refetch()
            batchSystemsQuery.refetch()
          }}
          loading={loading}
          systemNameById={systemNameById}
          feedingRecords={feedingRecords}
          feedRatePoints={feedRatePoints}
          efcrTrendPoints={efcrTrendPoints}
          productionRows={productionRows}
          mortalityRows={mortalityRows}
        />
      </div>
    </DashboardLayout>
  )
}

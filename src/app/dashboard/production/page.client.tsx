"use client"

import { Suspense, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { parseProductionMetric } from "@/components/production/metrics"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { useProductionPeriodView, useProductionSummaryMetrics } from "@/features/production/hooks"
import { useBatchSystemIds } from "@/features/reports/hooks"
import { useAnalyticsPageBootstrap } from "@/lib/hooks/app/use-analytics-page-bootstrap"
import { useSystemOptions } from "@/lib/hooks/use-options"
import { getErrorMessage, getQueryResultError } from "@/lib/utils/query-result"
import type { SystemOption } from "@/lib/system-options"
import { ProductionSections } from "./_components/production-sections"
import {
  buildProductionEfcrRows,
  buildProductionMetricRows,
} from "./_lib/production-page"
import type { SharedFiltersState } from "@/lib/hooks/app/use-shared-filters"

const LIVE_PRODUCTION_STALE_TIME_MS = 0

function ProductionContent({
  initialFarmId,
  initialFarmName,
  initialFilters,
}: {
  initialFarmId?: string | null
  initialFarmName?: string | null
  initialFilters?: Partial<SharedFiltersState>
}) {
  const searchParams = useSearchParams()
  const {
    farmId,
    selectedBatch,
    selectedSystem,
    selectedStage,
    timePeriod,
    dateFrom,
    dateTo,
    boundsReady: hasBounds,
  } = useAnalyticsPageBootstrap({
    initialFarmId,
    initialFarmName,
    initialFilters,
    boundsScope: "production",
  })
  const metricFilter = parseProductionMetric(searchParams.get("filter"))
  const systemId = selectedSystem !== "all" ? Number(selectedSystem) : undefined
  const batchId = selectedBatch !== "all" ? Number(selectedBatch) : undefined

  const dateRange = useMemo(() => {
    return { startDate: hasBounds ? (dateFrom ?? "") : "", endDate: hasBounds ? (dateTo ?? "") : "" }
  }, [dateFrom, dateTo, hasBounds])

  const systemOptionsQuery = useSystemOptions({
    farmId,
    stage: selectedStage,
    activeOnly: false,
  })
  const systemOptions: SystemOption[] =
    systemOptionsQuery.data?.status === "success" ? systemOptionsQuery.data.data : []
  const batchSystemIdsQuery = useBatchSystemIds({
    batchId: Number.isFinite(batchId) ? batchId : undefined,
  })
  const stageSystemIds = useMemo(() => {
    if (selectedStage === "all") return null
    if (systemOptionsQuery.data?.status !== "success") return null
    const ids = systemOptionsQuery.data.data
      .map((row) => row.id)
      .filter((id): id is number => typeof id === "number")
    return ids
  }, [selectedStage, systemOptionsQuery.data])

  const batchSystemIds = useMemo(() => {
    if (selectedBatch === "all") return null
    if (batchSystemIdsQuery.data?.status !== "success") return null
    const ids = batchSystemIdsQuery.data.data
      .map((row) => row.system_id)
      .filter((id): id is number => typeof id === "number")
    return ids
  }, [batchSystemIdsQuery.data, selectedBatch])

  const isConsolidatedView = selectedSystem === "all"
  const scopedSystemIds = useMemo(() => {
    if (selectedSystem !== "all") return null
    if (!stageSystemIds && !batchSystemIds) return null
    const stageSet = stageSystemIds ? new Set(stageSystemIds) : null
    if (batchSystemIds) {
      if (!stageSet) return new Set(batchSystemIds)
      return new Set(batchSystemIds.filter((id) => stageSet.has(id)))
    }
    return stageSet
  }, [batchSystemIds, selectedSystem, stageSystemIds])

  const activeSystemIds = useMemo(() => {
    if (systemOptionsQuery.data?.status !== "success") return null
    return new Set(
      systemOptionsQuery.data.data
        .map((row) => row.id)
        .filter((id): id is number => typeof id === "number"),
    )
  }, [systemOptionsQuery.data])
  const includedSystemIds = useMemo(() => {
    if (selectedSystem !== "all" && Number.isFinite(systemId)) {
      if (activeSystemIds && !activeSystemIds.has(systemId as number)) return new Set<number>()
      return new Set([systemId as number])
    }
    if (scopedSystemIds) return scopedSystemIds
    return activeSystemIds
  }, [activeSystemIds, scopedSystemIds, selectedSystem, systemId])
  const includedSystemIdList = useMemo(
    () => (includedSystemIds ? Array.from(includedSystemIds).sort((left, right) => left - right) : undefined),
    [includedSystemIds],
  )
  const summaryScopeReady =
    hasBounds &&
    systemOptionsQuery.data?.status === "success" &&
    (selectedBatch === "all" || batchSystemIdsQuery.data?.status === "success")
  const productionPeriodViewQuery = useProductionPeriodView({
    farmId,
    systemId: Number.isFinite(systemId) ? systemId : undefined,
    systemIds: includedSystemIdList,
    stage: selectedStage !== "all" ? selectedStage : undefined,
    batch: selectedBatch,
    system: selectedSystem,
    timePeriod,
    dateFrom: dateRange.startDate || undefined,
    dateTo: dateRange.endDate || undefined,
    consolidate: isConsolidatedView,
    enabled: summaryScopeReady,
    staleTime: LIVE_PRODUCTION_STALE_TIME_MS,
  })
  const productionSummaryMetricsQuery = useProductionSummaryMetrics({
    farmId,
    systemId: Number.isFinite(systemId) ? systemId : undefined,
    systemIds: includedSystemIdList,
    stage: selectedStage !== "all" ? selectedStage : undefined,
    batch: selectedBatch,
    system: selectedSystem,
    timePeriod,
    dateFrom: dateRange.startDate || undefined,
    dateTo: dateRange.endDate || undefined,
    enabled: summaryScopeReady,
    staleTime: LIVE_PRODUCTION_STALE_TIME_MS,
  })
  const chartSourceRows = productionPeriodViewQuery.data?.chartRows ?? []
  const tableRows = productionPeriodViewQuery.data?.tableRows ?? []
  const efcrRows = useMemo(() => buildProductionEfcrRows(chartSourceRows), [chartSourceRows])
  const metricRows = useMemo(
    () => (metricFilter === "efcr" ? [] : buildProductionMetricRows(chartSourceRows, metricFilter)),
    [chartSourceRows, metricFilter],
  )

  const scopeLabel = useMemo(() => {
    if (selectedSystem === "all") return "Farm Consolidated"
    if (systemOptionsQuery.data?.status !== "success") return "Selected cage"
    const match = systemOptionsQuery.data.data.find((row) => String(row.id) === selectedSystem)
    return match?.label ?? match?.name ?? "Selected cage"
  }, [selectedSystem, systemOptionsQuery.data])

  const periodViewError = getErrorMessage(productionPeriodViewQuery.error)
  const summaryMetricsError =
    getErrorMessage(productionSummaryMetricsQuery.error) ?? getQueryResultError(productionSummaryMetricsQuery.data)
  const summaryMetrics =
    productionSummaryMetricsQuery.data?.status === "success" ? productionSummaryMetricsQuery.data.data[0] ?? null : null
  const chartUpdatedAt = productionPeriodViewQuery.dataUpdatedAt
  const tableUpdatedAt = productionPeriodViewQuery.dataUpdatedAt

  return (
    <ProductionSections
      scopeLabel={scopeLabel}
      selectedBatch={selectedBatch}
      selectedSystem={selectedSystem}
      selectedStage={selectedStage}
      timePeriod={timePeriod}
      systemOptions={systemOptions}
      metricFilter={metricFilter}
      efcrRows={efcrRows}
      metricRows={metricRows}
      chartLoading={productionPeriodViewQuery.isLoading}
      chartFetching={productionPeriodViewQuery.isFetching}
      chartUpdatedAt={chartUpdatedAt}
      chartError={periodViewError}
      onRetryChart={() => productionPeriodViewQuery.refetch()}
      summaryMetrics={summaryMetrics}
      summaryLoading={productionSummaryMetricsQuery.isLoading}
      summaryFetching={productionSummaryMetricsQuery.isFetching}
      summaryUpdatedAt={productionSummaryMetricsQuery.dataUpdatedAt}
      summaryError={summaryMetricsError}
      onRetrySummary={() => productionSummaryMetricsQuery.refetch()}
      tableRows={tableRows}
      tableLoading={productionPeriodViewQuery.isLoading}
      tableFetching={productionPeriodViewQuery.isFetching}
      tableUpdatedAt={tableUpdatedAt}
      tableError={periodViewError}
      onRetryTable={() => productionPeriodViewQuery.refetch()}
    />
  )
}

export default function ProductionPage(props: {
  initialFarmId?: string | null
  initialFarmName?: string | null
  initialFilters?: Partial<SharedFiltersState>
}) {
  return (
    <DashboardLayout initialFarmId={props.initialFarmId} initialFarmName={props.initialFarmName}>
      <Suspense fallback={<div>Loading...</div>}>
        <ProductionContent {...props} />
      </Suspense>
    </DashboardLayout>
  )
}

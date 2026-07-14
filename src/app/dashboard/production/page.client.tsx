"use client"

import { Suspense, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { parseProductionMetric } from "@/components/production/metrics"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { useProductionSummary } from "@/features/production/hooks"
import { useBatchSystemIds } from "@/features/reports/hooks"
import { useAnalyticsPageBootstrap } from "@/lib/hooks/app/use-analytics-page-bootstrap"
import { useSystemOptions } from "@/lib/hooks/use-options"
import { getErrorMessage, getQueryResultError } from "@/lib/utils/query-result"
import type { SystemOption } from "@/lib/system-options"
import { ProductionSections } from "./_components/production-sections"
import { buildProductionMetricRows } from "./_lib/production-page"
import { buildProductionPeriodViewRows } from "@/features/production/period-view"
import { buildProductionSummaryMetrics } from "@/features/production/summary-metrics"
import type { SharedFiltersState } from "@/lib/hooks/app/use-shared-filters"

const LIVE_PRODUCTION_STALE_TIME_MS = 60_000

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
  const productionSummaryQuery = useProductionSummary({
    farmId,
    systemId: Number.isFinite(systemId) ? systemId : undefined,
    stage: selectedStage !== "all" ? selectedStage : undefined,
    dateFrom: dateRange.startDate || undefined,
    dateTo: dateRange.endDate || undefined,
    limit: 2500,
    enabled: summaryScopeReady,
    staleTime: LIVE_PRODUCTION_STALE_TIME_MS,
  })
  const filteredSummaryRows = useMemo(() => {
    const rows =
      productionSummaryQuery.data?.status === "success" ? productionSummaryQuery.data.data : []
    if (!includedSystemIds) return rows
    return rows.filter((row) => row.system_id != null && includedSystemIds.has(row.system_id))
  }, [includedSystemIds, productionSummaryQuery.data])
  const chartSourceRows = useMemo(
    () =>
      buildProductionPeriodViewRows({
        productionRows: filteredSummaryRows,
        consolidate: isConsolidatedView,
      }),
    [filteredSummaryRows, isConsolidatedView],
  )
  const tableRows = useMemo(
    () =>
      buildProductionPeriodViewRows({
        productionRows: filteredSummaryRows,
        consolidate: false,
      }).sort((left, right) => {
        const dateDelta = String(right.date).localeCompare(String(left.date))
        if (dateDelta !== 0) return dateDelta
        return String(left.systemName ?? "").localeCompare(String(right.systemName ?? ""))
      }),
    [filteredSummaryRows],
  )
  const metricRows = useMemo(() => buildProductionMetricRows(chartSourceRows, metricFilter), [chartSourceRows, metricFilter])

  const scopeLabel = useMemo(() => {
    if (selectedSystem === "all") return "Farm Consolidated"
    if (systemOptionsQuery.data?.status !== "success") return "Selected cage"
    const match = systemOptionsQuery.data.data.find((row) => String(row.id) === selectedSystem)
    return match?.label ?? match?.name ?? "Selected cage"
  }, [selectedSystem, systemOptionsQuery.data])

  const summaryError =
    getErrorMessage(productionSummaryQuery.error) ?? getQueryResultError(productionSummaryQuery.data)
  const periodViewError = summaryError
  const summaryMetricsError = summaryError
  const summaryMetrics = useMemo(() => buildProductionSummaryMetrics(filteredSummaryRows), [filteredSummaryRows])
  const chartUpdatedAt = productionSummaryQuery.dataUpdatedAt
  const tableUpdatedAt = productionSummaryQuery.dataUpdatedAt

  return (
    <ProductionSections
      scopeLabel={scopeLabel}
      selectedBatch={selectedBatch}
      selectedSystem={selectedSystem}
      selectedStage={selectedStage}
      timePeriod={timePeriod}
      systemOptions={systemOptions}
      metricFilter={metricFilter}
      metricRows={metricRows}
      chartLoading={productionSummaryQuery.isLoading}
      chartFetching={productionSummaryQuery.isFetching}
      chartUpdatedAt={chartUpdatedAt}
      chartError={periodViewError}
      onRetryChart={() => {
        void productionSummaryQuery.refetch()
      }}
      summaryMetrics={summaryMetrics}
      summaryLoading={productionSummaryQuery.isLoading}
      summaryFetching={productionSummaryQuery.isFetching}
      summaryUpdatedAt={productionSummaryQuery.dataUpdatedAt}
      summaryError={summaryMetricsError}
      onRetrySummary={() => productionSummaryQuery.refetch()}
      tableRows={tableRows}
      tableLoading={productionSummaryQuery.isLoading}
      tableFetching={productionSummaryQuery.isFetching}
      tableUpdatedAt={tableUpdatedAt}
      tableError={periodViewError}
      onRetryTable={() => {
        void productionSummaryQuery.refetch()
      }}
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

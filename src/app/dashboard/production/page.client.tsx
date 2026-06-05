"use client"

import { Suspense, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { useAnalyticsPageBootstrap } from "@/lib/hooks/app/use-analytics-page-bootstrap"
import { useProductionSummary } from "@/lib/hooks/use-production"
import { useSystemOptions } from "@/lib/hooks/use-options"
import { useBatchSystemIds } from "@/lib/hooks/use-reports"
import { getErrorMessage, getQueryResultError } from "@/lib/utils/query-result"
import { parseProductionMetric } from "@/components/production/metrics"
import { ProductionSections } from "./_components/production-sections"
import { buildProductionChartRows } from "./_lib/production-page"
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

  const filterParam = searchParams.get("filter")

  const metricFilter = parseProductionMetric(filterParam)
  const systemId = selectedSystem !== "all" ? Number(selectedSystem) : undefined
  const batchId = selectedBatch !== "all" ? Number(selectedBatch) : undefined

  const dateRange = useMemo(() => {
    return { startDate: hasBounds ? (dateFrom ?? "") : "", endDate: hasBounds ? (dateTo ?? "") : "" }
  }, [dateFrom, dateTo, hasBounds])
  const rangeEnabled = hasBounds

  const systemOptionsQuery = useSystemOptions({
    farmId,
    stage: selectedStage,
    activeOnly: false,
  })
  const batchSystemIdsQuery = useBatchSystemIds({
    batchId: Number.isFinite(batchId) ? batchId : undefined,
  })

  const productionSummaryQuery = useProductionSummary({
    farmId,
    systemId: Number.isFinite(systemId) ? systemId : undefined,
    stage: selectedStage !== "all" ? selectedStage : undefined,
    dateFrom: dateRange.startDate || undefined,
    dateTo: dateRange.endDate || undefined,
    limit: 2500,
    enabled: rangeEnabled,
    staleTime: LIVE_PRODUCTION_STALE_TIME_MS,
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

  const productionRowsRaw =
    productionSummaryQuery.data?.status === "success" ? productionSummaryQuery.data.data : []

  const productionRows = useMemo(() => {
    let rows = productionRowsRaw
    if (scopedSystemIds) {
      rows = rows.filter((row) => row.system_id != null && scopedSystemIds.has(row.system_id))
    }
    return rows
  }, [productionRowsRaw, scopedSystemIds])

  const formattedChartRows = useMemo(
    () => buildProductionChartRows({ metricFilter, productionRows }),
    [metricFilter, productionRows],
  )

  const tableRows = useMemo(() => {
    const sorted = [...productionRows].sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")))
    return sorted
  }, [productionRows])

  const summaryError = getErrorMessage(productionSummaryQuery.error) ?? getQueryResultError(productionSummaryQuery.data)
  const chartUpdatedAt = productionSummaryQuery.dataUpdatedAt
  const tableUpdatedAt = productionSummaryQuery.dataUpdatedAt

  return (
    <ProductionSections
      selectedBatch={selectedBatch}
      selectedSystem={selectedSystem}
      selectedStage={selectedStage}
      timePeriod={timePeriod}
      formattedChartRows={formattedChartRows}
      metricFilter={metricFilter}
      chartLoading={productionSummaryQuery.isLoading}
      chartFetching={productionSummaryQuery.isFetching}
      chartUpdatedAt={chartUpdatedAt}
      chartError={summaryError}
      onRetryChart={() => productionSummaryQuery.refetch()}
      tableRows={tableRows}
      tableLoading={productionSummaryQuery.isLoading}
      tableFetching={productionSummaryQuery.isFetching}
      tableUpdatedAt={tableUpdatedAt}
      summaryError={summaryError}
      onRetryTable={() => productionSummaryQuery.refetch()}
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

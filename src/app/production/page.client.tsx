"use client"

import { Suspense, useEffect, useMemo } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import type { Enums } from "@/lib/types/database"
import type { TimePeriod } from "@/components/shared/time-period-selector"
import { useSharedFilters } from "@/lib/hooks/app/use-shared-filters"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useProductionSummary } from "@/lib/hooks/use-production"
import { useDailyFishInventory } from "@/lib/hooks/use-inventory"
import { useSystemOptions } from "@/lib/hooks/use-options"
import { useBatchSystemIds } from "@/lib/hooks/use-reports"
import { getErrorMessage, getQueryResultError } from "@/lib/utils/query-result"
import { useTimePeriodBounds } from "@/lib/hooks/app/use-time-period-bounds"
import { PRODUCTION_METRICS, parseProductionMetric } from "@/components/production/metrics"
import { ProductionSections } from "./_components/production-sections"
import {
  buildProductionChartRows,
  parseStageParam,
  resolveProductionPeriodParam,
} from "./_lib/production-page"

function ProductionContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { farmId } = useActiveFarm()

  const metricParam = searchParams.get("metric")
  const filterParam = searchParams.get("filter")
  const paramSystem = searchParams.get("system") ?? "all"
  const paramStage = parseStageParam(searchParams.get("stage"))
  const periodParam = searchParams.get("period")
  const paramPeriod: TimePeriod = resolveProductionPeriodParam(periodParam)
  const paramBatch = searchParams.get("batch") ?? "all"
  const hasUrlFilters = ["system", "stage", "period", "batch"].some((key) => searchParams.get(key) != null)

  const {
    selectedSystem,
    setSelectedSystem,
    selectedStage,
    setSelectedStage,
    timePeriod,
    setTimePeriod,
    selectedBatch,
    setSelectedBatch,
  } = useSharedFilters(paramPeriod)

  useEffect(() => {
    if (!hasUrlFilters) return
    setSelectedSystem(paramSystem)
    setSelectedStage(paramStage)
    setTimePeriod(paramPeriod)
    setSelectedBatch(paramBatch)
  }, [
    hasUrlFilters,
    paramBatch,
    paramPeriod,
    paramStage,
    paramSystem,
    setSelectedBatch,
    setSelectedStage,
    setSelectedSystem,
    setTimePeriod,
  ])

  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedSystem !== "all") params.set("system", selectedSystem)
    if (selectedStage !== "all") params.set("stage", selectedStage)
    params.set("period", timePeriod)
    if (selectedBatch !== "all") params.set("batch", selectedBatch)
    if (filterParam) params.set("filter", filterParam)
    if (metricParam) params.set("metric", metricParam)

    const nextQuery = params.toString()
    const currentQuery = searchParams.toString()
    if (nextQuery === currentQuery) return
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname)
  }, [
    pathname,
    selectedSystem,
    selectedStage,
    timePeriod,
    selectedBatch,
    router,
    searchParams,
    metricParam,
    filterParam,
  ])

  const metricFilter = parseProductionMetric(filterParam)
  const metricMeta = PRODUCTION_METRICS[metricFilter]
  const systemId = selectedSystem !== "all" ? Number(selectedSystem) : undefined
  const batchId = selectedBatch !== "all" ? Number(selectedBatch) : undefined

  const boundsQuery = useTimePeriodBounds({ farmId, timePeriod })
  const hasBounds = boundsQuery.hasBounds
  const dateRange = useMemo(() => {
    if (hasBounds) {
      return { startDate: boundsQuery.start ?? "", endDate: boundsQuery.end ?? "" }
    }
    return { startDate: "", endDate: "" }
  }, [hasBounds, boundsQuery.start, boundsQuery.end])
  const rangeEnabled = hasBounds

  const systemOptionsQuery = useSystemOptions({
    farmId,
    stage: selectedStage,
    activeOnly: true,
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
  })

  const inventoryEnabled = metricMeta.source === "inventory"
  const inventoryQuery = useDailyFishInventory({
    farmId,
    systemId: Number.isFinite(systemId) ? systemId : undefined,
    dateFrom: dateRange.startDate || undefined,
    dateTo: dateRange.endDate || undefined,
    limit: 5000,
    orderAsc: true,
    enabled: inventoryEnabled && rangeEnabled,
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
  const inventoryRowsRaw =
    inventoryQuery.data?.status === "success" ? inventoryQuery.data.data : []

  const productionRows = useMemo(() => {
    let rows = productionRowsRaw
    if (scopedSystemIds) {
      rows = rows.filter((row) => row.system_id != null && scopedSystemIds.has(row.system_id))
    }
    return rows
  }, [productionRowsRaw, scopedSystemIds])

  const inventoryRows = useMemo(() => {
    let rows = inventoryRowsRaw
    if (scopedSystemIds) {
      rows = rows.filter((row) => row.system_id != null && scopedSystemIds.has(row.system_id))
    }
    return rows
  }, [inventoryRowsRaw, scopedSystemIds])

  const formattedChartRows = useMemo(
    () => buildProductionChartRows({ metricFilter, productionRows, inventoryRows }),
    [inventoryRows, metricFilter, productionRows],
  )

  const tableRows = useMemo(() => {
    const sorted = [...productionRows].sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")))
    return sorted
  }, [productionRows])

  const summaryError = getErrorMessage(productionSummaryQuery.error) ?? getQueryResultError(productionSummaryQuery.data)
  const inventoryError =
    inventoryEnabled ? getErrorMessage(inventoryQuery.error) ?? getQueryResultError(inventoryQuery.data) : null
  const chartError = metricMeta.source === "inventory" ? inventoryError : summaryError
  const chartUpdatedAt =
    metricMeta.source === "inventory"
      ? Math.max(inventoryQuery.dataUpdatedAt ?? 0, productionSummaryQuery.dataUpdatedAt ?? 0)
      : productionSummaryQuery.dataUpdatedAt
  const tableUpdatedAt = productionSummaryQuery.dataUpdatedAt

  return (
    <ProductionSections
      systemId={Number.isFinite(systemId) ? systemId : undefined}
      startDate={dateRange.startDate || null}
      endDate={dateRange.endDate || null}
      formattedChartRows={formattedChartRows}
      metricFilter={metricFilter}
      inventoryEnabled={inventoryEnabled}
      chartLoading={metricMeta.source === "inventory" ? inventoryQuery.isLoading : productionSummaryQuery.isLoading}
      chartFetching={metricMeta.source === "inventory" ? inventoryQuery.isFetching : productionSummaryQuery.isFetching}
      chartUpdatedAt={chartUpdatedAt}
      chartError={chartError}
      onRetryChart={() => {
        productionSummaryQuery.refetch()
        if (inventoryEnabled) inventoryQuery.refetch()
      }}
      tableRows={tableRows}
      tableLoading={productionSummaryQuery.isLoading}
      tableFetching={productionSummaryQuery.isFetching}
      tableUpdatedAt={tableUpdatedAt}
      summaryError={summaryError}
      onRetryTable={() => productionSummaryQuery.refetch()}
    />
  )
}

export default function ProductionPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div>Loading...</div>}>
        <ProductionContent />
      </Suspense>
    </DashboardLayout>
  )
}

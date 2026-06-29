"use client"

import { Suspense, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { parseProductionMetric } from "@/components/production/metrics"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { useProductionPeriodEnrichment, useProductionSummary } from "@/features/production/hooks"
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
import { buildProductionPeriodViewRows } from "@/features/production/period-view"
import { buildProductionSummaryMetrics } from "@/features/production/summary-metrics"
import type { SharedFiltersState } from "@/lib/hooks/app/use-shared-filters"
import type { ProductionSummaryRpcRow } from "@/features/production/types"

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
  const productionPeriodEnrichmentQuery = useProductionPeriodEnrichment({
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
  const filteredSummaryRows = useMemo(() => {
    const rows =
      productionSummaryQuery.data?.status === "success" ? productionSummaryQuery.data.data : []
    if (!includedSystemIds) return rows
    return rows.filter((row) => row.system_id != null && includedSystemIds.has(row.system_id))
  }, [includedSystemIds, productionSummaryQuery.data])
  const enrichment = productionPeriodEnrichmentQuery.data
  const volumeBySystemId = useMemo(
    () =>
      new Map(
        (enrichment?.volumeRows ?? [])
          .filter((row) => typeof row.id === "number")
          .map((row) => [row.id, row.volume ?? 0]),
      ),
    [enrichment?.volumeRows],
  )
  const totalScopedVolumeM3 = useMemo(
    () => (enrichment?.volumeRows ?? []).reduce((sum, row) => sum + (row.volume ?? 0), 0),
    [enrichment?.volumeRows],
  )
  const growthBySystemDate = useMemo(
    () =>
      new Map(
        (enrichment?.growthTrendRows ?? []).map((row) => [
          `${row.system_id}|${row.sample_date}`,
          {
            adgGDay: row.adg_g_day ?? null,
            sgrPctDay: row.sgr_pct_day ?? null,
          },
        ]),
      ),
    [enrichment?.growthTrendRows],
  )
  const feedTypeBySystemDate = useMemo(
    () => buildFeedTypeBySystemDate(filteredSummaryRows, enrichment?.feedingRecords ?? []),
    [enrichment?.feedingRecords, filteredSummaryRows],
  )
  const chartSourceRows = useMemo(
    () =>
      buildProductionPeriodViewRows({
        productionRows: filteredSummaryRows,
        consolidate: isConsolidatedView,
        volumeBySystemId,
        growthBySystemDate,
        feedTypeBySystemDate,
        totalScopedVolumeM3,
      }),
    [feedTypeBySystemDate, filteredSummaryRows, growthBySystemDate, isConsolidatedView, totalScopedVolumeM3, volumeBySystemId],
  )
  const tableRows = useMemo(
    () =>
      buildProductionPeriodViewRows({
        productionRows: filteredSummaryRows,
        consolidate: false,
        volumeBySystemId,
        growthBySystemDate,
        feedTypeBySystemDate,
        totalScopedVolumeM3,
      }).sort((left, right) => {
        const dateDelta = String(right.date).localeCompare(String(left.date))
        if (dateDelta !== 0) return dateDelta
        return String(left.systemName ?? "").localeCompare(String(right.systemName ?? ""))
      }),
    [feedTypeBySystemDate, filteredSummaryRows, growthBySystemDate, totalScopedVolumeM3, volumeBySystemId],
  )
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

  const summaryError =
    getErrorMessage(productionSummaryQuery.error) ?? getQueryResultError(productionSummaryQuery.data)
  const enrichmentError = getErrorMessage(productionPeriodEnrichmentQuery.error)
  const periodViewError = enrichmentError ?? summaryError
  const summaryMetricsError = summaryError
  const summaryMetrics = useMemo(() => buildProductionSummaryMetrics(filteredSummaryRows), [filteredSummaryRows])
  const chartUpdatedAt = Math.max(productionSummaryQuery.dataUpdatedAt, productionPeriodEnrichmentQuery.dataUpdatedAt)
  const tableUpdatedAt = chartUpdatedAt

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
      chartLoading={productionSummaryQuery.isLoading || productionPeriodEnrichmentQuery.isLoading}
      chartFetching={productionSummaryQuery.isFetching || productionPeriodEnrichmentQuery.isFetching}
      chartUpdatedAt={chartUpdatedAt}
      chartError={periodViewError}
      onRetryChart={() => {
        void productionSummaryQuery.refetch()
        void productionPeriodEnrichmentQuery.refetch()
      }}
      summaryMetrics={summaryMetrics}
      summaryLoading={productionSummaryQuery.isLoading}
      summaryFetching={productionSummaryQuery.isFetching}
      summaryUpdatedAt={productionSummaryQuery.dataUpdatedAt}
      summaryError={summaryMetricsError}
      onRetrySummary={() => productionSummaryQuery.refetch()}
      tableRows={tableRows}
      tableLoading={productionSummaryQuery.isLoading || productionPeriodEnrichmentQuery.isLoading}
      tableFetching={productionSummaryQuery.isFetching || productionPeriodEnrichmentQuery.isFetching}
      tableUpdatedAt={tableUpdatedAt}
      tableError={periodViewError}
      onRetryTable={() => {
        void productionSummaryQuery.refetch()
        void productionPeriodEnrichmentQuery.refetch()
      }}
    />
  )
}

function buildFeedTypeBySystemDate(
  productionRows: ProductionSummaryRpcRow[],
  feedingRecords: Array<{
    date: string | null
    system_id: number | null
    feed_type: {
      feed_line: string | null
    } | null
  }>,
) {
  const feedTypeBySystemDate = new Map<string, string | null>()
  const productionDatesBySystem = new Map<number, string[]>()

  productionRows.forEach((row) => {
    if (row.system_id == null || !row.date) return
    const current = productionDatesBySystem.get(row.system_id) ?? []
    current.push(row.date)
    productionDatesBySystem.set(row.system_id, current)
  })

  const feedsBySystem = new Map<number, Array<{ date: string; label: string | null }>>()
  feedingRecords.forEach((record) => {
    if (record.system_id == null || !record.date) return
    const current = feedsBySystem.get(record.system_id) ?? []
    current.push({
      date: record.date,
      label: record.feed_type?.feed_line?.trim() || null,
    })
    feedsBySystem.set(record.system_id, current)
  })

  productionDatesBySystem.forEach((dates, systemId) => {
    const sortedDates = Array.from(new Set(dates)).sort((left, right) => left.localeCompare(right))
    const feeds = (feedsBySystem.get(systemId) ?? []).slice().sort((left, right) => left.date.localeCompare(right.date))
    let latestLabel: string | null = null
    let feedIndex = 0

    sortedDates.forEach((date) => {
      while (feedIndex < feeds.length && feeds[feedIndex].date <= date) {
        latestLabel = feeds[feedIndex].label ?? latestLabel
        feedIndex += 1
      }
      feedTypeBySystemDate.set(`${systemId}|${date}`, latestLabel)
    })
  })

  return feedTypeBySystemDate
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

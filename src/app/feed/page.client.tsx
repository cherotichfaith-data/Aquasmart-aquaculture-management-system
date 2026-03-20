"use client"

import { useMemo, useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { useAnalyticsPageBootstrap } from "@/lib/hooks/app/use-analytics-page-bootstrap"
import { useScopedSystemIds } from "@/lib/hooks/use-scoped-system-ids"
import {
  useFeedPlans,
  useFarmKpisToday,
  useFeedingRecords,
  useRunningStock,
  useScopedFcrTrend,
  useScopedGrowthTrend,
  useScopedSurvivalTrend,
} from "@/lib/hooks/use-reports"
import { useDailyFishInventory } from "@/lib/hooks/use-inventory"
import { useFeedTypeOptions } from "@/lib/hooks/use-options"
import { useWaterQualityMeasurements } from "@/lib/hooks/use-water-quality"
import SystemHistorySheet from "@/components/systems/system-history-sheet"
import { DataErrorState } from "@/components/shared/data-states"
import { TimelineIntegrityNote } from "@/components/shared/timeline-integrity-note"
import { getErrorMessage, getQueryResultError } from "@/lib/utils/query-result"
import type { FeedPageInitialData, FeedPageInitialFilters } from "@/features/feed/types"
import {
  buildConsecutivePoorAlerts,
  buildFeedDeviationCells,
  buildFeedRateSeries,
  formatFeedDayLabel,
  selectApplicableFeedPlan,
  type FcrInterval,
} from "./_lib/feed-analytics"
import type { FeedExceptionItem } from "./_lib/feed-sections"
import {
  buildDateWindow,
  buildFeedExceptionItems,
  buildLatestDoBySystem,
  buildLatestFeedRateBySystem,
  buildLatestRowBySystem,
  formatFeedTypeLabel,
} from "./_lib/feed-page"
import { FeedDashboard } from "./_components/feed-dashboard"

export default function FeedManagementPage({
  initialFarmId,
  initialFilters,
  initialData,
}: {
  initialFarmId: string | null
  initialFilters: FeedPageInitialFilters
  initialData: FeedPageInitialData
}) {
  const {
    farmId,
    selectedBatch,
    selectedSystem,
    selectedStage,
    dateFrom: boundsStart,
    dateTo: boundsEnd,
    boundsReady,
  } = useAnalyticsPageBootstrap({
    initialFarmId,
    defaultTimePeriod: "month",
    initialFilters,
    initialBounds: initialData.bounds,
  })
  const [selectedFeedType, setSelectedFeedType] = useState("all")
  const [selectedHistorySystemId, setSelectedHistorySystemId] = useState<number | null>(null)

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
    initialSystemsData: initialData.systems,
    initialBatchSystemsData: initialData.batchSystems,
  })

  const hasDateRange = boundsReady
  const dateFrom = boundsStart
  const dateTo = boundsEnd

  const feedTypesQuery = useFeedTypeOptions({ initialData: initialData.feedTypes })
  const farmKpisQuery = useFarmKpisToday({
    farmId,
    enabled: Boolean(farmId),
  })
  const runningStockQuery = useRunningStock({
    farmId,
    enabled: Boolean(farmId),
  })
  const feedPlansQuery = useFeedPlans({
    farmId,
    systemIds: scopedSystemIdList,
    batchId: Number.isFinite(batchId) ? (batchId as number) : undefined,
    dateFrom,
    dateTo,
    enabled: Boolean(farmId) && hasDateRange,
  })
  const feedingEnabled = (hasSystem || scopedSystemIdList.length > 0) && hasDateRange
  const feedingRecordsQuery = useFeedingRecords({
    farmId,
    systemId: hasSystem ? (systemId as number) : undefined,
    systemIds: !hasSystem ? scopedSystemIdList : undefined,
    batchId: Number.isFinite(batchId) ? (batchId as number) : undefined,
    dateFrom,
    dateTo,
    limit: 4000,
    enabled: feedingEnabled,
    initialData: initialData.feedingRecords,
  })
  const inventoryQuery = useDailyFishInventory({
    farmId,
    systemId: hasSystem ? (systemId as number) : undefined,
    dateFrom,
    dateTo,
    limit: 5000,
    orderAsc: true,
    enabled: feedingEnabled,
    initialData: initialData.inventory,
  })
  const fcrTrendQuery = useScopedFcrTrend({
    farmId,
    systemIds: scopedSystemIdList,
    days: 180,
    enabled: feedingEnabled,
  })
  const growthTrendQuery = useScopedGrowthTrend({
    systemIds: scopedSystemIdList,
    days: 180,
    enabled: feedingEnabled,
  })
  const survivalTrendQuery = useScopedSurvivalTrend({
    systemIds: scopedSystemIdList,
    dateFrom,
    dateTo,
    enabled: feedingEnabled,
  })
  const measurementsQuery = useWaterQualityMeasurements({
    farmId,
    systemId: hasSystem ? (systemId as number) : undefined,
    dateFrom,
    dateTo,
    requireSystem: false,
    limit: 5000,
    enabled: hasDateRange,
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

  const feedTypes = feedTypesQuery.data?.status === "success" ? feedTypesQuery.data.data : []

  const feedingRecordsRaw = feedingRecordsQuery.data?.status === "success" ? feedingRecordsQuery.data.data : []
  const inventoryRowsRaw = inventoryQuery.data?.status === "success" ? inventoryQuery.data.data : []
  const fcrTrendRowsRaw = fcrTrendQuery.data?.status === "success" ? fcrTrendQuery.data.data : []
  const growthTrendRowsRaw = growthTrendQuery.data?.status === "success" ? growthTrendQuery.data.data : []
  const survivalTrendRowsRaw = survivalTrendQuery.data?.status === "success" ? survivalTrendQuery.data.data : []
  const runningStockRows = runningStockQuery.data?.status === "success" ? runningStockQuery.data.data : []
  const feedPlans = feedPlansQuery.data?.status === "success" ? feedPlansQuery.data.data : []
  const measurementsRaw = measurementsQuery.data?.status === "success" ? measurementsQuery.data.data : []
  const selectedFeedTypeId = selectedFeedType === "all" ? null : Number(selectedFeedType)

  const feedingRecords = useMemo(() => {
    return feedingRecordsRaw
      .filter((row) => row.system_id != null && scopedSystemIds.has(row.system_id))
      .filter((row) => {
        if (selectedFeedType === "all") return true
        return String(row.feed_type_id ?? "") === selectedFeedType
      })
  }, [feedingRecordsRaw, scopedSystemIds, selectedFeedType])

  const inventoryRows = useMemo(
    () => inventoryRowsRaw.filter((row) => row.system_id != null && scopedSystemIds.has(row.system_id)),
    [inventoryRowsRaw, scopedSystemIds],
  )

  const measurements = useMemo(
    () =>
      measurementsRaw.filter(
        (row) =>
          row.system_id != null &&
          scopedSystemIds.has(row.system_id) &&
          row.parameter_name === "dissolved_oxygen",
      ),
    [measurementsRaw, scopedSystemIds],
  )

  const feedRatePoints = useMemo(
    () =>
      buildFeedRateSeries({
        rows: inventoryRows,
        feedPlans,
        batchId: Number.isFinite(batchId) ? (batchId as number) : null,
        selectedFeedTypeId: Number.isFinite(selectedFeedTypeId) ? selectedFeedTypeId : null,
      }),
    [batchId, feedPlans, inventoryRows, selectedFeedTypeId],
  )
  const fcrIntervals = useMemo<FcrInterval[]>(
    () =>
      fcrTrendRowsRaw
        .map((row) => {
          const matchedPlan = selectApplicableFeedPlan(feedPlans, {
            systemId: row.system_id,
            date: row.period_end,
            abwG: row.abw_end_g,
            batchId: Number.isFinite(batchId) ? (batchId as number) : null,
            feedTypeId: Number.isFinite(selectedFeedTypeId) ? selectedFeedTypeId : null,
          })
          const targetEfcr = matchedPlan?.target_efcr ?? null
          const upperTarget = targetEfcr != null ? targetEfcr * 1.1 : 2
          const lowerTarget = targetEfcr != null ? targetEfcr * 0.85 : 1.2

          return {
            systemId: row.system_id,
            startDate: row.period_start,
            endDate: row.period_end,
            days: row.days_interval,
            previousAbwG: 0,
            currentAbwG: row.abw_end_g,
            liveFishCount: null,
            totalFeedKg: row.total_feed_kg,
            weightGainKg: row.weight_gain_kg,
            fcr: row.fcr,
            sgrPctPerDay: null,
            warning:
              row.fcr > upperTarget
                ? `Above ${targetEfcr != null ? `target eFCR ${targetEfcr.toFixed(2)}` : "target FCR"}.`
                : row.fcr < lowerTarget
                  ? `Below ${targetEfcr != null ? `target eFCR ${targetEfcr.toFixed(2)}` : "expected FCR"}. Check feed rate against growth.`
                  : null,
            dominantFeedType: null,
            dominantFeedTypeId: null,
          }
        })
        .sort((a, b) => (a.systemId === b.systemId ? a.endDate.localeCompare(b.endDate) : a.systemId - b.systemId)),
    [batchId, fcrTrendRowsRaw, feedPlans, selectedFeedTypeId],
  )

  const exceptionWindowRecords = useMemo(() => {
    if (!dateTo) return feedingRecords
    const end = new Date(`${dateTo}T00:00:00`)
    const start = new Date(end)
    start.setDate(start.getDate() - 13)
    const minDate = start.toISOString().split("T")[0]
    return feedingRecords.filter((row) => row.date != null && row.date >= minDate && row.date <= dateTo)
  }, [dateTo, feedingRecords])

  const poorAlerts = useMemo(
    () => buildConsecutivePoorAlerts({ feedingRecords: exceptionWindowRecords, systemLabels: systemNameById }),
    [exceptionWindowRecords, systemNameById],
  )

  const heatmapDates = useMemo(() => {
    if (!dateFrom || !dateTo) return []
    return buildDateWindow(dateFrom, dateTo, 14)
  }, [dateFrom, dateTo])
  const matrixCells = useMemo(
    () =>
      buildFeedDeviationCells({
        systemIds: scopedSystemIdList,
        dates: heatmapDates,
        points: feedRatePoints,
      }),
    [feedRatePoints, heatmapDates, scopedSystemIdList],
  )

  const latestFeedDate = useMemo(
    () => feedingRecords.map((row) => row.date).filter(Boolean).sort().pop() ?? null,
    [feedingRecords],
  )
  const scopedFeedTodayKg = useMemo(() => {
    if (!latestFeedDate) return 0
    return feedingRecords
      .filter((row) => row.date === latestFeedDate)
      .reduce((total, row) => total + (row.feeding_amount ?? 0), 0)
  }, [feedingRecords, latestFeedDate])
  const scopedFedSystemsToday = useMemo(() => {
    if (!latestFeedDate) return 0
    return new Set(
      feedingRecords
        .filter((row) => row.date === latestFeedDate && row.system_id != null)
        .map((row) => row.system_id as number),
    ).size
  }, [feedingRecords, latestFeedDate])

  const worstFcr = useMemo(() => {
    const row = fcrIntervals
      .filter((item) => item.fcr != null)
      .sort((a, b) => (b.fcr ?? 0) - (a.fcr ?? 0))[0]
    if (!row) return null
    return {
      label: systemNameById.get(row.systemId) ?? `System ${row.systemId}`,
      value: row.fcr,
    }
  }, [fcrIntervals, systemNameById])

  const latestFeedRateBySystem = useMemo(() => buildLatestFeedRateBySystem(feedRatePoints), [feedRatePoints])
  const latestGrowthBySystem = useMemo(
    () => buildLatestRowBySystem(growthTrendRowsRaw, (row) => String(row.sample_date)),
    [growthTrendRowsRaw],
  )
  const latestSurvivalBySystem = useMemo(
    () => buildLatestRowBySystem(survivalTrendRowsRaw, (row) => String(row.event_date)),
    [survivalTrendRowsRaw],
  )
  const latestDoBySystem = useMemo(() => buildLatestDoBySystem(measurements), [measurements])

  const overfeedingCount = useMemo(() => {
    const latestBySystem = new Map<number, (typeof feedRatePoints)[number]>()
    feedRatePoints
      .slice()
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .forEach((point) => {
        if (!latestBySystem.has(point.systemId)) latestBySystem.set(point.systemId, point)
      })
    return Array.from(latestBySystem.values()).filter(
      (point) => point.feedRatePct != null && point.upperBand != null && point.feedRatePct > point.upperBand,
    ).length
  }, [feedRatePoints])

  const poorAppetiteCount = useMemo(
    () => new Set(poorAlerts.map((alert) => alert.systemId)).size,
    [poorAlerts],
  )
  const lowGrowthCount = useMemo(() => {
    return Array.from(latestGrowthBySystem.values()).filter((row) => row.sgr_pct_day < 0.7).length
  }, [latestGrowthBySystem])
  const survivalRiskCount = useMemo(() => {
    return Array.from(latestSurvivalBySystem.values()).filter((row) => row.survival_pct < 95).length
  }, [latestSurvivalBySystem])
  const farmKpis = farmKpisQuery.data?.status === "success" ? (farmKpisQuery.data.data[0] ?? null) : null
  const minStockDays = useMemo(() => {
    if (farmKpis?.min_stock_days != null) return farmKpis.min_stock_days
    if (runningStockRows.length === 0) return null
    return Math.min(...runningStockRows.map((row) => row.days_remaining))
  }, [farmKpis, runningStockRows])
  const feedTodayKg = farmKpis?.feed_today_kg ?? scopedFeedTodayKg
  const fedSystemsToday = farmKpis?.systems_fed ?? scopedFedSystemsToday
  const activeSystemCount = farmKpis?.active_systems ?? scopedSystemIdList.length

  const exceptionItems = useMemo<FeedExceptionItem[]>(
    () =>
      buildFeedExceptionItems({
        latestDoBySystem,
        latestFeedRateBySystem,
        latestGrowthBySystem,
        latestSurvivalBySystem,
        poorAlerts,
        runningStockRows,
        systemNameById,
      }),
    [latestDoBySystem, latestFeedRateBySystem, latestGrowthBySystem, latestSurvivalBySystem, poorAlerts, runningStockRows, systemNameById],
  )

  const errorMessages = [
    getErrorMessage(farmKpisQuery.error),
    getQueryResultError(farmKpisQuery.data),
    getErrorMessage(runningStockQuery.error),
    getQueryResultError(runningStockQuery.data),
    getErrorMessage(feedPlansQuery.error),
    getQueryResultError(feedPlansQuery.data),
    getErrorMessage(feedTypesQuery.error),
    getQueryResultError(feedTypesQuery.data),
    getErrorMessage(feedingRecordsQuery.error),
    getQueryResultError(feedingRecordsQuery.data),
    getErrorMessage(inventoryQuery.error),
    getQueryResultError(inventoryQuery.data),
    getErrorMessage(fcrTrendQuery.error),
    getQueryResultError(fcrTrendQuery.data),
    getErrorMessage(growthTrendQuery.error),
    getQueryResultError(growthTrendQuery.data),
    getErrorMessage(survivalTrendQuery.error),
    getQueryResultError(survivalTrendQuery.data),
    getErrorMessage(measurementsQuery.error),
    getQueryResultError(measurementsQuery.data),
    getErrorMessage(systemsQuery.error),
    getQueryResultError(systemsQuery.data),
    getErrorMessage(batchSystemsQuery.error),
    getQueryResultError(batchSystemsQuery.data),
  ].filter(Boolean) as string[]

  const loading =
    farmKpisQuery.isLoading ||
    runningStockQuery.isLoading ||
    feedPlansQuery.isLoading ||
    feedTypesQuery.isLoading ||
    feedingRecordsQuery.isLoading ||
    inventoryQuery.isLoading ||
    fcrTrendQuery.isLoading ||
    growthTrendQuery.isLoading ||
    survivalTrendQuery.isLoading ||
    measurementsQuery.isLoading
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <FeedDashboard
          selectedFeedType={selectedFeedType}
          onSelectedFeedTypeChange={setSelectedFeedType}
          feedTypes={feedTypes}
          formatFeedTypeLabel={formatFeedTypeLabel}
          hasSystem={hasSystem}
          systemId={systemId}
          boundsStart={boundsStart ?? null}
          boundsEnd={boundsEnd ?? null}
          errorMessage={errorMessages[0] ?? null}
          onRetry={() => {
            farmKpisQuery.refetch()
            runningStockQuery.refetch()
            feedTypesQuery.refetch()
            feedingRecordsQuery.refetch()
            inventoryQuery.refetch()
            fcrTrendQuery.refetch()
            growthTrendQuery.refetch()
            survivalTrendQuery.refetch()
            measurementsQuery.refetch()
            systemsQuery.refetch()
            batchSystemsQuery.refetch()
          }}
          latestFeedDate={latestFeedDate}
          feedTodayKg={feedTodayKg}
          fedSystemsToday={fedSystemsToday}
          activeSystemCount={activeSystemCount}
          minStockDays={minStockDays}
          overfeedingCount={overfeedingCount}
          poorAppetiteCount={poorAppetiteCount}
          lowGrowthCount={lowGrowthCount}
          survivalRiskCount={survivalRiskCount}
          worstFcr={worstFcr}
          loading={loading}
          scopedSystemIdList={scopedSystemIdList}
          heatmapDates={heatmapDates}
          matrixCells={matrixCells}
          systemNameById={systemNameById}
          exceptionItems={exceptionItems}
          runningStockRows={runningStockRows}
          feedRatePoints={feedRatePoints}
          fcrIntervals={fcrIntervals}
          selectedHistorySystemId={selectedHistorySystemId}
          onSelectedHistorySystemIdChange={setSelectedHistorySystemId}
          farmId={farmId}
          dateFrom={dateFrom ?? null}
          dateTo={dateTo ?? null}
        />
      </div>
    </DashboardLayout>
  )
}

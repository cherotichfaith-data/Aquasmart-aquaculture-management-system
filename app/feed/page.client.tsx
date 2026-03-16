"use client"

import { useMemo, useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { useAnalyticsPageBootstrap } from "@/hooks/use-analytics-page-bootstrap"
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
import { getErrorMessage, getQueryResultError } from "@/lib/utils/query-result"
import type { FeedPageInitialData, FeedPageInitialFilters } from "@/features/feed/types"
import {
  buildConsecutivePoorAlerts,
  buildFeedDeviationCells,
  buildFeedRateSeries,
  formatFeedDayLabel,
  selectApplicableFeedPlan,
  type FcrInterval,
} from "./feed-analytics"
import {
  FeedExceptionsRail,
  FeedFcrSection,
  FeedMatrixSection,
  FeedKpiStrip,
  FeedRateSection,
  FeedStockCompact,
  type FeedExceptionItem,
} from "./feed-sections"

const buildDateWindow = (startDate: string, endDate: string, maxDays = 30) => {
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return []
  const dates: string[] = []
  const cursor = new Date(end)
  while (cursor >= start && dates.length < maxDays) {
    dates.unshift(cursor.toISOString().split("T")[0])
    cursor.setDate(cursor.getDate() - 1)
  }
  return dates
}

const formatFeedTypeLabel = (feedType: {
  id?: number | null
  feed_line?: string | null
  feed_pellet_size?: string | null
  crude_protein_percentage?: number | null
  label?: string | null
}) => {
  const parts = [
    feedType.feed_line,
    feedType.feed_pellet_size,
    feedType.crude_protein_percentage != null ? `CP ${feedType.crude_protein_percentage}%` : null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(" | ") : feedType.label ?? `Feed ${feedType.id ?? "N/A"}`
}

const formatMetricNumber = (value: number | null | undefined, decimals = 1) =>
  value == null || Number.isNaN(value)
    ? "N/A"
    : value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })

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

  const latestFeedRateBySystem = useMemo(() => {
    const latest = new Map<number, (typeof feedRatePoints)[number]>()
    feedRatePoints
      .slice()
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .forEach((point) => {
        if (!latest.has(point.systemId)) latest.set(point.systemId, point)
      })
    return latest
  }, [feedRatePoints])

  const latestGrowthBySystem = useMemo(() => {
    const latest = new Map<number, (typeof growthTrendRowsRaw)[number]>()
    growthTrendRowsRaw
      .slice()
      .sort((a, b) => String(b.sample_date).localeCompare(String(a.sample_date)))
      .forEach((row) => {
        if (!latest.has(row.system_id)) latest.set(row.system_id, row)
      })
    return latest
  }, [growthTrendRowsRaw])

  const latestSurvivalBySystem = useMemo(() => {
    const latest = new Map<number, (typeof survivalTrendRowsRaw)[number]>()
    survivalTrendRowsRaw
      .slice()
      .sort((a, b) => String(b.event_date).localeCompare(String(a.event_date)))
      .forEach((row) => {
        if (!latest.has(row.system_id)) latest.set(row.system_id, row)
      })
    return latest
  }, [survivalTrendRowsRaw])

  const latestDoBySystem = useMemo(() => {
    const latest = new Map<number, { date: string; value: number }>()
    measurements
      .slice()
      .sort((a, b) => {
        const aStamp = String(a.created_at ?? a.date ?? "")
        const bStamp = String(b.created_at ?? b.date ?? "")
        return bStamp.localeCompare(aStamp)
      })
      .forEach((row) => {
        if (row.system_id == null || row.date == null || row.parameter_value == null) return
        if (!latest.has(row.system_id)) {
          latest.set(row.system_id, { date: row.date, value: row.parameter_value })
        }
      })
    return latest
  }, [measurements])

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

  const exceptionItems = useMemo<FeedExceptionItem[]>(() => {
    const items: FeedExceptionItem[] = []

    Array.from(latestFeedRateBySystem.values())
      .filter((point) => point.feedRatePct != null && (point.upperBand != null || point.lowerBand != null))
      .forEach((point) => {
        const systemLabel = systemNameById.get(point.systemId) ?? `System ${point.systemId}`
        if (point.upperBand != null && point.feedRatePct != null && point.feedRatePct > point.upperBand) {
          items.push({
            id: `feed-rate-above-${point.systemId}`,
            severity: point.feedRatePct > point.upperBand * 1.15 ? "critical" : "warning",
            title: `${systemLabel} above target`,
            detail: `${point.feedRatePct.toFixed(2)}% vs target ${point.upperBand.toFixed(1)}% on ${point.label}.`,
            systemId: point.systemId,
          })
        } else if (point.lowerBand != null && point.feedRatePct != null && point.feedRatePct < point.lowerBand) {
          items.push({
            id: `feed-rate-below-${point.systemId}`,
            severity: "warning",
            title: `${systemLabel} below target`,
            detail: `${point.feedRatePct.toFixed(2)}% vs target ${point.lowerBand.toFixed(1)}% on ${point.label}.`,
            systemId: point.systemId,
          })
        }
      })

    poorAlerts.slice(0, 4).forEach((alert) => {
      items.push({
        id: `poor-${alert.systemId}-${alert.date}`,
        severity: "warning",
        title: systemNameById.get(alert.systemId) ?? `System ${alert.systemId}`,
        detail: alert.message,
        systemId: alert.systemId,
      })
    })

    Array.from(latestGrowthBySystem.values())
      .filter((row) => row.sgr_pct_day < 0.7)
      .forEach((row) => {
        items.push({
          id: `growth-${row.system_id}`,
          severity: "warning",
          title: `${systemNameById.get(row.system_id) ?? `System ${row.system_id}`} low growth`,
          detail: `SGR ${row.sgr_pct_day.toFixed(2)}%/day on ${formatFeedDayLabel(row.sample_date)}.`,
          systemId: row.system_id,
        })
      })

    Array.from(latestSurvivalBySystem.values())
      .filter((row) => row.survival_pct < 95)
      .forEach((row) => {
        items.push({
          id: `survival-${row.system_id}`,
          severity: row.survival_pct < 90 ? "critical" : "warning",
          title: `${systemNameById.get(row.system_id) ?? `System ${row.system_id}`} survival risk`,
          detail: `Survival ${row.survival_pct.toFixed(1)}% on ${formatFeedDayLabel(row.event_date)}.`,
          systemId: row.system_id,
        })
      })

    Array.from(latestDoBySystem.entries()).forEach(([systemId, reading]) => {
      if (reading.value >= 6) return
      items.push({
        id: `do-${systemId}`,
        severity: reading.value < 4 ? "critical" : "warning",
        title: `${systemNameById.get(systemId) ?? `System ${systemId}`} low DO`,
        detail: `DO ${reading.value.toFixed(1)} mg/L on ${formatFeedDayLabel(reading.date)}.`,
        systemId,
      })
    })

    runningStockRows
      .filter((row) => (row.days_remaining ?? 999) < 30)
      .sort((a, b) => (a.days_remaining ?? 999) - (b.days_remaining ?? 999))
      .slice(0, 3)
      .forEach((row) => {
        items.push({
          id: `stock-${row.feed_type_name}`,
          severity: (row.days_remaining ?? 999) < 14 ? "critical" : "warning",
          title: `${row.feed_type_name} stock cover`,
          detail: `${formatMetricNumber(row.days_remaining, 0)} days remaining at ${formatMetricNumber(row.avg_daily_usage_kg, 1)} kg/day.`,
        })
      })

    const severityRank = { critical: 0, warning: 1, info: 2 } as const
    return items
      .sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || a.title.localeCompare(b.title))
      .slice(0, 10)
  }, [latestDoBySystem, latestFeedRateBySystem, latestGrowthBySystem, latestSurvivalBySystem, poorAlerts, runningStockRows, systemNameById])

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
        <div className="flex items-center justify-between rounded-lg border border-border/80 bg-card p-4 shadow-sm">
          <h1 className="text-3xl font-bold">Feed</h1>
          <select
            value={selectedFeedType}
            onChange={(event) => setSelectedFeedType(event.target.value)}
            className="h-10 min-w-[220px] rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground"
            aria-label="Filter by feed type"
          >
            <option value="all">All Feed Types</option>
            {feedTypes.map((feedType) => (
              <option key={feedType.id} value={String(feedType.id)}>
                {formatFeedTypeLabel(feedType)}
              </option>
            ))}
          </select>
        </div>

        {errorMessages.length > 0 ? (
          <DataErrorState
            title="Unable to load feed management data"
            description={errorMessages[0]}
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
          />
        ) : null}

        <FeedKpiStrip
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
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_360px]">
          <FeedMatrixSection
            loading={loading}
            systemIds={scopedSystemIdList}
            dates={heatmapDates}
            cells={matrixCells}
            systemNameById={systemNameById}
            onSystemSelect={setSelectedHistorySystemId}
          />
          <div className="space-y-6">
            <FeedExceptionsRail loading={loading} items={exceptionItems} onSystemSelect={setSelectedHistorySystemId} />
            <FeedStockCompact rows={runningStockRows} />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <FeedRateSection loading={loading} points={feedRatePoints} systemNameById={systemNameById} />
          <FeedFcrSection loading={loading} intervals={fcrIntervals} systemNameById={systemNameById} />
        </div>
        <SystemHistorySheet
          open={selectedHistorySystemId !== null}
          onOpenChange={(open) => !open && setSelectedHistorySystemId(null)}
          farmId={farmId}
          systemId={selectedHistorySystemId}
          systemLabel={selectedHistorySystemId != null ? (systemNameById.get(selectedHistorySystemId) ?? null) : null}
          dateFrom={dateFrom ?? undefined}
          dateTo={dateTo ?? undefined}
        />
      </div>
    </DashboardLayout>
  )
}
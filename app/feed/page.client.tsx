"use client"

import { useMemo } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { type FeedIncomingWithType } from "@/lib/api/reports"
import { useFeedIncoming, useFeedingRecords, useFeedTypes } from "@/lib/hooks/use-reports"
import { useDailyFishInventory } from "@/lib/hooks/use-inventory"
import { useEfcrTrend } from "@/lib/hooks/use-production"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { useSharedFilters } from "@/hooks/use-shared-filters"
import { useTimePeriodBounds } from "@/hooks/use-time-period-bounds"
import { useBatchOptions } from "@/lib/hooks/use-options"
import { useScopedSystemIds } from "@/lib/hooks/use-scoped-system-ids"
import { formatDayLabel, isAttentionResponse, toIsoDate } from "./feed-utils"
import {
  FeedAnomaliesSection,
  FeedAttentionTable,
  FeedEfcrSection,
  FeedIncomingInventoryTable,
  FeedNutritionSection,
} from "./feed-sections"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt } from "@/components/shared/data-states"
import { getErrorMessage, getQueryResultError } from "@/lib/utils/query-result"

const FEED_USAGE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
]

const HIDDEN_FEED_TYPE_LABELS = [
  "optiline grower 4.5mm cp 30% f 7%",
  "nutra 120 starter 1.0-1.5mm cp 40% f 8%",
  "optiline pre-grower 2mm cp 34% f 7%",
  "nutra 160 starter 1.5-1.99mm cp 38% f 8%",
]

const normalizeFeedLabel = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim()

const isHiddenFeedType = (label: string) => {
  const normalized = normalizeFeedLabel(label)
  return HIDDEN_FEED_TYPE_LABELS.some((hidden) => normalized.includes(hidden))
}

export default function FeedManagementPage() {
  const { farmId } = useActiveFarm()
  const {
    selectedBatch,
    selectedSystem,
    selectedStage,
    timePeriod,
  } = useSharedFilters("quarter")
  const chartLimit = 2000
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

  const boundsQuery = useTimePeriodBounds({ farmId, timePeriod })
  const hasBounds = boundsQuery.hasBounds
  const dateFrom = boundsQuery.start ?? undefined
  const dateTo = boundsQuery.end ?? undefined
  const feedIncomingQuery = useFeedIncoming({ dateFrom, dateTo, limit: 1000, enabled: hasBounds })
  const feedTypesQuery = useFeedTypes()
  const batchesQuery = useBatchOptions({ farmId })

  const feedingQueryEnabled = hasSystem || scopedSystemIdList.length > 0
  const feedingRecordsQuery = useFeedingRecords({
    systemId: hasSystem ? (systemId as number) : undefined,
    systemIds: !hasSystem ? scopedSystemIdList : undefined,
    batchId: Number.isFinite(batchId) ? (batchId as number) : undefined,
    dateFrom,
    dateTo,
    limit: chartLimit,
    enabled: feedingQueryEnabled && hasBounds,
  })
  const inventoryQuery = useDailyFishInventory({
    farmId,
    systemId: hasSystem ? (systemId as number) : undefined,
    dateFrom,
    dateTo,
    limit: 5000,
    orderAsc: true,
    enabled: feedingQueryEnabled && hasBounds,
  })
  const efcrTrendQuery = useEfcrTrend({
    farmId,
    systemId: hasSystem ? (systemId as number) : undefined,
    dateFrom,
    dateTo,
    limit: chartLimit,
    enabled: Boolean(farmId) && hasBounds,
  })

  const feedData = (feedIncomingQuery.data?.status === "success" ? feedIncomingQuery.data.data : []) as FeedIncomingWithType[]
  const systems = systemsQuery.data?.status === "success" ? systemsQuery.data.data : []
  const batches = batchesQuery.data?.status === "success" ? batchesQuery.data.data : []
  const feedingRecords = feedingRecordsQuery.data?.status === "success" ? feedingRecordsQuery.data.data : []
  const inventoryRows = inventoryQuery.data?.status === "success" ? inventoryQuery.data.data : []
  const efcrTrend = efcrTrendQuery.data?.status === "success" ? efcrTrendQuery.data.data : []
  const loading =
    feedIncomingQuery.isLoading ||
    feedTypesQuery.isLoading ||
    feedingRecordsQuery.isLoading ||
    inventoryQuery.isLoading ||
    efcrTrendQuery.isLoading
  const errorMessages = [
    getErrorMessage(feedIncomingQuery.error),
    getQueryResultError(feedIncomingQuery.data),
    getErrorMessage(feedTypesQuery.error),
    getQueryResultError(feedTypesQuery.data),
    getErrorMessage(feedingRecordsQuery.error),
    getQueryResultError(feedingRecordsQuery.data),
    getErrorMessage(inventoryQuery.error),
    getQueryResultError(inventoryQuery.data),
    getErrorMessage(efcrTrendQuery.error),
    getQueryResultError(efcrTrendQuery.data),
    getErrorMessage(systemsQuery.error),
    getQueryResultError(systemsQuery.data),
    getErrorMessage(batchSystemsQuery.error),
    getQueryResultError(batchSystemsQuery.data),
    getErrorMessage(batchesQuery.error),
    getQueryResultError(batchesQuery.data),
  ].filter(Boolean) as string[]
  const isFetching =
    feedIncomingQuery.isFetching ||
    feedTypesQuery.isFetching ||
    feedingRecordsQuery.isFetching ||
    inventoryQuery.isFetching ||
    efcrTrendQuery.isFetching

  const latestUpdatedAt = Math.max(
    feedIncomingQuery.dataUpdatedAt ?? 0,
    feedingRecordsQuery.dataUpdatedAt ?? 0,
    inventoryQuery.dataUpdatedAt ?? 0,
    efcrTrendQuery.dataUpdatedAt ?? 0,
    systemsQuery.dataUpdatedAt ?? 0,
  )

  const systemNameById = useMemo(() => {
    const map = new Map<number, string>()
    systems.forEach((row) => {
      if (row.id == null) return
      map.set(row.id, row.label ?? `System ${row.id}`)
    })
    return map
  }, [systems])

  const batchNameById = useMemo(() => {
    const map = new Map<number, string>()
    batches.forEach((row) => {
      if (row.id == null) return
      map.set(row.id, row.label ?? `Batch ${row.id}`)
    })
    return map
  }, [batches])

  const filteredIncoming = useMemo(() => {
    if (!hasBounds) return []
    return feedData.filter((row) => (!dateFrom || row.date >= dateFrom) && (!dateTo || row.date <= dateTo))
  }, [dateFrom, dateTo, feedData, hasBounds])

  const filteredFeedingRecords = useMemo(
    () => feedingRecords.filter((row) => row.system_id != null && scopedSystemIds.has(row.system_id)),
    [feedingRecords, scopedSystemIds],
  )
  const attentionFeedingRecords = useMemo(
    () => filteredFeedingRecords.filter((row) => isAttentionResponse(row.feeding_response)),
    [filteredFeedingRecords],
  )

  const feedTypeMix = useMemo(() => {
    const byType = new Map<string, { protein: number; fat: number; amount: number; label: string }>()
    filteredFeedingRecords.forEach((row) => {
      const key = String(row.feed_type_id ?? "unknown")
      const current = byType.get(key) ?? {
        protein: 0,
        fat: 0,
        amount: 0,
        label: row.feed_type?.label ?? row.feed_type?.feed_line ?? `Feed ${row.feed_type_id ?? "N/A"}`,
      }
      const amount = row.feeding_amount ?? 0
      const protein = row.feed_type?.crude_protein_percentage ?? 0
      const fat = row.feed_type?.crude_fat_percentage ?? 0
      current.amount += amount
      current.protein += protein * amount
      current.fat += fat * amount
      byType.set(key, current)
    })

    const rows = Array.from(byType.values()).map((row) => ({
      feedType: row.label,
      proteinContent: row.amount > 0 ? row.protein / row.amount : 0,
      crudeFat: row.amount > 0 ? row.fat / row.amount : 0,
      amount: row.amount,
    }))
    const visibleRows = rows.filter((row) => !isHiddenFeedType(row.feedType))
    const totalAmount = visibleRows.reduce((sum, row) => sum + row.amount, 0)
    return visibleRows
      .map((row) => ({ ...row, share: totalAmount > 0 ? row.amount / totalAmount : 0 }))
      .sort((a, b) => b.amount - a.amount)
  }, [filteredFeedingRecords])

  const weightedNutrition = useMemo(() => {
    const totalAmount = feedTypeMix.reduce((sum, row) => sum + row.amount, 0)
    const weightedProtein =
      totalAmount > 0 ? feedTypeMix.reduce((sum, row) => sum + row.proteinContent * row.amount, 0) / totalAmount : 0
    const weightedFat =
      totalAmount > 0 ? feedTypeMix.reduce((sum, row) => sum + row.crudeFat * row.amount, 0) / totalAmount : 0
    return { totalAmount, weightedProtein, weightedFat }
  }, [feedTypeMix])

  const scopedInventoryRows = useMemo(
    () => inventoryRows.filter((row) => row.system_id != null && scopedSystemIds.has(row.system_id)),
    [inventoryRows, scopedSystemIds],
  )

  const inventoryTrend = useMemo(() => {
    const byDate = new Map<
      string,
      { feeding: number; biomass: number; mortality: number; fish: number; feedRateWeighted: number; feedRateWeight: number }
    >()
    scopedInventoryRows.forEach((row) => {
      if (!row.inventory_date) return
      const current = byDate.get(row.inventory_date) ?? {
        feeding: 0,
        biomass: 0,
        mortality: 0,
        fish: 0,
        feedRateWeighted: 0,
        feedRateWeight: 0,
      }
      const feeding = row.feeding_amount ?? row.feeding_amount_aggregated ?? 0
      const biomass = row.biomass_last_sampling ?? 0
      const fish = row.number_of_fish ?? 0
      const mortality = row.number_of_fish_mortality ?? 0
      current.feeding += feeding
      current.biomass += biomass
      current.fish += fish
      current.mortality += mortality
      if (typeof row.feeding_rate === "number" && Number.isFinite(row.feeding_rate) && biomass > 0) {
        current.feedRateWeighted += row.feeding_rate * biomass
        current.feedRateWeight += biomass
      }
      byDate.set(row.inventory_date, current)
    })
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => {
        const feedRate =
          value.feedRateWeight > 0
            ? value.feedRateWeighted / value.feedRateWeight
            : value.biomass > 0
              ? (value.feeding * 1000) / value.biomass
              : null
        const mortalityRate = value.fish > 0 ? value.mortality / value.fish : null
        const feedPerFish = value.fish > 0 ? value.feeding / value.fish : null
        return {
          date,
          feeding: value.feeding,
          biomass: value.biomass,
          mortality: value.mortality,
          fish: value.fish,
          feedRate,
          mortalityRate,
          feedPerFish,
        }
      })
  }, [scopedInventoryRows])

  const inventoryTrendWithExpected = useMemo(() => {
    const rows = inventoryTrend.map((row) => ({
      ...row,
      label: formatDayLabel(row.date),
    }))
    const mean = rows.length > 0 ? rows.reduce((sum, row) => sum + row.feeding, 0) / rows.length : 0
    const variance =
      rows.length > 1 ? rows.reduce((sum, row) => sum + (row.feeding - mean) * (row.feeding - mean), 0) / rows.length : 0
    const stdDev = Math.sqrt(variance)
    const rollingWindow = 7

    return rows.map((row, index) => {
      const start = Math.max(0, index - rollingWindow + 1)
      const windowRows = rows.slice(start, index + 1)
      const expected = windowRows.reduce((sum, item) => sum + item.feeding, 0) / Math.max(windowRows.length, 1)
      const zScore = stdDev > 0 ? (row.feeding - mean) / stdDev : 0
      return {
        ...row,
        expected,
        zScore,
      }
    })
  }, [inventoryTrend])

  const inventoryContextStats = useMemo(() => {
    const latest = inventoryTrendWithExpected[inventoryTrendWithExpected.length - 1]
    if (!latest) {
      return {
        feedRate: null,
        biomass: null,
        mortalityRate: null,
        feedPer1kFish: null,
      }
    }
    const feedPer1kFish = latest.feedPerFish != null ? latest.feedPerFish * 1000 : null
    return {
      feedRate: latest.feedRate ?? null,
      biomass: latest.biomass ?? null,
      mortalityRate: latest.mortalityRate ?? null,
      feedPer1kFish,
    }
  }, [inventoryTrendWithExpected])

  const anomalyRows = useMemo(() => {
    const values = filteredFeedingRecords
      .map((row) => row.feeding_amount)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    const mean = values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
    const variance =
      values.length > 1 ? values.reduce((sum, value) => sum + (value - mean) * (value - mean), 0) / values.length : 0
    const stdDev = Math.sqrt(variance)

    return filteredFeedingRecords
      .map((record) => {
        const amount = record.feeding_amount ?? 0
        const zScore = stdDev > 0 ? (amount - mean) / stdDev : 0
        return {
          id: record.id,
          createdAt: record.created_at,
          date: record.date,
          systemLabel: systemNameById.get(record.system_id) ?? `System ${record.system_id}`,
          feedType: record.feed_type?.label ?? record.feed_type?.feed_line ?? `Feed ${record.feed_type_id ?? "N/A"}`,
          amount,
          response: record.feeding_response,
          zScore,
          anomaly: stdDev > 0 && Math.abs(zScore) > 2,
        }
      })
      .filter((row) => row.anomaly)
      .sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore))
  }, [filteredFeedingRecords, systemNameById])

  const feedTypeUsageSeries = useMemo(() => {
    const topTypes = feedTypeMix.slice(0, 4)
    return topTypes.map((row, index) => ({
      key: `t${index}`,
      label: row.feedType,
      feedType: row.feedType,
      color: FEED_USAGE_COLORS[index % FEED_USAGE_COLORS.length],
    }))
  }, [feedTypeMix])

  type FeedUsageTrendDatum = { date: string; [key: string]: number | string }
  type FeedUsageTrendRow = { date: string; label: string; [key: string]: number | string }

  const feedTypeUsageTrend = useMemo<FeedUsageTrendRow[]>(() => {
    if (feedTypeUsageSeries.length === 0) return [] as FeedUsageTrendRow[]
    const topLabels = new Map(feedTypeUsageSeries.map((row) => [row.feedType, row.key]))
    const byDate = new Map<string, FeedUsageTrendDatum>()
    filteredFeedingRecords.forEach((record) => {
      if (!record.date) return
      const feedLabel = record.feed_type?.label ?? record.feed_type?.feed_line ?? `Feed ${record.feed_type_id ?? "N/A"}`
      const key = topLabels.get(feedLabel)
      if (!key) return
      const current = byDate.get(record.date) ?? { date: record.date }
      const previous = typeof current[key] === "number" ? current[key] : 0
      current[key] = previous + (record.feeding_amount ?? 0)
      byDate.set(record.date, current)
    })
    return Array.from(byDate.values())
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .map((row) => ({
        ...row,
        label: formatDayLabel(String(row.date)),
      }))
  }, [feedTypeUsageSeries, filteredFeedingRecords])

  const scopedEfcrRows = useMemo(
    () => efcrTrend.filter((row) => row.system_id != null && scopedSystemIds.has(row.system_id)),
    [efcrTrend, scopedSystemIds],
  )

  const efcrChartData = useMemo(() => {
    const byDate = new Map<string, { total: number; count: number }>()
    scopedEfcrRows.forEach((row) => {
      if (!row.inventory_date) return
      const value = row.efcr_period_last_sampling ?? 0
      const current = byDate.get(row.inventory_date) ?? { total: 0, count: 0 }
      current.total += value
      current.count += 1
      byDate.set(row.inventory_date, current)
    })
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({
        date,
        label: formatDayLabel(date),
        efcr: value.count > 0 ? value.total / value.count : 0,
      }))
  }, [scopedEfcrRows])

  const efcrStats = useMemo(() => {
    const latest = efcrChartData[efcrChartData.length - 1]?.efcr ?? null
    const best = efcrChartData.length > 0 ? Math.min(...efcrChartData.map((row) => row.efcr)) : null
    const avg = efcrChartData.length > 0 ? efcrChartData.reduce((sum, row) => sum + row.efcr, 0) / efcrChartData.length : null
    return { latest, best, avg }
  }, [efcrChartData])

  const exportAnomalyCsv = () => {
    if (anomalyRows.length === 0) return
    const header = ["created_at", "date", "system", "feed_type", "feeding_amount_kg", "response", "z_score"]
    const lines = anomalyRows.map((row) =>
      [
        row.createdAt,
        row.date,
        row.systemLabel,
        row.feedType,
        row.amount.toFixed(2),
        row.response,
        row.zScore.toFixed(2),
      ].join(","),
    )
    const csv = [header.join(","), ...lines].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `feed_anomaly_report_${toIsoDate(new Date())}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-lg border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold">Feed Management</h1>
              <p className="text-muted-foreground mt-1">Daily feed logging, eFCR efficiency, nutrition analysis, and anomaly detection</p>
            </div>
            <div className="flex flex-col items-end gap-1 text-xs">
              <DataUpdatedAt updatedAt={latestUpdatedAt} />
              <DataFetchingBadge isFetching={isFetching} isLoading={loading} />
            </div>
          </div>

        </div>

        {errorMessages.length > 0 ? (
          <DataErrorState
            title="Unable to load feed analytics"
            description={errorMessages[0]}
            onRetry={() => {
              feedIncomingQuery.refetch()
              feedTypesQuery.refetch()
              feedingRecordsQuery.refetch()
              inventoryQuery.refetch()
              efcrTrendQuery.refetch()
              systemsQuery.refetch()
              batchSystemsQuery.refetch()
              batchesQuery.refetch()
            }}
          />
        ) : null}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-4"><p className="text-xs text-muted-foreground">Weighted Protein</p><p className="text-2xl font-bold mt-1">{weightedNutrition.weightedProtein.toFixed(1)}%</p></div>
          <div className="bg-card border border-border rounded-lg p-4"><p className="text-xs text-muted-foreground">Weighted Crude Fat</p><p className="text-2xl font-bold mt-1">{weightedNutrition.weightedFat.toFixed(1)}%</p></div>
          <div className="bg-card border border-border rounded-lg p-4"><p className="text-xs text-muted-foreground">Current eFCR</p><p className="text-2xl font-bold mt-1">{efcrStats.latest != null ? efcrStats.latest.toFixed(2) : "N/A"}</p></div>
        </div>

        <FeedEfcrSection loading={loading} efcrChartData={efcrChartData} efcrStats={efcrStats} />
        <FeedNutritionSection
          loading={loading}
          feedTypeMix={feedTypeMix}
          usageTrendRows={feedTypeUsageTrend}
          usageSeries={feedTypeUsageSeries}
        />
        <FeedAnomaliesSection
          loading={loading}
          trendData={inventoryTrendWithExpected}
          anomalyRows={anomalyRows}
          trendStats={inventoryContextStats}
          onExport={exportAnomalyCsv}
        />
        <FeedAttentionTable
          loading={loading}
          attentionFeedingRecords={attentionFeedingRecords}
          systemNameById={systemNameById}
          batchNameById={batchNameById}
        />
        <FeedIncomingInventoryTable loading={loading} filteredIncoming={filteredIncoming} />
      </div>
    </DashboardLayout>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import FarmSelector from "@/components/shared/farm-selector"
import { type FeedIncomingWithType } from "@/lib/api/reports"
import { useFeedIncoming, useFeedingRecords, useFeedTypes } from "@/lib/hooks/use-reports"
import { useEfcrTrend } from "@/lib/hooks/use-production"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { useSharedFilters } from "@/hooks/use-shared-filters"
import { useBatchOptions } from "@/lib/hooks/use-options"
import TimePeriodSelector from "@/components/shared/time-period-selector"
import { getDateRangeFromPeriod } from "@/lib/utils"
import { useScopedSystemIds } from "@/lib/hooks/use-scoped-system-ids"
import { formatDayLabel, isAttentionResponse, toIsoDate, toNumber } from "./feed-utils"
import {
  FeedAnomaliesSection,
  FeedAttentionTable,
  FeedEfcrSection,
  FeedIncomingInventoryTable,
  FeedNutritionSection,
} from "./feed-sections"

export default function FeedManagementPage() {
  const { farmId } = useActiveFarm()
  const {
    selectedBatch,
    setSelectedBatch,
    selectedSystem,
    setSelectedSystem,
    selectedStage,
    setSelectedStage,
    timePeriod,
    setTimePeriod,
  } = useSharedFilters("quarter")
  const [efcrTarget, setEfcrTarget] = useState<string>("1.4")
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

  const feedIncomingQuery = useFeedIncoming({ limit: 1000 })
  const feedTypesQuery = useFeedTypes()
  const batchesQuery = useBatchOptions({ farmId })

  const feedingQueryEnabled = hasSystem || scopedSystemIdList.length > 0

  const asOfFeedingQuery = useFeedingRecords({
    systemId: hasSystem ? (systemId as number) : undefined,
    systemIds: !hasSystem ? scopedSystemIdList : undefined,
    batchId: Number.isFinite(batchId) ? (batchId as number) : undefined,
    limit: 1,
    enabled: feedingQueryEnabled,
  })
  const asOfDate = useMemo(() => {
    const rows = asOfFeedingQuery.data?.status === "success" ? asOfFeedingQuery.data.data : []
    return rows[0]?.date ?? null
  }, [asOfFeedingQuery.data])
  const { startDate: dateFrom, endDate: dateTo } = useMemo(
    () => getDateRangeFromPeriod(timePeriod, asOfDate),
    [asOfDate, timePeriod],
  )
  const feedingRecordsQuery = useFeedingRecords({
    systemId: hasSystem ? (systemId as number) : undefined,
    systemIds: !hasSystem ? scopedSystemIdList : undefined,
    batchId: Number.isFinite(batchId) ? (batchId as number) : undefined,
    dateFrom,
    dateTo,
    limit: 5000,
    enabled: feedingQueryEnabled,
  })
  const efcrTrendQuery = useEfcrTrend({
    farmId,
    systemId: hasSystem ? (systemId as number) : undefined,
    dateFrom,
    dateTo,
    limit: 5000,
    enabled: true,
  })

  const feedData = (feedIncomingQuery.data?.status === "success" ? feedIncomingQuery.data.data : []) as FeedIncomingWithType[]
  const systems = systemsQuery.data?.status === "success" ? systemsQuery.data.data : []
  const batches = batchesQuery.data?.status === "success" ? batchesQuery.data.data : []
  const feedingRecords = feedingRecordsQuery.data?.status === "success" ? feedingRecordsQuery.data.data : []
  const efcrTrend = efcrTrendQuery.data?.status === "success" ? efcrTrendQuery.data.data : []
  const loading = feedIncomingQuery.isLoading || feedTypesQuery.isLoading || feedingRecordsQuery.isLoading || efcrTrendQuery.isLoading

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

  useEffect(() => {
    if (!farmId || typeof window === "undefined") return
    const key = `feed_efcr_target_${farmId}_${selectedSystem}_${selectedBatch}`
    const saved = window.localStorage.getItem(key)
    if (saved) setEfcrTarget(saved)
  }, [farmId, selectedBatch, selectedSystem])

  const filteredIncoming = useMemo(
    () => feedData.filter((row) => (!dateFrom || row.date >= dateFrom) && (!dateTo || row.date <= dateTo)),
    [dateFrom, dateTo, feedData],
  )

  const proteinChartData = useMemo(() => {
    const byType = new Map<string, { protein: number; fat: number; amount: number; label: string }>()
    filteredIncoming.forEach((row) => {
      const key = String(row.feed_type_id ?? "unknown")
      const current = byType.get(key) ?? {
        protein: 0,
        fat: 0,
        amount: 0,
        label: row.feed_type?.feed_line ?? `Feed ${row.feed_type_id ?? "N/A"}`,
      }
      const amount = row.feed_amount ?? 0
      const protein = row.feed_type?.crude_protein_percentage ?? 0
      const fat = row.feed_type?.crude_fat_percentage ?? 0
      current.amount += amount
      current.protein += protein * amount
      current.fat += fat * amount
      byType.set(key, current)
    })

    return Array.from(byType.values()).map((row) => ({
      feedType: row.label,
      proteinContent: row.amount > 0 ? row.protein / row.amount : 0,
      crudeFat: row.amount > 0 ? row.fat / row.amount : 0,
      amount: row.amount,
    }))
  }, [filteredIncoming])

  const weightedNutrition = useMemo(() => {
    const totalAmount = proteinChartData.reduce((sum, row) => sum + row.amount, 0)
    const weightedProtein = totalAmount > 0 ? proteinChartData.reduce((sum, row) => sum + row.proteinContent * row.amount, 0) / totalAmount : 0
    const weightedFat = totalAmount > 0 ? proteinChartData.reduce((sum, row) => sum + row.crudeFat * row.amount, 0) / totalAmount : 0
    return { totalAmount, weightedProtein, weightedFat }
  }, [proteinChartData])
  const filteredFeedingRecords = useMemo(
    () => feedingRecords.filter((row) => row.system_id != null && scopedSystemIds.has(row.system_id)),
    [feedingRecords, scopedSystemIds],
  )
  const attentionFeedingRecords = useMemo(
    () => filteredFeedingRecords.filter((row) => isAttentionResponse(row.feeding_response)),
    [filteredFeedingRecords],
  )

  const dailyFeedingTrend = useMemo(() => {
    const byDate = new Map<string, number>()
    filteredFeedingRecords.forEach((row) => {
      if (!row.date) return
      byDate.set(row.date, (byDate.get(row.date) ?? 0) + (row.feeding_amount ?? 0))
    })
    const rows = Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, feeding]) => ({ date, feeding }))
    const mean = rows.length > 0 ? rows.reduce((sum, row) => sum + row.feeding, 0) / rows.length : 0
    const variance = rows.length > 1 ? rows.reduce((sum, row) => sum + (row.feeding - mean) * (row.feeding - mean), 0) / rows.length : 0
    const stdDev = Math.sqrt(variance)
    const rollingWindow = 7

    return rows.map((row, index) => {
      const start = Math.max(0, index - rollingWindow + 1)
      const windowRows = rows.slice(start, index + 1)
      const expected = windowRows.reduce((sum, item) => sum + item.feeding, 0) / Math.max(windowRows.length, 1)
      const zScore = stdDev > 0 ? (row.feeding - mean) / stdDev : 0
      const anomaly = stdDev > 0 && Math.abs(zScore) > 2
      return {
        ...row,
        label: formatDayLabel(row.date),
        expected,
        zScore,
        anomaly,
      }
    })
  }, [filteredFeedingRecords])

  const anomalyRows = useMemo(() => dailyFeedingTrend.filter((row) => row.anomaly), [dailyFeedingTrend])

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
    const target = toNumber(efcrTarget)
    const gap = latest != null && target != null ? latest - target : null
    return { latest, best, avg, target, gap }
  }, [efcrChartData, efcrTarget])

  const saveEfcrTarget = () => {
    if (!farmId || typeof window === "undefined") return
    const key = `feed_efcr_target_${farmId}_${selectedSystem}_${selectedBatch}`
    window.localStorage.setItem(key, efcrTarget)
  }

  const exportAnomalyCsv = () => {
    if (anomalyRows.length === 0) return
    const header = ["date", "actual_feeding_kg", "expected_feeding_kg", "z_score", "deviation_kg"]
    const lines = anomalyRows.map((row) =>
      [row.date, row.feeding.toFixed(2), row.expected.toFixed(2), row.zScore.toFixed(2), (row.feeding - row.expected).toFixed(2)].join(","),
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
          <div>
            <h1 className="text-3xl font-bold">Feed Management</h1>
            <p className="text-muted-foreground mt-1">Daily feed logging, eFCR efficiency, nutrition analysis, and anomaly detection</p>
          </div>

          <FarmSelector
            selectedBatch={selectedBatch}
            selectedSystem={selectedSystem}
            selectedStage={selectedStage}
            onBatchChange={setSelectedBatch}
            onSystemChange={setSelectedSystem}
            onStageChange={setSelectedStage}
          />
        </div>

        <div className="rounded-lg border border-border/80 bg-card p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Period</label>
              <TimePeriodSelector selectedPeriod={timePeriod} onPeriodChange={setTimePeriod} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Target eFCR</label>
              <input type="number" step="0.01" value={efcrTarget} onChange={(event) => setEfcrTarget(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" />
            </div>
            <div className="flex items-end">
              <button type="button" onClick={saveEfcrTarget} className="h-9 w-full rounded-md bg-primary text-primary-foreground text-sm font-semibold">Save Target</button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4"><p className="text-xs text-muted-foreground">Weighted Protein</p><p className="text-2xl font-bold mt-1">{weightedNutrition.weightedProtein.toFixed(1)}%</p></div>
          <div className="bg-card border border-border rounded-lg p-4"><p className="text-xs text-muted-foreground">Weighted Crude Fat</p><p className="text-2xl font-bold mt-1">{weightedNutrition.weightedFat.toFixed(1)}%</p></div>
          <div className="bg-card border border-border rounded-lg p-4"><p className="text-xs text-muted-foreground">Current eFCR</p><p className="text-2xl font-bold mt-1">{efcrStats.latest != null ? efcrStats.latest.toFixed(2) : "N/A"}</p></div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Target Gap</p>
            <p className={`text-2xl font-bold mt-1 ${efcrStats.gap == null ? "text-foreground" : efcrStats.gap <= 0 ? "text-chart-2" : "text-destructive"}`}>
              {efcrStats.gap != null ? `${efcrStats.gap > 0 ? "+" : ""}${efcrStats.gap.toFixed(2)}` : "N/A"}
            </p>
          </div>
        </div>

        <FeedEfcrSection loading={loading} efcrChartData={efcrChartData} efcrStats={efcrStats} />
        <FeedNutritionSection loading={loading} proteinChartData={proteinChartData} />
        <FeedAnomaliesSection loading={loading} dailyFeedingTrend={dailyFeedingTrend} anomalyRows={anomalyRows} onExport={exportAnomalyCsv} />
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

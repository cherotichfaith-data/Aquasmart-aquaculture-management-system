"use client"

import { useMemo, useState } from "react"
import type { ChartData, ChartOptions } from "chart.js"
import {
  buildCartesianOptions,
  getChartPalette,
} from "@/components/charts/chartjs-theme"
import { formatNumberValue } from "@/lib/analytics-format"
import type { Database } from "@/lib/types/database"
import type { FeedRunningStockRow, FeedingRecordWithType } from "@/lib/api/reports"
import type { DailyInventoryRow } from "@/features/feed/types"
import type { TimePeriod } from "@/lib/time-period"
import { diffDateDays, formatBucketLabel, formatGranularityLabel, getBucketGranularity, getBucketKey } from "@/lib/time-series"
import SystemHistorySheet from "@/components/systems/system-history-sheet"
import {
  type FeedExceptionItem,
} from "../_lib/feed-sections"
import { normalizeFeedingResponse, type FcrInterval, type FeedRatePoint } from "../_lib/feed-analytics"
import { formatFeedTypeLabel } from "../_lib/feed-page"
import {
  FeedAnalyticsSection,
  FeedCagesSection,
  FeedDashboardError,
  FeedDashboardTabs,
  FeedOperationsSection,
  FeedOverviewSection,
  type SectionKey,
} from "./feed-dashboard-sections"

type ProductionRow = Database["public"]["Functions"]["api_production_summary"]["Returns"][number]

type GrowthRow = {
  system_id: number
  sample_date: string
  abw_g: number
  prev_abw_g: number
  sgr_pct_day: number
}

type MeasurementRow = {
  system_id: number | null
  date: string | null
  parameter_value: number | null
}

const RESPONSE_COLORS: Record<string, string> = {
  Excellent: "#3b82f6",
  Good: "#16a34a",
  Fair: "#f59e0b",
  Poor: "#dc2626",
}

const getMaxNumber = (values: Array<number | null | undefined>, fallback = 1) => {
  const numeric = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value))
  return numeric.length ? Math.max(...numeric) : fallback
}

function formatMetric(value: number | null | undefined, decimals = 1) {
  return formatNumberValue(value, { decimals, fallback: "N/A" })
}

export function FeedDashboard({
  timePeriod,
  errorMessage,
  onRetry,
  loading,
  scopedSystemIdList,
  systemNameById,
  exceptionItems,
  runningStockRows,
  feedingRecords,
  inventoryRows,
  productionRows,
  growthRows,
  measurements,
  feedRatePoints,
  fcrIntervals,
  heatmapDates,
  matrixCells,
  selectedHistorySystemId,
  onSelectedHistorySystemIdChange,
  farmId,
  dateFrom,
  dateTo,
}: {
  timePeriod: TimePeriod
  errorMessage: string | null
  onRetry: () => void
  loading: boolean
  scopedSystemIdList: number[]
  systemNameById: Map<number, string>
  exceptionItems: FeedExceptionItem[]
  runningStockRows: FeedRunningStockRow[]
  feedingRecords: FeedingRecordWithType[]
  inventoryRows: DailyInventoryRow[]
  productionRows: ProductionRow[]
  growthRows: GrowthRow[]
  measurements: MeasurementRow[]
  feedRatePoints: FeedRatePoint[]
  fcrIntervals: FcrInterval[]
  heatmapDates: string[]
  matrixCells: any[]
  selectedHistorySystemId: number | null
  onSelectedHistorySystemIdChange: (value: number | null) => void
  farmId: string | null
  dateFrom: string | null
  dateTo: string | null
}) {
  const [section, setSection] = useState<SectionKey>("overview")
  const trendGranularity = useMemo(() => getBucketGranularity(timePeriod), [timePeriod])
  const trendGranularityLabel = useMemo(() => formatGranularityLabel(trendGranularity), [trendGranularity])
  const overviewTimeAxisTitle = useMemo(() => {
    if (trendGranularity === "month") return "Month"
    if (trendGranularity === "quarter") return "Quarter"
    return "Date"
  }, [trendGranularity])

  const overviewTotals = useMemo(() => {
    const totalFeedKg = feedingRecords.reduce((sum, row) => sum + (row.feeding_amount ?? 0), 0)
    const totalHarvestKg = productionRows.reduce((sum, row) => sum + (row.total_weight_harvested ?? 0), 0)
    const totalMortality = productionRows.reduce((sum, row) => sum + (row.daily_mortality_count ?? 0), 0)
    const crudeFcr = totalHarvestKg > 0 ? totalFeedKg / totalHarvestKg : null
    return { totalFeedKg, totalHarvestKg, totalMortality, crudeFcr }
  }, [feedingRecords, productionRows])

  const overviewRows = useMemo(() => {
    const map = new Map<
      string,
      { bucket: string; feedKg: number; harvestKg: number; mortalityFish: number; doSum: number; doCount: number }
    >()
    feedingRecords.forEach((row) => {
      const key = getBucketKey(row.date, trendGranularity)
      if (!key) return
      const current = map.get(key) ?? { bucket: key, feedKg: 0, harvestKg: 0, mortalityFish: 0, doSum: 0, doCount: 0 }
      current.feedKg += row.feeding_amount ?? 0
      map.set(key, current)
    })
    productionRows.forEach((row) => {
      const key = getBucketKey(row.date, trendGranularity)
      if (!key) return
      const current = map.get(key) ?? { bucket: key, feedKg: 0, harvestKg: 0, mortalityFish: 0, doSum: 0, doCount: 0 }
      current.harvestKg += row.total_weight_harvested ?? 0
      current.mortalityFish += row.daily_mortality_count ?? 0
      map.set(key, current)
    })
    measurements.forEach((row) => {
      const key = getBucketKey(row.date, trendGranularity)
      if (!key || row.parameter_value == null) return
      const current = map.get(key) ?? { bucket: key, feedKg: 0, harvestKg: 0, mortalityFish: 0, doSum: 0, doCount: 0 }
      current.doSum += row.parameter_value
      current.doCount += 1
      map.set(key, current)
    })
    return Array.from(map.values())
      .sort((a, b) => a.bucket.localeCompare(b.bucket))
      .map((row) => ({
        ...row,
        label: formatBucketLabel(row.bucket, trendGranularity),
        doAvg: row.doCount > 0 ? row.doSum / row.doCount : null,
      }))
  }, [feedingRecords, measurements, productionRows, trendGranularity])

  const growthGroups = useMemo(() => {
    const map = new Map<number, GrowthRow[]>()
    growthRows.forEach((row) => {
      const list = map.get(row.system_id) ?? []
      list.push(row)
      map.set(row.system_id, list)
    })
    map.forEach((rows, systemId) => {
      map.set(
        systemId,
        rows.slice().sort((left, right) => String(left.sample_date).localeCompare(String(right.sample_date))),
      )
    })
    return map
  }, [growthRows])

  const latestInventoryBySystem = useMemo(() => {
    const map = new Map<number, DailyInventoryRow>()
    inventoryRows
      .slice()
      .sort((left, right) => String(right.inventory_date ?? "").localeCompare(String(left.inventory_date ?? "")))
      .forEach((row) => {
        if (row.system_id == null || map.has(row.system_id)) return
        map.set(row.system_id, row)
      })
    return map
  }, [inventoryRows])

  const cageRows = useMemo(() => {
    const feedBySystem = new Map<number, number>()
    feedingRecords.forEach((row) => {
      if (row.system_id == null) return
      feedBySystem.set(row.system_id, (feedBySystem.get(row.system_id) ?? 0) + (row.feeding_amount ?? 0))
    })

    const harvestBySystem = new Map<number, number>()
    const mortalityBySystem = new Map<number, number>()
    productionRows.forEach((row) => {
      if (row.system_id == null) return
      harvestBySystem.set(row.system_id, (harvestBySystem.get(row.system_id) ?? 0) + (row.total_weight_harvested ?? 0))
      mortalityBySystem.set(row.system_id, (mortalityBySystem.get(row.system_id) ?? 0) + (row.daily_mortality_count ?? 0))
    })

    return scopedSystemIdList.map((systemId) => {
      const growthSeries = growthGroups.get(systemId) ?? []
      const firstSample = growthSeries[0] ?? null
      const lastSample = growthSeries[growthSeries.length - 1] ?? null
      const latestInventory = latestInventoryBySystem.get(systemId) ?? null
      const initialAbw =
        firstSample?.prev_abw_g && firstSample.prev_abw_g > 0
          ? firstSample.prev_abw_g
          : firstSample?.abw_g ?? latestInventory?.abw_last_sampling ?? null
      const latestAbw = lastSample?.abw_g ?? latestInventory?.abw_last_sampling ?? null
      const overallDays = firstSample && lastSample ? diffDateDays(firstSample.sample_date, lastSample.sample_date) : null
      const overallSgr =
        initialAbw != null && latestAbw != null && overallDays != null && overallDays > 0 && initialAbw > 0 && latestAbw > 0
          ? ((Math.log(latestAbw) - Math.log(initialAbw)) / overallDays) * 100
          : lastSample?.sgr_pct_day ?? null
      const totalFeedKg = feedBySystem.get(systemId) ?? 0
      const totalHarvestKg = harvestBySystem.get(systemId) ?? 0
      const totalMortality = mortalityBySystem.get(systemId) ?? 0
      const crudeFcr = totalHarvestKg > 0 ? totalFeedKg / totalHarvestKg : null
      const status =
        totalHarvestKg > 0
          ? { label: "Harvested", tone: "good" as const }
          : (latestAbw ?? 0) >= 400
            ? { label: "Approaching market", tone: "warn" as const }
            : { label: "Growing", tone: "info" as const }

      return {
        systemId,
        label: systemNameById.get(systemId) ?? `System ${systemId}`,
        totalFeedKg,
        totalHarvestKg,
        crudeFcr,
        latestAbw,
        overallSgr,
        totalMortality,
        status,
        samples: growthSeries.length,
      }
    })
  }, [feedingRecords, growthGroups, latestInventoryBySystem, productionRows, scopedSystemIdList, systemNameById])

  const maxCageFeed = useMemo(() => Math.max(...cageRows.map((row) => row.totalFeedKg), 1), [cageRows])

  const responseRows = useMemo(() => {
    const counts = new Map<string, number>()
    feedingRecords.forEach((row) => {
      const normalized = normalizeFeedingResponse(row.feeding_response)
      if (!normalized) return
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
    })
    return ["Excellent", "Good", "Fair", "Poor"].map((label) => ({
      name: label,
      value: counts.get(label) ?? 0,
    }))
  }, [feedingRecords])

  const feedTypeRows = useMemo(() => {
    const totals = new Map<string, number>()
    feedingRecords.forEach((row) => {
      const label = formatFeedTypeLabel(row.feed_type ?? { id: row.feed_type_id })
      totals.set(label, (totals.get(label) ?? 0) + (row.feeding_amount ?? 0))
    })
    return Array.from(totals.entries())
      .map(([label, kg]) => ({ label, kg }))
      .sort((a, b) => b.kg - a.kg)
      .slice(0, 6)
  }, [feedingRecords])

  const feedTabMetrics = useMemo(() => {
    const feedNotInHarvestPct =
      overviewTotals.totalFeedKg > 0
        ? Math.max(0, ((overviewTotals.totalFeedKg - overviewTotals.totalHarvestKg) / overviewTotals.totalFeedKg) * 100)
        : null
    return { feedNotInHarvestPct }
  }, [overviewTotals.totalFeedKg, overviewTotals.totalHarvestKg])

  const operationsSummary = useMemo(() => {
    const criticalCount = exceptionItems.filter((item) => item.severity === "critical").length
    return {
      criticalCount,
      totalCount: exceptionItems.length,
    }
  }, [exceptionItems])

  const palette = getChartPalette()

  const overviewComparisonData = useMemo<ChartData<"bar">>(
    () => ({
      labels: overviewRows.map((row) => row.label),
      datasets: [
        {
          label: "Feed",
          data: overviewRows.map((row) => row.feedKg),
          backgroundColor: palette.chart1,
          borderRadius: 6,
        },
        {
          label: "Harvest",
          data: overviewRows.map((row) => row.harvestKg),
          backgroundColor: palette.chart2,
          borderRadius: 6,
        },
      ],
    }),
    [overviewRows, palette.chart1, palette.chart2],
  )

  const overviewComparisonOptions = useMemo<ChartOptions<"bar">>(
    () =>
      buildCartesianOptions({
        palette,
        legend: true,
        min: 0,
        max: Math.max(
          1,
          Math.ceil(
            getMaxNumber([
              ...overviewRows.map((row) => row.feedKg),
              ...overviewRows.map((row) => row.harvestKg),
            ]) * 1.12,
          ),
        ),
        xTitle: overviewTimeAxisTitle,
        yTitle: "Weight (kg)",
        xTickFormatter: (_value, index) => overviewRows[index]?.label ?? "",
        tooltip: {
          callbacks: {
            label: (context: any) => `${context.dataset.label}: ${formatMetric(Number(context.parsed.y), 1)} kg`,
          },
        },
      }),
    [overviewRows, overviewTimeAxisTitle, palette],
  )

  const overviewMortalityData = useMemo<ChartData<"bar">>(
    () => ({
      labels: overviewRows.map((row) => row.label),
      datasets: [
        {
          label: "Mortality",
          data: overviewRows.map((row) => row.mortalityFish),
          backgroundColor: overviewRows.map((row) =>
            row.mortalityFish > 250 ? "#dc2626" : row.mortalityFish > 50 ? "#f59e0b" : "#16a34a",
          ),
          borderRadius: 6,
        },
      ],
    }),
    [overviewRows],
  )

  const overviewMortalityOptions = useMemo<ChartOptions<"bar">>(
    () =>
      buildCartesianOptions({
        palette,
        min: 0,
        max: Math.max(1, Math.ceil(getMaxNumber(overviewRows.map((row) => row.mortalityFish)) * 1.12)),
        xTitle: overviewTimeAxisTitle,
        yTickFormatter: (value) => Number(value).toLocaleString(),
        yTitle: "Mortality (fish)",
        xTickFormatter: (_value, index) => overviewRows[index]?.label ?? "",
        tooltip: {
          callbacks: {
            label: (context: any) => `Mortality: ${formatMetric(Number(context.parsed.y), 0)}`,
          },
        },
      }),
    [overviewRows, overviewTimeAxisTitle, palette],
  )

  const doTrendData = useMemo<ChartData<"line">>(
    () => ({
      labels: overviewRows.map((row) => row.label),
      datasets: [
        {
          label: "DO mean",
          data: overviewRows.map((row) => row.doAvg),
          borderColor: palette.chart1,
          backgroundColor: palette.chart1,
          borderWidth: 2.5,
          pointRadius: 2,
          pointHoverRadius: 4,
          spanGaps: true,
        },
      ],
    }),
    [overviewRows, palette.chart1],
  )

  const doTrendOptions = useMemo<ChartOptions<"line">>(
    () =>
      buildCartesianOptions({
        palette,
        min: 0,
        max: Math.ceil((getMaxNumber(overviewRows.map((row) => row.doAvg)) + 0.5) * 100) / 100,
        xTitle: overviewTimeAxisTitle,
        yTitle: "DO (mg/L)",
        xTickFormatter: (_value, index) => overviewRows[index]?.label ?? "",
        tooltip: {
          callbacks: {
            label: (context: any) => `DO mean: ${formatMetric(Number(context.parsed.y), 2)} mg/L`,
          },
        },
      }),
    [overviewRows, overviewTimeAxisTitle, palette],
  )

  const harvestedCageRows = useMemo(
    () => cageRows.filter((row) => row.totalHarvestKg > 0 && row.crudeFcr != null),
    [cageRows],
  )

  const cageFcrData = useMemo<ChartData<any>>(
    () => ({
      labels: harvestedCageRows.map((row) => row.label),
      datasets: [
        {
          type: "bar",
          label: "Crude FCR",
          data: harvestedCageRows.map((row) => row.crudeFcr),
          backgroundColor: palette.chart3,
          yAxisID: "y",
        },
        {
          type: "line",
          label: "Benchmark 2.0",
          data: harvestedCageRows.map(() => 2),
          borderColor: palette.chart2,
          backgroundColor: palette.chart2,
          borderDash: [4, 4],
          borderWidth: 2,
          pointRadius: 0,
          yAxisID: "y",
        },
      ],
    }),
    [harvestedCageRows, palette.chart2, palette.chart3],
  )

  const cageFcrOptions = useMemo<ChartOptions<"bar">>(
    () =>
      buildCartesianOptions({
        palette,
        legend: true,
        min: 0,
        max: Math.max(
          2.4,
          Math.ceil(
            Math.max(2, getMaxNumber(harvestedCageRows.map((row) => row.crudeFcr))) * 1.15 * 10,
          ) / 10,
        ),
        xTitle: "Cage",
        yTitle: "Crude FCR",
        tooltip: {
          callbacks: {
            label: (context: any) => `${context.dataset.label}: ${formatMetric(Number(context.parsed.y), 2)}`,
          },
        },
      }),
    [harvestedCageRows, palette],
  )

  const feedInputData = useMemo<ChartData<"bar">>(
    () => ({
      labels: overviewRows.map((row) => row.label),
      datasets: [
        {
          label: "Feed",
          data: overviewRows.map((row) => row.feedKg),
          backgroundColor: palette.chart1,
          borderRadius: 6,
        },
      ],
    }),
    [overviewRows, palette.chart1],
  )

  const feedInputOptions = useMemo<ChartOptions<"bar">>(
    () =>
      buildCartesianOptions({
        palette,
        min: 0,
        max: Math.max(1, Math.ceil(getMaxNumber(overviewRows.map((row) => row.feedKg)) * 1.12)),
        xTitle: overviewTimeAxisTitle,
        yTitle: "Feed (kg)",
        xTickFormatter: (_value, index) => overviewRows[index]?.label ?? "",
        tooltip: {
          callbacks: {
            label: (context: any) => `Feed: ${formatMetric(Number(context.parsed.y), 1)} kg`,
          },
        },
      }),
    [overviewRows, overviewTimeAxisTitle, palette],
  )

  const responseData = useMemo<ChartData<"doughnut">>(
    () => ({
      labels: responseRows.map((row) => row.name),
      datasets: [
        {
          data: responseRows.map((row) => row.value),
          backgroundColor: responseRows.map((row) => RESPONSE_COLORS[row.name]),
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    }),
    [responseRows],
  )

  const responseOptions = useMemo<ChartOptions<"doughnut">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "58%",
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: {
            color: palette.muted,
            usePointStyle: true,
            pointStyle: "circle",
            boxWidth: 10,
            boxHeight: 10,
            padding: 14,
            font: { size: 11, weight: 500 },
          },
        },
        tooltip: {
          backgroundColor: palette.tooltipBackground,
          borderColor: palette.tooltipBorder,
          borderWidth: 1,
          titleColor: palette.tooltipForeground,
          bodyColor: palette.tooltipForeground,
          padding: 12,
          cornerRadius: 14,
          usePointStyle: true,
          callbacks: {
            label: (context: any) => `${context.label}: ${formatMetric(Number(context.parsed), 0)} sessions`,
          },
        },
      },
    }),
    [palette],
  )

  const feedTypeData = useMemo<ChartData<"bar">>(
    () => ({
      labels: feedTypeRows.map((row) => row.label),
      datasets: [
        {
          label: "Feed volume",
          data: feedTypeRows.map((row) => row.kg),
          backgroundColor: palette.chart4,
          borderRadius: 6,
        },
      ],
    }),
    [feedTypeRows, palette.chart4],
  )

  const feedTypeOptions = useMemo<ChartOptions<"bar">>(
    () =>
      buildCartesianOptions({
        palette,
        indexAxis: "y",
        xMin: 0,
        xMax: Math.max(1, Math.ceil(getMaxNumber(feedTypeRows.map((row) => row.kg)) * 1.12)),
        xTitle: "Feed volume (kg)",
        yTitle: "Feed type",
        tooltip: {
          callbacks: {
            label: (context: any) => `Feed volume: ${formatMetric(Number(context.parsed.x), 1)} kg`,
          },
        },
      }),
    [feedTypeRows, palette],
  )

  return (
    <>
      <FeedDashboardTabs section={section} onSectionChange={setSection} />

      {errorMessage ? <FeedDashboardError errorMessage={errorMessage} onRetry={onRetry} /> : null}

      {section === "overview" ? (
        <FeedOverviewSection
          overviewTotals={overviewTotals}
          overviewRows={overviewRows}
          trendGranularityLabel={trendGranularityLabel}
          overviewComparisonData={overviewComparisonData}
          overviewComparisonOptions={overviewComparisonOptions}
          overviewMortalityData={overviewMortalityData}
          overviewMortalityOptions={overviewMortalityOptions}
          doTrendData={doTrendData}
          doTrendOptions={doTrendOptions}
        />
      ) : null}

      {section === "cages" ? (
        <FeedCagesSection
          cageRows={cageRows}
          maxCageFeed={maxCageFeed}
          harvestedCageRows={harvestedCageRows}
          cageFcrData={cageFcrData}
          cageFcrOptions={cageFcrOptions}
          onSelectedHistorySystemIdChange={onSelectedHistorySystemIdChange}
        />
      ) : null}

      {section === "feed" ? (
        <FeedAnalyticsSection
          overviewTotals={overviewTotals}
          feedTabMetrics={feedTabMetrics}
          trendGranularityLabel={trendGranularityLabel}
          overviewRows={overviewRows}
          feedInputData={feedInputData}
          feedInputOptions={feedInputOptions}
          responseRows={responseRows}
          responseData={responseData}
          responseOptions={responseOptions}
          feedTypeRows={feedTypeRows}
          feedTypeData={feedTypeData}
          feedTypeOptions={feedTypeOptions}
          loading={loading}
          feedRatePoints={feedRatePoints}
          fcrIntervals={fcrIntervals}
          systemNameById={systemNameById}
        />
      ) : null}

      {section === "operations" ? (
        <FeedOperationsSection
          operationsSummary={operationsSummary}
          loading={loading}
          scopedSystemIdList={scopedSystemIdList}
          heatmapDates={heatmapDates}
          matrixCells={matrixCells}
          systemNameById={systemNameById}
          onSelectedHistorySystemIdChange={onSelectedHistorySystemIdChange}
          exceptionItems={exceptionItems}
          runningStockRows={runningStockRows}
        />
      ) : null}

      <SystemHistorySheet
        open={selectedHistorySystemId !== null}
        onOpenChange={(open) => !open && onSelectedHistorySystemIdChange(null)}
        farmId={farmId}
        systemId={selectedHistorySystemId}
        systemLabel={selectedHistorySystemId != null ? (systemNameById.get(selectedHistorySystemId) ?? null) : null}
        dateFrom={dateFrom ?? undefined}
        dateTo={dateTo ?? undefined}
      />
    </>
  )
}

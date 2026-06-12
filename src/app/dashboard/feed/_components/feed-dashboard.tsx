"use client"

import { useMemo } from "react"
import type { ChartData, ChartOptions } from "chart.js"
import { buildCartesianOptions, getChartPalette } from "@/components/charts/chartjs-theme"
import { formatNumberValue } from "@/lib/analytics-format"
import type { FeedingRecordWithType } from "@/lib/api/reports"
import type { TimePeriod } from "@/lib/time-period"
import { formatBucketLabel, formatGranularityLabel, getBucketGranularity, getBucketKey } from "@/lib/time-series"
import { FEEDING_RESPONSE_LEVEL_COLORS, type FeedingResponseLabel } from "@/lib/feeding-response"
import { normalizeFeedingResponse, type EfcrTrendPoint, type FeedRatePoint } from "../_lib/feed-analytics"
import { formatFeedTypeLabel } from "../_lib/feed-page"
import { FeedCoreSection, FeedDashboardError } from "./feed-dashboard-sections"

const getMaxNumber = (values: Array<number | null | undefined>, fallback = 1) => {
  const numeric = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value))
  return numeric.length ? Math.max(...numeric) : fallback
}

const formatMetric = (value: number | null | undefined, decimals = 1) =>
  formatNumberValue(value, { decimals, fallback: "N/A" })

export function FeedDashboard({
  timePeriod,
  errorMessage,
  onRetry,
  loading,
  systemNameById,
  feedingRecords,
  feedRatePoints,
  efcrTrendPoints,
}: {
  timePeriod: TimePeriod
  errorMessage: string | null
  onRetry: () => void
  loading: boolean
  systemNameById: Map<number, string>
  feedingRecords: FeedingRecordWithType[]
  feedRatePoints: FeedRatePoint[]
  efcrTrendPoints: EfcrTrendPoint[]
}) {
  const trendGranularity = useMemo(() => getBucketGranularity(timePeriod), [timePeriod])
  const trendGranularityLabel = useMemo(() => formatGranularityLabel(trendGranularity), [trendGranularity])
  const feedInputAxisTitle = useMemo(() => {
    if (trendGranularity === "month") return "Month"
    if (trendGranularity === "quarter") return "Quarter"
    return "Date"
  }, [trendGranularity])

  const feedInputRows = useMemo(() => {
    const buckets = new Map<string, { bucket: string; feedKg: number }>()
    feedingRecords.forEach((row) => {
      const key = getBucketKey(row.date, trendGranularity)
      if (!key) return
      const current = buckets.get(key) ?? { bucket: key, feedKg: 0 }
      current.feedKg += row.feeding_amount ?? 0
      buckets.set(key, current)
    })

    return Array.from(buckets.values())
      .sort((a, b) => a.bucket.localeCompare(b.bucket))
      .map((row) => ({
        ...row,
        label: formatBucketLabel(row.bucket, trendGranularity),
      }))
  }, [feedingRecords, trendGranularity])

  const responseRows = useMemo(() => {
    const counts = new Map<string, number>()
    feedingRecords.forEach((row) => {
      const normalized = normalizeFeedingResponse(row.feeding_response)
      if (!normalized) return
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
    })

    return (["No Response", "Low Appetite", "Ideal Appetite", "Good Appetite", "Aggressive Appetite"] as FeedingResponseLabel[]).map((label) => ({
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

  const palette = getChartPalette()

  const feedInputData = useMemo<ChartData<"bar">>(
    () => ({
      labels: feedInputRows.map((row) => row.label),
      datasets: [
        {
          label: "Feed",
          data: feedInputRows.map((row) => row.feedKg),
          backgroundColor: palette.chart1,
          borderRadius: 6,
        },
      ],
    }),
    [feedInputRows, palette.chart1],
  )

  const feedInputOptions = useMemo<ChartOptions<"bar">>(
    () =>
      buildCartesianOptions({
        palette,
        min: 0,
        max: Math.max(1, Math.ceil(getMaxNumber(feedInputRows.map((row) => row.feedKg)) * 1.12)),
        xTitle: feedInputAxisTitle,
        yTitle: "Feed (kg)",
        xTickFormatter: (_value, index) => feedInputRows[index]?.label ?? "",
        tooltip: {
          callbacks: {
            label: (context: any) => `Feed: ${formatMetric(Number(context.parsed.y), 1)} kg`,
          },
        },
      }),
    [feedInputAxisTitle, feedInputRows, palette],
  )

  const responseData = useMemo<ChartData<"doughnut">>(
    () => ({
      labels: responseRows.map((row) => row.name),
      datasets: [
        {
          data: responseRows.map((row) => row.value),
          backgroundColor: responseRows.map((row) => FEEDING_RESPONSE_LEVEL_COLORS[row.name]),
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
            title: () => "",
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
        yGrid: false,
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
      {errorMessage ? <FeedDashboardError errorMessage={errorMessage} onRetry={onRetry} /> : null}
      <FeedCoreSection
        trendGranularityLabel={trendGranularityLabel}
        feedInputRows={feedInputRows}
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
        efcrTrendPoints={efcrTrendPoints}
        systemNameById={systemNameById}
      />
    </>
  )
}

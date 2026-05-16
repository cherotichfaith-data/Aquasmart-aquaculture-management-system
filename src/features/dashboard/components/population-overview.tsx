"use client"

import { useEffect, useMemo, useState } from "react"
import type { ChartData, ChartOptions } from "chart.js"
import { Activity, Fish, Leaf } from "lucide-react"
import ButtonBase from "@mui/material/ButtonBase"
import CardContent from "@mui/material/CardContent"
import type { Enums } from "@/lib/types/database"
import type { TimePeriod } from "@/components/shared/time-period-selector"
import { Chart } from "@/components/charts/chartjs"
import { Card } from "@/components/app-ui/card"
import Select from "@mui/material/Select"
import MenuItem from "@mui/material/MenuItem"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useProductionTrend } from "@/lib/hooks/use-dashboard"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt, EmptyState } from "@/components/shared/data-states"
import { LazyRender } from "@/components/shared/lazy-render"
import { getErrorMessage } from "@/lib/utils/query-result"
import { formatChartDate, formatNumberValue } from "@/lib/analytics-format"
import {
  buildCartesianOptions,
  buildDailyDateDomain,
  buildMetricAxisBounds,
  createVerticalGradient,
  getChartPalette,
  getDateAxisMaxTicks,
  withAlpha,
} from "@/components/charts/chartjs-theme"
import { formatBucketLabel, getBucketGranularity, getBucketKey } from "@/lib/time-series"

function weightedAverage(values: Array<{ value: number | null | undefined; weight: number | null | undefined }>) {
  let weightedSum = 0
  let weightSum = 0
  let fallbackSum = 0
  let fallbackCount = 0

  values.forEach(({ value, weight }) => {
    if (typeof value !== "number" || !Number.isFinite(value)) return
    if (typeof weight === "number" && Number.isFinite(weight) && weight > 0) {
      weightedSum += value * weight
      weightSum += weight
      return
    }

    fallbackSum += value
    fallbackCount += 1
  })

  if (weightSum > 0) return weightedSum / weightSum
  if (fallbackCount > 0) return fallbackSum / fallbackCount
  return null
}

const CHART_PERIODS: TimePeriod[] = ["week", "2 weeks", "month", "quarter", "6 months", "year"]
const CHART_PERIOD_LABELS: Partial<Record<TimePeriod, string>> = {
  week: "Last 7 Days",
  "2 weeks": "Last 14 Days",
  month: "Last 30 Days",
  quarter: "Last 90 Days",
  "6 months": "Last 6 Months",
  year: "Last 12 Months",
}

type TrendMetricKey = "feedAmount" | "mortality" | "abw"

const TREND_METRICS: Array<{
  key: TrendMetricKey
  label: string
  icon: typeof Leaf
  paletteKey: "chart1" | "chart5" | "chart2"
}> = [
  { key: "feedAmount", label: "Feed", icon: Leaf, paletteKey: "chart1" },
  { key: "mortality", label: "Mortality", icon: Activity, paletteKey: "chart5" },
  { key: "abw", label: "ABW", icon: Fish, paletteKey: "chart2" },
]

export default function PopulationOverview({
  stage,
  batch,
  system,
  timePeriod: initialTimePeriod,
  scopedSystemIds,
  dateFrom,
  dateTo,
  farmId: initialFarmId,
  onTimePeriodChange,
  showHeaderTitle = true,
  showUpdatedAt = true,
}: {
  stage?: "all" | Enums<"system_growth_stage"> | null
  batch?: string
  system?: string
  timePeriod: TimePeriod
  scopedSystemIds?: number[] | null
  dateFrom?: string
  dateTo?: string
  farmId?: string | null
  onTimePeriodChange?: (period: TimePeriod) => void
  showHeaderTitle?: boolean
  showUpdatedAt?: boolean
}) {
  const { farmId: activeFarmId } = useActiveFarm()
  const [localTimePeriod, setLocalTimePeriod] = useState<TimePeriod>(initialTimePeriod)
  const [activeMetrics, setActiveMetrics] = useState<Record<TrendMetricKey, boolean>>({
    feedAmount: true,
    mortality: true,
    abw: true,
  })

  useEffect(() => {
    setLocalTimePeriod(initialTimePeriod)
  }, [initialTimePeriod])

  const timePeriod = localTimePeriod
  const palette = getChartPalette()
  const farmId = activeFarmId ?? initialFarmId
  const granularity = getBucketGranularity(timePeriod)
  const summaryQuery = useProductionTrend({
    farmId,
    stage: stage && stage !== "all" ? stage : undefined,
    batch: batch ?? "all",
    system,
    timePeriod,
    scopedSystemIds,
    dateFrom: dateFrom ?? null,
    dateTo: dateTo ?? null,
  })

  const chartRows = useMemo(() => {
    const rows = summaryQuery.data ?? []
    const byBucket = new Map<
      string,
      { label: string; mortality: number; feedAmount: number; abwRows: typeof rows }
    >()

    rows.forEach((row) => {
      if (!row.date) return
      const key = getBucketKey(row.date, granularity)
      if (!key) return
      const current = byBucket.get(key) ?? {
        label: formatBucketLabel(key, granularity),
        mortality: 0,
        feedAmount: 0,
        abwRows: [],
      }

      current.mortality += row.daily_mortality_count ?? 0
      current.feedAmount += row.total_feed_amount_period ?? 0
      current.abwRows.push(row)
      byBucket.set(key, current)
    })

    return Array.from(byBucket.entries())
      .map(([bucket, current]) => ({
        bucket,
        label: current.label,
        feedAmount: current.feedAmount,
        averageBodyWeight: weightedAverage(
          current.abwRows.map((row) => ({
            value: row.average_body_weight,
            weight: row.number_of_fish_inventory,
          })),
        ),
        mortalityCount: current.mortality,
      }))
      .sort((left, right) => left.bucket.localeCompare(right.bucket))
  }, [granularity, summaryQuery.data])

  const domain = useMemo(() => {
    if (granularity === "day") return buildDailyDateDomain(chartRows.map((row) => row.bucket))
    return chartRows.map((row) => row.bucket)
  }, [chartRows, granularity])
  const rowsByBucket = useMemo(() => new Map(chartRows.map((row) => [row.bucket, row])), [chartRows])
  const xLimit = granularity === "day" ? getDateAxisMaxTicks(domain.length) : Math.min(Math.max(domain.length, 4), 8)
  const feedAmountBounds = useMemo(
    () => buildMetricAxisBounds(chartRows.map((row) => row.feedAmount), { minFloor: 0, includeZero: true }),
    [chartRows],
  )
  const abwBounds = useMemo(
    () => buildMetricAxisBounds(chartRows.map((row) => row.averageBodyWeight), { minFloor: 0 }),
    [chartRows],
  )
  const mortalityBounds = useMemo(
    () => buildMetricAxisBounds(chartRows.map((row) => row.mortalityCount), { minFloor: 0, includeZero: true }),
    [chartRows],
  )
  const combinedData = useMemo<ChartData<"bar">>(
    () => ({
      labels: domain.map((bucket) => (granularity === "day" ? bucket : formatBucketLabel(bucket, granularity))),
      datasets: [
        {
          type: "bar",
          label: "Feed",
          data: domain.map((bucket) => rowsByBucket.get(bucket)?.feedAmount ?? null),
          borderColor: "#4472C4",
          backgroundColor: "#4472C4",
          borderWidth: 1,
          borderRadius: 0,
          borderSkipped: false,
          categoryPercentage: 0.76,
          barPercentage: activeMetrics.mortality ? 0.46 : 0.62,
          maxBarThickness: 28,
          order: 3,
          yAxisID: "y",
          hidden: !activeMetrics.feedAmount,
        },
        {
          type: "bar",
          label: "Mortality",
          data: domain.map((bucket) => rowsByBucket.get(bucket)?.mortalityCount ?? null),
          borderColor: "#ED7D31",
          backgroundColor: "#ED7D31",
          borderWidth: 1,
          borderRadius: 0,
          borderSkipped: false,
          categoryPercentage: 0.76,
          barPercentage: 0.46,
          maxBarThickness: 28,
          order: 3,
          yAxisID: "y2",
          hidden: !activeMetrics.mortality,
        },
        {
          type: "line",
          label: "ABW",
          data: domain.map((bucket) => rowsByBucket.get(bucket)?.averageBodyWeight ?? null),
          borderColor: "#70AD47",
          backgroundColor: "transparent",
          borderWidth: 2,
          fill: false,
          pointRadius: 3,
          pointHoverRadius: 4,
          pointBackgroundColor: "#70AD47",
          pointBorderColor: "#70AD47",
          pointBorderWidth: 1,
          spanGaps: true,
          clip: 0,
          order: 1,
          yAxisID: "yAbw",
          hidden: !activeMetrics.abw,
        },
      ],
    }) as ChartData<"bar">,
    [activeMetrics.abw, activeMetrics.feedAmount, activeMetrics.mortality, domain, granularity, palette.chart1, palette.chart2, palette.chart5, rowsByBucket],
  )

  const combinedOptions = useMemo<ChartOptions<"bar">>(
    () =>
      buildCartesianOptions<"bar">({
        palette,
        min: feedAmountBounds.min,
        max: feedAmountBounds.max,
        lockYBounds: true,
        xMaxTicksLimit: xLimit,
        yTitle: "Feed (kg)",
        yTickFormatter: (value) => formatNumberValue(Number(value), { decimals: 0 }),
        tooltip: {
          callbacks: {
            title: (items: any) =>
              String(items[0]?.label ?? ""),
            label: (context: any) => {
              const label = String(context.dataset.label ?? "")
              if (label === "Feed") {
                return `Feed: ${formatNumberValue(Number(context.parsed.y), { decimals: 1 })} kg`
              }
              if (label === "ABW") {
                return `ABW: ${formatNumberValue(Number(context.parsed.y), { decimals: 0 })} g`
              }
              return `Mortality: ${formatNumberValue(Number(context.parsed.y), { decimals: 0 })} fish`
            },
          },
        },
        xTickFormatter: (_value, index) =>
          granularity === "day"
            ? formatChartDate(String(domain[index] ?? ""), { month: "short", day: "numeric" })
            : formatBucketLabel(String(domain[index] ?? ""), granularity),
        extraScales: {
          y2: {
            position: "right",
            display: activeMetrics.mortality,
            min: mortalityBounds.min,
            max: mortalityBounds.max,
            grid: {
              drawOnChartArea: false,
              drawTicks: false,
            },
            border: {
              display: false,
            },
            ticks: {
              color: palette.muted,
              padding: 8,
              font: {
                size: 11,
                weight: 500,
              },
              callback: (value: number | string) => formatNumberValue(Number(value), { decimals: 0 }),
            },
            title: {
              display: true,
              text: "Mortality",
              color: palette.muted,
              font: {
                size: 11,
                weight: 500,
              },
            },
          },
          yAbw: {
            position: "right",
            display: activeMetrics.abw,
            min: abwBounds.min,
            max: abwBounds.max,
            offset: true,
            grid: {
              drawOnChartArea: false,
              drawTicks: false,
            },
            border: {
              display: false,
            },
            ticks: {
              color: palette.muted,
              padding: activeMetrics.mortality ? 34 : 8,
              font: {
                size: 11,
                weight: 500,
              },
              callback: (value: number | string) => formatNumberValue(Number(value), { decimals: 0 }),
            },
            title: {
              display: true,
              text: "ABW (g)",
              color: palette.muted,
              font: {
                size: 11,
                weight: 500,
              },
            },
          },
        },
      }),
    [abwBounds.max, abwBounds.min, activeMetrics.abw, activeMetrics.mortality, domain, feedAmountBounds.max, feedAmountBounds.min, granularity, mortalityBounds.max, mortalityBounds.min, palette, xLimit],
  )

  const errorMessage = getErrorMessage(summaryQuery.error)

  if (summaryQuery.isError) {
    return (
      <DataErrorState
        title="Unable to load production trends"
        description={errorMessage ?? "Please retry or check your connection."}
        onRetry={() => summaryQuery.refetch()}
      />
    )
  }

  return (
    <Card>
      <CardContent sx={{ "&&": { pt: 2 }, px: 3, pb: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            {showHeaderTitle ? (
              <span className="text-[1.15rem] font-semibold text-primary">Feed &amp; Mortality Trends</span>
            ) : null}
            {showUpdatedAt ? <DataUpdatedAt updatedAt={summaryQuery.dataUpdatedAt} /> : null}
          </div>
          <div className="flex items-center gap-3">
            <DataFetchingBadge isFetching={summaryQuery.isFetching} isLoading={summaryQuery.isLoading} />
            <Select
              value={localTimePeriod}
              onChange={(e) => {
                const next = e.target.value as TimePeriod
                setLocalTimePeriod(next)
                onTimePeriodChange?.(next)
              }}
              size="small"
              sx={{
                height: 34,
                fontSize: "0.8125rem",
                fontWeight: 500,
                bgcolor: "background.default",
                "& .MuiSelect-select": { py: "5px", pl: "10px", pr: "28px !important" },
              }}
            >
              {CHART_PERIODS.map((p) => (
                <MenuItem key={p} value={p} sx={{ fontSize: "0.8125rem" }}>
                  {CHART_PERIOD_LABELS[p] ?? p}
                </MenuItem>
              ))}
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {TREND_METRICS.map((metric) => {
            const active = activeMetrics[metric.key]
            const Icon = metric.icon
            const metricColor = palette[metric.paletteKey]
            return (
              <ButtonBase
                key={metric.key}
                onClick={() =>
                  setActiveMetrics((current) => {
                    const next = { ...current, [metric.key]: !current[metric.key] }
                    return Object.values(next).some(Boolean) ? next : current
                  })
                }
                sx={{
                  borderRadius: "10px",
                  border: (theme) => `1px solid ${active ? metricColor : theme.palette.divider}`,
                  backgroundColor: active ? "background.paper" : "background.default",
                  color: "text.primary",
                  px: 1.5,
                  py: 1,
                  gap: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  fontSize: "0.875rem",
                  fontWeight: active ? 600 : 500,
                  transition: "background-color 150ms ease, border-color 150ms ease, color 150ms ease",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    backgroundColor: metricColor,
                    display: "inline-block",
                    opacity: active ? 1 : 0.45,
                  }}
                />
                <Icon className="h-4 w-4" style={{ color: active ? metricColor : "currentColor" }} />
                <span>{metric.label}</span>
              </ButtonBase>
            )
          })}
        </div>
        {summaryQuery.isLoading || (summaryQuery.isFetching && !chartRows.length) ? (
          <div className="flex h-[320px] items-center justify-center text-muted-foreground">Loading chart...</div>
        ) : chartRows.length ? (
            <div className="border border-border bg-background px-2 py-3">
            <LazyRender className="h-[360px]" fallback={<div className="h-full w-full" />}>
              <Chart type="bar" data={combinedData} options={combinedOptions} />
            </LazyRender>
          </div>
        ) : (
          <EmptyState title="No trend data" description="No feed, ABW, or mortality rows match this filter." />
        )}
      </CardContent>
    </Card>
  )
}

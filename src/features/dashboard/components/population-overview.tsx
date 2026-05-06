"use client"

import { useMemo, useState } from "react"
import type { ChartData, ChartOptions } from "chart.js"
import { Activity, Fish, Leaf } from "lucide-react"
import ButtonBase from "@mui/material/ButtonBase"
import CardContent from "@mui/material/CardContent"
import type { Enums } from "@/lib/types/database"
import type { TimePeriod } from "@/components/shared/time-period-selector"
import { Line } from "@/components/charts/chartjs"
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
} from "@/components/charts/chartjs-theme"

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

function getTimePeriodLabel(value: TimePeriod) {
  switch (value) {
    case "week":
      return "Last 7 Days"
    case "2 weeks":
      return "Last 14 Days"
    case "month":
      return "Last 30 Days"
    case "quarter":
      return "Last 90 Days"
    case "year":
      return "Last 12 Months"
    default:
      return "Custom Range"
  }
}

const CHART_PERIODS: TimePeriod[] = ["week", "2 weeks", "month", "quarter"]
const CHART_PERIOD_LABELS: Partial<Record<TimePeriod, string>> = {
  week: "Last 7 Days",
  "2 weeks": "Last 14 Days",
  month: "Last 30 Days",
  quarter: "Last 90 Days",
}

type TrendMetricKey = "feedRate" | "mortality" | "abw"

const TREND_METRICS: Array<{
  key: TrendMetricKey
  label: string
  icon: typeof Leaf
  paletteKey: "chart1" | "chart5" | "chart2"
}> = [
  { key: "feedRate", label: "Feed Rate", icon: Leaf, paletteKey: "chart1" },
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
    feedRate: true,
    mortality: true,
    abw: true,
  })
  const timePeriod = localTimePeriod
  const palette = getChartPalette()
  const farmId = activeFarmId ?? initialFarmId
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
    const byDate = new Map<string, { mortality: number; feedRateRows: typeof rows; abwRows: typeof rows }>()

    rows.forEach((row) => {
      if (!row.date) return
      const current = byDate.get(row.date) ?? {
        mortality: 0,
        feedRateRows: [],
        abwRows: [],
      }

      current.mortality += row.daily_mortality_count ?? 0
      current.feedRateRows.push(row)
      current.abwRows.push(row)
      byDate.set(row.date, current)
    })

    return Array.from(byDate.entries())
      .map(([date, current]) => ({
        date,
        feedRate: weightedAverage(
          current.feedRateRows.map((row) => ({
            value: row.feeding_rate,
            weight: row.total_biomass,
          })),
        ),
        averageBodyWeight: weightedAverage(
          current.abwRows.map((row) => ({
            value: row.average_body_weight,
            weight: row.number_of_fish_inventory,
          })),
        ),
        mortalityCount: current.mortality,
      }))
      .sort((left, right) => left.date.localeCompare(right.date))
  }, [summaryQuery.data])

  const dateDomain = useMemo(() => buildDailyDateDomain(chartRows.map((row) => row.date)), [chartRows])
  const rowsByDate = useMemo(() => new Map(chartRows.map((row) => [row.date, row])), [chartRows])
  const xLimit = getDateAxisMaxTicks(dateDomain.length)
  const feedRateBounds = useMemo(
    () => buildMetricAxisBounds(chartRows.map((row) => row.feedRate), { minFloor: 0, includeZero: true }),
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

  const combinedData = useMemo<ChartData<"line">>(
    () => ({
      labels: dateDomain,
      datasets: [
        {
          label: "Feed Rate",
          data: dateDomain.map((date) => rowsByDate.get(date)?.feedRate ?? null),
          borderColor: palette.chart1,
          backgroundColor: createVerticalGradient(palette.chart1, 0.16, 0.02),
          borderWidth: 2.6,
          fill: true,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: palette.chart1,
          pointBorderWidth: 0,
          spanGaps: true,
          clip: 0,
          yAxisID: "y",
          hidden: !activeMetrics.feedRate,
        },
        {
          label: "Mortality",
          data: dateDomain.map((date) => rowsByDate.get(date)?.mortalityCount ?? null),
          borderColor: palette.chart5,
          backgroundColor: "transparent",
          borderWidth: 2.4,
          fill: false,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: palette.chart5,
          pointBorderWidth: 0,
          spanGaps: true,
          clip: 0,
          yAxisID: "y2",
          hidden: !activeMetrics.mortality,
        },
        {
          label: "ABW",
          data: dateDomain.map((date) => rowsByDate.get(date)?.averageBodyWeight ?? null),
          borderColor: palette.chart2,
          backgroundColor: "transparent",
          borderWidth: 2.6,
          fill: false,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: palette.chart2,
          pointBorderWidth: 0,
          spanGaps: true,
          clip: 0,
          yAxisID: "y1",
          hidden: !activeMetrics.abw,
        },
      ],
    }),
    [activeMetrics.abw, activeMetrics.feedRate, activeMetrics.mortality, dateDomain, palette.chart1, palette.chart2, palette.chart5, rowsByDate],
  )

  const combinedOptions = useMemo<ChartOptions<"line">>(
    () =>
      buildCartesianOptions({
        palette,
        min: feedRateBounds.min,
        max: feedRateBounds.max,
        rightMin: abwBounds.min,
        rightMax: abwBounds.max,
        lockYBounds: true,
        lockRightYBounds: true,
        xMaxTicksLimit: xLimit,
        yTitle: "% BW/Day",
        yRightTitle: "ABW (g)",
        yTickFormatter: (value) => formatNumberValue(Number(value) * 100, { decimals: 0 }),
        yRightTickFormatter: (value) => formatNumberValue(Number(value), { decimals: 0 }),
        tooltip: {
          callbacks: {
            title: (items: any) =>
              formatChartDate(String(dateDomain[items[0]?.dataIndex ?? 0] ?? ""), {
                month: "short",
                day: "numeric",
              }),
            label: (context: any) => {
              const label = String(context.dataset.label ?? "")
              if (label === "Feed Rate") {
                return `Feed Rate: ${formatNumberValue(Number(context.parsed.y) * 100, { decimals: 1, minimumDecimals: 1 })}% BW/day`
              }
              if (label === "ABW") {
                return `ABW: ${formatNumberValue(Number(context.parsed.y), { decimals: 0 })} g`
              }
              return `Mortality: ${formatNumberValue(Number(context.parsed.y), { decimals: 0 })} fish`
            },
          },
        },
        xTickFormatter: (_value, index) =>
          formatChartDate(String(dateDomain[index] ?? ""), { month: "short", day: "numeric" }),
        extraScales: {
          y2: {
            position: "right",
            display: false,
            min: mortalityBounds.min,
            max: mortalityBounds.max,
            grid: {
              drawOnChartArea: false,
              drawTicks: false,
            },
            border: {
              display: false,
            },
          },
        },
      }),
    [abwBounds.max, abwBounds.min, dateDomain, feedRateBounds.max, feedRateBounds.min, mortalityBounds.max, mortalityBounds.min, palette, xLimit],
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
        {summaryQuery.isLoading ? (
          <div className="flex h-[320px] items-center justify-center text-muted-foreground">Loading chart...</div>
        ) : chartRows.length ? (
          <div className="chart-canvas-shell rounded-[1rem] border border-border/60 bg-background px-2 py-3">
            <LazyRender className="h-[320px]" fallback={<div className="h-full w-full" />}>
              <Line data={combinedData} options={combinedOptions} />
            </LazyRender>
          </div>
        ) : (
          <EmptyState title="No trend data" description="No feed, ABW, or mortality data available for the selected range." />
        )}
      </CardContent>
    </Card>
  )
}

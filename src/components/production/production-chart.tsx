"use client"

import { useMemo } from "react"
import type { ChartData, ChartOptions } from "chart.js"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt, EmptyState } from "@/components/shared/data-states"
import { LazyRender } from "@/components/shared/lazy-render"
import { Line } from "@/components/charts/chartjs"
import { PRODUCTION_METRICS, type ProductionMetric } from "@/components/production/metrics"
import { formatChartDate, formatNumberValue } from "@/lib/analytics-format"
import {
  buildCartesianOptions,
  buildDailyDateDomain,
  buildMetricAxisBounds,
  createVerticalGradient,
  getChartPalette,
  getDateAxisMaxTicks,
} from "@/components/charts/chartjs-theme"

export type ProductionChartRow = {
  date: string
  label: string
  value: number | null
}

export default function ProductionChart({
  metric,
  rows,
  isLoading,
  isFetching,
  updatedAt,
  error,
  onRetry,
}: {
  metric: ProductionMetric
  rows: ProductionChartRow[]
  isLoading: boolean
  isFetching: boolean
  updatedAt?: number | null
  error?: string | null
  onRetry?: () => void
}) {
  const meta = PRODUCTION_METRICS[metric]
  const palette = getChartPalette()
  const dateDomain = useMemo(() => buildDailyDateDomain(rows.map((row) => row.date)), [rows])
  const rowsByDate = useMemo(() => new Map(rows.map((row) => [row.date, row])), [rows])
  const yBounds = useMemo(
    () =>
      buildMetricAxisBounds(rows.map((row) => row.value), {
        includeZero: metric === "mortality",
        minFloor: 0,
        trimOutliers: metric === "efcr_periodic" || metric === "efcr_aggregated",
      }),
    [metric, rows],
  )
  const xLimit = getDateAxisMaxTicks(dateDomain.length)

  const data = useMemo<ChartData<"line">>(
    () => ({
      labels: dateDomain,
      datasets: [
        {
          label: meta.label,
          data: dateDomain.map((date) => rowsByDate.get(date)?.value ?? null),
          borderColor: palette.chart2,
          backgroundColor: createVerticalGradient(palette.chart2, 0.42, 0.03),
          borderWidth: 2.8,
          fill: true,
          pointHoverRadius: 4,
          pointBackgroundColor: palette.chart2,
          spanGaps: true,
        },
      ],
    }),
    [dateDomain, meta.label, palette.chart2, rowsByDate],
  )

  const options = useMemo<ChartOptions<"line">>(
    () =>
      buildCartesianOptions({
        palette,
        min: yBounds.min,
        max: yBounds.max,
        xMaxTicksLimit: xLimit,
        xTitle: "Date",
        yTitle: meta.unit ? `${meta.label} (${meta.unit})` : meta.label,
        yTickFormatter: (value) => formatNumberValue(Number(value), { decimals: meta.decimals }),
        tooltip: {
          callbacks: {
            title: (items: any) =>
              formatChartDate(dateDomain[items[0]?.dataIndex ?? 0] ?? String(items[0]?.label ?? "")),
            label: (context: any) => {
              const numeric = Number(context.parsed.y)
              const value = meta.unit
                ? `${formatNumberValue(numeric, { decimals: meta.decimals })} ${meta.unit}`
                : formatNumberValue(numeric, { decimals: meta.decimals })
              return `${meta.label}: ${value}`
            },
          },
        },
        xTickFormatter: (_value, index) =>
          formatChartDate(dateDomain[index] ?? "", { month: "short", day: "numeric" }),
      }),
    [dateDomain, meta.decimals, meta.label, meta.unit, palette, xLimit, yBounds.max, yBounds.min],
  )

  if (error) {
    return (
      <DataErrorState
        title="Unable to load production chart"
        description={error}
        onRetry={onRetry}
      />
    )
  }

  return (
    <Card>
      <CardHeader className="pb-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{meta.label}</CardTitle>
          <DataFetchingBadge isFetching={isFetching} isLoading={isLoading} />
        </div>
        <DataUpdatedAt updatedAt={updatedAt} />
      </CardHeader>
      <CardContent className="pt-2">
        {isLoading ? (
          <div className="flex h-[280px] items-center justify-center text-muted-foreground">
            Loading chart...
          </div>
        ) : rows.length ? (
          <div className="chart-canvas-shell">
            <LazyRender className="h-[300px]" fallback={<div className="h-full w-full" />}>
              <Line data={data} options={options} />
            </LazyRender>
          </div>
        ) : (
          <EmptyState
            title="No production data"
            description="No trustworthy production rows were available for the selected filters. Snapshot dates are not reused as cycle dates."
          />
        )}
      </CardContent>
    </Card>
  )
}

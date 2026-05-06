"use client"

import { useMemo } from "react"
import type { ChartData, ChartOptions } from "chart.js"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/app-ui/card"
import { DataErrorState, EmptyState } from "@/components/shared/data-states"
import { LazyRender } from "@/components/shared/lazy-render"
import { Line } from "@/components/charts/chartjs"
import { PRODUCTION_METRICS, type ProductionMetric } from "@/components/production/metrics"
import { formatChartDate, formatNumberValue } from "@/lib/analytics-format"
import {
  buildCartesianOptions,
  buildDailyDateDomain,
  createVerticalGradient,
  getChartPalette,
  getDateAxisMaxTicks,
} from "@/components/charts/chartjs-theme"

export type ProductionChartRow = {
  date: string
  label: string
  value: number | null
}

const PRODUCTION_CHART_STYLE = {
  color: "#52b35f",
  fill: true,
  gradient: [0.16, 0.02] as [number, number],
}

export default function ProductionChart({
  metric,
  rows,
  isLoading,
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
  const xLimit = getDateAxisMaxTicks(dateDomain.length)

  const data = useMemo<ChartData<"line">>(
    () => ({
      labels: dateDomain,
      datasets: [
        {
          label: meta.label,
          data: dateDomain.map((date) => rowsByDate.get(date)?.value ?? null),
          borderColor: PRODUCTION_CHART_STYLE.color,
          backgroundColor: createVerticalGradient(
            PRODUCTION_CHART_STYLE.color,
            PRODUCTION_CHART_STYLE.gradient[0],
            PRODUCTION_CHART_STYLE.gradient[1],
          ),
          borderWidth: 2.6,
          fill: PRODUCTION_CHART_STYLE.fill,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointHitRadius: 12,
          pointBackgroundColor: PRODUCTION_CHART_STYLE.color,
          pointBorderWidth: 0,
          spanGaps: true,
          clip: 0,
        },
      ],
    }),
    [dateDomain, meta.label, rowsByDate],
  )

  const options = useMemo<ChartOptions<"line">>(
    () =>
      buildCartesianOptions({
        palette,
        xGrid: true,
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
    [dateDomain, meta.decimals, meta.label, meta.unit, palette, xLimit],
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
        <CardTitle>{meta.label}</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {isLoading ? (
          <div className="flex h-[280px] items-center justify-center text-muted-foreground">
            Loading chart...
          </div>
        ) : rows.length ? (
          <LazyRender className="h-[300px]" fallback={<div className="h-full w-full" />}>
            <Line data={data} options={options} />
          </LazyRender>
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


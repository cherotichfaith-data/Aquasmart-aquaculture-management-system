"use client"

import { useMemo } from "react"
import type { ChartData, ChartOptions } from "chart.js"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/app-ui/card"
import { DataErrorState, EmptyState } from "@/components/shared/data-states"
import { Line } from "@/components/charts/chartjs"
import { PRODUCTION_METRICS, type ProductionMetric } from "@/components/production/metrics"
import { formatChartDate } from "@/lib/analytics-format"
import {
  buildCartesianOptions,
  buildSparseDateDomain,
  createVerticalGradient,
  getChartPalette,
  getDateAxisMaxTicks,
} from "@/components/charts/chartjs-theme"

export type ProductionChartRow = {
  date: string
  label: string
  value: number | null
}

const PRODUCTION_SIDEBAR_BLUE = "#0f4c81"

const PRODUCTION_CHART_STYLE = {
  fill: true,
  gradient: [0.2, 0.03] as [number, number],
}

function formatProductionMetricValue(value: number, metric: ProductionMetric) {
  const meta = PRODUCTION_METRICS[metric]

  switch (metric) {
    case "efcr_periodic":
    case "efcr_aggregated":
      return value.toFixed(2)
    case "biomass_increase":
      return `${value.toFixed(1)} ${meta.unit}`.trim()
    case "density":
      return `${value.toFixed(1)} ${meta.unit}`.trim()
    case "abw":
      return `${Math.round(value)} ${meta.unit}`.trim()
    case "mortality":
    case "feeding":
      return `${value.toFixed(2)}${meta.unit}`
  }
}

export default function ProductionChart({
  metric,
  title,
  rows,
  isLoading,
  error,
  onRetry,
}: {
  metric: ProductionMetric
  title?: string
  rows: ProductionChartRow[]
  isLoading: boolean
  isFetching: boolean
  updatedAt?: number | null
  error?: string | null
  onRetry?: () => void
}) {
  const meta = PRODUCTION_METRICS[metric]
  const palette = getChartPalette()
  const chartColor = PRODUCTION_SIDEBAR_BLUE
  const dateDomain = useMemo(() => buildSparseDateDomain(rows.map((row) => row.date)), [rows])
  const rowsByDate = useMemo(() => new Map(rows.map((row) => [row.date, row])), [rows])
  const hasRenderablePoints = useMemo(
    () => rows.some((row) => typeof row.value === "number" && Number.isFinite(row.value)),
    [rows],
  )
  const xLimit = getDateAxisMaxTicks(dateDomain.length)

  const data = useMemo<ChartData<"line">>(
    () => ({
      labels: dateDomain,
      datasets: [
        {
          label: meta.label,
          data: dateDomain.map((date) => rowsByDate.get(date)?.value ?? null),
          borderColor: chartColor,
          backgroundColor: createVerticalGradient(
            chartColor,
            PRODUCTION_CHART_STYLE.gradient[0],
            PRODUCTION_CHART_STYLE.gradient[1],
          ),
          borderWidth: 2.6,
          fill: PRODUCTION_CHART_STYLE.fill,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointHitRadius: 12,
          pointBackgroundColor: chartColor,
          pointBorderWidth: 0,
          spanGaps: true,
          clip: 0,
        },
      ],
    }),
    [chartColor, dateDomain, meta.label, rowsByDate],
  )

  const options = useMemo<ChartOptions<"line">>(
    () =>
      buildCartesianOptions({
        palette,
        xGrid: false,
        xMaxTicksLimit: xLimit,
        xTitle: "DATE",
        yTitle: meta.unit ? `${meta.label} (${meta.unit})` : meta.label,
        yTickFormatter: (value) => {
          const numeric = Number(value)
          if (!Number.isFinite(numeric)) return String(value)
          return formatProductionMetricValue(numeric, metric)
        },
        tooltip: {
          callbacks: {
            title: (items: any) =>
              formatChartDate(dateDomain[items[0]?.dataIndex ?? 0] ?? String(items[0]?.label ?? "")),
            label: (context: any) => {
              const numeric = Number(context.parsed.y)
              return `${meta.label}: ${formatProductionMetricValue(numeric, metric)}`
            },
          },
        },
        xTickFormatter: (_value, index) =>
          formatChartDate(dateDomain[index] ?? "", { month: "short", day: "numeric" }),
      }),
    [dateDomain, meta.label, meta.unit, metric, palette, xLimit],
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
        <CardTitle>{title ?? meta.label}</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {isLoading ? (
          <div className="flex h-[280px] items-center justify-center text-muted-foreground">
            Loading chart...
          </div>
        ) : rows.length && hasRenderablePoints ? (
          <div className="h-[300px]">
            <Line data={data} options={options} />
          </div>
        ) : (
          <EmptyState
            title="No production data"
            description="No chartable production values were available for the selected metric and filters."
          />
        )}
      </CardContent>
    </Card>
  )
}


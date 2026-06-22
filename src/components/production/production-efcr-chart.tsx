"use client"

import { useMemo } from "react"
import type { ChartData, ChartOptions } from "chart.js"
import { Line } from "@/components/charts/chartjs"
import {
  buildCartesianOptions,
  buildSparseDateDomain,
  formatDecimalTick,
  getChartPalette,
  getDateAxisMaxTicks,
  withAlpha,
} from "@/components/charts/chartjs-theme"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/app-ui/card"
import { LazyRender } from "@/components/shared/lazy-render"
import { DataErrorState, EmptyState } from "@/components/shared/data-states"
import { formatChartDate, formatNumberValue } from "@/lib/analytics-format"
import type { ProductionEfcrChartRow } from "@/app/dashboard/production/_lib/production-page"

const PRODUCTION_SIDEBAR_BLUE = "#0f4c81"

export default function ProductionEfcrChart({
  title,
  rows,
  isLoading,
  error,
  onRetry,
}: {
  title: string
  rows: ProductionEfcrChartRow[]
  isLoading: boolean
  error?: string | null
  onRetry?: () => void
}) {
  const palette = getChartPalette()
  const dateDomain = useMemo(() => buildSparseDateDomain(rows.map((row) => row.date)), [rows])
  const rowsByDate = useMemo(() => new Map(rows.map((row) => [row.date, row])), [rows])
  const xLimit = getDateAxisMaxTicks(dateDomain.length)

  const data = useMemo<ChartData<"line">>(
    () => ({
      labels: dateDomain,
      datasets: [
        {
          label: "Aggregated eFCR",
          data: dateDomain.map((date) => rowsByDate.get(date)?.aggregatedEfcr ?? null),
          borderColor: PRODUCTION_SIDEBAR_BLUE,
          backgroundColor: withAlpha(PRODUCTION_SIDEBAR_BLUE, 0.9),
          borderWidth: 2.4,
          pointRadius: 2.8,
          pointHoverRadius: 4.5,
          pointHitRadius: 12,
          pointBackgroundColor: PRODUCTION_SIDEBAR_BLUE,
          pointBorderWidth: 0,
          spanGaps: true,
        },
        {
          label: "Period eFCR",
          data: dateDomain.map((date) => rowsByDate.get(date)?.periodEfcr ?? null),
          borderColor: PRODUCTION_SIDEBAR_BLUE,
          backgroundColor: withAlpha(PRODUCTION_SIDEBAR_BLUE, 0.9),
          borderWidth: 2.2,
          borderDash: [8, 6],
          pointRadius: 2.8,
          pointHoverRadius: 4.5,
          pointHitRadius: 12,
          pointBackgroundColor: PRODUCTION_SIDEBAR_BLUE,
          pointBorderWidth: 0,
          spanGaps: true,
        },
      ],
    }),
    [dateDomain, rowsByDate],
  )

  const options = useMemo<ChartOptions<"line">>(
    () => {
      const baseOptions = buildCartesianOptions<"line">({
        palette,
        legend: true,
        xGrid: false,
        xMaxTicksLimit: xLimit,
        xTitle: "DATE",
        yTitle: "eFCR",
        yTickFormatter: (value) => formatDecimalTick(value, 2),
        tooltip: {
          callbacks: {
            title: (items: any) =>
              formatChartDate(dateDomain[items[0]?.dataIndex ?? 0] ?? String(items[0]?.label ?? "")),
            label: (context: any) =>
              `${context.dataset.label}: ${formatNumberValue(Number(context.parsed.y), { decimals: 2 })}`,
          },
        },
        xTickFormatter: (_value, index) =>
          formatChartDate(dateDomain[index] ?? "", { month: "short", day: "numeric" }),
      })

      return {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          legend: {
            ...(baseOptions.plugins?.legend ?? {}),
            position: "right",
            align: "start",
          },
        },
      }
    },
    [dateDomain, palette, xLimit],
  )

  if (error) {
    return (
      <DataErrorState
        title="Unable to load eFCR trend"
        description={error}
        onRetry={onRetry}
      />
    )
  }

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {isLoading ? (
          <div className="flex h-[280px] items-center justify-center text-muted-foreground">
            Loading eFCR trend...
          </div>
        ) : rows.length ? (
          <LazyRender className="h-[300px]" fallback={<div className="h-full w-full" />}>
            <Line data={data} options={options} />
          </LazyRender>
        ) : (
          <EmptyState
            title="No eFCR data"
            description="No period-based eFCR rows were available for the selected filters."
          />
        )}
      </CardContent>
    </Card>
  )
}

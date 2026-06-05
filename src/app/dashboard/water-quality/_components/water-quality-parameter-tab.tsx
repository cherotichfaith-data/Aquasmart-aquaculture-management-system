"use client"

import { useMemo } from "react"
import type { ChartData, ChartOptions } from "chart.js"
import { Line } from "@/components/charts/chartjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/app-ui/card"
import { DataFetchingBadge, DataUpdatedAt } from "@/components/shared/data-states"
import { LazyRender } from "@/components/shared/lazy-render"
import { formatTimestamp, parameterLabels, type WqParameter } from "../_lib/water-quality-utils"
import type { ParameterTrendRow } from "../_lib/water-quality-selectors"
import {
  buildCartesianOptions,
  buildDailyDateDomain,
  getChartPalette,
  getDateAxisMaxTicks,
} from "@/components/charts/chartjs-theme"

const formatDateLabel = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(parsed)
}

export function WaterQualityParameterTab({
  latestUpdatedAt,
  isFetching,
  isLoading,
  dataIssues,
  parameterTrendData,
  selectedParameter,
  selectedParameterUnit,
}: {
  latestUpdatedAt: number
  isFetching: boolean
  isLoading: boolean
  dataIssues: string[]
  parameterTrendData: ParameterTrendRow[]
  selectedParameter: WqParameter
  selectedParameterUnit: string
}) {
  const palette = getChartPalette()
  const dateDomain = useMemo(
    () => buildDailyDateDomain(parameterTrendData.map((row) => row.date)),
    [parameterTrendData],
  )
  const rowsByDate = useMemo(() => new Map(parameterTrendData.map((row) => [row.date, row])), [parameterTrendData])
  const xLimit = getDateAxisMaxTicks(dateDomain.length)

  const chartData = useMemo<ChartData<"line">>(
    () => ({
      labels: dateDomain,
      datasets: [
        {
          label: "Daily mean",
          data: dateDomain.map((date) => rowsByDate.get(date)?.mean ?? null),
          borderColor: palette.chart1,
          backgroundColor: palette.chart1,
          borderWidth: 2,
          pointRadius: 0,
          spanGaps: true,
        },
        {
          label: "7-day mean",
          data: dateDomain.map((date) => rowsByDate.get(date)?.rolling ?? null),
          borderColor: palette.chart2,
          backgroundColor: palette.chart2,
          borderDash: [4, 4],
          borderWidth: 2,
          pointRadius: 0,
          spanGaps: true,
        },
      ],
    }),
    [dateDomain, palette.chart1, palette.chart2, rowsByDate],
  )

  const chartOptions = useMemo<ChartOptions<"line">>(
    () =>
      buildCartesianOptions({
        palette,
        legend: true,
        xGrid: true,
        xMaxTicksLimit: xLimit,
        xTitle: "Date",
        yTitle: parameterLabels[selectedParameter],
        yTickFormatter: (value) =>
          Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        tooltip: {
          callbacks: {
            title: (items: any) => formatTimestamp(`${dateDomain[items[0]?.dataIndex ?? 0] ?? ""}T00:00:00`),
            label: (context: any) => {
              const label = context.dataset.label ?? ""
              const numeric = Number(context.parsed.y)
              if (selectedParameter === "pH") {
                return `${label}: ${numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              }
              return `${label}: ${numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${selectedParameterUnit}`.trim()
            },
          },
        },
        xTickFormatter: (_value, index) => formatDateLabel(dateDomain[index] ?? ""),
      }),
    [dateDomain, palette, selectedParameter, selectedParameterUnit, xLimit],
  )

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="border-b border-border/70 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Parameter trends
          </CardTitle>
          <div className="flex items-center gap-3 text-xs">
            <DataUpdatedAt updatedAt={latestUpdatedAt} />
            <DataFetchingBadge isFetching={isFetching} isLoading={isLoading} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {dataIssues.length ? (
          <div className="mb-4 rounded-md bg-destructive/8 p-4 text-sm text-destructive">
            <p className="mb-1 font-medium">Some water-quality data sources failed to load:</p>
            <ul className="list-disc space-y-1 pl-5">
              {dataIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {isLoading ? (
          <div className="flex h-[320px] items-center justify-center text-muted-foreground">Loading parameter trends...</div>
        ) : parameterTrendData.length === 0 ? (
          <div className="flex h-[320px] items-center justify-center text-muted-foreground">No parameter measurements in this range.</div>
        ) : (
          <div className="chart-canvas-shell h-[320px]">
            <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
              <Line data={chartData} options={chartOptions} />
            </LazyRender>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

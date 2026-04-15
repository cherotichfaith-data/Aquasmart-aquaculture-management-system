"use client"

import { useMemo } from "react"
import type { ChartData, ChartOptions } from "chart.js"
import type { Enums } from "@/lib/types/database"
import type { TimePeriod } from "@/components/shared/time-period-selector"
import type { DashboardPageInitialData } from "@/features/dashboard/types"
import { Line } from "@/components/charts/chartjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useProductionTrend } from "@/lib/hooks/use-dashboard"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt, EmptyState } from "@/components/shared/data-states"
import { LazyRender } from "@/components/shared/lazy-render"
import { getErrorMessage } from "@/lib/utils/query-result"
import { formatChartDate, formatNumberValue } from "@/lib/analytics-format"
import { computeEfcrFromProductionRows } from "@/features/dashboard/analytics-shared"
import {
  buildCartesianOptions,
  buildDailyDateDomain,
  createVerticalGradient,
  getChartPalette,
  getDateAxisMaxTicks,
} from "@/components/charts/chartjs-theme"

export default function PopulationOverview({
  stage,
  batch,
  system,
  timePeriod,
  scopedSystemIds,
  dateFrom,
  dateTo,
  farmId: initialFarmId,
  initialData,
  initialBounds,
}: {
  stage?: "all" | Enums<"system_growth_stage"> | null
  batch?: string
  system?: string
  timePeriod: TimePeriod
  scopedSystemIds?: number[] | null
  dateFrom?: string
  dateTo?: string
  farmId?: string | null
  initialData?: DashboardPageInitialData["productionTrend"]
  initialBounds?: DashboardPageInitialData["bounds"]
}) {
  const { farmId: activeFarmId } = useActiveFarm()
  const palette = getChartPalette()
  const farmId = activeFarmId ?? initialFarmId
  const canUseInitialData =
    Boolean(dateFrom && dateTo) && initialBounds?.start === dateFrom && initialBounds?.end === dateTo

  const summaryQuery = useProductionTrend({
    farmId,
    stage: stage && stage !== "all" ? stage : undefined,
    batch: batch ?? "all",
    system,
    timePeriod,
    scopedSystemIds,
    dateFrom: dateFrom ?? null,
    dateTo: dateTo ?? null,
    initialData: canUseInitialData ? initialData : undefined,
  })

  const chartRows = useMemo(() => {
    const rows = summaryQuery.data ?? []
    const byDate = new Map<string, { mortality: number; efcrRows: typeof rows }>()

    rows.forEach((row) => {
      if (!row.date) return
      const current = byDate.get(row.date) ?? {
        mortality: 0,
        efcrRows: [],
      }

      current.mortality += row.daily_mortality_count ?? 0
      current.efcrRows.push(row)

      byDate.set(row.date, current)
    })

    return Array.from(byDate.entries())
      .map(([date, current]) => ({
        date,
        efcrPeriod: computeEfcrFromProductionRows(current.efcrRows),
        mortalityCount: current.mortality,
      }))
      .sort((left, right) => left.date.localeCompare(right.date))
  }, [summaryQuery.data])

  const dateDomain = useMemo(() => buildDailyDateDomain(chartRows.map((row) => row.date)), [chartRows])
  const rowsByDate = useMemo(() => new Map(chartRows.map((row) => [row.date, row])), [chartRows])
  const xLimit = getDateAxisMaxTicks(dateDomain.length)
  const efcrData = useMemo<ChartData<"line">>(
    () => ({
      labels: dateDomain,
      datasets: [
        {
          label: "eFCR",
          data: dateDomain.map((date) => rowsByDate.get(date)?.efcrPeriod ?? null),
          borderColor: palette.chart1,
          backgroundColor: createVerticalGradient(palette.chart1, 0.38, 0.03),
          borderWidth: 2.8,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointBackgroundColor: palette.chart1,
          spanGaps: true,
          clip: 0,
        },
      ],
    }),
    [dateDomain, palette.chart1, rowsByDate],
  )

  const mortalityData = useMemo<ChartData<"line">>(
    () => ({
      labels: dateDomain,
      datasets: [
        {
          label: "Mortality count",
          data: dateDomain.map((date) => rowsByDate.get(date)?.mortalityCount ?? null),
          borderColor: palette.destructive,
          backgroundColor: createVerticalGradient(palette.destructive, 0.32, 0.03),
          borderWidth: 2.8,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointBackgroundColor: palette.destructive,
          spanGaps: true,
          clip: 0,
        },
      ],
    }),
    [dateDomain, palette.destructive, rowsByDate],
  )

  const efcrOptions = useMemo<ChartOptions<"line">>(
    () =>
      buildCartesianOptions({
        palette,
        xMaxTicksLimit: xLimit,
        xTitle: "Date",
        yTitle: "eFCR",
        yTickFormatter: (value) => formatNumberValue(Number(value), { decimals: 2, minimumDecimals: 2 }),
        tooltip: {
          callbacks: {
            title: (items: any) =>
              formatChartDate(String(dateDomain[items[0]?.dataIndex ?? 0] ?? ""), {
                month: "short",
                day: "numeric",
              }),
            label: (context: any) =>
              `eFCR: ${formatNumberValue(Number(context.parsed.y), { decimals: 2, minimumDecimals: 2 })}`,
          },
        },
        xTickFormatter: (_value, index) =>
          formatChartDate(String(dateDomain[index] ?? ""), { month: "short", day: "numeric" }),
      }),
    [dateDomain, palette, xLimit],
  )

  const mortalityOptions = useMemo<ChartOptions<"line">>(
    () =>
      buildCartesianOptions({
        palette,
        xMaxTicksLimit: xLimit,
        xTitle: "Date",
        yTitle: "Mortality (fish)",
        yTickFormatter: (value) => formatNumberValue(Number(value), { decimals: 0 }),
        tooltip: {
          callbacks: {
            title: (items: any) =>
              formatChartDate(String(dateDomain[items[0]?.dataIndex ?? 0] ?? ""), {
                month: "short",
                day: "numeric",
              }),
            label: (context: any) =>
              `Mortality: ${formatNumberValue(Number(context.parsed.y), { decimals: 0 })} fish`,
          },
        },
        xTickFormatter: (_value, index) =>
          formatChartDate(String(dateDomain[index] ?? ""), { month: "short", day: "numeric" }),
      }),
    [dateDomain, palette, xLimit],
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
    <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="w-full">
        <CardHeader className="pb-1">
          <div className="flex items-center justify-between">
            <CardTitle>eFCR Trend</CardTitle>
            <DataFetchingBadge isFetching={summaryQuery.isFetching} isLoading={summaryQuery.isLoading} />
          </div>
          <DataUpdatedAt updatedAt={summaryQuery.dataUpdatedAt} />
        </CardHeader>
        <CardContent className="pt-2">
          {summaryQuery.isLoading ? (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">Loading chart...</div>
          ) : chartRows.length ? (
            <div className="chart-canvas-shell">
              <LazyRender className="h-[300px]" fallback={<div className="h-full w-full" />}>
                <Line data={efcrData} options={efcrOptions} />
              </LazyRender>
            </div>
          ) : (
            <EmptyState title="No trend data" description="No eFCR data available for the selected range." />
          )}
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader className="pb-1">
          <div className="flex items-center justify-between">
            <CardTitle>Mortality Trend</CardTitle>
            <DataFetchingBadge isFetching={summaryQuery.isFetching} isLoading={summaryQuery.isLoading} />
          </div>
          <DataUpdatedAt updatedAt={summaryQuery.dataUpdatedAt} />
        </CardHeader>
        <CardContent className="pt-2">
          {summaryQuery.isLoading ? (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">Loading chart...</div>
          ) : chartRows.length ? (
            <div className="chart-canvas-shell">
              <LazyRender className="h-[300px]" fallback={<div className="h-full w-full" />}>
                <Line data={mortalityData} options={mortalityOptions} />
              </LazyRender>
            </div>
          ) : (
            <EmptyState title="No trend data" description="No mortality data available for the selected range." />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

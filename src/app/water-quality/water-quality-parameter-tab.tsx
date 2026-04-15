"use client"

import { useMemo } from "react"
import type { ChartData, ChartOptions } from "chart.js"
import { Line } from "@/components/charts/chartjs"
import { DataFetchingBadge, DataUpdatedAt } from "@/components/shared/data-states"
import { LazyRender } from "@/components/shared/lazy-render"
import { formatTimestamp, parameterLabels, type WqParameter } from "./_lib/water-quality-utils"
import type { DiurnalDoPattern, ParameterTrendRow } from "./_lib/water-quality-selectors"
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
  lowDoThreshold,
  highAmmoniaThreshold,
  showFeedingOverlay,
  showMortalityOverlay,
  diurnalDoPattern,
  dailyTempAverage,
}: {
  latestUpdatedAt: number
  isFetching: boolean
  isLoading: boolean
  dataIssues: string[]
  parameterTrendData: ParameterTrendRow[]
  selectedParameter: WqParameter
  selectedParameterUnit: string
  lowDoThreshold: number
  highAmmoniaThreshold: number
  showFeedingOverlay: boolean
  showMortalityOverlay: boolean
  diurnalDoPattern: DiurnalDoPattern
  dailyTempAverage: Array<{ date: string; average: number | null }>
}) {
  const palette = getChartPalette()
  const parameterDateDomain = useMemo(
    () => buildDailyDateDomain(parameterTrendData.map((row) => row.date)),
    [parameterTrendData],
  )
  const parameterRowsByDate = useMemo(
    () => new Map(parameterTrendData.map((row) => [row.date, row])),
    [parameterTrendData],
  )
  const parameterXAxisLimit = getDateAxisMaxTicks(parameterDateDomain.length)

  const parameterChartData = useMemo<ChartData<"line">>(() => {
    const datasets: ChartData<"line">["datasets"] = [
      {
        label: "Daily mean",
        data: parameterDateDomain.map((date) => parameterRowsByDate.get(date)?.mean ?? null),
        borderColor: palette.chart1,
        backgroundColor: palette.chart1,
        borderWidth: 2,
        pointRadius: 0,
        yAxisID: "y",
        spanGaps: true,
      },
      {
        label: "7-day mean",
        data: parameterDateDomain.map((date) => parameterRowsByDate.get(date)?.rolling ?? null),
        borderColor: palette.chart2,
        backgroundColor: palette.chart2,
        borderDash: [4, 4],
        borderWidth: 2,
        pointRadius: 0,
        yAxisID: "y",
        spanGaps: true,
      },
    ]

    if (selectedParameter === "dissolved_oxygen") {
      datasets.push({
        label: "Low DO threshold",
        data: parameterDateDomain.map(() => lowDoThreshold),
        borderColor: palette.destructive,
        borderDash: [3, 3],
        borderWidth: 1.6,
        pointRadius: 0,
        yAxisID: "y",
      })
    }

    if (selectedParameter === "ammonia") {
      datasets.push({
        label: "High ammonia threshold",
        data: parameterDateDomain.map(() => highAmmoniaThreshold),
        borderColor: palette.destructive,
        borderDash: [3, 3],
        borderWidth: 1.6,
        pointRadius: 0,
        yAxisID: "y",
      })
    }

    if (showFeedingOverlay) {
      datasets.push({
        label: "Feeding amount",
        data: parameterDateDomain.map((date) => parameterRowsByDate.get(date)?.feeding ?? null),
        borderColor: palette.chart3,
        backgroundColor: palette.chart3,
        borderWidth: 2,
        pointRadius: 0,
        yAxisID: "y1",
        spanGaps: true,
      })
    }

    if (showMortalityOverlay) {
      datasets.push({
        label: "Mortality count",
        data: parameterDateDomain.map((date) => parameterRowsByDate.get(date)?.mortality ?? null),
        borderColor: palette.chart4,
        backgroundColor: palette.chart4,
        borderWidth: 2,
        pointRadius: 0,
        yAxisID: showFeedingOverlay ? "y2" : "y1",
        spanGaps: true,
      })
    }

    return {
      labels: parameterDateDomain,
      datasets,
    }
  }, [
    highAmmoniaThreshold,
    lowDoThreshold,
    palette.chart1,
    palette.chart2,
    palette.chart3,
    palette.chart4,
    palette.destructive,
    parameterDateDomain,
    parameterRowsByDate,
    parameterTrendData,
    selectedParameter,
    showFeedingOverlay,
    showMortalityOverlay,
  ])

  const parameterChartOptions = useMemo<ChartOptions<"line">>(
    () =>
      buildCartesianOptions({
        palette,
        legend: true,
        xMaxTicksLimit: parameterXAxisLimit,
        xTitle: "Date",
        yTitle: parameterLabels[selectedParameter],
        yTickFormatter: (value) =>
          selectedParameter === "pH"
            ? Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        tooltip: {
          callbacks: {
            title: (items: any) => formatTimestamp(`${parameterDateDomain[items[0]?.dataIndex ?? 0] ?? ""}T00:00:00`),
            label: (context: any) => {
              const label = context.dataset.label ?? ""
              const numeric = Number(context.parsed.y)
              if (label.includes("Feeding")) {
                return `${label}: ${numeric.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`
              }
              if (label.includes("Mortality")) {
                return `${label}: ${numeric.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
              }
              if (label.includes("threshold")) {
                return `${label}: ${numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              }
              if (selectedParameter === "pH") {
                return `${label}: ${numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              }
              return `${label}: ${numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${selectedParameterUnit}`.trim()
            },
          },
        },
        xTickFormatter: (_value, index) =>
          formatDateLabel(parameterDateDomain[index] ?? ""),
        extraScales: {
          ...(showFeedingOverlay
            ? {
                y1: {
                  position: "right",
                  border: { display: false },
                  grid: { drawOnChartArea: false, drawTicks: false },
                  title: {
                    display: true,
                    text: "Feed fed (kg)",
                    color: palette.muted,
                    font: { size: 11, weight: 500 },
                  },
                  ticks: {
                    color: palette.muted,
                    padding: 10,
                    font: { size: 11, weight: 500 },
                    callback(value: number | string) {
                      return `${Number(value).toFixed(0)} kg`
                    },
                  },
                },
              }
            : {}),
          ...(showMortalityOverlay
            ? {
                [showFeedingOverlay ? "y2" : "y1"]: {
                  position: "right",
                  display: true,
                  offset: showFeedingOverlay,
                  border: { display: false },
                  grid: { drawOnChartArea: false, drawTicks: false },
                  title: {
                    display: true,
                    text: "Mortality (fish)",
                    color: palette.muted,
                    font: { size: 11, weight: 500 },
                  },
                  ticks: {
                    color: palette.muted,
                    padding: 10,
                    font: { size: 11, weight: 500 },
                    callback(value: number | string) {
                      return Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })
                    },
                  },
                },
              }
            : {}),
        },
      }),
    [
      palette,
      parameterDateDomain,
      parameterXAxisLimit,
      selectedParameter,
      selectedParameterUnit,
      showFeedingOverlay,
      showMortalityOverlay,
    ],
  )

  const diurnalData = useMemo<ChartData<"line">>(
    () => ({
      labels: diurnalDoPattern.rows.map((row) => row.time),
      datasets: diurnalDoPattern.dateSeries.map((date, index) => ({
        label: formatDateLabel(date),
        data: diurnalDoPattern.rows.map((row) => row[date as keyof typeof row] as number | null),
        borderColor: palette[`chart${(index % 5) + 1}` as keyof typeof palette] as string,
        backgroundColor: palette[`chart${(index % 5) + 1}` as keyof typeof palette] as string,
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 4,
        spanGaps: true,
      })),
    }),
    [diurnalDoPattern, palette],
  )

  const diurnalOptions = useMemo<ChartOptions<"line">>(
    () =>
      buildCartesianOptions({
        palette,
        legend: true,
        xTitle: "Time of day",
        yTitle: "Dissolved oxygen (mg/L)",
        tooltip: {
          callbacks: {
            label: (context: any) =>
              `${context.dataset.label}: ${Number(context.parsed.y).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} mg/L`,
          },
        },
      }),
    [palette],
  )

  const dailyTempData = useMemo<ChartData<"line">>(
    () => {
      const dateDomain = buildDailyDateDomain(dailyTempAverage.map((row) => row.date))
      const rowsByDate = new Map(dailyTempAverage.map((row) => [row.date, row]))
      return {
        labels: dateDomain,
        datasets: [
          {
            label: "Average temperature",
            data: dateDomain.map((date) => rowsByDate.get(date)?.average ?? null),
            borderColor: palette.chart1,
            backgroundColor: palette.chart1,
            borderWidth: 2,
            pointRadius: 0,
            spanGaps: true,
          },
        ],
      }
    },
    [dailyTempAverage, palette.chart1],
  )

  const dailyTempDateDomain = useMemo(
    () => buildDailyDateDomain(dailyTempAverage.map((row) => row.date)),
    [dailyTempAverage],
  )
  const dailyTempXAxisLimit = getDateAxisMaxTicks(dailyTempDateDomain.length)

  const dailyTempOptions = useMemo<ChartOptions<"line">>(
    () =>
      buildCartesianOptions({
        palette,
        xMaxTicksLimit: dailyTempXAxisLimit,
        xTitle: "Date",
        yTitle: "Temperature (deg C)",
        tooltip: {
          callbacks: {
            title: (items: any) => formatTimestamp(`${dailyTempDateDomain[items[0]?.dataIndex ?? 0] ?? ""}T00:00:00`),
            label: (context: any) =>
              `Average temperature: ${Number(context.parsed.y).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} deg C`,
          },
        },
        xTickFormatter: (_value, index) =>
          formatDateLabel(dailyTempDateDomain[index] ?? ""),
      }),
    [dailyTempDateDomain, dailyTempXAxisLimit, palette],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <DataUpdatedAt updatedAt={latestUpdatedAt} />
        <DataFetchingBadge isFetching={isFetching} isLoading={isLoading} />
      </div>
      {dataIssues.length ? (
        <div className="rounded-md bg-destructive/8 p-4 text-sm text-destructive shadow-[0_16px_34px_-28px_rgba(220,38,38,0.28)]">
          <p className="mb-1 font-medium">Some water-quality data sources failed to load:</p>
          <ul className="list-disc space-y-1 pl-5">
            {dataIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {isLoading ? (
        <div className="flex h-[320px] items-center justify-center text-muted-foreground">Loading parameter analysis...</div>
      ) : parameterTrendData.length === 0 ? (
        <div className="flex h-[320px] items-center justify-center text-muted-foreground">No parameter measurements in this range.</div>
      ) : (
        <div className="space-y-4">
          <div className="chart-canvas-shell h-[320px]">
            <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
              <Line data={parameterChartData} options={parameterChartOptions} />
            </LazyRender>
          </div>

          <div className="chart-canvas-shell">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Diurnal DO Pattern</p>
                <p className="text-xs text-muted-foreground">Time of day versus dissolved oxygen, with one line per recent date.</p>
              </div>
              <span className="text-xs text-muted-foreground">Units: mg/L</span>
            </div>
            {diurnalDoPattern.rows.length === 0 ? (
              <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
                No dissolved oxygen measurements with time-of-day stamps in the recent window.
              </div>
            ) : (
              <>
                <div className="h-[240px]">
                  <Line data={diurnalData} options={diurnalOptions} />
                </div>
                <div className="mt-3 rounded-md bg-amber-500/10 p-3 text-xs text-amber-700 shadow-[0_16px_34px_-28px_rgba(245,158,11,0.3)] dark:text-amber-300">
                  {diurnalDoPattern.insufficientSamples
                    ? `Recent records show roughly one dissolved oxygen reading per day${diurnalDoPattern.dominantTimeLabel ? `, typically around ${diurnalDoPattern.dominantTimeLabel}` : ""}. Single daily measurements are insufficient for diurnal analysis. Add a PM measurement between 4:00 and 5:00 PM to capture the daily DO peak and align with the 4 PM feed inventory schedule already in use.`
                    : `Recent DO timestamps span multiple times of day${diurnalDoPattern.dominantTimeLabel ? `, with the most common reading time around ${diurnalDoPattern.dominantTimeLabel}` : ""}. Continue collecting both morning and PM readings to compare dawn minimum versus afternoon peak.`}
                </div>
              </>
            )}
          </div>

          <div className="chart-canvas-shell">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Daily Average Temperature</p>
                <p className="text-xs text-muted-foreground">Mean temperature per day across the selected scope.</p>
              </div>
              <span className="text-xs text-muted-foreground">Units: deg C</span>
            </div>
            {dailyTempAverage.length === 0 ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                No temperature measurements in this range.
              </div>
            ) : (
              <div className="h-[220px]">
                <Line data={dailyTempData} options={dailyTempOptions} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

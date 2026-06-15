"use client"

import { useMemo } from "react"
import type { ChartData, ChartOptions } from "chart.js"
import { Line } from "@/components/charts/chartjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/app-ui/card"
import {
  buildCartesianOptions,
  buildDailyDateDomain,
  buildMetricAxisBounds,
  createVerticalGradient,
  getChartPalette,
  getDateAxisMaxTicks,
  withAlpha,
} from "@/components/charts/chartjs-theme"
import { formatDateOnly, formatNumberValue } from "@/lib/analytics-format"
import { LazyRender } from "@/components/shared/lazy-render"
import type { Tables } from "@/lib/types/database"
import type { ProductionTrendRpcRow } from "@/features/dashboard/types"
import type { EfcrTrendPoint, FeedRatePoint } from "./feed-analytics"

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-primary)",
]

const getValueOrNull = (value: string | number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? value : null

type FeedRateByDateRow = {
  date: string
  feedRateSum: number
  feedRateCount: number
}

type FeedRateBiomassByDateRow = FeedRateByDateRow & {
  biomassKg?: number
}

type FeedRateMortalityByDateRow = FeedRateByDateRow & {
  mortalityCount?: number
}

function ChartFrame({
  children,
  loading,
  emptyLabel,
  hasData,
}: {
  children: React.ReactNode
  loading: boolean
  emptyLabel: string
  hasData: boolean
}) {
  if (loading) {
    return <div className="flex h-[340px] items-center justify-center text-sm text-muted-foreground">Loading...</div>
  }

  if (!hasData) {
    return <div className="flex h-[340px] items-center justify-center text-sm text-muted-foreground">{emptyLabel}</div>
  }

  return <div className="chart-canvas-shell h-[340px]">{children}</div>
}

export function FeedRateSection({
  loading,
  points,
  systemNameById,
}: {
  loading: boolean
  points: FeedRatePoint[]
  systemNameById: Map<number, string>
}) {
  const chartRows = useMemo(() => {
    const byDate = new Map<
      string,
      Record<string, string | number | null> & {
        lowerBandSum: number
        lowerBandCount: number
        upperBandSum: number
        upperBandCount: number
      }
    >()

    points.forEach((point) => {
      const current = byDate.get(point.date) ?? {
        date: point.date,
        label: point.label,
        lowerBand: null,
        upperBand: null,
        lowerBandSum: 0,
        lowerBandCount: 0,
        upperBandSum: 0,
        upperBandCount: 0,
      }
      current[`system_${point.systemId}`] = point.feedRatePct
      if (point.lowerBand != null) {
        current.lowerBandSum += point.lowerBand
        current.lowerBandCount += 1
        current.lowerBand = current.lowerBandSum / current.lowerBandCount
      }
      if (point.upperBand != null) {
        current.upperBandSum += point.upperBand
        current.upperBandCount += 1
        current.upperBand = current.upperBandSum / current.upperBandCount
      }
      byDate.set(point.date, current)
    })

    return Array.from(byDate.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)))
  }, [points])

  const series = useMemo(
    () =>
      Array.from(new Set(points.map((point) => point.systemId))).map((systemId, index) => ({
        systemId,
        key: `system_${systemId}`,
        label: systemNameById.get(systemId) ?? `System ${systemId}`,
        color: CHART_COLORS[index % CHART_COLORS.length],
      })),
    [points, systemNameById],
  )

  const palette = getChartPalette()
  const dateDomain = useMemo(() => buildDailyDateDomain(chartRows.map((row) => String(row.date ?? ""))), [chartRows])
  const rowsByDate = useMemo(() => new Map(chartRows.map((row) => [String(row.date ?? ""), row])), [chartRows])
  const xLimit = getDateAxisMaxTicks(dateDomain.length)

  const chartData = useMemo<ChartData<"line">>(
    () => ({
      labels: dateDomain,
      datasets: [
        {
          label: "Target lower",
          data: dateDomain.map((date) => getValueOrNull(rowsByDate.get(date)?.lowerBand)),
          borderColor: palette.chart2,
          backgroundColor: withAlpha(palette.chart2, 0.08),
          borderDash: [4, 4],
          borderWidth: 1.8,
          pointRadius: 0,
          spanGaps: true,
        },
        {
          label: "Target corridor",
          data: dateDomain.map((date) => getValueOrNull(rowsByDate.get(date)?.upperBand)),
          borderColor: withAlpha(palette.chart2, 0.7),
          backgroundColor: createVerticalGradient(palette.chart2, 0.2, 0.03),
          borderWidth: 2,
          pointRadius: 0,
          fill: "-1",
          spanGaps: true,
        },
        ...series.map((item) => ({
          label: item.label,
          data: dateDomain.map((date) => getValueOrNull(rowsByDate.get(date)?.[item.key])),
          borderColor: item.color,
          backgroundColor: createVerticalGradient(item.color, 0.22, 0.02),
          borderWidth: 2.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          spanGaps: true,
        })),
      ],
    }),
    [dateDomain, palette.chart2, rowsByDate, series],
  )

  const chartOptions = useMemo<ChartOptions<"line">>(() => {
    const yBounds = buildMetricAxisBounds(
      [
        ...chartRows.map((row) => getValueOrNull(row.lowerBand)),
        ...chartRows.map((row) => getValueOrNull(row.upperBand)),
        ...chartRows.flatMap((row) => series.map((item) => getValueOrNull(row[item.key]))),
      ],
      { minFloor: 0 },
    )

    return buildCartesianOptions({
      palette,
      min: yBounds.min,
      max: yBounds.max,
      xMaxTicksLimit: xLimit,
      xTitle: "Date",
      yTickFormatter: (value) => `${Number(value).toFixed(1)}%`,
      yTitle: "Feed rate (% biomass)",
      tooltip: {
        callbacks: {
          title: (items: any) => {
            const value = String(dateDomain[items[0]?.dataIndex ?? 0] ?? "")
            return formatDateOnly(value, value)
          },
          label: (context: any) => `${context.dataset.label}: ${Number(context.parsed.y).toFixed(2)}%`,
        },
      },
      xTickFormatter: (_value, index) =>
        new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
          new Date(`${String(dateDomain[index] ?? "")}T00:00:00`),
        ),
    })
  }, [chartRows, dateDomain, palette, series, xLimit])

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle>Expected vs actual feed rate</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {series.length > 0 ? (
          <div className="legend-pills mb-4">
            <div className="legend-pill"><span className="legend-pill-swatch bg-primary" /> Target corridor</div>
            {series.map((item) => (
              <div key={item.key} className="legend-pill">
                <span className="legend-pill-swatch" style={{ backgroundColor: item.color }} />
                {item.label}
              </div>
            ))}
          </div>
        ) : null}
        <ChartFrame loading={loading} emptyLabel="No feed-rate data available for the selected scope." hasData={chartRows.length > 0}>
          <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
            <Line data={chartData} options={chartOptions} />
          </LazyRender>
        </ChartFrame>
      </CardContent>
    </Card>
  )
}

export function FeedEfcrSection({
  loading,
  points,
}: {
  loading: boolean
  points: EfcrTrendPoint[]
}) {
  const chartRows = useMemo(() => {
    const byDate = new Map<string, { date: string; efcrSum: number; efcrCount: number; efcr: number | null }>()
    points.forEach((row) => {
      const current = byDate.get(row.date) ?? { date: row.date, efcrSum: 0, efcrCount: 0, efcr: null }
      if (typeof row.efcr === "number" && Number.isFinite(row.efcr)) {
        current.efcrSum += row.efcr
        current.efcrCount += 1
        current.efcr = current.efcrSum / current.efcrCount
      }
      byDate.set(row.date, current)
    })

    return Array.from(byDate.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)))
  }, [points])

  const palette = getChartPalette()
  const dateDomain = useMemo(() => buildDailyDateDomain(chartRows.map((row) => String(row.date ?? ""))), [chartRows])
  const rowsByDate = useMemo(() => new Map(chartRows.map((row) => [String(row.date ?? ""), row])), [chartRows])
  const xLimit = getDateAxisMaxTicks(dateDomain.length)

  const chartData = useMemo<ChartData<"line">>(
    () => ({
      labels: dateDomain,
      datasets: [
        {
          label: "eFCR",
          data: dateDomain.map((date) => getValueOrNull(rowsByDate.get(date)?.efcr)),
          borderColor: CHART_COLORS[0],
          backgroundColor: createVerticalGradient(CHART_COLORS[0], 0.18, 0.02),
          borderWidth: 2.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          spanGaps: true,
        },
      ],
    }),
    [dateDomain, rowsByDate],
  )

  const chartOptions = useMemo<ChartOptions<"line">>(
    () =>
      buildCartesianOptions({
        palette,
        xMaxTicksLimit: xLimit,
        xTitle: "Date",
        yTickFormatter: (value) => Number(value).toFixed(2),
        yTitle: "eFCR",
        tooltip: {
          callbacks: {
            title: (items: any) => {
              const value = String(dateDomain[items[0]?.dataIndex ?? 0] ?? "")
              return formatDateOnly(value, value)
            },
            label: (context: any) =>
              `eFCR: ${formatNumberValue(Number(context.parsed.y), {
                decimals: 2,
                minimumDecimals: 2,
                fallback: "N/A",
              })}`,
          },
        },
        xTickFormatter: (_value, index) =>
          new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
            new Date(`${String(dateDomain[index] ?? "")}T00:00:00`),
          ),
      }),
    [dateDomain, palette, xLimit],
  )

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle>eFCR / FCR intervals</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <ChartFrame loading={loading} emptyLabel="No eFCR trend available for the selected scope." hasData={chartRows.length > 0}>
          <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
            <Line data={chartData} options={chartOptions} />
          </LazyRender>
        </ChartFrame>
      </CardContent>
    </Card>
  )
}

function buildAverageFeedRateByDate(points: FeedRatePoint[]) {
  const byDate = new Map<string, FeedRateByDateRow>()

  points.forEach((point) => {
    if (point.feedRatePct == null || !Number.isFinite(point.feedRatePct)) return
    const current = byDate.get(point.date) ?? { date: point.date, feedRateSum: 0, feedRateCount: 0 }
    current.feedRateSum += point.feedRatePct
    current.feedRateCount += 1
    byDate.set(point.date, current)
  })

  return byDate
}

export function FeedRateBiomassSection({
  loading,
  feedRatePoints,
  productionRows,
}: {
  loading: boolean
  feedRatePoints: FeedRatePoint[]
  productionRows: ProductionTrendRpcRow[]
}) {
  const chartRows = useMemo(() => {
    const byDate = buildAverageFeedRateByDate(feedRatePoints) as Map<string, FeedRateBiomassByDateRow>

    productionRows.forEach((row) => {
      const current = byDate.get(row.date) ?? { date: row.date, feedRateSum: 0, feedRateCount: 0, biomassKg: 0 }
      current.biomassKg = (current.biomassKg ?? 0) + (row.total_biomass ?? 0)
      byDate.set(row.date, current)
    })

    return Array.from(byDate.values())
      .map((row) => {
        return {
          date: row.date,
          feedRatePct: row.feedRateCount > 0 ? row.feedRateSum / row.feedRateCount : null,
          biomassKg: row.biomassKg ?? null,
        }
      })
      .filter((row) => row.feedRatePct != null || row.biomassKg != null)
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [feedRatePoints, productionRows])

  const palette = getChartPalette()
  const dateDomain = useMemo(() => buildDailyDateDomain(chartRows.map((row) => row.date)), [chartRows])
  const rowsByDate = useMemo(() => new Map(chartRows.map((row) => [row.date, row])), [chartRows])
  const xLimit = getDateAxisMaxTicks(dateDomain.length)

  const chartData = useMemo<ChartData<"line">>(
    () => ({
      labels: dateDomain,
      datasets: [
        {
          label: "Feed rate",
          data: dateDomain.map((date) => getValueOrNull(rowsByDate.get(date)?.feedRatePct)),
          borderColor: palette.chart1,
          backgroundColor: createVerticalGradient(palette.chart1, 0.16, 0.02),
          borderWidth: 2.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          spanGaps: true,
          yAxisID: "y",
        },
        {
          label: "Biomass",
          data: dateDomain.map((date) => getValueOrNull(rowsByDate.get(date)?.biomassKg)),
          borderColor: palette.chart3,
          backgroundColor: createVerticalGradient(palette.chart3, 0.16, 0.02),
          borderWidth: 2.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          spanGaps: true,
          yAxisID: "y1",
        },
      ],
    }),
    [dateDomain, palette.chart1, palette.chart3, rowsByDate],
  )

  const chartOptions = useMemo<ChartOptions<"line">>(() => {
    const leftBounds = buildMetricAxisBounds(chartRows.map((row) => row.feedRatePct), { minFloor: 0 })
    const rightBounds = buildMetricAxisBounds(chartRows.map((row) => row.biomassKg), { minFloor: 0 })

    return buildCartesianOptions({
      palette,
      legend: true,
      min: leftBounds.min,
      max: leftBounds.max,
      rightMin: rightBounds.min,
      rightMax: rightBounds.max,
      xMaxTicksLimit: xLimit,
      xTitle: "Date",
      yTitle: "Feed rate (% biomass)",
      yRightTitle: "Biomass (kg)",
      yTickFormatter: (value) => `${Number(value).toFixed(1)}%`,
      yRightTickFormatter: (value) => formatNumberValue(Number(value), { decimals: 0, fallback: "0" }),
      tooltip: {
        callbacks: {
          title: (items: any) => {
            const value = String(dateDomain[items[0]?.dataIndex ?? 0] ?? "")
            return formatDateOnly(value, value)
          },
          label: (context: any) =>
            context.dataset.yAxisID === "y1"
              ? `Biomass: ${formatNumberValue(Number(context.parsed.y), { decimals: 1, fallback: "N/A" })} kg`
              : `Feed rate: ${formatNumberValue(Number(context.parsed.y), { decimals: 2, fallback: "N/A" })}%`,
        },
      },
      xTickFormatter: (_value, index) =>
        new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
          new Date(`${String(dateDomain[index] ?? "")}T00:00:00`),
        ),
    })
  }, [chartRows, dateDomain, palette, xLimit])

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle>Feed rate with biomass growth trend</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <ChartFrame
          loading={loading}
          emptyLabel="No feed-rate or biomass data available for the selected scope."
          hasData={chartRows.length > 0}
        >
          <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
            <Line data={chartData} options={chartOptions} />
          </LazyRender>
        </ChartFrame>
      </CardContent>
    </Card>
  )
}

export function FeedRateMortalitySection({
  loading,
  feedRatePoints,
  mortalityRows,
}: {
  loading: boolean
  feedRatePoints: FeedRatePoint[]
  mortalityRows: Tables<"fish_mortality">[]
}) {
  const chartRows = useMemo(() => {
    const byDate = buildAverageFeedRateByDate(feedRatePoints) as Map<string, FeedRateMortalityByDateRow>

    mortalityRows.forEach((row) => {
      const current = byDate.get(row.date) ?? { date: row.date, feedRateSum: 0, feedRateCount: 0, mortalityCount: 0 }
      current.mortalityCount = (current.mortalityCount ?? 0) + (row.number_of_fish_mortality ?? 0)
      byDate.set(row.date, current)
    })

    return Array.from(byDate.values())
      .map((row) => {
        return {
          date: row.date,
          feedRatePct: row.feedRateCount > 0 ? row.feedRateSum / row.feedRateCount : null,
          mortalityCount: row.mortalityCount ?? null,
        }
      })
      .filter((row) => row.feedRatePct != null || row.mortalityCount != null)
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [feedRatePoints, mortalityRows])

  const palette = getChartPalette()
  const dateDomain = useMemo(() => buildDailyDateDomain(chartRows.map((row) => row.date)), [chartRows])
  const rowsByDate = useMemo(() => new Map(chartRows.map((row) => [row.date, row])), [chartRows])
  const xLimit = getDateAxisMaxTicks(dateDomain.length)

  const chartData = useMemo<ChartData<"line">>(
    () => ({
      labels: dateDomain,
      datasets: [
        {
          label: "Feed rate",
          data: dateDomain.map((date) => getValueOrNull(rowsByDate.get(date)?.feedRatePct)),
          borderColor: palette.chart1,
          backgroundColor: createVerticalGradient(palette.chart1, 0.16, 0.02),
          borderWidth: 2.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          spanGaps: true,
          yAxisID: "y",
        },
        {
          label: "Mortality",
          data: dateDomain.map((date) => getValueOrNull(rowsByDate.get(date)?.mortalityCount)),
          borderColor: palette.destructive,
          backgroundColor: createVerticalGradient(palette.destructive, 0.16, 0.02),
          borderWidth: 2.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          spanGaps: true,
          yAxisID: "y1",
        },
      ],
    }),
    [dateDomain, palette.chart1, palette.destructive, rowsByDate],
  )

  const chartOptions = useMemo<ChartOptions<"line">>(() => {
    const leftBounds = buildMetricAxisBounds(chartRows.map((row) => row.feedRatePct), { minFloor: 0 })
    const rightBounds = buildMetricAxisBounds(chartRows.map((row) => row.mortalityCount), { minFloor: 0 })

    return buildCartesianOptions({
      palette,
      legend: true,
      min: leftBounds.min,
      max: leftBounds.max,
      rightMin: rightBounds.min,
      rightMax: rightBounds.max,
      xMaxTicksLimit: xLimit,
      xTitle: "Date",
      yTitle: "Feed rate (% biomass)",
      yRightTitle: "Mortality count",
      yTickFormatter: (value) => `${Number(value).toFixed(1)}%`,
      yRightTickFormatter: (value) => formatNumberValue(Number(value), { decimals: 0, fallback: "0" }),
      tooltip: {
        callbacks: {
          title: (items: any) => {
            const value = String(dateDomain[items[0]?.dataIndex ?? 0] ?? "")
            return formatDateOnly(value, value)
          },
          label: (context: any) =>
            context.dataset.yAxisID === "y1"
              ? `Mortality: ${formatNumberValue(Number(context.parsed.y), { decimals: 0, fallback: "N/A" })} fish`
              : `Feed rate: ${formatNumberValue(Number(context.parsed.y), { decimals: 2, fallback: "N/A" })}%`,
        },
      },
      xTickFormatter: (_value, index) =>
        new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
          new Date(`${String(dateDomain[index] ?? "")}T00:00:00`),
        ),
    })
  }, [chartRows, dateDomain, palette, xLimit])

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle>Feed rate with mortality trend</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <ChartFrame
          loading={loading}
          emptyLabel="No feed-rate or mortality data available for the selected scope."
          hasData={chartRows.length > 0}
        >
          <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
            <Line data={chartData} options={chartOptions} />
          </LazyRender>
        </ChartFrame>
      </CardContent>
    </Card>
  )
}

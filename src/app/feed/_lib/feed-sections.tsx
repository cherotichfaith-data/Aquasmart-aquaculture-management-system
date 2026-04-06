"use client"

import { useMemo } from "react"
import type { ChartData, ChartOptions } from "chart.js"
import {
  Line,
} from "@/components/charts/chartjs"
import { AlertTriangle, CheckCircle2, TrendingDown, TrendingUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  buildCartesianOptions,
  buildDailyDateDomain,
  buildMetricAxisBounds,
  getChartPalette,
  getDateAxisMaxTicks,
  withAlpha,
} from "@/components/charts/chartjs-theme"
import type { FeedRunningStockRow } from "@/lib/api/reports"
import { cn } from "@/lib/utils"
import { LazyRender } from "@/components/shared/lazy-render"
import type { FcrInterval, FeedDeviationCell, FeedRatePoint } from "./feed-analytics"

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-primary)",
]

const DEVIATION_CLASSES: Record<FeedDeviationCell["status"], string> = {
  above: "bg-orange-500 text-white",
  below: "bg-amber-400 text-slate-900",
  in_target: "bg-emerald-600 text-white",
  no_target: "bg-sky-500 text-white",
  missing: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
}

const SEVERITY_CLASSES = {
  critical: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  info: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
} as const

export type FeedExceptionItem = {
  id: string
  severity: "critical" | "warning" | "info"
  title: string
  detail: string
  systemId?: number
}

const formatNumber = (value: number | null | undefined, decimals = 2) =>
  value == null || Number.isNaN(value)
    ? "N/A"
    : value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })

const formatFullDate = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(parsed)
}

const getValueOrNull = (value: string | number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? value : null

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
    return <div className="h-[340px] flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
  }

  if (!hasData) {
    return <div className="h-[340px] flex items-center justify-center text-sm text-muted-foreground">{emptyLabel}</div>
  }

  return <div className="h-[340px] rounded-xl border border-border/80 bg-muted/20 p-2">{children}</div>
}

export function FeedKpiStrip({
  latestFeedDate,
  feedTodayKg,
  fedSystemsToday,
  activeSystemCount,
  minStockDays,
  overfeedingCount,
  poorAppetiteCount,
  lowGrowthCount,
  survivalRiskCount,
  worstFcr,
}: {
  latestFeedDate: string | null
  feedTodayKg: number
  fedSystemsToday: number
  activeSystemCount: number
  minStockDays: number | null
  overfeedingCount: number
  poorAppetiteCount: number
  lowGrowthCount: number
  survivalRiskCount: number
  worstFcr: { label: string; value: number | null } | null
}) {
  const metrics = [
    {
      title: "Feed Today",
      value: `${formatNumber(feedTodayKg, 1)} kg`,
      meta: latestFeedDate ? formatFullDate(latestFeedDate) : "No feed day",
      icon: CheckCircle2,
    },
    {
      title: "Cages Fed",
      value: `${fedSystemsToday}/${activeSystemCount}`,
      meta: "Active cages",
      icon: CheckCircle2,
    },
    {
      title: "Above Target",
      value: String(overfeedingCount),
      meta: "Latest ration check",
      icon: TrendingDown,
    },
    {
      title: "Poor Appetite",
      value: String(poorAppetiteCount),
      meta: "Consecutive poor logs",
      icon: AlertTriangle,
    },
    {
      title: "Low Growth",
      value: String(lowGrowthCount),
      meta: "SGR below 0.7%/day",
      icon: TrendingDown,
    },
    {
      title: "Survival Risk",
      value: String(survivalRiskCount),
      meta: "Below 95%",
      icon: AlertTriangle,
    },
    {
      title: "Stock Cover",
      value: minStockDays != null ? `${formatNumber(minStockDays, 0)}d` : "N/A",
      meta: "Minimum days remaining",
      icon: AlertTriangle,
    },
    {
      title: "Worst FCR",
      value: worstFcr?.value != null ? formatNumber(worstFcr.value, 2) : "N/A",
      meta: worstFcr?.label ?? "No interval",
      icon: TrendingUp,
    },
  ]

  return (
    <div className="rounded-2xl border border-border/80 bg-card shadow-sm">
      <div className="grid gap-px overflow-hidden rounded-2xl bg-border/60 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        {metrics.map((metric) => {
          const Icon = metric.icon
          return (
            <div key={metric.title} className="bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{metric.title}</p>
                  <p className="mt-2 text-2xl font-semibold">{metric.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{metric.meta}</p>
                </div>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function FeedMatrixSection({
  loading,
  systemIds,
  dates,
  cells,
  systemNameById,
  onSystemSelect,
}: {
  loading: boolean
  systemIds: number[]
  dates: string[]
  cells: FeedDeviationCell[]
  systemNameById: Map<number, string>
  onSystemSelect?: (systemId: number) => void
}) {
  const cellMap = useMemo(() => {
    const map = new Map<string, FeedDeviationCell>()
    cells.forEach((cell) => {
      map.set(`${cell.systemId}:${cell.date}`, cell)
    })
    return map
  }, [cells])
  const dateWindowLabel = dates.length === 1 ? "1 day" : `${dates.length} days`

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/70 bg-muted/20">
        <CardTitle>Cage Feed Deviation</CardTitle>
        <CardDescription>{`${dateWindowLabel} of ration variance within the selected time period.`}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {loading ? (
          <div className="h-[420px] flex items-center justify-center text-sm text-muted-foreground">Loading matrix...</div>
        ) : systemIds.length === 0 || dates.length === 0 ? (
          <div className="h-[420px] flex items-center justify-center text-sm text-muted-foreground">No cage matrix scope available.</div>
        ) : (
          <div className="overflow-auto rounded-xl border border-border/80">
            <div className="min-w-[920px]">
              <div className="grid" style={{ gridTemplateColumns: `180px repeat(${dates.length}, minmax(34px, 1fr))` }}>
                <div className="sticky left-0 z-10 border-b border-r border-border bg-card px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Cage
                </div>
                {dates.map((date) => (
                  <div key={date} className="border-b border-border px-1 py-2 text-center text-[10px] text-muted-foreground">
                    {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(`${date}T00:00:00`))}
                  </div>
                ))}
                {systemIds.map((systemId) => (
                  <div key={systemId} className="contents">
                    <button
                      type="button"
                      onClick={() => onSystemSelect?.(systemId)}
                      className="sticky left-0 z-10 border-r border-border bg-card px-3 py-2 text-left text-sm font-medium hover:bg-muted/40"
                    >
                      {systemNameById.get(systemId) ?? `System ${systemId}`}
                    </button>
                    {dates.map((date) => {
                      const cell = cellMap.get(`${systemId}:${date}`)
                      if (!cell) {
                        return <div key={`${systemId}-${date}`} className="h-9 border-b border-border bg-slate-200 dark:bg-slate-800" />
                      }
                      return (
                        <button
                          key={`${systemId}-${date}`}
                          type="button"
                          className={cn("h-9 border-b border-border transition-opacity hover:opacity-85", DEVIATION_CLASSES[cell.status])}
                          title={cell.detail}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-orange-500" /> Above target</div>
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-amber-400" /> Below target</div>
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-emerald-600" /> In target</div>
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-sky-500" /> No target basis</div>
          </div>
          <div className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2 text-muted-foreground">
            Hover a cell for cage-day detail. The matrix uses biomass guide bands derived from the latest sampled weight.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function FeedExceptionsRail({
  loading,
  items,
  onSystemSelect,
}: {
  loading: boolean
  items: FeedExceptionItem[]
  onSystemSelect?: (systemId: number) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Exceptions</CardTitle>
        <CardDescription>What needs action first.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="py-8 text-sm text-muted-foreground">Loading exceptions...</div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-border/80 bg-muted/20 p-4 text-sm text-muted-foreground">
            No feed exceptions in the selected scope.
          </div>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => item.systemId != null && onSystemSelect?.(item.systemId)}
              className={cn(
                "w-full rounded-xl border p-3 text-left",
                SEVERITY_CLASSES[item.severity],
                item.systemId != null ? "cursor-pointer hover:opacity-85" : "cursor-default",
              )}
            >
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="mt-1 text-xs">{item.detail}</p>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export function FeedStockCompact({
  rows,
}: {
  rows: FeedRunningStockRow[]
}) {
  const sortedRows = useMemo(
    () => rows.slice().sort((a, b) => (a.days_remaining ?? Number.POSITIVE_INFINITY) - (b.days_remaining ?? Number.POSITIVE_INFINITY)),
    [rows],
  )

  const worst = sortedRows[0] ?? null
  const visibleRows = sortedRows.slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Coverage</CardTitle>
        <CardDescription>Compact reorder view.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Lowest cover</p>
          <p className="mt-2 text-3xl font-semibold">
            {worst?.days_remaining != null ? `${formatNumber(worst.days_remaining, 0)}d` : "N/A"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{worst?.feed_type_name ?? "No running stock"}</p>
        </div>

        <div className="space-y-3">
          {visibleRows.length > 0 ? (
            visibleRows.map((row) => {
              const days = row.days_remaining ?? null
              const barWidth = days == null ? 0 : Math.max(8, Math.min(100, (days / 45) * 100))
              const tone =
                days == null ? "bg-slate-400" : days < 14 ? "bg-red-500" : days < 30 ? "bg-amber-500" : "bg-emerald-500"
              return (
                <div key={`${row.feed_type_name}-${row.current_stock_kg}-${row.days_remaining}`} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{row.feed_type_name}</p>
                      <p className="text-xs text-muted-foreground">{formatNumber(row.current_stock_kg, 1)} kg on hand</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{days != null ? `${formatNumber(days, 0)}d` : "N/A"}</p>
                      <p className="text-xs text-muted-foreground">{formatNumber(row.avg_daily_usage_kg, 1)} kg/day</p>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className={cn("h-2 rounded-full", tone)} style={{ width: `${barWidth}%` }} />
                  </div>
                </div>
              )
            })
          ) : (
            <div className="rounded-xl border border-border/80 bg-muted/20 p-4 text-sm text-muted-foreground">
              No running stock available.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
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
      Record<string, string | number | null> & { lowerBandSum: number; lowerBandCount: number; upperBandSum: number; upperBandCount: number }
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
          borderWidth: 1.6,
          pointRadius: 0,
          spanGaps: true,
        },
        {
          label: "Target corridor",
          data: dateDomain.map((date) => getValueOrNull(rowsByDate.get(date)?.upperBand)),
          borderColor: withAlpha(palette.chart2, 0.7),
          backgroundColor: withAlpha(palette.chart2, 0.14),
          borderWidth: 1.6,
          pointRadius: 0,
          fill: "-1",
          spanGaps: true,
        },
        ...series.map((item) => ({
          label: item.label,
          data: dateDomain.map((date) => getValueOrNull(rowsByDate.get(date)?.[item.key])),
          borderColor: item.color,
          backgroundColor: item.color,
          borderWidth: 2.2,
          pointRadius: 0,
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
      yTickFormatter: (value) => `${Number(value).toFixed(1)}%`,
      yTitle: "Feed rate (% biomass)",
      tooltip: {
        callbacks: {
          title: (items: any) => formatFullDate(String(dateDomain[items[0]?.dataIndex ?? 0] ?? "")),
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
      <CardHeader>
        <CardTitle>Feed Rate vs Target</CardTitle>
        <CardDescription>Feed offered as percent of biomass against the scoped target corridor.</CardDescription>
      </CardHeader>
      <CardContent>
        {series.length > 0 ? (
          <div className="mb-4 legend-pills">
            <div className="legend-pill"><span className="legend-pill-swatch bg-chart-2" /> Target corridor</div>
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

export function FeedFcrSection({
  loading,
  intervals,
  systemNameById,
}: {
  loading: boolean
  intervals: FcrInterval[]
  systemNameById: Map<number, string>
}) {
  const chartRows = useMemo(() => {
    const byDate = new Map<string, Record<string, string | number | null>>()
    intervals.forEach((row) => {
      const current = byDate.get(row.endDate) ?? { date: row.endDate, label: row.endDate }
      current[`system_${row.systemId}`] = row.fcr
      byDate.set(row.endDate, current)
    })
    return Array.from(byDate.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)))
  }, [intervals])

  const series = useMemo(
    () =>
      Array.from(new Set(intervals.map((row) => row.systemId))).map((systemId, index) => ({
        systemId,
        key: `system_${systemId}`,
        label: systemNameById.get(systemId) ?? `System ${systemId}`,
        color: CHART_COLORS[index % CHART_COLORS.length],
      })),
    [intervals, systemNameById],
  )

  const palette = getChartPalette()
  const dateDomain = useMemo(() => buildDailyDateDomain(chartRows.map((row) => String(row.date ?? ""))), [chartRows])
  const rowsByDate = useMemo(() => new Map(chartRows.map((row) => [String(row.date ?? ""), row])), [chartRows])
  const xLimit = getDateAxisMaxTicks(dateDomain.length)

  const chartData = useMemo<ChartData<"line">>(
    () => ({
      labels: dateDomain,
      datasets: series.map((item) => ({
        label: item.label,
        data: dateDomain.map((date) => getValueOrNull(rowsByDate.get(date)?.[item.key])),
        borderColor: item.color,
        backgroundColor: item.color,
        borderWidth: 1.8,
        pointRadius: 2,
        pointHoverRadius: 4,
        spanGaps: true,
      })),
    }),
    [dateDomain, rowsByDate, series],
  )

  const chartOptions = useMemo<ChartOptions<"line">>(() => {
    const yBounds = buildMetricAxisBounds(
      chartRows.flatMap((row) => series.map((item) => getValueOrNull(row[item.key]))),
      { minFloor: 0, trimOutliers: true },
    )

    return buildCartesianOptions({
      palette,
      min: yBounds.min,
      max: Math.max(1.5, yBounds.max ?? 1.5),
      xMaxTicksLimit: xLimit,
      yTickFormatter: (value) => Number(value).toFixed(2),
      yTitle: "FCR",
      tooltip: {
        callbacks: {
          title: (items: any) => formatFullDate(String(dateDomain[items[0]?.dataIndex ?? 0] ?? "")),
          label: (context: any) => `${context.dataset.label}: ${formatNumber(Number(context.parsed.y), 2)}`,
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
      <CardHeader>
        <CardTitle>FCR Trend</CardTitle>
        <CardDescription>Interval feed efficiency by cage with target checks handled in the exception rail.</CardDescription>
      </CardHeader>
      <CardContent>
        {series.length > 0 ? (
          <div className="mb-4 legend-pills">
            {series.map((item) => (
              <div key={item.key} className="legend-pill">
                <span className="legend-pill-swatch" style={{ backgroundColor: item.color }} />
                {item.label}
              </div>
            ))}
          </div>
        ) : null}
        <ChartFrame loading={loading} emptyLabel="No FCR intervals available for the selected scope." hasData={chartRows.length > 0}>
          <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
            <Line data={chartData} options={chartOptions} />
          </LazyRender>
        </ChartFrame>
      </CardContent>
    </Card>
  )
}

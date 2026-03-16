"use client"

import { useMemo } from "react"
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { AlertTriangle, CheckCircle2, TrendingDown, TrendingUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { FeedRunningStockRow } from "@/lib/api/reports"
import { cn } from "@/lib/utils"
import { LazyRender } from "@/components/shared/lazy-render"
import type { FcrInterval, FeedDeviationCell, FeedRatePoint } from "./feed-analytics"

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "#14b8a6",
  "#f97316",
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

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/70 bg-muted/20">
        <CardTitle>Cage Feed Deviation</CardTitle>
        <CardDescription>Last 14 days of ration variance by cage.</CardDescription>
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
    const byDate = new Map<string, Record<string, string | number | null>>()
    points.forEach((point) => {
      const current = byDate.get(point.date) ?? {
        date: point.date,
        label: point.label,
        lowerBand: point.lowerBand,
        upperBand: point.upperBand,
      }
      current[`system_${point.systemId}`] = point.feedRatePct
      if (point.lowerBand != null) current.lowerBand = point.lowerBand
      if (point.upperBand != null) current.upperBand = point.upperBand
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feed Rate vs Target</CardTitle>
        <CardDescription>Feed offered as percent of biomass.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartFrame loading={loading} emptyLabel="No feed-rate data available for the selected scope." hasData={chartRows.length > 0}>
          <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartRows}>
                <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.35} />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip
                  labelFormatter={(value, payload) => formatFullDate(String(payload?.[0]?.payload?.date ?? value))}
                  formatter={(value, name) => [`${formatNumber(Number(value), 2)}%`, String(name)]}
                />
                <Legend />
                <Area type="monotone" dataKey="upperBand" stroke="transparent" fill="rgba(34,197,94,0.08)" name="Target" />
                <Line type="monotone" dataKey="lowerBand" stroke="#16a34a" strokeDasharray="4 4" dot={false} name="Target" />
                {series.map((item) => (
                  <Line
                    key={item.key}
                    type="monotone"
                    dataKey={item.key}
                    name={item.label}
                    stroke={item.color}
                    strokeWidth={2.2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>FCR Trend</CardTitle>
        <CardDescription>Interval feed efficiency by cage.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartFrame loading={loading} emptyLabel="No FCR intervals available for the selected scope." hasData={chartRows.length > 0}>
          <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartRows}>
                <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.35} />
                <XAxis dataKey="label" />
                <YAxis domain={[0, "dataMax + 0.5"]} />
                <Tooltip
                  labelFormatter={(value, payload) => formatFullDate(String(payload?.[0]?.payload?.date ?? value))}
                  formatter={(value, name) => [formatNumber(Number(value), 2), String(name)]}
                />
                <Legend />
                <ReferenceLine y={1.5} stroke="#16a34a" strokeDasharray="4 4" />
                <ReferenceLine y={2.0} stroke="#ef4444" strokeDasharray="4 4" />
                {series.map((item) => (
                  <Line
                    key={item.key}
                    type="monotone"
                    dataKey={item.key}
                    name={item.label}
                    stroke={item.color}
                    strokeWidth={2.2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </LazyRender>
        </ChartFrame>
      </CardContent>
    </Card>
  )
}

"use client"

import { Card, CardContent, CardHeader } from "@/components/app-ui/card"
import { DataErrorState, EmptyState } from "@/components/shared/data-states"
import { PRODUCTION_METRICS, type ProductionMetric } from "@/features/production/components/metrics"
import type { ProductionChartMarker } from "@/features/production/queries.server"

export type ProductionChartRow = {
  date: string
  label: string
  value: number | null
}

const MARKER_COLORS: Record<ProductionChartMarker["type"], string> = {
  stocking: "var(--color-success)",
  transfer: "var(--color-warning)",
  harvest: "var(--color-destructive)",
  water_quality: "var(--color-info)",
}

function formatProductionMetricValue(value: number, metric: ProductionMetric) {
  const meta = PRODUCTION_METRICS[metric]

  switch (metric) {
    case "efcr":
      return value.toFixed(2)
    case "biomass":
      return `${Math.round(value).toLocaleString("en-US")} ${meta.unit}`.trim()
    case "density":
      return `${value.toFixed(1)} ${meta.unit}`.trim()
    case "abw":
      return `${Math.round(value)} ${meta.unit}`.trim()
    case "mortality":
    case "feeding":
      return `${value.toFixed(2)}${meta.unit}`
    default:
      return value.toFixed(meta.decimals)
  }
}

// ---- chart geometry (categorical x-axis, shared across primary + compare series) ----
const PLOT_LEFT = 64
const PLOT_RIGHT_SINGLE = 964
const PLOT_RIGHT_DUAL = 924
const PLOT_TOP = 20
const PLOT_BOTTOM = 260
const MARKER_LABEL_Y = PLOT_BOTTOM + 22
const DATE_LABEL_Y = PLOT_BOTTOM + 54
const CHART_HEIGHT = DATE_LABEL_Y + 20

function buildScale(values: number[]) {
  const lo0 = Math.min(...values)
  const hi0 = Math.max(...values)
  const pad = (hi0 - lo0) * 0.15 || Math.abs(hi0) * 0.1 || 1
  const lo = lo0 - pad
  const hi = hi0 + pad
  return {
    lo,
    hi,
    y: (v: number) => PLOT_BOTTOM - ((v - lo) / (hi - lo || 1)) * (PLOT_BOTTOM - PLOT_TOP),
  }
}

function xForIndex(index: number, count: number, plotRight: number) {
  if (count <= 1) return (PLOT_LEFT + plotRight) / 2
  return PLOT_LEFT + (index * (plotRight - PLOT_LEFT)) / (count - 1)
}

type ValidRow = { date: string; label: string; value: number }

type ScaledSeries = {
  points: Array<ValidRow & { x: number; y: number }>
  linePath: string
  areaPath: string
  yTicks: Array<{ y: number; label: string }>
}

function buildSeries(
  rows: ValidRow[],
  metric: ProductionMetric,
  dateIndex: Map<string, number>,
  domainSize: number,
  plotRight: number,
): ScaledSeries {
  const scale = buildScale(rows.map((row) => row.value))
  const points = rows.map((row) => {
    const index = dateIndex.get(row.date) ?? 0
    return { ...row, x: xForIndex(index, domainSize, plotRight), y: scale.y(row.value) }
  })
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${PLOT_BOTTOM} L ${points[0].x.toFixed(1)} ${PLOT_BOTTOM} Z`
    : ""
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const value = scale.hi - ((scale.hi - scale.lo) * i) / 4
    const y = PLOT_TOP + ((PLOT_BOTTOM - PLOT_TOP) * i) / 4
    return { y, label: formatProductionMetricValue(value, metric) }
  })
  return { points, linePath, areaPath, yTicks }
}

function toValidRows(rows: ProductionChartRow[]): ValidRow[] {
  return rows.filter(
    (row): row is ValidRow => typeof row.value === "number" && Number.isFinite(row.value),
  )
}

export default function ProductionChart({
  metric,
  rows,
  compareMetric,
  compareRows,
  markers,
  periodLabel,
  isLoading,
  error,
  onRetry,
}: {
  metric: ProductionMetric
  rows: ProductionChartRow[]
  compareMetric?: ProductionMetric | null
  compareRows?: ProductionChartRow[]
  markers?: ProductionChartMarker[]
  periodLabel?: string | null
  isLoading: boolean
  isFetching?: boolean
  error?: string | null
  onRetry?: () => void
}) {
  const meta = PRODUCTION_METRICS[metric]
  const compareMeta = compareMetric ? PRODUCTION_METRICS[compareMetric] : null
  const primaryRows = toValidRows(rows)
  const compareValidRows = compareMetric ? toValidRows(compareRows ?? []) : []
  const hasCompare = Boolean(compareMetric && compareMeta && compareValidRows.length > 0)
  const singlePoint = primaryRows.length === 1 ? primaryRows[0] : null

  // Shared categorical date domain so the primary and compare lines (which may come
  // from different-granularity sources) line up on the same x position for the same date.
  const domainDates = Array.from(
    new Set([...primaryRows.map((row) => row.date), ...compareValidRows.map((row) => row.date)]),
  ).sort()
  const dateIndex = new Map(domainDates.map((date, index) => [date, index]))
  const dateLabels = new Map(
    [...compareValidRows, ...primaryRows].map((row) => [row.date, row.label]),
  )
  const plotRight = hasCompare ? PLOT_RIGHT_DUAL : PLOT_RIGHT_SINGLE

  const primarySeries =
    domainDates.length > 1 ? buildSeries(primaryRows, metric, dateIndex, domainDates.length, plotRight) : null
  const compareSeries =
    hasCompare && compareMetric && domainDates.length > 1
      ? buildSeries(compareValidRows, compareMetric, dateIndex, domainDates.length, plotRight)
      : null

  const xTickCount = Math.min(7, domainDates.length)
  const xTickIndexes =
    domainDates.length > 1
      ? Array.from(new Set(Array.from({ length: xTickCount }, (_, i) => Math.round((i * (domainDates.length - 1)) / (xTickCount - 1 || 1)))))
      : []

  const domainStartMs = domainDates.length > 0 ? Date.parse(domainDates[0]) : NaN
  const domainEndMs = domainDates.length > 0 ? Date.parse(domainDates[domainDates.length - 1]) : NaN
  const chartMarkers = (markers ?? [])
    .map((marker) => {
      const ms = Date.parse(marker.date)
      if (!Number.isFinite(ms) || !Number.isFinite(domainStartMs) || !Number.isFinite(domainEndMs)) return null
      if (domainEndMs <= domainStartMs) return null
      const t = Math.min(1, Math.max(0, (ms - domainStartMs) / (domainEndMs - domainStartMs)))
      return { ...marker, x: PLOT_LEFT + t * (plotRight - PLOT_LEFT) }
    })
    .filter((marker): marker is ProductionChartMarker & { x: number } => marker !== null)
    .sort((a, b) => a.x - b.x)

  let lastMarkerLabelEnd = -Infinity
  const markerLabelMinGap = 64

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
    <Card className="rounded-2xl">
      <CardHeader className="px-6 pt-6 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold"
              style={{
                background: "color-mix(in srgb, var(--production-chart-primary) 12%, transparent)",
                color: "var(--production-chart-primary)",
              }}
            >
              {meta.label}
            </span>
            {hasCompare && compareMeta ? (
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold"
                style={{
                  background: "color-mix(in srgb, var(--production-chart-compare) 16%, transparent)",
                  color: "var(--production-chart-compare)",
                }}
              >
                {compareMeta.label}
              </span>
            ) : null}
          </div>
          {periodLabel ? <span className="text-xs text-muted-foreground md:text-[13px]">{periodLabel}</span> : null}
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-4">
        {isLoading ? (
          <div className="h-[360px] animate-pulse rounded-lg bg-muted/50" />
        ) : primarySeries ? (
          <div className="flex flex-col gap-3">
            <div className="w-full rounded-lg border border-border bg-background/35 p-3">
              <svg
                viewBox={`0 0 1000 ${CHART_HEIGHT}`}
                className="h-[360px] w-full"
                role="img"
                aria-label={hasCompare && compareMeta ? `${meta.label} vs ${compareMeta.label}` : meta.label}
              >
                <defs>
                  <linearGradient id="production-chart-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--production-chart-primary)" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="var(--production-chart-primary)" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {primarySeries.yTicks.map((tick) => (
                  <g key={tick.y}>
                    <line
                      x1={PLOT_LEFT}
                      x2={plotRight}
                      y1={tick.y}
                      y2={tick.y}
                      stroke="var(--chart-grid)"
                      strokeWidth="1"
                    />
                    <text x={PLOT_LEFT - 10} y={tick.y + 4} textAnchor="end" fontSize="12" fill="var(--color-muted-foreground)">
                      {tick.label}
                    </text>
                  </g>
                ))}

                {compareSeries
                  ? compareSeries.yTicks.map((tick) => (
                      <text
                        key={`cmp-${tick.y}`}
                        x={plotRight + 10}
                        y={tick.y + 4}
                        textAnchor="start"
                        fontSize="12"
                        fill="var(--production-chart-compare)"
                      >
                        {tick.label}
                      </text>
                    ))
                  : null}

                {chartMarkers.map((marker, index) => {
                  const showLabel = marker.x - lastMarkerLabelEnd >= markerLabelMinGap
                  if (showLabel) lastMarkerLabelEnd = marker.x + markerLabelMinGap
                  const color = MARKER_COLORS[marker.type]
                  return (
                    <g key={`${marker.date}-${marker.type}-${index}`}>
                      <title>{`${marker.label}${marker.notes ? ` — ${marker.notes}` : ""} · ${marker.date}`}</title>
                      <line
                        x1={marker.x}
                        x2={marker.x}
                        y1={PLOT_TOP}
                        y2={PLOT_BOTTOM}
                        stroke="var(--border)"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                      />
                      <circle cx={marker.x} cy={PLOT_BOTTOM} r="5" fill={color} stroke="var(--card)" strokeWidth="2" />
                      {showLabel ? (
                        <text x={marker.x} y={MARKER_LABEL_Y} textAnchor="middle" fontSize="11" fontWeight="600" fill={color}>
                          {marker.label}
                        </text>
                      ) : null}
                    </g>
                  )
                })}

                <path d={primarySeries.areaPath} fill="url(#production-chart-fill)" />
                <path
                  d={primarySeries.linePath}
                  fill="none"
                  stroke="var(--production-chart-primary)"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {primarySeries.points.length > 0
                  ? (() => {
                      const lastPoint = primarySeries.points[primarySeries.points.length - 1]
                      return (
                        <g>
                          <circle cx={lastPoint.x} cy={lastPoint.y} r="4.5" fill="var(--production-chart-primary)" stroke="var(--card)" strokeWidth="2" />
                          <title>{`${lastPoint.date}: ${formatProductionMetricValue(lastPoint.value, metric)}`}</title>
                        </g>
                      )
                    })()
                  : null}

                {compareSeries && compareMetric ? (
                  <g>
                    <path
                      d={compareSeries.linePath}
                      fill="none"
                      stroke="var(--production-chart-compare)"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    {compareSeries.points.length > 0
                      ? (() => {
                          const lastPoint = compareSeries.points[compareSeries.points.length - 1]
                          return (
                            <g>
                              <circle cx={lastPoint.x} cy={lastPoint.y} r="4.5" fill="var(--production-chart-compare)" stroke="var(--card)" strokeWidth="2" />
                              <title>{`${lastPoint.date}: ${formatProductionMetricValue(lastPoint.value, compareMetric)}`}</title>
                            </g>
                          )
                        })()
                      : null}
                  </g>
                ) : null}

                {xTickIndexes.map((index) => {
                  const date = domainDates[index]
                  if (!date) return null
                  const x = xForIndex(index, domainDates.length, plotRight)
                  return (
                    <text key={`${date}-tick`} x={x} y={DATE_LABEL_Y} textAnchor="middle" fontSize="12" fill="var(--color-muted-foreground)">
                      {dateLabels.get(date) ?? date}
                    </text>
                  )
                })}
              </svg>
            </div>
            {hasCompare && compareMeta ? (
              <div className="flex flex-wrap justify-center gap-6 text-[13px] font-medium text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <span className="h-[3px] w-[18px] rounded-full" style={{ background: "var(--production-chart-primary)" }} />
                  {meta.label} (left axis)
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-[3px] w-[18px] rounded-full" style={{ background: "var(--production-chart-compare)" }} />
                  {compareMeta.label} (right axis)
                </span>
              </div>
            ) : null}
          </div>
        ) : singlePoint ? (
          <div className="flex h-[360px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 p-6">
            <div className="flex max-w-sm flex-col items-center gap-2 text-center">
              <p className="text-sm text-muted-foreground">{singlePoint.date}</p>
              <p className="text-4xl font-semibold tracking-tight text-foreground">
                {formatProductionMetricValue(singlePoint.value, metric)}
              </p>
              <p className="text-sm font-medium text-foreground">{meta.label}</p>
              <p className="text-sm text-muted-foreground">
                Only one production point is available for this date range, so there is not enough data to draw a trend line yet.
              </p>
            </div>
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

"use client"

import { useMemo, useState } from "react"
import type { ChartData, ChartOptions, ScriptableContext, TooltipItem } from "chart.js"
import { Line } from "@/components/charts/chartjs"
import {
  buildCartesianOptions,
  createVerticalGradient,
  getChartPalette,
  getDateAxisMaxTicks,
  readCssVar,
  withAlpha,
} from "@/components/charts/chartjs-theme"
import { chartEventMarkersPlugin, type ChartEventMarker } from "@/components/charts/chart-event-markers-plugin"
import { Card, CardContent, CardHeader } from "@/components/app-ui/card"
import { DataErrorState, EmptyState } from "@/components/shared/data-states"
import { useIsDesktop } from "@/lib/hooks/use-is-desktop"
import { PRODUCTION_METRICS, type ProductionMetric } from "@/features/production/components/metrics"
import type { ProductionChartMarker } from "@/features/production/queries.server"

export type ProductionChartRow = {
  date: string
  label: string
  value: number | null
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

type ValidRow = { date: string; label: string; value: number }

function toValidRows(rows: ProductionChartRow[]): ValidRow[] {
  return rows.filter(
    (row): row is ValidRow => typeof row.value === "number" && Number.isFinite(row.value),
  )
}

const CHART_HEIGHT_CLASS = "h-[280px] sm:h-[360px]"

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
  const primaryRows = useMemo(() => toValidRows(rows), [rows])
  const compareValidRows = useMemo(() => (compareMetric ? toValidRows(compareRows ?? []) : []), [compareMetric, compareRows])
  const hasCompare = Boolean(compareMetric && compareMeta && compareValidRows.length > 0)
  const singlePoint = primaryRows.length === 1 ? primaryRows[0] : null

  const isDesktop = useIsDesktop()
  // Overlaying two different scales on one plot reads fine with the room a
  // desktop screen gives the two axis label columns; on a phone it's the
  // dual-axis anti-pattern at its most cramped. Default to one metric at a
  // time below `md`, `both` at `md` and up -- but let a farmer override
  // either way, on any size, rather than deciding it for them permanently.
  const [userViewMode, setUserViewMode] = useState<"both" | "primary" | "compare" | null>(null)
  // Reset a manual override when a different compare metric is picked
  // elsewhere in the app, so a stale "show compare only" choice doesn't
  // keep pointing at a metric that's no longer selected. Adjusting state
  // during render (React's documented pattern) instead of an effect avoids
  // an extra commit-then-rerender pass for what is otherwise a plain prop.
  const [trackedCompareMetric, setTrackedCompareMetric] = useState(compareMetric)
  if (compareMetric !== trackedCompareMetric) {
    setTrackedCompareMetric(compareMetric)
    setUserViewMode(null)
  }
  const viewMode = userViewMode ?? (isDesktop ? "both" : "primary")
  const showBoth = viewMode === "both" && hasCompare
  const showingCompareOnly = viewMode === "compare" && hasCompare

  const displayMetric = showingCompareOnly && compareMetric ? compareMetric : metric
  const displayMeta = showingCompareOnly && compareMeta ? compareMeta : meta

  const palette = getChartPalette()
  const primaryColor = readCssVar("--production-chart-primary", "#258ef2")
  const compareColor = readCssVar("--production-chart-compare", "#16a34a")
  const displayColor = showingCompareOnly ? compareColor : primaryColor
  const markerColors: Record<ProductionChartMarker["type"], string> = {
    stocking: readCssVar("--color-success", "#22c55e"),
    transfer: readCssVar("--color-warning", "#d18a14"),
    harvest: readCssVar("--color-destructive", "#ef4444"),
    water_quality: readCssVar("--color-info", "#3b6ea8"),
  }

  // Shared categorical date domain so the primary and compare lines (which may come
  // from different-granularity sources) line up on the same x position for the same date.
  const domainDates = useMemo(
    () => Array.from(new Set([...primaryRows.map((row) => row.date), ...compareValidRows.map((row) => row.date)])).sort(),
    [primaryRows, compareValidRows],
  )
  const dateLabels = useMemo(
    () => new Map([...compareValidRows, ...primaryRows].map((row) => [row.date, row.label])),
    [compareValidRows, primaryRows],
  )
  const primaryValueByDate = useMemo(() => new Map(primaryRows.map((row) => [row.date, row.value])), [primaryRows])
  const compareValueByDate = useMemo(() => new Map(compareValidRows.map((row) => [row.date, row.value])), [compareValidRows])
  const displayValueByDate = showingCompareOnly ? compareValueByDate : primaryValueByDate
  const hasTrendData = domainDates.length > 1

  const latestDate = domainDates.length > 0 ? domainDates[domainDates.length - 1] : null
  const latestDisplayValue = latestDate != null ? (displayValueByDate.get(latestDate) ?? null) : null
  const latestCompareValue = latestDate != null ? (compareValueByDate.get(latestDate) ?? null) : null

  // Time-proportional (not index-snapped) so an event on a day with no
  // production row still lands at its true position along the plot.
  const eventMarkers = useMemo<ChartEventMarker[]>(() => {
    if (domainDates.length < 2) return []
    const domainStartMs = Date.parse(domainDates[0])
    const domainEndMs = Date.parse(domainDates[domainDates.length - 1])
    if (!Number.isFinite(domainStartMs) || !Number.isFinite(domainEndMs) || domainEndMs <= domainStartMs) return []
    return (markers ?? [])
      .map((marker) => {
        const ms = Date.parse(marker.date)
        if (!Number.isFinite(ms)) return null
        const t = Math.min(1, Math.max(0, (ms - domainStartMs) / (domainEndMs - domainStartMs)))
        return { t, color: markerColors[marker.type], label: marker.label }
      })
      .filter((item): item is ChartEventMarker => item !== null)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- markerColors is a fresh object every render (reads CSS vars); its values only change with the theme, not per render.
  }, [markers, domainDates])

  const data = useMemo<ChartData<"line">>(() => {
    const mainDataset = {
      label: displayMeta.label,
      data: domainDates.map((date) => displayValueByDate.get(date) ?? null),
      borderColor: displayColor,
      backgroundColor: createVerticalGradient(displayColor, 0.16, 0.02),
      fill: true,
      spanGaps: true,
      pointRadius: (context: ScriptableContext<"line">) => (context.dataIndex === domainDates.length - 1 ? 4.5 : 0),
      pointHoverRadius: 5,
      pointBackgroundColor: displayColor,
      pointBorderColor: palette.card,
      pointBorderWidth: 2,
    }
    if (!showBoth || !compareMetric || !compareMeta) {
      return { labels: domainDates, datasets: [mainDataset] }
    }
    return {
      labels: domainDates,
      datasets: [
        mainDataset,
        {
          label: compareMeta.label,
          data: domainDates.map((date) => compareValueByDate.get(date) ?? null),
          borderColor: compareColor,
          backgroundColor: "transparent",
          fill: false,
          spanGaps: true,
          pointRadius: (context: ScriptableContext<"line">) => (context.dataIndex === domainDates.length - 1 ? 4.5 : 0),
          pointHoverRadius: 5,
          pointBackgroundColor: compareColor,
          pointBorderColor: palette.card,
          pointBorderWidth: 2,
          yAxisID: "y1",
        },
      ],
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- palette/colors are re-read from CSS each render, not render-dependent values.
  }, [domainDates, displayValueByDate, displayColor, displayMeta, showBoth, compareMetric, compareMeta, compareValueByDate])

  const xTickLimit = getDateAxisMaxTicks(domainDates.length)
  const options = useMemo<ChartOptions<"line">>(() => {
    const base = buildCartesianOptions<"line">({
      palette,
      legend: false, // the header pills already act as the legend
      xTickFormatter: (_value, index) => dateLabels.get(domainDates[index] ?? "") ?? domainDates[index] ?? "",
      xMaxTicksLimit: xTickLimit,
      yTickFormatter: (value) => formatProductionMetricValue(Number(value), displayMetric),
      yRightTickFormatter:
        showBoth && compareMetric ? (value) => formatProductionMetricValue(Number(value), compareMetric) : undefined,
      tooltip: {
        callbacks: {
          title: (items: TooltipItem<"line">[]) => {
            const date = domainDates[items[0]?.dataIndex ?? -1]
            return date ? (dateLabels.get(date) ?? date) : ""
          },
          label: (item: TooltipItem<"line">) => {
            const value = item.parsed.y
            if (value == null) return ""
            const isCompareLine = item.dataset.yAxisID === "y1"
            const lineMetric = isCompareLine && compareMetric ? compareMetric : displayMetric
            return `${item.dataset.label}: ${formatProductionMetricValue(Number(value), lineMetric)}`
          },
        },
      },
    })
    return {
      ...base,
      plugins: {
        ...base.plugins,
        chartEventMarkers: {
          markers: eventMarkers,
          lineColor: withAlpha(palette.border, 0.9),
          cardColor: palette.card,
        },
      },
    } as ChartOptions<"line">
    // eslint-disable-next-line react-hooks/exhaustive-deps -- palette/marker colors are re-read from CSS each render, not render-dependent values.
  }, [dateLabels, domainDates, xTickLimit, displayMetric, showBoth, compareMetric, eventMarkers])

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
              className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold transition-opacity"
              style={{
                background: "color-mix(in srgb, var(--production-chart-primary) 12%, transparent)",
                color: "var(--production-chart-primary)",
                opacity: showingCompareOnly ? 0.45 : 1,
              }}
            >
              {meta.label}
            </span>
            {hasCompare && compareMeta ? (
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold transition-opacity"
                style={{
                  background: "color-mix(in srgb, var(--production-chart-compare) 16%, transparent)",
                  color: "var(--production-chart-compare)",
                  opacity: viewMode === "primary" ? 0.45 : 1,
                }}
              >
                {compareMeta.label}
              </span>
            ) : null}
            {hasCompare && !isDesktop ? (
              <div className="inline-flex items-center gap-0.5 rounded-full bg-muted/60 p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setUserViewMode("primary")}
                  className="rounded-full px-2.5 py-1 transition-colors"
                  style={{
                    background: viewMode === "primary" ? "var(--card)" : "transparent",
                    color: viewMode === "primary" ? "var(--foreground)" : "var(--muted-foreground)",
                  }}
                >
                  {meta.label}
                </button>
                <button
                  type="button"
                  onClick={() => setUserViewMode("compare")}
                  className="rounded-full px-2.5 py-1 transition-colors"
                  style={{
                    background: viewMode === "compare" ? "var(--card)" : "transparent",
                    color: viewMode === "compare" ? "var(--foreground)" : "var(--muted-foreground)",
                  }}
                >
                  {compareMeta?.label}
                </button>
              </div>
            ) : null}
          </div>
          {periodLabel ? <span className="text-xs text-muted-foreground md:text-dense">{periodLabel}</span> : null}
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-4">
        {isLoading ? (
          <div className={`${CHART_HEIGHT_CLASS} animate-pulse rounded-lg bg-muted/50`} />
        ) : hasTrendData ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline gap-3 px-1">
              <span className="text-2xl font-semibold tracking-tight text-foreground">
                {latestDisplayValue != null ? formatProductionMetricValue(latestDisplayValue, displayMetric) : "--"}
              </span>
              {showBoth && compareMetric ? (
                <span className="text-sm font-semibold" style={{ color: compareColor }}>
                  {latestCompareValue != null ? formatProductionMetricValue(latestCompareValue, compareMetric) : "--"}
                </span>
              ) : null}
            </div>
            <div className={`w-full rounded-lg border border-border bg-background/35 p-3 ${CHART_HEIGHT_CLASS}`}>
              <Line data={data} options={options} plugins={[chartEventMarkersPlugin]} />
            </div>
            {showBoth && compareMeta ? (
              <div className="flex flex-wrap justify-center gap-6 text-dense font-medium text-muted-foreground">
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
          <div className={`flex ${CHART_HEIGHT_CLASS} items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 p-6`}>
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

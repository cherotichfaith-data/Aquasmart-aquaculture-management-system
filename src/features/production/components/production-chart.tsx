"use client"

import { useMemo } from "react"
// Deep-imported (not the `@tremor/react` barrel): the barrel re-exports every
// Tremor component, including DateRangePicker/Select/Dialog, which pull in
// date-fns/react-day-picker/@headlessui — none of which AreaChart itself
// needs. Importing the barrel would force the bundler to resolve all of it.
import AreaChart from "@tremor/react/dist/components/chart-elements/AreaChart/AreaChart.js"
import type { CustomTooltipProps } from "@tremor/react/dist/components/chart-elements/common/CustomTooltipProps.js"
import { Card, CardContent, CardHeader } from "@/components/app-ui/card"
import { DataErrorState, EmptyState } from "@/components/shared/data-states"
import { PRODUCTION_METRICS, type ProductionMetric } from "@/features/production/components/metrics"
import { formatChartDate } from "@/lib/analytics-format"

export type ProductionChartRow = {
  date: string
  label: string
  value: number | null
}

// Tremor's fixed named palette (no CSS-var passthrough — its color prop only
// accepts a closed set of Tailwind color names) chosen close to the app's
// primary/compare chart tokens.
const PRIMARY_COLOR = "blue"
const COMPARE_COLOR = "amber"

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
  rows,
  compareMetric,
  compareRows,
  periodLabel,
  isLoading,
  error,
  onRetry,
}: {
  metric: ProductionMetric
  rows: ProductionChartRow[]
  compareMetric?: ProductionMetric | null
  compareRows?: ProductionChartRow[]
  periodLabel?: string | null
  isLoading: boolean
  isFetching?: boolean
  error?: string | null
  onRetry?: () => void
}) {
  const meta = PRODUCTION_METRICS[metric]
  const compareMeta = compareMetric ? PRODUCTION_METRICS[compareMetric] : null
  const comparing = Boolean(compareMeta && compareRows)

  const categories = useMemo(
    () => (comparing && compareMeta ? [meta.label, compareMeta.label] : [meta.label]),
    [comparing, compareMeta, meta.label],
  )
  const colors = useMemo(() => (comparing ? [PRIMARY_COLOR, COMPARE_COLOR] : [PRIMARY_COLOR]), [comparing])

  // Tremor shares one y-axis across categories — resolve each tooltip line
  // back to its own metric (and formatting/unit) by series label.
  const metricByLabel = useMemo(() => {
    const map = new Map<string, ProductionMetric>([[meta.label, metric]])
    if (comparing && compareMeta && compareMetric) map.set(compareMeta.label, compareMetric)
    return map
  }, [comparing, compareMeta, compareMetric, meta.label, metric])

  const data = useMemo(() => {
    const rowsByDate = new Map(rows.map((row) => [row.date, row]))
    const compareByDate = new Map((compareRows ?? []).map((row) => [row.date, row]))
    const dateOrder = Array.from(
      new Set([...rows.map((row) => row.date), ...(comparing ? (compareRows ?? []).map((row) => row.date) : [])]),
    ).sort()

    return dateOrder.map((date) => {
      const primaryRow = rowsByDate.get(date)
      const entry: Record<string, string | number | null> = {
        date,
        label: primaryRow?.label ?? formatChartDate(date, { month: "short", day: "numeric" }),
        [meta.label]: primaryRow?.value ?? null,
      }
      if (comparing && compareMeta) {
        entry[compareMeta.label] = compareByDate.get(date)?.value ?? null
      }
      return entry
    })
  }, [compareMeta, compareRows, comparing, meta.label, rows])

  const hasRenderablePoints = useMemo(
    () => rows.some((row) => typeof row.value === "number" && Number.isFinite(row.value)),
    [rows],
  )

  const customTooltip = ({ payload, active, label }: CustomTooltipProps) => {
    if (!active || !payload?.length) return null
    return (
      <div className="w-56 rounded-tremor-default border border-tremor-border bg-tremor-background p-3 shadow-tremor-dropdown">
        <p className="mb-1.5 text-tremor-label text-tremor-content">{String(label ?? "")}</p>
        <div className="space-y-1.5">
          {payload.map((item, index) => {
            const seriesLabel = String(item.dataKey ?? item.name ?? "")
            const itemMetric = metricByLabel.get(seriesLabel) ?? metric
            const numeric = Number(item.value)
            return (
              <div key={index} className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-tremor-default font-medium text-tremor-content-emphasis">
                  {Number.isFinite(numeric) ? formatProductionMetricValue(numeric, itemMetric) : "—"}
                </span>
                <span className="truncate text-tremor-label text-tremor-content">{seriesLabel}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

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
      <CardHeader className="px-6 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">{meta.label}</h2>
          {periodLabel ? <span className="text-xs text-muted-foreground md:text-[13px]">{periodLabel}</span> : null}
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-2">
        {isLoading ? (
          <div className="h-[360px] animate-pulse rounded-lg bg-muted/50" />
        ) : rows.length && hasRenderablePoints ? (
          <AreaChart
            className="h-[360px]"
            data={data}
            index="label"
            categories={categories}
            colors={colors}
            showLegend={comparing}
            connectNulls
            showAnimation
            customTooltip={customTooltip}
            valueFormatter={(value) => formatProductionMetricValue(value, metric)}
            yAxisWidth={56}
          />
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

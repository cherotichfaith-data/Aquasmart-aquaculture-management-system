import type { ChartOptions } from "chart.js"
import { readCssVar } from "@/components/charts/chartjs-theme"
import { formatChartDate } from "@/lib/analytics-format"

/**
 * The app's shared buildCartesianOptions() defaults to interaction mode
 * "index" (hover anywhere on a column shows every series at that x-position
 * in one shared tooltip) -- right for charts comparing a couple of series,
 * but with 10+ cages on one chart that tooltip becomes an unreadable wall of
 * text. These per-cage multi-line charts want the reference dashboard's
 * behavior instead: hovering a specific line shows only that cage.
 */
export function withPerLineTooltip<TType extends "line" | "bar">(
  options: ChartOptions<TType>,
): ChartOptions<TType> {
  return {
    ...options,
    interaction: { mode: "nearest", intersect: true, axis: "xy" },
  }
}

/**
 * Line weight for charts plotting one line per cage (10+ series at once).
 * The app's shared chart theme defaults to a 3px line + 4px point, tuned for
 * Production's 1-2-line charts -- fine there, but 10+ cages at that weight
 * overlap into unreadable "spaghetti". Thinner strokes and smaller resting
 * points (with a larger hover target) keep the chart legible at rest while
 * still giving clear feedback on hover.
 */
export const MULTI_LINE_STYLE = {
  borderWidth: 2,
  pointRadius: 2,
  pointHoverRadius: 5,
} as const

const FALLBACK_CHART_COLORS = ["#4472c4", "#ed7d31", "#3b6ea8", "#ffc000", "#c00000"]

/** Same per-cage identity color rotation the app already uses for cage dots
 * elsewhere (`--chart-1` … `--chart-5`), resolved to a concrete value since
 * Chart.js's canvas can't consume a raw `var(--x)` string the way DOM/CSS can
 * (see the note on readCssVar in chartjs-theme.ts). */
export function cageColor(systemId: number) {
  const index = Math.abs(systemId) % 5
  return readCssVar(`--chart-${index + 1}`, FALLBACK_CHART_COLORS[index])
}

/** Sorted, deduplicated union of every date that appears across a set of per-cage series.
 * Cages sample on their own irregular cadence, so this is a category axis built from
 * actual data points -- not a filled daily calendar (which would be mostly gaps). */
export function buildSharedDateDomain(dates: Array<string | null | undefined>): string[] {
  return Array.from(new Set(dates.filter((value): value is string => Boolean(value)))).sort((left, right) =>
    left.localeCompare(right),
  )
}

/** Short "Jul 23" tick labels instead of raw ISO dates, resolved from the
 * chart's own category domain by index (category-scale ticks pass the axis
 * position, not the label) so it stays correct regardless of autoSkip. */
export function buildShortDateTickFormatter(domain: string[]) {
  return (value: number | string) => {
    const index = typeof value === "number" ? value : Number(value)
    const raw = domain[index]
    return raw ? formatChartDate(raw, { month: "short", day: "numeric" }) : ""
  }
}

/** With many cages sampling on staggered days, the merged date domain can get
 * dense -- buildCartesianOptions locks x-axis labels to zero rotation, which
 * makes Chart.js's autoSkip drop most (or all) of them to avoid overlap.
 * Allowing rotation here keeps labels legible instead of disappearing. */
export function withRotatedDateAxis<TType extends "line" | "bar">(options: ChartOptions<TType>): ChartOptions<TType> {
  const scales = (options?.scales ?? {}) as Record<string, { ticks?: Record<string, unknown> } | undefined>
  const xScale = scales.x ?? {}
  return {
    ...options,
    scales: {
      ...scales,
      x: {
        ...xScale,
        ticks: {
          ...xScale.ticks,
          autoSkip: true,
          maxRotation: 55,
          minRotation: 0,
        },
      },
    },
  } as ChartOptions<TType>
}

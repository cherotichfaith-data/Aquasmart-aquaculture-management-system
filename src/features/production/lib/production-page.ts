"use client"

import type { ProductionMetric } from "@/features/production/components/metrics"
import type { ProductionChartRow } from "@/features/production/components/production-chart"
import { formatCompactDate } from "@/lib/analytics-format"
import { sortByDateAsc } from "@/lib/utils"
import type { ProductionPeriodViewRow } from "@/features/production/period-view"
import type { ProductionDailyTrendRow } from "@/features/production/types"

export type { ProductionPeriodViewRow } from "@/features/production/period-view"

export function buildProductionMetricRows(
  rows: ProductionPeriodViewRow[],
  metric: ProductionMetric,
): ProductionChartRow[] {
  return sortByDateAsc(
    rows.map((row) => ({
      date: row.date,
      value: getSingleMetricValue(row, metric),
    })),
    (row) => row.date,
  ).map((row) => ({
    ...row,
    label: formatCompactDate(row.date),
  }))
}

export function buildProductionDailyMetricRows(
  rows: ProductionDailyTrendRow[],
  metric: ProductionMetric,
  summaryRows?: ProductionPeriodViewRow[],
): ProductionChartRow[] {
  return sortByDateAsc(
    rows.map((row) => ({
      date: row.date,
      value: getDailyMetricValue(row, metric, summaryRows),
    })),
    (row) => row.date,
  ).map((row) => ({
    ...row,
    label: formatCompactDate(row.date),
  }))
}

function getSingleMetricValue(row: ProductionPeriodViewRow, metric: ProductionMetric) {
  switch (metric) {
    case "efcr":
      return row.periodEfcr
    case "abw":
      return row.abwG
    case "biomass":
      return row.biomassKg
    case "mortality":
      return row.mortalityRatePct
    case "feeding":
      return row.feedingRate
    case "density":
      return row.biomassDensity
  }
}

function getDailyMetricValue(
  row: ProductionDailyTrendRow,
  metric: ProductionMetric,
  summaryRows?: ProductionPeriodViewRow[],
) {
  switch (metric) {
    case "abw":
      return row.estimated_abw_g ?? deriveDailyAbw(row.date, row.abw_last_sampling, summaryRows)
    case "mortality":
      return row.mortality_rate
    case "feeding":
      return row.feeding_rate
    case "density":
      return row.biomass_density
    default:
      return null
  }
}

function deriveDailyAbw(
  date: string,
  rpcAbwLastSampling: number | null,
  summaryRows?: ProductionPeriodViewRow[],
) {
  if (typeof rpcAbwLastSampling === "number" && Number.isFinite(rpcAbwLastSampling)) {
    return rpcAbwLastSampling
  }
  if (!summaryRows || summaryRows.length === 0) return null

  const anchors = sortByDateAsc(
    summaryRows
      .filter((row) => typeof row.abwG === "number" && Number.isFinite(row.abwG))
      .map((row) => ({ date: row.date, value: row.abwG as number })),
    (row) => row.date,
  )

  if (anchors.length === 0) return null

  const targetDay = toDayNumber(date)
  const exact = anchors.find((anchor) => anchor.date === date)
  if (exact) return exact.value

  let previousIndex = -1
  for (let index = 0; index < anchors.length; index += 1) {
    if (toDayNumber(anchors[index].date) < targetDay) previousIndex = index
    else break
  }

  const nextIndex = previousIndex + 1
  const previous = previousIndex >= 0 ? anchors[previousIndex] : null
  const next = nextIndex < anchors.length ? anchors[nextIndex] : null

  if (previous && next) {
    return interpolateLinear(previous, next, targetDay)
  }

  if (previous && previousIndex > 0) {
    return extrapolateForward(anchors[previousIndex - 1], previous, targetDay)
  }

  if (next && nextIndex + 1 < anchors.length) {
    return extrapolateBackward(next, anchors[nextIndex + 1], targetDay)
  }

  return previous?.value ?? next?.value ?? null
}

function toDayNumber(value: string) {
  return Math.floor(Date.parse(`${value}T00:00:00Z`) / 86_400_000)
}

function interpolateLinear(
  previous: { date: string; value: number },
  next: { date: string; value: number },
  targetDay: number,
) {
  const previousDay = toDayNumber(previous.date)
  const nextDay = toDayNumber(next.date)
  if (nextDay <= previousDay) return previous.value
  const ratio = (targetDay - previousDay) / (nextDay - previousDay)
  return previous.value + (next.value - previous.value) * ratio
}

function extrapolateForward(
  previousPrevious: { date: string; value: number },
  previous: { date: string; value: number },
  targetDay: number,
) {
  const previousPreviousDay = toDayNumber(previousPrevious.date)
  const previousDay = toDayNumber(previous.date)
  if (previousDay <= previousPreviousDay) return previous.value
  const slope = (previous.value - previousPrevious.value) / (previousDay - previousPreviousDay)
  return previous.value + slope * (targetDay - previousDay)
}

function extrapolateBackward(
  next: { date: string; value: number },
  nextNext: { date: string; value: number },
  targetDay: number,
) {
  const nextDay = toDayNumber(next.date)
  const nextNextDay = toDayNumber(nextNext.date)
  if (nextNextDay <= nextDay) return next.value
  const slope = (nextNext.value - next.value) / (nextNextDay - nextDay)
  return next.value - slope * (nextDay - targetDay)
}

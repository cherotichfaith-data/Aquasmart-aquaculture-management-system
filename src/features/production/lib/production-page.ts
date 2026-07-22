"use client"

import type { ProductionMetric } from "@/features/production/components/metrics"
import type { ProductionChartRow } from "@/features/production/components/production-chart"
import { formatCompactDate } from "@/lib/analytics-format"
import { sortByDateAsc } from "@/lib/utils"
import type { ProductionPeriodViewRow } from "@/features/production/period-view"

export type { ProductionPeriodViewRow } from "@/features/production/period-view"

export type ProductionEfcrChartRow = {
  date: string
  label: string
  periodEfcr: number | null
  aggregatedEfcr: number | null
}

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

function getSingleMetricValue(row: ProductionPeriodViewRow, metric: ProductionMetric) {
  switch (metric) {
    case "efcr_periodic":
      return row.periodEfcr
    case "efcr_aggregated":
      return row.aggregatedEfcr
    case "abw":
      return row.abwG
    case "biomass_increase":
      return row.growthKg
    case "mortality":
      return row.mortalityRatePct
    case "feeding":
      return row.feedingRate
    case "density":
      return row.biomassDensity
  }
}

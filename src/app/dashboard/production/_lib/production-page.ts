"use client"

import type { ProductionMetric } from "@/components/production/metrics"
import type { ProductionChartRow } from "@/components/production/production-chart"
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
  metric: Exclude<ProductionMetric, "efcr">,
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

export function buildProductionEfcrRows(rows: ProductionPeriodViewRow[]): ProductionEfcrChartRow[] {
  return sortByDateAsc(
    rows.map((row) => ({
      date: row.date,
      periodEfcr: row.periodEfcr,
      aggregatedEfcr: row.aggregatedEfcr,
    })),
    (row) => row.date,
  ).map((row) => ({
    ...row,
    label: formatCompactDate(row.date),
  }))
}

function getSingleMetricValue(row: ProductionPeriodViewRow, metric: Exclude<ProductionMetric, "efcr">) {
  switch (metric) {
    case "abw":
      return row.abwG
    case "biomass":
      return row.biomassKg
    case "mortality":
      return row.mortalityFish
    case "feeding_rate":
      return row.feedingRate
    case "biomass_density":
      return row.biomassDensity
    case "sgr":
      return row.sgr
  }
}

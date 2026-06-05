"use client"

import { sortByDateAsc } from "@/lib/utils"
import { formatCompactDate } from "@/lib/analytics-format"
import type { ProductionMetric } from "@/components/production/metrics"
import type { Database } from "@/lib/types/database"

type ProductionSummaryRow = Database["public"]["Functions"]["api_production_summary"]["Returns"][number]

export function buildProductionChartRows(params: {
  metricFilter: ProductionMetric
  productionRows: ProductionSummaryRow[]
}) {
  const { metricFilter, productionRows } = params
  const chartRows = productionRows.map((row) => ({
    date: row.date,
    value: getProductionMetricValue(row, metricFilter),
  }))

  return sortByDateAsc(chartRows, (row) => row.date).map((row) => ({
    ...row,
    label: formatCompactDate(row.date),
  }))
}

function getProductionMetricValue(row: ProductionSummaryRow, metric: ProductionMetric) {
  switch (metric) {
    case "efcr_periodic":
      return row.efcr_period
    case "efcr_aggregated":
      return row.efcr_aggregated
    case "abw":
      return row.average_body_weight
    case "density":
      return row.biomass_density
    case "biomass":
      return row.total_biomass
    case "feeding_rate":
      return row.feeding_rate
  }
}

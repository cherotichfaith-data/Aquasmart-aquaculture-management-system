"use client"

import type { Enums } from "@/lib/types/database"
import { sortByDateAsc } from "@/lib/utils"
import { formatCompactDate } from "@/lib/analytics-format"
import type { TimePeriod } from "@/components/shared/time-period-selector"
import { resolveTimePeriod } from "@/lib/time-period"

export const parseStageParam = (value: string | null): "all" | Enums<"system_growth_stage"> => {
  if (value === "nursing" || value === "grow_out") return value
  return "all"
}

export const resolveProductionPeriodParam = (periodParam: string | null): TimePeriod =>
  resolveTimePeriod(periodParam)

function averageByDate(items: Array<{ date: string; value: number | null }>) {
  const byDate = new Map<string, { sum: number; count: number }>()
  items.forEach((item) => {
    if (!item.date || typeof item.value !== "number") return
    const current = byDate.get(item.date) ?? { sum: 0, count: 0 }
    current.sum += item.value
    current.count += 1
    byDate.set(item.date, current)
  })
  return Array.from(byDate.entries()).map(([date, current]) => ({
    date,
    value: current.count > 0 ? current.sum / current.count : null,
  }))
}

function weightedByDate(items: Array<{ date: string; value: number | null; weight: number | null }>) {
  const byDate = new Map<string, { weighted: number; weight: number; fallback: number; fallbackCount: number }>()
  items.forEach((item) => {
    if (!item.date || typeof item.value !== "number") return
    const current = byDate.get(item.date) ?? { weighted: 0, weight: 0, fallback: 0, fallbackCount: 0 }
    const weight = item.weight ?? 0
    if (weight > 0) {
      current.weighted += item.value * weight
      current.weight += weight
    } else {
      current.fallback += item.value
      current.fallbackCount += 1
    }
    byDate.set(item.date, current)
  })
  return Array.from(byDate.entries()).map(([date, current]) => ({
    date,
    value:
      current.weight > 0
        ? current.weighted / current.weight
        : current.fallbackCount > 0
          ? current.fallback / current.fallbackCount
          : null,
  }))
}

export function buildProductionChartRows(params: {
  metricFilter: string
  productionRows: any[]
  inventoryRows: any[]
}) {
  const { metricFilter, productionRows, inventoryRows } = params

  let chartRows: Array<{ date: string; value: number | null }> = []

  if (metricFilter === "efcr_periodic") {
    chartRows = weightedByDate(
      productionRows.map((row) => ({
        date: row.date ?? "",
        value: row.efcr_period ?? null,
        weight: row.total_feed_amount_period ?? null,
      })),
    )
  } else if (metricFilter === "efcr_aggregated") {
    chartRows = weightedByDate(
      productionRows.map((row) => ({
        date: row.date ?? "",
        value: row.efcr_aggregated ?? null,
        weight: row.total_feed_amount_period ?? null,
      })),
    )
  } else if (metricFilter === "abw") {
    chartRows = weightedByDate(
      productionRows.map((row) => ({
        date: row.date ?? "",
        value: row.average_body_weight ?? null,
        weight: row.number_of_fish_inventory ?? null,
      })),
    )
  } else if (metricFilter === "mortality") {
    chartRows = averageByDate(
      inventoryRows.map((row) => ({
        date: row.inventory_date ?? "",
        value: row.mortality_rate ?? null,
      })),
    )
  } else if (metricFilter === "feeding") {
    chartRows = averageByDate(
      inventoryRows.map((row) => ({
        date: row.inventory_date ?? "",
        value: row.feeding_rate ?? null,
      })),
    )
  } else if (metricFilter === "density") {
    chartRows = averageByDate(
      inventoryRows.map((row) => ({
        date: row.inventory_date ?? "",
        value: row.biomass_density ?? null,
      })),
    )
  }

  return sortByDateAsc(chartRows, (row) => row.date).map((row) => ({
    ...row,
    label: formatCompactDate(row.date),
  }))
}

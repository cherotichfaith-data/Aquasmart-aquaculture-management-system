"use client"

import type { DashboardSystemRow } from "@/features/dashboard/types"

export const hasCompleteSystemMetrics = (row: DashboardSystemRow): boolean => {
  const requiredNumericMetrics: Array<number | null> = [
    row.fish_end,
    row.biomass_end,
    row.feed_total,
    row.efcr,
    row.abw,
    row.feeding_rate,
    row.mortality_rate,
    row.biomass_density,
  ]

  const hasAllNumericMetrics = requiredNumericMetrics.every(
    (value) => typeof value === "number" && Number.isFinite(value),
  )
  if (!hasAllNumericMetrics) return false

  return typeof row.water_quality_rating_average === "string" && row.water_quality_rating_average.trim().length > 0
}

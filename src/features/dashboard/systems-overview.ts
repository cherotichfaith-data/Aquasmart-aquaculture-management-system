import type { DashboardSystemRow, SystemsOverviewRow } from "./types"

const isFiniteNumber = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value)

const getAbwTrend = (row: DashboardSystemRow): SystemsOverviewRow["abw_trend"] => {
  const extended = row as DashboardSystemRow & {
    abw_trend?: SystemsOverviewRow["abw_trend"]
    abw_delta?: number | null
    abw_asof_end_delta?: number | null
  }

  if (extended.abw_trend === "up" || extended.abw_trend === "down" || extended.abw_trend === "flat") {
    return extended.abw_trend
  }

  const delta = extended.abw_delta ?? extended.abw_asof_end_delta
  if (!isFiniteNumber(delta) || delta === 0) return "flat"
  return delta > 0 ? "up" : "down"
}

export function toSystemsOverviewRows(rows: DashboardSystemRow[]): SystemsOverviewRow[] {
  return rows
    .map((row) => ({
      system_id: row.system_id,
      system_name: row.system_name,
      abw: row.abw ?? null,
      abw_trend: getAbwTrend(row),
      mortality_rate: row.mortality_rate ?? null,
      efcr: row.efcr ?? null,
      feeding_rate: row.feeding_rate ?? null,
      water_quality_rating: row.water_quality_rating_average ?? null,
      last_sample_date: row.sampling_end_date ?? null,
      summaryRow: row,
    }))
    .sort((left, right) => left.system_name.localeCompare(right.system_name))
}

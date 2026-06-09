import type { DashboardSystemRow, SystemsOverviewRow } from "./types"

const toAbwTrend = (value: DashboardSystemRow["abw_trend"]): SystemsOverviewRow["abw_trend"] =>
  value === "up" || value === "down" ? value : "flat"

export function toSystemsOverviewRows(rows: DashboardSystemRow[]): SystemsOverviewRow[] {
  return rows.map((row) => ({
      system_id: row.system_id,
      system_name: row.system_name,
      abw: row.abw ?? null,
      abw_trend: toAbwTrend(row.abw_trend),
      mortality_rate: row.mortality_rate ?? null,
      efcr: row.efcr ?? null,
      feeding_rate: row.feeding_rate ?? null,
      water_quality_rating: row.water_quality_rating_average ?? null,
      last_sample_date: row.sampling_end_date ?? null,
      summaryRow: row,
    }))
}

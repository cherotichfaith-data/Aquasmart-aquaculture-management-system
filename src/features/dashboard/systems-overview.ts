import type { DashboardSystemRow, SystemsOverviewRow } from "./types"

export function toSystemsOverviewRows(rows: DashboardSystemRow[]): SystemsOverviewRow[] {
  return rows.map((row) => ({
      system_id: row.system_id,
      system_name: row.system_name,
      abw: row.abw,
      abw_arrow: row.abw_arrow,
      mortality_rate: row.mortality_rate,
      efcr: row.efcr,
      feeding_rate: row.feeding_rate,
      water_quality_rating: row.water_quality_rating_average,
      last_sample_date: row.abw_latest_date,
      summaryRow: row,
    }))
}

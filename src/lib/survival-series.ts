import type { DerivedSurvivalSeriesRow } from "@/lib/mortality"
import type { Database } from "@/lib/types/database"

type ProductionSummaryRow = Database["public"]["Functions"]["api_production_summary"]["Returns"][number]

const toNumber = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0

export function deriveSurvivalSeriesFromProductionSummary(rows: ProductionSummaryRow[]): DerivedSurvivalSeriesRow[] {
  return rows
    .map((row) => {
      const liveCount = toNumber(row.number_of_fish_inventory)
      const cumulativeMortality = toNumber(row.cumulative_mortality)
      const stocked = liveCount + cumulativeMortality
      const dailyDeaths = toNumber(row.mortality_count_period)

      return {
        system_id: row.system_id,
        event_date: row.date,
        daily_deaths: dailyDeaths,
        cum_deaths: cumulativeMortality,
        daily_mort_pct: stocked > 0 ? (dailyDeaths / stocked) * 100 : null,
        live_count: liveCount,
        stocked,
        survival_pct: stocked > 0 ? (liveCount / stocked) * 100 : null,
      }
    })
    .sort((a, b) =>
      a.system_id === b.system_id
        ? a.event_date.localeCompare(b.event_date)
        : a.system_id - b.system_id,
    )
}

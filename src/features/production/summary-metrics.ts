import type { ProductionSummaryMetricsRow, ProductionSummaryRpcRow } from "./types"

export function buildProductionSummaryMetrics(rows: ProductionSummaryRpcRow[]): ProductionSummaryMetricsRow | null {
  if (!rows.length) return null

  const latestRowsByCycle = new Map<string, ProductionSummaryRpcRow>()
  rows.forEach((row) => {
    const cycleKey = row.cycle_id != null ? `cycle:${row.cycle_id}` : `system:${row.system_id ?? "na"}|date:${row.date ?? "na"}`
    const current = latestRowsByCycle.get(cycleKey)
    if (!current || String(row.date ?? "") > String(current.date ?? "")) {
      latestRowsByCycle.set(cycleKey, row)
    }
  })

  const totals = rows.reduce(
    (acc, row) => {
      acc.mortality_fish += row.mortality_count_period ?? 0
      acc.transfer_out_fish += row.number_of_fish_transfer_out ?? 0
      acc.total_harvested_kg += row.total_weight_harvested ?? 0
      acc.total_harvested_fish += row.number_of_fish_harvested ?? 0
      return acc
    },
    {
      period_start_fish: 0,
      mortality_fish: 0,
      transfer_out_fish: 0,
      total_harvested_kg: 0,
      total_harvested_fish: 0,
    } satisfies ProductionSummaryMetricsRow,
  )

  totals.period_start_fish = Array.from(latestRowsByCycle.values()).reduce(
    (sum, row) => sum + (row.fish_count_period_start ?? 0),
    0,
  )

  return totals
}

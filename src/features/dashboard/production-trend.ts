import type { ProductionTrendRow, ProductionTrendRpcRow } from "./types"

const isFiniteNumber = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value)

function deriveFeedingRate(row: ProductionTrendRpcRow): number | null {
  if (!isFiniteNumber(row.total_feed_amount_period)) return null
  if (!isFiniteNumber(row.total_biomass) || row.total_biomass <= 0) return null

  const feedingRate = row.total_feed_amount_period / row.total_biomass
  return Number.isFinite(feedingRate) ? feedingRate : null
}

export function toProductionTrendRows(rows: ProductionTrendRpcRow[]): ProductionTrendRow[] {
  return rows.map((row) => ({
    ...row,
    feeding_rate: deriveFeedingRate(row),
  }))
}

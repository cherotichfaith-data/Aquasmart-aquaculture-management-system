type ProductionEfcrRow = {
  activity_rank?: number | null
  biomass_increase_period: number | null
  total_feed_amount_period: number | null
  total_weight_transfer_out?: number | null
  total_weight_transfer_in?: number | null
  total_weight_harvested?: number | null
  total_weight_stocked?: number | null
}

export function computeEfcrFromProductionRows(rows: ProductionEfcrRow[]): number | null {
  let feedSum = 0
  let denominator = 0

  rows.forEach((row) => {
    if ((row.activity_rank ?? null) === 1) return

    feedSum += row.total_feed_amount_period ?? 0
    denominator +=
      (row.biomass_increase_period ?? 0) +
      (row.total_weight_transfer_out ?? 0) -
      (row.total_weight_transfer_in ?? 0) +
      (row.total_weight_harvested ?? 0) -
      (row.total_weight_stocked ?? 0)
  })

  return denominator !== 0 ? feedSum / denominator : null
}

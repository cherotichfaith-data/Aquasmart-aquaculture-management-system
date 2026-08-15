import type { GrowthTrendRow } from "@/features/shared/queries.server"

export type BatchGrowthPoint = {
  batch_id: number
  sample_date: string
  fish_count: number | null
  abw_g: number | null
  efcr_period: number | null
  sgr_pct_day: number | null
}

/**
 * Rolls per-cage sampling rows up to one point per (batch, date) -- a batch
 * stocked across several cages (e.g. the same batch split into cage 1A and
 * cage 1E) becomes a single combined point, not one per cage. ABW/eFCR/SGR
 * are fish-count-weighted averages across the batch's cages for that date
 * (falls back to a simple average when fish-count data isn't available), so
 * a batch mostly concentrated in one large cage tracks close to that cage's
 * numbers rather than being pulled evenly toward a much smaller one.
 */
export function aggregateGrowthByBatch(
  rows: GrowthTrendRow[],
  systemIdToBatchId: Record<number, number>,
): BatchGrowthPoint[] {
  const groups = new Map<string, GrowthTrendRow[]>()
  for (const row of rows) {
    const batchId = systemIdToBatchId[row.system_id]
    if (batchId == null) continue
    const key = `${batchId}|${row.sample_date}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(row)
  }

  const weightedAverage = (items: GrowthTrendRow[], pick: (row: GrowthTrendRow) => number | null): number | null => {
    const entries = items
      .map((row) => ({ value: pick(row), weight: row.fish_count ?? 0 }))
      .filter((entry): entry is { value: number; weight: number } => entry.value != null && Number.isFinite(entry.value))
    if (entries.length === 0) return null

    const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0)
    if (totalWeight > 0) {
      return entries.reduce((sum, entry) => sum + entry.value * entry.weight, 0) / totalWeight
    }
    return entries.reduce((sum, entry) => sum + entry.value, 0) / entries.length
  }

  return Array.from(groups.entries()).map(([key, items]) => {
    const [batchIdText, sampleDate] = key.split("|")
    const fishCount = items.reduce((sum, row) => sum + (row.fish_count ?? 0), 0)
    return {
      batch_id: Number(batchIdText),
      sample_date: sampleDate,
      fish_count: fishCount > 0 ? fishCount : null,
      abw_g: weightedAverage(items, (row) => row.abw_g),
      efcr_period: weightedAverage(items, (row) => row.efcr_period),
      sgr_pct_day: weightedAverage(items, (row) => row.sgr_pct_day),
    }
  })
}

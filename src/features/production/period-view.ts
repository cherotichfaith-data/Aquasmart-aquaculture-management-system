import { sortByDateAsc } from "@/lib/utils"
import type { ProductionSummaryRpcRow } from "./types"

export type ProductionPeriodViewRow = {
  rowId: string
  date: string
  systemName: string | null
  periodStartFish: number | null
  numberOfFish: number | null
  abwG: number | null
  biomassKg: number | null
  fishDensity: number | null
  feedPeriodKg: number | null
  feedAggKg: number | null
  feedIntensityKgM3: number | null
  growthKg: number | null
  cumulativeGrowthKg: number | null
  harvestKg: number | null
  mortalityFish: number | null
  mortalityRatePct: number | null
  transferInFish: number | null
  transferOutFish: number | null
  harvestFish: number | null
  adgGDay: number | null
  sgr: number | null
  feedingRate: number | null
  biomassDensity: number | null
  periodEfcr: number | null
  aggregatedEfcr: number | null
  cumulativeMortality: number | null
  survivalRatePct: number | null
  feedType: string | null
}

function attachUniqueRowIds(rows: ProductionPeriodViewRow[]) {
  const seen = new Map<string, number>()

  return rows.map((row) => {
    const occurrence = seen.get(row.rowId) ?? 0
    seen.set(row.rowId, occurrence + 1)
    if (occurrence === 0) return row

    return {
      ...row,
      rowId: `${row.rowId}|${occurrence + 1}`,
    }
  })
}

type ConsolidatedAccumulator = {
  date: string
  periodStartFish: number
  numberOfFish: number
  biomassKg: number
  feedPeriodKg: number
  feedAggKg: number
  growthKg: number
  cumulativeGrowthKg: number
  harvestKg: number
  mortalityFish: number
  cumulativeMortality: number
  transferInFish: number
  transferOutFish: number
  transferOutFishAggregated: number
  harvestFish: number
  weightedAdgNumerator: number
  weightedSgrNumerator: number
  weightedFeedingRateNumerator: number
  weightedBiomassForAverages: number
  weightedSurvivalPctNumerator: number
  survivalWeight: number
  feedTypes: Set<string>
}

const asFiniteNumber = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? value : null

const divideOrNull = (numerator: number, denominator: number) =>
  denominator > 0 ? numerator / denominator : null

const getOptionalNumber = (row: ProductionSummaryRpcRow, key: string) => {
  const value = (row as Record<string, unknown>)[key]
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function resolveDisplayEfcr(row: ProductionSummaryRpcRow) {
  const periodicEfcr = asFiniteNumber(row.efcr_period)
  const aggregatedEfcr = asFiniteNumber(row.efcr_aggregated)

  // The live "current" row is an in-progress period. Its periodic eFCR can
  // spike unrealistically when biomass increase is still near zero, while the
  // cumulative eFCR remains the meaningful operational value.
  if (row.activity === "current") {
    return aggregatedEfcr ?? periodicEfcr
  }

  return periodicEfcr
}

const buildSystemDateKey = (systemId: number | null | undefined, date: string | null | undefined) =>
  `${systemId ?? "system"}|${date ?? ""}`

type ProductionRowEnrichment = {
  totalScopedVolumeM3?: number | null
  volumeBySystemId?: Map<number, number>
  growthBySystemDate?: Map<string, { adgGDay: number | null; sgrPctDay: number | null }>
  feedTypeBySystemDate?: Map<string, string | null>
}

function mapProductionSummaryRow(
  row: ProductionSummaryRpcRow,
  enrichment: ProductionRowEnrichment,
): ProductionPeriodViewRow {
  const systemId = row.system_id ?? null
  const key = buildSystemDateKey(systemId, row.date)
  const volumeM3 =
    systemId != null ? enrichment.volumeBySystemId?.get(systemId) ?? null : enrichment.totalScopedVolumeM3 ?? null
  const growth = enrichment.growthBySystemDate?.get(key)
  const numberOfFish = asFiniteNumber(row.number_of_fish_inventory)
  const periodStartFish = asFiniteNumber(row.fish_count_period_start)
  const biomassKg = asFiniteNumber(row.total_biomass)
  const feedPeriodKg = asFiniteNumber(row.total_feed_amount_period)
  const feedAggKg = asFiniteNumber(row.total_feed_amount_aggregated)
  const transferInFish = getOptionalNumber(row, "number_of_fish_transfer_in")
  const mortalityFish = asFiniteNumber(row.mortality_count_period)

  return {
    rowId: `${row.date}|${row.system_id ?? "system"}|${row.cycle_id ?? "cycle"}|${row.activity ?? "activity"}`,
    date: row.date,
    systemName: row.system_name ?? null,
    periodStartFish,
    numberOfFish,
    abwG: asFiniteNumber(row.average_body_weight),
    biomassKg,
    fishDensity: volumeM3 ? divideOrNull(numberOfFish ?? 0, volumeM3) : null,
    feedPeriodKg,
    feedAggKg,
    feedIntensityKgM3: volumeM3 ? divideOrNull(feedPeriodKg ?? 0, volumeM3) : null,
    growthKg: asFiniteNumber(row.biomass_increase_period),
    cumulativeGrowthKg: asFiniteNumber(row.biomass_increase_aggregated),
    harvestKg: asFiniteNumber(row.total_weight_harvested),
    mortalityFish,
    mortalityRatePct: periodStartFish ? divideOrNull((mortalityFish ?? 0) * 100, periodStartFish) : null,
    transferInFish,
    transferOutFish: asFiniteNumber(row.number_of_fish_transfer_out),
    harvestFish: asFiniteNumber(row.number_of_fish_harvested),
    adgGDay: growth?.adgGDay ?? null,
    sgr: growth?.sgrPctDay ?? getOptionalNumber(row, "sgr"),
    feedingRate: asFiniteNumber(row.feeding_rate_on_date),
    biomassDensity: asFiniteNumber(row.biomass_density) ?? (volumeM3 ? divideOrNull(biomassKg ?? 0, volumeM3) : null),
    periodEfcr: resolveDisplayEfcr(row),
    aggregatedEfcr: asFiniteNumber(row.efcr_aggregated),
    cumulativeMortality: asFiniteNumber(row.cumulative_mortality),
    survivalRatePct: asFiniteNumber(row.survival_rate_pct),
    feedType: enrichment.feedTypeBySystemDate?.get(key) ?? null,
  }
}

function consolidateProductionRows(rows: ProductionSummaryRpcRow[], enrichment: ProductionRowEnrichment) {
  const byDate = new Map<string, ConsolidatedAccumulator>()

  rows.forEach((row) => {
    if (!row.date) return
    const systemId = row.system_id ?? null
    const key = buildSystemDateKey(systemId, row.date)
    const growth = enrichment.growthBySystemDate?.get(key)
    const feedType = enrichment.feedTypeBySystemDate?.get(key)
    const current =
      byDate.get(row.date) ??
      {
        date: row.date,
        periodStartFish: 0,
        numberOfFish: 0,
        biomassKg: 0,
        feedPeriodKg: 0,
        feedAggKg: 0,
        feedTypes: new Set<string>(),
        growthKg: 0,
        cumulativeGrowthKg: 0,
        harvestKg: 0,
        mortalityFish: 0,
        cumulativeMortality: 0,
        transferInFish: 0,
        transferOutFish: 0,
        transferOutFishAggregated: 0,
        harvestFish: 0,
        weightedAdgNumerator: 0,
        weightedSgrNumerator: 0,
        weightedFeedingRateNumerator: 0,
        weightedBiomassForAverages: 0,
        weightedSurvivalPctNumerator: 0,
        survivalWeight: 0,
      }

    const biomassWeight = row.total_biomass ?? 0
    const transferInFish = getOptionalNumber(row, "number_of_fish_transfer_in") ?? 0
    const survivalWeight = row.fish_count_period_start ?? 0
    current.periodStartFish += row.fish_count_period_start ?? 0
    current.numberOfFish += row.number_of_fish_inventory ?? 0
    current.biomassKg += row.total_biomass ?? 0
    current.feedPeriodKg += row.total_feed_amount_period ?? 0
    current.feedAggKg += row.total_feed_amount_aggregated ?? 0
    current.growthKg += row.biomass_increase_period ?? 0
    current.cumulativeGrowthKg += row.biomass_increase_aggregated ?? 0
    current.harvestKg += row.total_weight_harvested ?? 0
    current.mortalityFish += row.mortality_count_period ?? 0
    current.cumulativeMortality += row.cumulative_mortality ?? 0
    current.transferInFish += transferInFish
    current.transferOutFish += row.number_of_fish_transfer_out ?? 0
    current.transferOutFishAggregated += row.number_of_fish_transfer_out_aggregated ?? 0
    current.harvestFish += row.number_of_fish_harvested ?? 0
    current.weightedAdgNumerator += (growth?.adgGDay ?? 0) * biomassWeight
    current.weightedSgrNumerator += ((growth?.sgrPctDay ?? getOptionalNumber(row, "sgr") ?? 0) * biomassWeight)
    current.weightedFeedingRateNumerator += (row.feeding_rate_on_date ?? 0) * biomassWeight
    current.weightedBiomassForAverages += biomassWeight
    current.weightedSurvivalPctNumerator += (row.survival_rate_pct ?? 0) * survivalWeight
    current.survivalWeight += survivalWeight
    if (feedType) current.feedTypes.add(feedType)

    byDate.set(row.date, current)
  })

  return sortByDateAsc(Array.from(byDate.values()), (row) => row.date).map((row) => ({
    rowId: row.date,
    date: row.date,
    systemName: null,
    periodStartFish: row.periodStartFish,
    numberOfFish: row.numberOfFish,
    abwG: divideOrNull(row.biomassKg * 1000, row.numberOfFish),
    biomassKg: row.biomassKg,
    fishDensity:
      enrichment.totalScopedVolumeM3 && enrichment.totalScopedVolumeM3 > 0
        ? row.numberOfFish / enrichment.totalScopedVolumeM3
        : null,
    feedPeriodKg: row.feedPeriodKg,
    feedAggKg: row.feedAggKg,
    feedIntensityKgM3:
      enrichment.totalScopedVolumeM3 && enrichment.totalScopedVolumeM3 > 0
        ? row.feedPeriodKg / enrichment.totalScopedVolumeM3
        : null,
    growthKg: row.growthKg,
    cumulativeGrowthKg: row.cumulativeGrowthKg,
    harvestKg: row.harvestKg,
    mortalityFish: row.mortalityFish,
    mortalityRatePct: divideOrNull(row.mortalityFish * 100, row.periodStartFish),
    transferInFish: row.transferInFish,
    transferOutFish: row.transferOutFish,
    harvestFish: row.harvestFish,
    adgGDay: divideOrNull(row.weightedAdgNumerator, row.weightedBiomassForAverages),
    sgr: divideOrNull(row.weightedSgrNumerator, row.weightedBiomassForAverages),
    feedingRate: divideOrNull(row.weightedFeedingRateNumerator, row.weightedBiomassForAverages),
    biomassDensity:
      enrichment.totalScopedVolumeM3 && enrichment.totalScopedVolumeM3 > 0
        ? row.biomassKg / enrichment.totalScopedVolumeM3
        : null,
    periodEfcr: divideOrNull(row.feedPeriodKg, row.growthKg),
    aggregatedEfcr: divideOrNull(row.feedAggKg, row.cumulativeGrowthKg),
    cumulativeMortality: row.cumulativeMortality,
    survivalRatePct: divideOrNull(row.weightedSurvivalPctNumerator, row.survivalWeight),
    feedType:
      row.feedTypes.size === 0 ? null : row.feedTypes.size === 1 ? Array.from(row.feedTypes)[0] ?? null : "Mixed",
  }))
}

export function buildProductionPeriodViewRows(params: {
  productionRows: ProductionSummaryRpcRow[]
  consolidate: boolean
  volumeBySystemId?: Map<number, number>
  growthBySystemDate?: Map<string, { adgGDay: number | null; sgrPctDay: number | null }>
  feedTypeBySystemDate?: Map<string, string | null>
  totalScopedVolumeM3?: number | null
}): ProductionPeriodViewRow[] {
  const enrichment: ProductionRowEnrichment = {
    totalScopedVolumeM3: params.totalScopedVolumeM3,
    volumeBySystemId: params.volumeBySystemId,
    growthBySystemDate: params.growthBySystemDate,
    feedTypeBySystemDate: params.feedTypeBySystemDate,
  }
  const rows = params.consolidate
    ? consolidateProductionRows(params.productionRows, enrichment)
    : params.productionRows.map((row) => mapProductionSummaryRow(row, enrichment))

  return attachUniqueRowIds(sortByDateAsc(rows, (row) => row.date))
}

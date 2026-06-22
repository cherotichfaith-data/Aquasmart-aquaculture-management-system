import { sortByDateAsc } from "@/lib/utils"
import type { ProductionSummaryRpcRow } from "./types"

export type ProductionPeriodViewRow = {
  date: string
  systemName: string | null
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

export type ProductionPeriodViewResponse = {
  chartRows: ProductionPeriodViewRow[]
  tableRows: ProductionPeriodViewRow[]
}

type ConsolidatedAccumulator = {
  date: string
  numberOfFish: number
  biomassKg: number
  totalStockedFish: number
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

const buildSystemDateKey = (systemId: number | null | undefined, date: string | null | undefined) =>
  `${systemId ?? "system"}|${date ?? ""}`

function buildSurvivalRatePct(params: {
  numberOfFishStocked: number | null
  cumulativeMortality: number | null
  transferOutFishAggregated: number | null
}) {
  const stocked = params.numberOfFishStocked ?? 0
  if (stocked <= 0) return null
  const survivors = stocked - (params.cumulativeMortality ?? 0) - (params.transferOutFishAggregated ?? 0)
  return (survivors / stocked) * 100
}

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
  const biomassKg = asFiniteNumber(row.total_biomass)
  const feedPeriodKg = asFiniteNumber(row.total_feed_amount_period)
  const feedAggKg = asFiniteNumber(row.total_feed_amount_aggregated)
  const transferInFish = getOptionalNumber(row, "number_of_fish_transfer_in")
  const transferOutFishAggregated = asFiniteNumber(row.number_of_fish_transfer_out_aggregated)

  return {
    date: row.date,
    systemName: row.system_name ?? (systemId != null ? `System ${systemId}` : null),
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
    mortalityFish: asFiniteNumber(row.daily_mortality_count),
    transferInFish,
    transferOutFish: asFiniteNumber(row.number_of_fish_transfer_out),
    harvestFish: asFiniteNumber(row.number_of_fish_harvested),
    adgGDay: growth?.adgGDay ?? null,
    sgr: growth?.sgrPctDay ?? getOptionalNumber(row, "sgr"),
    feedingRate: asFiniteNumber(row.feeding_rate),
    biomassDensity: asFiniteNumber(row.biomass_density) ?? (volumeM3 ? divideOrNull(biomassKg ?? 0, volumeM3) : null),
    periodEfcr: asFiniteNumber(row.efcr_period),
    aggregatedEfcr: asFiniteNumber(row.efcr_aggregated),
    cumulativeMortality: asFiniteNumber(row.cumulative_mortality),
    survivalRatePct: buildSurvivalRatePct({
      numberOfFishStocked: asFiniteNumber(row.number_of_fish_stocked),
      cumulativeMortality: asFiniteNumber(row.cumulative_mortality),
      transferOutFishAggregated,
    }),
    feedType: enrichment.feedTypeBySystemDate?.get(key) ?? null,
  }
}

function consolidateProductionRows(rows: ProductionSummaryRpcRow[], enrichment: ProductionRowEnrichment) {
  const byDate = new Map<string, ConsolidatedAccumulator>()

  rows.forEach((row) => {
    if (!row.date) return
    const systemId = row.system_id ?? null
    const key = buildSystemDateKey(systemId, row.date)
    const volumeM3 = systemId != null ? enrichment.volumeBySystemId?.get(systemId) ?? 0 : 0
    const growth = enrichment.growthBySystemDate?.get(key)
    const feedType = enrichment.feedTypeBySystemDate?.get(key)
    const current =
      byDate.get(row.date) ??
      {
        date: row.date,
        numberOfFish: 0,
        biomassKg: 0,
        totalStockedFish: 0,
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
      }

    const biomassWeight = row.total_biomass ?? 0
    const transferInFish = getOptionalNumber(row, "number_of_fish_transfer_in") ?? 0
    current.numberOfFish += row.number_of_fish_inventory ?? 0
    current.biomassKg += row.total_biomass ?? 0
    current.totalStockedFish += row.number_of_fish_stocked ?? 0
    current.feedPeriodKg += row.total_feed_amount_period ?? 0
    current.feedAggKg += row.total_feed_amount_aggregated ?? 0
    current.growthKg += row.biomass_increase_period ?? 0
    current.cumulativeGrowthKg += row.biomass_increase_aggregated ?? 0
    current.harvestKg += row.total_weight_harvested ?? 0
    current.mortalityFish += row.daily_mortality_count ?? 0
    current.cumulativeMortality += row.cumulative_mortality ?? 0
    current.transferInFish += transferInFish
    current.transferOutFish += row.number_of_fish_transfer_out ?? 0
    current.transferOutFishAggregated += row.number_of_fish_transfer_out_aggregated ?? 0
    current.harvestFish += row.number_of_fish_harvested ?? 0
    current.weightedAdgNumerator += (growth?.adgGDay ?? 0) * biomassWeight
    current.weightedSgrNumerator += ((growth?.sgrPctDay ?? getOptionalNumber(row, "sgr") ?? 0) * biomassWeight)
    current.weightedFeedingRateNumerator += (row.feeding_rate ?? 0) * biomassWeight
    current.weightedBiomassForAverages += biomassWeight
    if (feedType) current.feedTypes.add(feedType)

    byDate.set(row.date, current)
  })

  return sortByDateAsc(Array.from(byDate.values()), (row) => row.date).map((row) => ({
    date: row.date,
    systemName: "All Systems",
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
    survivalRatePct: buildSurvivalRatePct({
      numberOfFishStocked: row.totalStockedFish,
      cumulativeMortality: row.cumulativeMortality,
      transferOutFishAggregated: row.transferOutFishAggregated,
    }),
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

  return sortByDateAsc(rows, (row) => row.date)
}

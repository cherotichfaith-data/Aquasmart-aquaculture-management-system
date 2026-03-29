import type { RecommendedAction } from "./types"

type ProductionMortalityLikeRow = {
  number_of_fish_inventory: number | null
  daily_mortality_count: number | null
}

type InventoryRecommendationRow = {
  system_id: number | null
  inventory_date: string | null
  mortality_rate: number | null
  number_of_fish: number | null
  number_of_fish_mortality: number | null
  feeding_rate: number | null
  feeding_amount: number | null
  biomass_last_sampling: number | null
}

type InventoryMetricRow = InventoryRecommendationRow & {
  abw_last_sampling: number | null
  system_volume?: number | null
}

type ProductionEfcrRow = {
  biomass_increase_period: number | null
  total_feed_amount_period: number | null
  total_weight_transfer_out?: number | null
  total_weight_transfer_in?: number | null
  total_weight_harvested?: number | null
  total_weight_stocked?: number | null
}

type WaterQualityRecommendationRow = {
  system_id: number | null
  rating_date: string | null
  rating_numeric: number | null
}

export function computeMortalityRateFromProduction(rows: ProductionMortalityLikeRow[]): number | null {
  let weightedMortality = 0
  let totalFish = 0
  rows.forEach((row) => {
    const fish = row.number_of_fish_inventory ?? 0
    const mortality = row.daily_mortality_count ?? 0
    if (fish > 0) {
      weightedMortality += (mortality / fish) * fish
      totalFish += fish
    }
  })
  return totalFish > 0 ? weightedMortality / totalFish : null
}

const isFiniteMetric = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value)

export function aggregateInventoryMetrics(rows: InventoryMetricRow[]) {
  const byDate = new Map<string, { biomass: number; volume: number; hasBiomass: boolean; hasVolume: boolean }>()
  const latestAbwRowBySystem = new Map<number, { date: string; abw: number; fish: number | null }>()
  let feedingWeighted = 0
  let feedingBiomass = 0
  let mortalityWeighted = 0
  let mortalityFish = 0

  rows.forEach((row) => {
    const date = row.inventory_date
    const biomass = row.biomass_last_sampling
    const volume = row.system_volume ?? null
    const fish = row.number_of_fish
    const feed = row.feeding_amount
    const mortalityCount = row.number_of_fish_mortality

    if (date) {
      const current = byDate.get(date) ?? { biomass: 0, volume: 0, hasBiomass: false, hasVolume: false }
      if (isFiniteMetric(biomass)) {
        current.biomass += biomass
        current.hasBiomass = true
      }
      if (isFiniteMetric(volume) && volume > 0) {
        current.volume += volume
        current.hasVolume = true
      }
      byDate.set(date, current)

      if (row.system_id != null && isFiniteMetric(row.abw_last_sampling)) {
        const latestForSystem = latestAbwRowBySystem.get(row.system_id)
        if (!latestForSystem || date > latestForSystem.date) {
          latestAbwRowBySystem.set(row.system_id, {
            date,
            abw: row.abw_last_sampling,
            fish: isFiniteMetric(fish) ? fish : null,
          })
        }
      }
    }

    if (isFiniteMetric(biomass) && biomass > 0) {
      const feedingRateRow =
        isFiniteMetric(row.feeding_rate)
          ? row.feeding_rate
          : isFiniteMetric(feed)
            ? feed / biomass
            : null
      if (isFiniteMetric(feedingRateRow)) {
        feedingWeighted += feedingRateRow * biomass
        feedingBiomass += biomass
      }
    }

    if (isFiniteMetric(fish) && fish > 0) {
      const mortalityRateRow =
        isFiniteMetric(row.mortality_rate)
          ? row.mortality_rate
          : isFiniteMetric(mortalityCount)
            ? mortalityCount / fish
            : null
      if (isFiniteMetric(mortalityRateRow)) {
        mortalityWeighted += mortalityRateRow * fish
        mortalityFish += fish
      }
    }
  })

  const dailyRows = Array.from(byDate.entries()).sort((left, right) => left[0].localeCompare(right[0]))
  const biomassDays = dailyRows.filter(([, current]) => current.hasBiomass)
  const densityDays = dailyRows.filter(([, current]) => current.hasBiomass && current.hasVolume && current.volume > 0)

  let latestAbwWeighted = 0
  let latestAbwFish = 0
  let latestAbwFallback = 0
  let latestAbwCount = 0

  latestAbwRowBySystem.forEach((row) => {
    if (row.fish != null && row.fish > 0) {
      latestAbwWeighted += row.abw * row.fish
      latestAbwFish += row.fish
    } else {
      latestAbwFallback += row.abw
      latestAbwCount += 1
    }
  })

  return {
    averageBiomass:
      biomassDays.length > 0
        ? biomassDays.reduce((sum, [, current]) => sum + current.biomass, 0) / biomassDays.length
        : null,
    biomassDensity:
      densityDays.length > 0
        ? densityDays.reduce((sum, [, current]) => sum + current.biomass / current.volume, 0) / densityDays.length
        : null,
    feedingRate: feedingBiomass > 0 ? feedingWeighted / feedingBiomass : null,
    mortalityRate: mortalityFish > 0 ? mortalityWeighted / mortalityFish : null,
    abwAsOfEnd:
      latestAbwFish > 0
        ? latestAbwWeighted / latestAbwFish
        : latestAbwCount > 0
          ? latestAbwFallback / latestAbwCount
          : null,
  }
}

export function computeEfcrFromProductionRows(rows: ProductionEfcrRow[]): number | null {
  let feedSum = 0
  let denominator = 0

  rows.forEach((row) => {
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

export function toTrendDelta(delta: number | null | undefined): number | null {
  if (typeof delta !== "number" || !Number.isFinite(delta)) return null
  return delta
}

export function buildRecommendedActionsFromAnalytics(params: {
  scopedSystemIds: number[]
  inventoryRows: InventoryRecommendationRow[]
  waterQualityRows: WaterQualityRecommendationRow[]
}): RecommendedAction[] {
  if (params.scopedSystemIds.length === 0) return []

  const inventoryRows = params.inventoryRows.filter(
    (row) => row.system_id != null && params.scopedSystemIds.includes(row.system_id),
  )
  const wqRows = params.waterQualityRows.filter(
    (row) => row.system_id != null && params.scopedSystemIds.includes(row.system_id),
  )

  const latestInventoryDate = inventoryRows
    .map((row) => row.inventory_date)
    .filter(Boolean)
    .sort()
    .pop() as string | undefined

  const latestInventory = latestInventoryDate
    ? inventoryRows.filter((row) => row.inventory_date === latestInventoryDate)
    : []

  const mortalityRate =
    latestInventory.length > 0
      ? latestInventory.reduce((sum, row) => {
          if (typeof row.mortality_rate === "number") return sum + row.mortality_rate * 100
          const fish = row.number_of_fish ?? 0
          const mortality = row.number_of_fish_mortality ?? 0
          return fish > 0 ? sum + (mortality / fish) * 100 : sum
        }, 0) / latestInventory.length
      : null

  const feedingRate =
    latestInventory.length > 0
      ? latestInventory.reduce((sum, row) => {
          if (typeof row.feeding_rate === "number") return sum + row.feeding_rate * 100
          const feed = row.feeding_amount ?? 0
          const biomass = row.biomass_last_sampling ?? 0
          return biomass > 0 ? sum + (feed / biomass) * 100 : sum
        }, 0) / latestInventory.length
      : null

  const latestWqDate = wqRows
    .map((row) => row.rating_date)
    .filter(Boolean)
    .sort()
    .pop() as string | undefined

  const latestWq = latestWqDate ? wqRows.filter((row) => row.rating_date === latestWqDate) : []
  const waterQuality =
    latestWq.length > 0
      ? Math.round(latestWq.reduce((sum, row) => sum + (row.rating_numeric ?? 0), 0) / latestWq.length)
      : null

  const nextActions: RecommendedAction[] = []

  if (waterQuality !== null && waterQuality <= 1) {
    nextActions.push({
      title: "Water Quality Check",
      description: "Critical water quality detected. Run a full parameter test and correct immediately.",
      priority: "High",
      due: "Today",
    })
  } else if (waterQuality !== null && waterQuality === 2) {
    nextActions.push({
      title: "Stabilize Water Quality",
      description: "Water quality rating is below optimal. Inspect aeration and filtration.",
      priority: "Medium",
      due: "This week",
    })
  }

  if (mortalityRate !== null && mortalityRate > 2) {
    nextActions.push({
      title: "Mortality Investigation",
      description: "Mortality rate is elevated. Review recent handling, feeding, and water quality logs.",
      priority: "High",
      due: "This week",
    })
  } else if (mortalityRate !== null && mortalityRate > 1) {
    nextActions.push({
      title: "Monitor Mortality",
      description: "Mortality rate is trending up. Add an extra health inspection.",
      priority: "Medium",
      due: "This week",
    })
  }

  if (feedingRate !== null && feedingRate > 4) {
    nextActions.push({
      title: "Adjust Feeding Plan",
      description: "Feeding rate (% BW/day) is above target. Review feed schedule and check consumption.",
      priority: "Medium",
      due: "Next 3 days",
    })
  } else if (feedingRate !== null && feedingRate < 1.5) {
    nextActions.push({
      title: "Review Feed Intake",
      description: "Feeding rate (% BW/day) is below target. Verify appetite and update feeding logs.",
      priority: "Info",
      due: "Next 3 days",
    })
  }

  if (!nextActions.length) {
    nextActions.push({
      title: "Routine System Review",
      description: "No critical issues detected. Continue routine checks for water and feeding.",
      priority: "Info",
      due: "This week",
    })
  }

  return nextActions.slice(0, 3)
}

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

export function toTrendPercent(current: number | null | undefined, delta: number | null | undefined): number | null {
  if (typeof current !== "number" || typeof delta !== "number") return null
  const prev = current - delta
  if (!Number.isFinite(prev) || prev === 0) return null
  return (delta / prev) * 100
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
          if (typeof row.mortality_rate === "number") return sum + row.mortality_rate
          const fish = row.number_of_fish ?? 0
          const mortality = row.number_of_fish_mortality ?? 0
          return fish > 0 ? sum + (mortality / fish) * 100 : sum
        }, 0) / latestInventory.length
      : null

  const feedingRate =
    latestInventory.length > 0
      ? latestInventory.reduce((sum, row) => {
          if (typeof row.feeding_rate === "number") return sum + row.feeding_rate
          const feed = row.feeding_amount ?? 0
          const biomass = row.biomass_last_sampling ?? 0
          return biomass > 0 ? sum + (feed * 1000) / biomass : sum
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

  if (mortalityRate !== null && mortalityRate > 0.02) {
    nextActions.push({
      title: "Mortality Investigation",
      description: "Mortality rate is elevated. Review recent handling, feeding, and water quality logs.",
      priority: "High",
      due: "This week",
    })
  } else if (mortalityRate !== null && mortalityRate > 0.01) {
    nextActions.push({
      title: "Monitor Mortality",
      description: "Mortality rate is trending up. Add an extra health inspection.",
      priority: "Medium",
      due: "This week",
    })
  }

  if (feedingRate !== null && feedingRate > 40) {
    nextActions.push({
      title: "Adjust Feeding Plan",
      description: "Feeding rate (kg/t) is above target. Review feed schedule and check consumption.",
      priority: "Medium",
      due: "Next 3 days",
    })
  } else if (feedingRate !== null && feedingRate < 15) {
    nextActions.push({
      title: "Review Feed Intake",
      description: "Feeding rate (kg/t) is below target. Verify appetite and update feeding logs.",
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

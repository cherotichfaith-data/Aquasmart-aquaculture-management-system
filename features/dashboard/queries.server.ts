import type { Database } from "@/lib/types/database"
import type { TimeBounds } from "@/lib/time-period-bounds"
import { fetchTimePeriodBounds } from "@/lib/time-period-bounds"
import { sortByDateAsc } from "@/lib/utils"
import { createClient } from "@/utils/supabase/server"
import { requireUser } from "@/utils/supabase/require-user"
import type {
  DashboardPageInitialData,
  DashboardPageInitialFilters,
  DashboardSystemRow,
  KPIOverviewMetric,
  ProductionSummaryMetrics,
  ProductionTrendRow,
  SystemsTableData,
} from "./types"
import { toQuerySuccess } from "@/lib/api/_utils"
import { isTimePeriod, type TimePeriod } from "@/lib/time-period"
import {
  buildRecommendedActionsFromAnalytics,
  computeMortalityRateFromProduction,
  toTrendPercent,
} from "./analytics-shared"

type ServerClient = Awaited<ReturnType<typeof createClient>>
type DailyInventoryRow = Database["public"]["Functions"]["api_daily_fish_inventory_rpc"]["Returns"][number]
type DashboardConsolidatedRow = Database["public"]["Functions"]["api_dashboard_consolidated"]["Returns"][number]
type DailyRatingRow = Database["public"]["Views"]["api_daily_water_quality_rating"]["Row"]
type FishTransferRow = Database["public"]["Tables"]["fish_transfer"]["Row"]
type SystemOptionRow = Database["public"]["Functions"]["api_system_options_rpc"]["Returns"][number]
type AlertThresholdRow = Database["public"]["Views"]["api_alert_thresholds"]["Row"]
type WaterQualityMeasurementRow = Database["public"]["Views"]["api_water_quality_measurements"]["Row"]
type FishMortalityRow = Database["public"]["Tables"]["fish_mortality"]["Row"]
type FeedingRecordRow = Database["public"]["Tables"]["feeding_record"]["Row"]
type FishSamplingWeightRow = Database["public"]["Tables"]["fish_sampling_weight"]["Row"]
type FishHarvestRow = Database["public"]["Tables"]["fish_harvest"]["Row"]
type FeedIncomingRow = Database["public"]["Tables"]["feed_incoming"]["Row"]
type FishStockingRow = Database["public"]["Tables"]["fish_stocking"]["Row"]
type SystemRow = Database["public"]["Tables"]["system"]["Row"]

const DEFAULT_TIME_PERIOD: DashboardPageInitialFilters["timePeriod"] = "2 weeks"
const VALID_STAGES: DashboardPageInitialFilters["selectedStage"][] = ["all", "nursing", "grow_out"]

export function parseDashboardPageFilters(
  searchParams?: Record<string, string | string[] | undefined>,
): DashboardPageInitialFilters {
  const selectedBatchRaw = searchParams?.batch
  const selectedSystemRaw = searchParams?.system
  const selectedStageRaw = searchParams?.stage
  const timePeriodRaw = searchParams?.period

  const selectedBatch = typeof selectedBatchRaw === "string" ? selectedBatchRaw : "all"
  const selectedSystem = typeof selectedSystemRaw === "string" ? selectedSystemRaw : "all"
  const selectedStage =
    typeof selectedStageRaw === "string" &&
    VALID_STAGES.includes(selectedStageRaw as DashboardPageInitialFilters["selectedStage"])
      ? (selectedStageRaw as DashboardPageInitialFilters["selectedStage"])
      : "all"
  const timePeriod =
    typeof timePeriodRaw === "string" && isTimePeriod(timePeriodRaw)
      ? (timePeriodRaw as TimePeriod)
      : DEFAULT_TIME_PERIOD

  return {
    selectedBatch,
    selectedSystem,
    selectedStage,
    timePeriod,
  }
}

async function getTimeBounds(
  supabase: ServerClient,
  farmId: string,
  timePeriod: DashboardPageInitialFilters["timePeriod"],
): Promise<TimeBounds> {
  return fetchTimePeriodBounds(supabase as never, {
    farmId,
    timePeriod,
    scope: "dashboard",
  })
}

async function getDashboardSystemsRaw(
  supabase: ServerClient,
  params: {
    farmId: string
    stage?: DashboardPageInitialFilters["selectedStage"]
    systemId?: number
    dateFrom?: string | null
    dateTo?: string | null
  },
): Promise<DashboardSystemRow[]> {
  const { data, error } = await supabase.rpc("api_dashboard_systems", {
    p_farm_id: params.farmId,
    p_stage: params.stage && params.stage !== "all" ? params.stage : undefined,
    p_system_id: params.systemId,
    p_start_date: params.dateFrom ?? undefined,
    p_end_date: params.dateTo ?? undefined,
  })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as DashboardSystemRow[]
}

async function getSystemOptions(
  supabase: ServerClient,
  params: {
    farmId: string
    stage: DashboardPageInitialFilters["selectedStage"]
  },
): Promise<SystemOptionRow[]> {
  const { data, error } = await supabase.rpc("api_system_options_rpc", {
    p_farm_id: params.farmId,
    p_stage: params.stage !== "all" ? params.stage : undefined,
    p_active_only: true,
  })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as SystemOptionRow[]
}

async function getBatchSystemIds(supabase: ServerClient, batchId?: number): Promise<number[]> {
  if (!batchId || !Number.isFinite(batchId)) return []

  const { data, error } = await supabase
    .from("fish_stocking")
    .select("system_id")
    .eq("batch_id", batchId)
    .not("system_id", "is", null)

  if (error) {
    throw new Error(error.message)
  }

  return Array.from(
    new Set((data ?? []).map((row) => row.system_id).filter((value): value is number => typeof value === "number")),
  )
}

async function getBatchSystemRows(
  supabase: ServerClient,
  batchId?: number,
): Promise<Array<{ system_id: number }>> {
  const ids = await getBatchSystemIds(supabase, batchId)
  return ids.map((system_id) => ({ system_id }))
}

async function getProductionSummaryRows(
  supabase: ServerClient,
  params: {
    farmId: string
    systemId?: number
    dateFrom?: string | null
    dateTo?: string | null
  },
): Promise<ProductionTrendRow[]> {
  const { data, error } = await supabase.rpc("api_production_summary", {
    p_farm_id: params.farmId,
    p_system_id: params.systemId,
    p_start_date: params.dateFrom ?? undefined,
    p_end_date: params.dateTo ?? undefined,
  })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as ProductionTrendRow[]
}

async function getDailyInventoryRows(
  supabase: ServerClient,
  params: {
    farmId: string
    systemId?: number
    dateFrom?: string | null
    dateTo?: string | null
    limit?: number
  },
): Promise<DailyInventoryRow[]> {
  const { data, error } = await supabase.rpc("api_daily_fish_inventory_rpc", {
    p_farm_id: params.farmId,
    p_system_id: params.systemId,
    p_start_date: params.dateFrom ?? undefined,
    p_end_date: params.dateTo ?? undefined,
    p_order_asc: true,
    p_limit: params.limit ?? 5000,
  })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as DailyInventoryRow[]
}

async function getWaterQualityRatings(
  supabase: ServerClient,
  params: {
    farmId: string
    systemId?: number
    dateFrom?: string | null
    dateTo?: string | null
    limit?: number
  },
): Promise<DailyRatingRow[]> {
  let query = supabase
    .from("api_daily_water_quality_rating")
    .select("*")
    .eq("farm_id", params.farmId)
    .order("rating_date", { ascending: true })

  if (params.systemId) query = query.eq("system_id", params.systemId)
  if (params.dateFrom) query = query.gte("rating_date", params.dateFrom)
  if (params.dateTo) query = query.lte("rating_date", params.dateTo)
  if (params.limit) query = query.limit(params.limit)

  const { data, error } = await query
  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as DailyRatingRow[]
}

async function getWaterQualityMeasurements(
  supabase: ServerClient,
  params: {
    farmId: string
    systemId?: number
    dateFrom?: string | null
    dateTo?: string | null
    limit?: number
  },
): Promise<WaterQualityMeasurementRow[]> {
  let query = supabase
    .from("api_water_quality_measurements")
    .select("*")
    .eq("farm_id", params.farmId)
    .order("date", { ascending: true })
    .order("time", { ascending: true })

  if (params.systemId) query = query.eq("system_id", params.systemId)
  if (params.dateFrom) query = query.gte("date", params.dateFrom)
  if (params.dateTo) query = query.lte("date", params.dateTo)
  if (params.limit) query = query.limit(params.limit)

  const { data, error } = await query
  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as WaterQualityMeasurementRow[]
}

async function getAlertThresholds(supabase: ServerClient, farmId: string): Promise<AlertThresholdRow[]> {
  const { data, error } = await supabase
    .from("api_alert_thresholds")
    .select("*")
    .eq("farm_id", farmId)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as AlertThresholdRow[]
}

async function getDashboardConsolidated(
  supabase: ServerClient,
  params: {
    farmId: string
    systemId?: number
    dateFrom?: string | null
    dateTo?: string | null
  },
): Promise<DashboardConsolidatedRow | null> {
  const { data, error } = await supabase.rpc("api_dashboard_consolidated", {
    p_farm_id: params.farmId,
    p_system_id: params.systemId,
    p_start_date: params.dateFrom ?? undefined,
    p_end_date: params.dateTo ?? undefined,
  })

  if (error) {
    return null
  }

  return ((data ?? []) as DashboardConsolidatedRow[])[0] ?? null
}

async function getTransferRows(
  supabase: ServerClient,
  params: { batchId?: number; dateFrom?: string | null; dateTo?: string | null; limit?: number },
): Promise<FishTransferRow[]> {
  let query = supabase.from("fish_transfer").select("*").order("date", { ascending: false })
  if (params.batchId) query = query.eq("batch_id", params.batchId)
  if (params.dateFrom) query = query.gte("date", params.dateFrom)
  if (params.dateTo) query = query.lte("date", params.dateTo)
  if (params.limit) query = query.limit(params.limit)

  const { data, error } = await query
  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as FishTransferRow[]
}

async function getRecentRows<T>(
  supabase: ServerClient,
  table: "fish_mortality" | "feeding_record" | "fish_sampling_weight" | "fish_transfer" | "fish_harvest" | "water_quality_measurement" | "feed_incoming" | "fish_stocking" | "system",
  orderColumn: string,
  limit = 5,
): Promise<T[]> {
  const { data, error } = await supabase.from(table).select("*").order(orderColumn, { ascending: false }).limit(limit)
  if (error) {
    throw new Error(error.message)
  }
  return (data ?? []) as T[]
}

async function getRecentEntries(supabase: ServerClient) {
  const [
    mortality,
    feeding,
    sampling,
    transfer,
    harvest,
    waterQuality,
    incomingFeed,
    stocking,
    systems,
  ] = await Promise.all([
    getRecentRows<FishMortalityRow>(supabase, "fish_mortality", "date"),
    getRecentRows<FeedingRecordRow>(supabase, "feeding_record", "date"),
    getRecentRows<FishSamplingWeightRow>(supabase, "fish_sampling_weight", "date"),
    getRecentRows<FishTransferRow>(supabase, "fish_transfer", "date"),
    getRecentRows<FishHarvestRow>(supabase, "fish_harvest", "date"),
    getRecentRows<Database["public"]["Tables"]["water_quality_measurement"]["Row"]>(
      supabase,
      "water_quality_measurement",
      "date",
    ),
    getRecentRows<FeedIncomingRow>(supabase, "feed_incoming", "date"),
    getRecentRows<FishStockingRow>(supabase, "fish_stocking", "date"),
    getRecentRows<SystemRow>(supabase, "system", "created_at"),
  ])

  return {
    mortality: toQuerySuccess(mortality),
    feeding: toQuerySuccess(feeding),
    sampling: toQuerySuccess(sampling),
    transfer: toQuerySuccess(transfer),
    harvest: toQuerySuccess(harvest),
    water_quality: toQuerySuccess(waterQuality),
    incoming_feed: toQuerySuccess(incomingFeed),
    stocking: toQuerySuccess(stocking),
    systems: toQuerySuccess(systems),
  }
}

async function resolveScopedSystemIds(params: {
  supabase: ServerClient
  system: string
  batch: string
  dashboardSystems: DashboardSystemRow[]
}): Promise<number[]> {
  let scoped = params.dashboardSystems
    .map((row) => row.system_id)
    .filter((id): id is number => typeof id === "number")

  if (params.system !== "all") {
    const parsed = Number(params.system)
    if (!Number.isFinite(parsed)) return []
    scoped = scoped.filter((id) => id === parsed)
  }

  if (params.batch !== "all") {
    const batchId = Number(params.batch)
    if (!Number.isFinite(batchId)) return []
    const batchIds = new Set(await getBatchSystemIds(params.supabase, batchId))
    scoped = scoped.filter((id) => batchIds.has(id))
  }

  return scoped
}

function buildKpiOverview(params: {
  scopedSystemIds: number[]
  inventoryRows: DailyInventoryRow[]
  productionRows: ProductionTrendRow[]
  waterQualityRows: DailyRatingRow[]
  consolidatedRow: DashboardConsolidatedRow | null
  dateFrom: string
  dateTo: string
}): DashboardPageInitialData["kpiOverview"] {
  const ratingToneMap: Record<string, { tone: KPIOverviewMetric["tone"]; badge: string }> = {
    optimal: { tone: "good", badge: "Optimal" },
    acceptable: { tone: "warn", badge: "Acceptable" },
    critical: { tone: "bad", badge: "Critical" },
    lethal: { tone: "bad", badge: "Lethal" },
  }

  if (params.scopedSystemIds.length === 0) {
    return { metrics: [], dateBounds: { start: params.dateFrom, end: params.dateTo } }
  }

  const inventoryRows = params.inventoryRows.filter(
    (row) => row.system_id != null && params.scopedSystemIds.includes(row.system_id),
  )
  const productionRows = params.productionRows.filter(
    (row) => row.system_id != null && params.scopedSystemIds.includes(row.system_id),
  )
  const wqRows = params.waterQualityRows.filter(
    (row) => row.system_id != null && params.scopedSystemIds.includes(row.system_id),
  )

  let totalFeed = 0
  let totalBiomass = 0
  let biomassCount = 0
  let totalAbw = 0
  let abwCount = 0
  let totalBiomassDensity = 0
  let biomassDensityCount = 0
  let totalFish = 0
  let fishCount = 0
  let mortalityWeighted = 0
  let feedingWeighted = 0

  inventoryRows.forEach((row) => {
    const feed = row.feeding_amount ?? 0
    const biomass = row.biomass_last_sampling
    const fish = row.number_of_fish
    const abw = row.abw_last_sampling
    const biomassDensity = row.biomass_density
    const mortalityCount = row.number_of_fish_mortality ?? 0

    totalFeed += feed
    if (typeof biomass === "number") {
      totalBiomass += biomass
      biomassCount += 1
    }
    if (typeof abw === "number") {
      totalAbw += abw
      abwCount += 1
    }
    if (typeof biomassDensity === "number") {
      totalBiomassDensity += biomassDensity
      biomassDensityCount += 1
    }
    if (typeof fish === "number") {
      totalFish += fish
      fishCount += 1
    }

    if (typeof fish === "number" && fish > 0) {
      const mortalityRateRow =
        typeof row.mortality_rate === "number" ? row.mortality_rate : mortalityCount / fish
      mortalityWeighted += mortalityRateRow * fish
    }

    if (typeof biomass === "number" && biomass > 0) {
      const feedingRateRow =
        typeof row.feeding_rate === "number" ? row.feeding_rate : (feed * 1000) / biomass
      feedingWeighted += feedingRateRow * biomass
    }
  })

  const avgBiomass = biomassCount > 0 ? totalBiomass / biomassCount : null
  const avgAbw = abwCount > 0 ? totalAbw / abwCount : null
  const avgBiomassDensity = biomassDensityCount > 0 ? totalBiomassDensity / biomassDensityCount : null
  const feedRate =
    totalBiomass > 0 ? (feedingWeighted > 0 ? feedingWeighted / totalBiomass : (totalFeed * 1000) / totalBiomass) : null
  const mortalityRateFromInventory = totalFish > 0 ? mortalityWeighted / totalFish : null

  const gainAdjusted = productionRows.reduce((sum, row) => {
    const biomassIncrease = row.biomass_increase_period ?? 0
    const transferOut = ("total_weight_transfer_out" in row ? row.total_weight_transfer_out : 0) ?? 0
    const transferIn = ("total_weight_transfer_in" in row ? row.total_weight_transfer_in : 0) ?? 0
    const harvested = ("total_weight_harvested" in row ? row.total_weight_harvested : 0) ?? 0
    const stocked = ("total_weight_stocked" in row ? row.total_weight_stocked : 0) ?? 0
    return sum + (biomassIncrease - transferOut + transferIn + harvested - stocked)
  }, 0)

  const feedSum = productionRows.reduce((sum, row) => sum + (row.total_feed_amount_period ?? 0), 0)
  const efcr = gainAdjusted !== 0 ? feedSum / gainAdjusted : null
  const mortalityRateFromProduction = computeMortalityRateFromProduction(
    productionRows.map((row) => ({
      number_of_fish_inventory: row.number_of_fish_inventory,
      daily_mortality_count: row.daily_mortality_count,
    })),
  )
  const mortalityRate = mortalityRateFromInventory ?? mortalityRateFromProduction

  const resolvedEfcr = params.consolidatedRow?.efcr_period_consolidated ?? efcr
  const resolvedMortalityRate = params.consolidatedRow?.mortality_rate ?? mortalityRate
  const resolvedAvgBiomass = params.consolidatedRow?.average_biomass ?? avgBiomass
  const resolvedBiomassDensity = params.consolidatedRow?.biomass_density ?? avgBiomassDensity
  const resolvedFeedingRate = params.consolidatedRow?.feeding_rate ?? feedRate
  const resolvedAbw = params.consolidatedRow?.abw_asof_end ?? avgAbw
  const resolvedWqAverage =
    wqRows.length > 0
      ? wqRows.reduce((sum, row) => sum + (row.rating_numeric ?? 0), 0) / wqRows.length
      : null

  const wqRounded = resolvedWqAverage === null ? null : Math.round(resolvedWqAverage)
  const wqLabel =
    wqRounded === null
      ? null
      : wqRounded === 0
        ? "lethal"
        : wqRounded === 1
          ? "critical"
          : wqRounded === 2
            ? "acceptable"
            : "optimal"
  const wqTone = wqLabel ? ratingToneMap[wqLabel]?.tone ?? "neutral" : "neutral"
  const wqBadge = wqLabel ? ratingToneMap[wqLabel]?.badge ?? "Monitoring" : "Monitoring"

  const trendByKey: Record<string, number | null> = params.consolidatedRow
    ? {
        efcr: toTrendPercent(resolvedEfcr, params.consolidatedRow.efcr_period_consolidated_delta),
        mortality: toTrendPercent(resolvedMortalityRate, params.consolidatedRow.mortality_rate_delta),
        biomass: toTrendPercent(resolvedAvgBiomass, params.consolidatedRow.average_biomass_delta),
        biomass_density: toTrendPercent(resolvedBiomassDensity, params.consolidatedRow.biomass_density_delta),
        feeding: toTrendPercent(resolvedFeedingRate, params.consolidatedRow.feeding_rate_delta),
        abw: toTrendPercent(resolvedAbw, params.consolidatedRow.abw_asof_end_delta),
        water_quality: null,
      }
    : {}

  const metrics: KPIOverviewMetric[] = [
    {
      key: "efcr",
      label: "eFCR",
      value: resolvedEfcr,
      decimals: 2,
      trend: trendByKey.efcr ?? null,
      invertTrend: true,
    },
    {
      key: "mortality",
      label: "Mortality Rate",
      value: resolvedMortalityRate,
      unit: "rate/day",
      decimals: 4,
      trend: trendByKey.mortality ?? null,
      invertTrend: true,
    },
    {
      key: "abw",
      label: "Avg Body Weight",
      value: resolvedAbw,
      unit: "g",
      decimals: 1,
      trend: trendByKey.abw ?? null,
      invertTrend: false,
    },
    {
      key: "biomass",
      label: "Avg Biomass",
      value: resolvedAvgBiomass,
      unit: "kg",
      decimals: 1,
      trend: trendByKey.biomass ?? null,
      invertTrend: false,
    },
    {
      key: "biomass_density",
      label: "Biomass Density",
      value: resolvedBiomassDensity,
      unit: "kg/m3",
      decimals: 2,
      trend: trendByKey.biomass_density ?? null,
      invertTrend: false,
    },
    {
      key: "feeding",
      label: "Feeding Rate",
      value: resolvedFeedingRate,
      unit: "kg/t",
      decimals: 2,
      trend: trendByKey.feeding ?? null,
      invertTrend: false,
    },
    {
      key: "water_quality",
      label: "Water Quality",
      value: resolvedWqAverage,
      decimals: 1,
      trend: trendByKey.water_quality ?? null,
      invertTrend: false,
      tone: wqTone,
      badge: wqBadge,
    },
  ]

  return {
    metrics,
    dateBounds: { start: params.dateFrom, end: params.dateTo },
  }
}

function buildProductionSummaryMetrics(params: {
  scopedSystemIds: number[]
  productionRows: ProductionTrendRow[]
  transferRows: FishTransferRow[]
  dateFrom: string
  dateTo: string
}): ProductionSummaryMetrics {
  const empty: ProductionSummaryMetrics = {
    totalStockedFish: 0,
    totalMortalities: 0,
    netTransferAdjustments: 0,
    totalHarvestedFish: 0,
    totalHarvestedKg: 0,
    dateBounds: { start: params.dateFrom, end: params.dateTo },
  }

  if (params.scopedSystemIds.length === 0) return empty

  const filtered = params.productionRows.filter(
    (row) => row.system_id != null && params.scopedSystemIds.includes(row.system_id),
  )
  const scopedSet = new Set(params.scopedSystemIds)

  let totalStockedFish = 0
  let totalMortalities = 0
  let totalHarvestedFish = 0
  let totalHarvestedKg = 0

  filtered.forEach((row) => {
    totalStockedFish += row.number_of_fish_stocked ?? 0
    totalMortalities += row.daily_mortality_count ?? 0
    totalHarvestedFish += row.number_of_fish_harvested ?? 0
    totalHarvestedKg += row.total_weight_harvested ?? 0
  })

  const netTransferAdjustments = params.transferRows.reduce((sum, row) => {
    const count = row.number_of_fish_transfer ?? 0
    const originInScope = scopedSet.has(row.origin_system_id)
    const targetInScope = scopedSet.has(row.target_system_id)

    if (targetInScope && !originInScope) return sum + count
    if (originInScope && !targetInScope) return sum - count
    return sum
  }, 0)

  return {
    totalStockedFish,
    totalMortalities,
    netTransferAdjustments,
    totalHarvestedFish,
    totalHarvestedKg,
    dateBounds: { start: params.dateFrom, end: params.dateTo },
  }
}

function buildSystemsTable(params: {
  scopedSystemIds: number[]
  dashboardSystems: DashboardSystemRow[]
  dateFrom: string
  dateTo: string
}): SystemsTableData {
  if (params.scopedSystemIds.length === 0) {
    return {
      rows: [],
      meta: { reason: "No scoped systems", start: params.dateFrom, end: params.dateTo },
    }
  }

  return {
    rows: params.dashboardSystems.filter((row) => params.scopedSystemIds.includes(row.system_id)),
    meta: { source: "api_dashboard_systems", start: params.dateFrom, end: params.dateTo },
  }
}

export async function getDashboardPageInitialData(params: {
  farmId: string | null
  filters: DashboardPageInitialFilters
}): Promise<DashboardPageInitialData> {
  await requireUser()

  const empty: DashboardPageInitialData = {
    bounds: { start: null, end: null },
    systemOptions: toQuerySuccess([]),
    batchSystems: toQuerySuccess([]),
    kpiOverview: { metrics: [], dateBounds: { start: null, end: null } },
    productionTrend: [],
    systemsTable: { rows: [], meta: { reason: "Missing farmId", start: null, end: null } },
    productionSummaryMetrics: {
      totalStockedFish: 0,
      totalMortalities: 0,
      netTransferAdjustments: 0,
      totalHarvestedFish: 0,
      totalHarvestedKg: 0,
      dateBounds: { start: null, end: null },
    },
    recentEntries: {
      mortality: toQuerySuccess([]),
      feeding: toQuerySuccess([]),
      sampling: toQuerySuccess([]),
      transfer: toQuerySuccess([]),
      harvest: toQuerySuccess([]),
      water_quality: toQuerySuccess([]),
      incoming_feed: toQuerySuccess([]),
      stocking: toQuerySuccess([]),
      systems: toQuerySuccess([]),
    },
    waterQualityMeasurements: toQuerySuccess([]),
    alertThresholds: toQuerySuccess([]),
    recommendedActions: [],
  }

  if (!params.farmId) return empty

  const supabase = await createClient()
  const bounds = await getTimeBounds(supabase, params.farmId, params.filters.timePeriod)
  if (!bounds.start || !bounds.end) {
    return {
      ...empty,
      bounds,
      systemOptions: toQuerySuccess(await getSystemOptions(supabase, {
        farmId: params.farmId,
        stage: params.filters.selectedStage,
      })),
      batchSystems: toQuerySuccess(
        await getBatchSystemRows(
          supabase,
          params.filters.selectedBatch !== "all" ? Number(params.filters.selectedBatch) : undefined,
        ),
      ),
      kpiOverview: { metrics: [], dateBounds: bounds },
      systemsTable: { rows: [], meta: { reason: "Missing time bounds", start: bounds.start, end: bounds.end } },
      productionSummaryMetrics: { ...empty.productionSummaryMetrics, dateBounds: bounds },
      recentEntries: await getRecentEntries(supabase),
      alertThresholds: toQuerySuccess(await getAlertThresholds(supabase, params.farmId)),
    }
  }

  const selectedSystemId =
    params.filters.selectedSystem !== "all" && Number.isFinite(Number(params.filters.selectedSystem))
      ? Number(params.filters.selectedSystem)
      : undefined
  const batchId =
    params.filters.selectedBatch !== "all" && Number.isFinite(Number(params.filters.selectedBatch))
      ? Number(params.filters.selectedBatch)
      : undefined

  const [systemOptions, batchSystems, dashboardSystems, recentEntries, alertThresholds] = await Promise.all([
    getSystemOptions(supabase, {
      farmId: params.farmId,
      stage: params.filters.selectedStage,
    }),
    getBatchSystemRows(supabase, batchId),
    getDashboardSystemsRaw(supabase, {
      farmId: params.farmId,
      stage: params.filters.selectedStage,
      systemId: selectedSystemId,
      dateFrom: bounds.start,
      dateTo: bounds.end,
    }),
    getRecentEntries(supabase),
    getAlertThresholds(supabase, params.farmId),
  ])

  const scopedSystemIds = await resolveScopedSystemIds({
    supabase,
    system: params.filters.selectedSystem,
    batch: params.filters.selectedBatch,
    dashboardSystems,
  })

  const singleSystemId = scopedSystemIds.length === 1 ? scopedSystemIds[0] : undefined
  const [inventoryRows, productionRows, waterQualityRows, consolidatedRow, transferRows, waterQualityMeasurements] =
    await Promise.all([
      getDailyInventoryRows(supabase, {
        farmId: params.farmId,
        systemId: singleSystemId,
        dateFrom: bounds.start,
        dateTo: bounds.end,
        limit: 5000,
      }),
      getProductionSummaryRows(supabase, {
        farmId: params.farmId,
        systemId: singleSystemId,
        dateFrom: bounds.start,
        dateTo: bounds.end,
      }),
      getWaterQualityRatings(supabase, {
        farmId: params.farmId,
        systemId: singleSystemId,
        dateFrom: bounds.start,
        dateTo: bounds.end,
        limit: 2000,
      }),
      getDashboardConsolidated(supabase, {
        farmId: params.farmId,
        systemId: singleSystemId,
        dateFrom: bounds.start,
        dateTo: bounds.end,
      }),
      getTransferRows(supabase, {
        batchId,
        dateFrom: bounds.start,
        dateTo: bounds.end,
        limit: 5000,
      }),
      getWaterQualityMeasurements(supabase, {
        farmId: params.farmId,
        systemId: singleSystemId,
        dateFrom: bounds.start,
        dateTo: bounds.end,
        limit: 2000,
      }),
    ])

  const filteredProductionRows = productionRows.filter(
    (row) =>
      (params.filters.selectedStage === "all" || row.growth_stage === params.filters.selectedStage) &&
      row.system_id != null &&
      scopedSystemIds.includes(row.system_id),
  )

  return {
    bounds,
    systemOptions: toQuerySuccess(systemOptions),
    batchSystems: toQuerySuccess(batchSystems),
    kpiOverview: buildKpiOverview({
      scopedSystemIds,
      inventoryRows,
      productionRows,
      waterQualityRows,
      consolidatedRow,
      dateFrom: bounds.start,
      dateTo: bounds.end,
    }),
    productionTrend: sortByDateAsc(filteredProductionRows, (row) => row.date),
    systemsTable: buildSystemsTable({
      scopedSystemIds,
      dashboardSystems,
      dateFrom: bounds.start,
      dateTo: bounds.end,
    }),
    productionSummaryMetrics: buildProductionSummaryMetrics({
      scopedSystemIds,
      productionRows,
      transferRows,
      dateFrom: bounds.start,
      dateTo: bounds.end,
    }),
    recentEntries,
    waterQualityMeasurements: toQuerySuccess(waterQualityMeasurements),
    alertThresholds: toQuerySuccess(alertThresholds),
    recommendedActions: buildRecommendedActionsFromAnalytics({
      scopedSystemIds,
      inventoryRows,
      waterQualityRows,
    }),
  }
}

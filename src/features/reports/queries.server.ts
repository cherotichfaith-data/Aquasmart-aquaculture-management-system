import { toQuerySuccess } from "@/lib/supabase/query-transport"
import { createAccessTokenClient } from "@/lib/supabase/server"
import { requireUserContext } from "@/lib/supabase/require-user"
import {
  getScopedTimeBounds,
  getScopedSystemOptions,
  parseSelectedNumericId,
} from "@/features/shared/scoped-analytics.server"
import {
  listAlertThresholdRows,
  listAppConfigRows,
  listProductionSummaryRows,
  listWaterQualityMeasurementRows,
} from "@/features/shared/query-seed.server"
import {
  listFeedingRecords,
  listGrowthTrend,
  listHarvests,
  listMortalityData,
} from "@/features/shared/queries.server"
import { normalizeStageFilter } from "@/lib/stage-filter"
import { resolveSystemIdFromFilterValue } from "@/lib/system-options"
import type { Database, Enums } from "@/lib/types/database"
import { resolveTimePeriod, type TimeBounds, type TimePeriod } from "@/lib/time-period"
import type {
  FeedingBreakdownRow,
  FeedingRecordWithType,
  FeedingSummaryRow,
  PerformanceRecordRow,
  PerformanceSummaryRow,
} from "./types"

export type ReportsPageFilters = {
  selectedBatch: string
  selectedSystem: string
  selectedStage: "all" | Enums<"system_growth_stage">
  timePeriod: TimePeriod
}

type ProductionSummaryRow = Database["public"]["Functions"]["api_production_summary"]["Returns"][number]
type MortalityRow = Database["public"]["Tables"]["fish_mortality"]["Row"]
type SystemOptionRow = Database["public"]["Functions"]["api_system_options_rpc"]["Returns"][number]
type AppConfigRow = Database["public"]["Tables"]["app_config"]["Row"]
type GrowthTrendRow = {
  system_id: number
  sample_date: string
  abw_g: number | null
  adg_g_day: number | null
  sgr_pct_day: number | null
  days_interval: number | null
  weight_gain_g: number | null
  age_days?: number | null
  expected_abw_g?: number | null
  growth_deviation_pct?: number | null
}
type WaterQualityMeasurementRow = Database["public"]["Views"]["api_water_quality_measurements"]["Row"]
type AlertThresholdRow = Database["public"]["Views"]["api_alert_thresholds"]["Row"]
type HarvestRow = Database["public"]["Tables"]["fish_harvest"]["Row"]
type ReportsReadClient = Parameters<typeof listFeedingRecords>[0] & Parameters<typeof listProductionSummaryRows>[0]

export type ReportsPageInitialData = {
  bounds: TimeBounds
  productionPerformance: ReturnType<typeof toQuerySuccess<ProductionSummaryRow>>
  productionFeeding: ReturnType<typeof toQuerySuccess<ProductionSummaryRow>>
  feedingRecords: ReturnType<typeof toQuerySuccess<FeedingRecordWithType>>
  mortalityEvents: ReturnType<typeof toQuerySuccess<MortalityRow>>
  harvestRecords: ReturnType<typeof toQuerySuccess<HarvestRow>>
  growthSystems: ReturnType<typeof toQuerySuccess<SystemOptionRow>>
  growthTrend: ReturnType<typeof toQuerySuccess<GrowthTrendRow>>
  appConfig: ReturnType<typeof toQuerySuccess<AppConfigRow>>
  waterQualityMeasurements: ReturnType<typeof toQuerySuccess<WaterQualityMeasurementRow>>
  alertThresholds: ReturnType<typeof toQuerySuccess<AlertThresholdRow>>
}

const DEFAULT_TIME_PERIOD: ReportsPageFilters["timePeriod"] = "month"
export function parseReportsPageFilters(
  searchParams?: Record<string, string | string[] | undefined>,
): ReportsPageFilters {
  const selectedBatchRaw = searchParams?.batch
  const selectedSystemRaw = searchParams?.cage ?? searchParams?.system
  const selectedStageRaw = searchParams?.stage
  const timePeriodRaw = searchParams?.period

  return {
    selectedBatch: typeof selectedBatchRaw === "string" ? selectedBatchRaw : "all",
    selectedSystem: typeof selectedSystemRaw === "string" ? selectedSystemRaw : "all",
    selectedStage: normalizeStageFilter(selectedStageRaw),
    timePeriod: resolveTimePeriod(timePeriodRaw, DEFAULT_TIME_PERIOD),
  }
}

async function getScopedGrowthTrendRows(
  supabase: ReturnType<typeof createAccessTokenClient>,
  params: { farmId: string | null; systemIds: number[]; dateFrom: string; dateTo: string; days?: number | null },
) {
  if (!params.farmId) return []
  return listGrowthTrend(supabase, {
    farmId: params.farmId,
    systemIds: params.systemIds,
    days: params.days ?? undefined,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  })
}

function selectLatestRowsPerCycle(rows: ProductionSummaryRow[]) {
  const byCycle = new Map<string, ProductionSummaryRow>()

  rows.forEach((row) => {
    const cycleKey = `${row.cycle_id ?? `no-cycle-${row.system_id ?? "no-system"}`}`
    const current = byCycle.get(cycleKey)
    if (!current || String(row.date ?? "") > String(current.date ?? "")) {
      byCycle.set(cycleKey, row)
    }
  })

  return Array.from(byCycle.values()).sort((left, right) =>
    String(right.date ?? "").localeCompare(String(left.date ?? "")),
  )
}

const isFiniteNumber = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value)

export async function listFeedingSummaryRows(
  supabase: ReportsReadClient,
  params: {
    farmId?: string | null
    systemId?: number
    batchId?: number
    dateFrom?: string
    dateTo?: string
  },
): Promise<FeedingSummaryRow[]> {
  if (!params.farmId || !params.dateFrom || !params.dateTo) return []

  const [records, productionRows] = await Promise.all([
    listFeedingRecords(supabase, {
      farmId: params.farmId,
      systemId: params.systemId,
      batchId: params.batchId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    }),
    listProductionSummaryRows(supabase, {
      farmId: params.farmId,
      systemId: params.systemId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    }),
  ])

  const totalKgFed = records.reduce((sum, row) => sum + (row.feeding_amount ?? 0), 0)

  const relevantFeedRows = records.filter((row) => (row.feeding_amount ?? 0) > 0)
  const averageProteinPct = relevantFeedRows.some((row) => typeof row.feed_type?.crude_protein_percentage !== "number")
    ? null
    : (() => {
        const weighted = relevantFeedRows.reduce(
          (acc, row) => {
            const amount = row.feeding_amount ?? 0
            acc.proteinMass += (row.feed_type?.crude_protein_percentage ?? 0) * amount
            acc.amount += amount
            return acc
          },
          { proteinMass: 0, amount: 0 },
        )
        return weighted.amount > 0 ? weighted.proteinMass / weighted.amount : null
      })()

  const efcrWeighted = productionRows.reduce(
    (acc, row) => {
      if (!isFiniteNumber(row.efcr_period)) return acc
      const weight = row.total_feed_amount_period ?? 0
      if (weight <= 0) return acc
      acc.value += row.efcr_period * weight
      acc.weight += weight
      return acc
    },
    { value: 0, weight: 0 },
  )

  const biomassGainKg = productionRows.reduce((sum, row) => sum + Math.max(0, row.biomass_increase_period ?? 0), 0)

  return [
    {
      total_kg_fed: totalKgFed,
      average_protein_pct: averageProteinPct,
      average_efcr: efcrWeighted.weight > 0 ? efcrWeighted.value / efcrWeighted.weight : null,
      biomass_gain_kg: biomassGainKg,
    },
  ]
}

export async function listFeedingBreakdownRows(
  supabase: ReportsReadClient,
  params: {
    farmId?: string | null
    systemId?: number
    batchId?: number
    dateFrom?: string
    dateTo?: string
  },
): Promise<FeedingBreakdownRow[]> {
  if (!params.farmId || !params.dateFrom || !params.dateTo) return []

  const records = await listFeedingRecords(supabase, {
    farmId: params.farmId,
    systemId: params.systemId,
    batchId: params.batchId,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  })

  const bySystem = new Map<
    number,
    { totalKg: number; entries: number; proteinMass: number; proteinWeight: number; lastDate: string | null }
  >()

  records.forEach((row) => {
    if (row.system_id == null) return
    const bucket = bySystem.get(row.system_id) ?? {
      totalKg: 0,
      entries: 0,
      proteinMass: 0,
      proteinWeight: 0,
      lastDate: null,
    }
    const amount = row.feeding_amount ?? 0
    bucket.totalKg += amount
    bucket.entries += 1
    if (typeof row.feed_type?.crude_protein_percentage === "number") {
      bucket.proteinMass += row.feed_type.crude_protein_percentage * amount
      bucket.proteinWeight += amount
    }
    if (!bucket.lastDate || String(row.date ?? "") > bucket.lastDate) {
      bucket.lastDate = row.date ?? null
    }
    bySystem.set(row.system_id, bucket)
  })

  return Array.from(bySystem.entries())
    .map(([systemId, bucket]) => ({
      system_id: systemId,
      system_label: `Cage ${systemId}`,
      total_kg: bucket.totalKg,
      entries: bucket.entries,
      avg_protein: bucket.proteinWeight > 0 ? bucket.proteinMass / bucket.proteinWeight : null,
      last_date: bucket.lastDate,
    }))
    .sort((left, right) => right.total_kg - left.total_kg)
}

export async function listPerformanceSummaryRows(
  supabase: ReportsReadClient,
  params: {
    farmId?: string | null
    systemId?: number
    stage?: Enums<"system_growth_stage">
    dateFrom?: string
    dateTo?: string
  },
): Promise<PerformanceSummaryRow[]> {
  if (!params.farmId || !params.dateFrom || !params.dateTo) return []

  const rows = await listProductionSummaryRows(supabase, {
    farmId: params.farmId,
    systemId: params.systemId,
    stage: params.stage,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  })
  const latestCycleRows = selectLatestRowsPerCycle(rows)
  if (!latestCycleRows.length) return []

  const totals = latestCycleRows.reduce(
    (acc, row) => {
      acc.totalBiomass += row.total_biomass ?? 0
      acc.totalFish += row.number_of_fish_inventory ?? 0
      acc.totalMortality += row.mortality_count_period ?? 0
      acc.totalHarvestKg += row.total_weight_harvested_aggregated ?? 0
      acc.totalHarvestFish += row.number_of_fish_harvested_aggregated ?? 0
      const survivalWeight = row.fish_count_period_start ?? 0
      if (survivalWeight > 0 && typeof row.survival_rate_pct === "number") {
        acc.survivalWeightedValue += row.survival_rate_pct * survivalWeight
        acc.survivalWeight += survivalWeight
      }
      if (acc.efcrAggregated == null && isFiniteNumber(row.efcr_aggregated)) {
        acc.efcrAggregated = row.efcr_aggregated
      }
      return acc
    },
    {
      totalBiomass: 0,
      totalFish: 0,
      totalMortality: 0,
      totalHarvestKg: 0,
      totalHarvestFish: 0,
      efcrAggregated: null as number | null,
      survivalWeightedValue: 0,
      survivalWeight: 0,
    },
  )

  const mortalityRate = totals.totalFish > 0 ? totals.totalMortality / totals.totalFish : null
  const survivalRatePct = totals.survivalWeight > 0 ? totals.survivalWeightedValue / totals.survivalWeight : null

  return [
    {
      efcr_aggregated_consolidated: totals.efcrAggregated,
      average_biomass: totals.totalBiomass,
      mortality_rate: mortalityRate,
      survival_rate_pct: survivalRatePct,
      total_harvest_kg: totals.totalHarvestKg,
      total_harvest_fish: totals.totalHarvestFish,
    },
  ]
}

export async function listPerformanceRecordRows(
  supabase: ReportsReadClient,
  params: {
    farmId?: string | null
    systemId?: number
    stage?: Enums<"system_growth_stage">
    dateFrom?: string
    dateTo?: string
    limit?: number
  },
): Promise<PerformanceRecordRow[]> {
  if (!params.farmId || !params.dateFrom || !params.dateTo) return []

  const rows = await listProductionSummaryRows(supabase, {
    farmId: params.farmId,
    systemId: params.systemId,
    stage: params.stage,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    limit: params.limit,
  })

  return rows.map((row) => ({
    date: row.date ?? null,
    system_id: row.system_id ?? null,
    system_name: row.system_name ?? null,
    cycle_id: row.cycle_id ?? null,
    efcr_aggregated: row.efcr_aggregated ?? null,
    survival_rate_pct: row.survival_rate_pct ?? null,
    total_weight_harvested_aggregated: row.total_weight_harvested_aggregated ?? null,
    number_of_fish_harvested: row.number_of_fish_harvested ?? null,
    mortality_count_period: row.mortality_count_period ?? null,
  }))
}

async function loadReportsPageInitialData(
  supabase: ReturnType<typeof createAccessTokenClient>,
  params: { farmId: string | null; filters: ReportsPageFilters; userId: string },
): Promise<ReportsPageInitialData> {
  const empty: ReportsPageInitialData = {
    bounds: { start: null, end: null },
    productionPerformance: toQuerySuccess([]),
    productionFeeding: toQuerySuccess([]),
    feedingRecords: toQuerySuccess([]),
    mortalityEvents: toQuerySuccess([]),
    harvestRecords: toQuerySuccess([]),
    growthSystems: toQuerySuccess([]),
    growthTrend: toQuerySuccess([]),
    appConfig: toQuerySuccess([]),
    waterQualityMeasurements: toQuerySuccess([]),
    alertThresholds: toQuerySuccess([]),
  }

  if (!params.farmId) return empty

  const batchId = parseSelectedNumericId(params.filters.selectedBatch)
  const [growthSystems, appConfig, alertThresholds] = await Promise.all([
    getScopedSystemOptions(supabase, params.farmId, params.filters.selectedStage),
    listAppConfigRows(supabase, { keys: ["target_harvest_weight_g"] }),
    listAlertThresholdRows(supabase, params.farmId, params.userId),
  ])
  const systemId = resolveSystemIdFromFilterValue(params.filters.selectedSystem, growthSystems)
  const bounds = await getScopedTimeBounds(supabase, params.farmId, params.filters.timePeriod, "production", systemId, batchId)

  if (!bounds.start || !bounds.end) {
    return {
      ...empty,
      bounds,
      growthSystems: toQuerySuccess(growthSystems),
      appConfig: toQuerySuccess(appConfig),
      alertThresholds: toQuerySuccess(alertThresholds),
    }
  }

  const scopedSystemIds =
    systemId != null
      ? [systemId]
      : growthSystems.map((row) => row.id).filter((id): id is number => typeof id === "number")

  const selectedStage = params.filters.selectedStage === "all" ? undefined : params.filters.selectedStage
  const [productionFeeding, feedingRecords, mortalityEvents, harvestRecords, growthTrend, waterQualityMeasurements] =
    await Promise.all([
      listProductionSummaryRows(supabase, {
        farmId: params.farmId,
        systemId,
        stage: selectedStage,
        dateFrom: bounds.start,
        dateTo: bounds.end,
        limit: 5000,
      }),
      listFeedingRecords(supabase, {
        farmId: params.farmId,
        systemId,
        batchId,
        dateFrom: bounds.start,
        dateTo: bounds.end,
        limit: 5000,
      }),
      listMortalityData(supabase, {
        farmId: params.farmId,
        systemId,
        batchId,
        dateFrom: bounds.start,
        dateTo: bounds.end,
        limit: 2000,
      }),
      // G-15: include harvest records so the harvest section has aggregated data
      listHarvests(supabase, {
        farmId: params.farmId,
        systemId,
        batchId,
        dateFrom: bounds.start,
        dateTo: bounds.end,
        limit: 2000,
      }),
      scopedSystemIds.length > 0
        ? getScopedGrowthTrendRows(supabase, {
            farmId: params.farmId,
            systemIds: scopedSystemIds,
            dateFrom: bounds.start,
            dateTo: bounds.end,
            days: bounds.resolvedDays,
          })
        : Promise.resolve([]),
      listWaterQualityMeasurementRows(supabase, {
        farmId: params.farmId,
        systemId,
        dateFrom: bounds.start,
        dateTo: bounds.end,
      }),
    ])

  return {
    bounds,
    productionPerformance: toQuerySuccess(productionFeeding),
    productionFeeding: toQuerySuccess(productionFeeding),
    feedingRecords: toQuerySuccess(feedingRecords),
    mortalityEvents: toQuerySuccess(mortalityEvents),
    harvestRecords: toQuerySuccess(harvestRecords),
    growthSystems: toQuerySuccess(growthSystems),
    growthTrend: toQuerySuccess(growthTrend),
    appConfig: toQuerySuccess(appConfig),
    waterQualityMeasurements: toQuerySuccess(waterQualityMeasurements),
    alertThresholds: toQuerySuccess(alertThresholds),
  }
}

export async function getReportsPageInitialData(params: { farmId: string | null; filters: ReportsPageFilters }) {
  const { user, accessToken } = await requireUserContext()
  return loadReportsPageInitialData(createAccessTokenClient(accessToken), { ...params, userId: user.id })
}

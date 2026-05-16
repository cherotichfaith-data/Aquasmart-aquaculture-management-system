import { runServerReadThrough } from "@/lib/cache/server"
import { cacheTags } from "@/lib/cache/tags"
import { toQuerySuccess } from "@/lib/api/_utils"
import { createAccessTokenClient } from "@/lib/supabase/server"
import { requireUserContext } from "@/lib/supabase/require-user"
import {
  getScopedTimeBounds,
  getScopedSystemOptions,
  parseSelectedNumericId,
  resolveScopedSelectedSystemId,
} from "@/features/shared/scoped-analytics.server"
import {
  listAlertThresholdRows,
  listAppConfigRows,
  listDailyFishInventoryRows,
  listProductionSummaryRows,
  listWaterQualityMeasurementRows,
} from "@/features/shared/query-seed.server"
import { listFeedingRecords, listGrowthTrend, listHarvests } from "@/lib/server/report-reads"
import { listMortalityEvents } from "@/lib/server/mortality-reads"
import { normalizeStageFilter } from "@/lib/stage-filter"
import type { Database, Enums } from "@/lib/types/database"
import { countTimeRangeDays, isTimePeriod, type TimeBounds, type TimePeriod } from "@/lib/time-period"

export type ReportsPageFilters = {
  selectedBatch: string
  selectedSystem: string
  selectedStage: "all" | Enums<"system_growth_stage">
  timePeriod: TimePeriod
}

type ProductionSummaryRow = Database["public"]["Functions"]["api_production_summary"]["Returns"][number]
type FeedingRecordRow = Database["public"]["Tables"]["feeding_record"]["Row"] & {
  feed_type: Database["public"]["Functions"]["api_feed_type_options_rpc"]["Returns"][number] | null
}
type MortalityRow = Database["public"]["Tables"]["fish_mortality"]["Row"]
type DailyInventoryRow = Database["public"]["Functions"]["api_daily_fish_inventory_rpc"]["Returns"][number]
type SystemOptionRow = Database["public"]["Functions"]["api_system_options_rpc"]["Returns"][number]
type AppConfigRow = Database["public"]["Tables"]["app_config"]["Row"]
type GrowthTrendRow = Database["public"]["Functions"]["api_growth_trend"]["Returns"][number] & { system_id: number }
type WaterQualityMeasurementRow = Database["public"]["Views"]["api_water_quality_measurements"]["Row"]
type AlertThresholdRow = Database["public"]["Views"]["api_alert_thresholds"]["Row"]
type HarvestRow = Database["public"]["Tables"]["fish_harvest"]["Row"]

export type ReportsPageInitialData = {
  bounds: TimeBounds
  productionPerformance: ReturnType<typeof toQuerySuccess<ProductionSummaryRow>>
  productionFeeding: ReturnType<typeof toQuerySuccess<ProductionSummaryRow>>
  feedingRecords: ReturnType<typeof toQuerySuccess<FeedingRecordRow>>
  mortalityEvents: ReturnType<typeof toQuerySuccess<MortalityRow>>
  mortalityInventory: ReturnType<typeof toQuerySuccess<DailyInventoryRow>>
  harvestRecords: ReturnType<typeof toQuerySuccess<HarvestRow>>
  growthSystems: ReturnType<typeof toQuerySuccess<SystemOptionRow>>
  growthTrend: ReturnType<typeof toQuerySuccess<GrowthTrendRow>>
  appConfig: ReturnType<typeof toQuerySuccess<AppConfigRow>>
  waterQualityMeasurements: ReturnType<typeof toQuerySuccess<WaterQualityMeasurementRow>>
  alertThresholds: ReturnType<typeof toQuerySuccess<AlertThresholdRow>>
}

const DEFAULT_TIME_PERIOD: ReportsPageFilters["timePeriod"] = "quarter"
export function parseReportsPageFilters(
  searchParams?: Record<string, string | string[] | undefined>,
): ReportsPageFilters {
  const selectedBatchRaw = searchParams?.batch
  const selectedSystemRaw = searchParams?.system
  const selectedStageRaw = searchParams?.stage
  const timePeriodRaw = searchParams?.period

  return {
    selectedBatch: typeof selectedBatchRaw === "string" ? selectedBatchRaw : "all",
    selectedSystem: typeof selectedSystemRaw === "string" ? selectedSystemRaw : "all",
    selectedStage: normalizeStageFilter(selectedStageRaw),
    timePeriod:
      typeof timePeriodRaw === "string" && isTimePeriod(timePeriodRaw)
        ? (timePeriodRaw as TimePeriod)
        : DEFAULT_TIME_PERIOD,
  }
}

async function getScopedGrowthTrendRows(
  supabase: ReturnType<typeof createAccessTokenClient>,
  params: { farmId: string | null; systemIds: number[]; dateFrom: string; dateTo: string },
) {
  if (!params.farmId) return []
  const rows = await Promise.all(
    params.systemIds.map(async (systemId) => {
      const result = await listGrowthTrend(supabase, {
        farmId: params.farmId,
        systemId,
        days: countTimeRangeDays(params.dateFrom, params.dateTo) ?? 180,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
      })
      return result.map((row) => ({ ...row, system_id: systemId }))
    }),
  )
  return rows.flat()
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
    mortalityInventory: toQuerySuccess([]),
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
  const systemId = resolveScopedSelectedSystemId(params.filters.selectedSystem, growthSystems)
  const bounds = await getScopedTimeBounds(supabase, params.farmId, params.filters.timePeriod, "production", systemId)

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

  // Fetch the un-filtered production summary once; derive the stage-filtered view in-memory.
  // This eliminates the duplicate api_production_summary RPC call (G-13 fix).
  const selectedStage = params.filters.selectedStage === "all" ? undefined : params.filters.selectedStage
  const [productionFeeding, feedingRecords, mortalityEvents, mortalityInventory, harvestRecords, growthTrend, waterQualityMeasurements] =
    await Promise.all([
      listProductionSummaryRows(supabase, {
        farmId: params.farmId,
        systemId,
        dateFrom: bounds.start,
        dateTo: bounds.end,
        limit: 5000,
      }),
      listFeedingRecords(supabase, {
        systemId,
        batchId,
        dateFrom: bounds.start,
        dateTo: bounds.end,
        limit: 5000,
      }),
      listMortalityEvents(supabase, {
        farmId: params.farmId,
        systemId,
        batchId,
        dateFrom: bounds.start,
        dateTo: bounds.end,
        limit: 2000,
      }),
      listDailyFishInventoryRows(supabase, {
        farmId: params.farmId,
        systemId,
        dateFrom: bounds.start,
        dateTo: bounds.end,
        limit: 2000,
      }),
      // G-15: include harvest records so the harvest section has aggregated data
      listHarvests(supabase, {
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
          })
        : Promise.resolve([]),
      listWaterQualityMeasurementRows(supabase, {
        farmId: params.farmId,
        systemId,
        dateFrom: bounds.start,
        dateTo: bounds.end,
      }),
    ])

  // Derive stage-filtered view from the already-fetched productionFeeding rows (G-13 fix)
  const productionPerformance = selectedStage
    ? productionFeeding.filter((row) => row.growth_stage === selectedStage)
    : productionFeeding

  return {
    bounds,
    productionPerformance: toQuerySuccess(productionPerformance),
    productionFeeding: toQuerySuccess(productionFeeding),
    feedingRecords: toQuerySuccess(feedingRecords),
    mortalityEvents: toQuerySuccess(mortalityEvents),
    mortalityInventory: toQuerySuccess(mortalityInventory),
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

  return runServerReadThrough({
    keyParts: [
      "reports-page",
      user.id,
      params.farmId,
      params.filters.selectedBatch,
      params.filters.selectedSystem,
      params.filters.selectedStage,
      params.filters.timePeriod,
    ],
    tags: params.farmId
      ? [
          cacheTags.farm(params.farmId),
          cacheTags.systems(params.farmId),
          cacheTags.inventory(params.farmId),
          cacheTags.feeding(params.farmId),
          cacheTags.waterQuality(params.farmId),
          cacheTags.reports(params.farmId, "mortality"),
        ]
      : [],
    loader: () => loadReportsPageInitialData(createAccessTokenClient(accessToken), { ...params, userId: user.id }),
  })
}

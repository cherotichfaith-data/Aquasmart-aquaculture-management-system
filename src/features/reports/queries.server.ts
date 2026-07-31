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
import type { FeedingRecordWithType } from "./types"

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
  const timePeriodRaw = searchParams?.date

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

import { runServerReadThrough } from "@/lib/cache/server"
import { cacheTags } from "@/lib/cache/tags"
import { createAccessTokenClient } from "@/lib/supabase/server"
import { requireUserContext } from "@/lib/supabase/require-user"
import { toQuerySuccess } from "@/lib/api/_utils"
import {
  listWaterQualityMeasurementsInputSchema,
  type ListWaterQualityMeasurementsInput,
} from "./schemas"
import type {
  WaterQualityActivityRow,
  WaterQualityLatestStatusRow,
  WaterQualityMeasurementViewRow,
  WaterQualityOverlayRow,
  WaterQualityPageFilters,
  WaterQualityPageInitialData,
  WaterQualityPageTab,
  WaterQualityRatingRow,
  WaterQualityRow,
  WaterQualitySyncRow,
  WaterQualitySystemOption,
  WaterQualityThresholdRow,
} from "./types"
import {
  getScopedBatchSystems,
  getScopedSystemOptions,
  getScopedTimeBounds,
  parseSelectedNumericId,
} from "@/features/shared/scoped-analytics.server"
import { isTimePeriod, type TimePeriod } from "@/lib/time-period"

type ServerClient = ReturnType<typeof createAccessTokenClient>

export async function listWaterQualityMeasurements(
  input: ListWaterQualityMeasurementsInput,
): Promise<WaterQualityRow[]> {
  const { accessToken } = await requireUserContext()
  const parsed = listWaterQualityMeasurementsInputSchema.parse(input)
  const supabase = createAccessTokenClient(accessToken)

  let query = supabase
    .from("water_quality_measurement")
    .select("*")
    .order("measured_at", { ascending: false })
    .limit(parsed.limit)

  if (parsed.systemId != null) query = query.eq("system_id", parsed.systemId)
  if (parsed.dateFrom) query = query.gte("date", parsed.dateFrom)
  if (parsed.dateTo) query = query.lte("date", parsed.dateTo)
  if (parsed.parameterName) query = query.eq("parameter_name", parsed.parameterName)

  const { data, error } = await query
  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as WaterQualityRow[]
}

const DEFAULT_TIME_PERIOD: WaterQualityPageFilters["timePeriod"] = "month"
const VALID_STAGES: WaterQualityPageFilters["selectedStage"][] = ["all", "nursing", "grow_out"]
const VALID_TABS: WaterQualityPageTab[] = ["overview", "alerts", "sensors", "parameter", "environment", "depth"]

function isValidTab(value: string): value is WaterQualityPageTab {
  return VALID_TABS.includes(value as WaterQualityPageTab)
}

export function parseWaterQualityPageFilters(
  searchParams?: Record<string, string | string[] | undefined>,
): WaterQualityPageFilters {
  const selectedBatchRaw = searchParams?.batch
  const selectedSystemRaw = searchParams?.system
  const selectedStageRaw = searchParams?.stage
  const timePeriodRaw = searchParams?.period
  const activeTabRaw = searchParams?.tab

  return {
    selectedBatch: typeof selectedBatchRaw === "string" ? selectedBatchRaw : "all",
    selectedSystem: typeof selectedSystemRaw === "string" ? selectedSystemRaw : "all",
    selectedStage:
      typeof selectedStageRaw === "string" && VALID_STAGES.includes(selectedStageRaw as WaterQualityPageFilters["selectedStage"])
        ? (selectedStageRaw as WaterQualityPageFilters["selectedStage"])
        : "all",
    timePeriod:
      typeof timePeriodRaw === "string" && isTimePeriod(timePeriodRaw)
        ? (timePeriodRaw as TimePeriod)
        : DEFAULT_TIME_PERIOD,
    activeTab: typeof activeTabRaw === "string" && isValidTab(activeTabRaw) ? activeTabRaw : "overview",
  }
}

async function getSyncStatus(supabase: ServerClient, farmId: string): Promise<WaterQualitySyncRow[]> {
  const { data, error } = await supabase.rpc("api_water_quality_sync_status", { p_farm_id: farmId })
  if (error) return []
  return (data ?? []) as WaterQualitySyncRow[]
}

async function getLatestStatus(
  supabase: ServerClient,
  farmId: string,
  systemId?: number,
): Promise<WaterQualityLatestStatusRow[]> {
  const { data, error } = await supabase.rpc("api_latest_water_quality_status", {
    p_farm_id: farmId,
    p_system_id: systemId,
  })
  if (error) return []
  return (data ?? []) as WaterQualityLatestStatusRow[]
}

async function getThresholds(supabase: ServerClient, farmId: string): Promise<WaterQualityThresholdRow[]> {
  const { data, error } = await supabase.from("api_alert_thresholds").select("*").eq("farm_id", farmId)
  if (error) return []
  return (data ?? []) as WaterQualityThresholdRow[]
}

async function getRatings(
  supabase: ServerClient,
  params: { farmId: string; systemId?: number; dateFrom: string; dateTo: string; limit: number },
): Promise<WaterQualityRatingRow[]> {
  let query = supabase
    .from("api_daily_water_quality_rating")
    .select("*")
    .eq("farm_id", params.farmId)
    .gte("rating_date", params.dateFrom)
    .lte("rating_date", params.dateTo)
    .order("rating_date", { ascending: true })
    .limit(params.limit)

  if (params.systemId) query = query.eq("system_id", params.systemId)
  const { data, error } = await query
  if (error) return []
  return (data ?? []) as WaterQualityRatingRow[]
}

async function getMeasurements(
  supabase: ServerClient,
  params: { farmId: string; systemId?: number; dateFrom: string; dateTo: string; limit: number },
): Promise<WaterQualityMeasurementViewRow[]> {
  let query = supabase
    .from("api_water_quality_measurements")
    .select("*")
    .eq("farm_id", params.farmId)
    .gte("date", params.dateFrom)
    .lte("date", params.dateTo)
    .order("date", { ascending: true })
    .order("time", { ascending: true })
    .limit(params.limit)

  if (params.systemId) query = query.eq("system_id", params.systemId)
  const { data, error } = await query
  if (error) return []
  return (data ?? []) as WaterQualityMeasurementViewRow[]
}

async function getOverlay(
  supabase: ServerClient,
  params: { farmId: string; systemId?: number; dateFrom: string; dateTo: string },
): Promise<WaterQualityOverlayRow[]> {
  const { data, error } = await supabase.rpc("api_daily_overlay", {
    p_farm_id: params.farmId,
    p_system_id: params.systemId,
    p_start_date: params.dateFrom,
    p_end_date: params.dateTo,
  })
  if (error) return []
  return (data ?? []) as WaterQualityOverlayRow[]
}

async function getActivities(
  supabase: ServerClient,
  params: { dateFrom: string; dateTo: string; limit: number },
): Promise<WaterQualityActivityRow[]> {
  const { data, error } = await supabase
    .from("change_log")
    .select("*")
    .eq("table_name", "water_quality_measurement")
    .gte("change_time", `${params.dateFrom}T00:00:00`)
    .lte("change_time", `${params.dateTo}T23:59:59`)
    .order("change_time", { ascending: false })
    .limit(params.limit)

  if (error) return []
  return (data ?? []) as WaterQualityActivityRow[]
}

async function loadWaterQualityPageInitialData(
  supabase: ServerClient,
  params: {
  farmId: string | null
  filters: WaterQualityPageFilters
}): Promise<WaterQualityPageInitialData> {
  const empty: WaterQualityPageInitialData = {
    bounds: { start: null, end: null },
    systemOptions: toQuerySuccess([]),
    batchSystems: toQuerySuccess([]),
    syncStatus: toQuerySuccess([]),
    latestStatus: toQuerySuccess([]),
    ratings: toQuerySuccess([]),
    measurements: toQuerySuccess([]),
    overlay: toQuerySuccess([]),
    activities: toQuerySuccess([]),
    thresholds: toQuerySuccess([]),
  }

  if (!params.farmId) return empty

  const selectedSystemId = parseSelectedNumericId(params.filters.selectedSystem)
  const batchId = parseSelectedNumericId(params.filters.selectedBatch)

  const [bounds, systemOptions, batchSystems, syncStatus, latestStatus, thresholds] = await Promise.all([
    getScopedTimeBounds(
      supabase,
      params.farmId,
      params.filters.timePeriod,
      "water_quality",
      selectedSystemId,
    ),
    getScopedSystemOptions(supabase, params.farmId, params.filters.selectedStage) as Promise<
      WaterQualitySystemOption[]
    >,
    getScopedBatchSystems(supabase, batchId),
    getSyncStatus(supabase, params.farmId),
    getLatestStatus(supabase, params.farmId, selectedSystemId),
    getThresholds(supabase, params.farmId),
  ])

  if (!bounds.start || !bounds.end) {
    return {
      bounds,
      systemOptions: toQuerySuccess(systemOptions),
      batchSystems: toQuerySuccess(batchSystems),
      syncStatus: toQuerySuccess(syncStatus),
      latestStatus: toQuerySuccess(latestStatus),
      ratings: toQuerySuccess([]),
      measurements: toQuerySuccess([]),
      overlay: toQuerySuccess([]),
      activities: toQuerySuccess([]),
      thresholds: toQuerySuccess(thresholds),
    }
  }

  const [ratings, measurements, overlay, activities] = await Promise.all([
    getRatings(supabase, {
      farmId: params.farmId,
      systemId: selectedSystemId,
      dateFrom: bounds.start,
      dateTo: bounds.end,
      limit: 2000,
    }),
    getMeasurements(supabase, {
      farmId: params.farmId,
      systemId: selectedSystemId,
      dateFrom: bounds.start,
      dateTo: bounds.end,
      limit: 2000,
    }),
    getOverlay(supabase, {
      farmId: params.farmId,
      systemId: selectedSystemId,
      dateFrom: bounds.start,
      dateTo: bounds.end,
    }),
    getActivities(supabase, {
      dateFrom: bounds.start,
      dateTo: bounds.end,
      limit: 1500,
    }),
  ])

  return {
    bounds,
    systemOptions: toQuerySuccess(systemOptions),
    batchSystems: toQuerySuccess(batchSystems),
    syncStatus: toQuerySuccess(syncStatus),
    latestStatus: toQuerySuccess(latestStatus),
    ratings: toQuerySuccess(ratings),
    measurements: toQuerySuccess(measurements),
    overlay: toQuerySuccess(overlay),
    activities: toQuerySuccess(activities),
    thresholds: toQuerySuccess(thresholds),
  }
}

export async function getWaterQualityPageInitialData(params: {
  farmId: string | null
  filters: WaterQualityPageFilters
}): Promise<WaterQualityPageInitialData> {
  const { user, accessToken } = await requireUserContext()

  return runServerReadThrough({
    keyParts: [
      "water-quality-page",
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
          cacheTags.waterQuality(params.farmId),
        ]
      : [],
    loader: () => loadWaterQualityPageInitialData(createAccessTokenClient(accessToken), params),
  })
}

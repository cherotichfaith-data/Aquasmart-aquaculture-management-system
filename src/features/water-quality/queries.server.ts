import { createAccessTokenClient } from "@/lib/supabase/server"
import { requireUserContext } from "@/lib/supabase/require-user"
import { toQuerySuccess } from "@/lib/api/_utils"
import {
  listWaterQualityMeasurementsInputSchema,
  type ListWaterQualityMeasurementsInput,
} from "./schemas"
import type {
  WaterQualityLatestStatusRow,
  WaterQualityMeasurementViewRow,
  WaterQualityPageFilters,
  WaterQualityPageInitialData,
  WaterQualityPageTab,
  WaterQualityRow,
  WaterQualitySystemOption,
} from "./types"
import {
  getScopedBatchSystems,
  getScopedSystemOptions,
  getScopedTimeBounds,
  parseSelectedNumericId,
} from "@/features/shared/scoped-analytics.server"
import { normalizeStageFilter } from "@/lib/stage-filter"
import { resolveSystemIdFromFilterValue } from "@/lib/system-options"
import { resolveTimePeriod, type TimePeriod } from "@/lib/time-period"
import { toRpcSystemId } from "@/lib/rpc-params"
import {
  DEFAULT_WQ_PARAMETER,
  isWqParameter,
} from "@/features/water-quality/wq-utils"

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
const VALID_TABS: WaterQualityPageTab[] = ["alerts", "parameter", "environment", "depth"]

function isValidTab(value: string): value is WaterQualityPageTab {
  return VALID_TABS.includes(value as WaterQualityPageTab)
}

export function parseWaterQualityPageFilters(
  searchParams?: Record<string, string | string[] | undefined>,
): WaterQualityPageFilters {
  const selectedBatchRaw = searchParams?.batch
  const selectedSystemRaw = searchParams?.cage ?? searchParams?.system
  const selectedStageRaw = searchParams?.stage
  const timePeriodRaw = searchParams?.period
  const activeTabRaw = searchParams?.tab
  const selectedParameterRaw = searchParams?.parameter

  return {
    selectedBatch: typeof selectedBatchRaw === "string" ? selectedBatchRaw : "all",
    selectedSystem: typeof selectedSystemRaw === "string" ? selectedSystemRaw : "all",
    selectedStage: normalizeStageFilter(selectedStageRaw),
    timePeriod: resolveTimePeriod(timePeriodRaw, DEFAULT_TIME_PERIOD),
    activeTab: typeof activeTabRaw === "string" && isValidTab(activeTabRaw) ? activeTabRaw : "environment",
    selectedParameter:
      typeof selectedParameterRaw === "string" && isWqParameter(selectedParameterRaw)
        ? selectedParameterRaw
        : DEFAULT_WQ_PARAMETER,
  }
}

async function getLatestStatus(
  supabase: ServerClient,
  farmId: string,
  systemId?: number,
): Promise<WaterQualityLatestStatusRow[]> {
  const { data, error } = await supabase.rpc("api_latest_water_quality_status", {
    p_farm_id: farmId,
    p_system_id: toRpcSystemId(systemId),
  } as never)
  if (error) return []
  return (data ?? []) as WaterQualityLatestStatusRow[]
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

async function loadWaterQualityPageInitialData(
  supabase: ServerClient,
  params: {
    farmId: string | null
    filters: WaterQualityPageFilters
  },
): Promise<WaterQualityPageInitialData> {
  const empty: WaterQualityPageInitialData = {
    bounds: { start: null, end: null },
    systemOptions: toQuerySuccess([]),
    batchSystems: toQuerySuccess([]),
    latestStatus: toQuerySuccess([]),
    measurements: toQuerySuccess([]),
  }

  if (!params.farmId) return empty

  const batchId = parseSelectedNumericId(params.filters.selectedBatch)

  const [systemOptions, batchSystems] = await Promise.all([
    getScopedSystemOptions(supabase, params.farmId, params.filters.selectedStage) as Promise<
      WaterQualitySystemOption[]
    >,
    getScopedBatchSystems(supabase, batchId),
  ])
  const selectedSystemId = resolveSystemIdFromFilterValue(params.filters.selectedSystem, systemOptions)
  const [bounds, latestStatus] = await Promise.all([
    getScopedTimeBounds(
      supabase,
      params.farmId,
      params.filters.timePeriod,
      "water_quality",
      selectedSystemId,
      batchId,
    ),
    getLatestStatus(supabase, params.farmId, selectedSystemId),
  ])

  if (!bounds.start || !bounds.end) {
    return {
      bounds,
      systemOptions: toQuerySuccess(systemOptions),
      batchSystems: toQuerySuccess(batchSystems),
      latestStatus: toQuerySuccess(latestStatus),
      measurements: toQuerySuccess([]),
    }
  }

  const measurements = await getMeasurements(supabase, {
    farmId: params.farmId,
    systemId: selectedSystemId,
    dateFrom: bounds.start,
    dateTo: bounds.end,
    limit: 2000,
  })

  return {
    bounds,
    systemOptions: toQuerySuccess(systemOptions),
    batchSystems: toQuerySuccess(batchSystems),
    latestStatus: toQuerySuccess(latestStatus),
    measurements: toQuerySuccess(measurements),
  }
}

export async function getWaterQualityPageInitialData(params: {
  farmId: string | null
  filters: WaterQualityPageFilters
}): Promise<WaterQualityPageInitialData> {
  const { accessToken } = await requireUserContext()
  return loadWaterQualityPageInitialData(createAccessTokenClient(accessToken), params)
}

import { runServerReadThrough } from "@/lib/cache/server"
import { cacheTags } from "@/lib/cache/tags"
import { toQuerySuccess } from "@/lib/api/_utils"
import type { AlertLogRow } from "@/lib/api/mortality"
import type { FeedingRecordWithType } from "@/lib/api/reports"
import {
  getScopedBatchSystems,
  getScopedSystemOptions,
  getScopedTimeBounds,
  parseSelectedNumericId,
} from "@/features/shared/scoped-analytics.server"
import { listAlertLog, listMortalityEvents, listSurvivalTrend } from "@/lib/server/mortality-reads"
import { listFeedingRecords, listSamplingData } from "@/lib/server/report-reads"
import { createAccessTokenClient } from "@/lib/supabase/server"
import type { QueryResult } from "@/lib/supabase-client"
import { requireUserContext } from "@/lib/supabase/require-user"
import { normalizeStageFilter } from "@/lib/stage-filter"
import type { Database, Enums } from "@/lib/types/database"
import { isTimePeriod, type TimeBounds, type TimePeriod } from "@/lib/time-period"

type ServerClient = ReturnType<typeof createAccessTokenClient>
type MortalitySystemOption = Database["public"]["Functions"]["api_system_options_rpc"]["Returns"][number]
type MortalityEventRow = Database["public"]["Tables"]["fish_mortality"]["Row"]
type SamplingRow = Database["public"]["Tables"]["fish_sampling_weight"]["Row"]
type MeasurementRow = Database["public"]["Views"]["api_water_quality_measurements"]["Row"]
type SurvivalTrendRow = Database["public"]["Functions"]["get_survival_trend"]["Returns"][number] & { system_id: number }

export type MortalityPageInitialFilters = {
  selectedBatch: string
  selectedSystem: string
  selectedStage: "all" | Enums<"system_growth_stage">
  timePeriod: TimePeriod
}

export type MortalityPageInitialData = {
  bounds: TimeBounds
  systems: QueryResult<MortalitySystemOption>
  batchSystems: QueryResult<{ system_id: number }>
  events: QueryResult<MortalityEventRow>
  alerts: QueryResult<AlertLogRow>
  survival: QueryResult<SurvivalTrendRow>
  feeding: QueryResult<FeedingRecordWithType>
  sampling: QueryResult<SamplingRow>
  measurements: QueryResult<MeasurementRow>
}

const DEFAULT_TIME_PERIOD: MortalityPageInitialFilters["timePeriod"] = "quarter"
export function parseMortalityPageFilters(
  searchParams?: Record<string, string | string[] | undefined>,
): MortalityPageInitialFilters {
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

function buildScopedSystemIdList(params: {
  selectedSystemId?: number
  selectedBatch: string
  systems: MortalitySystemOption[]
  batchSystems: Array<{ system_id: number }>
}) {
  if (params.selectedSystemId) return [params.selectedSystemId]

  const stageIds = params.systems.map((row) => row.id).filter((id): id is number => typeof id === "number")
  if (params.selectedBatch === "all") return stageIds

  const stageSet = new Set(stageIds)
  return params.batchSystems.map((row) => row.system_id).filter((id) => stageSet.has(id))
}

async function getMeasurements(
  supabase: ServerClient,
  params: { farmId: string; dateFrom: string; dateTo: string; limit: number },
) {
  const { data, error } = await supabase
    .from("api_water_quality_measurements")
    .select("*")
    .eq("farm_id", params.farmId)
    .gte("date", params.dateFrom)
    .lte("date", params.dateTo)
    .order("date", { ascending: true })
    .order("time", { ascending: true })
    .limit(params.limit)

  if (error) return [] as MeasurementRow[]
  return (data ?? []) as MeasurementRow[]
}

async function getScopedSurvivalTrend(
  supabase: ServerClient,
  params: { systemIds: number[]; dateFrom: string; dateTo?: string },
): Promise<SurvivalTrendRow[]> {
  const rows = await Promise.all(
    params.systemIds.map(async (systemId) => {
      const result = await listSurvivalTrend(supabase, {
        systemId,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
      })
      return result.map((row) => ({ ...row, system_id: systemId }))
    }),
  )

  return rows.flat()
}

async function loadMortalityPageInitialData(
  supabase: ServerClient,
  params: { farmId: string | null; filters: MortalityPageInitialFilters },
): Promise<MortalityPageInitialData> {
  const empty: MortalityPageInitialData = {
    bounds: { start: null, end: null },
    systems: toQuerySuccess([]),
    batchSystems: toQuerySuccess([]),
    events: toQuerySuccess([]),
    alerts: toQuerySuccess([]),
    survival: toQuerySuccess([]),
    feeding: toQuerySuccess([]),
    sampling: toQuerySuccess([]),
    measurements: toQuerySuccess([]),
  }

  if (!params.farmId) return empty

  const selectedSystemId = parseSelectedNumericId(params.filters.selectedSystem)
  const batchId = parseSelectedNumericId(params.filters.selectedBatch)
  const bounds = await getScopedTimeBounds(supabase, params.farmId, params.filters.timePeriod, "production", selectedSystemId)
  const [systems, batchSystems] = await Promise.all([
    getScopedSystemOptions(supabase, params.farmId, params.filters.selectedStage),
    getScopedBatchSystems(supabase, batchId),
  ])

  if (!bounds.start || !bounds.end) {
    return {
      ...empty,
      bounds,
      systems: toQuerySuccess(systems),
      batchSystems: toQuerySuccess(batchSystems),
    }
  }

  const scopedSystemIds = buildScopedSystemIdList({
    selectedSystemId,
    selectedBatch: params.filters.selectedBatch,
    systems,
    batchSystems,
  })

  const [events, alerts, survival, feeding, sampling, measurements] = await Promise.all([
    listMortalityEvents(supabase, {
      farmId: params.farmId,
      batchId,
      dateFrom: bounds.start,
      dateTo: bounds.end,
      limit: 5000,
    }),
    listAlertLog(supabase, {
      farmId: params.farmId,
      ruleCodes: ["MASS_MORTALITY", "ELEVATED_MORTALITY"],
      limit: 200,
    }),
    scopedSystemIds.length > 0
      ? getScopedSurvivalTrend(supabase, {
          systemIds: scopedSystemIds,
          dateFrom: bounds.start,
          dateTo: bounds.end,
        })
      : Promise.resolve([]),
    scopedSystemIds.length > 0
      ? listFeedingRecords(supabase, {
          systemIds: scopedSystemIds,
          batchId,
          dateFrom: bounds.start,
          dateTo: bounds.end,
          limit: 5000,
        })
      : Promise.resolve([]),
    scopedSystemIds.length > 0
      ? listSamplingData(supabase, {
          systemIds: scopedSystemIds,
          batchId,
          dateFrom: bounds.start,
          dateTo: bounds.end,
          limit: 5000,
        })
      : Promise.resolve([]),
    getMeasurements(supabase, {
      farmId: params.farmId,
      dateFrom: bounds.start,
      dateTo: bounds.end,
      limit: 8000,
    }),
  ])

  return {
    bounds,
    systems: toQuerySuccess(systems),
    batchSystems: toQuerySuccess(batchSystems),
    events: toQuerySuccess(events),
    alerts: toQuerySuccess(alerts),
    survival: toQuerySuccess(survival),
    feeding: toQuerySuccess(feeding),
    sampling: toQuerySuccess(sampling),
    measurements: toQuerySuccess(measurements),
  }
}

export async function getMortalityPageInitialData(params: {
  farmId: string | null
  filters: MortalityPageInitialFilters
}): Promise<MortalityPageInitialData> {
  const { user, accessToken } = await requireUserContext()

  return runServerReadThrough({
    keyParts: [
      "mortality-page",
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
          cacheTags.feeding(params.farmId),
          cacheTags.waterQuality(params.farmId),
          cacheTags.reports(params.farmId, "mortality"),
          cacheTags.reports(params.farmId, "sampling"),
        ]
      : [],
    loader: () => loadMortalityPageInitialData(createAccessTokenClient(accessToken), params),
  })
}

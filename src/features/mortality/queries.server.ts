import { toQuerySuccess } from "@/lib/api/_utils"
import type { AlertLogRow } from "@/lib/api/mortality"
import type { FeedingRecordWithType } from "@/lib/api/reports"
import {
  getScopedBatchSystems,
  getScopedSystemOptions,
  getScopedTimeBounds,
  parseSelectedNumericId,
  resolveScopedSelectedSystemId,
} from "@/features/shared/scoped-analytics.server"
import { listMortalityEvents } from "@/lib/server/mortality-reads"
import { listProductionSummaryRows } from "@/features/shared/query-seed.server"
import { listFeedingRecords, listSamplingData } from "@/lib/server/report-reads"
import { createAccessTokenClient } from "@/lib/supabase/server"
import type { QueryResult } from "@/lib/supabase-client"
import { requireUserContext } from "@/lib/supabase/require-user"
import { normalizeStageFilter } from "@/lib/stage-filter"
import type { Database, Enums } from "@/lib/types/database"
import { resolveTimePeriod, type TimeBounds, type TimePeriod } from "@/lib/time-period"

type ServerClient = ReturnType<typeof createAccessTokenClient>
type MortalitySystemOption = Database["public"]["Functions"]["api_system_options_rpc"]["Returns"][number]
type MortalityEventRow = Database["public"]["Tables"]["fish_mortality"]["Row"]
type SamplingRow = Database["public"]["Tables"]["fish_sampling_weight"]["Row"]
type MeasurementRow = Database["public"]["Views"]["api_water_quality_measurements"]["Row"]
type ProductionSummaryRow = Database["public"]["Functions"]["api_production_summary"]["Returns"][number]

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
  productionSummary: QueryResult<ProductionSummaryRow>
  feeding: QueryResult<FeedingRecordWithType>
  sampling: QueryResult<SamplingRow>
  measurements: QueryResult<MeasurementRow>
}

const DEFAULT_TIME_PERIOD: MortalityPageInitialFilters["timePeriod"] = "quarter"
export function parseMortalityPageFilters(
  searchParams?: Record<string, string | string[] | undefined>,
): MortalityPageInitialFilters {
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
    productionSummary: toQuerySuccess([]),
    feeding: toQuerySuccess([]),
    sampling: toQuerySuccess([]),
    measurements: toQuerySuccess([]),
  }

  if (!params.farmId) return empty

  const batchId = parseSelectedNumericId(params.filters.selectedBatch)
  const [systems, batchSystems] = await Promise.all([
    getScopedSystemOptions(supabase, params.farmId, params.filters.selectedStage),
    getScopedBatchSystems(supabase, batchId),
  ])
  const selectedSystemId = resolveScopedSelectedSystemId(params.filters.selectedSystem, systems)
  const bounds = await getScopedTimeBounds(supabase, params.farmId, params.filters.timePeriod, "production", selectedSystemId)

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

  const [events, productionSummary, feeding, sampling, measurements] = await Promise.all([
    listMortalityEvents(supabase, {
      farmId: params.farmId,
      batchId,
      dateFrom: bounds.start,
      dateTo: bounds.end,
      limit: 5000,
    }),
    scopedSystemIds.length > 0
      ? listProductionSummaryRows(supabase, {
          farmId: params.farmId,
          systemId: scopedSystemIds.length === 1 ? scopedSystemIds[0] : undefined,
          dateFrom: bounds.start,
          dateTo: bounds.end,
        }).then((rows) => rows.filter((row) => scopedSystemIds.includes(row.system_id)))
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
    alerts: toQuerySuccess([]),
    productionSummary: toQuerySuccess(productionSummary),
    feeding: toQuerySuccess(feeding),
    sampling: toQuerySuccess(sampling),
    measurements: toQuerySuccess(measurements),
  }
}

export async function getMortalityPageInitialData(params: {
  farmId: string | null
  filters: MortalityPageInitialFilters
}): Promise<MortalityPageInitialData> {
  const { accessToken } = await requireUserContext()
  return loadMortalityPageInitialData(createAccessTokenClient(accessToken), params)
}

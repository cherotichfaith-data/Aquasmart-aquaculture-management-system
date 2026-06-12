import { toQuerySuccess } from "@/lib/api/_utils"
import { createAccessTokenClient } from "@/lib/supabase/server"
import { requireUserContext } from "@/lib/supabase/require-user"
import {
  getScopedBatchSystems,
  getScopedSystemOptions,
  getScopedTimeBounds,
  parseSelectedNumericId,
} from "@/features/shared/scoped-analytics.server"
import { listSamplingData } from "@/lib/server/report-reads"
import { normalizeStageFilter } from "@/lib/stage-filter"
import type { Database, Enums } from "@/lib/types/database"
import { resolveTimePeriod, type TimeBounds, type TimePeriod } from "@/lib/time-period"
import { resolveSystemIdFromFilterValue } from "@/lib/system-options"

export type SamplingPageFilters = {
  selectedBatch: string
  selectedSystem: string
  selectedStage: "all" | Enums<"system_growth_stage">
  timePeriod: TimePeriod
}

type SamplingSystemOption = Database["public"]["Functions"]["api_system_options_rpc"]["Returns"][number]
type SamplingRow = Database["public"]["Tables"]["fish_sampling_weight"]["Row"]
type GrowthTrendRow = Database["public"]["Functions"]["api_growth_trend"]["Returns"][number] & { system_id: number }

export type SamplingPageInitialData = {
  bounds: TimeBounds
  systems: ReturnType<typeof toQuerySuccess<SamplingSystemOption>>
  batchSystems: ReturnType<typeof toQuerySuccess<{ system_id: number }>>
  sampling: ReturnType<typeof toQuerySuccess<SamplingRow>>
  growthTrend: ReturnType<typeof toQuerySuccess<GrowthTrendRow>>
}

const DEFAULT_TIME_PERIOD: SamplingPageFilters["timePeriod"] = "quarter"
export function parseSamplingPageFilters(
  searchParams?: Record<string, string | string[] | undefined>,
): SamplingPageFilters {
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

async function listScopedGrowthTrendRows(
  supabase: ReturnType<typeof createAccessTokenClient>,
  params: { farmId: string; systemIds: number[] },
): Promise<GrowthTrendRow[]> {
  const rows = await Promise.all(
    params.systemIds.map(async (systemId) => {
      const { data, error } = await supabase.rpc("api_growth_trend", {
        p_farm_id: params.farmId,
        p_system_id: systemId,
      })
      if (error) return []
      return (data ?? []).map((row) => ({ ...row, system_id: systemId })) as GrowthTrendRow[]
    }),
  )

  return rows.flat()
}

function buildScopedSystemIdList(params: {
  selectedSystem: string
  selectedBatch: string
  systems: SamplingSystemOption[]
  batchSystems: Array<{ system_id: number }>
}) {
  const selectedSystemId = resolveSystemIdFromFilterValue(params.selectedSystem, params.systems)
  if (selectedSystemId) return [selectedSystemId]

  const stageIds = params.systems.map((row) => row.id).filter((id): id is number => typeof id === "number")
  if (params.selectedBatch === "all") return stageIds
  const stageSet = new Set(stageIds)
  return params.batchSystems.map((row) => row.system_id).filter((id) => stageSet.has(id))
}

async function loadSamplingPageInitialData(
  supabase: ReturnType<typeof createAccessTokenClient>,
  params: { farmId: string | null; filters: SamplingPageFilters },
): Promise<SamplingPageInitialData> {
  const empty: SamplingPageInitialData = {
    bounds: { start: null, end: null },
    systems: toQuerySuccess([]),
    batchSystems: toQuerySuccess([]),
    sampling: toQuerySuccess([]),
    growthTrend: toQuerySuccess([]),
  }

  if (!params.farmId) return empty

  const batchId = parseSelectedNumericId(params.filters.selectedBatch)
  const [systems, batchSystems] = await Promise.all([
    getScopedSystemOptions(supabase, params.farmId, params.filters.selectedStage),
    getScopedBatchSystems(supabase, batchId),
  ])
  const systemId = resolveSystemIdFromFilterValue(params.filters.selectedSystem, systems)
  const bounds = await getScopedTimeBounds(supabase, params.farmId, params.filters.timePeriod, "production", systemId, batchId)

  if (!bounds.start || !bounds.end) {
    return {
      ...empty,
      bounds,
      systems: toQuerySuccess(systems),
      batchSystems: toQuerySuccess(batchSystems),
      growthTrend: toQuerySuccess([]),
    }
  }

  const scopedSystemIds = buildScopedSystemIdList({
    selectedSystem: params.filters.selectedSystem,
    selectedBatch: params.filters.selectedBatch,
    systems,
    batchSystems,
  })

  const hasSystem = Boolean(systemId)
  const [sampling, growthTrend] = await Promise.all([
    scopedSystemIds.length > 0
      ? listSamplingData(supabase, {
          systemId: hasSystem ? systemId : undefined,
          systemIds: !hasSystem ? scopedSystemIds : undefined,
          batchId,
          dateFrom: bounds.start,
          dateTo: bounds.end,
          limit: 2000,
        })
      : Promise.resolve([]),
    scopedSystemIds.length > 0
      ? listScopedGrowthTrendRows(supabase, {
          farmId: params.farmId,
          systemIds: scopedSystemIds,
        })
      : Promise.resolve([]),
  ])

  return {
    bounds,
    systems: toQuerySuccess(systems),
    batchSystems: toQuerySuccess(batchSystems),
    sampling: toQuerySuccess(sampling),
    growthTrend: toQuerySuccess(growthTrend),
  }
}

export async function getSamplingPageInitialData(params: { farmId: string | null; filters: SamplingPageFilters }) {
  const { accessToken } = await requireUserContext()
  return loadSamplingPageInitialData(createAccessTokenClient(accessToken), params)
}

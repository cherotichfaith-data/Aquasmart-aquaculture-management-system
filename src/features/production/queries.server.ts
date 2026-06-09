import { toQuerySuccess } from "@/lib/api/_utils"
import { createAccessTokenClient } from "@/lib/supabase/server"
import { requireUserContext } from "@/lib/supabase/require-user"
import {
  getScopedBatchSystems,
  getScopedSystemOptions,
  getScopedTimeBounds,
  parseSelectedNumericId,
} from "@/features/shared/scoped-analytics.server"
import { listProductionSummaryRows } from "@/features/shared/query-seed.server"
import { normalizeStageFilter } from "@/lib/stage-filter"
import { resolveSystemIdFromFilterValue } from "@/lib/system-options"
import type { Database, Enums } from "@/lib/types/database"
import { resolveTimePeriod, type TimeBounds, type TimePeriod } from "@/lib/time-period"

export type ProductionPageFilters = {
  selectedBatch: string
  selectedSystem: string
  selectedStage: "all" | Enums<"system_growth_stage">
  timePeriod: TimePeriod
}

export type ProductionPageInitialData = {
  bounds: TimeBounds
  systems: ReturnType<typeof toQuerySuccess<Database["public"]["Functions"]["api_system_options_rpc"]["Returns"][number]>>
  batchSystems: ReturnType<typeof toQuerySuccess<{ system_id: number }>>
  productionSummary: ReturnType<typeof toQuerySuccess<Database["public"]["Functions"]["api_production_summary"]["Returns"][number]>>
}

const DEFAULT_TIME_PERIOD: ProductionPageFilters["timePeriod"] = "quarter"
export function parseProductionPageFilters(
  searchParams?: Record<string, string | string[] | undefined>,
): ProductionPageFilters {
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

async function loadProductionPageInitialData(
  supabase: ReturnType<typeof createAccessTokenClient>,
  params: { farmId: string | null; filters: ProductionPageFilters },
): Promise<ProductionPageInitialData> {
  const empty: ProductionPageInitialData = {
    bounds: { start: null, end: null },
    systems: toQuerySuccess([]),
    batchSystems: toQuerySuccess([]),
    productionSummary: toQuerySuccess([]),
  }

  if (!params.farmId) return empty

  const batchId = parseSelectedNumericId(params.filters.selectedBatch)
  const [systems, batchSystems] = await Promise.all([
    getScopedSystemOptions(supabase, params.farmId, params.filters.selectedStage),
    getScopedBatchSystems(supabase, batchId),
  ])
  const systemId = resolveSystemIdFromFilterValue(params.filters.selectedSystem, systems)
  const bounds = await getScopedTimeBounds(supabase, params.farmId, params.filters.timePeriod, "production", systemId)

  if (!bounds.start || !bounds.end) {
    return {
      ...empty,
      bounds,
      systems: toQuerySuccess(systems),
      batchSystems: toQuerySuccess(batchSystems),
    }
  }

  const productionSummary = await listProductionSummaryRows(supabase, {
    farmId: params.farmId,
    systemId,
    stage: params.filters.selectedStage === "all" ? undefined : params.filters.selectedStage,
    dateFrom: bounds.start,
    dateTo: bounds.end,
    limit: 2500,
  })

  return {
    bounds,
    systems: toQuerySuccess(systems),
    batchSystems: toQuerySuccess(batchSystems),
    productionSummary: toQuerySuccess(productionSummary),
  }
}

export async function getProductionPageInitialData(params: {
  farmId: string | null
  filters: ProductionPageFilters
}) {
  const { accessToken } = await requireUserContext()

  return loadProductionPageInitialData(createAccessTokenClient(accessToken), params)
}

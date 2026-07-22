import { toQuerySuccess } from "@/lib/supabase/query-transport"
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
import { parseCustomPeriodUrlValue, resolveTimePeriod, type CustomTimeRange, type TimeBounds, type TimePeriod } from "@/lib/time-period"

export type ProductionPageFilters = {
  selectedBatch: string
  selectedSystem: string
  selectedStage: "all" | Enums<"system_growth_stage">
  timePeriod: TimePeriod
  customTimeRange: CustomTimeRange | null
}

export type ProductionPageInitialData = {
  bounds: TimeBounds
  systems: ReturnType<typeof toQuerySuccess<Database["public"]["Functions"]["api_system_options_rpc"]["Returns"][number]>>
  batchSystems: ReturnType<typeof toQuerySuccess<{ system_id: number }>>
  productionSummary: ReturnType<typeof toQuerySuccess<Database["public"]["Functions"]["api_production_summary"]["Returns"][number]>>
  /** System the page will render: URL `?system=` when valid, else lowest-id system. */
  systemId: number | null
}

const DEFAULT_TIME_PERIOD: ProductionPageFilters["timePeriod"] = "month"
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
    customTimeRange: parseCustomPeriodUrlValue(timePeriodRaw),
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
    systemId: null,
  }

  if (!params.farmId) return empty

  const batchId = parseSelectedNumericId(params.filters.selectedBatch)
  // Active cages only — same source as the shared header's cage filter.
  const [systems, batchSystems] = await Promise.all([
    getScopedSystemOptions(supabase, params.farmId, params.filters.selectedStage, true),
    getScopedBatchSystems(supabase, batchId),
  ])
  // The page renders one system at a time; default to the lowest-id system
  // when the URL doesn't name a valid one (mirrors the client's fallback).
  const resolvedSystemId =
    resolveSystemIdFromFilterValue(params.filters.selectedSystem, systems) ??
    (systems.length > 0 ? systems.reduce((low, s) => (s.id < low.id ? s : low)).id : null)
  const systemId = resolvedSystemId ?? undefined
  const bounds = await getScopedTimeBounds(
    supabase,
    params.farmId,
    params.filters.timePeriod,
    "production",
    systemId,
    batchId,
    params.filters.customTimeRange,
  )

  if (!bounds.start || !bounds.end) {
    return {
      ...empty,
      bounds,
      systems: toQuerySuccess(systems),
      batchSystems: toQuerySuccess(batchSystems),
      systemId: resolvedSystemId ?? null,
    }
  }

  const productionSummary = await listProductionSummaryRows(supabase, {
    farmId: params.farmId,
    systemId,
    dateFrom: bounds.start,
    dateTo: bounds.end,
    limit: 2500,
  })

  return {
    bounds,
    systems: toQuerySuccess(systems),
    batchSystems: toQuerySuccess(batchSystems),
    productionSummary: toQuerySuccess(productionSummary),
    systemId: resolvedSystemId ?? null,
  }
}

export async function getProductionPageInitialData(params: {
  farmId: string | null
  filters: ProductionPageFilters
}) {
  const { accessToken } = await requireUserContext()

  return loadProductionPageInitialData(createAccessTokenClient(accessToken), params)
}
// structure refactor: transport moved to lib/supabase/query-transport

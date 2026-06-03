import { toQuerySuccess } from "@/lib/api/_utils"
import { createAccessTokenClient } from "@/lib/supabase/server"
import { requireUserContext } from "@/lib/supabase/require-user"
import {
  getScopedBatchSystems,
  getScopedSystemOptions,
  getScopedTimeBounds,
  parseSelectedNumericId,
  resolveScopedSelectedSystemId,
} from "@/features/shared/scoped-analytics.server"
import { listDailyFishInventoryRows, listProductionSummaryRows } from "@/features/shared/query-seed.server"
import { normalizeStageFilter } from "@/lib/stage-filter"
import type { Database, Enums } from "@/lib/types/database"
import { isTimePeriod, type TimeBounds, type TimePeriod } from "@/lib/time-period"

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
  inventory: ReturnType<typeof toQuerySuccess<Database["public"]["Functions"]["api_daily_fish_inventory_rpc"]["Returns"][number]>>
}

const DEFAULT_TIME_PERIOD: ProductionPageFilters["timePeriod"] = "quarter"
export function parseProductionPageFilters(
  searchParams?: Record<string, string | string[] | undefined>,
): ProductionPageFilters {
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

async function loadProductionPageInitialData(
  supabase: ReturnType<typeof createAccessTokenClient>,
  params: { farmId: string | null; filters: ProductionPageFilters; includeInventory: boolean },
): Promise<ProductionPageInitialData> {
  const empty: ProductionPageInitialData = {
    bounds: { start: null, end: null },
    systems: toQuerySuccess([]),
    batchSystems: toQuerySuccess([]),
    productionSummary: toQuerySuccess([]),
    inventory: toQuerySuccess([]),
  }

  if (!params.farmId) return empty

  const batchId = parseSelectedNumericId(params.filters.selectedBatch)
  const [systems, batchSystems] = await Promise.all([
    getScopedSystemOptions(supabase, params.farmId, params.filters.selectedStage),
    getScopedBatchSystems(supabase, batchId),
  ])
  const systemId = resolveScopedSelectedSystemId(params.filters.selectedSystem, systems)
  const bounds = await getScopedTimeBounds(supabase, params.farmId, params.filters.timePeriod, "production", systemId)

  if (!bounds.start || !bounds.end) {
    return {
      ...empty,
      bounds,
      systems: toQuerySuccess(systems),
      batchSystems: toQuerySuccess(batchSystems),
    }
  }

  const [productionSummary, inventory] = await Promise.all([
    listProductionSummaryRows(supabase, {
      farmId: params.farmId,
      systemId,
      stage: params.filters.selectedStage === "all" ? undefined : params.filters.selectedStage,
      dateFrom: bounds.start,
      dateTo: bounds.end,
      limit: 2500,
    }),
    params.includeInventory
      ? listDailyFishInventoryRows(supabase, {
          farmId: params.farmId,
          systemId,
          stage: params.filters.selectedStage === "all" ? undefined : params.filters.selectedStage,
          dateFrom: bounds.start,
          dateTo: bounds.end,
          limit: 5000,
          orderAsc: true,
        })
      : Promise.resolve([]),
  ])

  return {
    bounds,
    systems: toQuerySuccess(systems),
    batchSystems: toQuerySuccess(batchSystems),
    productionSummary: toQuerySuccess(productionSummary),
    inventory: toQuerySuccess(inventory),
  }
}

export async function getProductionPageInitialData(params: {
  farmId: string | null
  filters: ProductionPageFilters
  includeInventory: boolean
}) {
  const { accessToken } = await requireUserContext()

  return loadProductionPageInitialData(createAccessTokenClient(accessToken), params)
}

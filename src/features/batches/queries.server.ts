import { createAccessTokenClient } from "@/lib/supabase/server"
import { isSbNetworkError, logSbError } from "@/lib/supabase/log"
import { getScopedTimeBounds } from "@/features/shared/scoped-analytics.server"
import { listGrowthTrend, listMortalityData } from "@/features/shared/queries.server"
import { listBatchOptionRows } from "@/features/shared/query-seed.server"
import { isMissingObjectError, toQuerySuccess } from "@/lib/supabase/query-transport"
import { normalizeStageFilter } from "@/lib/stage-filter"
import { parseCustomPeriodUrlValue, resolveTimePeriod, type TimeBounds } from "@/lib/time-period"
import type { RecommendedActionRow } from "@/lib/types/insights"
import type {
  BatchMortalityTotal,
  BatchStockingInfo,
  BatchesPageFilters,
  BatchesPageInitialData,
  DashboardBatchRpcRow,
} from "./types"

type ServerClient = ReturnType<typeof createAccessTokenClient>

function isSbStatementTimeout(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === "57014",
  )
}

async function withNetworkFallback<T>(
  tag: string,
  fallback: T,
  loader: () => Promise<T>,
  options?: { allowMissingObject?: boolean },
): Promise<T> {
  try {
    return await loader()
  } catch (error) {
    if (options?.allowMissingObject && isMissingObjectError(error)) {
      return fallback
    }
    if (!isSbNetworkError(error) && !isSbStatementTimeout(error)) throw error
    logSbError(tag, error)
    return fallback
  }
}

/**
 * The batch and stage filters are read from the same `batch` / `stage` params
 * the rest of the app uses. The shared `date` time-period param is honoured
 * too -- the lineage table and every chart/KPI here are scoped to the resolved
 * window, so the header's time-period selector drives them. With no `date`
 * param present we default to "all history" -- this page's original view.
 */
export function parseBatchesPageFilters(
  searchParams?: Record<string, string | string[] | undefined>,
): BatchesPageFilters {
  const selectedStageRaw = searchParams?.stage
  const selectedBatchRaw = searchParams?.batch
  const timePeriodRaw = searchParams?.date

  return {
    selectedStage: normalizeStageFilter(selectedStageRaw),
    selectedBatch: typeof selectedBatchRaw === "string" ? selectedBatchRaw : "all",
    timePeriod: resolveTimePeriod(timePeriodRaw, "all history"),
    customTimeRange: parseCustomPeriodUrlValue(timePeriodRaw),
  }
}

async function getTimeBounds(
  supabase: ServerClient,
  farmId: string,
  timePeriod: BatchesPageFilters["timePeriod"],
  batchId?: number,
  customTimeRange?: BatchesPageFilters["customTimeRange"],
): Promise<TimeBounds> {
  return withNetworkFallback(
    "batches:getTimeBounds",
    {
      start: null,
      end: null,
      anchorScope: null,
      latestAvailableDate: null,
      availableFromDate: null,
      requestedDays: 0,
      availableDays: 0,
      resolvedDays: 0,
      isTruncated: false,
      stalenessDays: null,
    },
    // Never scopes to a single system, but a selected batch narrows the window
    // to that batch's own data so the header's resolved range matches the page.
    () => getScopedTimeBounds(supabase, farmId, timePeriod, "dashboard", undefined, batchId, customTimeRange),
  )
}

async function getDashboardBatchRows(
  supabase: ServerClient,
  params: {
    farmId: string
    stage?: BatchesPageFilters["selectedStage"]
    batchId?: number
    dateFrom?: string
    dateTo?: string
  },
): Promise<DashboardBatchRpcRow[]> {
  const { data, error } = await supabase.rpc("api_dashboard_batches", {
    p_farm_id: params.farmId,
    p_batch_ids: params.batchId != null ? [params.batchId] : undefined,
    p_stage: params.stage && params.stage !== "all" ? params.stage : undefined,
    p_start_date: params.dateFrom ?? undefined,
    p_end_date: params.dateTo ?? undefined,
  })
  if (error) throw error
  return (data ?? []) as DashboardBatchRpcRow[]
}

async function getAlertRows(supabase: ServerClient, farmId: string): Promise<RecommendedActionRow[]> {
  const { data, error } = await supabase.rpc("api_recommended_actions", { p_farm_id: farmId })
  if (error) return []
  return (data ?? []) as RecommendedActionRow[]
}

async function getStockingByBatchId(
  supabase: ServerClient,
  params: { farmId: string; batchIds: number[] },
): Promise<Record<number, BatchStockingInfo>> {
  if (params.batchIds.length === 0) return {}

  const batchOptions = await withNetworkFallback(
    "batches:listBatchOptionRows",
    [],
    () => listBatchOptionRows(supabase, { farmId: params.farmId, activeOnly: false }),
    { allowMissingObject: true },
  )
  const bySelectedId = new Map(batchOptions.filter((row) => params.batchIds.includes(row.id)).map((row) => [row.id, row]))

  const supplierIds = Array.from(
    new Set(Array.from(bySelectedId.values()).map((row) => row.supplier_id).filter((id): id is number => id != null)),
  )
  const supplierNameById = new Map<number, string>()
  if (supplierIds.length > 0) {
    const { data, error } = await supabase.from("fingerling_supplier").select("id, company_name").in("id", supplierIds)
    if (!error) {
      for (const supplier of data ?? []) {
        supplierNameById.set(supplier.id, supplier.company_name)
      }
    }
  }

  const result: Record<number, BatchStockingInfo> = {}
  for (const batchId of params.batchIds) {
    const option = bySelectedId.get(batchId)
    result[batchId] = {
      dateOfDelivery: option?.date_of_delivery ?? null,
      numberOfFish: option?.number_of_fish ?? null,
      abw: option?.abw ?? null,
      supplierName: option?.supplier_id != null ? supplierNameById.get(option.supplier_id) ?? null : null,
    }
  }
  return result
}

function bucketMortalityByBatch(
  rows: Array<{ system_id: number | null; number_of_fish_mortality: number | null }>,
  systemIdToBatchId: Record<number, number>,
): BatchMortalityTotal[] {
  const totals = new Map<number, number>()
  for (const row of rows) {
    if (typeof row.system_id !== "number") continue
    const batchId = systemIdToBatchId[row.system_id]
    if (batchId == null) continue
    totals.set(batchId, (totals.get(batchId) ?? 0) + (row.number_of_fish_mortality ?? 0))
  }
  return Array.from(totals.entries()).map(([batch_id, total]) => ({ batch_id, total }))
}

function buildSystemIdToBatchId(batches: DashboardBatchRpcRow[]): Record<number, number> {
  const map: Record<number, number> = {}
  for (const batch of batches) {
    for (const systemId of batch.system_ids ?? []) {
      if (typeof systemId === "number") map[systemId] = batch.batch_id
    }
  }
  return map
}

function buildEmptyBatchesPageInitialData(): BatchesPageInitialData {
  return {
    bounds: { start: null, end: null },
    batches: toQuerySuccess([]),
    growthSeries: [],
    mortalityByBatch: [],
    alerts: [],
    systemIdToBatchId: {},
    stockingByBatchId: {},
  }
}

async function loadBatchesPageInitialData(
  supabase: ServerClient,
  params: { farmId: string | null; filters: BatchesPageFilters },
): Promise<BatchesPageInitialData> {
  if (!params.farmId) return buildEmptyBatchesPageInitialData()
  const farmId = params.farmId

  const selectedBatchId =
    params.filters.selectedBatch !== "all" && Number.isFinite(Number(params.filters.selectedBatch))
      ? Number(params.filters.selectedBatch)
      : undefined

  const bounds = await getTimeBounds(
    supabase,
    farmId,
    params.filters.timePeriod,
    selectedBatchId,
    params.filters.customTimeRange,
  )
  if (!bounds.start || !bounds.end) {
    return { ...buildEmptyBatchesPageInitialData(), bounds }
  }
  const dateFrom = bounds.start
  const dateTo = bounds.end

  const batchRows = await withNetworkFallback(
    "batches:getDashboardBatchRows",
    [] as DashboardBatchRpcRow[],
    () =>
      getDashboardBatchRows(supabase, {
        farmId,
        stage: params.filters.selectedStage,
        batchId: selectedBatchId,
        dateFrom,
        dateTo,
      }),
    { allowMissingObject: true },
  )

  const systemIdToBatchId = buildSystemIdToBatchId(batchRows)
  const allSystemIds = Array.from(new Set(Object.keys(systemIdToBatchId).map(Number)))
  const batchIds = batchRows.map((row) => row.batch_id)

  const [growthSeries, mortalityRows, alerts, stockingByBatchId] = await Promise.all([
    allSystemIds.length
      ? listGrowthTrend(supabase, { farmId, systemIds: allSystemIds, dateFrom, dateTo })
      : Promise.resolve([]),
    allSystemIds.length
      ? listMortalityData(supabase, { farmId, systemIds: allSystemIds, dateFrom, dateTo })
      : Promise.resolve([]),
    getAlertRows(supabase, farmId),
    getStockingByBatchId(supabase, { farmId, batchIds }),
  ])

  return {
    bounds,
    batches: toQuerySuccess(batchRows),
    growthSeries,
    mortalityByBatch: bucketMortalityByBatch(mortalityRows, systemIdToBatchId),
    alerts,
    systemIdToBatchId,
    stockingByBatchId,
  }
}

export async function getBatchesPageInitialData(params: {
  farmId: string | null
  filters: BatchesPageFilters
  accessToken: string
}): Promise<BatchesPageInitialData> {
  return loadBatchesPageInitialData(createAccessTokenClient(params.accessToken), params)
}

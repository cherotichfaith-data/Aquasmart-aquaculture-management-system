import type { Database } from "@/lib/types/database"
import type { TimeBounds } from "@/lib/time-period"
import { createAccessTokenClient } from "@/lib/supabase/server"
import { isSbNetworkError, logSbError } from "@/lib/supabase/log"
import {
  getScopedBatchSystems,
  getScopedSystemOptions,
  getScopedTimeBounds,
} from "@/features/shared/scoped-analytics.server"
import type {
  DashboardPageInitialData,
  DashboardPageInitialFilters,
} from "./types"
import type { RecommendedActionRow } from "@/lib/types/insights"
import { isMissingObjectError, toQuerySuccess } from "@/lib/supabase/query-transport"
import { normalizeStageFilter } from "@/lib/stage-filter"
import { resolveSystemIdFromFilterValue } from "@/lib/system-options"
import { parseCustomPeriodUrlValue, resolveTimePeriod } from "@/lib/time-period"
import { buildKpiOverviewFromRpc, mergeRecommendedActionRows } from "./analytics-rpc-shared"
import { listDashboardSystemsRows, listWaterQualityMeasurementRows } from "@/features/shared/query-seed.server"
import { toRpcDate, toRpcSystemId, toRpcSystemIds } from "@/lib/rpc-params"

type ServerClient = ReturnType<typeof createAccessTokenClient>
type DashboardConsolidatedRow = Database["public"]["Functions"]["api_dashboard_consolidated"]["Returns"][number]
const DEFAULT_TIME_PERIOD: DashboardPageInitialFilters["timePeriod"] = "month"

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

export function parseDashboardPageFilters(
  searchParams?: Record<string, string | string[] | undefined>,
): DashboardPageInitialFilters {
  const selectedBatchRaw = searchParams?.batch
  const selectedSystemRaw = searchParams?.cage ?? searchParams?.system
  const selectedStageRaw = searchParams?.stage
  const timePeriodRaw = searchParams?.date

  const selectedBatch = typeof selectedBatchRaw === "string" ? selectedBatchRaw : "all"
  const selectedSystem = typeof selectedSystemRaw === "string" ? selectedSystemRaw : "all"
  const selectedStage = normalizeStageFilter(selectedStageRaw)
  const timePeriod = resolveTimePeriod(timePeriodRaw, DEFAULT_TIME_PERIOD)

  return {
    selectedBatch,
    selectedSystem,
    selectedStage,
    timePeriod,
    customTimeRange: parseCustomPeriodUrlValue(timePeriodRaw),
  }
}

async function getTimeBounds(
  supabase: ServerClient,
  farmId: string,
  timePeriod: DashboardPageInitialFilters["timePeriod"],
  systemId?: number,
  batchId?: number,
  customTimeRange?: DashboardPageInitialFilters["customTimeRange"],
): Promise<TimeBounds> {
  return withNetworkFallback(
    "dashboard:getTimeBounds",
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
    () => getScopedTimeBounds(supabase, farmId, timePeriod, "dashboard", systemId, batchId, customTimeRange),
  )
}

async function getBatchSystemIds(supabase: ServerClient, batchId?: number): Promise<number[]> {
  const rows = await getScopedBatchSystems(supabase, batchId)
  return rows.map((row) => row.system_id)
}

async function getDashboardConsolidatedRows(
  supabase: ServerClient,
  params: {
    farmId: string
    stage?: DashboardPageInitialFilters["selectedStage"]
    systemIds?: number[]
    timePeriod?: DashboardPageInitialFilters["timePeriod"]
    dateFrom?: string | null
    dateTo?: string | null
  },
): Promise<DashboardConsolidatedRow[]> {
  const { data, error } = await supabase.rpc("api_dashboard_consolidated", {
    p_farm_id: params.farmId,
    p_system_ids: toRpcSystemIds(params.systemIds),
    p_stage: params.stage && params.stage !== "all" ? params.stage : undefined,
    p_start_date: toRpcDate(params.dateFrom),
    p_end_date: toRpcDate(params.dateTo),
    p_time_period: params.timePeriod ?? undefined,
  } as Database["public"]["Functions"]["api_dashboard_consolidated"]["Args"] & {
    p_system_ids: number[] | null
    p_start_date: string | null
    p_end_date: string | null
  })

  if (error) {
    throw error
  }

  return (data ?? []) as DashboardConsolidatedRow[]
}

async function getRecommendedActionRows(
  supabase: ServerClient,
  params: { farmId: string; systemId?: number; systemIds?: number[] },
): Promise<RecommendedActionRow[]> {
  const { data, error } = await supabase.rpc("api_recommended_actions", {
    p_farm_id: params.farmId,
    p_system_id: toRpcSystemId(params.systemId),
  } as Database["public"]["Functions"]["api_recommended_actions"]["Args"] & { p_system_id: number | null })

  if (error) {
    throw error
  }

  const rows = (data ?? []) as RecommendedActionRow[]
  const scopedSystemIds =
    params.systemIds?.filter((systemId): systemId is number => typeof systemId === "number" && Number.isFinite(systemId)) ?? null
  if (!scopedSystemIds || scopedSystemIds.length === 0) return rows

  return rows.filter(
    (row) => typeof row === "object" && row !== null && "system_id" in row && scopedSystemIds.includes((row as { system_id: number }).system_id),
  )
}

function buildKpiOverview(params: {
  scopedSystemIds: number[]
  consolidatedRows: DashboardConsolidatedRow[]
  dateFrom: string
  dateTo: string
}): DashboardPageInitialData["kpiOverview"] {
  const scopedSystemIds =
    params.scopedSystemIds.length > 0
      ? params.scopedSystemIds
      : Array.from(
          new Set(
            params.consolidatedRows
              .map((row) => row.system_id)
              .filter((systemId): systemId is number => typeof systemId === "number" && Number.isFinite(systemId)),
          ),
        )

  if (!scopedSystemIds.length) {
    return { metrics: [], dateBounds: { start: params.dateFrom, end: params.dateTo } }
  }

  return buildKpiOverviewFromRpc({
    scopedSystemIds,
    consolidatedRows: params.consolidatedRows,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  })
}

function buildEmptyDashboardPageInitialData(): DashboardPageInitialData {
  return {
    bounds: { start: null, end: null },
    systemOptions: toQuerySuccess([]),
    batchSystems: toQuerySuccess([]),
    kpiOverview: { metrics: [], dateBounds: { start: null, end: null } },
    systemsTable: { rows: [], meta: { reason: "Missing time bounds", start: null, end: null } },
    waterQualityMeasurements: toQuerySuccess([]),
    recommendedActions: [],
  }
}

async function loadDashboardPageInitialData(
  supabase: ServerClient,
  params: {
    farmId: string | null
    filters: DashboardPageInitialFilters
  },
): Promise<DashboardPageInitialData> {
  const empty = buildEmptyDashboardPageInitialData()
  if (!params.farmId) return empty
  const farmId = params.farmId

  const selectedSystemId = await withNetworkFallback("dashboard:resolveActiveSystemId", undefined, async () => {
    if (!params.filters.selectedSystem || params.filters.selectedSystem === "all") return undefined
    const systems = await getScopedSystemOptions(supabase, farmId, "all")
    const systemId = resolveSystemIdFromFilterValue(params.filters.selectedSystem, systems)
    return systemId && Number.isFinite(systemId) ? systemId : undefined
  })
  const effectiveSelectedSystem = selectedSystemId != null ? String(selectedSystemId) : "all"
  const batchId =
    params.filters.selectedBatch !== "all" && Number.isFinite(Number(params.filters.selectedBatch))
      ? Number(params.filters.selectedBatch)
      : undefined
  const bounds = await getTimeBounds(
    supabase,
    farmId,
    params.filters.timePeriod,
    selectedSystemId,
    batchId,
    params.filters.customTimeRange,
  )
  if (!bounds.start || !bounds.end) {
    return {
      ...empty,
      bounds,
      systemOptions: toQuerySuccess(
        await withNetworkFallback("dashboard:getScopedSystemOptions:missing-bounds", [], () =>
          getScopedSystemOptions(supabase, farmId, params.filters.selectedStage),
        ),
      ),
      batchSystems: toQuerySuccess(
        await withNetworkFallback("dashboard:getScopedBatchSystems:missing-bounds", [], () =>
          getScopedBatchSystems(
            supabase,
            params.filters.selectedBatch !== "all" ? Number(params.filters.selectedBatch) : undefined,
          ),
        ),
      ),
      kpiOverview: { metrics: [], dateBounds: bounds },
      systemsTable: { rows: [], meta: { reason: "Missing time bounds", start: bounds.start, end: bounds.end } },
    }
  }

  const startDate = bounds.start!
  const endDate = bounds.end!

  const [systemOptions, batchSystems] = await Promise.all([
    withNetworkFallback("dashboard:getScopedSystemOptions", [], () =>
      getScopedSystemOptions(supabase, farmId, params.filters.selectedStage),
    ),
    withNetworkFallback("dashboard:getScopedBatchSystems", [], () => getScopedBatchSystems(supabase, batchId)),
  ])
  const dashboardSystemIds = systemOptions
    .map((row) => row.id)
    .filter((id): id is number => typeof id === "number" && Number.isFinite(id))
  const batchScopedIds =
    params.filters.selectedBatch !== "all"
      ? new Set((await getBatchSystemIds(supabase, batchId)).filter((id) => dashboardSystemIds.includes(id)))
      : null
  const stageBatchScopedIds = batchScopedIds
    ? dashboardSystemIds.filter((id) => batchScopedIds.has(id))
    : dashboardSystemIds
  const activeScopedSystemIds =
    selectedSystemId != null
      ? stageBatchScopedIds.includes(selectedSystemId)
        ? [selectedSystemId]
        : []
      : stageBatchScopedIds

  const singleSystemId = activeScopedSystemIds.length === 1 ? activeScopedSystemIds[0] : undefined
  const [consolidatedRows, recommendedActionRows, waterQualityMeasurements, systemsTableRows] =
    await Promise.all([
      withNetworkFallback(
        "dashboard:getDashboardConsolidatedRows",
        [],
        () =>
          getDashboardConsolidatedRows(supabase, {
            farmId,
            stage: params.filters.selectedStage,
            systemIds: activeScopedSystemIds,
            timePeriod: params.filters.timePeriod,
            dateFrom: startDate,
            dateTo: endDate,
          }),
        { allowMissingObject: true },
      ),
      withNetworkFallback<RecommendedActionRow[]>(
        "dashboard:getRecommendedActionRows",
        [],
        async () => {
          if (activeScopedSystemIds.length === 0) return []
          return getRecommendedActionRows(supabase, {
            farmId,
            systemId: singleSystemId,
            systemIds: activeScopedSystemIds,
          })
        },
        { allowMissingObject: true },
      ),
      withNetworkFallback("dashboard:getWaterQualityMeasurements", [], () =>
        listWaterQualityMeasurementRows(supabase, {
          farmId,
          systemId: singleSystemId,
          dateFrom: startDate,
          dateTo: endDate,
          limit: 2000,
        }),
      ),
      withNetworkFallback("dashboard:listDashboardSystemsRows", [], () =>
        listDashboardSystemsRows(supabase, {
          farmId,
          systemIds: activeScopedSystemIds,
          stage: params.filters.selectedStage === "all" ? undefined : params.filters.selectedStage,
          dateFrom: startDate,
          dateTo: endDate,
        }),
      ),
    ])

  if (process.env.NEXT_PUBLIC_DEBUG === "true") {
    console.debug("[dashboard][server]", {
      farmId,
      dateFrom: startDate,
      dateTo: endDate,
      selectedStage: params.filters.selectedStage,
      selectedBatch: params.filters.selectedBatch,
      selectedSystem: effectiveSelectedSystem,
      scopedSystemIds: activeScopedSystemIds,
      systemsTableRowsCount: systemsTableRows.length,
    })
  }

  return {
    bounds,
    systemOptions: toQuerySuccess(systemOptions),
    batchSystems: toQuerySuccess(batchSystems),
    kpiOverview: buildKpiOverview({
      scopedSystemIds: activeScopedSystemIds,
      consolidatedRows,
      dateFrom: startDate,
      dateTo: endDate,
    }),
    systemsTable: {
      rows: systemsTableRows,
      meta: {
        source: "api_dashboard_systems",
        start: startDate,
        end: endDate,
        reason: activeScopedSystemIds.length === 0 ? "No scoped systems" : undefined,
      },
    },
    waterQualityMeasurements: toQuerySuccess(waterQualityMeasurements),
    recommendedActions: mergeRecommendedActionRows(recommendedActionRows),
  }
}

export async function getDashboardPageInitialData(params: {
  farmId: string | null
  filters: DashboardPageInitialFilters
  accessToken: string
}): Promise<DashboardPageInitialData> {
  return loadDashboardPageInitialData(createAccessTokenClient(params.accessToken), params)
}

/**
 * Same bounds/systemOptions/batchSystems/systemsTable computation as
 * loadDashboardPageInitialData above, minus the dashboard-only KPI/water-
 * quality/recommended-actions fetches -- used by the Systems (Cages) page,
 * which only needs the table itself and layers its own growth/mortality/
 * water-quality queries on top separately.
 */
export async function loadSystemsTableData(
  supabase: ServerClient,
  params: {
    farmId: string | null
    filters: DashboardPageInitialFilters
  },
): Promise<{
  bounds: TimeBounds
  systemOptions: DashboardPageInitialData["systemOptions"]
  batchSystems: DashboardPageInitialData["batchSystems"]
  systemsTable: DashboardPageInitialData["systemsTable"]
}> {
  const emptyBounds: TimeBounds = {
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
  }
  if (!params.farmId) {
    return {
      bounds: emptyBounds,
      systemOptions: toQuerySuccess([]),
      batchSystems: toQuerySuccess([]),
      systemsTable: { rows: [], meta: { reason: "Missing time bounds", start: null, end: null } },
    }
  }
  const farmId = params.farmId

  const selectedSystemId = await withNetworkFallback("systems:resolveActiveSystemId", undefined, async () => {
    if (!params.filters.selectedSystem || params.filters.selectedSystem === "all") return undefined
    const systems = await getScopedSystemOptions(supabase, farmId, "all")
    const systemId = resolveSystemIdFromFilterValue(params.filters.selectedSystem, systems)
    return systemId && Number.isFinite(systemId) ? systemId : undefined
  })
  const batchId =
    params.filters.selectedBatch !== "all" && Number.isFinite(Number(params.filters.selectedBatch))
      ? Number(params.filters.selectedBatch)
      : undefined
  const bounds = await getTimeBounds(
    supabase,
    farmId,
    params.filters.timePeriod,
    selectedSystemId,
    batchId,
    params.filters.customTimeRange,
  )
  if (!bounds.start || !bounds.end) {
    return {
      bounds,
      systemOptions: toQuerySuccess(
        await withNetworkFallback("systems:getScopedSystemOptions:missing-bounds", [], () =>
          getScopedSystemOptions(supabase, farmId, params.filters.selectedStage),
        ),
      ),
      batchSystems: toQuerySuccess(
        await withNetworkFallback("systems:getScopedBatchSystems:missing-bounds", [], () =>
          getScopedBatchSystems(
            supabase,
            params.filters.selectedBatch !== "all" ? Number(params.filters.selectedBatch) : undefined,
          ),
        ),
      ),
      systemsTable: { rows: [], meta: { reason: "Missing time bounds", start: bounds.start, end: bounds.end } },
    }
  }

  const startDate = bounds.start!
  const endDate = bounds.end!

  const [systemOptions, batchSystems] = await Promise.all([
    withNetworkFallback("systems:getScopedSystemOptions", [], () =>
      getScopedSystemOptions(supabase, farmId, params.filters.selectedStage),
    ),
    withNetworkFallback("systems:getScopedBatchSystems", [], () => getScopedBatchSystems(supabase, batchId)),
  ])
  const dashboardSystemIds = systemOptions
    .map((row) => row.id)
    .filter((id): id is number => typeof id === "number" && Number.isFinite(id))
  const batchScopedIds =
    params.filters.selectedBatch !== "all"
      ? new Set((await getBatchSystemIds(supabase, batchId)).filter((id) => dashboardSystemIds.includes(id)))
      : null
  const stageBatchScopedIds = batchScopedIds
    ? dashboardSystemIds.filter((id) => batchScopedIds.has(id))
    : dashboardSystemIds
  const activeScopedSystemIds =
    selectedSystemId != null
      ? stageBatchScopedIds.includes(selectedSystemId)
        ? [selectedSystemId]
        : []
      : stageBatchScopedIds

  const systemsTableRows = await withNetworkFallback("systems:listDashboardSystemsRows", [], () =>
    listDashboardSystemsRows(supabase, {
      farmId,
      systemIds: activeScopedSystemIds,
      stage: params.filters.selectedStage === "all" ? undefined : params.filters.selectedStage,
      dateFrom: startDate,
      dateTo: endDate,
    }),
  )

  return {
    bounds,
    systemOptions: toQuerySuccess(systemOptions),
    batchSystems: toQuerySuccess(batchSystems),
    systemsTable: {
      rows: systemsTableRows,
      meta: {
        source: "api_dashboard_systems",
        start: startDate,
        end: endDate,
        reason: activeScopedSystemIds.length === 0 ? "No scoped systems" : undefined,
      },
    },
  }
}

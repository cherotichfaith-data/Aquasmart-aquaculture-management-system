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
  DashboardSystemRow,
} from "./types"
import type { RecommendedActionRow } from "@/lib/types/insights"
import { isMissingObjectError, toQuerySuccess } from "@/lib/api/_utils"
import { normalizeStageFilter } from "@/lib/stage-filter"
import { resolveSystemIdFromFilterValue } from "@/lib/system-options"
import { resolveTimePeriod, type TimePeriod } from "@/lib/time-period"
import { buildKpiOverviewFromRpc, mergeRecommendedActionRows } from "./analytics-rpc-shared"
import { listWaterQualityMeasurementRows } from "@/features/shared/query-seed.server"
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
  const timePeriodRaw = searchParams?.period

  const selectedBatch = typeof selectedBatchRaw === "string" ? selectedBatchRaw : "all"
  const selectedSystem = typeof selectedSystemRaw === "string" ? selectedSystemRaw : "all"
  const selectedStage = normalizeStageFilter(selectedStageRaw)
  const timePeriod = resolveTimePeriod(timePeriodRaw, DEFAULT_TIME_PERIOD)

  return {
    selectedBatch,
    selectedSystem,
    selectedStage,
    timePeriod,
  }
}

async function getTimeBounds(
  supabase: ServerClient,
  farmId: string,
  timePeriod: DashboardPageInitialFilters["timePeriod"],
  systemId?: number,
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
    () => getScopedTimeBounds(supabase, farmId, timePeriod, "dashboard", systemId),
  )
}

async function getDashboardSystemsRaw(
  supabase: ServerClient,
  params: {
    farmId: string
    stage?: DashboardPageInitialFilters["selectedStage"]
    systemId?: number
    dateFrom?: string | null
    dateTo?: string | null
  },
): Promise<DashboardSystemRow[]> {
  const { data, error } = await supabase.rpc("api_dashboard_systems", {
    p_farm_id: params.farmId,
    p_stage: params.stage && params.stage !== "all" ? params.stage : undefined,
    p_system_id: params.systemId,
    p_start_date: params.dateFrom ?? undefined,
    p_end_date: params.dateTo ?? undefined,
  })

  if (error) {
    throw error
  }

  return (data ?? []) as DashboardSystemRow[]
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
    systemId?: number
    dateFrom?: string | null
    dateTo?: string | null
  },
): Promise<DashboardConsolidatedRow[]> {
  const { data, error } = await supabase.rpc("api_dashboard_consolidated", {
    p_farm_id: params.farmId,
    p_system_id: params.systemId,
    p_stage: params.stage && params.stage !== "all" ? params.stage : undefined,
    p_start_date: params.dateFrom ?? undefined,
    p_end_date: params.dateTo ?? undefined,
  })

  if (error) {
    throw error
  }

  return (data ?? []) as DashboardConsolidatedRow[]
}

async function getRecommendedActionRows(
  supabase: ServerClient,
  params: { farmId: string; systemId?: number },
): Promise<RecommendedActionRow[]> {
  const { data, error } = await supabase.rpc("api_recommended_actions", {
    p_farm_id: params.farmId,
    p_system_id: params.systemId,
  })

  if (error) {
    throw error
  }

  return (data ?? []) as RecommendedActionRow[]
}

function buildKpiOverview(params: {
  scopedSystemIds: number[]
  consolidatedRows: DashboardConsolidatedRow[]
  dateFrom: string
  dateTo: string
}): DashboardPageInitialData["kpiOverview"] {
  return buildKpiOverviewFromRpc({
    scopedSystemIds: params.scopedSystemIds,
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
}): Promise<DashboardPageInitialData> {
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
  const bounds = await getTimeBounds(supabase, farmId, params.filters.timePeriod)
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

  const batchId =
    params.filters.selectedBatch !== "all" && Number.isFinite(Number(params.filters.selectedBatch))
      ? Number(params.filters.selectedBatch)
      : undefined
  const startDate = bounds.start!
  const endDate = bounds.end!

  const [systemOptions, batchSystems, dashboardSystemsRaw] = await Promise.all([
    withNetworkFallback("dashboard:getScopedSystemOptions", [], () =>
      getScopedSystemOptions(supabase, farmId, params.filters.selectedStage),
    ),
    withNetworkFallback("dashboard:getScopedBatchSystems", [], () => getScopedBatchSystems(supabase, batchId)),
    withNetworkFallback(
      "dashboard:getDashboardSystemsRaw",
      [],
      () =>
        getDashboardSystemsRaw(supabase, {
          farmId,
          stage: params.filters.selectedStage,
          systemId: selectedSystemId,
          dateFrom: startDate,
          dateTo: endDate,
        }),
      { allowMissingObject: true },
    ),
  ])
  const dashboardSystems = dashboardSystemsRaw
  const dashboardSystemIds = dashboardSystems
    .map((row) => row.system_id)
    .filter((id): id is number => typeof id === "number" && Number.isFinite(id))
  const batchScopedIds =
    params.filters.selectedBatch !== "all"
      ? new Set(batchSystems.map((row) => row.system_id))
      : null
  const activeScopedSystemIds = batchScopedIds
    ? dashboardSystemIds.filter((id) => batchScopedIds.has(id))
    : dashboardSystemIds

  const singleSystemId = activeScopedSystemIds.length === 1 ? activeScopedSystemIds[0] : undefined
  const [consolidatedRows, recommendedActionRows, waterQualityMeasurements] =
    await Promise.all([
      withNetworkFallback(
        "dashboard:getDashboardConsolidatedRows",
        [],
        () =>
          getDashboardConsolidatedRows(supabase, {
            farmId,
            stage: params.filters.selectedStage,
            systemId: singleSystemId,
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
          return getRecommendedActionRows(supabase, { farmId, systemId: singleSystemId })
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
    ])

  const systemsTableRows = dashboardSystems.filter((row) => {
    if (!activeScopedSystemIds.includes(row.system_id)) return false
    return true
  })

  if (process.env.NEXT_PUBLIC_DEBUG === "true") {
    console.debug("[dashboard][server]", {
      farmId,
      dateFrom: startDate,
      dateTo: endDate,
    selectedStage: params.filters.selectedStage,
    selectedBatch: params.filters.selectedBatch,
    selectedSystem: effectiveSelectedSystem,
      scopedSystemIds: activeScopedSystemIds,
      dashboardSystemsCount: dashboardSystems.length,
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

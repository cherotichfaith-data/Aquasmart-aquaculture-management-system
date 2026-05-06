import type { Database } from "@/lib/types/database"
import type { TimeBounds } from "@/lib/time-period"
import { sortByDateAsc } from "@/lib/utils"
import { runServerReadThrough } from "@/lib/cache/server"
import { cacheTags } from "@/lib/cache/tags"
import { createAccessTokenClient } from "@/lib/supabase/server"
import { requireUserContext } from "@/lib/supabase/require-user"
import { isSbNetworkError, logSbError } from "@/lib/supabase/log"
import {
  getScopedBatchSystems,
  getScopedSystemOptions,
  getScopedTimeBounds,
  parseSelectedNumericId,
} from "@/features/shared/scoped-analytics.server"
import {
  listAlertThresholdRows,
} from "@/features/shared/query-seed.server"
import type {
  DashboardPageInitialData,
  DashboardPageInitialFilters,
  DashboardSystemRow,
  ProductionTrendRpcRow,
  ProductionTrendRow,
} from "./types"
import { isMissingObjectError, toQuerySuccess } from "@/lib/api/_utils"
import { normalizeStageFilter } from "@/lib/stage-filter"
import { isTimePeriod, type TimePeriod } from "@/lib/time-period"
import { buildKpiOverviewFromRpc, mergeRecommendedActionRows } from "./analytics-rpc-shared"
import { toProductionTrendRows } from "./production-trend"
type ServerClient = ReturnType<typeof createAccessTokenClient>
type DashboardConsolidatedRow = Database["public"]["Functions"]["api_dashboard_consolidated"]["Returns"][number]
type KpiCoverageRow = Database["public"]["Functions"]["api_kpi_coverage"]["Returns"][number]
type RecommendedActionRow = Database["public"]["Functions"]["api_recommended_actions"]["Returns"][number]
type AlertThresholdRow = Database["public"]["Views"]["api_alert_thresholds"]["Row"]
type WaterQualityMeasurementRow = Database["public"]["Views"]["api_water_quality_measurements"]["Row"]
const DEFAULT_TIME_PERIOD: DashboardPageInitialFilters["timePeriod"] = "month"

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
    if (!isSbNetworkError(error)) throw error
    logSbError(tag, error)
    return fallback
  }
}

export function parseDashboardPageFilters(
  searchParams?: Record<string, string | string[] | undefined>,
): DashboardPageInitialFilters {
  const selectedBatchRaw = searchParams?.batch
  const selectedSystemRaw = searchParams?.system
  const selectedStageRaw = searchParams?.stage
  const timePeriodRaw = searchParams?.period

  const selectedBatch = typeof selectedBatchRaw === "string" ? selectedBatchRaw : "all"
  const selectedSystem = typeof selectedSystemRaw === "string" ? selectedSystemRaw : "all"
  const selectedStage = normalizeStageFilter(selectedStageRaw)
  const timePeriod =
    typeof timePeriodRaw === "string" && isTimePeriod(timePeriodRaw)
      ? (timePeriodRaw as TimePeriod)
      : DEFAULT_TIME_PERIOD

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

async function getProductionSummaryRows(
  supabase: ServerClient,
  params: {
    farmId: string
    systemId?: number
    dateFrom?: string | null
    dateTo?: string | null
  },
): Promise<ProductionTrendRow[]> {
  const { data, error } = await supabase.rpc("api_production_summary", {
    p_farm_id: params.farmId,
    p_system_id: params.systemId,
    p_start_date: params.dateFrom ?? undefined,
    p_end_date: params.dateTo ?? undefined,
  })

  if (error) {
    throw error
  }

  return toProductionTrendRows((data ?? []) as ProductionTrendRpcRow[])
}

async function getWaterQualityMeasurements(
  supabase: ServerClient,
  params: {
    farmId: string
    systemId?: number
    dateFrom?: string | null
    dateTo?: string | null
    limit?: number
  },
): Promise<WaterQualityMeasurementRow[]> {
  let query = supabase
    .from("api_water_quality_measurements")
    .select("*")
    .eq("farm_id", params.farmId)
    .order("date", { ascending: true })
    .order("time", { ascending: true })

  if (params.systemId) query = query.eq("system_id", params.systemId)
  if (params.dateFrom) query = query.gte("date", params.dateFrom)
  if (params.dateTo) query = query.lte("date", params.dateTo)
  if (params.limit) query = query.limit(params.limit)

  const { data, error } = await query
  if (error) {
    throw error
  }

  return (data ?? []) as WaterQualityMeasurementRow[]
}

async function getDashboardConsolidatedRows(
  supabase: ServerClient,
  params: {
    farmId: string
    systemId?: number
    dateFrom?: string | null
    dateTo?: string | null
  },
): Promise<DashboardConsolidatedRow[]> {
  const { data, error } = await supabase.rpc("api_dashboard_consolidated", {
    p_farm_id: params.farmId,
    p_system_id: params.systemId,
    p_start_date: params.dateFrom ?? undefined,
    p_end_date: params.dateTo ?? undefined,
  })

  if (error) {
    throw error
  }

  return (data ?? []) as DashboardConsolidatedRow[]
}

async function getKpiCoverageRows(
  supabase: ServerClient,
  params: { farmId: string; dateFrom?: string | null; dateTo?: string | null },
): Promise<KpiCoverageRow[]> {
  const { data, error } = await supabase.rpc("api_kpi_coverage", {
    p_farm_id: params.farmId,
    ...(params.dateFrom ? { p_date_from: params.dateFrom } : {}),
    ...(params.dateTo   ? { p_date_to:   params.dateTo   } : {}),
  })
  if (error) {
    if (isMissingObjectError(error)) return []
    logSbError("dashboard:getKpiCoverageRows", error)
    return []
  }
  return (data ?? []) as KpiCoverageRow[]
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

async function resolveScopedSystemIds(params: {
  supabase: ServerClient
  system: string
  batch: string
  dashboardSystems: DashboardSystemRow[]
}): Promise<number[]> {
  let scoped = params.dashboardSystems
    .map((row) => row.system_id)
    .filter((id): id is number => typeof id === "number")

  if (params.system !== "all") {
    const parsed = Number(params.system)
    if (!Number.isFinite(parsed)) return []
    scoped = scoped.filter((id) => id === parsed)
  }

  if (params.batch !== "all") {
    const batchId = Number(params.batch)
    if (!Number.isFinite(batchId)) return []
    const batchIds = new Set(await getBatchSystemIds(params.supabase, batchId))
    scoped = scoped.filter((id) => batchIds.has(id))
  }

  return scoped
}

function buildKpiOverview(params: {
  scopedSystemIds: number[]
  consolidatedRows: DashboardConsolidatedRow[]
  systemRows: DashboardSystemRow[]
  coverageRows: KpiCoverageRow[]
  dateFrom: string
  dateTo: string
}): DashboardPageInitialData["kpiOverview"] {
  return buildKpiOverviewFromRpc({
    scopedSystemIds: params.scopedSystemIds,
    consolidatedRows: params.consolidatedRows,
    systemRows: params.systemRows,
    coverageRows: params.coverageRows,
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
    productionTrend: [],
    waterQualityMeasurements: toQuerySuccess([]),
    alertThresholds: toQuerySuccess([]),
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

  const selectedSystemId = parseSelectedNumericId(params.filters.selectedSystem)
  const bounds = await getTimeBounds(supabase, farmId, params.filters.timePeriod, selectedSystemId)
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
      alertThresholds: toQuerySuccess(
        await withNetworkFallback("dashboard:getAlertThresholds:missing-bounds", [], () =>
          listAlertThresholdRows(supabase, farmId),
        ),
      ),
    }
  }

  const batchId =
    params.filters.selectedBatch !== "all" && Number.isFinite(Number(params.filters.selectedBatch))
      ? Number(params.filters.selectedBatch)
      : undefined
  const startDate = bounds.start!
  const endDate = bounds.end!

  const [systemOptions, batchSystems, dashboardSystems, alertThresholds] = await Promise.all([
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
    withNetworkFallback("dashboard:getAlertThresholds", [], () => listAlertThresholdRows(supabase, farmId)),
  ])

  const scopedSystemIds = await resolveScopedSystemIds({
    supabase,
    system: params.filters.selectedSystem,
    batch: params.filters.selectedBatch,
    dashboardSystems,
  })

  const singleSystemId = scopedSystemIds.length === 1 ? scopedSystemIds[0] : undefined
  const useFarmWideRecommendedActions =
    params.filters.selectedStage === "all" &&
    params.filters.selectedBatch === "all" &&
    params.filters.selectedSystem === "all"
  const [productionRows, consolidatedRows, kpiCoverageRows, recommendedActionRows, waterQualityMeasurements] =
    await Promise.all([
      withNetworkFallback("dashboard:getProductionSummaryRows", [], () =>
        getProductionSummaryRows(supabase, {
          farmId,
          systemId: singleSystemId,
          dateFrom: startDate,
          dateTo: endDate,
        }),
      ),
      withNetworkFallback(
        "dashboard:getDashboardConsolidatedRows",
        [],
        () =>
        getDashboardConsolidatedRows(supabase, {
          farmId,
          systemId: singleSystemId,
          dateFrom: startDate,
          dateTo: endDate,
        }),
        { allowMissingObject: true },
      ),
      withNetworkFallback(
        "dashboard:getKpiCoverageRows",
        [],
        () =>
          getKpiCoverageRows(supabase, {
            farmId,
            dateFrom: startDate,
            dateTo: endDate,
          }),
        { allowMissingObject: true },
      ),
      withNetworkFallback<RecommendedActionRow[]>(
        "dashboard:getRecommendedActionRows",
        [],
        async () => {
          if (scopedSystemIds.length === 0) return []
          if (useFarmWideRecommendedActions) {
            return getRecommendedActionRows(supabase, { farmId })
          }
          const rows: RecommendedActionRow[][] = await Promise.all(
            scopedSystemIds.map((systemId) => getRecommendedActionRows(supabase, { farmId, systemId })),
          )
          return rows.flat()
        },
        { allowMissingObject: true },
      ),
      withNetworkFallback("dashboard:getWaterQualityMeasurements", [], () =>
        getWaterQualityMeasurements(supabase, {
          farmId,
          systemId: singleSystemId,
          dateFrom: startDate,
          dateTo: endDate,
          limit: 2000,
        }),
      ),
    ])

  const filteredProductionRows = productionRows.filter(
    (row) =>
      (params.filters.selectedStage === "all" || row.growth_stage === params.filters.selectedStage) &&
      row.system_id != null &&
      scopedSystemIds.includes(row.system_id),
  )

  const systemsTableRows = dashboardSystems.filter((row) => {
    if (params.filters.selectedStage !== "all" && row.growth_stage !== params.filters.selectedStage) return false
    if (!scopedSystemIds.includes(row.system_id)) return false
    return true
  })

  if (process.env.NEXT_PUBLIC_DEBUG === "true") {
    console.debug("[dashboard][server]", {
      farmId,
      dateFrom: startDate,
      dateTo: endDate,
      selectedStage: params.filters.selectedStage,
      selectedBatch: params.filters.selectedBatch,
      selectedSystem: params.filters.selectedSystem,
      scopedSystemIds,
      dashboardSystemsCount: dashboardSystems.length,
      systemsTableRowsCount: systemsTableRows.length,
    })
  }

  return {
    bounds,
    systemOptions: toQuerySuccess(systemOptions),
    batchSystems: toQuerySuccess(batchSystems),
    kpiOverview: buildKpiOverview({
      scopedSystemIds,
      consolidatedRows,
      systemRows: dashboardSystems,
      coverageRows: kpiCoverageRows,
      dateFrom: startDate,
      dateTo: endDate,
    }),
    systemsTable: {
      rows: systemsTableRows,
      meta: {
        source: "api_dashboard_systems",
        start: startDate,
        end: endDate,
        reason: scopedSystemIds.length === 0 ? "No scoped systems" : undefined,
      },
    },
    productionTrend: sortByDateAsc(filteredProductionRows, (row) => row.date),
    waterQualityMeasurements: toQuerySuccess(waterQualityMeasurements),
    alertThresholds: toQuerySuccess(alertThresholds),
    recommendedActions: mergeRecommendedActionRows(recommendedActionRows),
  }
}

export async function getDashboardPageInitialData(params: {
  farmId: string | null
  filters: DashboardPageInitialFilters
  accessToken: string
}): Promise<DashboardPageInitialData> {
  return runServerReadThrough({
    keyParts: [
      "dashboard-page",
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
          cacheTags.inventory(params.farmId),
          cacheTags.dashboard(params.farmId),
          cacheTags.waterQuality(params.farmId),
          cacheTags.reports(params.farmId, "recent-entries"),
        ]
      : [],
    loader: () => loadDashboardPageInitialData(createAccessTokenClient(params.accessToken), params),
  })
}

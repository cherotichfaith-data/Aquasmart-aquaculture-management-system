import { runServerReadThrough } from "@/lib/cache/server"
import { cacheTags } from "@/lib/cache/tags"
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
import {
  listAppConfigRows,
  listDashboardSystemsRows,
  listProductionSummaryRows,
  listSystemVolumeRows,
} from "@/features/shared/query-seed.server"
import { listSamplingData } from "@/lib/server/report-reads"
import type { DashboardSystemRow, SystemsTableData } from "@/features/dashboard/types"
import { normalizeStageFilter } from "@/lib/stage-filter"
import type { Database, Enums } from "@/lib/types/database"
import { isTimePeriod, type TimeBounds, type TimePeriod } from "@/lib/time-period"

export type SamplingPageFilters = {
  selectedBatch: string
  selectedSystem: string
  selectedStage: "all" | Enums<"system_growth_stage">
  timePeriod: TimePeriod
}

type SamplingSystemOption = Database["public"]["Functions"]["api_system_options_rpc"]["Returns"][number]
type ProductionSummaryRow = Database["public"]["Functions"]["api_production_summary"]["Returns"][number]
type SamplingRow = Database["public"]["Tables"]["fish_sampling_weight"]["Row"]
type SystemVolumeRow = Pick<Database["public"]["Tables"]["system"]["Row"], "id" | "name" | "volume" | "growth_stage">
type AppConfigRow = Database["public"]["Tables"]["app_config"]["Row"]

export type SamplingPageInitialData = {
  bounds: TimeBounds
  systems: ReturnType<typeof toQuerySuccess<SamplingSystemOption>>
  batchSystems: ReturnType<typeof toQuerySuccess<{ system_id: number }>>
  sampling: ReturnType<typeof toQuerySuccess<SamplingRow>>
  productionSummary: ReturnType<typeof toQuerySuccess<ProductionSummaryRow>>
  systemsTable: SystemsTableData
  systemVolumes: ReturnType<typeof toQuerySuccess<SystemVolumeRow>>
  appConfig: ReturnType<typeof toQuerySuccess<AppConfigRow>>
}

const DEFAULT_TIME_PERIOD: SamplingPageFilters["timePeriod"] = "quarter"
export function parseSamplingPageFilters(
  searchParams?: Record<string, string | string[] | undefined>,
): SamplingPageFilters {
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
  selectedSystem: string
  selectedBatch: string
  systems: SamplingSystemOption[]
  batchSystems: Array<{ system_id: number }>
}) {
  const selectedSystemId = parseSelectedNumericId(params.selectedSystem)
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
    productionSummary: toQuerySuccess([]),
    systemsTable: { rows: [], meta: { reason: "Missing farmId", start: null, end: null } },
    systemVolumes: toQuerySuccess([]),
    appConfig: toQuerySuccess([]),
  }

  if (!params.farmId) return empty

  const batchId = parseSelectedNumericId(params.filters.selectedBatch)
  const [systems, batchSystems, systemVolumes, appConfig] = await Promise.all([
    getScopedSystemOptions(supabase, params.farmId, params.filters.selectedStage),
    getScopedBatchSystems(supabase, batchId),
    listSystemVolumeRows(supabase, { farmId: params.farmId, stage: params.filters.selectedStage, activeOnly: true }),
    listAppConfigRows(supabase, {
      keys: [
        "target_density_kg_m3",
        "target_harvest_weight_g",
        "target_move_weight_g",
        "growth_curve_points",
      ],
    }),
  ])
  const systemId = resolveScopedSelectedSystemId(params.filters.selectedSystem, systems)
  const bounds = await getScopedTimeBounds(supabase, params.farmId, params.filters.timePeriod, "production", systemId)

  if (!bounds.start || !bounds.end) {
    return {
      ...empty,
      bounds,
      systems: toQuerySuccess(systems),
      batchSystems: toQuerySuccess(batchSystems),
      systemVolumes: toQuerySuccess(systemVolumes),
      appConfig: toQuerySuccess(appConfig),
      systemsTable: { rows: [], meta: { reason: "Missing time bounds", start: bounds.start, end: bounds.end } },
    }
  }

  const scopedSystemIds = buildScopedSystemIdList({
    selectedSystem: params.filters.selectedSystem,
    selectedBatch: params.filters.selectedBatch,
    systems,
    batchSystems,
  })

  const hasSystem = Boolean(systemId)
  const [sampling, productionSummary, dashboardSystems] = await Promise.all([
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
    listProductionSummaryRows(supabase, {
      farmId: params.farmId,
      systemId: hasSystem ? systemId : undefined,
      stage: params.filters.selectedStage === "all" ? undefined : params.filters.selectedStage,
      dateFrom: bounds.start,
      dateTo: bounds.end,
      limit: 5000,
    }),
    listDashboardSystemsRows(supabase, {
      farmId: params.farmId,
      stage: params.filters.selectedStage === "all" ? null : params.filters.selectedStage,
      systemId: systemId ?? null,
      dateFrom: bounds.start,
      dateTo: bounds.end,
    }),
  ])

  const systemsTableRows = dashboardSystems.filter((row) =>
    scopedSystemIds.length === 0 ? true : row.system_id != null && scopedSystemIds.includes(row.system_id),
  )

  return {
    bounds,
    systems: toQuerySuccess(systems),
    batchSystems: toQuerySuccess(batchSystems),
    sampling: toQuerySuccess(sampling),
    productionSummary: toQuerySuccess(productionSummary),
    systemsTable: {
      rows: systemsTableRows as DashboardSystemRow[],
      meta: { source: "api_dashboard_systems", start: bounds.start, end: bounds.end },
    },
    systemVolumes: toQuerySuccess(systemVolumes),
    appConfig: toQuerySuccess(appConfig),
  }
}

export async function getSamplingPageInitialData(params: { farmId: string | null; filters: SamplingPageFilters }) {
  const { user, accessToken } = await requireUserContext()

  return runServerReadThrough({
    keyParts: [
      "sampling-page",
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
          cacheTags.dashboard(params.farmId),
          cacheTags.reports(params.farmId, "sampling"),
        ]
      : [],
    loader: () => loadSamplingPageInitialData(createAccessTokenClient(accessToken), params),
  })
}

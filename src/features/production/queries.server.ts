import { toQuerySuccess } from "@/lib/supabase/query-transport"
import { createAccessTokenClient } from "@/lib/supabase/server"
import { requireUserContext } from "@/lib/supabase/require-user"
import {
  getScopedBatchSystems,
  getScopedSystemOptions,
  getScopedTimeBounds,
  parseSelectedNumericId,
} from "@/features/shared/scoped-analytics.server"
import type { ProductionDailyTrendRow, ProductionSummaryRpcRow } from "@/features/production/types"
import { normalizeStageFilter } from "@/lib/stage-filter"
import { resolveSystemIdFromFilterValue } from "@/lib/system-options"
import type { Database, Enums } from "@/lib/types/database"
import {
  parseCustomPeriodUrlValue,
  resolveTimePeriod,
  type CustomTimeRange,
  type TimeBounds,
  type TimePeriod,
} from "@/lib/time-period"

type GrowthTrendRow = {
  system_id: number
  sample_date: string
  adg_g_day: number | null
  sgr_pct_day: number | null
}

type SystemVolumeRow = Pick<Database["public"]["Tables"]["system"]["Row"], "id" | "volume">
type ProductionCycleRow = Pick<
  Database["public"]["Tables"]["production_cycle"]["Row"],
  "batch_id" | "cycle_end" | "cycle_id" | "cycle_start" | "ongoing_cycle" | "system_id" | "target_weight_g"
>
type SystemRow = Pick<Database["public"]["Tables"]["system"]["Row"], "growth_stage" | "id" | "name">

type FeedingRecordJoinedRow = {
  date: string | null
  system_id: number | null
  feed_type: {
    feed_line: string | null
  } | null
}

type AnalyticsProductionSummaryRow = {
  cycle_id: number | null
  system_id: number | null
  date: string
  activity: string | null
  days_in_period: number | null
  number_of_fish_start: number | null
  number_of_fish_end: number | null
  average_body_weight: number | null
  total_weight_kg: number | null
  mortality_over_period: number | null
  feed_over_period: number | null
  transfers_in_over_period: number | null
  transfers_out_over_period: number | null
  harvest_fish_over_period: number | null
  harvest_weight_kg_over_period: number | null
  biomass_increase_over_period: number | null
  efcr_period: number | null
  sgr: number | null
  agr: number | null
  feed_aggregated: number | null
  cumulative_mortality: number | null
  cumulative_biomass: number | null
  transfers_in_aggregated: number | null
  transfers_out_aggregated: number | null
  harvest_fish_aggregated: number | null
  harvest_weight_kg_aggregated: number | null
  efcr_aggregated: number | null
}

type DailySystemFactRow = {
  system_id: number | null
  inventory_date: string
  biomass_density: number | null
  feeding_rate: number | null
}

function buildProductionSummaryDayKey(row: Pick<ProductionSummaryRpcRow, "cycle_id" | "date" | "system_id">) {
  return `${row.date}|${row.system_id ?? "system"}|${row.cycle_id ?? "cycle"}`
}

function getProductionSummaryRowScore(row: ProductionSummaryRpcRow) {
  const numericValues = [
    row.days_in_period,
    row.fish_count_period_start,
    row.number_of_fish_inventory,
    row.average_body_weight,
    row.total_biomass,
    row.mortality_count_period,
    row.total_feed_amount_period,
    row.number_of_fish_transfer_in,
    row.number_of_fish_transfer_out,
    row.number_of_fish_harvested,
    row.total_weight_harvested,
    row.biomass_increase_period,
    row.feeding_rate_on_date,
    row.efcr_period,
    row.sgr,
    row.agr,
    row.survival_rate_pct,
    row.total_feed_amount_aggregated,
    row.cumulative_mortality,
    row.biomass_increase_aggregated,
    row.number_of_fish_transfer_in_aggregated,
    row.number_of_fish_transfer_out_aggregated,
    row.number_of_fish_harvested_aggregated,
    row.total_weight_harvested_aggregated,
    row.efcr_aggregated,
  ]

  return numericValues.reduce<number>((score, value) => {
    if (typeof value !== "number" || !Number.isFinite(value)) return score
    if (value === 0) return score + 0.25
    return score + 1
  }, 0)
}

function dedupeProductionSummaryRows(rows: ProductionSummaryRpcRow[]) {
  const rowsByDayKey = new Map<string, ProductionSummaryRpcRow>()

  for (const row of rows) {
    const key = buildProductionSummaryDayKey(row)
    const existing = rowsByDayKey.get(key)
    if (!existing) {
      rowsByDayKey.set(key, row)
      continue
    }

    const existingScore = getProductionSummaryRowScore(existing)
    const nextScore = getProductionSummaryRowScore(row)
    if (nextScore > existingScore) {
      rowsByDayKey.set(key, row)
    }
  }

  return Array.from(rowsByDayKey.values())
}

type AnalyticsQueryResult<T> = PromiseLike<{ data: T[] | null; error: unknown }> & {
  order: (
    column: string,
    options: { ascending: boolean },
  ) => AnalyticsQueryResult<T>
}

type AnalyticsSelectQuery<T> = PromiseLike<{ data: T[] | null; error: unknown }> & {
  in: (column: string, values: number[]) => AnalyticsSelectQuery<T>
  gte: (column: string, value: string) => AnalyticsSelectQuery<T>
  lte: (column: string, value: string) => AnalyticsSelectQuery<T>
  order: (
    column: string,
    options: { ascending: boolean },
  ) => AnalyticsQueryResult<T>
}

type AnalyticsRelationQuery<T> = {
  select: (columns: string) => AnalyticsSelectQuery<T>
}

type AnalyticsSchemaClient = {
  from: {
    (relation: "production_summary"): AnalyticsRelationQuery<AnalyticsProductionSummaryRow>
    (relation: "daily_system_facts"): AnalyticsRelationQuery<DailySystemFactRow>
  }
}

export type ProductionPeriodEnrichmentResponse = {
  volumeRows: SystemVolumeRow[]
  growthTrendRows: GrowthTrendRow[]
  feedingRecords: FeedingRecordJoinedRow[]
}

export type ProductionChartMarker = {
  date: string
  type: "stocking" | "transfer" | "harvest" | "water_quality"
  label: string
  notes: string | null
}

type RecentActivityFeedRow = Database["public"]["Functions"]["api_recent_activity_feed"]["Returns"][number]

const MARKER_TABLE_META: Record<string, { type: ProductionChartMarker["type"]; label: string }> = {
  fish_stocking: { type: "stocking", label: "Stocking" },
  fish_transfer: { type: "transfer", label: "Transfer" },
  fish_harvest: { type: "harvest", label: "Harvest" },
  water_quality_measurement: { type: "water_quality", label: "Water event" },
}

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
  productionSummary: ReturnType<typeof toQuerySuccess<ProductionSummaryRpcRow>>
  dailyTrend: ReturnType<typeof toQuerySuccess<ProductionDailyTrendRow>>
  enrichment: ProductionPeriodEnrichmentResponse
  scopedSystemIds: number[]
  /** System the page will render: URL `?system=` when valid, else lowest-id system. */
  systemId: number | null
  /** Stocking/transfer/harvest/water-quality events for the resolved system, for chart annotations. */
  markers: ProductionChartMarker[]
}

const DEFAULT_TIME_PERIOD: ProductionPageFilters["timePeriod"] = "month"

export function parseProductionPageFilters(
  searchParams?: Record<string, string | string[] | undefined>,
): ProductionPageFilters {
  const selectedBatchRaw = searchParams?.batch
  const selectedSystemRaw = searchParams?.cage ?? searchParams?.system
  const selectedStageRaw = searchParams?.stage
  const dateRaw = searchParams?.date

  return {
    selectedBatch: typeof selectedBatchRaw === "string" ? selectedBatchRaw : "all",
    selectedSystem: typeof selectedSystemRaw === "string" ? selectedSystemRaw : "all",
    selectedStage: normalizeStageFilter(selectedStageRaw),
    timePeriod: resolveTimePeriod(dateRaw, DEFAULT_TIME_PERIOD),
    customTimeRange: parseCustomPeriodUrlValue(dateRaw),
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
    dailyTrend: toQuerySuccess([]),
    enrichment: { volumeRows: [], growthTrendRows: [], feedingRecords: [] },
    scopedSystemIds: [],
    systemId: null,
    markers: [],
  }

  if (!params.farmId) return empty

  const batchId = parseSelectedNumericId(params.filters.selectedBatch)
  // Active cages only — same source as the shared header's cage filter.
  const [systems, batchSystems] = await Promise.all([
    getScopedSystemOptions(supabase, params.farmId, params.filters.selectedStage, true),
    getScopedBatchSystems(supabase, batchId),
  ])
  const resolvedSystemId =
    resolveSystemIdFromFilterValue(params.filters.selectedSystem, systems) ??
    (systems.length > 0 ? systems.reduce((low, s) => (s.id < low.id ? s : low)).id : null)
  const allowedSystemIds = systems
    .map((row) => row.id)
    .filter((id): id is number => typeof id === "number" && Number.isFinite(id))
  const batchScopedSystemIds = new Set(batchSystems.map((row) => row.system_id))
  const scopedSystemIds =
    resolvedSystemId != null
      ? allowedSystemIds.includes(resolvedSystemId)
        ? [resolvedSystemId]
        : []
      : batchId != null
        ? allowedSystemIds.filter((id) => batchScopedSystemIds.has(id))
        : allowedSystemIds
  const batchCycles =
    batchId != null && scopedSystemIds.length > 0
      ? await listProductionCyclesForBatchServer(supabase, {
          batchId,
          systemIds: scopedSystemIds,
        })
      : []
  const scopedCycleIds = batchId != null ? new Set(batchCycles.map((cycle) => cycle.cycle_id)) : null
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
      dailyTrend: toQuerySuccess([]),
      scopedSystemIds,
      systemId: resolvedSystemId ?? null,
    }
  }

  const dateFrom = bounds.start
  const dateTo = bounds.end

  const productionSummary = (await listProductionSummaryRowsDirectServer(supabase, {
    farmId: params.farmId,
    systemIds: scopedSystemIds,
    stage: params.filters.selectedStage === "all" ? undefined : params.filters.selectedStage,
    dateFrom,
    dateTo,
    limit: 2500,
  })).filter((row) => {
    if (scopedSystemIds.length === 0) return false
    if (row.system_id == null || !scopedSystemIds.includes(row.system_id)) return false
    if (scopedCycleIds) {
      return row.cycle_id != null && scopedCycleIds.has(row.cycle_id)
    }
    return true
  })
  const growthTrendRows = productionSummary
    .filter(
      (row): row is typeof row & { date: string; system_id: number } =>
        typeof row.system_id === "number" && Number.isFinite(row.system_id) && typeof row.date === "string",
    )
    .map((row) => ({
      system_id: row.system_id,
      sample_date: row.date,
      adg_g_day: row.agr,
      sgr_pct_day: row.sgr,
    }))
  const [dailyTrendRows, markers] = await Promise.all([
    scopedSystemIds.length === 0
      ? Promise.resolve<ProductionDailyTrendRow[]>([])
      : listSystemDailyTrendRowsServer(supabase, {
          farmId: params.farmId,
          systemIds: scopedSystemIds,
          dateFrom,
          dateTo,
        }),
    resolvedSystemId == null
      ? Promise.resolve<ProductionChartMarker[]>([])
      : listProductionChartMarkersServer(supabase, {
          farmId: params.farmId,
          systemId: resolvedSystemId,
          dateFrom,
          dateTo,
        }),
  ])
  const enrichment =
    scopedSystemIds.length === 0
      ? { volumeRows: [], growthTrendRows: [], feedingRecords: [] }
      : await getProductionPeriodEnrichmentServer(supabase, {
          farmId: params.farmId,
          systemIds: scopedSystemIds,
          stage: params.filters.selectedStage === "all" ? undefined : params.filters.selectedStage,
          dateTo,
          batchId,
          growthTrendRows,
        })

  return {
    bounds,
    systems: toQuerySuccess(systems),
    batchSystems: toQuerySuccess(batchSystems),
    productionSummary: toQuerySuccess(productionSummary),
    dailyTrend: toQuerySuccess(dailyTrendRows),
    enrichment,
    scopedSystemIds,
    systemId: resolvedSystemId ?? null,
    markers,
  }
}

/** Bounds any promise so a slow/hung RPC can never block the whole page render. */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      () => {
        clearTimeout(timer)
        resolve(fallback)
      },
    )
  })
}

async function listProductionChartMarkersServer(
  supabase: ReturnType<typeof createAccessTokenClient>,
  params: {
    farmId: string
    systemId: number
    dateFrom: string
    dateTo: string
  },
): Promise<ProductionChartMarker[]> {
  // Query per table (with p_table set) rather than the farm-wide, all-tables union: scoping to
  // exactly the four tables we care about keeps each call a single-table, indexed lookup instead
  // of a UNION across every activity table (including high-volume ones like feeding_record) that
  // we'd just throw away after filtering by system_id client-side.
  const markerTables = Object.keys(MARKER_TABLE_META)

  const results = await Promise.all(
    markerTables.map(async (table) => {
      const rows = await withTimeout(
        (async () => {
          const { data, error } = await supabase.rpc("api_recent_activity_feed", {
            p_farm_id: params.farmId,
            p_date_from: params.dateFrom,
            p_date_to: params.dateTo,
            p_table: table,
            p_limit: 50,
          })
          if (error) return []
          return (data ?? []) as RecentActivityFeedRow[]
        })(),
        3000,
        [] as RecentActivityFeedRow[],
      )
      return rows
    }),
  )

  return results
    .flat()
    .filter(
      (row): row is RecentActivityFeedRow & { activity_date: string } =>
        row.system_id === params.systemId && typeof row.activity_date === "string" && Boolean(MARKER_TABLE_META[row.table_name]),
    )
    .map((row) => {
      const meta = MARKER_TABLE_META[row.table_name]
      return {
        date: row.activity_date.slice(0, 10),
        type: meta.type,
        label: meta.label,
        notes: row.notes ?? null,
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}

async function listProductionSummaryRowsDirectServer(
  supabase: ReturnType<typeof createAccessTokenClient>,
  params: {
    farmId: string
    systemIds: number[]
    stage?: Enums<"system_growth_stage">
    dateFrom: string
    dateTo: string
    limit?: number
  },
): Promise<ProductionSummaryRpcRow[]> {
  if (params.systemIds.length === 0) return []

  const analyticsClient = (supabase as unknown as { schema: (name: string) => AnalyticsSchemaClient }).schema("analytics")

  const summaryQuery = analyticsClient
    .from("production_summary")
    .select(`
      cycle_id,
      system_id,
      date,
      activity,
      days_in_period,
      number_of_fish_start,
      number_of_fish_end,
      average_body_weight,
      total_weight_kg,
      mortality_over_period,
      feed_over_period,
      transfers_in_over_period,
      transfers_out_over_period,
      harvest_fish_over_period,
      harvest_weight_kg_over_period,
      biomass_increase_over_period,
      efcr_period,
      sgr,
      agr,
      feed_aggregated,
      cumulative_mortality,
      cumulative_biomass,
      transfers_in_aggregated,
      transfers_out_aggregated,
      harvest_fish_aggregated,
      harvest_weight_kg_aggregated,
      efcr_aggregated
    `)
    .in("system_id", params.systemIds)
    .gte("date", params.dateFrom)
    .lte("date", params.dateTo)

  const [summaryResult, dailyFactsResult, cycleResult, systemResult] = await Promise.all([
    summaryQuery.order("date", { ascending: false }).order("system_id", { ascending: false }),
    analyticsClient
      .from("daily_system_facts")
      .select("system_id, inventory_date, biomass_density, feeding_rate")
      .in("system_id", params.systemIds)
      .gte("inventory_date", params.dateFrom)
      .lte("inventory_date", params.dateTo),
    supabase
      .from("production_cycle")
      .select("cycle_id, system_id, batch_id, cycle_start, cycle_end, ongoing_cycle, target_weight_g")
      .in("system_id", params.systemIds),
    supabase
      .from("system")
      .select("id, name, growth_stage")
      .eq("farm_id", params.farmId)
      .in("id", params.systemIds),
  ])

  if (summaryResult.error || dailyFactsResult.error || cycleResult.error || systemResult.error) {
    throw new Error(
      [
        summaryResult.error ? `production_summary: ${String((summaryResult.error as { message?: unknown })?.message ?? summaryResult.error)}` : null,
        dailyFactsResult.error ? `daily_system_facts: ${String((dailyFactsResult.error as { message?: unknown })?.message ?? dailyFactsResult.error)}` : null,
        cycleResult.error ? `production_cycle: ${String((cycleResult.error as { message?: unknown })?.message ?? cycleResult.error)}` : null,
        systemResult.error ? `system: ${String((systemResult.error as { message?: unknown })?.message ?? systemResult.error)}` : null,
      ]
        .filter(Boolean)
        .join("; "),
    )
  }

  const stageFilter = params.stage ?? null
  const systemRows = (systemResult.data ?? []) as SystemRow[]
  const allowedSystemIds = new Set(
    systemRows
      .filter((row) => !stageFilter || row.growth_stage === stageFilter)
      .map((row) => row.id)
      .filter((id): id is number => typeof id === "number" && Number.isFinite(id)),
  )
  const systemsById = new Map(systemRows.map((row) => [row.id, row]))
  const cyclesById = new Map(
    ((cycleResult.data ?? []) as unknown as ProductionCycleRow[])
      .filter((row) => typeof row.cycle_id === "number")
      .map((row) => [row.cycle_id, row]),
  )
  const dailyFactsBySystemDate = new Map(
    ((dailyFactsResult.data ?? []) as unknown as DailySystemFactRow[])
      .filter((row) => typeof row.system_id === "number" && typeof row.inventory_date === "string")
      .map((row) => [`${row.system_id}|${row.inventory_date}`, row]),
  )

  let rows: ProductionSummaryRpcRow[] = ((summaryResult.data ?? []) as unknown as AnalyticsProductionSummaryRow[])
    .filter((row) => typeof row.system_id === "number" && allowedSystemIds.has(row.system_id))
    .map((row) => {
      const cycle = row.cycle_id != null ? cyclesById.get(row.cycle_id) : null
      const system = row.system_id != null ? systemsById.get(row.system_id) : null
      const dailyFact = row.system_id != null ? dailyFactsBySystemDate.get(`${row.system_id}|${row.date}`) : null

      return {
        cycle_id: row.cycle_id,
        system_id: row.system_id,
        system_name: system?.name ?? null,
        growth_stage: system?.growth_stage ?? null,
        ongoing_cycle: cycle?.ongoing_cycle ?? null,
        cycle_start: cycle?.cycle_start ?? null,
        cycle_end: cycle?.cycle_end ?? null,
        target_weight_g: cycle?.target_weight_g ?? null,
        date: row.date,
        activity: row.activity,
        days_in_period: row.days_in_period,
        fish_count_period_start: row.number_of_fish_start,
        number_of_fish_inventory: row.number_of_fish_end,
        average_body_weight: row.average_body_weight,
        total_biomass: row.total_weight_kg,
        biomass_density: dailyFact?.biomass_density ?? null,
        mortality_count_period: row.mortality_over_period,
        total_feed_amount_period: row.feed_over_period,
        number_of_fish_transfer_in: row.transfers_in_over_period,
        number_of_fish_transfer_out: row.transfers_out_over_period,
        number_of_fish_harvested: row.harvest_fish_over_period,
        total_weight_harvested: row.harvest_weight_kg_over_period,
        biomass_increase_period: row.biomass_increase_over_period,
        feeding_rate_on_date: dailyFact?.feeding_rate ?? null,
        efcr_period: row.efcr_period,
        sgr: row.sgr,
        agr: row.agr,
        survival_rate_pct:
          typeof row.number_of_fish_start === "number" && row.number_of_fish_start > 0 && typeof row.number_of_fish_end === "number"
            ? Number(((row.number_of_fish_end / row.number_of_fish_start) * 100).toFixed(2))
            : null,
        total_feed_amount_aggregated: row.feed_aggregated,
        cumulative_mortality: row.cumulative_mortality,
        biomass_increase_aggregated: row.cumulative_biomass,
        number_of_fish_transfer_in_aggregated: row.transfers_in_aggregated,
        number_of_fish_transfer_out_aggregated: row.transfers_out_aggregated,
        number_of_fish_harvested_aggregated: row.harvest_fish_aggregated,
        total_weight_harvested_aggregated: row.harvest_weight_kg_aggregated,
        efcr_aggregated: row.efcr_aggregated,
      } satisfies ProductionSummaryRpcRow
    })

  rows = dedupeProductionSummaryRows(rows)

  if (params.limit) rows = rows.slice(0, params.limit)
  return rows
}

async function listSystemVolumeRowsServer(
  supabase: ReturnType<typeof createAccessTokenClient>,
  params: {
    farmId: string
    stage?: string
    systemIds: number[]
  },
): Promise<SystemVolumeRow[]> {
  if (params.systemIds.length === 0) return []

  let query = supabase.from("system").select("id, volume").eq("farm_id", params.farmId).in("id", params.systemIds)
  if (params.stage && params.stage !== "all") query = query.eq("growth_stage", params.stage as never)

  const { data, error } = await query.order("id", { ascending: true })
  if (error) return []
  return (data ?? []) as SystemVolumeRow[]
}

async function listSystemDailyTrendRowsServer(
  supabase: ReturnType<typeof createAccessTokenClient>,
  params: {
    farmId: string
    systemIds: number[]
    dateFrom: string
    dateTo: string
  },
): Promise<ProductionDailyTrendRow[]> {
  if (params.systemIds.length === 0) return []

  const { data, error } = await supabase.rpc("api_system_daily_trend", {
    p_farm_id: params.farmId,
    p_system_ids: params.systemIds,
    p_start_date: params.dateFrom,
    p_end_date: params.dateTo,
  })

  if (error) return []

  return ((data ?? []) as Database["public"]["Functions"]["api_system_daily_trend"]["Returns"])
    .map((row) => ({
      date: row.date,
      estimated_abw_g: row.biomass_last_sampling != null && row.number_of_fish != null && row.number_of_fish > 0
        ? (row.biomass_last_sampling * 1000) / row.number_of_fish
        : null,
      abw_last_sampling: row.abw_last_sampling ?? null,
      mortality_rate: row.mortality_rate ?? null,
      feeding_rate: row.feeding_rate ?? null,
      biomass_density: row.biomass_density ?? null,
    }))
    .sort((left, right) => left.date.localeCompare(right.date))
}

async function listProductionCyclesForBatchServer(
  supabase: ReturnType<typeof createAccessTokenClient>,
  params: {
    batchId: number
    systemIds: number[]
  },
): Promise<ProductionCycleRow[]> {
  if (params.systemIds.length === 0) return []

  const { data, error } = await supabase
    .from("production_cycle")
    .select("cycle_id, system_id, batch_id, cycle_start, cycle_end")
    .eq("batch_id", params.batchId)
    .in("system_id", params.systemIds)

  if (error) return []
  return (data ?? []) as ProductionCycleRow[]
}

async function listFeedingRecordRowsServer(
  supabase: ReturnType<typeof createAccessTokenClient>,
  params: {
    systemIds: number[]
    dateTo: string
    batchId?: number
  },
): Promise<FeedingRecordJoinedRow[]> {
  if (params.systemIds.length === 0) return []

  let query = supabase
    .from("feeding_record")
    .select(`
      date,
      system_id,
      feed_type:feed_type (
        feed_line
      )
    `)
    .in("system_id", params.systemIds)
    .lte("date", params.dateTo)
  if (params.batchId != null) {
    query = query.eq("batch_id", params.batchId)
  }

  const { data, error } = await query.order("date", { ascending: false }).limit(5000)

  if (error) return []
  return (data ?? []) as FeedingRecordJoinedRow[]
}

async function getProductionPeriodEnrichmentServer(
  supabase: ReturnType<typeof createAccessTokenClient>,
  params: {
    farmId: string
    systemIds: number[]
    stage?: string
    dateTo: string
    batchId?: number
    growthTrendRows: GrowthTrendRow[]
  },
): Promise<ProductionPeriodEnrichmentResponse> {
  const [volumeRows, feedingRecords] = await Promise.all([
    listSystemVolumeRowsServer(supabase, {
      farmId: params.farmId,
      stage: params.stage,
      systemIds: params.systemIds,
    }),
    listFeedingRecordRowsServer(supabase, {
      systemIds: params.systemIds,
      dateTo: params.dateTo,
      batchId: params.batchId,
    }),
  ])

  return { volumeRows, growthTrendRows: params.growthTrendRows, feedingRecords }
}

export async function getProductionPageInitialData(params: {
  farmId: string | null
  filters: ProductionPageFilters
}) {
  const { accessToken } = await requireUserContext()

  return loadProductionPageInitialData(createAccessTokenClient(accessToken), params)
}
// structure refactor: transport moved to lib/supabase/query-transport

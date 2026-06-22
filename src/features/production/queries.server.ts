import { toQuerySuccess } from "@/lib/api/_utils"
import { createAccessTokenClient } from "@/lib/supabase/server"
import { requireUserContext } from "@/lib/supabase/require-user"
import {
  getScopedBatchSystems,
  getScopedSystemOptions,
  getScopedTimeBounds,
  parseSelectedNumericId,
} from "@/features/shared/scoped-analytics.server"
import { listProductionSummaryRows, listSystemVolumeRows } from "@/features/shared/query-seed.server"
import { listFeedingRecords, listGrowthTrend } from "@/features/shared/queries.server"
import { normalizeStageFilter } from "@/lib/stage-filter"
import { resolveSystemIdFromFilterValue } from "@/lib/system-options"
import type { Database, Enums } from "@/lib/types/database"
import { resolveTimePeriod, type TimeBounds, type TimePeriod } from "@/lib/time-period"
import type { ProductionSummaryMetricsRow } from "./types"
import { buildProductionPeriodViewRows, type ProductionPeriodViewRow } from "./period-view"

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
  }
}

export async function listProductionSummaryMetricsRows(
  supabase: ReturnType<typeof createAccessTokenClient>,
  params: {
    farmId?: string | null
    systemId?: number
    systemIds?: number[]
    stage?: Enums<"system_growth_stage">
    dateFrom?: string
    dateTo?: string
  },
): Promise<ProductionSummaryMetricsRow[]> {
  if (!params.farmId || !params.dateFrom || !params.dateTo) return []

  const rows = await listProductionSummaryRows(supabase, {
    farmId: params.farmId,
    systemId: params.systemId,
    stage: params.stage,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    limit: 5000,
  })

  const scopedRows =
    params.systemIds && params.systemIds.length > 0
      ? rows.filter((row) => row.system_id != null && params.systemIds?.includes(row.system_id))
      : params.systemIds?.length === 0
        ? []
        : rows

  const stockedFishByCycle = new Map<string, number>()
  scopedRows.forEach((row) => {
    const stocked = row.number_of_fish_stocked ?? 0
    if (stocked <= 0) return
    const cycleKey = row.cycle_id != null ? `cycle:${row.cycle_id}` : `system:${row.system_id ?? "na"}|date:${row.date ?? "na"}`
    const current = stockedFishByCycle.get(cycleKey) ?? 0
    if (stocked > current) stockedFishByCycle.set(cycleKey, stocked)
  })

  // Summary cards must reflect the selected period, so we aggregate period-event columns
  // instead of cycle-end cumulative snapshots, which can hide transfers after cage moves.
  const totals = scopedRows.reduce(
    (acc, row) => {
      acc.cumulative_mortality_fish += row.daily_mortality_count ?? 0
      acc.total_transfer_out_fish += row.number_of_fish_transfer_out ?? 0
      acc.total_harvested_kg += row.total_weight_harvested ?? 0
      acc.total_harvested_fish += row.number_of_fish_harvested ?? 0
      return acc
    },
    {
      total_stocked_fish: 0,
      cumulative_mortality_fish: 0,
      total_transfer_out_fish: 0,
      total_harvested_kg: 0,
      total_harvested_fish: 0,
    } satisfies ProductionSummaryMetricsRow,
  )

  totals.total_stocked_fish = Array.from(stockedFishByCycle.values()).reduce((sum, value) => sum + value, 0)

  return [totals]
}

export async function getProductionPeriodViewData(
  supabase: ReturnType<typeof createAccessTokenClient>,
  params: {
    farmId?: string | null
    systemId?: number
    systemIds?: number[]
    stage?: Enums<"system_growth_stage">
    dateFrom?: string
    dateTo?: string
    consolidate?: boolean
  },
): Promise<{ chartRows: ProductionPeriodViewRow[]; tableRows: ProductionPeriodViewRow[] }> {
  if (!params.farmId || !params.dateFrom || !params.dateTo) {
    return { chartRows: [], tableRows: [] }
  }

  const [rows, volumeRows] = await Promise.all([
    listProductionSummaryRows(supabase, {
      farmId: params.farmId,
      systemId: params.systemId,
      stage: params.stage,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      limit: 5000,
    }),
    listSystemVolumeRows(supabase, {
      farmId: params.farmId,
      stage: params.stage ?? "all",
      activeOnly: true,
    }),
  ])

  const activeSystemIds = new Set(
    volumeRows
      .map((row) => row.id)
      .filter((id): id is number => typeof id === "number"),
  )
  const scopedSystemIds = params.systemIds ? new Set(params.systemIds) : activeSystemIds
  const filteredRows = rows.filter((row) => row.system_id != null && scopedSystemIds.has(row.system_id))
  const filteredSystemIds = Array.from(
    new Set(filteredRows.map((row) => row.system_id).filter((id): id is number => typeof id === "number")),
  ).sort((left, right) => left - right)
  const totalScopedVolumeM3 = volumeRows.reduce((total, row) => {
    if (row.id == null || !scopedSystemIds.has(row.id)) return total
    return total + (row.volume ?? 0)
  }, 0)
  const volumeBySystemId = new Map(
    volumeRows
      .filter((row) => row.id != null && scopedSystemIds.has(row.id))
      .map((row) => [row.id as number, row.volume ?? 0]),
  )

  const [feedingRecords, growthTrendResults] = await Promise.all([
    listFeedingRecords(supabase, {
      systemIds: filteredSystemIds,
      dateTo: params.dateTo,
      limit: 5000,
    }),
    Promise.all(
      filteredSystemIds.map(async (systemId) => ({
        systemId,
        rows: await listGrowthTrend(supabase, {
          farmId: params.farmId,
          systemId,
        }),
      })),
    ),
  ])

  const growthBySystemDate = new Map<string, { adgGDay: number | null; sgrPctDay: number | null }>()
  growthTrendResults.forEach(({ systemId, rows }) => {
    rows.forEach((row) => {
      growthBySystemDate.set(`${systemId}|${row.sample_date}`, {
        adgGDay: row.adg_g_day ?? null,
        sgrPctDay: row.sgr_pct_day ?? null,
      })
    })
  })

  const feedTypeBySystemDate = new Map<string, string | null>()
  const productionDatesBySystem = new Map<number, string[]>()
  filteredRows.forEach((row) => {
    if (row.system_id == null || !row.date) return
    const current = productionDatesBySystem.get(row.system_id) ?? []
    current.push(row.date)
    productionDatesBySystem.set(row.system_id, current)
  })

  const feedsBySystem = new Map<number, Array<{ date: string; label: string | null }>>()
  feedingRecords.forEach((record) => {
    if (record.system_id == null || !record.date) return
    const current = feedsBySystem.get(record.system_id) ?? []
    current.push({
      date: record.date,
      label: record.feed_type?.label?.trim() || record.feed_type?.feed_line?.trim() || null,
    })
    feedsBySystem.set(record.system_id, current)
  })

  productionDatesBySystem.forEach((dates, systemId) => {
    const sortedDates = Array.from(new Set(dates)).sort((left, right) => left.localeCompare(right))
    const feeds = (feedsBySystem.get(systemId) ?? []).slice().sort((left, right) => left.date.localeCompare(right.date))
    let latestLabel: string | null = null
    let feedIndex = 0

    sortedDates.forEach((date) => {
      while (feedIndex < feeds.length && feeds[feedIndex].date <= date) {
        latestLabel = feeds[feedIndex].label ?? latestLabel
        feedIndex += 1
      }
      feedTypeBySystemDate.set(`${systemId}|${date}`, latestLabel)
    })
  })

  const chartRows = buildProductionPeriodViewRows({
    productionRows: filteredRows,
    consolidate: params.consolidate ?? false,
    volumeBySystemId,
    growthBySystemDate,
    feedTypeBySystemDate,
    totalScopedVolumeM3,
  })
  const tableRows = buildProductionPeriodViewRows({
    productionRows: filteredRows,
    consolidate: false,
    volumeBySystemId,
    growthBySystemDate,
    feedTypeBySystemDate,
    totalScopedVolumeM3,
  }).sort((left, right) => {
    const dateDelta = String(right.date).localeCompare(String(left.date))
    if (dateDelta !== 0) return dateDelta
    return String(left.systemName ?? "").localeCompare(String(right.systemName ?? ""))
  })

  return { chartRows, tableRows }
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
  const bounds = await getScopedTimeBounds(supabase, params.farmId, params.filters.timePeriod, "production", systemId, batchId)

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

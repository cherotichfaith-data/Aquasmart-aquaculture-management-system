import { createAccessTokenClient } from "@/lib/supabase/server"
import { loadSystemsTableData, parseDashboardPageFilters } from "@/features/dashboard/queries.server"
import type { DashboardPageInitialFilters } from "@/features/dashboard/types"
import { listGrowthTrend, listMortalityData } from "@/features/shared/queries.server"
import { listBatchOptionRows, listWaterQualityTrendRows } from "@/features/shared/query-seed.server"
import type { RecommendedActionRow } from "@/lib/types/insights"
import type { CageMortalityTotal, SystemsPageInitialData, WaterQualityMonthlyPoint } from "./types"

type ServerClient = ReturnType<typeof createAccessTokenClient>

/**
 * Same URL shape as the Home overview (system/cage, batch, stage), except
 * this page has no date/time-period selector in its header -- it always
 * shows the full real picture, so any stray `date` param is ignored in
 * favor of "all history".
 */
export function parseSystemsPageFilters(
  searchParams?: Record<string, string | string[] | undefined>,
): DashboardPageInitialFilters {
  const base = parseDashboardPageFilters(searchParams)
  return { ...base, timePeriod: "all history", customTimeRange: null }
}

function bucketWaterQualityMonthly(
  rows: Array<{ wq_date: string | null; do_avg: number | null; temp_avg: number | null }>,
): WaterQualityMonthlyPoint[] {
  const buckets = new Map<string, { doSum: number; doCount: number; tempSum: number; tempCount: number }>()

  for (const row of rows) {
    const month = row.wq_date?.slice(0, 7)
    if (!month) continue
    const bucket = buckets.get(month) ?? { doSum: 0, doCount: 0, tempSum: 0, tempCount: 0 }
    if (typeof row.do_avg === "number" && Number.isFinite(row.do_avg)) {
      bucket.doSum += row.do_avg
      bucket.doCount += 1
    }
    if (typeof row.temp_avg === "number" && Number.isFinite(row.temp_avg)) {
      bucket.tempSum += row.temp_avg
      bucket.tempCount += 1
    }
    buckets.set(month, bucket)
  }

  return Array.from(buckets.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, bucket]) => ({
      month,
      doAvg: bucket.doCount > 0 ? bucket.doSum / bucket.doCount : null,
      tempAvg: bucket.tempCount > 0 ? bucket.tempSum / bucket.tempCount : null,
    }))
}

function sumMortalityByCage(
  rows: Array<{ system_id: number | null; number_of_fish_mortality: number | null }>,
): CageMortalityTotal[] {
  const totals = new Map<number, number>()
  for (const row of rows) {
    if (typeof row.system_id !== "number") continue
    totals.set(row.system_id, (totals.get(row.system_id) ?? 0) + (row.number_of_fish_mortality ?? 0))
  }
  return Array.from(totals.entries()).map(([system_id, total]) => ({ system_id, total }))
}

async function getAlertRows(supabase: ServerClient, farmId: string): Promise<RecommendedActionRow[]> {
  const { data, error } = await supabase.rpc("api_recommended_actions", { p_farm_id: farmId })
  if (error) return []
  return (data ?? []) as RecommendedActionRow[]
}

async function getCohortBySystemId(supabase: ServerClient, farmId: string): Promise<Record<number, string | null>> {
  const rows = await listBatchOptionRows(supabase, { farmId })
  const map: Record<number, string | null> = {}
  for (const row of rows) {
    for (const systemId of row.current_system_ids ?? []) {
      if (typeof systemId === "number") {
        map[systemId] = row.label ?? null
      }
    }
  }
  return map
}

export async function getSystemsPageInitialData(params: {
  farmId: string | null
  filters: DashboardPageInitialFilters
  accessToken: string
}): Promise<SystemsPageInitialData> {
  const supabase = createAccessTokenClient(params.accessToken)
  const { bounds, systemOptions, batchSystems, systemsTable } = await loadSystemsTableData(supabase, {
    farmId: params.farmId,
    filters: params.filters,
  })

  const empty = { growthSeries: [], mortalityByCage: [], waterQualityMonthly: [], alerts: [], cohortBySystemId: {} }
  if (!params.farmId || !bounds.start || !bounds.end) {
    return { bounds, systemOptions, batchSystems, systemsTable, ...empty }
  }
  const farmId = params.farmId
  const dateFrom = bounds.start
  const dateTo = bounds.end
  const stockedSystemIds = systemsTable.rows
    .filter((row) => (row.fish_end ?? 0) > 0)
    .map((row) => row.system_id)

  const [growthSeries, mortalityRows, waterQualityRows, alerts, cohortBySystemId] = await Promise.all([
    stockedSystemIds.length
      ? listGrowthTrend(supabase, { farmId, systemIds: stockedSystemIds, dateFrom, dateTo })
      : Promise.resolve([]),
    stockedSystemIds.length
      ? listMortalityData(supabase, { farmId, systemIds: stockedSystemIds, dateFrom, dateTo })
      : Promise.resolve([]),
    listWaterQualityTrendRows(supabase, { farmId, dateFrom, dateTo }),
    getAlertRows(supabase, farmId),
    getCohortBySystemId(supabase, farmId),
  ])

  return {
    bounds,
    systemOptions,
    batchSystems,
    systemsTable,
    growthSeries,
    mortalityByCage: sumMortalityByCage(mortalityRows),
    waterQualityMonthly: bucketWaterQualityMonthly(waterQualityRows),
    alerts,
    cohortBySystemId,
  }
}

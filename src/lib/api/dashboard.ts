import type { Database, Enums } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import { getClientOrError, isAbortLikeError, isMissingObjectError, queryKpiRpc, toQueryError, toQuerySuccess } from "@/lib/api/_utils"
import { getDailyFishInventory } from "@/lib/api/inventory"
import { isSbAuthMissing, isSbPermissionDenied } from "@/lib/supabase/log"
import type { TimePeriod } from "@/lib/time-period"

type DailyFishInventoryRow = Database["public"]["Functions"]["api_daily_fish_inventory_rpc"]["Returns"][number]
export type DashboardSystemRpcRow = Database["public"]["Functions"]["api_dashboard_systems"]["Returns"][number]
type DashboardConsolidatedRow = Database["public"]["Functions"]["api_dashboard_consolidated"]["Returns"][number]
export type FarmKpisTodayRow = Database["public"]["Functions"]["get_farm_kpis_today"]["Returns"][number]

const isMissingRpcError = isMissingObjectError

const isQuietError = (err: unknown): boolean =>
  isAbortLikeError(err) || isSbPermissionDenied(err) || isSbAuthMissing(err)

const shouldBackfillRate = (value: number | null | undefined): boolean =>
  value == null || !Number.isFinite(value) || value === 0

const deriveFeedingRate = (row: DailyFishInventoryRow): number | null => {
  if (typeof row.feeding_rate === "number" && Number.isFinite(row.feeding_rate) && row.feeding_rate > 0) {
    return row.feeding_rate
  }
  if (
    typeof row.feeding_amount === "number" &&
    Number.isFinite(row.feeding_amount) &&
    typeof row.biomass_last_sampling === "number" &&
    Number.isFinite(row.biomass_last_sampling) &&
    row.biomass_last_sampling > 0
  ) {
    const derived = row.feeding_amount / row.biomass_last_sampling
    return Number.isFinite(derived) && derived > 0 ? derived : null
  }
  return null
}

const deriveMortalityRate = (row: DailyFishInventoryRow): number | null => {
  // Prefer backend-computed start-of-day mortality_rate
  if (typeof row.mortality_rate === "number" && Number.isFinite(row.mortality_rate) && row.mortality_rate > 0) {
    return row.mortality_rate
  }
  // Fallback: daily deaths / end-of-day fish (less correct than backend)
  if (
    typeof row.number_of_fish_mortality === "number" &&
    Number.isFinite(row.number_of_fish_mortality) &&
    typeof row.number_of_fish === "number" &&
    Number.isFinite(row.number_of_fish) &&
    row.number_of_fish > 0
  ) {
    const derived = row.number_of_fish_mortality / row.number_of_fish
    return Number.isFinite(derived) && derived > 0 ? derived : null
  }
  return null
}

const computePerSystemRateFallbacks = (rows: DailyFishInventoryRow[]) => {
  const map = new Map<
    number,
    { feedingWeighted: number; feedingWeight: number; mortalityWeighted: number; mortalityWeight: number }
  >()

  rows.forEach((row) => {
    if (typeof row.system_id !== "number" || !Number.isFinite(row.system_id)) return
    const current = map.get(row.system_id) ?? {
      feedingWeighted: 0,
      feedingWeight: 0,
      mortalityWeighted: 0,
      mortalityWeight: 0,
    }

    const feedingRate = deriveFeedingRate(row)
    const mortalityRate = deriveMortalityRate(row)

    if (feedingRate != null && typeof row.biomass_last_sampling === "number" && row.biomass_last_sampling > 0) {
      current.feedingWeighted += feedingRate * row.biomass_last_sampling
      current.feedingWeight += row.biomass_last_sampling
    }
    if (mortalityRate != null && typeof row.number_of_fish === "number" && row.number_of_fish > 0) {
      current.mortalityWeighted += mortalityRate * row.number_of_fish
      current.mortalityWeight += row.number_of_fish
    }
    map.set(row.system_id, current)
  })

  const resolved = new Map<number, { feedingRate: number | null; mortalityRate: number | null }>()
  map.forEach((v, k) => {
    resolved.set(k, {
      feedingRate: v.feedingWeight > 0 ? v.feedingWeighted / v.feedingWeight : null,
      mortalityRate: v.mortalityWeight > 0 ? v.mortalityWeighted / v.mortalityWeight : null,
    })
  })
  return resolved
}

export async function getDashboardSystems(params?: {
  farmId?: string | null
  stage?: Enums<"system_growth_stage"> | null
  systemId?: number | null
  dateFrom?: string | null
  dateTo?: string | null
  allowFallback?: boolean
  signal?: AbortSignal
}): Promise<QueryResult<DashboardSystemRpcRow>> {
  if (!params?.farmId) return toQuerySuccess<DashboardSystemRpcRow>([])

  const clientResult = await getClientOrError("getDashboardSystems", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = queryKpiRpc(
    supabase,
    "api_dashboard_systems",
    {
      p_farm_id: params.farmId,
      p_stage: params.stage ?? undefined,
      p_system_id: params.systemId ?? undefined,
      p_start_date: params.dateFrom ?? undefined,
      p_end_date: params.dateTo ?? undefined,
    },
  )
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (params?.signal?.aborted) return toQuerySuccess<DashboardSystemRpcRow>([])
  if (error && isQuietError(error)) return toQuerySuccess<DashboardSystemRpcRow>([])
  if (error) return toQueryError("getDashboardSystems", error)

  const rows = (data ?? []) as DashboardSystemRpcRow[]

  const allowFallback = params?.allowFallback ?? true
  if (!allowFallback) return toQuerySuccess<DashboardSystemRpcRow>(rows)

  if (!rows.some((r) => shouldBackfillRate(r.feeding_rate) || shouldBackfillRate(r.mortality_rate))) {
    return toQuerySuccess<DashboardSystemRpcRow>(rows)
  }

  const inventoryResult = await getDailyFishInventory({
    farmId: params.farmId,
    dateFrom: params.dateFrom ?? undefined,
    dateTo: params.dateTo ?? undefined,
    limit: 10000,
    orderAsc: true,
    signal: params?.signal,
  })

  if (inventoryResult.status !== "success") return toQuerySuccess<DashboardSystemRpcRow>(rows)

  const perSystemFallback = computePerSystemRateFallbacks(inventoryResult.data)
  const normalized = rows.map((row) => {
    const fb = perSystemFallback.get(row.system_id)
    return {
      ...row,
      feeding_rate: shouldBackfillRate(row.feeding_rate) && fb?.feedingRate != null ? fb.feedingRate : row.feeding_rate,
      mortality_rate: shouldBackfillRate(row.mortality_rate) && fb?.mortalityRate != null ? fb.mortalityRate : row.mortality_rate,
    }
  })

  return toQuerySuccess<DashboardSystemRpcRow>(normalized)
}

export async function getFarmKpisToday(params?: {
  farmId?: string | null
  signal?: AbortSignal
}): Promise<QueryResult<FarmKpisTodayRow>> {
  if (!params?.farmId) return toQuerySuccess<FarmKpisTodayRow>([])

  const clientResult = await getClientOrError("getFarmKpisToday", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = queryKpiRpc(supabase, "get_farm_kpis_today", { p_farm_id: params.farmId })
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (params?.signal?.aborted) return toQuerySuccess<FarmKpisTodayRow>([])
  if (error && isQuietError(error)) return toQuerySuccess<FarmKpisTodayRow>([])
  if (error) return toQueryError("getFarmKpisToday", error)

  return toQuerySuccess<FarmKpisTodayRow>((data ?? []) as FarmKpisTodayRow[])
}

export async function getDashboardConsolidated(params?: {
  farmId?: string | null
  systemId?: number | null
  dateFrom?: string | null
  dateTo?: string | null
  timePeriod?: TimePeriod
  signal?: AbortSignal
}): Promise<QueryResult<DashboardConsolidatedRow>> {
  if (!params?.farmId) return toQuerySuccess<DashboardConsolidatedRow>([])

  const clientResult = await getClientOrError("getDashboardConsolidated", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = queryKpiRpc(
    supabase,
    "api_dashboard_consolidated",
    {
      p_farm_id: params.farmId,
      p_system_id: params.systemId ?? undefined,
      p_start_date: params.dateFrom ?? undefined,
      p_end_date: params.dateTo ?? undefined,
      p_time_period:
        !params.dateFrom && !params.dateTo ? (params.timePeriod ?? undefined) : undefined,
    },
  )
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (params?.signal?.aborted || isQuietError(error) || isMissingRpcError(error)) {
      return toQuerySuccess<DashboardConsolidatedRow>([])
    }
    // Treat unknown RPC errors as quiet to avoid spamming the console.
    return toQuerySuccess<DashboardConsolidatedRow>([])
  }

  return toQuerySuccess<DashboardConsolidatedRow>((data ?? []) as DashboardConsolidatedRow[])
}

import type { Database, Enums } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import { getClientOrError, isAbortLikeError, isMissingObjectError, queryKpiRpc, toQueryError, toQuerySuccess } from "@/lib/api/_utils"
import { getDailyFishInventory } from "@/lib/api/inventory"
import { isSbAuthMissing, isSbPermissionDenied } from "@/lib/supabase/log"
import type { TimePeriod } from "@/lib/time-period"

type DailyFishInventoryRow = Database["public"]["Functions"]["api_daily_fish_inventory_rpc"]["Returns"][number]
export type DashboardSystemRpcRow = Database["public"]["Functions"]["api_dashboard_systems"]["Returns"][number]
type DashboardConsolidatedRow = Database["public"]["Functions"]["api_dashboard_consolidated"]["Returns"][number]
type SystemDimensionRow = Pick<Database["public"]["Tables"]["system"]["Row"], "id" | "volume" | "depth">

const isMissingRpcError = isMissingObjectError

const isQuietError = (err: unknown): boolean =>
  isAbortLikeError(err) || isSbPermissionDenied(err) || isSbAuthMissing(err)

const shouldBackfillRate = (value: number | null | undefined): boolean =>
  value == null || !Number.isFinite(value) || value === 0

const isPositiveFiniteNumber = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0

const deriveFeedingRate = (row: DailyFishInventoryRow): number | null => {
  if (isPositiveFiniteNumber(row.feeding_rate)) {
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

const computePerSystemRateFallbacks = (rows: DailyFishInventoryRow[]) => {
  const map = new Map<
    number,
    { feedingWeighted: number; feedingWeight: number }
  >()

  rows.forEach((row) => {
    if (typeof row.system_id !== "number" || !Number.isFinite(row.system_id)) return
    const current = map.get(row.system_id) ?? {
      feedingWeighted: 0,
      feedingWeight: 0,
    }

    const feedingRate = deriveFeedingRate(row)

    if (feedingRate != null && typeof row.biomass_last_sampling === "number" && row.biomass_last_sampling > 0) {
      current.feedingWeighted += feedingRate * row.biomass_last_sampling
      current.feedingWeight += row.biomass_last_sampling
    }
    map.set(row.system_id, current)
  })

  const resolved = new Map<number, { feedingRate: number | null }>()
  map.forEach((v, k) => {
    resolved.set(k, {
      feedingRate: v.feedingWeight > 0 ? v.feedingWeighted / v.feedingWeight : null,
    })
  })
  return resolved
}

const resolveSystemVolume = (row: SystemDimensionRow) => {
  if (typeof row.volume === "number" && Number.isFinite(row.volume) && row.volume > 0) return row.volume
  return null
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

  if (!rows.some((r) => shouldBackfillRate(r.feeding_rate) || shouldBackfillRate(r.biomass_density))) {
    return toQuerySuccess<DashboardSystemRpcRow>(rows)
  }

  const inventoryResult = await getDailyFishInventory({
    farmId: params.farmId,
    stage: params.stage ?? undefined,
    dateFrom: params.dateFrom ?? undefined,
    dateTo: params.dateTo ?? undefined,
    limit: 10000,
    orderAsc: true,
    signal: params?.signal,
  })

  if (inventoryResult.status !== "success") return toQuerySuccess<DashboardSystemRpcRow>(rows)

  const perSystemFallback = computePerSystemRateFallbacks(inventoryResult.data)
  const { data: dimensions } = await supabase
    .from("system")
    .select("id, volume, depth")
    .eq("farm_id", params.farmId)
    .in("id", rows.map((row) => row.system_id))
  const volumeBySystem = new Map(
    ((dimensions ?? []) as SystemDimensionRow[]).map((row) => [row.id, resolveSystemVolume(row)]),
  )
  const normalized = rows.map((row) => {
    const fb = perSystemFallback.get(row.system_id)
    const volume = volumeBySystem.get(row.system_id)
    const biomassDensity =
      shouldBackfillRate(row.biomass_density) &&
      typeof row.biomass_end === "number" &&
      Number.isFinite(row.biomass_end) &&
      typeof volume === "number" &&
      volume > 0
        ? row.biomass_end / volume
        : row.biomass_density
    return {
      ...row,
      feeding_rate: shouldBackfillRate(row.feeding_rate) && fb?.feedingRate != null ? fb.feedingRate : row.feeding_rate,
      biomass_density: biomassDensity,
    }
  })

  return toQuerySuccess<DashboardSystemRpcRow>(normalized)
}

export async function getDashboardConsolidated(params?: {
  farmId?: string | null
  stage?: Enums<"system_growth_stage"> | null
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
      p_stage: params.stage ?? undefined,
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

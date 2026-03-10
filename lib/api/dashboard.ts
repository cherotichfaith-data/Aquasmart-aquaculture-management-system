import type { Database, Enums } from "@/lib/types/database"
import { parseDateToTimePeriod } from "@/lib/utils"
import type { QueryResult } from "@/lib/supabase-client"
import { getClientOrError, queryKpiRpc, toQueryError, toQuerySuccess } from "@/lib/api/_utils"
import { getDailyFishInventory } from "@/lib/api/inventory"
import { isSbAuthMissing, isSbPermissionDenied } from "@/utils/supabase/log"

type DashboardRow = Database["public"]["Functions"]["api_dashboard"]["Returns"][number]
type DailyFishInventoryRow = Database["public"]["Functions"]["api_daily_fish_inventory_rpc"]["Returns"][number]
export type DashboardSystemRpcRow = Database["public"]["Functions"]["api_dashboard_systems"]["Returns"][number]
type DashboardConsolidatedRow = Database["public"]["Functions"]["api_dashboard_consolidated"]["Returns"][number]
type TimePeriodBoundsRow = Database["public"]["Functions"]["api_time_period_bounds"]["Returns"][number]

type TimeBounds = { start: string | null; end: string | null }

type DashboardRpcArgs = {
  p_farm_id: string
  p_system_id?: number
  p_growth_stage?: string
  p_start_date?: string
  p_end_date?: string
  p_time_period?: Enums<"time_period">
}

const dashboardRpcArgs = (params: {
  farmId: string
  systemId?: number
  stage?: Enums<"system_growth_stage">
  dateFrom?: string
  dateTo?: string
  timePeriod?: Enums<"time_period"> | string
}): DashboardRpcArgs => {
  const hasRange = Boolean(params.dateFrom || params.dateTo)
  const parsed = !hasRange && params.timePeriod ? parseDateToTimePeriod(params.timePeriod) : null
  return {
    p_farm_id: params.farmId,
    p_system_id: params.systemId ?? undefined,
    p_growth_stage: params.stage ?? undefined,
    p_start_date: params.dateFrom ?? undefined,
    p_end_date: params.dateTo ?? undefined,
    p_time_period: parsed?.period ?? undefined,
  }
}

type DashboardConsolidatedRpcArgs = {
  p_farm_id: string
  p_system_id?: number
  p_start_date?: string
  p_end_date?: string
  p_time_period?: Enums<"time_period">
}

const dashboardConsolidatedRpcArgs = (params: {
  farmId: string
  systemId?: number
  dateFrom?: string
  dateTo?: string
  timePeriod?: Enums<"time_period"> | string
}): DashboardConsolidatedRpcArgs => {
  const hasRange = Boolean(params.dateFrom || params.dateTo)
  const parsed = !hasRange && params.timePeriod ? parseDateToTimePeriod(params.timePeriod) : null
  return {
    p_farm_id: params.farmId,
    p_system_id: params.systemId ?? undefined,
    p_start_date: params.dateFrom ?? undefined,
    p_end_date: params.dateTo ?? undefined,
    p_time_period: parsed?.period ?? undefined,
  }
}
type DashboardSystemsRpcArgs = {
  p_farm_id: string
  p_stage?: Enums<"system_growth_stage">
  p_system_id?: number
  p_start_date?: string
  p_end_date?: string
}

const dashboardSystemsRpcArgs = (params: {
  farmId: string
  stage?: Enums<"system_growth_stage"> | null
  systemId?: number | null
  dateFrom?: string | null
  dateTo?: string | null
}): DashboardSystemsRpcArgs => ({
  p_farm_id: params.farmId,
  p_stage: params.stage ?? undefined,
  p_system_id: params.systemId ?? undefined,
  p_start_date: params.dateFrom ?? undefined,
  p_end_date: params.dateTo ?? undefined,
})

const isAbortLikeError = (err: unknown): boolean => {
  if (!err) return false
  const e = err as { name?: string; message?: string }
  const name = String(e.name ?? "").toLowerCase()
  const message = String(e.message ?? "").toLowerCase()
  return name.includes("abort") || message.includes("abort") || message.includes("canceled") || message.includes("cancel")
}

const isMissingRpcError = (err: unknown): boolean => {
  if (!err || typeof err !== "object") return false
  const e = err as { code?: string; message?: string }
  if (e.code === "42P01" || e.code === "42883") return true
  const message = String(e.message ?? "").toLowerCase()
  return message.includes("does not exist") || message.includes("schema cache")
}

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
    const derived = (row.feeding_amount * 1000) / row.biomass_last_sampling
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

const computeAggregateRateFallbacks = (rows: DailyFishInventoryRow[]) => {
  let feedingWeighted = 0
  let feedingWeight = 0
  let mortalityWeighted = 0
  let mortalityWeight = 0

  rows.forEach((row) => {
    const feedingRate = deriveFeedingRate(row)
    const mortalityRate = deriveMortalityRate(row)

    if (feedingRate != null && typeof row.biomass_last_sampling === "number" && row.biomass_last_sampling > 0) {
      feedingWeighted += feedingRate * row.biomass_last_sampling
      feedingWeight += row.biomass_last_sampling
    }
    if (mortalityRate != null && typeof row.number_of_fish === "number" && row.number_of_fish > 0) {
      mortalityWeighted += mortalityRate * row.number_of_fish
      mortalityWeight += row.number_of_fish
    }
  })

  return {
    feedingRate: feedingWeight > 0 ? feedingWeighted / feedingWeight : null,
    mortalityRate: mortalityWeight > 0 ? mortalityWeighted / mortalityWeight : null,
  }
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

export async function getDashboardSnapshot(params?: {
  systemId?: number
  timePeriod?: Enums<"time_period"> | string
  stage?: Enums<"system_growth_stage">
  dateFrom?: string | null
  dateTo?: string | null
  allowFallback?: boolean
  farmId?: string | null
  signal?: AbortSignal
}) {
  if (!params?.farmId) return null

  const clientResult = await getClientOrError("getDashboardSnapshot", { requireSession: true })
  if ("error" in clientResult) return null
  const { supabase } = clientResult

  const baseArgs = dashboardRpcArgs({
    farmId: params.farmId,
    systemId: params.systemId,
    stage: params.stage,
    timePeriod: params.timePeriod,
    dateFrom: params.dateFrom ?? undefined,
    dateTo: params.dateTo ?? undefined,
  })

  let query = queryKpiRpc(supabase, "api_dashboard", {
    ...baseArgs,
    p_limit: 1,
    p_order_desc: true,
  })
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (isQuietError(error)) return null
    toQueryError("getDashboardSnapshot", error)
    return null
  }

  const row = ((data ?? []) as DashboardRow[])[0] ?? null
  if (!row) return null

  const allowFallback = params.allowFallback ?? true
  if (!allowFallback) return row

  if (!shouldBackfillRate(row.feeding_rate) && !shouldBackfillRate(row.mortality_rate)) return row

  const fallbackStart = params.dateFrom ?? null
  const fallbackEnd = params.dateTo ?? null
  if (!fallbackStart || !fallbackEnd) return row

  const inventoryResult = await getDailyFishInventory({
    farmId: params.farmId,
    systemId: params.systemId,
    dateFrom: fallbackStart ?? undefined,
    dateTo: fallbackEnd ?? undefined,
    limit: 5000,
    orderAsc: true,
    signal: params?.signal,
  })

  if (inventoryResult.status !== "success") return row

  const fallback = computeAggregateRateFallbacks(inventoryResult.data)

  return {
    ...row,
    feeding_rate: shouldBackfillRate(row.feeding_rate) && fallback.feedingRate != null ? fallback.feedingRate : row.feeding_rate,
    mortality_rate:
      shouldBackfillRate(row.mortality_rate) && fallback.mortalityRate != null ? fallback.mortalityRate : row.mortality_rate,
  }
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
    dashboardSystemsRpcArgs({
      farmId: params.farmId,
      stage: params.stage ?? undefined,
      systemId: params.systemId ?? undefined,
      dateFrom: params.dateFrom ?? undefined,
      dateTo: params.dateTo ?? undefined,
    }),
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

export async function getDashboardConsolidated(params?: {
  farmId?: string | null
  systemId?: number | null
  dateFrom?: string | null
  dateTo?: string | null
  timePeriod?: Enums<"time_period"> | string
  signal?: AbortSignal
}): Promise<QueryResult<DashboardConsolidatedRow>> {
  if (!params?.farmId) return toQuerySuccess<DashboardConsolidatedRow>([])

  const clientResult = await getClientOrError("getDashboardConsolidated", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = queryKpiRpc(
    supabase,
    "api_dashboard_consolidated",
    dashboardConsolidatedRpcArgs({
      farmId: params.farmId,
      systemId: params.systemId ?? undefined,
      dateFrom: params.dateFrom ?? undefined,
      dateTo: params.dateTo ?? undefined,
      timePeriod: params.timePeriod ?? undefined,
    }),
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

export async function getTimePeriodBounds(
  timePeriod: Enums<"time_period"> | string,
  signal?: AbortSignal,
  farmId?: string | null,
): Promise<TimeBounds> {
  const parsed = parseDateToTimePeriod(timePeriod)
  if (!farmId) return { start: null, end: null }

  const clientResult = await getClientOrError("getTimePeriodBounds", { requireSession: true })
  if ("error" in clientResult) return { start: null, end: null }
  const { supabase } = clientResult

  let q = supabase
    .rpc("api_time_period_bounds", {
      p_farm_id: farmId,
      p_time_period: parsed.period,
    })
    .maybeSingle()

  if (signal) {
    const withSignal = (q as any).abortSignal?.(signal)
    if (withSignal) q = withSignal
  }

  const { data, error } = await q
  if (error) {
    if (signal?.aborted || isQuietError(error)) return { start: null, end: null }
    return { start: null, end: null }
  }

  const row = data as TimePeriodBoundsRow | null
  return {
    start: row?.input_start_date ?? null,
    end: row?.input_end_date ?? null,
  }
}

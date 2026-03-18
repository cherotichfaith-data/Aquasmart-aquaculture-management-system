import type { Database } from "@/lib/types/database"
import { periodMap, type TimePeriod } from "@/lib/time-period"

export type AnalyticsTimeScope =
  | "dashboard"
  | "inventory"
  | "production"
  | "water_quality"
  | "feeding"
  | "feed_inventory"

export type TimeBounds = {
  start: string | null
  end: string | null
  anchorScope?: string | null
  latestAvailableDate?: string | null
  availableFromDate?: string | null
  requestedDays?: number | null
  availableDays?: number | null
  resolvedDays?: number | null
  stalenessDays?: number | null
  isTruncated?: boolean | null
}

type RpcClient = {
  rpc: (fn: string, args?: Record<string, unknown>) => any
}

type LegacyTimePeriodBoundsRow = {
  input_start_date: string | null
  input_end_date: string | null
}

type ScopedTimePeriodBoundsRow = LegacyTimePeriodBoundsRow & {
  anchor_scope: string | null
  latest_available_date: string | null
  available_from_date: string | null
  requested_days: number | null
  available_days: number | null
  resolved_days: number | null
  staleness_days: number | null
  is_truncated: boolean | null
}

const isMissingScopedTimeBoundsRpc = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false
  const err = error as { code?: string; message?: string }
  if (err.code === "42883" || err.code === "42P01") return true
  const message = String(err.message ?? "").toLowerCase()
  return message.includes("does not exist") || message.includes("schema cache")
}

const withAbortSignal = (query: any, signal?: AbortSignal) => {
  if (!signal || typeof query?.abortSignal !== "function") return query
  return query.abortSignal(signal)
}

export async function fetchTimePeriodBounds(
  supabase: RpcClient,
  params: {
    farmId: string
    timePeriod: TimePeriod
    scope?: AnalyticsTimeScope
    signal?: AbortSignal
  },
): Promise<TimeBounds> {
  const scope = params.scope ?? "dashboard"
  const scopedPayload: Database["public"]["Functions"]["api_time_period_bounds_scoped"]["Args"] = {
    p_farm_id: params.farmId,
    p_time_period: periodMap[params.timePeriod],
    p_scope: scope,
  }

  let scopedQuery = withAbortSignal(
    (supabase.rpc as any)("api_time_period_bounds_scoped", scopedPayload).maybeSingle(),
    params.signal,
  )

  const scopedResult = await scopedQuery
  if (!scopedResult.error) {
    const row = scopedResult.data as ScopedTimePeriodBoundsRow | null
    return {
      start: row?.input_start_date ?? null,
      end: row?.input_end_date ?? null,
      anchorScope: row?.anchor_scope ?? null,
      latestAvailableDate: row?.latest_available_date ?? null,
      availableFromDate: row?.available_from_date ?? null,
      requestedDays: row?.requested_days ?? null,
      availableDays: row?.available_days ?? null,
      resolvedDays: row?.resolved_days ?? null,
      stalenessDays: row?.staleness_days ?? null,
      isTruncated: row?.is_truncated ?? null,
    }
  }

  if (!isMissingScopedTimeBoundsRpc(scopedResult.error)) {
    return { start: null, end: null }
  }

  let legacyQuery = withAbortSignal(
    supabase
      .rpc("api_time_period_bounds", {
        p_farm_id: params.farmId,
        p_time_period: periodMap[params.timePeriod],
      })
      .maybeSingle(),
    params.signal,
  )

  const legacyResult = await legacyQuery
  if (legacyResult.error) {
    return { start: null, end: null }
  }

  const row = legacyResult.data as LegacyTimePeriodBoundsRow | null
  return {
    start: row?.input_start_date ?? null,
    end: row?.input_end_date ?? null,
    anchorScope: scope,
  }
}

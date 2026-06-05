// ─── Client-side API calls for analytics layer RPCs ──────────────────────────

import type { QueryResult } from "@/lib/supabase-client"
import { getClientOrError, isAbortLikeError, toQueryError, toQuerySuccess } from "@/lib/api/_utils"
import { createAccessTokenClient } from "@/lib/supabase/access-token-client"
import { createClient } from "@/lib/supabase/client"
import { isSbAuthMissing, isSbPermissionDenied } from "@/lib/supabase/log"
import type {
  HarvestForecastRow,
  CycleBenchmarkRow,
  RecommendedActionRow,
  FcrIntervalRow,
  FeedRateRow,
} from "@/lib/types/insights"
import { getDashboardSystems } from "@/lib/api/dashboard"
import { toSystemsOverviewRows } from "@/features/dashboard/systems-overview"
import type { SystemsOverviewRow } from "@/features/dashboard/types"
import type { Database } from "@/lib/types/database"

export type EfcrTrendRow = Database["public"]["Functions"]["api_efcr_trend"]["Returns"][number]
type AnalyticsRpcName =
  | "api_harvest_forecast"
  | "api_cycle_benchmarks"
  | "api_recommended_actions"
  | "api_efcr_trend"
  | "api_feed_fcr_intervals"
  | "api_feed_rate_analysis"

const isQuietError = (err: unknown): boolean =>
  isAbortLikeError(err) || isSbPermissionDenied(err) || isSbAuthMissing(err)

async function getAuthenticatedClient(tag: string): Promise<
  | { supabase: ReturnType<typeof createClient> | ReturnType<typeof createAccessTokenClient> }
  | { error: QueryResult<never> }
> {
  return getClientOrError(`analytics:${tag}`, { requireSession: true })
}

// ── Shared RPC caller ─────────────────────────────────────────────────────────

async function callAnalyticsRpc<T, Name extends AnalyticsRpcName = AnalyticsRpcName>(params: {
  tag: string
  rpcName: Name
  args: Database["public"]["Functions"][Name]["Args"]
  signal?: AbortSignal
}): Promise<QueryResult<T>> {
  const clientResult = await getAuthenticatedClient(params.tag)
  if ("error" in clientResult) return clientResult.error as QueryResult<T>
  const { supabase } = clientResult

  let q = supabase.rpc(params.rpcName, params.args)
  if (params.signal) q = q.abortSignal(params.signal)

  const { data, error } = await q
  if (error) {
    if (isQuietError(error)) return toQuerySuccess<T>([])
    return toQueryError<T>(params.tag, error)
  }
  return toQuerySuccess<T>((data ?? []) as unknown as T[])
}

// ── System Health Scores ──────────────────────────────────────────────────────

// ── Harvest Forecast ──────────────────────────────────────────────────────────

export async function getHarvestForecast(params: {
  farmId: string
  systemId?: number
  signal?: AbortSignal
}): Promise<QueryResult<HarvestForecastRow>> {
  return callAnalyticsRpc<HarvestForecastRow>({
    tag: "getHarvestForecast",
    rpcName: "api_harvest_forecast",
    args: { p_farm_id: params.farmId, ...(params.systemId != null ? { p_system_id: params.systemId } : {}) },
    signal: params.signal,
  })
}



// ── Cycle Benchmarks ──────────────────────────────────────────────────────────

export async function getCycleBenchmarks(params: {
  farmId: string
  systemId?: number
  signal?: AbortSignal
}): Promise<QueryResult<CycleBenchmarkRow>> {
  return callAnalyticsRpc<CycleBenchmarkRow>({
    tag: "getCycleBenchmarks",
    rpcName: "api_cycle_benchmarks",
    args: { p_farm_id: params.farmId, ...(params.systemId != null ? { p_system_id: params.systemId } : {}) },
    signal: params.signal,
  })
}

// ── Recommended Actions ───────────────────────────────────────────────────────

export async function getRecommendedActions(params: {
  farmId: string
  systemId?: number | null
  signal?: AbortSignal
}): Promise<QueryResult<RecommendedActionRow>> {
  return callAnalyticsRpc<RecommendedActionRow>({
    tag: "getRecommendedActions",
    rpcName: "api_recommended_actions",
    args: { p_farm_id: params.farmId, ...(params.systemId != null ? { p_system_id: params.systemId } : {}) },
    signal: params.signal,
  })
}

// ── FCR Intervals ─────────────────────────────────────────────────────────────

export async function getEfcrTrend(params: {
  farmId: string
  systemId?: number
  dateFrom?: string
  dateTo?: string
  signal?: AbortSignal
}): Promise<QueryResult<EfcrTrendRow>> {
  return callAnalyticsRpc<EfcrTrendRow>({
    tag: "getEfcrTrend",
    rpcName: "api_efcr_trend",
    args: {
      p_farm_id: params.farmId,
      ...(params.systemId != null ? { p_system_id: params.systemId } : {}),
      ...(params.dateFrom ? { p_start_date: params.dateFrom } : {}),
      ...(params.dateTo ? { p_end_date: params.dateTo } : {}),
    },
    signal: params.signal,
  })
}

export async function getFcrIntervals(params: {
  farmId: string
  systemId?: number
  dateFrom?: string
  dateTo?: string
  signal?: AbortSignal
}): Promise<QueryResult<FcrIntervalRow>> {
  return callAnalyticsRpc<FcrIntervalRow>({
    tag: "getFcrIntervals",
    rpcName: "api_feed_fcr_intervals",
    args: {
      p_farm_id: params.farmId,
      ...(params.systemId != null ? { p_system_id: params.systemId } : {}),
      ...(params.dateFrom ? { p_date_from: params.dateFrom } : {}),
      ...(params.dateTo ? { p_date_to: params.dateTo } : {}),
    },
    signal: params.signal,
  })
}

// ── Feed Rate Analysis ────────────────────────────────────────────────────────

export async function getFeedRateAnalysis(params: {
  farmId: string
  systemId?: number | null
  dateFrom?: string
  dateTo?: string
  signal?: AbortSignal
}): Promise<QueryResult<FeedRateRow>> {
  return callAnalyticsRpc<FeedRateRow>({
    tag: "getFeedRateAnalysis",
    rpcName: "api_feed_rate_analysis",
    args: {
      p_farm_id: params.farmId,
      ...(params.systemId != null ? { p_system_id: params.systemId } : {}),
      ...(params.dateFrom ? { p_date_from: params.dateFrom } : {}),
      ...(params.dateTo ? { p_date_to: params.dateTo } : {}),
    },
    signal: params.signal,
  })
}

// ── KPI Coverage ──────────────────────────────────────────────────────────────

export async function fetchSystemsOverview(
  farmId?: string | null,
  signal?: AbortSignal,
): Promise<SystemsOverviewRow[]> {
  if (!farmId) return []

  const result = await getDashboardSystems({
    farmId,
    signal,
  })

  if (result.status !== "success") {
    throw new Error(result.error || "Unable to load systems overview")
  }

  return toSystemsOverviewRows(result.data)
}

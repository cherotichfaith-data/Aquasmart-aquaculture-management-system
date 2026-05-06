// ─── Client-side API calls for analytics layer RPCs ──────────────────────────

import type { QueryResult } from "@/lib/supabase-client"
import { getClientOrError, isAbortLikeError, toQueryError, toQuerySuccess } from "@/lib/api/_utils"
import { createAccessTokenClient } from "@/lib/supabase/access-token-client"
import { createClient } from "@/lib/supabase/client"
import { isSbAuthMissing, isSbPermissionDenied } from "@/lib/supabase/log"
import type {
  SystemHealthRow,
  HarvestForecastRow,
  FeedDemandRow,
  CycleBenchmarkRow,
  RecommendedActionRow,
  FcrIntervalRow,
  FeedRateRow,
  KpiCoverageRow,
} from "@/lib/types/insights"
import { normalizeSystemHealthRow } from "@/lib/health-grade"
import { getDashboardSystems } from "@/lib/api/dashboard"
import { toSystemsOverviewRows } from "@/features/dashboard/systems-overview"
import type { SystemsOverviewRow } from "@/features/dashboard/types"

const isQuietError = (err: unknown): boolean =>
  isAbortLikeError(err) || isSbPermissionDenied(err) || isSbAuthMissing(err)

async function getAuthenticatedClient(tag: string): Promise<
  | { supabase: ReturnType<typeof createClient> | ReturnType<typeof createAccessTokenClient> }
  | { error: QueryResult<never> }
> {
  return getClientOrError(`analytics:${tag}`, { requireSession: true })
}

// ── Shared RPC caller ─────────────────────────────────────────────────────────

async function callAnalyticsRpc<T>(params: {
  tag: string
  rpcName: string
  args: Record<string, unknown>
  signal?: AbortSignal
}): Promise<QueryResult<T>> {
  const clientResult = await getAuthenticatedClient(params.tag)
  if ("error" in clientResult) return clientResult.error as QueryResult<T>
  const { supabase } = clientResult

  let q = supabase.rpc(params.rpcName as never, params.args as never)
  if (params.signal) q = q.abortSignal(params.signal)

  const { data, error } = await q
  if (error) {
    if (isQuietError(error)) return toQuerySuccess<T>([])
    return toQueryError<T>(params.tag, error)
  }
  return toQuerySuccess<T>((data ?? []) as T[])
}

// ── System Health Scores ──────────────────────────────────────────────────────

export async function getSystemHealthScores(params: {
  farmId: string
  systemId?: number
  signal?: AbortSignal
}): Promise<QueryResult<SystemHealthRow>> {
  const result = await callAnalyticsRpc<SystemHealthRow>({
    tag: "getSystemHealthScores",
    rpcName: "api_system_health_score",
    args: { p_farm_id: params.farmId, ...(params.systemId != null ? { p_system_id: params.systemId } : {}) },
    signal: params.signal,
  })
  return result.status === "success"
    ? { ...result, data: result.data.map(normalizeSystemHealthRow) }
    : result
}

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

// ── Feed Demand Forecast ──────────────────────────────────────────────────────

export async function getFeedDemandForecast(params: {
  farmId: string
  daysAhead?: number
  signal?: AbortSignal
}): Promise<QueryResult<FeedDemandRow>> {
  return callAnalyticsRpc<FeedDemandRow>({
    tag: "getFeedDemandForecast",
    rpcName: "api_feed_demand_forecast",
    args: { p_farm_id: params.farmId, p_days_ahead: params.daysAhead ?? 14 },
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
  systemId?: number
  signal?: AbortSignal
}): Promise<QueryResult<RecommendedActionRow>> {
  return callAnalyticsRpc<RecommendedActionRow>({
    tag: "getRecommendedActions",
    rpcName: "api_recommended_actions",
    args: { p_farm_id: params.farmId, ...(params.systemId != null ? { p_system_id: params.systemId } : {}) },
    signal: params.signal,
  })
}

export async function getScopedRecommendedActions(params: {
  farmId: string
  systemIds?: number[] | null
  signal?: AbortSignal
}): Promise<QueryResult<RecommendedActionRow>> {
  if (!Array.isArray(params.systemIds)) {
    return getRecommendedActions({ farmId: params.farmId, signal: params.signal })
  }

  const systemIds = Array.from(
    new Set(params.systemIds.filter((systemId): systemId is number => typeof systemId === "number" && Number.isFinite(systemId))),
  )
  if (!systemIds.length) return toQuerySuccess<RecommendedActionRow>([])
  if (systemIds.length === 1) {
    return getRecommendedActions({ farmId: params.farmId, systemId: systemIds[0], signal: params.signal })
  }

  const results = await Promise.all(
    systemIds.map((systemId) => getRecommendedActions({ farmId: params.farmId, systemId, signal: params.signal })),
  )
  const rows = results.flatMap((result) => (result.status === "success" ? result.data : []))
  if (rows.length > 0) return toQuerySuccess<RecommendedActionRow>(rows)

  const firstError = results.find((result) => result.status === "error")
  return firstError ?? toQuerySuccess<RecommendedActionRow>([])
}

// ── FCR Intervals ─────────────────────────────────────────────────────────────

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
  systemId?: number
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

export async function getScopedFeedRateAnalysis(params: {
  farmId: string
  systemIds?: number[] | null
  dateFrom?: string
  dateTo?: string
  signal?: AbortSignal
}): Promise<QueryResult<FeedRateRow>> {
  if (!Array.isArray(params.systemIds)) {
    return getFeedRateAnalysis({
      farmId: params.farmId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      signal: params.signal,
    })
  }

  const systemIds = Array.from(
    new Set(params.systemIds.filter((systemId): systemId is number => typeof systemId === "number" && Number.isFinite(systemId))),
  )
  if (!systemIds.length) return toQuerySuccess<FeedRateRow>([])
  if (systemIds.length === 1) {
    return getFeedRateAnalysis({
      farmId: params.farmId,
      systemId: systemIds[0],
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      signal: params.signal,
    })
  }

  const results = await Promise.all(
    systemIds.map((systemId) =>
      getFeedRateAnalysis({
        farmId: params.farmId,
        systemId,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        signal: params.signal,
      }),
    ),
  )
  const rows = results.flatMap((result) => (result.status === "success" ? result.data : []))
  if (rows.length > 0) return toQuerySuccess<FeedRateRow>(rows)

  const firstError = results.find((result) => result.status === "error")
  return firstError ?? toQuerySuccess<FeedRateRow>([])
}

// ── KPI Coverage ──────────────────────────────────────────────────────────────

export async function getKpiCoverage(params: {
  farmId: string
  dateFrom?: string
  dateTo?: string
  signal?: AbortSignal
}): Promise<QueryResult<KpiCoverageRow>> {
  return callAnalyticsRpc<KpiCoverageRow>({
    tag: "getKpiCoverage",
    rpcName: "api_kpi_coverage",
    args: {
      p_farm_id: params.farmId,
      ...(params.dateFrom ? { p_date_from: params.dateFrom } : {}),
      ...(params.dateTo   ? { p_date_to:   params.dateTo   } : {}),
    },
    signal: params.signal,
  })
}

export async function fetchSystemsOverview(
  farmId?: string | null,
  signal?: AbortSignal,
): Promise<SystemsOverviewRow[]> {
  if (!farmId) return []

  const result = await getDashboardSystems({
    farmId,
    allowFallback: true,
    signal,
  })

  if (result.status !== "success") {
    throw new Error(result.error || "Unable to load systems overview")
  }

  return toSystemsOverviewRows(result.data)
}

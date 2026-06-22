import type { Database } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import {
  getClientOrError,
  isAbortLikeError,
  queryKpiRpc,
  toQueryError,
  toQuerySuccess,
} from "@/lib/api/_utils"

type FeedDashboardKpisRow = Database["public"]["Functions"]["api_feed_dashboard_kpis"]["Returns"][number]
type FeedPlanVsActualRow = Database["public"]["Functions"]["api_feed_plan_vs_actual"]["Returns"][number]
type SystemFeedStatusRow = Database["public"]["Functions"]["api_system_feed_status"]["Returns"][number]
type FeedEfcrTrendRow = Database["public"]["Functions"]["api_feed_efcr_trend"]["Returns"][number]
type FeedingRateVsTargetRow = Database["public"]["Functions"]["api_feeding_rate_vs_target"]["Returns"][number]
type FeedingResponseDistributionRow =
  Database["public"]["Functions"]["api_feeding_response_distribution"]["Returns"][number]
type FeedVsBiomassGainRow = Database["public"]["Functions"]["api_feed_vs_biomass_gain"]["Returns"][number]
type FeedingAlertRow = Database["public"]["Functions"]["api_feeding_alerts"]["Returns"][number]

const isQuietError = (err: unknown): boolean => isAbortLikeError(err)

const empty = <T,>(): QueryResult<T> => toQuerySuccess<T>([])

function buildScopedArgs(params?: {
  farmId?: string | null
  systemIds?: number[] | null
  dateFrom?: string | null
  dateTo?: string | null
}) {
  return {
    p_farm_id: params?.farmId ?? null,
    p_system_ids:
      params?.systemIds && params.systemIds.length > 0
        ? params.systemIds.filter((id) => Number.isFinite(id))
        : null,
    p_start_date: params?.dateFrom ?? null,
    p_end_date: params?.dateTo ?? null,
  }
}

async function queryFeedRpc<Row>(
  rpcName:
    | "api_feed_dashboard_kpis"
    | "api_feed_plan_vs_actual"
    | "api_system_feed_status"
    | "api_feed_efcr_trend"
    | "api_feeding_rate_vs_target"
    | "api_feeding_response_distribution"
    | "api_feed_vs_biomass_gain"
    | "api_feeding_alerts",
  params?: {
    farmId?: string | null
    systemIds?: number[] | null
    dateFrom?: string | null
    dateTo?: string | null
    signal?: AbortSignal
  },
): Promise<QueryResult<Row>> {
  if (!params?.farmId) return empty<Row>()

  const clientResult = await getClientOrError(`feed-management:${rpcName}`, { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = queryKpiRpc(supabase, rpcName, buildScopedArgs(params))
  if (params.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (isQuietError(error)) return empty<Row>()
    return toQueryError<Row>(`feed-management:${rpcName}`, error)
  }

  return toQuerySuccess<Row>((data ?? []) as Row[])
}

export async function getFeedDashboardKpis(params?: {
  farmId?: string | null
  systemIds?: number[] | null
  dateFrom?: string | null
  dateTo?: string | null
  signal?: AbortSignal
}): Promise<QueryResult<FeedDashboardKpisRow>> {
  return queryFeedRpc<FeedDashboardKpisRow>("api_feed_dashboard_kpis", params)
}

export async function getFeedPlanVsActual(params?: {
  farmId?: string | null
  systemIds?: number[] | null
  dateFrom?: string | null
  dateTo?: string | null
  signal?: AbortSignal
}): Promise<QueryResult<FeedPlanVsActualRow>> {
  return queryFeedRpc<FeedPlanVsActualRow>("api_feed_plan_vs_actual", params)
}

export async function getSystemFeedStatus(params?: {
  farmId?: string | null
  systemIds?: number[] | null
  dateFrom?: string | null
  dateTo?: string | null
  signal?: AbortSignal
}): Promise<QueryResult<SystemFeedStatusRow>> {
  return queryFeedRpc<SystemFeedStatusRow>("api_system_feed_status", params)
}

export async function getFeedEfcrTrend(params?: {
  farmId?: string | null
  systemIds?: number[] | null
  dateFrom?: string | null
  dateTo?: string | null
  signal?: AbortSignal
}): Promise<QueryResult<FeedEfcrTrendRow>> {
  return queryFeedRpc<FeedEfcrTrendRow>("api_feed_efcr_trend", params)
}

export async function getFeedingRateVsTarget(params?: {
  farmId?: string | null
  systemIds?: number[] | null
  dateFrom?: string | null
  dateTo?: string | null
  signal?: AbortSignal
}): Promise<QueryResult<FeedingRateVsTargetRow>> {
  return queryFeedRpc<FeedingRateVsTargetRow>("api_feeding_rate_vs_target", params)
}

export async function getFeedingResponseDistribution(params?: {
  farmId?: string | null
  systemIds?: number[] | null
  dateFrom?: string | null
  dateTo?: string | null
  signal?: AbortSignal
}): Promise<QueryResult<FeedingResponseDistributionRow>> {
  return queryFeedRpc<FeedingResponseDistributionRow>("api_feeding_response_distribution", params)
}

export async function getFeedVsBiomassGain(params?: {
  farmId?: string | null
  systemIds?: number[] | null
  dateFrom?: string | null
  dateTo?: string | null
  signal?: AbortSignal
}): Promise<QueryResult<FeedVsBiomassGainRow>> {
  return queryFeedRpc<FeedVsBiomassGainRow>("api_feed_vs_biomass_gain", params)
}

export async function getFeedingAlerts(params?: {
  farmId?: string | null
  systemIds?: number[] | null
  dateFrom?: string | null
  dateTo?: string | null
  signal?: AbortSignal
}): Promise<QueryResult<FeedingAlertRow>> {
  return queryFeedRpc<FeedingAlertRow>("api_feeding_alerts", params)
}

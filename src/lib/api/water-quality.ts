import type { Database, Enums, Tables } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import {
  getClientOrError,
  isAbortLikeError,
  queryKpiRpc,
  queryOptionsView,
  toQueryError,
  toQuerySuccess,
} from "@/lib/api/_utils"
import { isSbAuthMissing, isSbPermissionDenied } from "@/lib/supabase/log"

type OverlayRow = Database["public"]["Functions"]["api_daily_overlay"]["Returns"][number]
type LatestStatusRow = Database["public"]["Functions"]["api_latest_water_quality_status"]["Returns"][number]
type SyncStatusRow = Database["public"]["Functions"]["api_water_quality_sync_status"]["Returns"][number]

type MeasurementRow = Tables<"api_water_quality_measurements">
type DailyRatingRow = Tables<"api_daily_water_quality_rating">
type ThresholdRow = Tables<"api_alert_thresholds">

const isQuietError = (err: unknown): boolean =>
  isAbortLikeError(err) || isSbPermissionDenied(err) || isSbAuthMissing(err)

const empty = <T,>(): QueryResult<T> => toQuerySuccess<T>([])

/** KPI RPC: latest system status snapshot (thresholds + rating + worst parameter) */
export async function getLatestWaterQualityStatus(params: {
  farmId: string
  systemId?: number
  signal?: AbortSignal
}): Promise<QueryResult<LatestStatusRow>> {
  const clientResult = await getClientOrError("getLatestWaterQualityStatus", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let q = queryKpiRpc(supabase, "api_latest_water_quality_status", {
    p_farm_id: params.farmId,
    p_system_id: params.systemId ?? undefined,
  })
  if (params.signal) q = q.abortSignal(params.signal)

  const { data, error } = await q
  if (error) {
    if (params.signal?.aborted || isQuietError(error)) return empty<LatestStatusRow>()
    return toQueryError("getLatestWaterQualityStatus", error)
  }

  return toQuerySuccess<LatestStatusRow>((data ?? []) as LatestStatusRow[])
}

/** KPI RPC: sync status for latest measurement vs rating date */
export async function getWaterQualitySyncStatus(params: {
  farmId: string
  signal?: AbortSignal
}): Promise<QueryResult<SyncStatusRow>> {
  const clientResult = await getClientOrError("getWaterQualitySyncStatus", { requireSession: true })
  if ("error" in clientResult) return empty<SyncStatusRow>()
  const { supabase } = clientResult

  let q = queryKpiRpc(supabase, "api_water_quality_sync_status", { p_farm_id: params.farmId })
  if (params.signal) q = q.abortSignal(params.signal)

  const { data, error } = await q
  if (error) {
    if (params.signal?.aborted || isQuietError(error)) return empty<SyncStatusRow>()
    return toQueryError("getWaterQualitySyncStatus", error)
  }

  return toQuerySuccess<SyncStatusRow>((data ?? []) as SyncStatusRow[])
}

/** PostgREST view: raw measurements */
export async function getWaterQualityMeasurements(params: {
  farmId: string
  systemId?: number
  dateFrom?: string
  dateTo?: string
  parameterName?: Enums<"water_quality_parameters"> | string
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<MeasurementRow>> {
  const clientResult = await getClientOrError("getWaterQualityMeasurements", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let q = queryOptionsView(supabase, "api_water_quality_measurements")
    .select("*")
    .eq("farm_id", params.farmId)
    .order("date", { ascending: true })
    .order("time", { ascending: true })

  if (params.systemId) q = q.eq("system_id", params.systemId)
  if (params.dateFrom) q = q.gte("date", params.dateFrom)
  if (params.dateTo) q = q.lte("date", params.dateTo)
  if (params.parameterName) q = q.eq("parameter_name", params.parameterName as Enums<"water_quality_parameters">)
  if (params.limit) q = q.limit(params.limit)
  if (params.signal) q = q.abortSignal(params.signal)

  const { data, error } = await q
  if (error) {
    if (params.signal?.aborted || isQuietError(error)) return empty<MeasurementRow>()
    return toQueryError("getWaterQualityMeasurements", error)
  }

  return toQuerySuccess<MeasurementRow>((data ?? []) as MeasurementRow[])
}

/** PostgREST view: daily rating history */
export async function getDailyWaterQualityRating(params: {
  farmId: string
  systemId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<DailyRatingRow>> {
  const clientResult = await getClientOrError("getDailyWaterQualityRating", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let q = queryOptionsView(supabase, "api_daily_water_quality_rating")
    .select("*")
    .eq("farm_id", params.farmId)
    .order("rating_date", { ascending: true })

  if (params.systemId) q = q.eq("system_id", params.systemId)
  if (params.dateFrom) q = q.gte("rating_date", params.dateFrom)
  if (params.dateTo) q = q.lte("rating_date", params.dateTo)
  if (params.limit) q = q.limit(params.limit)
  if (params.signal) q = q.abortSignal(params.signal)

  const { data, error } = await q
  if (error) {
    if (params.signal?.aborted || isQuietError(error)) return empty<DailyRatingRow>()
    return toQueryError("getDailyWaterQualityRating", error)
  }

  return toQuerySuccess<DailyRatingRow>((data ?? []) as DailyRatingRow[])
}

/** PostgREST view: thresholds (system/farm/default resolved) */
export async function getAlertThresholds(params: {
  farmId: string
  signal?: AbortSignal
}): Promise<QueryResult<ThresholdRow>> {
  const clientResult = await getClientOrError("getAlertThresholds", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let q = queryOptionsView(supabase, "api_alert_thresholds").select("*").eq("farm_id", params.farmId)
  if (params.signal) q = q.abortSignal(params.signal)

  const { data, error } = await q
  if (error) {
    if (params.signal?.aborted || isQuietError(error)) return empty<ThresholdRow>()
    return toQueryError("getAlertThresholds", error)
  }

  return toQuerySuccess<ThresholdRow>((data ?? []) as ThresholdRow[])
}

/** KPI RPC: daily overlay (feed + mortality series) */
export async function getDailyOverlay(params: {
  farmId: string
  systemId?: number
  dateFrom?: string
  dateTo?: string
  signal?: AbortSignal
}): Promise<QueryResult<OverlayRow>> {
  const clientResult = await getClientOrError("getDailyOverlay", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let q = queryKpiRpc(supabase, "api_daily_overlay", {
    p_farm_id: params.farmId,
    p_system_id: params.systemId ?? undefined,
    p_start_date: params.dateFrom ?? undefined,
    p_end_date: params.dateTo ?? undefined,
  })
  if (params.signal) q = q.abortSignal(params.signal)

  const { data, error } = await q
  if (error) {
    if (params.signal?.aborted || isQuietError(error)) return empty<OverlayRow>()
    return toQueryError("getDailyOverlay", error)
  }

  return toQuerySuccess<OverlayRow>((data ?? []) as OverlayRow[])
}

// Backward-compatible alias used in existing modules.
export async function getWaterQualityRatings(params: {
  farmId?: string | null
  systemId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  signal?: AbortSignal
}) {
  if (!params.farmId) return empty<DailyRatingRow>()
  return getDailyWaterQualityRating({
    farmId: params.farmId,
    systemId: params.systemId,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    limit: params.limit,
    signal: params.signal,
  })
}

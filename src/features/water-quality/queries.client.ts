"use client"

import type { Database, Enums, Tables } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import type { WaterQualityLatestStatusRow } from "@/features/water-quality/types"
import {
  getClientOrError,
  isAbortLikeError,
  queryKpiRpc,
  queryOptionsView,
  toQueryError,
  toQuerySuccess,
} from "@/lib/supabase/query-transport"
import { isSbAuthMissing, isSbPermissionDenied } from "@/lib/supabase/log"
import { toRpcDate, toRpcSystemId } from "@/lib/rpc-params"

type LatestStatusRpcRow = Database["public"]["Functions"]["api_latest_water_quality_status"]["Returns"][number]
export type WaterQualityTrendRow = Database["public"]["Functions"]["api_water_quality_trend"]["Returns"][number]
export type WaterQualityIndexRow = {
  system_id: number
  system_name: string | null
  wqi_score: number | null
}

type MeasurementRow = Tables<"api_water_quality_measurements">
type DailyRatingRow = Tables<"api_daily_water_quality_rating">
type ThresholdRow = Tables<"api_alert_thresholds">

const isQuietError = (err: unknown): boolean =>
  isAbortLikeError(err) || isSbPermissionDenied(err) || isSbAuthMissing(err)

const empty = <T,>(): QueryResult<T> => toQuerySuccess<T>([])

function normalizeLatestStatusRow(row: LatestStatusRpcRow): WaterQualityLatestStatusRow {
  const normalizedWorstParameter = String(row.worst_parameter ?? "").toLowerCase()
  return {
    ...row,
    do_exceeded: normalizedWorstParameter === "dissolved_oxygen",
    ammonia_exceeded: normalizedWorstParameter === "ammonia",
    low_do_threshold: null,
  }
}

export async function getLatestWaterQualityStatus(params: {
  farmId: string
  systemId?: number
  signal?: AbortSignal
}): Promise<QueryResult<WaterQualityLatestStatusRow>> {
  const clientResult = await getClientOrError("getLatestWaterQualityStatus", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let q = queryKpiRpc(supabase, "api_latest_water_quality_status", {
    p_farm_id: params.farmId,
    p_system_id: toRpcSystemId(params.systemId),
  })
  if (params.signal) q = q.abortSignal(params.signal)

  const { data, error } = await q
  if (error) {
    if (params.signal?.aborted || isQuietError(error)) return empty<WaterQualityLatestStatusRow>()
    return toQueryError("getLatestWaterQualityStatus", error)
  }

  return toQuerySuccess<WaterQualityLatestStatusRow>(((data ?? []) as LatestStatusRpcRow[]).map(normalizeLatestStatusRow))
}

export async function getWaterQualityMeasurements(params: {
  farmId: string
  systemId?: number
  dateFrom?: string
  dateTo?: string
  waterDepth?: number
  parameterName?: Enums<"water_quality_parameters"> | string
  limit?: number
  latestFirst?: boolean
  signal?: AbortSignal
}): Promise<QueryResult<MeasurementRow>> {
  const clientResult = await getClientOrError("getWaterQualityMeasurements", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let q = queryOptionsView(supabase, "api_water_quality_measurements")
    .select("*")
    .eq("farm_id", params.farmId)
    .order("date", { ascending: !params.latestFirst })
    .order("time", { ascending: !params.latestFirst })

  if (params.systemId) q = q.eq("system_id", params.systemId)
  if (params.dateFrom) q = q.gte("date", params.dateFrom)
  if (params.dateTo) q = q.lte("date", params.dateTo)
  if (typeof params.waterDepth === "number" && Number.isFinite(params.waterDepth)) {
    q = q.eq("water_depth", params.waterDepth)
  }
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

export async function getAlertThresholds(params: {
  farmId: string
  signal?: AbortSignal
}): Promise<QueryResult<ThresholdRow>> {
  const clientResult = await getClientOrError("getAlertThresholds", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult
  let q = supabase.from("alert_threshold").select("*").or(`farm_id.eq.${params.farmId},scope.eq.default`)
  if (params.signal) q = q.abortSignal(params.signal)
  const { data, error } = await q
  if (error) {
    if (params.signal?.aborted || isQuietError(error)) return empty<ThresholdRow>()
    return toQueryError("getAlertThresholds", error)
  }

  return toQuerySuccess<ThresholdRow>((data ?? []) as unknown as ThresholdRow[])
}

export async function getWaterQualityTrend(params: {
  farmId: string
  systemId?: number
  dateFrom?: string
  dateTo?: string
  signal?: AbortSignal
}): Promise<QueryResult<WaterQualityTrendRow>> {
  const clientResult = await getClientOrError("getWaterQualityTrend", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let q = queryKpiRpc(supabase, "api_water_quality_trend", {
    p_farm_id: params.farmId,
    p_system_id: toRpcSystemId(params.systemId),
    p_start_date: toRpcDate(params.dateFrom),
    p_end_date: toRpcDate(params.dateTo),
  })
  if (params.signal) q = q.abortSignal(params.signal)

  const { data, error } = await q
  if (error) {
    if (params.signal?.aborted || isQuietError(error)) return empty<WaterQualityTrendRow>()
    return toQueryError("getWaterQualityTrend", error)
  }

  return toQuerySuccess<WaterQualityTrendRow>((data ?? []) as WaterQualityTrendRow[])
}

export async function getWaterQualityIndex(params: {
  farmId: string
  systemId?: number
  dateFrom?: string
  dateTo?: string
  signal?: AbortSignal
}): Promise<QueryResult<WaterQualityIndexRow>> {
  const clientResult = await getClientOrError("getWaterQualityIndex", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let q = queryKpiRpc(supabase, "api_water_quality_index", {
    p_farm_id: params.farmId,
    p_system_id: toRpcSystemId(params.systemId),
    p_start_date: toRpcDate(params.dateFrom),
    p_end_date: toRpcDate(params.dateTo),
  })
  if (params.signal) q = q.abortSignal(params.signal)

  const { data, error } = await q
  if (error) {
    if (params.signal?.aborted || isQuietError(error)) return empty<WaterQualityIndexRow>()
    return toQueryError("getWaterQualityIndex", error)
  }

  return toQuerySuccess<WaterQualityIndexRow>((data ?? []) as WaterQualityIndexRow[])
}

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

import type { Database, Enums, Tables, TablesInsert } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import { getClientOrError, toQueryError, toQuerySuccess } from "@/lib/api/_utils"

type AsOfRow = Database["public"]["Functions"]["api_water_quality_as_of"]["Returns"][number]
type WqStatusRow = Database["public"]["Functions"]["api_water_quality_status"]["Returns"][number]

type MeasurementRow = Tables<"api_water_quality_measurements">
type DailyRatingRow = Tables<"api_daily_water_quality_rating">
type LatestRatingRow = Tables<"api_latest_water_quality_rating">
type ThresholdRow = Tables<"api_alert_thresholds">

type OverlayRow = Database["public"]["Functions"]["api_daily_overlay"]["Returns"][number]

export async function getWaterQualityAsOf(params: {
  farmId: string
  signal?: AbortSignal
}): Promise<QueryResult<AsOfRow | null>> {
  const clientResult = await getClientOrError("getWaterQualityAsOf", { requireSession: true })
  if ("error" in clientResult) return toQuerySuccess<AsOfRow | null>([null])
  const { supabase } = clientResult

  let q = supabase.rpc("api_water_quality_as_of", { p_farm_id: params.farmId })
  if (params.signal) q = q.abortSignal(params.signal)

  const { data, error } = await q
  if (error) return toQueryError("getWaterQualityAsOf", error)

  return toQuerySuccess<AsOfRow | null>([(data?.[0] as AsOfRow) ?? null])
}

export async function getWaterQualityStatus(params: {
  farmId: string
  systemId?: number
  signal?: AbortSignal
}): Promise<QueryResult<WqStatusRow>> {
  const clientResult = await getClientOrError("getWaterQualityStatus", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let q = supabase.rpc("api_water_quality_status", {
    p_farm_id: params.farmId,
    p_system_id: params.systemId ?? undefined,
  })
  if (params.signal) q = q.abortSignal(params.signal)

  const { data, error } = await q
  if (error) return toQueryError("getWaterQualityStatus", error)

  return toQuerySuccess<WqStatusRow>((data ?? []) as WqStatusRow[])
}

export async function getWaterQualityMeasurements(params: {
  farmId: string
  systemId?: number
  dateFrom?: string
  dateTo?: string
  parameterName?: string
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<MeasurementRow>> {
  const clientResult = await getClientOrError("getWaterQualityMeasurements", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let q = supabase
    .from("api_water_quality_measurements")
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
  if (error) return toQueryError("getWaterQualityMeasurements", error)

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

  let q = supabase
    .from("api_daily_water_quality_rating")
    .select("*")
    .eq("farm_id", params.farmId)
    .order("rating_date", { ascending: true })

  if (params.systemId) q = q.eq("system_id", params.systemId)
  if (params.dateFrom) q = q.gte("rating_date", params.dateFrom)
  if (params.dateTo) q = q.lte("rating_date", params.dateTo)
  if (params.limit) q = q.limit(params.limit)
  if (params.signal) q = q.abortSignal(params.signal)

  const { data, error } = await q
  if (error) return toQueryError("getDailyWaterQualityRating", error)

  return toQuerySuccess<DailyRatingRow>((data ?? []) as DailyRatingRow[])
}

export async function getLatestWaterQualityRating(params: {
  farmId: string
  systemId?: number
  signal?: AbortSignal
}): Promise<QueryResult<LatestRatingRow>> {
  const clientResult = await getClientOrError("getLatestWaterQualityRating", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let q = supabase
    .from("api_latest_water_quality_rating")
    .select("*")
    .eq("farm_id", params.farmId)

  if (params.systemId) q = q.eq("system_id", params.systemId)
  if (params.signal) q = q.abortSignal(params.signal)

  const { data, error } = await q
  if (error) return toQueryError("getLatestWaterQualityRating", error)

  return toQuerySuccess<LatestRatingRow>((data ?? []) as LatestRatingRow[])
}

export async function getAlertThresholds(params: {
  farmId: string
  signal?: AbortSignal
}): Promise<QueryResult<ThresholdRow>> {
  const clientResult = await getClientOrError("getAlertThresholds", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let q = supabase.from("api_alert_thresholds").select("*").eq("farm_id", params.farmId)
  if (params.signal) q = q.abortSignal(params.signal)

  const { data, error } = await q
  if (error) return toQueryError("getAlertThresholds", error)
  return toQuerySuccess<ThresholdRow>((data ?? []) as ThresholdRow[])
}

export async function upsertFarmThreshold(params: {
  farmId: string
  low_do_threshold?: number | null
  high_ammonia_threshold?: number | null
  high_mortality_threshold?: number | null
}): Promise<QueryResult<Tables<"alert_threshold">>> {
  const clientResult = await getClientOrError("upsertFarmThreshold", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  const payload: TablesInsert<"alert_threshold"> = {
    scope: "farm",
    farm_id: params.farmId,
    low_do_threshold: params.low_do_threshold ?? null,
    high_ammonia_threshold: params.high_ammonia_threshold ?? null,
    high_mortality_threshold: params.high_mortality_threshold ?? null,
  }

  const { data, error } = await supabase
    .from("alert_threshold")
    .upsert(payload, { onConflict: "scope,farm_id" })
    .select("*")
    .single()

  if (error) return toQueryError("upsertFarmThreshold", error)
  return toQuerySuccess<Tables<"alert_threshold">>([data as Tables<"alert_threshold">])
}

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

  let q = supabase.rpc("api_daily_overlay", {
    p_farm_id: params.farmId,
    p_system_id: params.systemId ?? undefined,
    p_start_date: params.dateFrom ?? undefined,
    p_end_date: params.dateTo ?? undefined,
  })
  if (params.signal) q = q.abortSignal(params.signal)

  const { data, error } = await q
  if (error) return toQueryError("getDailyOverlay", error)

  return toQuerySuccess<OverlayRow>((data ?? []) as OverlayRow[])
}

// Backward-compatible aliases used in existing modules.
export async function getWaterQualityRatings(params: {
  farmId?: string | null
  systemId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  signal?: AbortSignal
}) {
  if (!params.farmId) return toQuerySuccess<DailyRatingRow>([])
  return getDailyWaterQualityRating({
    farmId: params.farmId,
    systemId: params.systemId,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    limit: params.limit,
    signal: params.signal,
  })
}

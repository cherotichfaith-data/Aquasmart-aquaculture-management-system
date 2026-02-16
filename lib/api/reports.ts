import type { Enums, Tables } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import { getClientOrError, toQueryError, toQuerySuccess } from "@/lib/api/_utils"
import { isSbPermissionDenied } from "@/utils/supabase/log"

type FeedIncomingRow = Tables<"feed_incoming">
type FeedTypeRow = Tables<"api_feed_type_options">
type FeedingRecordRow = Tables<"feeding_record">
type FishHarvestRow = Tables<"fish_harvest">
type FishSamplingWeightRow = Tables<"fish_sampling_weight">
type FishMortalityRow = Tables<"fish_mortality">
type ChangeLogRow = Tables<"change_log">
type SuppliersRow = Tables<"suppliers">
type SystemRow = Tables<"system">
type WaterQualityMeasurementRow = Tables<"water_quality_measurement">
type FishTransferRow = Tables<"fish_transfer">
type FishStockingRow = Tables<"fish_stocking">

export type FeedIncomingWithType = FeedIncomingRow & { feed_type: FeedTypeRow | null }
export type FeedingRecordWithType = FeedingRecordRow & { feed_type: FeedTypeRow | null }

export async function getFeedIncomingWithType(params?: { limit?: number; signal?: AbortSignal }): Promise<QueryResult<FeedIncomingWithType>> {
  const clientResult = await getClientOrError("getFeedIncomingWithType")
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase.from("feed_incoming").select("*").order("date", { ascending: false })
  if (params?.limit) query = query.limit(params.limit)
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (isSbPermissionDenied(error)) {
      return toQuerySuccess<FeedIncomingWithType>([])
    }
    return toQueryError("getFeedIncomingWithType", error)
  }

  const rows = (data ?? []) as FeedIncomingRow[]
  const feedTypeIds = Array.from(
    new Set(rows.map((row) => row.feed_type_id).filter((id): id is number => typeof id === "number")),
  )

  let feedTypeMap = new Map<number, FeedTypeRow>()
  if (feedTypeIds.length > 0) {
    let feedQuery = supabase.from("api_feed_type_options").select("*").in("id", feedTypeIds)
    if (params?.signal) feedQuery = feedQuery.abortSignal(params.signal)
    const { data: feedData, error: feedError } = await feedQuery
    if (feedError) return toQueryError("getFeedIncomingWithType:feedTypes", feedError)
    ;(feedData ?? []).forEach((row) => {
      if (row.id == null) return
      feedTypeMap.set(row.id, row as FeedTypeRow)
    })
  }

  const mapped = rows.map((row) => ({
    ...row,
    feed_type: row.feed_type_id ? feedTypeMap.get(row.feed_type_id) ?? null : null,
  })) as FeedIncomingWithType[]

  return toQuerySuccess<FeedIncomingWithType>(mapped)
}

export async function getFeedTypes(params?: { limit?: number; signal?: AbortSignal }): Promise<QueryResult<FeedTypeRow>> {
  const clientResult = await getClientOrError("getFeedTypes")
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase.from("api_feed_type_options").select("*").order("label", { ascending: true })
  if (params?.limit) query = query.limit(params.limit)
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) return toQueryError("getFeedTypes", error)
  return toQuerySuccess<FeedTypeRow>(data as FeedTypeRow[])
}

export async function getFeedingRecords(params?: {
  systemId?: number
  batchId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<FeedingRecordWithType>> {
  const clientResult = await getClientOrError("getFeedingRecords")
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase.from("feeding_record").select("*")
  if (params?.systemId) query = query.eq("system_id", params.systemId)
  if (params?.batchId) query = query.eq("batch_id", params.batchId)
  if (params?.dateFrom) query = query.gte("date", params.dateFrom)
  if (params?.dateTo) query = query.lte("date", params.dateTo)
  query = query.order("date", { ascending: false })
  if (params?.limit) query = query.limit(params.limit)
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) return toQueryError("getFeedingRecords", error)

  const rows = (data ?? []) as FeedingRecordRow[]
  const feedTypeIds = Array.from(
    new Set(rows.map((row) => row.feed_type_id).filter((id): id is number => typeof id === "number")),
  )

  let feedTypeMap = new Map<number, FeedTypeRow>()
  if (feedTypeIds.length > 0) {
    let feedQuery = supabase.from("api_feed_type_options").select("*").in("id", feedTypeIds)
    if (params?.signal) feedQuery = feedQuery.abortSignal(params.signal)
    const { data: feedData, error: feedError } = await feedQuery
    if (feedError) return toQueryError("getFeedingRecords:feedTypes", feedError)
    ;(feedData ?? []).forEach((row) => {
      if (row.id == null) return
      feedTypeMap.set(row.id, row as FeedTypeRow)
    })
  }

  const mapped = rows.map((row) => ({
    ...row,
    feed_type: row.feed_type_id ? feedTypeMap.get(row.feed_type_id) ?? null : null,
  })) as FeedingRecordWithType[]

  return toQuerySuccess<FeedingRecordWithType>(mapped)
}

export async function getSuppliers(params?: { signal?: AbortSignal }): Promise<QueryResult<SuppliersRow>> {
  const clientResult = await getClientOrError("getSuppliers")
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase.from("suppliers").select("*").order("name", { ascending: true })
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) return toQueryError("getSuppliers", error)
  return toQuerySuccess<SuppliersRow>(data as SuppliersRow[])
}

export async function getHarvests(params?: {
  systemId?: number
  batchId?: number
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<FishHarvestRow>> {
  const clientResult = await getClientOrError("getHarvests")
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase.from("fish_harvest").select("*")
  if (params?.systemId) query = query.eq("system_id", params.systemId)
  if (params?.batchId) query = query.eq("batch_id", params.batchId)
  query = query.order("date", { ascending: false })
  if (params?.limit) query = query.limit(params.limit)
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) return toQueryError("getHarvests", error)
  return toQuerySuccess<FishHarvestRow>(data as FishHarvestRow[])
}

export async function getSamplingData(params?: {
  systemId?: number
  batchId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<FishSamplingWeightRow>> {
  const clientResult = await getClientOrError("getSamplingData")
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase.from("fish_sampling_weight").select("*")
  if (params?.systemId) query = query.eq("system_id", params.systemId)
  if (params?.batchId) query = query.eq("batch_id", params.batchId)
  if (params?.dateFrom) query = query.gte("date", params.dateFrom)
  if (params?.dateTo) query = query.lte("date", params.dateTo)
  query = query.order("date", { ascending: false })
  if (params?.limit) query = query.limit(params.limit)
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) return toQueryError("getSamplingData", error)
  return toQuerySuccess<FishSamplingWeightRow>(data as FishSamplingWeightRow[])
}

export async function getMortalityData(params?: {
  systemId?: number
  batchId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<FishMortalityRow>> {
  const clientResult = await getClientOrError("getMortalityData")
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase.from("fish_mortality").select("*")
  if (params?.systemId) query = query.eq("system_id", params.systemId)
  if (params?.batchId) query = query.eq("batch_id", params.batchId)
  if (params?.dateFrom) query = query.gte("date", params.dateFrom)
  if (params?.dateTo) query = query.lte("date", params.dateTo)
  query = query.order("date", { ascending: false })
  if (params?.limit) query = query.limit(params.limit)
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) return toQueryError("getMortalityData", error)
  return toQuerySuccess<FishMortalityRow>(data as FishMortalityRow[])
}

export async function getRecentActivities(params?: {
  tableName?: string
  changeType?: Enums<"change_type_enum">
  dateFrom?: string
  dateTo?: string
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<ChangeLogRow>> {
  const clientResult = await getClientOrError("getRecentActivities")
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase.from("change_log").select("*")
  if (params?.tableName) query = query.eq("table_name", params.tableName)
  if (params?.changeType) query = query.eq("change_type", params.changeType)
  if (params?.dateFrom) query = query.gte("change_time", params.dateFrom)
  if (params?.dateTo) query = query.lte("change_time", params.dateTo)
  query = query.order("change_time", { ascending: false })
  if (params?.limit) query = query.limit(params.limit)
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (isSbPermissionDenied(error) || error?.code === "42P01") {
      return toQuerySuccess<ChangeLogRow>([])
    }
    return toQuerySuccess<ChangeLogRow>([])
  }
  return toQuerySuccess<ChangeLogRow>(data as ChangeLogRow[])
}

async function getRecentRows<T>(
  table: string,
  orderColumn: string,
  signal?: AbortSignal,
  limit = 5,
): Promise<QueryResult<T>> {
  const clientResult = await getClientOrError(`getRecentRows:${table}`)
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase.from(table).select("*").order(orderColumn, { ascending: false }).limit(limit)
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query
  if (error) {
    if (isSbPermissionDenied(error)) {
      return toQuerySuccess<T>([])
    }
    return toQueryError(`getRecentRows:${table}`, error)
  }
  return toQuerySuccess<T>(data as T[])
}

export async function getRecentEntries(signal?: AbortSignal) {
  const [
    mortality,
    feeding,
    sampling,
    transfer,
    harvest,
    waterQuality,
    incomingFeed,
    stocking,
    systems,
  ] = await Promise.all([
    getRecentRows<FishMortalityRow>("fish_mortality", "date", signal),
    getRecentRows<FeedingRecordRow>("feeding_record", "date", signal),
    getRecentRows<FishSamplingWeightRow>("fish_sampling_weight", "date", signal),
    getRecentRows<FishTransferRow>("fish_transfer", "date", signal),
    getRecentRows<FishHarvestRow>("fish_harvest", "date", signal),
    getRecentRows<WaterQualityMeasurementRow>("water_quality_measurement", "date", signal),
    getRecentRows<FeedIncomingRow>("feed_incoming", "date", signal),
    getRecentRows<FishStockingRow>("fish_stocking", "date", signal),
    getRecentRows<SystemRow>("system", "created_at", signal),
  ])

  return {
    mortality,
    feeding,
    sampling,
    transfer,
    harvest,
    water_quality: waterQuality,
    incoming_feed: incomingFeed,
    stocking,
    systems,
  }
}

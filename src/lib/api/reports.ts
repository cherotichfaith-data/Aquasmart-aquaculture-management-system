import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, Enums, Tables } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import { getClientOrError, queryKpiRpc, toQueryError, toQuerySuccess } from "@/lib/api/_utils"
import { isSbAuthMissing, isSbPermissionDenied } from "@/lib/supabase/log"

type FeedIncomingRow = Tables<"feed_incoming">
type FeedTypeRow = Database["public"]["Functions"]["api_feed_type_options_rpc"]["Returns"][number]
type FarmKpisTodayRow = Database["public"]["Functions"]["get_farm_kpis_today"]["Returns"][number]
type FcrTrendRow = Database["public"]["Functions"]["get_fcr_trend"]["Returns"][number]
type GrowthTrendRow = Database["public"]["Functions"]["get_growth_trend"]["Returns"][number]
type RunningStockRow = Database["public"]["Functions"]["get_running_stock"]["Returns"][number]
type FeedingRecordRow = Tables<"feeding_record">
type FeedPlanRow = Tables<"feed_plan">
type FishHarvestRow = Tables<"fish_harvest">
type FishSamplingWeightRow = Tables<"fish_sampling_weight">
type FishMortalityRow = Tables<"fish_mortality">
type ChangeLogRow = Tables<"change_log">
type SystemRow = Tables<"system">
type WaterQualityMeasurementRow = Tables<"water_quality_measurement">
type FishTransferRow = Tables<"fish_transfer">
type FishStockingRow = Tables<"fish_stocking">
type ReportsClient = SupabaseClient<Database>
type RecentRowsTable =
  | "fish_mortality"
  | "feeding_record"
  | "fish_sampling_weight"
  | "fish_transfer"
  | "fish_harvest"
  | "water_quality_measurement"
  | "feed_incoming"
  | "fish_stocking"
  | "system"

export type FeedingRecordWithType = FeedingRecordRow & { feed_type: FeedTypeRow | null }
type FeedFarmKpisToday = FarmKpisTodayRow
export type FeedFcrTrendRow = FcrTrendRow
export type FeedGrowthTrendRow = GrowthTrendRow
export type FeedRunningStockRow = RunningStockRow
export type FeedPlan = FeedPlanRow

type FeedTypeProjection = {
  feed_type_id: number | null
  feed_label: string | null
  feed_line: string | null
  crude_protein_percentage: number | null
  crude_fat_percentage: number | null
  feed_category: string | null
  feed_pellet_size: string | null
}

type FeedingRecordJoinedRow = {
  id: number | null
  created_at: string | null
  date: string | null
  batch_id: number | null
  feed_type_id: number | null
  feeding_amount: number | null
  feeding_response: FeedingRecordRow["feeding_response"] | null
  system_id: number | null
  feed_type: Array<{
    id: number | null
    feed_line: string | null
    crude_protein_percentage: number | null
    crude_fat_percentage: number | null
    feed_category: string | null
    feed_pellet_size: string | null
  }> | null
}

const projectFeedType = (row: FeedTypeProjection | null | undefined): FeedTypeRow | null => {
  if (!row || typeof row.feed_type_id !== "number") return null

  return {
    id: row.feed_type_id,
    label: row.feed_label ?? row.feed_line ?? `Feed ${row.feed_type_id}`,
    feed_line: row.feed_line ?? row.feed_label ?? `Feed ${row.feed_type_id}`,
    crude_protein_percentage: row.crude_protein_percentage ?? 0,
    crude_fat_percentage: row.crude_fat_percentage ?? 0,
    feed_category: String(row.feed_category ?? ""),
    feed_pellet_size: String(row.feed_pellet_size ?? ""),
  }
}

const isAbortLikeError = (err: unknown): boolean => {
  if (!err) return false
  const e = err as { name?: string; message?: string }
  const name = String(e.name ?? "").toLowerCase()
  const message = String(e.message ?? "").toLowerCase()
  return name.includes("abort") || name.includes("cancel") || message.includes("abort") || message.includes("cancel")
}

export async function getFeedingRecords(params?: {
  systemId?: number
  systemIds?: number[]
  batchId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<FeedingRecordWithType>> {
  const clientResult = await getClientOrError("getFeedingRecords", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase.from("feeding_record").select(`
      id,
      created_at,
      date,
      batch_id,
      feed_type_id,
      feeding_amount,
      feeding_response,
      system_id,
      feed_type:feed_type_id (
        id,
        feed_line,
        crude_protein_percentage,
        crude_fat_percentage,
        feed_category,
        feed_pellet_size
      )
    `)
  if (params?.systemId) {
    query = query.eq("system_id", params.systemId)
  } else if (params?.systemIds && params.systemIds.length > 0) {
    query = query.in("system_id", params.systemIds)
  }
  if (params?.batchId) query = query.eq("batch_id", params.batchId)
  if (params?.dateFrom) query = query.gte("date", params.dateFrom)
  if (params?.dateTo) query = query.lte("date", params.dateTo)
  query = query.order("date", { ascending: false })
  if (params?.limit) query = query.limit(params.limit)
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (params?.signal?.aborted || isAbortLikeError(error) || isSbPermissionDenied(error) || isSbAuthMissing(error)) {
      return toQuerySuccess<FeedingRecordWithType>([])
    }
    return toQueryError("getFeedingRecords", error)
  }

  const mapped = ((data ?? []) as unknown as FeedingRecordJoinedRow[]).map((row) => ({
    id: row.id,
    created_at: row.created_at,
    date: row.date,
    batch_id: row.batch_id,
    feed_type_id: row.feed_type_id,
    feeding_amount: row.feeding_amount,
    feeding_response: row.feeding_response,
    system_id: row.system_id,
    feed_type: projectFeedType(
      row.feed_type?.[0]
        ? {
            feed_type_id: row.feed_type[0].id,
            feed_label: row.feed_type[0].feed_line,
            feed_line: row.feed_type[0].feed_line,
            crude_protein_percentage: row.feed_type[0].crude_protein_percentage,
            crude_fat_percentage: row.feed_type[0].crude_fat_percentage,
            feed_category: row.feed_type[0].feed_category,
            feed_pellet_size: row.feed_type[0].feed_pellet_size,
          }
        : null,
    ),
  })) as FeedingRecordWithType[]

  return toQuerySuccess<FeedingRecordWithType>(mapped)
}

export async function getFarmKpisToday(params: {
  farmId?: string | null
  signal?: AbortSignal
}): Promise<QueryResult<FeedFarmKpisToday>> {
  if (!params.farmId) {
    return toQuerySuccess<FeedFarmKpisToday>([])
  }

  const clientResult = await getClientOrError("getFarmKpisToday", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = queryKpiRpc(supabase, "get_farm_kpis_today", { p_farm_id: params.farmId })
  if (params.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (params.signal?.aborted || isAbortLikeError(error)) return toQuerySuccess<FeedFarmKpisToday>([])
  if (error && (isSbPermissionDenied(error) || isSbAuthMissing(error))) {
    return toQuerySuccess<FeedFarmKpisToday>([])
  }
  if (error) return toQueryError("getFarmKpisToday", error)

  return toQuerySuccess<FeedFarmKpisToday>((data ?? []) as FeedFarmKpisToday[])
}

export async function getRunningStock(params: {
  farmId?: string | null
  signal?: AbortSignal
}): Promise<QueryResult<FeedRunningStockRow>> {
  if (!params.farmId) {
    return toQuerySuccess<FeedRunningStockRow>([])
  }

  const clientResult = await getClientOrError("getRunningStock", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = queryKpiRpc(supabase, "get_running_stock", { p_farm_id: params.farmId })
  if (params.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (params.signal?.aborted || isAbortLikeError(error)) return toQuerySuccess<FeedRunningStockRow>([])
  if (error && (isSbPermissionDenied(error) || isSbAuthMissing(error))) {
    return toQuerySuccess<FeedRunningStockRow>([])
  }
  if (error) return toQueryError("getRunningStock", error)

  return toQuerySuccess<FeedRunningStockRow>((data ?? []) as FeedRunningStockRow[])
}

export async function getFeedPlans(params: {
  farmId?: string | null
  dateFrom?: string
  dateTo?: string
  signal?: AbortSignal
}): Promise<QueryResult<FeedPlanRow>> {
  if (!params.farmId) {
    return toQuerySuccess<FeedPlanRow>([])
  }

  const clientResult = await getClientOrError("getFeedPlans", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase
    .from("feed_plan")
    .select("*")
    .eq("farm_id", params.farmId)
    .eq("is_active", true)

  if (params.dateTo) {
    query = query.lte("effective_from", params.dateTo)
  }
  if (params.dateFrom) {
    query = query.or(`effective_to.is.null,effective_to.gte.${params.dateFrom}`)
  }
  if (params.signal) query = query.abortSignal(params.signal)
  query = query.order("effective_from", { ascending: false })

  const { data, error } = await query
  if (params.signal?.aborted || isAbortLikeError(error)) return toQuerySuccess<FeedPlanRow>([])
  if (error && (isSbPermissionDenied(error) || isSbAuthMissing(error))) {
    return toQuerySuccess<FeedPlanRow>([])
  }
  if (error) return toQueryError("getFeedPlans", error)

  return toQuerySuccess<FeedPlanRow>((data ?? []) as FeedPlanRow[])
}

export async function getFcrTrend(params: {
  farmId?: string | null
  systemId?: number
  days?: number
  signal?: AbortSignal
}): Promise<QueryResult<FeedFcrTrendRow>> {
  if (!params.farmId || !params.systemId) {
    return toQuerySuccess<FeedFcrTrendRow>([])
  }

  const clientResult = await getClientOrError("getFcrTrend", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = queryKpiRpc(supabase, "get_fcr_trend", {
    p_farm_id: params.farmId,
    p_system_id: params.systemId,
    p_days: params.days,
  })
  if (params.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (params.signal?.aborted || isAbortLikeError(error)) return toQuerySuccess<FeedFcrTrendRow>([])
  if (error && (isSbPermissionDenied(error) || isSbAuthMissing(error))) {
    return toQuerySuccess<FeedFcrTrendRow>([])
  }
  if (error) return toQueryError("getFcrTrend", error)

  return toQuerySuccess<FeedFcrTrendRow>((data ?? []) as FeedFcrTrendRow[])
}

export async function getGrowthTrend(params: {
  systemId?: number
  days?: number
  signal?: AbortSignal
}): Promise<QueryResult<FeedGrowthTrendRow>> {
  if (!params.systemId) {
    return toQuerySuccess<FeedGrowthTrendRow>([])
  }

  const clientResult = await getClientOrError("getGrowthTrend", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = queryKpiRpc(supabase, "get_growth_trend", {
    p_system_id: params.systemId,
    p_days: params.days,
  })
  if (params.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (params.signal?.aborted || isAbortLikeError(error)) return toQuerySuccess<FeedGrowthTrendRow>([])
  if (error && (isSbPermissionDenied(error) || isSbAuthMissing(error))) {
    return toQuerySuccess<FeedGrowthTrendRow>([])
  }
  if (error) return toQueryError("getGrowthTrend", error)

  return toQuerySuccess<FeedGrowthTrendRow>((data ?? []) as FeedGrowthTrendRow[])
}

export async function getHarvests(params?: {
  systemId?: number
  systemIds?: number[]
  batchId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<FishHarvestRow>> {
  const clientResult = await getClientOrError("getHarvests", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase.from("fish_harvest").select("*")
  if (params?.systemId) {
    query = query.eq("system_id", params.systemId)
  } else if (params?.systemIds && params.systemIds.length > 0) {
    query = query.in("system_id", params.systemIds)
  }
  if (params?.batchId) query = query.eq("batch_id", params.batchId)
  if (params?.dateFrom) query = query.gte("date", params.dateFrom)
  if (params?.dateTo) query = query.lte("date", params.dateTo)
  query = query.order("date", { ascending: false })
  if (params?.limit) query = query.limit(params.limit)
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (params?.signal?.aborted || isAbortLikeError(error) || isSbPermissionDenied(error) || isSbAuthMissing(error)) {
      return toQuerySuccess<FishHarvestRow>([])
    }
    return toQueryError("getHarvests", error)
  }
  return toQuerySuccess<FishHarvestRow>(data as FishHarvestRow[])
}

export async function getStockings(params?: {
  systemId?: number
  systemIds?: number[]
  batchId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<FishStockingRow>> {
  const clientResult = await getClientOrError("getStockings", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase.from("fish_stocking").select("*")
  if (params?.systemId) {
    query = query.eq("system_id", params.systemId)
  } else if (params?.systemIds && params.systemIds.length > 0) {
    query = query.in("system_id", params.systemIds)
  }
  if (params?.batchId) query = query.eq("batch_id", params.batchId)
  if (params?.dateFrom) query = query.gte("date", params.dateFrom)
  if (params?.dateTo) query = query.lte("date", params.dateTo)
  query = query.order("date", { ascending: false })
  if (params?.limit) query = query.limit(params.limit)
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (params?.signal?.aborted || isAbortLikeError(error) || isSbPermissionDenied(error) || isSbAuthMissing(error)) {
      return toQuerySuccess<FishStockingRow>([])
    }
    return toQueryError("getStockings", error)
  }
  return toQuerySuccess<FishStockingRow>(data as FishStockingRow[])
}

export async function getSamplingData(params?: {
  systemId?: number
  systemIds?: number[]
  batchId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<FishSamplingWeightRow>> {
  const clientResult = await getClientOrError("getSamplingData", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase.from("fish_sampling_weight").select("*")
  if (params?.systemId) {
    query = query.eq("system_id", params.systemId)
  } else if (params?.systemIds && params.systemIds.length > 0) {
    query = query.in("system_id", params.systemIds)
  }
  if (params?.batchId) query = query.eq("batch_id", params.batchId)
  if (params?.dateFrom) query = query.gte("date", params.dateFrom)
  if (params?.dateTo) query = query.lte("date", params.dateTo)
  query = query.order("date", { ascending: false })
  if (params?.limit) query = query.limit(params.limit)
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (params?.signal?.aborted || isAbortLikeError(error) || isSbPermissionDenied(error) || isSbAuthMissing(error)) {
      return toQuerySuccess<FishSamplingWeightRow>([])
    }
    return toQueryError("getSamplingData", error)
  }
  return toQuerySuccess<FishSamplingWeightRow>(data as FishSamplingWeightRow[])
}

export async function getMortalityData(params?: {
  systemId?: number
  systemIds?: number[]
  batchId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<FishMortalityRow>> {
  const clientResult = await getClientOrError("getMortalityData", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase.from("fish_mortality").select("*")
  if (params?.systemId) {
    query = query.eq("system_id", params.systemId)
  } else if (params?.systemIds && params.systemIds.length > 0) {
    query = query.in("system_id", params.systemIds)
  }
  if (params?.batchId) query = query.eq("batch_id", params.batchId)
  if (params?.dateFrom) query = query.gte("date", params.dateFrom)
  if (params?.dateTo) query = query.lte("date", params.dateTo)
  query = query.order("date", { ascending: false })
  if (params?.limit) query = query.limit(params.limit)
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (params?.signal?.aborted || isAbortLikeError(error) || isSbPermissionDenied(error) || isSbAuthMissing(error)) {
      return toQuerySuccess<FishMortalityRow>([])
    }
    return toQueryError("getMortalityData", error)
  }
  return toQuerySuccess<FishMortalityRow>(data as FishMortalityRow[])
}

export async function getTransferData(params?: {
  batchId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<FishTransferRow>> {
  const clientResult = await getClientOrError("getTransferData", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase.from("fish_transfer").select("*")
  if (params?.batchId) query = query.eq("batch_id", params.batchId)
  if (params?.dateFrom) query = query.gte("date", params.dateFrom)
  if (params?.dateTo) query = query.lte("date", params.dateTo)
  query = query.order("date", { ascending: false })
  if (params?.limit) query = query.limit(params.limit)
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (params?.signal?.aborted || isAbortLikeError(error) || isSbPermissionDenied(error) || isSbAuthMissing(error)) {
      return toQuerySuccess<FishTransferRow>([])
    }
    return toQueryError("getTransferData", error)
  }
  return toQuerySuccess<FishTransferRow>(data as FishTransferRow[])
}

export async function getRecentActivities(params?: {
  tableName?: string
  changeType?: Enums<"change_type_enum">
  dateFrom?: string
  dateTo?: string
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<ChangeLogRow>> {
  const clientResult = await getClientOrError("getRecentActivities", { requireSession: true })
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

const emptyRecentEntries = () => ({
  mortality: toQuerySuccess<FishMortalityRow>([]),
  feeding: toQuerySuccess<FeedingRecordRow>([]),
  sampling: toQuerySuccess<FishSamplingWeightRow>([]),
  transfer: toQuerySuccess<FishTransferRow>([]),
  harvest: toQuerySuccess<FishHarvestRow>([]),
  water_quality: toQuerySuccess<WaterQualityMeasurementRow>([]),
  incoming_feed: toQuerySuccess<FeedIncomingRow>([]),
  stocking: toQuerySuccess<FishStockingRow>([]),
  systems: toQuerySuccess<SystemRow>([]),
})

async function getFarmSystemIdsForRecent(
  supabase: ReportsClient,
  farmId: string,
  signal?: AbortSignal,
): Promise<number[]> {
  let query = supabase.from("system").select("id").eq("farm_id", farmId)
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query
  if (error) {
    throw error
  }
  return Array.from(
    new Set(
      (data ?? [])
        .map((row: { id: number | null }) => row.id)
        .filter((id): id is number => typeof id === "number" && Number.isFinite(id)),
    ),
  )
}

async function getRecentRows<T>(
  supabase: ReportsClient,
  table: RecentRowsTable,
  orderColumn: string,
  params: {
    farmId: string
    farmSystemIds: number[]
    signal?: AbortSignal
    limit?: number
  },
): Promise<QueryResult<T>> {
  const limit = params.limit ?? 5
  const { farmId, farmSystemIds, signal } = params

  if (!farmId) return toQuerySuccess<T>([])

  let query = supabase.from(table).select("*")
  switch (table) {
    case "fish_mortality":
      query = query.eq("farm_id", farmId)
      break
    case "feed_incoming":
    case "system":
      query = query.eq("farm_id", farmId)
      break
    case "fish_transfer": {
      if (farmSystemIds.length === 0) return toQuerySuccess<T>([])
      const systemList = farmSystemIds.join(",")
      query = query.or(`origin_system_id.in.(${systemList}),target_system_id.in.(${systemList})`)
      break
    }
    default:
      if (farmSystemIds.length === 0) return toQuerySuccess<T>([])
      query = query.in("system_id", farmSystemIds)
      break
  }

  query = query.order(orderColumn, { ascending: false }).limit(limit)
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query
  if (error) {
    if (signal?.aborted || isAbortLikeError(error) || isSbPermissionDenied(error) || isSbAuthMissing(error)) {
      return toQuerySuccess<T>([])
    }
    return toQueryError(`getRecentRows:${table}`, error)
  }
  return toQuerySuccess<T>(data as T[])
}

export async function getRecentEntries(farmId?: string | null, signal?: AbortSignal) {
  if (!farmId) return emptyRecentEntries()

  const clientResult = await getClientOrError("getRecentEntries", { requireSession: true })
  if ("error" in clientResult) {
    if (clientResult.error.status === "error" && /No active session/i.test(clientResult.error.error ?? "")) {
      return emptyRecentEntries()
    }
    return {
      mortality: clientResult.error,
      feeding: clientResult.error,
      sampling: clientResult.error,
      transfer: clientResult.error,
      harvest: clientResult.error,
      water_quality: clientResult.error,
      incoming_feed: clientResult.error,
      stocking: clientResult.error,
      systems: clientResult.error,
    }
  }
  const { supabase } = clientResult

  let farmSystemIds: number[]
  try {
    farmSystemIds = await getFarmSystemIdsForRecent(supabase, farmId, signal)
  } catch (error) {
    if (signal?.aborted || isAbortLikeError(error) || isSbPermissionDenied(error) || isSbAuthMissing(error)) {
      return emptyRecentEntries()
    }
    return emptyRecentEntries()
  }

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
    getRecentRows<FishMortalityRow>(supabase, "fish_mortality", "date", { farmId, farmSystemIds, signal }),
    getRecentRows<FeedingRecordRow>(supabase, "feeding_record", "date", { farmId, farmSystemIds, signal }),
    getRecentRows<FishSamplingWeightRow>(supabase, "fish_sampling_weight", "date", { farmId, farmSystemIds, signal }),
    getRecentRows<FishTransferRow>(supabase, "fish_transfer", "date", { farmId, farmSystemIds, signal }),
    getRecentRows<FishHarvestRow>(supabase, "fish_harvest", "date", { farmId, farmSystemIds, signal }),
    getRecentRows<WaterQualityMeasurementRow>(supabase, "water_quality_measurement", "date", {
      farmId,
      farmSystemIds,
      signal,
    }),
    getRecentRows<FeedIncomingRow>(supabase, "feed_incoming", "date", { farmId, farmSystemIds, signal }),
    getRecentRows<FishStockingRow>(supabase, "fish_stocking", "date", { farmId, farmSystemIds, signal }),
    getRecentRows<SystemRow>(supabase, "system", "created_at", { farmId, farmSystemIds, signal }),
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

export async function getBatchSystemIds(params: {
  batchId: number
  signal?: AbortSignal
}): Promise<QueryResult<{ system_id: number }>> {
  const clientResult = await getClientOrError("getBatchSystemIds", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase
    .from("fish_stocking")
    .select("system_id")
    .eq("batch_id", params.batchId)
    .not("system_id", "is", null)
  if (params.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (
      params.signal?.aborted ||
      isAbortLikeError(error) ||
      isSbPermissionDenied(error) ||
      isSbAuthMissing(error)
    ) {
      return toQuerySuccess<{ system_id: number }>([])
    }
    return toQueryError("getBatchSystemIds", error)
  }

  const uniq = Array.from(new Set((data ?? []).map((row) => row.system_id).filter((id): id is number => typeof id === "number")))
  return toQuerySuccess<{ system_id: number }>(uniq.map((system_id) => ({ system_id })))
}

import type { Database } from "@/lib/types/database"
import { createClient } from "@/lib/supabase/server"
import { toQuerySuccess, isInvalidBigintUuidError, isMissingObjectError } from "@/lib/api/_utils"
import { isSbAuthMissing, isSbPermissionDenied } from "@/lib/supabase/log"
import { countTimeRangeDays } from "@/lib/time-period"

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>
type FeedTypeRow = Database["public"]["Functions"]["api_feed_type_options_rpc"]["Returns"][number]
type FcrTrendRow = Database["public"]["Functions"]["get_fcr_trend"]["Returns"][number]
type GrowthTrendRow = Database["public"]["Functions"]["get_growth_trend"]["Returns"][number]
type RunningStockRow = Database["public"]["Functions"]["get_running_stock"]["Returns"][number]
type FishMortalityRow = Database["public"]["Tables"]["fish_mortality"]["Row"]
type FeedingRecordRow = Database["public"]["Tables"]["feeding_record"]["Row"]
type FishSamplingWeightRow = Database["public"]["Tables"]["fish_sampling_weight"]["Row"]
type FishTransferRow = Database["public"]["Tables"]["fish_transfer"]["Row"]
type FishHarvestRow = Database["public"]["Tables"]["fish_harvest"]["Row"]
type WaterQualityMeasurementRow = Database["public"]["Tables"]["water_quality_measurement"]["Row"]
type FeedIncomingRow = Database["public"]["Tables"]["feed_incoming"]["Row"]
type FishStockingRow = Database["public"]["Tables"]["fish_stocking"]["Row"]
type SystemRow = Database["public"]["Tables"]["system"]["Row"]
type ChangeType = Database["public"]["Enums"]["change_type_enum"]
type ChangeLogRow = {
  id: string | number
  table_name: string | null
  change_type: ChangeType | null
  column_name: string | null
  change_time: string | null
  system_id?: number | null
  batch_id?: number | null
}
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
type FeedingRecordWithType = FeedingRecordRow & { feed_type: FeedTypeRow | null }
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
  feed_type: {
    id: number | null
    feed_line: string | null
    crude_protein_percentage: number | null
    crude_fat_percentage: number | null
    feed_category: string | null
    feed_pellet_size: string | null
  } | null
}

const isQuietReadError = (error: unknown) =>
  isSbPermissionDenied(error) ||
  isSbAuthMissing(error) ||
  isMissingObjectError(error) ||
  isInvalidBigintUuidError(error)

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

async function runTableRead<Row>(query: PromiseLike<{ data: Row[] | null; error: unknown }>): Promise<Row[]> {
  const { data, error } = await query
  if (error) {
    if (isQuietReadError(error)) return []
    throw error
  }

  return (data ?? []) as Row[]
}

async function runRpcRead<Row>(query: PromiseLike<{ data: Row[] | null; error: unknown }>): Promise<Row[]> {
  const { data, error } = await query
  if (error) {
    if (isQuietReadError(error)) return []
    throw error
  }

  return (data ?? []) as Row[]
}

export async function listRunningStock(
  supabase: ServerSupabaseClient,
  params: { farmId?: string | null },
): Promise<RunningStockRow[]> {
  if (!params.farmId) return []

  const { data, error } = await supabase.rpc("get_running_stock", {
    p_farm_id: params.farmId,
  })

  if (error) {
    if (isQuietReadError(error) || isInvalidBigintUuidError(error)) return []
    throw error
  }

  return (data ?? []) as RunningStockRow[]
}

export async function listFcrTrend(
  supabase: ServerSupabaseClient,
  params: {
    farmId?: string | null
    systemId?: number
    days?: number
    dateFrom?: string
    dateTo?: string
  },
): Promise<FcrTrendRow[]> {
  if (!params.farmId || !params.systemId) return []

  const query = supabase.rpc("get_fcr_trend", {
    p_farm_id: params.farmId,
    p_system_id: params.systemId,
    p_days: countTimeRangeDays(params.dateFrom, params.dateTo) ?? params.days,
  })

  const { data, error } = await query
  if (error) {
    if (isQuietReadError(error) || isInvalidBigintUuidError(error)) return []
    throw error
  }

  return (data ?? []) as FcrTrendRow[]
}

export async function listGrowthTrend(
  supabase: ServerSupabaseClient,
  params: {
    systemId?: number
    days?: number
    dateFrom?: string
    dateTo?: string
  },
): Promise<GrowthTrendRow[]> {
  if (!params.systemId) return []

  const query = supabase.rpc("get_growth_trend", {
    p_system_id: params.systemId,
    p_days: countTimeRangeDays(params.dateFrom, params.dateTo) ?? params.days,
  })

  return runRpcRead<GrowthTrendRow>(query)
}

export async function listFeedingRecords(
  supabase: ServerSupabaseClient,
  params?: {
    systemId?: number
    systemIds?: number[]
    batchId?: number
    dateFrom?: string
    dateTo?: string
    limit?: number
  },
): Promise<FeedingRecordWithType[]> {
  let query = supabase.from("feeding_record").select(`
      id,
      created_at,
      date,
      batch_id,
      feed_type_id,
      feeding_amount,
      feeding_response,
      system_id,
      feed_type:feed_type!feeding_record_feed_id_fkey (
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
  if (params?.limit) query = query.limit(params.limit)

  const rows = await runTableRead<FeedingRecordJoinedRow>(query.order("date", { ascending: false }))

  return rows.map((row) => ({
    id: row.id,
    created_at: row.created_at,
    date: row.date,
    batch_id: row.batch_id,
    feed_type_id: row.feed_type_id,
    feeding_amount: row.feeding_amount,
    feeding_response: row.feeding_response,
    system_id: row.system_id,
    feed_type: projectFeedType(
      row.feed_type
        ? {
            feed_type_id: row.feed_type.id,
            feed_label: row.feed_type.feed_line,
            feed_line: row.feed_type.feed_line,
            crude_protein_percentage: row.feed_type.crude_protein_percentage,
            crude_fat_percentage: row.feed_type.crude_fat_percentage,
            feed_category: row.feed_type.feed_category,
            feed_pellet_size: row.feed_type.feed_pellet_size,
          }
        : null,
    ),
  })) as FeedingRecordWithType[]
}

export async function listHarvests(
  supabase: ServerSupabaseClient,
  params?: {
    systemId?: number
    systemIds?: number[]
    batchId?: number
    dateFrom?: string
    dateTo?: string
    limit?: number
  },
): Promise<FishHarvestRow[]> {
  let query = supabase.from("fish_harvest").select("*")
  if (params?.systemId) {
    query = query.eq("system_id", params.systemId)
  } else if (params?.systemIds && params.systemIds.length > 0) {
    query = query.in("system_id", params.systemIds)
  }
  if (params?.batchId) query = query.eq("batch_id", params.batchId)
  if (params?.dateFrom) query = query.gte("date", params.dateFrom)
  if (params?.dateTo) query = query.lte("date", params.dateTo)
  if (params?.limit) query = query.limit(params.limit)
  return runTableRead<FishHarvestRow>(query.order("date", { ascending: false }))
}

export async function listStockings(
  supabase: ServerSupabaseClient,
  params?: {
    systemId?: number
    systemIds?: number[]
    batchId?: number
    dateFrom?: string
    dateTo?: string
    limit?: number
  },
): Promise<FishStockingRow[]> {
  let query = supabase.from("fish_stocking").select("*")
  if (params?.systemId) {
    query = query.eq("system_id", params.systemId)
  } else if (params?.systemIds && params.systemIds.length > 0) {
    query = query.in("system_id", params.systemIds)
  }
  if (params?.batchId) query = query.eq("batch_id", params.batchId)
  if (params?.dateFrom) query = query.gte("date", params.dateFrom)
  if (params?.dateTo) query = query.lte("date", params.dateTo)
  if (params?.limit) query = query.limit(params.limit)
  return runTableRead<FishStockingRow>(query.order("date", { ascending: false }))
}

export async function listSamplingData(
  supabase: ServerSupabaseClient,
  params?: {
    systemId?: number
    systemIds?: number[]
    batchId?: number
    dateFrom?: string
    dateTo?: string
    limit?: number
  },
): Promise<FishSamplingWeightRow[]> {
  let query = supabase.from("fish_sampling_weight").select("*")
  if (params?.systemId) {
    query = query.eq("system_id", params.systemId)
  } else if (params?.systemIds && params.systemIds.length > 0) {
    query = query.in("system_id", params.systemIds)
  }
  if (params?.batchId) query = query.eq("batch_id", params.batchId)
  if (params?.dateFrom) query = query.gte("date", params.dateFrom)
  if (params?.dateTo) query = query.lte("date", params.dateTo)
  if (params?.limit) query = query.limit(params.limit)
  return runTableRead<FishSamplingWeightRow>(query.order("date", { ascending: false }))
}

export async function listMortalityData(
  supabase: ServerSupabaseClient,
  params?: {
    systemId?: number
    systemIds?: number[]
    batchId?: number
    dateFrom?: string
    dateTo?: string
    limit?: number
  },
): Promise<FishMortalityRow[]> {
  let query = supabase.from("fish_mortality").select("*")
  if (params?.systemId) {
    query = query.eq("system_id", params.systemId)
  } else if (params?.systemIds && params.systemIds.length > 0) {
    query = query.in("system_id", params.systemIds)
  }
  if (params?.batchId) query = query.eq("batch_id", params.batchId)
  if (params?.dateFrom) query = query.gte("date", params.dateFrom)
  if (params?.dateTo) query = query.lte("date", params.dateTo)
  if (params?.limit) query = query.limit(params.limit)
  return runTableRead<FishMortalityRow>(query.order("date", { ascending: false }))
}

export async function listTransferData(
  supabase: ServerSupabaseClient,
  params?: {
    batchId?: number
    dateFrom?: string
    dateTo?: string
    limit?: number
  },
): Promise<FishTransferRow[]> {
  let query = supabase.from("fish_transfer").select("*")
  if (params?.batchId) query = query.eq("batch_id", params.batchId)
  if (params?.dateFrom) query = query.gte("date", params.dateFrom)
  if (params?.dateTo) query = query.lte("date", params.dateTo)
  if (params?.limit) query = query.limit(params.limit)
  return runTableRead<FishTransferRow>(query.order("date", { ascending: false }))
}

export async function listRecentActivities(
  supabase: ServerSupabaseClient,
  params?: {
    tableName?: string
    changeType?: ChangeType
    dateFrom?: string
    dateTo?: string
    limit?: number
  },
): Promise<ChangeLogRow[]> {
  void supabase
  void params
  return []
}

export async function listBatchSystemIds(
  supabase: ServerSupabaseClient,
  params: { batchId: number },
): Promise<Array<{ system_id: number }>> {
  const { data, error } = await supabase
    .from("fish_stocking")
    .select("system_id")
    .eq("batch_id", params.batchId)
    .not("system_id", "is", null)

  if (error) {
    if (isQuietReadError(error)) return []
    throw error
  }

  const uniq = Array.from(
    new Set((data ?? []).map((row) => row.system_id).filter((id): id is number => typeof id === "number")),
  )
  return uniq.map((system_id) => ({ system_id }))
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

async function getFarmSystemIdsForRecent(supabase: ServerSupabaseClient, farmId: string): Promise<number[]> {
  const { data, error } = await supabase.from("system").select("id").eq("farm_id", farmId)
  if (error) {
    if (isQuietReadError(error)) return []
    throw error
  }

  return Array.from(
    new Set((data ?? []).map((row) => row.id).filter((id): id is number => typeof id === "number" && Number.isFinite(id))),
  )
}

async function getRecentRows<T>(
  supabase: ServerSupabaseClient,
  table: RecentRowsTable,
  orderColumn: string,
  params: {
    farmId: string
    farmSystemIds: number[]
    limit?: number
  },
): Promise<T[]> {
  const limit = params.limit ?? 5
  const { farmId, farmSystemIds } = params

  if (!farmId) return []

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
      if (farmSystemIds.length === 0) return []
      const systemList = farmSystemIds.join(",")
      query = query.or(`origin_system_id.in.(${systemList}),target_system_id.in.(${systemList})`)
      break
    }
    default:
      if (farmSystemIds.length === 0) return []
      query = query.in("system_id", farmSystemIds)
      break
  }

  const { data, error } = await query.order(orderColumn, { ascending: false }).limit(limit)
  if (error) {
    if (isQuietReadError(error)) return []
    throw error
  }

  return (data ?? []) as T[]
}

export async function listRecentEntries(supabase: ServerSupabaseClient, farmId?: string | null) {
  if (!farmId) return emptyRecentEntries()

  let farmSystemIds: number[]
  try {
    farmSystemIds = await getFarmSystemIdsForRecent(supabase, farmId)
  } catch {
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
    getRecentRows<FishMortalityRow>(supabase, "fish_mortality", "date", { farmId, farmSystemIds }),
    getRecentRows<FeedingRecordRow>(supabase, "feeding_record", "date", { farmId, farmSystemIds }),
    getRecentRows<FishSamplingWeightRow>(supabase, "fish_sampling_weight", "date", { farmId, farmSystemIds }),
    getRecentRows<FishTransferRow>(supabase, "fish_transfer", "date", { farmId, farmSystemIds }),
    getRecentRows<FishHarvestRow>(supabase, "fish_harvest", "date", { farmId, farmSystemIds }),
    getRecentRows<WaterQualityMeasurementRow>(supabase, "water_quality_measurement", "date", {
      farmId,
      farmSystemIds,
    }),
    getRecentRows<FeedIncomingRow>(supabase, "feed_incoming", "date", {
      farmId,
      farmSystemIds,
    }),
    getRecentRows<FishStockingRow>(supabase, "fish_stocking", "date", { farmId, farmSystemIds }),
    getRecentRows<SystemRow>(supabase, "system", "created_at", { farmId, farmSystemIds }),
  ])

  return {
    mortality: toQuerySuccess(mortality),
    feeding: toQuerySuccess(feeding),
    sampling: toQuerySuccess(sampling),
    transfer: toQuerySuccess(transfer),
    harvest: toQuerySuccess(harvest),
    water_quality: toQuerySuccess(waterQuality),
    incoming_feed: toQuerySuccess(incomingFeed),
    stocking: toQuerySuccess(stocking),
    systems: toQuerySuccess(systems),
  }
}

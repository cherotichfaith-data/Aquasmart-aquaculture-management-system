import type { Database } from "@/lib/types/database"
import { createClient } from "@/lib/supabase/server"
import { toQuerySuccess, isInvalidBigintUuidError, isMissingObjectError } from "@/lib/api/_utils"
import { isSbAuthMissing, isSbPermissionDenied } from "@/lib/supabase/log"

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>
type FeedTypeRow = Database["public"]["Functions"]["api_feed_type_options_rpc"]["Returns"][number]
type GrowthTrendRow = Database["public"]["Functions"]["api_growth_trend"]["Returns"][number]
type RunningStockRow = Database["public"]["Functions"]["api_running_stock"]["Returns"][number]
type FishMortalityRow = Database["public"]["Tables"]["fish_mortality"]["Row"]
type FeedingRecordRow = Database["public"]["Tables"]["feeding_record"]["Row"]
type FishSamplingWeightRow = Database["public"]["Tables"]["fish_sampling_weight"]["Row"]
type FishTransferRow = Database["public"]["Tables"]["fish_transfer"]["Row"]
type FishHarvestRow = Database["public"]["Tables"]["fish_harvest"]["Row"]
type WaterQualityMeasurementRow = Database["public"]["Tables"]["water_quality_measurement"]["Row"]
type FeedInventoryRow = Database["public"]["Tables"]["feed_inventory"]["Row"]
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
  | "feed_inventory"
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
    farm_id: "",
    visibility_scope: "joined_record",
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

  const { data, error } = await supabase.rpc("api_running_stock", {
    p_farm_id: params.farmId,
  })

  if (error) {
    if (isQuietReadError(error) || isInvalidBigintUuidError(error)) return []
    throw error
  }

  return (data ?? []) as RunningStockRow[]
}

export async function listGrowthTrend(
  supabase: ServerSupabaseClient,
  params: {
    farmId?: string | null
    systemId?: number
    days?: number
    dateFrom?: string
    dateTo?: string
  },
): Promise<GrowthTrendRow[]> {
  if (!params.farmId || !params.systemId) return []

  const query = supabase.rpc("api_growth_trend", {
    p_farm_id: params.farmId,
    p_system_id: params.systemId,
    p_days: params.days,
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
      feed_type:feed_type (
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

/**
 * Returns a unified activity feed by querying the most recent events
 * across all transactional tables for the given farm.
 * Each row is normalised into the ChangeLogRow shape consumed by the Reports page.
 */
export async function listRecentActivities(
  supabase: ServerSupabaseClient,
  params?: {
    farmId?: string | null
    tableName?: string
    dateFrom?: string
    dateTo?: string
    limit?: number
  },
): Promise<ChangeLogRow[]> {
  if (!params?.farmId) return []

  const limit = params.limit ?? 50
  const dateFrom = params.dateFrom
  const dateTo = params.dateTo
  const filterTable = params.tableName

  // Resolve all system IDs for this farm so we can scope per-system tables
  const { data: systems, error: sysErr } = await supabase
    .from("system")
    .select("id")
    .eq("farm_id", params.farmId)
  if (sysErr) {
    if (isQuietReadError(sysErr)) return []
    throw sysErr
  }
  const systemIds = (systems ?? []).map((s) => s.id).filter((id): id is number => typeof id === "number")
  if (systemIds.length === 0) return []

  type RawEvent = { id: number | string; system_id?: number | null; batch_id?: number | null } & Record<string, unknown>

  async function fetchTable<T extends RawEvent>(
    table: RecentRowsTable,
    tableName: string,
    changeType: ChangeType,
    useFarmId: boolean,
    dateColumn = "date",
  ): Promise<ChangeLogRow[]> {
    if (filterTable && filterTable !== "all" && filterTable !== tableName) return []

    const selectColumns = useFarmId ? `id, ${dateColumn}` : `id, ${dateColumn}, system_id, batch_id`
    let q = supabase.from(table).select(selectColumns).order(dateColumn, { ascending: false }).limit(limit)

    if (useFarmId) {
      q = q.eq("farm_id", params!.farmId!)
    } else {
      if (systemIds.length === 0) return []
      q = q.in("system_id", systemIds)
    }
    if (dateFrom) q = q.gte(dateColumn, dateFrom)
    if (dateTo) q = q.lte(dateColumn, dateTo)

    const { data, error } = await q
    if (error) {
      if (isQuietReadError(error)) return []
      return []
    }
    return (data ?? []).map((row: any) => ({
      id: row.id,
      table_name: tableName,
      change_type: changeType,
      column_name: null,
      change_time: typeof row[dateColumn] === "string" ? row[dateColumn] : null,
      system_id: row.system_id ?? null,
      batch_id: row.batch_id ?? null,
    }))
  }

  const results = await Promise.all([
    fetchTable("feeding_record",         "feeding_record",         "INSERT", false),
    fetchTable("fish_mortality",          "fish_mortality",         "INSERT", true),
    fetchTable("fish_sampling_weight",    "fish_sampling_weight",   "INSERT", false),
    fetchTable("fish_stocking",           "fish_stocking",          "INSERT", false),
    fetchTable("fish_harvest",            "fish_harvest",           "INSERT", false),
    fetchTable("fish_transfer",           "fish_transfer",          "INSERT", false),
    fetchTable("water_quality_measurement","water_quality_measurement","INSERT",false),
    fetchTable("feed_inventory",          "feed_inventory",         "INSERT", true, "inventory_date"),
  ])

  return results
    .flat()
    .sort((a, b) => String(b.change_time ?? "").localeCompare(String(a.change_time ?? "")))
    .slice(0, limit)
}

export async function listBatchSystemIds(
  supabase: ServerSupabaseClient,
  params: { batchId: number },
): Promise<Array<{ system_id: number }>> {
  const [cycles, stockings, feeding, sampling, mortality, harvests, transfers] = await Promise.all([
    supabase.from("production_cycle").select("system_id").eq("batch_id", params.batchId),
    supabase.from("fish_stocking").select("system_id").eq("batch_id", params.batchId),
    supabase.from("feeding_record").select("system_id").eq("batch_id", params.batchId),
    supabase.from("fish_sampling_weight").select("system_id").eq("batch_id", params.batchId),
    supabase.from("fish_mortality").select("system_id").eq("batch_id", params.batchId),
    supabase.from("fish_harvest").select("system_id").eq("batch_id", params.batchId),
    supabase
      .from("fish_transfer")
      .select("origin_system_id, target_system_id")
      .eq("batch_id", params.batchId),
  ])

  const firstError = [cycles, stockings, feeding, sampling, mortality, harvests, transfers].find((result) => result.error)
  if (firstError?.error) {
    if (isQuietReadError(firstError.error)) return []
    throw firstError.error
  }

  const lineageIds = new Set<number>()
  ;[cycles.data, stockings.data, feeding.data, sampling.data, mortality.data, harvests.data].forEach((rows) => {
    ;(rows ?? []).forEach((row) => {
      if (typeof row.system_id === "number" && Number.isFinite(row.system_id)) lineageIds.add(row.system_id)
    })
  })
  ;(transfers.data ?? []).forEach((row) => {
    if (typeof row.origin_system_id === "number" && Number.isFinite(row.origin_system_id)) lineageIds.add(row.origin_system_id)
    if (typeof row.target_system_id === "number" && Number.isFinite(row.target_system_id)) lineageIds.add(row.target_system_id)
  })
  if (lineageIds.size === 0) return []

  for (let depth = 0; depth < 3; depth += 1) {
    const sourceIds = Array.from(lineageIds)
    const { data: transfers, error: transferError } = await supabase
      .from("fish_transfer")
      .select("origin_system_id, target_system_id")
      .in("origin_system_id", sourceIds)
      .not("target_system_id", "is", null)

    if (transferError) {
      if (isQuietReadError(transferError)) break
      throw transferError
    }

    const beforeSize = lineageIds.size
    ;(transfers ?? []).forEach((row) => {
      if (typeof row.target_system_id === "number" && Number.isFinite(row.target_system_id)) {
        lineageIds.add(row.target_system_id)
      }
    })
    if (lineageIds.size === beforeSize) break
  }

  const { data: activeRows, error: activeError } = await supabase
    .from("system")
    .select("id")
    .in("id", Array.from(lineageIds))
    .eq("is_active", true)

  if (activeError) {
    if (isQuietReadError(activeError)) return []
    throw activeError
  }

  const activeIds = Array.from(
    new Set((activeRows ?? []).map((row) => row.id).filter((id): id is number => typeof id === "number")),
  )
  return activeIds.map((system_id) => ({ system_id }))
}

export const emptyRecentEntries = () => ({
  mortality: toQuerySuccess<FishMortalityRow>([]),
  feeding: toQuerySuccess<FeedingRecordRow>([]),
  sampling: toQuerySuccess<FishSamplingWeightRow>([]),
  transfer: toQuerySuccess<FishTransferRow>([]),
  harvest: toQuerySuccess<FishHarvestRow>([]),
  water_quality: toQuerySuccess<WaterQualityMeasurementRow>([]),
  feed_inventory: toQuerySuccess<FeedInventoryRow>([]),
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
    case "feed_inventory":
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
    feedInventory,
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
    getRecentRows<FeedInventoryRow>(supabase, "feed_inventory", "inventory_date", {
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
    feed_inventory: toQuerySuccess(feedInventory),
    stocking: toQuerySuccess(stocking),
    systems: toQuerySuccess(systems),
  }
}

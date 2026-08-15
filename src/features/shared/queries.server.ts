import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/types/database"
import { toRpcDate } from "@/lib/rpc-params"
import { isInvalidBigintUuidError, isMissingObjectError, toQuerySuccess } from "@/lib/supabase/query-transport"
import { isSbAuthMissing, isSbPermissionDenied } from "@/lib/supabase/log"

type SharedSupabaseClient = SupabaseClient<Database>
type FeedTypeRow = Database["public"]["Functions"]["api_feed_type_options_rpc"]["Returns"][number]
type ProductionSummaryRow = Database["public"]["Functions"]["api_production_summary"]["Returns"][number]
export type GrowthTrendRow = {
  system_id: number
  sample_date: string
  /** api_production_summary's boundary type: 'stocking' | 'sampling' | 'transfer' | 'current'.
   * Only 'sampling' rows are an actual weighing event -- 'current' in particular is a
   * carried-forward estimate for "today", not a recorded sample. */
  activity: string | null
  abw_g: number | null
  /** Fish inventory as of this row -- used to fish-count-weight ABW/eFCR when combining multiple cages into one batch total. */
  fish_count: number | null
  adg_g_day: number | null
  sgr_pct_day: number | null
  efcr_period: number | null
  days_interval: number | null
  weight_gain_g: number | null
  age_days?: number | null
  expected_abw_g?: number | null
  growth_deviation_pct?: number | null
}
type FishMortalityRow = Database["public"]["Tables"]["fish_mortality"]["Row"]
type FeedingRecordRow = Database["public"]["Tables"]["feeding_record"]["Row"]
type FishSamplingWeightRow = Database["public"]["Tables"]["fish_sampling_weight"]["Row"]
type FishTransferRow = Database["public"]["Tables"]["fish_transfer"]["Row"]
type FishHarvestRow = Database["public"]["Tables"]["fish_harvest"]["Row"]
type WaterQualityMeasurementRow = Database["public"]["Tables"]["water_quality_measurement"]["Row"]
type FeedInventoryRow = Database["public"]["Tables"]["feed_inventory"]["Row"]
type FishStockingRow = Database["public"]["Tables"]["fish_stocking"]["Row"]
type SystemRow = Database["public"]["Tables"]["system"]["Row"]
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
type RecentRowsQuery = {
  eq(column: string, value: string): RecentRowsQuery
  in(column: string, values: number[]): RecentRowsQuery
  or(filter: string): RecentRowsQuery
  order(column: string, options: { ascending: boolean }): RecentRowsQuery
  limit(count: number): PromiseLike<{ data: unknown[] | null; error: unknown }>
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
    label: row.feed_label as FeedTypeRow["label"],
    feed_line: row.feed_line as FeedTypeRow["feed_line"],
    crude_protein_percentage: row.crude_protein_percentage ?? 0,
    crude_fat_percentage: row.crude_fat_percentage ?? 0,
    feed_category: String(row.feed_category ?? ""),
    feed_pellet_size: String(row.feed_pellet_size ?? ""),
    farm_id: "",
    visibility_scope: "joined_record",
  }
}

async function runRead<Row>(query: PromiseLike<{ data: Row[] | null; error: unknown }>): Promise<Row[]> {
  const { data, error } = await query
  if (error) {
    if (isQuietReadError(error)) return []
    throw error
  }

  return (data ?? []) as Row[]
}

const normalizeSystemIdList = (systemIds?: number[]): number[] =>
  Array.from(
    new Set((systemIds ?? []).filter((id): id is number => typeof id === "number" && Number.isFinite(id) && id > 0)),
  )

async function getFarmSystemIds(supabase: SharedSupabaseClient, farmId: string): Promise<number[]> {
  const { data, error } = await supabase.from("system").select("id").eq("farm_id", farmId)
  if (error) {
    if (isQuietReadError(error)) return []
    throw error
  }

  return normalizeSystemIdList((data ?? []).map((row) => row.id))
}

async function resolveScopedSystemIds(
  supabase: SharedSupabaseClient,
  params: {
    farmId?: string | null
    systemId?: number
    systemIds?: number[]
  },
): Promise<number[] | null> {
  const requestedIds = normalizeSystemIdList([
    ...normalizeSystemIdList(params.systemIds),
    ...(typeof params.systemId === "number" ? [params.systemId] : []),
  ])

  if (!params.farmId) {
    return requestedIds.length > 0 ? requestedIds : null
  }

  const farmSystemIds = await getFarmSystemIds(supabase, params.farmId)
  if (farmSystemIds.length === 0) return []
  if (requestedIds.length === 0) return farmSystemIds

  const farmSystemIdSet = new Set(farmSystemIds)
  return requestedIds.filter((id) => farmSystemIdSet.has(id))
}

export async function listGrowthTrend(
  supabase: SharedSupabaseClient,
  params: {
    farmId?: string | null
    systemId?: number
    systemIds?: number[]
    days?: number
    dateFrom?: string
    dateTo?: string
  },
): Promise<GrowthTrendRow[]> {
  if (!params.farmId) return []

  const systemIds = await resolveScopedSystemIds(supabase, params)
  if (!systemIds || systemIds.length === 0) return []

  const startDate = toRpcDate(params.dateFrom)
  const endDate = toRpcDate(params.dateTo)
  const rowsBySystem = await Promise.all(
    systemIds.map(async (systemId) => {
      const rows = await runRead<ProductionSummaryRow>(
        supabase.rpc("api_production_summary", {
          p_farm_id: params.farmId!,
          p_system_id: systemId,
          p_start_date: startDate ?? undefined,
          p_end_date: endDate ?? undefined,
        }),
      )
      return rows.map<GrowthTrendRow>((row) => ({
        system_id: row.system_id ?? systemId,
        sample_date: row.date,
        activity: row.activity,
        abw_g: row.average_body_weight,
        fish_count: row.number_of_fish_inventory,
        adg_g_day: row.agr,
        sgr_pct_day: row.sgr,
        efcr_period: row.efcr_period,
        days_interval: row.days_in_period,
        weight_gain_g: row.biomass_increase_period,
        age_days: null,
        expected_abw_g: row.target_weight_g,
        growth_deviation_pct: null,
      }))
    }),
  )

  return rowsBySystem.flat().sort((left, right) => left.sample_date.localeCompare(right.sample_date))
}

export async function listFeedingRecords(
  supabase: SharedSupabaseClient,
  params?: {
    farmId?: string | null
    systemId?: number
    systemIds?: number[]
    batchId?: number
    dateFrom?: string
    dateTo?: string
    limit?: number
  },
): Promise<FeedingRecordWithType[]> {
  const scopedSystemIds = await resolveScopedSystemIds(supabase, {
    farmId: params?.farmId,
    systemId: params?.systemId,
    systemIds: params?.systemIds,
  })
  if (params?.farmId && (!scopedSystemIds || scopedSystemIds.length === 0)) return []

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

  if (scopedSystemIds && scopedSystemIds.length > 0) {
    query = query.in("system_id", scopedSystemIds)
  }
  if (params?.batchId) query = query.eq("batch_id", params.batchId)
  if (params?.dateFrom) query = query.gte("date", params.dateFrom)
  if (params?.dateTo) query = query.lte("date", params.dateTo)
  if (params?.limit) query = query.limit(params.limit)

  const rows = await runRead<FeedingRecordJoinedRow>(
    query.order("date", { ascending: false }).order("created_at", { ascending: false }),
  )

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
  supabase: SharedSupabaseClient,
  params?: {
    farmId?: string | null
    systemId?: number
    systemIds?: number[]
    batchId?: number
    dateFrom?: string
    dateTo?: string
    limit?: number
  },
): Promise<FishHarvestRow[]> {
  const scopedSystemIds = await resolveScopedSystemIds(supabase, {
    farmId: params?.farmId,
    systemId: params?.systemId,
    systemIds: params?.systemIds,
  })
  if (params?.farmId && (!scopedSystemIds || scopedSystemIds.length === 0)) return []

  let query = supabase.from("fish_harvest").select("*")
  if (scopedSystemIds && scopedSystemIds.length > 0) {
    query = query.in("system_id", scopedSystemIds)
  }
  if (params?.batchId) query = query.eq("batch_id", params.batchId)
  if (params?.dateFrom) query = query.gte("date", params.dateFrom)
  if (params?.dateTo) query = query.lte("date", params.dateTo)
  if (params?.limit) query = query.limit(params.limit)
  return runRead<FishHarvestRow>(query.order("date", { ascending: false }).order("created_at", { ascending: false }))
}

export async function listSamplingData(
  supabase: SharedSupabaseClient,
  params?: {
    farmId?: string | null
    systemId?: number
    systemIds?: number[]
    batchId?: number
    dateFrom?: string
    dateTo?: string
    limit?: number
  },
): Promise<FishSamplingWeightRow[]> {
  const scopedSystemIds = await resolveScopedSystemIds(supabase, {
    farmId: params?.farmId,
    systemId: params?.systemId,
    systemIds: params?.systemIds,
  })
  if (params?.farmId && (!scopedSystemIds || scopedSystemIds.length === 0)) return []

  let query = supabase.from("fish_sampling_weight").select("*")
  if (scopedSystemIds && scopedSystemIds.length > 0) {
    query = query.in("system_id", scopedSystemIds)
  }
  if (params?.batchId) query = query.eq("batch_id", params.batchId)
  if (params?.dateFrom) query = query.gte("date", params.dateFrom)
  if (params?.dateTo) query = query.lte("date", params.dateTo)
  if (params?.limit) query = query.limit(params.limit)
  return runRead<FishSamplingWeightRow>(query.order("date", { ascending: false }).order("created_at", { ascending: false }))
}

export async function listMortalityData(
  supabase: SharedSupabaseClient,
  params?: {
    farmId?: string | null
    systemId?: number
    systemIds?: number[]
    batchId?: number
    dateFrom?: string
    dateTo?: string
    limit?: number
  },
): Promise<FishMortalityRow[]> {
  let query = supabase.from("fish_mortality").select("*")
  if (params?.farmId) query = query.eq("farm_id", params.farmId)
  if (params?.systemId) {
    query = query.eq("system_id", params.systemId)
  } else if (params?.systemIds && params.systemIds.length > 0) {
    query = query.in("system_id", params.systemIds)
  }
  if (params?.batchId) query = query.eq("batch_id", params.batchId)
  if (params?.dateFrom) query = query.gte("date", params.dateFrom)
  if (params?.dateTo) query = query.lte("date", params.dateTo)
  if (params?.limit) query = query.limit(params.limit)
  return runRead<FishMortalityRow>(query.order("date", { ascending: false }).order("created_at", { ascending: false }))
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

async function getRecentRows<T>(
  supabase: SharedSupabaseClient,
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

  let query = supabase.from(table).select("*") as unknown as RecentRowsQuery
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

  const orderedQuery =
    orderColumn === "created_at"
      ? query.order(orderColumn, { ascending: false })
      : query.order(orderColumn, { ascending: false }).order("created_at", { ascending: false })
  const { data, error } = await orderedQuery.limit(limit)
  if (error) {
    if (isQuietReadError(error)) return []
    throw error
  }

  return (data ?? []) as T[]
}

export async function listRecentEntries(supabase: SharedSupabaseClient, farmId?: string | null) {
  if (!farmId) return emptyRecentEntries()

  let farmSystemIds: number[]
  try {
    farmSystemIds = await getFarmSystemIds(supabase, farmId)
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

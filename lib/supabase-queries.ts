import { supabaseInsert, supabaseQuery } from "./supabase-client"
import type { QueryResult } from "./supabase-client"
import type { Enums, Tables, TablesInsert } from "./types/database"

type DashboardRow = Tables<"dashboard">
type DashboardConsolidatedRow = Tables<"dashboard_consolidated">
type ProductionSummaryRow = Tables<"production_summary">
type DailyFishInventoryRow = Tables<"daily_fish_inventory_table">
type ChangeLogRow = Tables<"change_log">
type FishSamplingWeightRow = Tables<"fish_sampling_weight">
type FishMortalityRow = Tables<"fish_mortality">
type FishHarvestRow = Tables<"fish_harvest">
type WaterQualityMeasurementRow = Tables<"water_quality_measurement">
type DailyWaterQualityRatingRow = Tables<"daily_water_quality_rating">
type WaterQualityFrameworkRow = Tables<"water_quality_framework">
type SystemRow = Tables<"system">
type FingerlingBatchRow = Tables<"fingerling_batch">
type FeedIncomingRow = Tables<"feed_incoming">
type FeedTypeRow = Tables<"feed_type">
type FeedingRecordRow = Tables<"feeding_record">
type SystemsRow = Tables<"systems">
type SuppliersRow = Tables<"suppliers">
type FeedsMetadataRow = Tables<"feeds_metadata">


type SystemListItem = Pick<SystemRow, "id" | "name">
type BatchListItem = Pick<FingerlingBatchRow, "id" | "name">

export type FeedIncomingWithType = FeedIncomingRow & { feed_type: FeedTypeRow | null }
export type FeedingRecordWithType = FeedingRecordRow & { feed_type: FeedTypeRow | null }
export type WaterQualityMeasurementWithUnit = WaterQualityMeasurementRow & {
  water_quality_framework: Pick<WaterQualityFrameworkRow, "unit"> | null
}

export async function fetchSystemsList(): Promise<QueryResult<SystemListItem>> {
  return supabaseQuery<SystemListItem>("system", {
    select: "id,name",
    order: "name.asc",
  })
}

export async function fetchBatchesList(): Promise<QueryResult<BatchListItem>> {
  return supabaseQuery<BatchListItem>("fingerling_batch", {
    select: "id,name",
    order: "name.asc",
  })
}

export async function fetchDashboardSnapshot(filters?: {
  system_id?: number
  time_period?: Enums<"time_period">
  growth_stage?: Enums<"system_growth_stage">
}): Promise<DashboardRow | DashboardConsolidatedRow | null> {
  if (filters?.system_id) {
    const eq: Record<string, string | number> = {
      system_id: filters.system_id,
    }
    if (filters?.time_period) eq.time_period = filters.time_period
    if (filters?.growth_stage) eq.growth_stage = filters.growth_stage

    const result = await supabaseQuery<DashboardRow>("dashboard", {
      select: "*",
      eq,
      limit: 1,
    })

    return result.status === "success" ? result.data[0] ?? null : null
  }

  const eq: Record<string, string | number | boolean> = {}
  if (filters?.time_period) eq.time_period = filters.time_period

  const result = await supabaseQuery<DashboardConsolidatedRow>("dashboard_consolidated", {
    select: "*",
    eq: {
      ...eq,
      growth_stage_scope: filters?.growth_stage ?? "all",
    },
    order: "input_end_date.desc",
    limit: 1,
  })

  return result.status === "success" ? result.data[0] ?? null : null
}

export async function fetchProductionSummary(filters?: {
  system_id?: number
  growth_stage?: Enums<"system_growth_stage">
  limit?: number
}): Promise<QueryResult<ProductionSummaryRow>> {
  const eq: Record<string, string | number> = {}

  if (filters?.system_id) eq.system_id = filters.system_id
  if (filters?.growth_stage) eq.growth_stage = filters.growth_stage

  return supabaseQuery<ProductionSummaryRow>("production_summary", {
    select: "*",
    eq: Object.keys(eq).length ? eq : undefined,
    order: "date.desc",
    limit: filters?.limit ?? 50,
  })
}

export async function fetchDailyFishInventory(filters?: {
  system_id?: number
  limit?: number
}): Promise<QueryResult<DailyFishInventoryRow>> {
  const eq: Record<string, string | number> = {}

  if (filters?.system_id) eq.system_id = filters.system_id

  return supabaseQuery<DailyFishInventoryRow>("daily_fish_inventory_table", {
    select: "*",
    eq: Object.keys(eq).length ? eq : undefined,
    order: "inventory_date.desc",
    limit: filters?.limit ?? 100,
  })
}

export async function fetchSystems(filters?: {
  system_id?: number
  growth_stage?: Enums<"system_growth_stage">
  ongoing_cycle?: boolean
  limit?: number
}): Promise<QueryResult<ProductionSummaryRow>> {
  const eq: Record<string, string | number | boolean> = {}

  if (filters?.system_id) eq.system_id = filters.system_id
  if (filters?.growth_stage) eq.growth_stage = filters.growth_stage
  if (typeof filters?.ongoing_cycle === "boolean") eq.ongoing_cycle = filters.ongoing_cycle

  return supabaseQuery<ProductionSummaryRow>("production_summary", {
    select: "*",
    eq: Object.keys(eq).length ? eq : undefined,
    order: "date.desc",
    limit: filters?.limit,
  })
}

export async function fetchActivities(filters?: {
  table_name?: string
  change_type?: Enums<"change_type_enum">
  limit?: number
}): Promise<QueryResult<ChangeLogRow>> {
  const eq: Record<string, string | number> = {}
  if (filters?.table_name) eq.table_name = filters.table_name
  if (filters?.change_type) eq.change_type = filters.change_type

  return supabaseQuery<ChangeLogRow>("change_log", {
    select: "*",
    eq: Object.keys(eq).length ? eq : undefined,
    order: "change_time.desc",
    limit: filters?.limit ?? 50,
  })
}

export async function fetchWaterQualityRatings(filters?: {
  system_id?: number
  limit?: number
}): Promise<QueryResult<DailyWaterQualityRatingRow>> {
  const eq: Record<string, string | number> = {}
  if (filters?.system_id) eq.system_id = filters.system_id

  return supabaseQuery<DailyWaterQualityRatingRow>("daily_water_quality_rating", {
    select: "*",
    eq: Object.keys(eq).length ? eq : undefined,
    order: "rating_date.desc",
    limit: filters?.limit ?? 30,
  })
}

export async function fetchWaterQualityMeasurements(filters?: {
  system_id?: number
  parameter_name?: Enums<"water_quality_parameters">
  limit?: number
}): Promise<QueryResult<WaterQualityMeasurementWithUnit>> {
  const eq: Record<string, string | number> = {}
  if (filters?.system_id) eq.system_id = filters.system_id
  if (filters?.parameter_name) eq.parameter_name = filters.parameter_name

  return supabaseQuery<WaterQualityMeasurementWithUnit>("water_quality_measurement", {
    select: "*,water_quality_framework(unit)",
    eq: Object.keys(eq).length ? eq : undefined,
    order: "date.desc",
    limit: filters?.limit ?? 100,
  })
}

export async function fetchSamplingData(filters?: {
  system_id?: number
  batch_id?: number
  limit?: number
}): Promise<QueryResult<FishSamplingWeightRow>> {
  const eq: Record<string, string | number> = {}
  if (filters?.system_id) eq.system_id = filters.system_id
  if (filters?.batch_id) eq.batch_id = filters.batch_id

  return supabaseQuery<FishSamplingWeightRow>("fish_sampling_weight", {
    select: "*",
    eq: Object.keys(eq).length ? eq : undefined,
    order: "date.desc",
    limit: filters?.limit ?? 100,
  })
}

export async function fetchFeedData(filters?: { limit?: number }): Promise<QueryResult<FeedIncomingWithType>> {
  return supabaseQuery<FeedIncomingWithType>("feed_incoming", {
    select: "*,feed_type(*)",
    order: "date.desc",
    limit: filters?.limit ?? 100,
  })
}

export async function fetchFeedTypes(filters?: { limit?: number }): Promise<QueryResult<FeedTypeRow>> {
  return supabaseQuery<FeedTypeRow>("feed_type", {
    select: "*",
    order: "created_at.desc",
    limit: filters?.limit ?? 100,
  })
}

export async function fetchFeedingRecords(filters?: {
  system_id?: number
  batch_id?: number
  limit?: number
}): Promise<QueryResult<FeedingRecordWithType>> {
  const eq: Record<string, string | number> = {}
  if (filters?.system_id) eq.system_id = filters.system_id
  if (filters?.batch_id) eq.batch_id = filters.batch_id

  return supabaseQuery<FeedingRecordWithType>("feeding_record", {
    select: "*,feed_type(*)",
    eq: Object.keys(eq).length ? eq : undefined,
    order: "date.desc",
    limit: filters?.limit ?? 100,
  })
}

export async function fetchMortalityData(filters?: {
  system_id?: number
  batch_id?: number
  limit?: number
}): Promise<QueryResult<FishMortalityRow>> {
  const eq: Record<string, string | number> = {}
  if (filters?.system_id) eq.system_id = filters.system_id
  if (filters?.batch_id) eq.batch_id = filters.batch_id

  return supabaseQuery<FishMortalityRow>("fish_mortality", {
    select: "*",
    eq: Object.keys(eq).length ? eq : undefined,
    order: "date.desc",
    limit: filters?.limit ?? 100,
  })
}

export async function fetchHarvests(filters?: {
  system_id?: number
  batch_id?: number
  limit?: number
}): Promise<QueryResult<FishHarvestRow>> {
  const eq: Record<string, string | number> = {}
  if (filters?.system_id) eq.system_id = filters.system_id
  if (filters?.batch_id) eq.batch_id = filters.batch_id

  return supabaseQuery<FishHarvestRow>("fish_harvest", {
    select: "*",
    eq: Object.keys(eq).length ? eq : undefined,
    order: "date.desc",
    limit: filters?.limit ?? 50,
  })
}

export async function insertWaterQualityMeasurement(
  payload: TablesInsert<"water_quality_measurement">,
): Promise<QueryResult<WaterQualityMeasurementRow>> {
  return supabaseInsert<WaterQualityMeasurementRow, TablesInsert<"water_quality_measurement">>(
    "water_quality_measurement",
    payload,
  )
}

// Export moved to supabase-queries-server.ts


export async function fetchSuppliers(): Promise<QueryResult<SuppliersRow>> {
  return supabaseQuery<SuppliersRow>("suppliers", {
    select: "*",
    order: "name.asc",
  })
}

export async function fetchFeeds(): Promise<QueryResult<FeedsMetadataRow>> {
  return supabaseQuery<FeedsMetadataRow>("feeds_metadata", {
    select: "*",
    order: "feed_name.asc",
  })
}

// Recent Entries Fetchers
export async function fetchRecentMortalityEvents(limit = 5) {
  return supabaseQuery<Tables<"mortality_events">>("mortality_events", {
    select: "*",
    order: { column: "created_at", ascending: false },
    limit,
  })
}

export async function fetchRecentFeedingEvents(limit = 5) {
  return supabaseQuery<Tables<"feeding_events">>("feeding_events", {
    select: "*",
    order: { column: "created_at", ascending: false },
    limit,
  })
}

export async function fetchRecentSamplingEvents(limit = 5) {
  return supabaseQuery<Tables<"sampling_events">>("sampling_events", {
    select: "*",
    order: { column: "created_at", ascending: false },
    limit,
  })
}

export async function fetchRecentTransferEvents(limit = 5) {
  return supabaseQuery<Tables<"transfer_events">>("transfer_events", {
    select: "*",
    order: { column: "created_at", ascending: false },
    limit,
  })
}

export async function fetchRecentHarvestEvents(limit = 5) {
  return supabaseQuery<Tables<"harvest_events">>("harvest_events", {
    select: "*",
    order: { column: "created_at", ascending: false },
    limit,
  })
}

export async function fetchRecentWaterQualityEvents(limit = 5) {
  return supabaseQuery<Tables<"water_quality_events">>("water_quality_events", {
    select: "*",
    order: { column: "created_at", ascending: false },
    limit,
  })
}

export async function fetchRecentIncomingFeedEvents(limit = 5) {
  return supabaseQuery<Tables<"incoming_feed_events">>("incoming_feed_events", {
    select: "*",
    order: { column: "created_at", ascending: false },
    limit,
  })
}

export async function fetchRecentStockingEvents(limit = 5) {
  return supabaseQuery<Tables<"stocking_events">>("stocking_events", {
    select: "*",
    order: { column: "created_at", ascending: false },
    limit,
  })
}

export async function fetchRecentSystems(limit = 5) {
  return supabaseQuery<Tables<"systems">>("systems", {
    select: "*",
    order: { column: "created_at", ascending: false },
    limit,
  })
}

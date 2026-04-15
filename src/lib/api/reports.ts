import type { Database, Enums, Tables } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import { postJson } from "@/lib/commands/_utils"
import { isAbortLikeError, toQueryError, toQuerySuccess } from "@/lib/api/_utils"

type FeedIncomingRow = Tables<"feed_incoming">
type FeedTypeRow = Database["public"]["Functions"]["api_feed_type_options_rpc"]["Returns"][number]
type FcrTrendRow = Database["public"]["Functions"]["get_fcr_trend"]["Returns"][number]
type GrowthTrendRow = Database["public"]["Functions"]["get_growth_trend"]["Returns"][number]
type RunningStockRow = Database["public"]["Functions"]["get_running_stock"]["Returns"][number]
type FeedingRecordRow = Tables<"feeding_record">
type FishHarvestRow = Tables<"fish_harvest">
type FishSamplingWeightRow = Tables<"fish_sampling_weight">
type FishMortalityRow = Tables<"fish_mortality">
type SystemRow = Tables<"system">
type WaterQualityMeasurementRow = Tables<"water_quality_measurement">
type FishTransferRow = Tables<"fish_transfer">
type FishStockingRow = Tables<"fish_stocking">
export type ChangeLogRow = {
  id: string | number
  table_name: string | null
  change_type: Enums<"change_type_enum"> | null
  column_name: string | null
  change_time: string | null
  system_id?: number | null
  batch_id?: number | null
}

export type FeedingRecordWithType = FeedingRecordRow & { feed_type: FeedTypeRow | null }
export type FeedFcrTrendRow = FcrTrendRow
export type FeedGrowthTrendRow = GrowthTrendRow
export type FeedRunningStockRow = RunningStockRow

export async function getFeedingRecords(params?: {
  systemId?: number
  systemIds?: number[]
  batchId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<FeedingRecordWithType>> {
  try {
    const response = await postJson<{ data: FeedingRecordWithType[] }, Omit<NonNullable<typeof params>, "signal">>(
      "/api/reports/feeding-records/query",
      {
        systemId: params?.systemId,
        systemIds: params?.systemIds,
        batchId: params?.batchId,
        dateFrom: params?.dateFrom,
        dateTo: params?.dateTo,
        limit: params?.limit,
      },
      { signal: params?.signal },
    )
    return toQuerySuccess<FeedingRecordWithType>(response.data)
  } catch (error) {
    if (params?.signal?.aborted || isAbortLikeError(error)) return toQuerySuccess<FeedingRecordWithType>([])
    return toQueryError("getFeedingRecords", error)
  }
}

export async function getRunningStock(params: {
  farmId?: string | null
  signal?: AbortSignal
}): Promise<QueryResult<FeedRunningStockRow>> {
  if (!params.farmId) {
    return toQuerySuccess<FeedRunningStockRow>([])
  }

  try {
    const response = await postJson<{ data: FeedRunningStockRow[] }, Omit<typeof params, "signal">>(
      "/api/reports/running-stock/query",
      { farmId: params.farmId },
      { signal: params.signal },
    )
    return toQuerySuccess<FeedRunningStockRow>(response.data)
  } catch (error) {
    if (params.signal?.aborted || isAbortLikeError(error)) return toQuerySuccess<FeedRunningStockRow>([])
    return toQueryError("getRunningStock", error)
  }
}


export async function getFcrTrend(params: {
  farmId?: string | null
  systemId?: number
  days?: number
  dateFrom?: string
  dateTo?: string
  signal?: AbortSignal
}): Promise<QueryResult<FeedFcrTrendRow>> {
  if (!params.farmId || !params.systemId) {
    return toQuerySuccess<FeedFcrTrendRow>([])
  }

  try {
    const response = await postJson<{ data: FeedFcrTrendRow[] }, Omit<typeof params, "signal">>(
      "/api/reports/fcr-trend/query",
      {
        farmId: params.farmId,
        systemId: params.systemId,
        days: params.days,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
      },
      { signal: params.signal },
    )
    return toQuerySuccess<FeedFcrTrendRow>(response.data)
  } catch (error) {
    if (params.signal?.aborted || isAbortLikeError(error)) return toQuerySuccess<FeedFcrTrendRow>([])
    return toQueryError("getFcrTrend", error)
  }
}

export async function getGrowthTrend(params: {
  systemId?: number
  days?: number
  dateFrom?: string
  dateTo?: string
  signal?: AbortSignal
}): Promise<QueryResult<FeedGrowthTrendRow>> {
  if (!params.systemId) {
    return toQuerySuccess<FeedGrowthTrendRow>([])
  }

  try {
    const response = await postJson<{ data: FeedGrowthTrendRow[] }, Omit<typeof params, "signal">>(
      "/api/reports/growth-trend/query",
      {
        systemId: params.systemId,
        days: params.days,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
      },
      { signal: params.signal },
    )
    return toQuerySuccess<FeedGrowthTrendRow>(response.data)
  } catch (error) {
    if (params.signal?.aborted || isAbortLikeError(error)) return toQuerySuccess<FeedGrowthTrendRow>([])
    return toQueryError("getGrowthTrend", error)
  }
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
  try {
    const response = await postJson<{ data: FishHarvestRow[] }, Omit<NonNullable<typeof params>, "signal">>(
      "/api/reports/harvests/query",
      {
        systemId: params?.systemId,
        systemIds: params?.systemIds,
        batchId: params?.batchId,
        dateFrom: params?.dateFrom,
        dateTo: params?.dateTo,
        limit: params?.limit,
      },
      { signal: params?.signal },
    )
    return toQuerySuccess<FishHarvestRow>(response.data)
  } catch (error) {
    if (params?.signal?.aborted || isAbortLikeError(error)) return toQuerySuccess<FishHarvestRow>([])
    return toQueryError("getHarvests", error)
  }
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
  try {
    const response = await postJson<{ data: FishStockingRow[] }, Omit<NonNullable<typeof params>, "signal">>(
      "/api/reports/stockings/query",
      {
        systemId: params?.systemId,
        systemIds: params?.systemIds,
        batchId: params?.batchId,
        dateFrom: params?.dateFrom,
        dateTo: params?.dateTo,
        limit: params?.limit,
      },
      { signal: params?.signal },
    )
    return toQuerySuccess<FishStockingRow>(response.data)
  } catch (error) {
    if (params?.signal?.aborted || isAbortLikeError(error)) return toQuerySuccess<FishStockingRow>([])
    return toQueryError("getStockings", error)
  }
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
  try {
    const response = await postJson<{ data: FishSamplingWeightRow[] }, Omit<NonNullable<typeof params>, "signal">>(
      "/api/reports/sampling/query",
      {
        systemId: params?.systemId,
        systemIds: params?.systemIds,
        batchId: params?.batchId,
        dateFrom: params?.dateFrom,
        dateTo: params?.dateTo,
        limit: params?.limit,
      },
      { signal: params?.signal },
    )
    return toQuerySuccess<FishSamplingWeightRow>(response.data)
  } catch (error) {
    if (params?.signal?.aborted || isAbortLikeError(error)) return toQuerySuccess<FishSamplingWeightRow>([])
    return toQueryError("getSamplingData", error)
  }
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
  try {
    const response = await postJson<{ data: FishMortalityRow[] }, Omit<NonNullable<typeof params>, "signal">>(
      "/api/reports/mortality/query",
      {
        systemId: params?.systemId,
        systemIds: params?.systemIds,
        batchId: params?.batchId,
        dateFrom: params?.dateFrom,
        dateTo: params?.dateTo,
        limit: params?.limit,
      },
      { signal: params?.signal },
    )
    return toQuerySuccess<FishMortalityRow>(response.data)
  } catch (error) {
    if (params?.signal?.aborted || isAbortLikeError(error)) return toQuerySuccess<FishMortalityRow>([])
    return toQueryError("getMortalityData", error)
  }
}

export async function getTransferData(params?: {
  batchId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<FishTransferRow>> {
  try {
    const response = await postJson<{ data: FishTransferRow[] }, Omit<NonNullable<typeof params>, "signal">>(
      "/api/reports/transfer/query",
      {
        batchId: params?.batchId,
        dateFrom: params?.dateFrom,
        dateTo: params?.dateTo,
        limit: params?.limit,
      },
      { signal: params?.signal },
    )
    return toQuerySuccess<FishTransferRow>(response.data)
  } catch (error) {
    if (params?.signal?.aborted || isAbortLikeError(error)) return toQuerySuccess<FishTransferRow>([])
    return toQueryError("getTransferData", error)
  }
}

export async function getRecentActivities(params?: {
  tableName?: string
  changeType?: Enums<"change_type_enum">
  dateFrom?: string
  dateTo?: string
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<ChangeLogRow>> {
  try {
    const response = await postJson<{ data: ChangeLogRow[] }, Omit<NonNullable<typeof params>, "signal">>(
      "/api/reports/recent-activities/query",
      {
        tableName: params?.tableName,
        changeType: params?.changeType,
        dateFrom: params?.dateFrom,
        dateTo: params?.dateTo,
        limit: params?.limit,
      },
      { signal: params?.signal },
    )
    return toQuerySuccess<ChangeLogRow>(response.data)
  } catch (error) {
    if (params?.signal?.aborted || isAbortLikeError(error)) return toQuerySuccess<ChangeLogRow>([])
    return toQuerySuccess<ChangeLogRow>([])
  }
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

export async function getRecentEntries(farmId?: string | null, signal?: AbortSignal) {
  if (!farmId) return emptyRecentEntries()
  try {
    const response = await postJson<{ data: ReturnType<typeof emptyRecentEntries> }, { farmId: string | null }>(
      "/api/reports/recent-entries/query",
      { farmId },
      { signal },
    )
    return response.data
  } catch (error) {
    if (signal?.aborted || isAbortLikeError(error)) return emptyRecentEntries()
    return emptyRecentEntries()
  }
}

export async function getBatchSystemIds(params: {
  batchId: number
  signal?: AbortSignal
}): Promise<QueryResult<{ system_id: number }>> {
  try {
    const response = await postJson<{ data: Array<{ system_id: number }> }, { batchId: number }>(
      "/api/reports/batch-system-ids/query",
      { batchId: params.batchId },
      { signal: params.signal },
    )
    return toQuerySuccess<{ system_id: number }>(response.data)
  } catch (error) {
    if (params.signal?.aborted || isAbortLikeError(error)) return toQuerySuccess<{ system_id: number }>([])
    return toQueryError("getBatchSystemIds", error)
  }
}

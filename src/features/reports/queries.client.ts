"use client"

import type { Enums, Tables } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import { postJson } from "@/lib/commands/_utils"
import { isAbortLikeError, toQueryError, toQuerySuccess } from "@/lib/api/_utils"
import type {
  ChangeLogRow,
  FeedingBreakdownRow,
  FeedingRecordWithType,
  FeedGrowthTrendRow,
  FeedRunningStockRow,
  FeedingSummaryRow,
  PerformanceSummaryRow,
  PerformanceRecordRow,
} from "./types"

type FeedInventoryRow = Tables<"feed_inventory">
type FeedingRecordRow = Tables<"feeding_record">
type FishHarvestRow = Tables<"fish_harvest">
type FishSamplingWeightRow = Tables<"fish_sampling_weight">
type FishMortalityRow = Tables<"fish_mortality">
type SystemRow = Tables<"system">
type WaterQualityMeasurementRow = Tables<"water_quality_measurement">
type FishTransferRow = Tables<"fish_transfer">
type FishStockingRow = Tables<"fish_stocking">

export type {
  ChangeLogRow,
  FeedingBreakdownRow,
  FeedingRecordWithType,
  FeedGrowthTrendRow,
  FeedRunningStockRow,
  FeedingSummaryRow,
  PerformanceRecordRow,
  PerformanceSummaryRow,
} from "./types"

export async function getFeedingRecords(params?: {
  farmId?: string | null
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
        farmId: params?.farmId,
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

export async function getFeedingSummary(params?: {
  farmId?: string | null
  systemId?: number
  batchId?: number
  dateFrom?: string
  dateTo?: string
  signal?: AbortSignal
}): Promise<QueryResult<FeedingSummaryRow>> {
  try {
    const response = await postJson<{ data: FeedingSummaryRow[] }, Omit<NonNullable<typeof params>, "signal">>(
      "/api/reports/feeding-summary/query",
      {
        farmId: params?.farmId,
        systemId: params?.systemId,
        batchId: params?.batchId,
        dateFrom: params?.dateFrom,
        dateTo: params?.dateTo,
      },
      { signal: params?.signal },
    )
    return toQuerySuccess<FeedingSummaryRow>(response.data)
  } catch (error) {
    if (params?.signal?.aborted || isAbortLikeError(error)) return toQuerySuccess<FeedingSummaryRow>([])
    return toQueryError("getFeedingSummary", error)
  }
}

export async function getFeedingBreakdown(params?: {
  farmId?: string | null
  systemId?: number
  batchId?: number
  dateFrom?: string
  dateTo?: string
  signal?: AbortSignal
}): Promise<QueryResult<FeedingBreakdownRow>> {
  try {
    const response = await postJson<{ data: FeedingBreakdownRow[] }, Omit<NonNullable<typeof params>, "signal">>(
      "/api/reports/feeding-breakdown/query",
      {
        farmId: params?.farmId,
        systemId: params?.systemId,
        batchId: params?.batchId,
        dateFrom: params?.dateFrom,
        dateTo: params?.dateTo,
      },
      { signal: params?.signal },
    )
    return toQuerySuccess<FeedingBreakdownRow>(response.data)
  } catch (error) {
    if (params?.signal?.aborted || isAbortLikeError(error)) return toQuerySuccess<FeedingBreakdownRow>([])
    return toQueryError("getFeedingBreakdown", error)
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

export async function getGrowthTrend(params: {
  farmId?: string | null
  systemId?: number
  days?: number
  dateFrom?: string
  dateTo?: string
  signal?: AbortSignal
}): Promise<QueryResult<FeedGrowthTrendRow>> {
  if (!params.farmId || !params.systemId) {
    return toQuerySuccess<FeedGrowthTrendRow>([])
  }

  try {
    const response = await postJson<{ data: FeedGrowthTrendRow[] }, Omit<typeof params, "signal">>(
      "/api/reports/growth-trend/query",
      {
        farmId: params.farmId,
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

export async function getPerformanceSummary(params?: {
  farmId?: string | null
  systemId?: number
  stage?: string
  dateFrom?: string
  dateTo?: string
  signal?: AbortSignal
}): Promise<QueryResult<PerformanceSummaryRow>> {
  try {
    const response = await postJson<{ data: PerformanceSummaryRow[] }, Omit<NonNullable<typeof params>, "signal">>(
      "/api/reports/performance-summary/query",
      {
        farmId: params?.farmId,
        systemId: params?.systemId,
        stage: params?.stage,
        dateFrom: params?.dateFrom,
        dateTo: params?.dateTo,
      },
      { signal: params?.signal },
    )
    return toQuerySuccess<PerformanceSummaryRow>(response.data)
  } catch (error) {
    if (params?.signal?.aborted || isAbortLikeError(error)) return toQuerySuccess<PerformanceSummaryRow>([])
    return toQueryError("getPerformanceSummary", error)
  }
}

export async function getPerformanceRecords(params?: {
  farmId?: string | null
  systemId?: number
  stage?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<PerformanceRecordRow>> {
  try {
    const response = await postJson<{ data: PerformanceRecordRow[] }, Omit<NonNullable<typeof params>, "signal">>(
      "/api/reports/performance-records/query",
      {
        farmId: params?.farmId,
        systemId: params?.systemId,
        stage: params?.stage,
        dateFrom: params?.dateFrom,
        dateTo: params?.dateTo,
        limit: params?.limit,
      },
      { signal: params?.signal },
    )
    return toQuerySuccess<PerformanceRecordRow>(response.data)
  } catch (error) {
    if (params?.signal?.aborted || isAbortLikeError(error)) return toQuerySuccess<PerformanceRecordRow>([])
    return toQueryError("getPerformanceRecords", error)
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
  farmId?: string | null
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
        farmId: params?.farmId,
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
  farmId?: string | null
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
        farmId: params?.farmId,
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
  farmId?: string | null
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
        farmId: params?.farmId,
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
  farmId?: string | null
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
        farmId: params?.farmId,
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
  farmId?: string | null
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
        farmId: params?.farmId,
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
  feed_inventory: toQuerySuccess<FeedInventoryRow>([]),
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

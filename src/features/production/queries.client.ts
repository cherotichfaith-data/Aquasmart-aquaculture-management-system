"use client"

import type { QueryResult } from "@/lib/supabase-client"
import {
  getClientOrError,
  isAbortLikeError,
  isInvalidBigintUuidError,
  queryKpiRpc,
  toQuerySuccess,
  toQueryError,
} from "@/lib/api/_utils"
import { isSbAuthMissing, isSbPermissionDenied } from "@/lib/supabase/log"
import { toRpcDate, toRpcSystemIds } from "@/lib/rpc-params"
import type { Database } from "@/lib/types/database"
import type { ProductionSummaryRpcRow } from "@/features/production/types"
import { buildProductionSummaryRpcArgs, type ProductionSummaryParams } from "@/lib/production-summary-rpc"

type GrowthTrendRow = {
  system_id: number
  sample_date: string
  adg_g_day: number | null
  sgr_pct_day: number | null
}

type SystemVolumeRow = Pick<Database["public"]["Tables"]["system"]["Row"], "id" | "volume">

type FeedingRecordJoinedRow = {
  date: string | null
  system_id: number | null
  feed_type: {
    feed_line: string | null
  } | null
}

export type ProductionPeriodEnrichmentResponse = {
  volumeRows: SystemVolumeRow[]
  growthTrendRows: GrowthTrendRow[]
  feedingRecords: FeedingRecordJoinedRow[]
}

const isQuietError = (err: unknown): boolean => isAbortLikeError(err) || isSbPermissionDenied(err) || isSbAuthMissing(err)
const empty = <T,>(): QueryResult<T> => toQuerySuccess<T>([])

const normalizeSystemIds = (params?: { systemId?: number; systemIds?: number[] }) =>
  Array.from(
    new Set(
      [
        ...(params?.systemIds ?? []),
        ...(typeof params?.systemId === "number" ? [params.systemId] : []),
      ].filter((id): id is number => typeof id === "number" && Number.isFinite(id) && id > 0),
    ),
  )

async function getFarmSystemIds(
  supabase: Exclude<Awaited<ReturnType<typeof getClientOrError>>, { error: QueryResult<never> }>["supabase"],
  farmId: string,
  signal?: AbortSignal,
) {
  let query = supabase.from("system").select("id").eq("farm_id", farmId)
  if (signal) query = query.abortSignal(signal)

  const { data, error } = await query
  if (error) {
    if (signal?.aborted || isQuietError(error)) return []
    throw error
  }

  return Array.from(
    new Set((data ?? []).map((row) => row.id).filter((id): id is number => typeof id === "number" && Number.isFinite(id))),
  )
}

async function resolveScopedSystemIds(
  supabase: Exclude<Awaited<ReturnType<typeof getClientOrError>>, { error: QueryResult<never> }>["supabase"],
  params: {
    farmId?: string | null
    systemId?: number
    systemIds?: number[]
    signal?: AbortSignal
  },
): Promise<number[] | null> {
  const requestedIds = normalizeSystemIds(params)
  if (!params.farmId) return requestedIds.length > 0 ? requestedIds : null

  const farmSystemIds = await getFarmSystemIds(supabase, params.farmId, params.signal)
  if (farmSystemIds.length === 0) return []
  if (requestedIds.length === 0) return farmSystemIds

  const farmSystemIdSet = new Set(farmSystemIds)
  return requestedIds.filter((id) => farmSystemIdSet.has(id))
}

async function listSystemVolumeRows(
  supabase: Exclude<Awaited<ReturnType<typeof getClientOrError>>, { error: QueryResult<never> }>["supabase"],
  params: {
    farmId: string
    stage?: string
    systemIds?: number[]
    activeOnly?: boolean
    signal?: AbortSignal
  },
): Promise<SystemVolumeRow[]> {
  let query = supabase.from("system").select("id, volume").eq("farm_id", params.farmId)
  if (params.stage && params.stage !== "all") query = query.eq("growth_stage", params.stage as never)
  if (params.systemIds?.length) query = query.in("id", params.systemIds)
  if (params.activeOnly ?? true) query = query.eq("is_active", true)
  if (params.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query.order("id", { ascending: true })
  if (error) {
    if (params.signal?.aborted || isQuietError(error)) return []
    throw error
  }

  return (data ?? []) as SystemVolumeRow[]
}

async function listGrowthTrendRows(
  supabase: Exclude<Awaited<ReturnType<typeof getClientOrError>>, { error: QueryResult<never> }>["supabase"],
  params: {
    farmId: string
    systemIds: number[]
    dateFrom?: string
    dateTo?: string
    signal?: AbortSignal
  },
): Promise<GrowthTrendRow[]> {
  let query = queryKpiRpc(supabase, "api_growth_trend", {
    p_farm_id: params.farmId,
    p_system_ids: toRpcSystemIds(params.systemIds),
    p_start_date: toRpcDate(params.dateFrom),
    p_end_date: toRpcDate(params.dateTo),
  })
  if (params.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (params.signal?.aborted || isQuietError(error)) return []
    throw error
  }

  return ((data ?? []) as GrowthTrendRow[]).map((row) => ({
    ...row,
    system_id:
      typeof row.system_id === "number" ? row.system_id : params.systemIds.length === 1 ? params.systemIds[0] : row.system_id,
  }))
}

async function listFeedingRecordRows(
  supabase: Exclude<Awaited<ReturnType<typeof getClientOrError>>, { error: QueryResult<never> }>["supabase"],
  params: {
    farmId: string
    systemIds: number[]
    dateTo?: string
    signal?: AbortSignal
  },
): Promise<FeedingRecordJoinedRow[]> {
  const scopedSystemIds = await resolveScopedSystemIds(supabase, {
    farmId: params.farmId,
    systemIds: params.systemIds,
    signal: params.signal,
  })
  if (!scopedSystemIds || scopedSystemIds.length === 0) return []

  let query = supabase.from("feeding_record").select(`
      date,
      system_id,
      feed_type:feed_type (
        feed_line
      )
    `)
  query = query.in("system_id", scopedSystemIds)
  if (params.dateTo) query = query.lte("date", params.dateTo)
  if (params.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query.order("date", { ascending: false }).limit(5000)
  if (error) {
    if (params.signal?.aborted || isQuietError(error)) return []
    throw error
  }

  return (data ?? []) as FeedingRecordJoinedRow[]
}

export async function getProductionSummary(params?: Omit<ProductionSummaryParams, "farmId"> & {
  farmId?: string | null
  signal?: AbortSignal
}): Promise<QueryResult<ProductionSummaryRpcRow>> {
  if (!params?.farmId) return empty<ProductionSummaryRpcRow>()

  const clientResult = await getClientOrError("getProductionSummary", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = queryKpiRpc(
    supabase,
    "api_production_summary",
    buildProductionSummaryRpcArgs({
      farmId: params.farmId,
      systemId: params.systemId,
      stage: params.stage,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    }),
  )
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (isQuietError(error) || isInvalidBigintUuidError(error)) {
      return empty<ProductionSummaryRpcRow>()
    }
    return toQueryError("getProductionSummary", error)
  }

  let rows = ((data ?? []) as ProductionSummaryRpcRow[]).slice()
  if (params?.limit) rows = rows.slice(0, params.limit)
  return toQuerySuccess(rows)
}

export async function getProductionPeriodEnrichment(params?: {
  farmId?: string | null
  systemId?: number
  systemIds?: number[]
  stage?: string
  dateFrom?: string
  dateTo?: string
  signal?: AbortSignal
}): Promise<ProductionPeriodEnrichmentResponse> {
  if (!params?.farmId || !params.dateFrom || !params.dateTo) {
    return { volumeRows: [], growthTrendRows: [], feedingRecords: [] }
  }

  const clientResult = await getClientOrError("getProductionPeriodEnrichment", { requireSession: true })
  if ("error" in clientResult) return { volumeRows: [], growthTrendRows: [], feedingRecords: [] }
  const { supabase } = clientResult

  try {
    const scopedSystemIds = await resolveScopedSystemIds(supabase, {
      farmId: params.farmId,
      systemId: params.systemId,
      systemIds: params.systemIds,
      signal: params.signal,
    })

    if (!scopedSystemIds || scopedSystemIds.length === 0) {
      return { volumeRows: [], growthTrendRows: [], feedingRecords: [] }
    }

    const [volumeRows, feedingRecords, growthTrendRows] = await Promise.all([
      listSystemVolumeRows(supabase, {
        farmId: params.farmId,
        stage: params.stage,
        systemIds: scopedSystemIds,
        activeOnly: false,
        signal: params.signal,
      }),
      listFeedingRecordRows(supabase, {
        farmId: params.farmId,
        systemIds: scopedSystemIds,
        dateTo: params.dateTo,
        signal: params.signal,
      }),
      listGrowthTrendRows(supabase, {
        farmId: params.farmId,
        systemIds: scopedSystemIds,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        signal: params.signal,
      }),
    ])

    return { volumeRows, growthTrendRows, feedingRecords }
  } catch (error) {
    if (params.signal?.aborted || isQuietError(error)) {
      return { volumeRows: [], growthTrendRows: [], feedingRecords: [] }
    }
    throw error
  }
}

"use client"

import type { QueryResult } from "@/lib/supabase-client"
import {
  getClientOrError,
  isAbortLikeError,
  isInvalidBigintUuidError,
  queryKpiRpc,
  toQuerySuccess,
  toQueryError,
} from "@/lib/supabase/query-transport"
import { isSbAuthMissing, isSbPermissionDenied } from "@/lib/supabase/log"
import { toRpcDate } from "@/lib/rpc-params"
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
  const startDate = toRpcDate(params.dateFrom)
  const endDate = toRpcDate(params.dateTo)
  const rowsBySystem = await Promise.all(
    params.systemIds.map(async (systemId): Promise<GrowthTrendRow[]> => {
      let query = queryKpiRpc(supabase, "api_production_summary", {
        p_farm_id: params.farmId,
        p_system_id: systemId,
        p_start_date: startDate ?? undefined,
        p_end_date: endDate ?? undefined,
      })
      if (params.signal) query = query.abortSignal(params.signal)
      const { data, error } = await query
      if (error) {
        if (params.signal?.aborted || isQuietError(error)) return []
        throw error
      }
      const summaryRows = (data ?? []) as ProductionSummaryRpcRow[]
      return summaryRows.map((row) => ({
        system_id: row.system_id ?? systemId,
        sample_date: row.date,
        adg_g_day: row.agr,
        sgr_pct_day: row.sgr,
      }))
    }),
  )

  return rowsBySystem.flat().sort((left, right) => left.sample_date.localeCompare(right.sample_date))
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

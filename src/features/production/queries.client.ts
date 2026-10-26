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
import type { Database } from "@/lib/types/database"
import type { ProductionSummaryRpcRow } from "@/features/production/types"
import { buildProductionSummaryRpcArgs, type ProductionSummaryParams } from "@/lib/production-summary-rpc"

export type ProductionPeriodEnrichmentResponse = {
  volumeRows: Array<Pick<Database["public"]["Tables"]["system"]["Row"], "id" | "volume">>
  growthTrendRows: Array<{
    system_id: number
    sample_date: string
    adg_g_day: number | null
    sgr_pct_day: number | null
  }>
  feedingRecords: Array<{
    date: string | null
    system_id: number | null
    feed_type: {
      feed_line: string | null
    } | null
  }>
}

const isQuietError = (err: unknown): boolean => isAbortLikeError(err) || isSbPermissionDenied(err) || isSbAuthMissing(err)
const empty = <T,>(): QueryResult<T> => toQuerySuccess<T>([])

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

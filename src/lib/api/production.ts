import type { QueryResult } from "@/lib/supabase-client"
import { postJson } from "@/lib/commands/_utils"
import {
  getClientOrError,
  isAbortLikeError,
  isInvalidBigintUuidError,
  queryKpiRpc,
  toQueryError,
  toQuerySuccess,
} from "@/lib/api/_utils"
import { isSbAuthMissing, isSbPermissionDenied } from "@/lib/supabase/log"
import type {
  ProductionSummaryMetricsRow,
  ProductionSummaryRpcRow,
} from "@/features/production/types"
import type { ProductionPeriodViewResponse } from "@/features/production/period-view"
import { buildProductionSummaryRpcArgs, type ProductionSummaryParams } from "@/lib/production-summary-rpc"

const isQuietError = (err: unknown): boolean =>
  isAbortLikeError(err) || isSbPermissionDenied(err) || isSbAuthMissing(err)

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

export async function getProductionSummaryMetrics(params?: {
  farmId?: string | null
  systemId?: number
  systemIds?: number[]
  stage?: string
  dateFrom?: string
  dateTo?: string
  signal?: AbortSignal
}): Promise<QueryResult<ProductionSummaryMetricsRow>> {
  try {
    const response = await postJson<
      { data: ProductionSummaryMetricsRow[] },
      Omit<NonNullable<typeof params>, "signal">
    >(
      "/api/production/summary-metrics/query",
      {
        farmId: params?.farmId,
        systemId: params?.systemId,
        systemIds: params?.systemIds,
        stage: params?.stage,
        dateFrom: params?.dateFrom,
        dateTo: params?.dateTo,
      },
      { signal: params?.signal },
    )
    return toQuerySuccess<ProductionSummaryMetricsRow>(response.data)
  } catch (error) {
    if (params?.signal?.aborted || isAbortLikeError(error)) return empty<ProductionSummaryMetricsRow>()
    return toQueryError("getProductionSummaryMetrics", error)
  }
}

export async function getProductionPeriodView(params?: {
  farmId?: string | null
  systemId?: number
  systemIds?: number[]
  stage?: string
  dateFrom?: string
  dateTo?: string
  consolidate?: boolean
  signal?: AbortSignal
}): Promise<ProductionPeriodViewResponse> {
  try {
    const response = await postJson<
      { data: ProductionPeriodViewResponse },
      Omit<NonNullable<typeof params>, "signal">
    >(
      "/api/production/period-view/query",
      {
        farmId: params?.farmId,
        systemId: params?.systemId,
        systemIds: params?.systemIds,
        stage: params?.stage,
        dateFrom: params?.dateFrom,
        dateTo: params?.dateTo,
        consolidate: params?.consolidate ?? false,
      },
      { signal: params?.signal },
    )
    return response.data
  } catch (error) {
    if (params?.signal?.aborted || isAbortLikeError(error)) {
      return { chartRows: [], tableRows: [] }
    }
    throw error
  }
}

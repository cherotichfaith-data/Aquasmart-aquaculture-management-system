import type { QueryResult } from "@/lib/supabase-client"
import {
  getClientOrError,
  isAbortLikeError,
  isInvalidBigintUuidError,
  queryKpiRpc,
  toQueryError,
  toQuerySuccess,
} from "@/lib/api/_utils"
import { isSbAuthMissing, isSbPermissionDenied } from "@/lib/supabase/log"
import { toProductionTrendRows } from "@/features/dashboard/production-trend"
import type { ProductionTrendRow, ProductionTrendRpcRow } from "@/features/dashboard/types"
import { buildProductionSummaryRpcArgs, type ProductionSummaryParams } from "@/lib/production-summary-rpc"

const isQuietError = (err: unknown): boolean =>
  isAbortLikeError(err) || isSbPermissionDenied(err) || isSbAuthMissing(err)

const empty = <T,>(): QueryResult<T> => toQuerySuccess<T>([])

export async function getProductionSummary(params?: Omit<ProductionSummaryParams, "farmId"> & {
  farmId?: string | null
  signal?: AbortSignal
}): Promise<QueryResult<ProductionTrendRow>> {
  if (!params?.farmId) return empty<ProductionTrendRow>()

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
      return empty<ProductionTrendRow>()
    }
    return toQueryError("getProductionSummary", error)
  }

  let rows = toProductionTrendRows((data ?? []) as ProductionTrendRpcRow[])
    .slice()
    .sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")))

  if (params?.limit) rows = rows.slice(0, params.limit)

  return toQuerySuccess(rows)
}

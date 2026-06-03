import type { Database, Enums } from "@/lib/types/database"
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
import type { ProductionTrendRpcRow } from "@/features/dashboard/types"

type ProductionRpcArgs = {
  p_farm_id: string
  p_system_id?: number
  p_stage?: Enums<"system_growth_stage">
  p_start_date?: string
  p_end_date?: string
}

const productionRpcArgs = (params: {
  farmId: string
  systemId?: number
  stage?: Enums<"system_growth_stage">
  dateFrom?: string
  dateTo?: string
}): ProductionRpcArgs => ({
  p_farm_id: params.farmId,
  p_system_id: params.systemId ?? undefined,
  p_stage: params.stage ?? undefined,
  p_start_date: params.dateFrom ?? undefined,
  p_end_date: params.dateTo ?? undefined,
})

const isQuietError = (err: unknown): boolean =>
  isAbortLikeError(err) || isSbPermissionDenied(err) || isSbAuthMissing(err)

const empty = <T,>(): QueryResult<T> => toQuerySuccess<T>([])

export async function getProductionSummary(params?: {
  systemId?: number
  stage?: Enums<"system_growth_stage">
  dateFrom?: string
  dateTo?: string
  limit?: number
  farmId?: string | null
  signal?: AbortSignal
}): Promise<QueryResult<ProductionTrendRpcRow & { feeding_rate: number | null }>> {
  if (!params?.farmId) return empty<ProductionTrendRpcRow & { feeding_rate: number | null }>()

  const clientResult = await getClientOrError("getProductionSummary", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = queryKpiRpc(
    supabase,
    "api_production_summary",
    productionRpcArgs({
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
      return empty<ProductionTrendRpcRow & { feeding_rate: number | null }>()
    }
    return toQueryError("getProductionSummary", error)
  }

  let rows = toProductionTrendRows((data ?? []) as ProductionTrendRpcRow[])
    .slice()
    .sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")))

  if (params?.limit) rows = rows.slice(0, params.limit)

  return toQuerySuccess(rows)
}

import type { Database, Enums } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import { getClientOrError, queryKpiRpc, toQueryError, toQuerySuccess } from "@/lib/api/_utils"
import { isSbAuthMissing, isSbPermissionDenied } from "@/utils/supabase/log"

type ProductionSummaryRow = Database["public"]["Functions"]["api_production_summary"]["Returns"][number]

type ProductionRpcArgs = {
  p_farm_id: string
  p_system_id?: number
  p_start_date?: string
  p_end_date?: string
}

const productionRpcArgs = (params: {
  farmId: string
  systemId?: number
  dateFrom?: string
  dateTo?: string
}): ProductionRpcArgs => ({
  p_farm_id: params.farmId,
  p_system_id: params.systemId ?? undefined,
  p_start_date: params.dateFrom ?? undefined,
  p_end_date: params.dateTo ?? undefined,
})

const isAbortLikeError = (err: unknown): boolean => {
  if (!err) return false
  const e = err as { name?: string; message?: string }
  const name = String(e.name ?? "").toLowerCase()
  const message = String(e.message ?? "").toLowerCase()
  return (
    name.includes("abort") ||
    message.includes("abort") ||
    message.includes("canceled") ||
    message.includes("cancel")
  )
}

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
}): Promise<QueryResult<ProductionSummaryRow>> {
  if (!params?.farmId) return empty<ProductionSummaryRow>()

  const clientResult = await getClientOrError("getProductionSummary", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = queryKpiRpc(
    supabase,
    "api_production_summary",
    productionRpcArgs({
      farmId: params.farmId,
      systemId: params.systemId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    }),
  )
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (isQuietError(error)) return empty<ProductionSummaryRow>()
    return toQueryError("getProductionSummary", error)
  }

  let rows = ((data ?? []) as ProductionSummaryRow[])
    .slice()
    .sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")))

  if (params?.stage) rows = rows.filter((row) => row.growth_stage === params.stage)
  if (params?.limit) rows = rows.slice(0, params.limit)

  return toQuerySuccess(rows)
}

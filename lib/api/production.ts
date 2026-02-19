import type { Enums, Tables } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import { getClientOrError, toQueryError, toQuerySuccess } from "@/lib/api/_utils"
import { isSbPermissionDenied } from "@/utils/supabase/log"

type ProductionSummaryRow = Tables<"api_production_summary">
type EfcrLastSamplingRow = Tables<"api_efcr_trend">

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

export async function getProductionSummary(params?: {
  systemId?: number
  stage?: Enums<"system_growth_stage">
  dateFrom?: string
  dateTo?: string
  limit?: number
  farmId?: string | null
  signal?: AbortSignal
}): Promise<QueryResult<ProductionSummaryRow>> {
  if (!params?.farmId) {
    return toQuerySuccess<ProductionSummaryRow>([])
  }
  const clientResult = await getClientOrError("getProductionSummary", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase
    .rpc("api_production_summary", productionRpcArgs({
      farmId: params.farmId,
      systemId: params.systemId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    }))
    .order("date", { ascending: false })
  if (params?.stage) query = query.eq("growth_stage", params.stage)
  if (params?.limit) query = query.limit(params.limit)
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (isSbPermissionDenied(error)) {
      return toQuerySuccess<ProductionSummaryRow>([])
    }
    if (String(error?.name ?? "") === "AbortError") {
      return toQuerySuccess<ProductionSummaryRow>([])
    }
    return toQueryError("getProductionSummary", error)
  }
  const rows = (data ?? []) as ProductionSummaryRow[]
  return toQuerySuccess<ProductionSummaryRow>(rows)
}

export async function getEfcrTrend(params?: {
  systemId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  farmId?: string | null
  signal?: AbortSignal
}): Promise<QueryResult<EfcrLastSamplingRow>> {
  if (!params?.farmId) {
    return toQuerySuccess<EfcrLastSamplingRow>([])
  }
  const clientResult = await getClientOrError("getEfcrTrend", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase
    .rpc("api_efcr_trend", productionRpcArgs({
      farmId: params.farmId,
      systemId: params.systemId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    }))
    .order("inventory_date", { ascending: false })
  if (params?.limit) query = query.limit(params.limit)
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (isSbPermissionDenied(error)) {
      return toQuerySuccess<EfcrLastSamplingRow>([])
    }
    if (String(error?.name ?? "") === "AbortError") {
      return toQuerySuccess<EfcrLastSamplingRow>([])
    }
    return toQueryError("getEfcrTrend", error)
  }
  const rows = (data ?? []) as EfcrLastSamplingRow[]
  return toQuerySuccess<EfcrLastSamplingRow>(rows)
}

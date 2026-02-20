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

  let query = supabase.rpc("api_production_summary", productionRpcArgs({
    farmId: params.farmId,
    systemId: params.systemId,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  }))
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
  let rows = (data ?? []) as ProductionSummaryRow[]
  rows = rows.sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")))
  if (params?.stage) {
    rows = rows.filter((row) => row.growth_stage === params.stage)
  }
  if (params?.limit) {
    rows = rows.slice(0, params.limit)
  }
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

  let query = supabase.rpc("api_efcr_trend", productionRpcArgs({
    farmId: params.farmId,
    systemId: params.systemId,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  }))
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
  let rows = (data ?? []) as EfcrLastSamplingRow[]
  rows = rows.sort((a, b) => String(b.inventory_date ?? "").localeCompare(String(a.inventory_date ?? "")))
  if (params?.limit) {
    rows = rows.slice(0, params.limit)
  }
  return toQuerySuccess<EfcrLastSamplingRow>(rows)
}

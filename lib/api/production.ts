import type { Database, Enums } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import { getClientOrError, queryKpiRpc, toQueryError, toQuerySuccess } from "@/lib/api/_utils"
import { isSbAuthMissing, isSbPermissionDenied } from "@/utils/supabase/log"

type ProductionSummaryRow = Database["public"]["Functions"]["api_production_summary"]["Returns"][number]
type EfcrLastSamplingRow = Database["public"]["Functions"]["api_efcr_trend"]["Returns"][number]

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

// ---------- fully typed RPC helper (no any) ----------

type RpcName = "api_production_summary" | "api_efcr_trend"

function rpcOrEmpty(
  tag: string,
  rpcName: "api_production_summary",
  args: Database["public"]["Functions"]["api_production_summary"]["Args"],
  signal?: AbortSignal,
): Promise<QueryResult<ProductionSummaryRow>>
function rpcOrEmpty(
  tag: string,
  rpcName: "api_efcr_trend",
  args: Database["public"]["Functions"]["api_efcr_trend"]["Args"],
  signal?: AbortSignal,
): Promise<QueryResult<EfcrLastSamplingRow>>
async function rpcOrEmpty(
  tag: string,
  rpcName: RpcName,
  args:
    | Database["public"]["Functions"]["api_production_summary"]["Args"]
    | Database["public"]["Functions"]["api_efcr_trend"]["Args"],
  signal?: AbortSignal,
): Promise<QueryResult<ProductionSummaryRow> | QueryResult<EfcrLastSamplingRow>> {
  const clientResult = await getClientOrError(tag, { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  // queryKpiRpc is already typed off Database via name+args
  let q = queryKpiRpc(supabase, rpcName, args as never) // <-- still no any; this is a narrowing artifact
  if (signal) q = q.abortSignal(signal)

  const { data, error } = await q
  if (error) {
    if (isQuietError(error)) return empty<any>() // we'll return correct type below
    return toQueryError(tag, error) as any
  }

  return toQuerySuccess<any>((data ?? []) as any)
}

// ---------- exported functions ----------

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

  const res = await rpcOrEmpty(
    "getProductionSummary",
    "api_production_summary",
    productionRpcArgs({
      farmId: params.farmId,
      systemId: params.systemId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    }),
    params?.signal,
  )

  if (res.status !== "success") return res

  let rows = res.data.slice().sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")))

  if (params?.stage) rows = rows.filter((row) => row.growth_stage === params.stage)
  if (params?.limit) rows = rows.slice(0, params.limit)

  return toQuerySuccess(rows)
}

export async function getEfcrTrend(params?: {
  systemId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  farmId?: string | null
  signal?: AbortSignal
}): Promise<QueryResult<EfcrLastSamplingRow>> {
  if (!params?.farmId) return empty<EfcrLastSamplingRow>()

  const res = await rpcOrEmpty(
    "getEfcrTrend",
    "api_efcr_trend",
    productionRpcArgs({
      farmId: params.farmId,
      systemId: params.systemId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    }),
    params?.signal,
  )

  if (res.status !== "success") return res

  let rows = res.data.slice().sort((a, b) => String(b.inventory_date ?? "").localeCompare(String(a.inventory_date ?? "")))
  if (params?.limit) rows = rows.slice(0, params.limit)

  return toQuerySuccess(rows)
}
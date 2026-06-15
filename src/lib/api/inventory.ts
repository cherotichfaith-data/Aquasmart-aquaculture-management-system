import type { Database, Enums } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import { getClientOrError, isAbortLikeError, queryKpiRpc, toQueryError, toQuerySuccess } from "@/lib/api/_utils"
import { isSbAuthMissing, isSbPermissionDenied } from "@/lib/supabase/log"
import { toRpcDate, toRpcSystemId, type RpcDate, type RpcSystemId } from "@/lib/rpc-params"

type DailyFishInventoryRow = Database["public"]["Functions"]["api_daily_fish_inventory_rpc"]["Returns"][number]

type DailyInventoryRpcArgs = {
  p_farm_id: string
  p_system_id: RpcSystemId
  p_stage?: Enums<"system_growth_stage">
  p_start_date: RpcDate
  p_end_date: RpcDate
  // NEW (server-side paging/order)
  p_cursor_date: RpcDate
  p_cursor_system_id?: number
  p_order_asc?: boolean
  p_limit?: number
}

const dailyInventoryRpcArgs = (params: {
  farmId: string
  systemId?: number
  stage?: Enums<"system_growth_stage">
  dateFrom?: string
  dateTo?: string
  cursorDate?: string
  orderAsc?: boolean
  limit?: number
}): DailyInventoryRpcArgs => ({
  p_farm_id: params.farmId,
  p_system_id: toRpcSystemId(params.systemId),
  p_stage: params.stage ?? undefined,
  p_start_date: toRpcDate(params.dateFrom),
  p_end_date: toRpcDate(params.dateTo),
  p_cursor_date: toRpcDate(params.cursorDate),
  p_order_asc: params.orderAsc ?? false,
  p_limit: params.limit ?? 5000,
})

export async function getDailyFishInventory(params?: {
  systemId?: number
  stage?: Enums<"system_growth_stage">
  dateFrom?: string
  dateTo?: string
  limit?: number
  cursorDate?: string
  orderAsc?: boolean
  farmId?: string | null
  signal?: AbortSignal
}): Promise<QueryResult<DailyFishInventoryRow>> {
  if (!params?.farmId) {
    return toQuerySuccess<DailyFishInventoryRow>([])
  }

  const clientResult = await getClientOrError("getDailyFishInventory", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  const args = dailyInventoryRpcArgs({
    farmId: params.farmId,
    systemId: params.systemId,
    stage: params.stage,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    cursorDate: params.cursorDate,
    orderAsc: params.orderAsc,
    limit: params.limit,
  })

  // api_daily_fish_inventory_rpc is the canonical RPC for frontend reads.
  let query = queryKpiRpc(supabase, "api_daily_fish_inventory_rpc", args)
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (params?.signal?.aborted) return toQuerySuccess<DailyFishInventoryRow>([])
  if (error && isAbortLikeError(error)) return toQuerySuccess<DailyFishInventoryRow>([])
  if (error && (isSbPermissionDenied(error) || isSbAuthMissing(error))) {
    return toQuerySuccess<DailyFishInventoryRow>([])
  }
  if (error) return toQueryError("getDailyFishInventory", error)

  // No client-side sort/paging needed: backend already applied cursor/order/limit.
  return toQuerySuccess<DailyFishInventoryRow>((data ?? []) as DailyFishInventoryRow[])
}

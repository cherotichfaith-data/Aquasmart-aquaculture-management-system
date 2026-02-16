import type { Tables } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import { getClientOrError, toQueryError, toQuerySuccess } from "@/lib/api/_utils"

type DailyFishInventoryRow = Tables<"api_daily_fish_inventory">
type DailyFishInventoryConsolidatedRow = Tables<"api_daily_fish_inventory_consolidated">

type DailyInventoryRpcArgs = {
  p_farm_id: string
  p_system_id?: number | null
  p_start_date?: string | null
  p_end_date?: string | null
}

type DailyInventoryConsolidatedRpcArgs = {
  p_farm_id: string
  p_system_id?: number | null
  p_start_date?: string | null
  p_end_date?: string | null
}

const dailyInventoryRpcArgs = (params: {
  farmId: string
  systemId?: number
  dateFrom?: string
  dateTo?: string
}): DailyInventoryRpcArgs => ({
  p_farm_id: params.farmId,
  p_system_id: params.systemId ?? null,
  p_start_date: params.dateFrom ?? null,
  p_end_date: params.dateTo ?? null,
})

const dailyInventoryConsolidatedRpcArgs = (params: {
  farmId: string
  systemId?: number
  dateFrom?: string
  dateTo?: string
}): DailyInventoryConsolidatedRpcArgs => ({
  p_farm_id: params.farmId,
  p_system_id: params.systemId ?? null,
  p_start_date: params.dateFrom ?? null,
  p_end_date: params.dateTo ?? null,
})

export async function getDailyFishInventory(params?: {
  systemId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  farmId?: string | null
  signal?: AbortSignal
}): Promise<QueryResult<DailyFishInventoryRow>> {
  if (!params?.farmId) {
    return toQuerySuccess<DailyFishInventoryRow>([])
  }
  const clientResult = await getClientOrError("getDailyFishInventory", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase
    .rpc("api_daily_fish_inventory", dailyInventoryRpcArgs({
      farmId: params.farmId,
      systemId: params.systemId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    }))
    .order("inventory_date", { ascending: false })
  if (params?.limit) query = query.limit(params.limit)
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) return toQueryError("getDailyFishInventory", error)
  const rows = (data ?? []) as DailyFishInventoryRow[]
  return toQuerySuccess<DailyFishInventoryRow>(rows)
}

export async function getDailyFishInventoryConsolidated(params?: {
  limit?: number
  dateFrom?: string
  dateTo?: string
  farmId?: string | null
  signal?: AbortSignal
}): Promise<QueryResult<DailyFishInventoryConsolidatedRow>> {
  if (!params?.farmId) {
    return toQuerySuccess<DailyFishInventoryConsolidatedRow>([])
  }
  const clientResult = await getClientOrError("getDailyFishInventoryConsolidated", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase
    .rpc("api_daily_fish_inventory_consolidated", dailyInventoryConsolidatedRpcArgs({
      farmId: params.farmId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    }))
    .order("inventory_date", { ascending: false })
  if (params?.limit) query = query.limit(params.limit)
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) return toQueryError("getDailyFishInventoryConsolidated", error)
  const rows = (data ?? []) as DailyFishInventoryConsolidatedRow[]
  return toQuerySuccess<DailyFishInventoryConsolidatedRow>(rows)
}

export async function getLatestInventory(params?: { systemId?: number; farmId?: string | null; signal?: AbortSignal }) {
  return getDailyFishInventory({
    systemId: params?.systemId,
    farmId: params?.farmId ?? null,
    limit: 1,
    signal: params?.signal,
  })
}

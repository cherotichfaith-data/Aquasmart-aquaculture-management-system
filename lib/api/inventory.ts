import type { Tables } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import { getClientOrError, toQueryError, toQuerySuccess } from "@/lib/api/_utils"

type DailyFishInventoryRow = Tables<"api_daily_fish_inventory">
type DailyFishInventoryConsolidatedRow = Tables<"api_daily_fish_inventory_consolidated">

type DailyInventoryRpcArgs = {
  p_farm_id: string
  p_system_id?: number
  p_start_date?: string
  p_end_date?: string
}

type DailyInventoryConsolidatedRpcArgs = {
  p_farm_id: string
  p_system_id?: number
  p_start_date?: string
  p_end_date?: string
}

const dailyInventoryRpcArgs = (params: {
  farmId: string
  systemId?: number
  dateFrom?: string
  dateTo?: string
}): DailyInventoryRpcArgs => ({
  p_farm_id: params.farmId,
  p_system_id: params.systemId ?? undefined,
  p_start_date: params.dateFrom ?? undefined,
  p_end_date: params.dateTo ?? undefined,
})

const dailyInventoryConsolidatedRpcArgs = (params: {
  farmId: string
  systemId?: number
  dateFrom?: string
  dateTo?: string
}): DailyInventoryConsolidatedRpcArgs => ({
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
  return name.includes("abort") || message.includes("abort")
}

export async function getDailyFishInventory(params?: {
  systemId?: number
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

  let query = supabase
    .rpc("api_daily_fish_inventory", dailyInventoryRpcArgs({
      farmId: params.farmId,
      systemId: params.systemId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    }))
    .order("inventory_date", { ascending: params?.orderAsc ?? false })

  if (params?.cursorDate) {
    query = query.gt("inventory_date", params.cursorDate)
  }

  if (params?.limit) query = query.limit(params.limit)
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (params?.signal?.aborted) return toQuerySuccess<DailyFishInventoryRow>([])
  if (error && isAbortLikeError(error)) return toQuerySuccess<DailyFishInventoryRow>([])
  if (error) return toQueryError("getDailyFishInventory", error)
  const rows = (data ?? []) as DailyFishInventoryRow[]
  return toQuerySuccess<DailyFishInventoryRow>(rows)
}

export async function getDailyFishInventoryCount(params?: {
  systemId?: number
  dateFrom?: string
  dateTo?: string
  farmId?: string | null
  signal?: AbortSignal
}): Promise<{ status: "success"; data: number } | { status: "error"; data: null; error: string }> {
  if (!params?.farmId) {
    return { status: "success", data: 0 }
  }

  const clientResult = await getClientOrError("getDailyFishInventoryCount", { requireSession: true })
  if ("error" in clientResult) {
    if (clientResult.error.status === "error") {
      return { status: "error", data: null, error: clientResult.error.error }
    }
    return { status: "error", data: null, error: "Failed to initialize Supabase client" }
  }
  const { supabase } = clientResult

  let query = supabase.rpc("api_daily_fish_inventory_count", dailyInventoryRpcArgs({
    farmId: params.farmId,
    systemId: params.systemId,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  }))
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) return { status: "error", data: null, error: error.message }
  return { status: "success", data: data ?? 0 }
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
    orderAsc: false,
    signal: params?.signal,
  })
}

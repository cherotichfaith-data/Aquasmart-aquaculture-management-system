import type { Enums, Tables } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import { getClientOrError, toQueryError, toQuerySuccess } from "@/lib/api/_utils"
import { isSbPermissionDenied } from "@/utils/supabase/log"

type SystemListItem = Tables<"api_system_options">
type BatchListItem = Tables<"api_fingerling_batch_options">
type FeedTypeOptionRow = Tables<"api_feed_type_options">
type FarmOptionRow = Tables<"api_farm_options">

export async function getSystemOptions(params?: {
  farmId?: string | null
  stage?: Enums<"system_growth_stage"> | "all"
  signal?: AbortSignal
}): Promise<QueryResult<SystemListItem>> {
  if (!params?.farmId) {
    return toQuerySuccess<SystemListItem>([])
  }
  const clientResult = await getClientOrError("getSystemOptions")
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase.rpc("api_dashboard_systems", {
    p_farm_id: params.farmId,
    p_stage: params?.stage && params.stage !== "all" ? params.stage : undefined,
    p_system_id: undefined,
    p_start_date: undefined,
    p_end_date: undefined,
  })
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (isSbPermissionDenied(error)) {
      return toQuerySuccess<SystemListItem>([])
    }
    return toQueryError("getSystemOptions", error)
  }

  const rowsMap = new Map<number, SystemListItem>()
  const rawRows = (data ?? []) as Array<{
    system_id: number | null
    system_name: string | null
    growth_stage: string | null
  }>
  rawRows.forEach((row) => {
    if (typeof row.system_id !== "number") return
    const growthStage =
      row.growth_stage === "nursing"
        ? "nursing"
        : row.growth_stage === "grow_out" || row.growth_stage === "grow out"
          ? "grow_out"
          : null
    rowsMap.set(row.system_id, {
      id: row.system_id,
      label: row.system_name ?? `System ${row.system_id}`,
      farm_id: params.farmId ?? null,
      farm_name: null,
      growth_stage: growthStage,
      is_active: true,
      type: null,
    })
  })

  const rows = Array.from(rowsMap.values()).sort((a, b) =>
    String(a.label ?? "").localeCompare(String(b.label ?? "")),
  )

  return toQuerySuccess<SystemListItem>(rows)
}

export async function getBatchOptions(params?: {
  farmId?: string | null
  signal?: AbortSignal
}): Promise<QueryResult<BatchListItem>> {
  if (!params?.farmId) {
    return toQuerySuccess<BatchListItem>([])
  }
  const clientResult = await getClientOrError("getBatchOptions")
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase.from("api_fingerling_batch_options").select("id,label,farm_id,date_of_delivery")
  query = query.eq("farm_id", params.farmId)
  query = query.order("date_of_delivery", { ascending: false })
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (isSbPermissionDenied(error)) {
      return toQuerySuccess<BatchListItem>([])
    }
    return toQueryError("getBatchOptions", error)
  }
  return toQuerySuccess<BatchListItem>(data as BatchListItem[])
}

export async function getFeedTypeOptions(params?: {
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<FeedTypeOptionRow>> {
  const clientResult = await getClientOrError("getFeedTypeOptions")
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase.from("api_feed_type_options").select("id,label,feed_line").order("label", { ascending: true })
  if (params?.limit) query = query.limit(params.limit)
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) return toQueryError("getFeedTypeOptions", error)
  return toQuerySuccess<FeedTypeOptionRow>(data as FeedTypeOptionRow[])
}

export async function getFarmOptions(params?: {
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<FarmOptionRow>> {
  const clientResult = await getClientOrError("getFarmOptions")
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase.from("api_farm_options").select("id,label,location").order("label", { ascending: true })
  if (params?.limit) query = query.limit(params.limit)
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (isSbPermissionDenied(error)) {
      return toQuerySuccess<FarmOptionRow>([])
    }
    return toQueryError("getFarmOptions", error)
  }
  return toQuerySuccess<FarmOptionRow>(data as FarmOptionRow[])
}

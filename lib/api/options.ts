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
  activeOnly?: boolean
  signal?: AbortSignal
}): Promise<QueryResult<SystemListItem>> {
  if (!params?.farmId) {
    return toQuerySuccess<SystemListItem>([])
  }
  const clientResult = await getClientOrError("getSystemOptions")
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase.from("api_system_options").select("id,label,farm_id,farm_name,growth_stage,is_active")
  query = query.eq("farm_id", params.farmId)
  query = query.order("label", { ascending: true })
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (isSbPermissionDenied(error)) {
      return toQuerySuccess<SystemListItem>([])
    }
    return toQueryError("getSystemOptions", error)
  }

  let rows = (data ?? []) as SystemListItem[]
  if (params?.stage && params.stage !== "all") {
    rows = rows.filter((row) => row.growth_stage === params.stage)
  }
  if (params?.activeOnly) {
    rows = rows.filter((row) => row.is_active !== false)
  }

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

export async function getFeedTypeOptions(params?: { limit?: number; signal?: AbortSignal }): Promise<QueryResult<FeedTypeOptionRow>> {
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

export async function getFarmOptions(params?: { limit?: number; signal?: AbortSignal }): Promise<QueryResult<FarmOptionRow>> {
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

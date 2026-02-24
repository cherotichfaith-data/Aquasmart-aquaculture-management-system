import type { Enums, Tables } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import { getClientOrError, queryOptionsView, toQueryError, toQuerySuccess } from "@/lib/api/_utils"
import { isSbAuthMissing, isSbPermissionDenied } from "@/utils/supabase/log"

type SystemListItem = Tables<"api_system_options">
type BatchListItem = Tables<"api_fingerling_batch_options">
type FeedTypeOptionRow = Tables<"api_feed_type_options">
type FarmOptionRow = Tables<"api_farm_options">
type FeedTypeRow = Tables<"feed_type">

const isAbortLikeError = (err: unknown): boolean => {
  if (!err) return false
  const e = err as { name?: string; message?: string }
  const name = String(e.name ?? "").toLowerCase()
  const message = String(e.message ?? "").toLowerCase()
  return name.includes("abort") || name.includes("cancel") || message.includes("abort") || message.includes("cancel")
}

const isMissingRelationError = (err: unknown): boolean => {
  if (!err || typeof err !== "object") return false
  const e = err as { code?: string; message?: string }
  if (e.code === "42P01" || e.code === "42883") return true
  const message = String(e.message ?? "")
  return /does not exist/i.test(message) || /schema cache/i.test(message)
}

const mapFeedTypeRow = (row: FeedTypeRow): FeedTypeOptionRow => ({
  id: row.id ?? null,
  label: row.feed_line ?? null,
  feed_line: row.feed_line ?? null,
  crude_fat_percentage: row.crude_fat_percentage ?? null,
  crude_protein_percentage: row.crude_protein_percentage ?? null,
  feed_category: row.feed_category ?? null,
  feed_pellet_size: row.feed_pellet_size ?? null,
})

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

  let query = queryOptionsView(supabase, "api_system_options")
    .select("id,label,type,growth_stage,is_active,farm_id,farm_name")
    .eq("farm_id", params.farmId)
    .order("label", { ascending: true })

  if (params?.activeOnly) {
    query = query.eq("is_active", true)
  }
  if (params?.stage && params.stage !== "all") {
    query = query.eq("growth_stage", params.stage)
  }
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (isAbortLikeError(error) || isSbPermissionDenied(error)) {
      return toQuerySuccess<SystemListItem>([])
    }
    return toQueryError("getSystemOptions", error)
  }

  return toQuerySuccess<SystemListItem>((data ?? []) as SystemListItem[])
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

  let query = queryOptionsView(supabase, "api_fingerling_batch_options").select("id,label,farm_id,date_of_delivery")
  query = query.eq("farm_id", params.farmId)
  query = query.order("date_of_delivery", { ascending: false })
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (isAbortLikeError(error) || isSbPermissionDenied(error)) {
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

  let query = queryOptionsView(supabase, "api_feed_type_options").select("id,label,feed_line").order("label", { ascending: true })
  if (params?.limit) query = query.limit(params.limit)
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (isMissingRelationError(error)) {
      let feedQuery = supabase
        .from("feed_type")
        .select("id,feed_line,crude_protein_percentage,crude_fat_percentage,feed_category,feed_pellet_size")
        .order("feed_line", { ascending: true })
      if (params?.limit) feedQuery = feedQuery.limit(params.limit)
      if (params?.signal) feedQuery = feedQuery.abortSignal(params.signal)
      const { data: feedData, error: feedError } = await feedQuery
      if (feedError) {
        if (isAbortLikeError(feedError) || isSbPermissionDenied(feedError) || isSbAuthMissing(feedError) || isMissingRelationError(feedError)) {
          return toQuerySuccess<FeedTypeOptionRow>([])
        }
        return toQueryError("getFeedTypeOptions:feed_type", feedError)
      }
      const mapped = ((feedData ?? []) as FeedTypeRow[]).map((row) => mapFeedTypeRow(row))
      return toQuerySuccess<FeedTypeOptionRow>(mapped)
    }
    if (isAbortLikeError(error) || isSbPermissionDenied(error) || isSbAuthMissing(error)) {
      return toQuerySuccess<FeedTypeOptionRow>([])
    }
    return toQueryError("getFeedTypeOptions", error)
  }
  return toQuerySuccess<FeedTypeOptionRow>(data as FeedTypeOptionRow[])
}

export async function getFarmOptions(params?: {
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<FarmOptionRow>> {
  const clientResult = await getClientOrError("getFarmOptions")
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = queryOptionsView(supabase, "api_farm_options").select("id,label,location").order("label", { ascending: true })
  if (params?.limit) query = query.limit(params.limit)
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (isAbortLikeError(error) || isSbPermissionDenied(error) || isSbAuthMissing(error)) {
      return toQuerySuccess<FarmOptionRow>([])
    }
    return toQueryError("getFarmOptions", error)
  }
  return toQuerySuccess<FarmOptionRow>(data as FarmOptionRow[])
}

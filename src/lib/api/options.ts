import type { Database, Enums } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import { getClientOrError, queryOptionsRpc, toQueryError, toQuerySuccess } from "@/lib/api/_utils"
import { mapSystemRowToOption, type SystemOption, type SystemOptionSource } from "@/lib/system-options"
import { isSbAuthMissing, isSbPermissionDenied } from "@/lib/supabase/log"

type SystemListItem = SystemOption
type BatchListItem = Database["public"]["Functions"]["api_fingerling_batch_options_rpc"]["Returns"][number]
type FeedTypeOptionRow = Database["public"]["Functions"]["api_feed_type_options_rpc"]["Returns"][number]
type FarmOptionRow = Database["public"]["Functions"]["api_farm_options_rpc"]["Returns"][number]
type FeedSupplierRow = Database["public"]["Tables"]["feed_supplier"]["Row"]
type FingerlingSupplierRow = Database["public"]["Tables"]["fingerling_supplier"]["Row"]
type SystemRow = Database["public"]["Tables"]["system"]["Row"]
type AppConfigRow = Database["public"]["Tables"]["app_config"]["Row"]

const empty = <T,>(): QueryResult<T> => toQuerySuccess<T>([])

const isAbortLikeError = (err: unknown): boolean => {
  if (!err) return false
  const e = err as { name?: string; message?: string }
  const name = String(e.name ?? "").toLowerCase()
  const message = String(e.message ?? "").toLowerCase()
  return (
    name.includes("abort") ||
    name.includes("cancel") ||
    message.includes("abort") ||
    message.includes("cancel") ||
    message.includes("canceled")
  )
}

const isQuietOptionsError = (err: unknown): boolean =>
  isAbortLikeError(err) || isSbPermissionDenied(err) || isSbAuthMissing(err)

const isQuietTableError = (err: unknown): boolean =>
  isAbortLikeError(err) || isSbPermissionDenied(err) || isSbAuthMissing(err)

/**
 * Helper for RPC calls:
 * - requires session (options are user-specific)
 * - returns [] on quiet errors
 */
async function rpcOrEmpty<T>(
  tag: string,
  rpcCall: (supabase: any) => any,
  signal?: AbortSignal,
): Promise<QueryResult<T>> {
  const clientResult = await getClientOrError(tag, { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let q = rpcCall(supabase)
  if (signal) q = q.abortSignal(signal)

  const { data, error } = await q
  if (error) {
    if (isQuietOptionsError(error)) return empty<T>()
    return toQueryError(tag, error)
  }
  return toQuerySuccess<T>((data ?? []) as T[])
}

export async function getSystemOptions(params?: {
  farmId?: string | null
  stage?: Enums<"system_growth_stage"> | "all"
  activeOnly?: boolean
  signal?: AbortSignal
}): Promise<QueryResult<SystemListItem>> {
  if (!params?.farmId) return empty<SystemListItem>()
  const clientResult = await getClientOrError("getSystemOptions", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase
    .from("system")
    .select("id, farm_id, growth_stage, is_active, name, type, unit")
    .eq("farm_id", params.farmId)

  if (params.stage && params.stage !== "all") {
    query = query.eq("growth_stage", params.stage)
  }
  if (params.activeOnly ?? true) {
    query = query.eq("is_active", true)
  }
  if (params.signal) {
    query = query.abortSignal(params.signal)
  }

  const { data, error } = await query.order("name", { ascending: true })
  if (error) {
    if (params.signal?.aborted || isQuietOptionsError(error)) return empty<SystemListItem>()
    return toQueryError("getSystemOptions", error)
  }

  const rows = ((data ?? []) as unknown as SystemOptionSource[])
    .map(mapSystemRowToOption)
    .sort((a, b) => String(a.label ?? "").localeCompare(String(b.label ?? "")))
  return toQuerySuccess<SystemListItem>(rows)
}

export async function getBatchOptions(params?: {
  farmId?: string | null
  signal?: AbortSignal
}): Promise<QueryResult<BatchListItem>> {
  if (!params?.farmId) return empty<BatchListItem>()
  const farmId = params.farmId

  const res = await rpcOrEmpty<BatchListItem>(
    "getBatchOptions",
    (supabase) => queryOptionsRpc(supabase, "api_fingerling_batch_options_rpc", { p_farm_id: farmId }),
    params?.signal,
  )
  if (res.status !== "success") return res

  const rows = res.data
    .slice()
    .sort((a, b) => String(b.date_of_delivery ?? "").localeCompare(String(a.date_of_delivery ?? "")))
  return toQuerySuccess<BatchListItem>(rows)
}

export async function getFeedTypeOptions(params?: {
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<FeedTypeOptionRow>> {
  const res = await rpcOrEmpty<FeedTypeOptionRow>(
    "getFeedTypeOptions",
    (supabase) => queryOptionsRpc(supabase, "api_feed_type_options_rpc"),
    params?.signal,
  )
  if (res.status !== "success") return res

  const rows = res.data.slice().sort((a, b) => String(a.label ?? "").localeCompare(String(b.label ?? "")))
  return toQuerySuccess<FeedTypeOptionRow>(params?.limit ? rows.slice(0, params.limit) : rows)
}

export async function getFeedSupplierOptions(params?: {
  signal?: AbortSignal
}): Promise<QueryResult<FeedSupplierRow>> {
  const clientResult = await getClientOrError("getFeedSupplierOptions", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase.from("feed_supplier").select("*").order("company_name", { ascending: true })
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (params?.signal?.aborted || isQuietTableError(error)) {
      return empty<FeedSupplierRow>()
    }
    return toQueryError("getFeedSupplierOptions", error)
  }

  return toQuerySuccess<FeedSupplierRow>((data ?? []) as FeedSupplierRow[])
}

export async function getFingerlingSupplierOptions(params?: {
  signal?: AbortSignal
}): Promise<QueryResult<FingerlingSupplierRow>> {
  const clientResult = await getClientOrError("getFingerlingSupplierOptions", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase.from("fingerling_supplier").select("*").order("company_name", { ascending: true })
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (params?.signal?.aborted || isQuietTableError(error)) {
      return empty<FingerlingSupplierRow>()
    }
    return toQueryError("getFingerlingSupplierOptions", error)
  }

  return toQuerySuccess<FingerlingSupplierRow>((data ?? []) as FingerlingSupplierRow[])
}

export async function getFarmOptions(params?: {
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<FarmOptionRow>> {
  const res = await rpcOrEmpty<FarmOptionRow>(
    "getFarmOptions",
    (supabase) => queryOptionsRpc(supabase, "api_farm_options_rpc"),
    params?.signal,
  )
  if (res.status !== "success") return res

  const rows = res.data.slice().sort((a, b) => String(a.label ?? "").localeCompare(String(b.label ?? "")))
  return toQuerySuccess<FarmOptionRow>(params?.limit ? rows.slice(0, params.limit) : rows)
}

export async function getSystemVolumes(params?: {
  farmId?: string | null
  stage?: Enums<"system_growth_stage"> | "all"
  activeOnly?: boolean
  signal?: AbortSignal
}): Promise<QueryResult<Pick<SystemRow, "id" | "name" | "volume" | "growth_stage">>> {
  if (!params?.farmId) return empty<Pick<SystemRow, "id" | "name" | "volume" | "growth_stage">>()
  const clientResult = await getClientOrError("getSystemVolumes", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase
    .from("system")
    .select("id, name, volume, growth_stage, is_active, farm_id")
    .eq("farm_id", params.farmId)

  if (params.stage && params.stage !== "all") {
    query = query.eq("growth_stage", params.stage)
  }
  if (params.activeOnly ?? true) {
    query = query.eq("is_active", true)
  }
  if (params.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (params.signal?.aborted || isQuietTableError(error)) {
      return empty<Pick<SystemRow, "id" | "name" | "volume" | "growth_stage">>()
    }
    return toQueryError("getSystemVolumes", error)
  }

  return toQuerySuccess<Pick<SystemRow, "id" | "name" | "volume" | "growth_stage">>(
    (data ?? []) as Array<Pick<SystemRow, "id" | "name" | "volume" | "growth_stage">>,
  )
}

export async function getAppConfig(params: {
  keys: string[]
  signal?: AbortSignal
}): Promise<QueryResult<AppConfigRow>> {
  if (!params.keys.length) return empty<AppConfigRow>()
  const clientResult = await getClientOrError("getAppConfig", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase.from("app_config").select("key, value").in("key", params.keys)
  if (params.signal) query = query.abortSignal(params.signal)
  const { data, error } = await query
  if (error) {
    if (params.signal?.aborted || isQuietTableError(error)) return empty<AppConfigRow>()
    return toQueryError("getAppConfig", error)
  }

  return toQuerySuccess<AppConfigRow>((data ?? []) as AppConfigRow[])
}

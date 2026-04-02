import type { Database, Enums } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import {
  getClientOrError,
  isAbortLikeError,
  queryOptionsRpc,
  resolveClientReadQuery,
  toQueryError,
  toQuerySuccess,
  type OptionsRpcName,
} from "@/lib/api/_utils"
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
type OptionsRpcRow<Name extends OptionsRpcName> = Database["public"]["Functions"][Name]["Returns"][number]
type OptionsRpcArgs<Name extends OptionsRpcName> = Database["public"]["Functions"][Name]["Args"]

const empty = <T,>(): QueryResult<T> => toQuerySuccess<T>([])

const isQuietOptionsError = (err: unknown): boolean =>
  isAbortLikeError(err) || isSbPermissionDenied(err) || isSbAuthMissing(err)

const isQuietTableError = (err: unknown): boolean =>
  isAbortLikeError(err) || isSbPermissionDenied(err) || isSbAuthMissing(err)

/**
 * Helper for RPC calls:
 * - requires session (options are user-specific)
 * - returns [] on quiet errors
 */
async function rpcOrEmpty<Name extends OptionsRpcName>(
  tag: string,
  name: Name,
  args?: OptionsRpcArgs<Name>,
  signal?: AbortSignal,
): Promise<QueryResult<OptionsRpcRow<Name>>> {
  const clientResult = await getClientOrError(tag, { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let q = args === undefined ? queryOptionsRpc(supabase, name) : queryOptionsRpc(supabase, name, args)
  if (signal) q = q.abortSignal(signal)

  return resolveClientReadQuery<OptionsRpcRow<Name>>({
    tag,
    query: q,
    signal,
    quietWhen: isQuietOptionsError,
  })
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

  const result = await resolveClientReadQuery<SystemOptionSource>({
    tag: "getSystemOptions",
    query: query.order("name", { ascending: true }),
    signal: params.signal,
    quietWhen: isQuietOptionsError,
  })
  if (result.status !== "success") return result

  const rows = (result.data as unknown as SystemOptionSource[])
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

  const res = await rpcOrEmpty(
    "getBatchOptions",
    "api_fingerling_batch_options_rpc",
    { p_farm_id: farmId },
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
  const res = await rpcOrEmpty(
    "getFeedTypeOptions",
    "api_feed_type_options_rpc",
    undefined,
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

  return resolveClientReadQuery<FeedSupplierRow>({
    tag: "getFeedSupplierOptions",
    query,
    signal: params?.signal,
    quietWhen: isQuietTableError,
  })
}

export async function getFingerlingSupplierOptions(params?: {
  signal?: AbortSignal
}): Promise<QueryResult<FingerlingSupplierRow>> {
  const clientResult = await getClientOrError("getFingerlingSupplierOptions", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase.from("fingerling_supplier").select("*").order("company_name", { ascending: true })
  if (params?.signal) query = query.abortSignal(params.signal)

  return resolveClientReadQuery<FingerlingSupplierRow>({
    tag: "getFingerlingSupplierOptions",
    query,
    signal: params?.signal,
    quietWhen: isQuietTableError,
  })
}

export async function getFarmOptions(params?: {
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<FarmOptionRow>> {
  const res = await rpcOrEmpty(
    "getFarmOptions",
    "api_farm_options_rpc",
    undefined,
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

  return resolveClientReadQuery<Pick<SystemRow, "id" | "name" | "volume" | "growth_stage">>({
    tag: "getSystemVolumes",
    query,
    signal: params.signal,
    quietWhen: isQuietTableError,
  })
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
  return resolveClientReadQuery<AppConfigRow>({
    tag: "getAppConfig",
    query,
    signal: params.signal,
    quietWhen: isQuietTableError,
  })
}

import type { Database, Enums } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import {
  getClientOrError,
  getErrorMessage,
  isAbortLikeError,
  queryOptionsRpc,
  resolveClientReadQuery,
  toQuerySuccess,
  type OptionsRpcName,
} from "@/lib/api/_utils"
import { mapSystemRowToOption, type SystemOption, type SystemOptionSource } from "@/lib/system-options"
import { isSbAuthMissing, isSbPermissionDenied } from "@/lib/supabase/log"
import type { WorkspaceContext } from "@/lib/context"

type SystemListItem = SystemOption
type BatchListItem = Database["public"]["Functions"]["api_fingerling_batch_options_rpc"]["Returns"][number]
type FeedTypeOptionRow = Database["public"]["Functions"]["api_feed_type_options_rpc"]["Returns"][number]
type FarmOptionRow = Database["public"]["Functions"]["api_farm_options_rpc"]["Returns"][number]
type FeedSupplierRow = Database["public"]["Tables"]["feed_supplier"]["Row"]
type FingerlingSupplierRow = Database["public"]["Tables"]["fingerling_supplier"]["Row"]
type SystemRow = Database["public"]["Tables"]["system"]["Row"]
type AppConfigRow = Database["public"]["Tables"]["app_config"]["Row"]
type DashboardTimePeriodRow = Database["public"]["Tables"]["dashboard_time_period"]["Row"]
type FishStockingRow = Database["public"]["Tables"]["fish_stocking"]["Row"]
type FishTransferRow = Database["public"]["Tables"]["fish_transfer"]["Row"]
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
    query: q as PromiseLike<{ data: OptionsRpcRow<Name>[] | null; error: unknown }>,
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
  activeOnly?: boolean
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

  let rows = res.data
    .slice()
    .sort((a, b) => String(b.date_of_delivery ?? "").localeCompare(String(a.date_of_delivery ?? "")))

  if (params.activeOnly ?? true) {
    const currentBatchIds = await getCurrentProductionBatchIds(farmId, params.signal)
    rows = currentBatchIds.size > 0
      ? rows.filter((row) => currentBatchIds.has(row.id))
      : rows.filter((row) => String(row.date_of_delivery ?? "") >= "2026-01-01")
  }

  return toQuerySuccess<BatchListItem>(rows)
}

async function getCurrentProductionBatchIds(
  farmId: string,
  signal?: AbortSignal,
): Promise<Set<number>> {
  const clientResult = await getClientOrError("getCurrentProductionBatchIds", { requireSession: true })
  if ("error" in clientResult) return new Set()
  const { supabase } = clientResult

  let activeQuery = supabase.from("system").select("id").eq("farm_id", farmId).eq("is_active", true)
  if (signal) activeQuery = activeQuery.abortSignal(signal)
  const activeSystems = await resolveClientReadQuery<Pick<SystemRow, "id">>({
    tag: "getCurrentProductionBatchIds:systems",
    query: activeQuery,
    signal,
    quietWhen: isQuietTableError,
  })
  if (activeSystems.status !== "success") return new Set()

  const lineageSystemIds = new Set(
    activeSystems.data
      .map((row) => row.id)
      .filter((id): id is number => typeof id === "number" && Number.isFinite(id)),
  )
  if (lineageSystemIds.size === 0) return new Set()

  const batchIds = new Set<number>()

  for (let depth = 0; depth < 3; depth += 1) {
    const targetIds = Array.from(lineageSystemIds)
    let transferQuery = supabase
      .from("fish_transfer")
      .select("batch_id, origin_system_id, target_system_id")
      .in("target_system_id", targetIds)
    if (signal) transferQuery = transferQuery.abortSignal(signal)

    const transfers = await resolveClientReadQuery<
      Pick<FishTransferRow, "batch_id" | "origin_system_id" | "target_system_id">
    >({
      tag: "getCurrentProductionBatchIds:transfers",
      query: transferQuery,
      signal,
      quietWhen: isQuietTableError,
    })
    if (transfers.status !== "success") break

    const beforeSize = lineageSystemIds.size
    transfers.data.forEach((row) => {
      if (typeof row.batch_id === "number") batchIds.add(row.batch_id)
      if (typeof row.origin_system_id === "number" && Number.isFinite(row.origin_system_id)) {
        lineageSystemIds.add(row.origin_system_id)
      }
    })
    if (lineageSystemIds.size === beforeSize) break
  }

  let stockingQuery = supabase
    .from("fish_stocking")
    .select("batch_id, system_id")
    .in("system_id", Array.from(lineageSystemIds))
  if (signal) stockingQuery = stockingQuery.abortSignal(signal)

  const stockings = await resolveClientReadQuery<Pick<FishStockingRow, "batch_id" | "system_id">>({
    tag: "getCurrentProductionBatchIds:stocking",
    query: stockingQuery,
    signal,
    quietWhen: isQuietTableError,
  })
  if (stockings.status === "success") {
    stockings.data.forEach((row) => {
      if (typeof row.batch_id === "number") batchIds.add(row.batch_id)
    })
  }

  return batchIds
}

export async function getDashboardTimePeriodOptions(params?: {
  signal?: AbortSignal
}): Promise<QueryResult<{ time_period: Database["public"]["Enums"]["time_period"] | "all history"; days_since_start: number | null }>> {
  const clientResult = await getClientOrError("getDashboardTimePeriodOptions", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase
    .from("dashboard_time_period")
    .select("time_period, days_since_start")
    .order("days_since_start", { ascending: true })
  if (params?.signal) query = query.abortSignal(params.signal)

  const result = await resolveClientReadQuery<DashboardTimePeriodRow>({
    tag: "getDashboardTimePeriodOptions",
    query,
    signal: params?.signal,
    quietWhen: isQuietTableError,
  })
  if (result.status !== "success") return result

  return toQuerySuccess([
    ...result.data,
    {
      time_period: "all history",
      days_since_start: null,
    },
  ])
}

export async function getFeedTypeOptions(params?: {
  farmId?: string | null
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<FeedTypeOptionRow>> {
  if (!params?.farmId) return empty<FeedTypeOptionRow>()

  const res = await rpcOrEmpty(
    "getFeedTypeOptions",
    "api_feed_type_options_rpc",
    { p_farm_id: params.farmId },
    params?.signal,
  )
  if (res.status !== "success") return res

  const rows = res.data.slice().sort((a, b) => String(a.label ?? "").localeCompare(String(b.label ?? "")))
  return toQuerySuccess<FeedTypeOptionRow>(params?.limit ? rows.slice(0, params.limit) : rows)
}

export async function getWeeklyInventoryFeedTypeOptions(params?: {
  farmId?: string | null
  dateFrom?: string | null
  dateTo?: string | null
  signal?: AbortSignal
}): Promise<QueryResult<FeedTypeOptionRow>> {
  if (!params?.farmId || !params.dateFrom || !params.dateTo) return empty<FeedTypeOptionRow>()

  const [feedTypesResult, clientResult] = await Promise.all([
    getFeedTypeOptions({ farmId: params.farmId, signal: params.signal }),
    getClientOrError("getWeeklyInventoryFeedTypeOptions", { requireSession: true }),
  ])
  if (feedTypesResult.status !== "success") return feedTypesResult
  if ("error" in clientResult) return clientResult.error

  let query = clientResult.supabase
    .from("feed_inventory")
    .select("feed_type_id, amount_of_bags, bag_weight, opened_bags")
    .eq("farm_id", params.farmId)
    .gte("inventory_date", params.dateFrom)
    .lte("inventory_date", params.dateTo)
    .not("feed_type_id", "is", null)

  if (params.signal) query = query.abortSignal(params.signal)

  const inventoryResult = await resolveClientReadQuery<
    Pick<
      Database["public"]["Tables"]["feed_inventory"]["Row"],
      "feed_type_id" | "amount_of_bags" | "bag_weight" | "opened_bags"
    >
  >({
    tag: "getWeeklyInventoryFeedTypeOptions",
    query,
    signal: params.signal,
    quietWhen: isQuietTableError,
  })
  if (inventoryResult.status !== "success") return inventoryResult

  const stockedFeedTypeIds = new Set(
    inventoryResult.data
      .filter((row) => {
        const baggedKg = (row.amount_of_bags ?? 0) * (row.bag_weight ?? 0)
        const openKg = row.opened_bags ?? 0
        return baggedKg + openKg > 0
      })
      .map((row) => row.feed_type_id)
      .filter((feedTypeId): feedTypeId is number => typeof feedTypeId === "number" && Number.isFinite(feedTypeId)),
  )

  return toQuerySuccess(feedTypesResult.data.filter((feedType) => stockedFeedTypeIds.has(feedType.id)))
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
  try {
    const response = await fetch("/api/context", {
      credentials: "include",
      cache: "no-store",
      signal: params?.signal,
    })

    if (!response.ok) {
      const body = response.headers.get("content-type")?.includes("application/json")
        ? ((await response.json()) as { error?: string })
        : null
      return { status: "error", data: null, error: body?.error ?? `Request failed (${response.status})` }
    }

    const body = (await response.json()) as WorkspaceContext
    const rows = body.farms
      .map((farm) => ({
        id: farm.id,
        label: farm.name,
        location: farm.location ?? "",
      }))
      .sort((a, b) => String(a.label ?? "").localeCompare(String(b.label ?? "")))

    return toQuerySuccess<FarmOptionRow>(params?.limit ? rows.slice(0, params.limit) : rows)
  } catch (error) {
    if (
      params?.signal?.aborted ||
      isAbortLikeError(error) ||
      isSbPermissionDenied(error) ||
      isSbAuthMissing(error)
    ) {
      return empty<FarmOptionRow>()
    }

    return { status: "error", data: null, error: getErrorMessage(error) }
  }
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

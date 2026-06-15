import type { Database, Enums } from "@/lib/types/database"
import type { SupabaseClient } from "@supabase/supabase-js"
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
import {
  type SystemOption,
} from "@/lib/system-options"
import { isSbAuthMissing, isSbPermissionDenied } from "@/lib/supabase/log"
import type { WorkspaceContext } from "@/lib/context"

type SystemListItem = SystemOption
type BatchListItem = Database["public"]["Functions"]["api_fingerling_batch_options_rpc"]["Returns"][number]
type FeedTypeOptionRow = Database["public"]["Functions"]["api_feed_type_options_rpc"]["Returns"][number]
type FarmOptionRow = Database["public"]["Functions"]["api_farm_options_rpc"]["Returns"][number]
type FeedSupplierRow = Database["public"]["Tables"]["feed_supplier"]["Row"]
type FingerlingSupplierTableRow = Pick<
  Database["public"]["Tables"]["fingerling_supplier"]["Row"],
  "company_name" | "id" | "location_city" | "location_country"
>
type FingerlingSupplierRow = Omit<FingerlingSupplierTableRow, "location_city"> & {
  location_city: string
}
type SystemRow = Database["public"]["Tables"]["system"]["Row"]
type AppConfigRow = Database["public"]["Tables"]["app_config"]["Row"]
type DashboardTimePeriodRow = Database["public"]["Tables"]["dashboard_time_period"]["Row"]
type OptionsRpcRow<Name extends OptionsRpcName> = Database["public"]["Functions"][Name]["Returns"][number]
type OptionsRpcArgs<Name extends OptionsRpcName> = Database["public"]["Functions"][Name]["Args"]

const empty = <T,>(): QueryResult<T> => toQuerySuccess<T>([])

const isQuietOptionsError = (err: unknown): boolean =>
  isAbortLikeError(err) || isSbPermissionDenied(err) || isSbAuthMissing(err)

const isQuietTableError = (err: unknown): boolean =>
  isAbortLikeError(err) || isSbPermissionDenied(err) || isSbAuthMissing(err)

function normalizeFingerlingSupplierOptions(
  rows: Array<FingerlingSupplierRow | FingerlingSupplierTableRow> | null | undefined,
): FingerlingSupplierRow[] {
  return (rows ?? []).map((row) => ({
    company_name: row.company_name,
    id: row.id,
    location_city: row.location_city ?? "",
    location_country: row.location_country,
  }))
}

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

  let query = queryOptionsRpc(supabase, "api_system_options_rpc", {
    p_farm_id: params.farmId,
    p_stage: params.stage && params.stage !== "all" ? params.stage : undefined,
    p_active_only: params.activeOnly ?? true,
  })
  if (params.signal) query = query.abortSignal(params.signal)

  type SystemOptionsRpcRow = OptionsRpcRow<"api_system_options_rpc">
  const result = await resolveClientReadQuery<SystemOptionsRpcRow>({
    tag: "getSystemOptions",
    query: query as PromiseLike<{ data: SystemOptionsRpcRow[] | null; error: unknown }>,
    signal: params.signal,
    quietWhen: isQuietOptionsError,
  })
  if (result.status !== "success") return result

  const rows: SystemListItem[] = result.data.map((row) => ({
    cage_status: null,
    farm_id: row.farm_id,
    farm_name: row.farm_name ?? "",
    growth_stage: row.growth_stage,
    id: row.id,
    is_active: row.is_active,
    label: row.label || row.name || row.unit || "Missing cage name",
    name: row.name ?? null,
    type: row.type,
    unit: row.unit ?? null,
  }))
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
    { p_farm_id: farmId, p_active_only: params.activeOnly ?? true },
    params?.signal,
  )
  if (res.status !== "success") return res

  const rows = res.data
    .slice()
    .sort((a, b) => String(b.date_of_delivery ?? "").localeCompare(String(a.date_of_delivery ?? "")))

  return toQuerySuccess<BatchListItem>(rows)
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

  const rows = res.data
    .filter((row) => typeof row.id === "number")
    .slice()
    .sort((a, b) => String(a.label ?? "").localeCompare(String(b.label ?? "")))
  return toQuerySuccess<FeedTypeOptionRow>(params?.limit ? rows.slice(0, params.limit) : rows)
}

export async function getWeeklyInventoryFeedTypeOptions(params?: {
  farmId?: string | null
  dateFrom?: string | null
  dateTo?: string | null
  signal?: AbortSignal
}): Promise<QueryResult<FeedTypeOptionRow>> {
  if (!params?.farmId || !params.dateFrom || !params.dateTo) return empty<FeedTypeOptionRow>()

  const clientResult = await getClientOrError("getWeeklyInventoryFeedTypeOptions", { requireSession: true })
  if ("error" in clientResult) return clientResult.error

  let query = clientResult.supabase
    .from("feed_inventory")
    .select("feed_type_id, amount_of_bags, bag_weight, opened_bags, inventory_date, inventory_time, created_at")
    .eq("farm_id", params.farmId)
    .lte("inventory_date", params.dateTo)
    .not("feed_type_id", "is", null)

  if (params.signal) query = query.abortSignal(params.signal)

  const inventoryResult = await resolveClientReadQuery<
    Pick<
      Database["public"]["Tables"]["feed_inventory"]["Row"],
      "feed_type_id" | "amount_of_bags" | "bag_weight" | "opened_bags" | "inventory_date" | "inventory_time" | "created_at"
    >
  >({
    tag: "getWeeklyInventoryFeedTypeOptions",
    query,
    signal: params.signal,
    quietWhen: isQuietTableError,
  })
  if (inventoryResult.status !== "success") return inventoryResult

  const latestByFeedType = new Map<number, (typeof inventoryResult.data)[number]>()
  inventoryResult.data.forEach((row) => {
    if (typeof row.feed_type_id !== "number" || !Number.isFinite(row.feed_type_id)) return
    const current = latestByFeedType.get(row.feed_type_id)
    const rowSortKey = `${row.inventory_date ?? ""}T${row.inventory_time ?? "00:00"}:${row.created_at ?? ""}`
    const currentSortKey = current
      ? `${current.inventory_date ?? ""}T${current.inventory_time ?? "00:00"}:${current.created_at ?? ""}`
      : ""
    if (!current || rowSortKey > currentSortKey) {
      latestByFeedType.set(row.feed_type_id, row)
    }
  })

  const stockedFeedTypeIds = new Set(
    Array.from(latestByFeedType.values())
      .filter((row) => {
        const baggedKg = (row.amount_of_bags ?? 0) * (row.bag_weight ?? 0)
        const openKg = (row.opened_bags ?? 0) / 1000
        return baggedKg + openKg > 0
      })
      .map((row) => row.feed_type_id)
      .filter((feedTypeId): feedTypeId is number => typeof feedTypeId === "number" && Number.isFinite(feedTypeId)),
  )
  if (stockedFeedTypeIds.size === 0) return toQuerySuccess<FeedTypeOptionRow>([])

  const feedTypesResult = await rpcOrEmpty(
    "getWeeklyInventoryFeedTypeOptions:feedTypes",
    "api_feed_type_options_rpc",
    { p_farm_id: params.farmId },
    params.signal,
  )
  if (feedTypesResult.status !== "success") return feedTypesResult

  return toQuerySuccess(
    feedTypesResult.data
      .filter((feedType) => stockedFeedTypeIds.has(feedType.id))
      .sort((a, b) => String(a.label ?? "").localeCompare(String(b.label ?? ""))),
  )
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
  try {
    const response = await fetch("/api/options/fingerling-suppliers", {
      credentials: "include",
      cache: "no-store",
      signal: params?.signal,
    })

    const body = response.headers.get("content-type")?.includes("application/json")
      ? ((await response.json()) as { data?: FingerlingSupplierTableRow[]; error?: string })
      : null

    if (!response.ok) {
      return {
        status: "error",
        data: null,
        error: body?.error ?? `Unable to load fingerling suppliers (${response.status}).`,
      }
    }

    return toQuerySuccess<FingerlingSupplierRow>(normalizeFingerlingSupplierOptions(body?.data ?? []))
  } catch (error) {
    if (params?.signal?.aborted || isAbortLikeError(error)) {
      return toQuerySuccess<FingerlingSupplierRow>([])
    }
    return { status: "error", data: null, error: getErrorMessage(error) }
  }
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

"use client"

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
} from "@/lib/supabase/query-transport"
import type { SystemOption } from "@/lib/system-options"
import { formatSystemOptionLabel } from "@/lib/system-options"
import { isSbAuthMissing, isSbPermissionDenied } from "@/lib/supabase/log"
import type { BatchOptionItem } from "@/features/shared/batch-options"
import { loadBatchOptionRows } from "@/features/shared/batch-options-source"

type SystemListItem = SystemOption
type BatchListItem = BatchOptionItem
type FarmOptionRow = Database["public"]["Functions"]["api_farm_options_rpc"]["Returns"][number]
type FingerlingSupplierTableRow = Pick<
  Database["public"]["Tables"]["fingerling_supplier"]["Row"],
  "company_name" | "id" | "location_city" | "location_country"
>
type FingerlingSupplierRow = Omit<FingerlingSupplierTableRow, "location_city"> & {
  location_city: string
}
type AppConfigRow = Database["public"]["Tables"]["app_config"]["Row"]
type OptionsRpcRow<Name extends OptionsRpcName> = Database["public"]["Functions"][Name]["Returns"][number]

const empty = <T,>(): QueryResult<T> => toQuerySuccess<T>([])

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

export async function getSystemOptions(params?: {
  farmId?: string | null
  stage?: Enums<"system_growth_stage"> | "all"
  activeOnly?: boolean
  accessToken?: string | null
  signal?: AbortSignal
}): Promise<QueryResult<SystemListItem>> {
  if (!params?.farmId) return empty<SystemListItem>()

  // "api_system_options_rpc" is scoped by the same RLS the caller's own
  // session already carries -- no server hop needed to enforce anything
  // the database doesn't already enforce for a direct call.
  const clientResult = await getClientOrError("getSystemOptions", {
    requireSession: true,
    accessToken: params.accessToken,
  })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  type SystemOptionsRpcRow = OptionsRpcRow<"api_system_options_rpc">
  let query = queryOptionsRpc(supabase, "api_system_options_rpc", {
    p_farm_id: params.farmId,
    p_stage: params.stage && params.stage !== "all" ? params.stage : undefined,
    p_active_only: params.activeOnly ?? true,
  })
  if (params.signal) query = query.abortSignal(params.signal)

  const result = await resolveClientReadQuery<SystemOptionsRpcRow>({
    tag: "getSystemOptions",
    query,
    signal: params.signal,
    quietWhen: isQuietTableError,
  })
  if (result.status !== "success") return result

  const rows: SystemListItem[] = result.data.map((row) => ({
    cage_status: null,
    farm_id: row.farm_id,
    farm_name: row.farm_name ?? "",
    growth_stage: row.growth_stage,
    id: row.id,
    is_active: row.is_active,
    label: formatSystemOptionLabel({ id: row.id, name: row.name ?? null, unit: row.unit ?? null }),
    name: row.name ?? null,
    type: row.type,
    unit: row.unit ?? null,
  }))
  return toQuerySuccess<SystemListItem>(rows)
}

export async function getBatchOptions(params?: {
  farmId?: string | null
  activeOnly?: boolean
  accessToken?: string | null
  signal?: AbortSignal
}): Promise<QueryResult<BatchListItem>> {
  if (!params?.farmId) return empty<BatchListItem>()

  const clientResult = await getClientOrError("getBatchOptions", {
    requireSession: true,
    accessToken: params.accessToken,
  })
  if ("error" in clientResult) return clientResult.error

  // Called directly on the caller's own resolved client -- RLS already scopes
  // this read -- rather than a round trip through /api/rpc. Shared with the
  // server prefetch (`listBatchOptionRows`) so both stay in lockstep.
  try {
    const rows = await loadBatchOptionRows(clientResult.supabase, {
      farmId: params.farmId,
      activeOnly: params.activeOnly,
      signal: params.signal,
    })
    return toQuerySuccess<BatchListItem>(rows)
  } catch (error) {
    if (params.signal?.aborted || isQuietTableError(error)) return empty<BatchListItem>()
    return toQueryError<BatchListItem>("getBatchOptions", error)
  }
}

export async function getFingerlingSupplierOptions(params?: {
  signal?: AbortSignal
}): Promise<QueryResult<FingerlingSupplierRow>> {
  const clientResult = await getClientOrError("getFingerlingSupplierOptions", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase
    .from("fingerling_supplier")
    .select("id, company_name, location_country, location_city")
    .order("company_name", { ascending: true })
  if (params?.signal) query = query.abortSignal(params.signal)

  const result = await resolveClientReadQuery<FingerlingSupplierTableRow>({
    tag: "getFingerlingSupplierOptions",
    query,
    signal: params?.signal,
    quietWhen: isQuietTableError,
  })
  if (result.status !== "success") return result

  return toQuerySuccess<FingerlingSupplierRow>(normalizeFingerlingSupplierOptions(result.data))
}

export async function getFarmOptions(params?: {
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<FarmOptionRow>> {
  const clientResult = await getClientOrError("getFarmOptions", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = queryOptionsRpc(supabase, "api_farm_options_rpc")
  if (params?.signal) query = query.abortSignal(params.signal)

  const res = await resolveClientReadQuery<FarmOptionRow>({
    tag: "getFarmOptions",
    query,
    signal: params?.signal,
    quietWhen: isQuietTableError,
  })
  if (res.status !== "success") return res

  const rows = res.data
    .map((row) => ({
      id: row.id,
      label: row.label,
      location: row.location ?? "",
    }))
    .sort((a, b) => String(a.label ?? "").localeCompare(String(b.label ?? "")))

  return toQuerySuccess<FarmOptionRow>(params?.limit ? rows.slice(0, params.limit) : rows)
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

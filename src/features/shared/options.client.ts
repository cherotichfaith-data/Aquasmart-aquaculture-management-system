"use client"

import type { Database, Enums } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import {
  getClientOrError,
  isAbortLikeError,
  queryOptionsRpc,
  resolveClientReadQuery,
  toQuerySuccess,
  type OptionsRpcName,
} from "@/lib/supabase/query-transport"
import type { SystemOption } from "@/lib/system-options"
import { formatSystemOptionLabel } from "@/lib/system-options"
import { isSbAuthMissing, isSbPermissionDenied } from "@/lib/supabase/log"
import { attachResolvedSystemIdsToBatches, type BatchOptionItem } from "@/features/shared/batch-options"

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
  const { supabase } = clientResult

  // Same reasoning as getSystemOptions: called directly on the client
  // already resolved above (the one the supplier/api_dashboard_batches
  // calls just below already use), instead of a round trip through
  // /api/rpc for a read RLS already scopes correctly on its own.
  let batchQuery = queryOptionsRpc(supabase, "api_fingerling_batch_options_rpc", {
    p_farm_id: params.farmId,
    p_active_only: params.activeOnly ?? true,
  })
  if (params.signal) batchQuery = batchQuery.abortSignal(params.signal)

  const rpcResult = await resolveClientReadQuery<OptionsRpcRow<"api_fingerling_batch_options_rpc">>({
    tag: "getBatchOptions",
    query: batchQuery,
    signal: params.signal,
    quietWhen: isQuietTableError,
  })
  if (rpcResult.status !== "success") return rpcResult
  const rows = rpcResult.data.filter((row) => Number.isFinite(row.id))
  if (!rows.length) return toQuerySuccess<BatchListItem>([])

  const supplierIds = Array.from(
    new Set(
      rows.map((row) => row.supplier_id).filter((value): value is number => Number.isFinite(value)),
    ),
  )
  let suppliers: Array<Pick<Database["public"]["Tables"]["fingerling_supplier"]["Row"], "id" | "company_name">> = []
  if (supplierIds.length) {
    let suppliersQuery = supabase.from("fingerling_supplier").select("id, company_name").in("id", supplierIds)
    if (params.signal) suppliersQuery = suppliersQuery.abortSignal(params.signal)

    const suppliersResult = await resolveClientReadQuery<
      Pick<Database["public"]["Tables"]["fingerling_supplier"]["Row"], "id" | "company_name">
    >({
      tag: "getBatchOptions:suppliers",
      query: suppliersQuery,
      signal: params.signal,
      quietWhen: isQuietTableError,
    })
    if (suppliersResult.status === "success") suppliers = suppliersResult.data
  }

  const supplierNames = new Map<number, string>()
  for (const supplier of suppliers) {
    if (Number.isFinite(supplier.id)) supplierNames.set(supplier.id, supplier.company_name ?? "")
  }

  const batchSystemIds = new Map<number, number[]>()
  const { data: dashboardBatchRows, error: dashboardBatchError } = await supabase.rpc("api_dashboard_batches", {
    p_farm_id: params.farmId,
    p_batch_ids: rows.map((row) => row.id),
    p_stage: undefined,
    p_start_date: undefined,
    p_end_date: undefined,
  })
  if (!dashboardBatchError) {
    for (const row of (dashboardBatchRows ?? []) as Array<{ batch_id: number; system_ids: Array<number | string> | null }>) {
      const systemIds = (row.system_ids ?? [])
        .map((value) => Number(value))
        .filter((value): value is number => Number.isFinite(value) && value > 0)
      batchSystemIds.set(row.batch_id, systemIds)
    }
  }

  return toQuerySuccess<BatchListItem>(attachResolvedSystemIdsToBatches(rows, batchSystemIds, supplierNames))
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

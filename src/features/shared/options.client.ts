"use client"

import type { Database, Enums } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import {
  fetchRpc,
  getClientOrError,
  isAbortLikeError,
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
type OptionsRpcArgs<Name extends OptionsRpcName> = Database["public"]["Functions"][Name]["Args"]

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

async function rpcOrEmpty<Name extends OptionsRpcName>(
  tag: string,
  name: Name,
  args?: OptionsRpcArgs<Name>,
  signal?: AbortSignal,
): Promise<QueryResult<OptionsRpcRow<Name>>> {
  return fetchRpc<OptionsRpcRow<Name>>(tag, name, args as Record<string, unknown> | undefined, signal)
}

export async function getSystemOptions(params?: {
  farmId?: string | null
  stage?: Enums<"system_growth_stage"> | "all"
  activeOnly?: boolean
  signal?: AbortSignal
}): Promise<QueryResult<SystemListItem>> {
  if (!params?.farmId) return empty<SystemListItem>()

  type SystemOptionsRpcRow = OptionsRpcRow<"api_system_options_rpc">
  const result = await fetchRpc<SystemOptionsRpcRow>(
    "getSystemOptions",
    "api_system_options_rpc",
    {
      p_farm_id: params.farmId,
      p_stage: params.stage && params.stage !== "all" ? params.stage : undefined,
      p_active_only: params.activeOnly ?? true,
    },
    params.signal,
  )
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
  signal?: AbortSignal
}): Promise<QueryResult<BatchListItem>> {
  if (!params?.farmId) return empty<BatchListItem>()

  const clientResult = await getClientOrError("getBatchOptions", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  const rpcResult = await rpcOrEmpty(
    "getBatchOptions",
    "api_fingerling_batch_options_rpc",
    { p_farm_id: params.farmId, p_active_only: params.activeOnly ?? true },
    params.signal,
  )
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
  const res = await rpcOrEmpty("getFarmOptions", "api_farm_options_rpc", undefined, params?.signal)
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

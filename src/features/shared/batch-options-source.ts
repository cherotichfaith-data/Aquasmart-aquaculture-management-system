import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/types/database"
import {
  attachResolvedSystemIdsToBatches,
  isSyntheticBatchName,
  type BatchOptionItem,
} from "@/features/shared/batch-options"

type BatchOptionsRpcRow = Database["public"]["Functions"]["api_fingerling_batch_options_rpc"]["Returns"][number]

/**
 * Single source for the batch selector options, shared by the client hook
 * (`useBatchOptions`) and the server prefetch (`listBatchOptionRows`).
 *
 * `api_fingerling_batch_options_rpc` is the canonical list. It also returns
 * `system_ids[]` (the cages currently holding each batch), so there is no
 * second RPC -- callers used to hit `api_dashboard_batches`, a ~50-column
 * analytics RPC, purely to read that one array.
 *
 * Data-repair stand-in batches (INFERRED-*, BATCH-<n>) are filtered out here so
 * they never reach a selector, lineage view, KPI or chart -- pass
 * `includeSynthetic: true` only where full batch attribution is required.
 */
export async function loadBatchOptionRows(
  supabase: SupabaseClient<Database>,
  params: { farmId: string; activeOnly?: boolean; includeSynthetic?: boolean; signal?: AbortSignal },
): Promise<BatchOptionItem[]> {
  let rpc = supabase.rpc("api_fingerling_batch_options_rpc", {
    p_farm_id: params.farmId,
    p_active_only: params.activeOnly ?? true,
  })
  if (params.signal) rpc = rpc.abortSignal(params.signal)

  const { data, error } = await rpc
  if (error) throw error

  const rows = ((data ?? []) as BatchOptionsRpcRow[]).filter(
    (row) => Number.isFinite(row.id) && (params.includeSynthetic || !isSyntheticBatchName(row.label)),
  )
  if (!rows.length) return []

  const supplierIds = Array.from(
    new Set(rows.map((row) => row.supplier_id).filter((value): value is number => Number.isFinite(value))),
  )
  const supplierNames = new Map<number, string>()
  if (supplierIds.length) {
    let suppliersQuery = supabase.from("fingerling_supplier").select("id, company_name").in("id", supplierIds)
    if (params.signal) suppliersQuery = suppliersQuery.abortSignal(params.signal)
    const { data: suppliers } = await suppliersQuery
    for (const supplier of suppliers ?? []) {
      if (Number.isFinite(supplier.id)) supplierNames.set(supplier.id, supplier.company_name ?? "")
    }
  }

  const batchSystemIds = new Map<number, number[]>()
  for (const row of rows) {
    const ids = (row.system_ids ?? [])
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0)
    // Fall back to the single resolved id for rows from a pre-migration server.
    batchSystemIds.set(row.id, ids.length ? ids : row.system_id != null ? [row.system_id] : [])
  }

  return attachResolvedSystemIdsToBatches(rows, batchSystemIds, supplierNames)
}

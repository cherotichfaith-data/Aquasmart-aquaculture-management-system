import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/types/database"
import { attachResolvedSystemIdsToBatches, type BatchOptionItem } from "@/features/shared/batch-options"

type BatchOptionsRpcRow = Database["public"]["Functions"]["api_fingerling_batch_options_rpc"]["Returns"][number]

/**
 * Single source for the batch selector options, shared by the client hook
 * (`useBatchOptions`) and the server prefetch (`listBatchOptionRows`).
 *
 * `api_fingerling_batch_options_rpc` is the canonical list -- it returns only
 * real, active batches (non-synthetic, with an ongoing cycle) and the
 * `system_ids[]` array, so there is no second RPC and no client-side filtering.
 */
export async function loadBatchOptionRows(
  supabase: SupabaseClient<Database>,
  params: { farmId: string; activeOnly?: boolean; signal?: AbortSignal },
): Promise<BatchOptionItem[]> {
  let rpc = supabase.rpc("api_fingerling_batch_options_rpc", {
    p_farm_id: params.farmId,
    p_active_only: params.activeOnly ?? true,
  })
  if (params.signal) rpc = rpc.abortSignal(params.signal)

  const { data, error } = await rpc
  if (error) throw error

  const rows = ((data ?? []) as BatchOptionsRpcRow[]).filter((row) => Number.isFinite(row.id))
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

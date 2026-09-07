import type { Database } from "@/lib/types/database"

type BatchOptionRpcRow = Database["public"]["Functions"]["api_fingerling_batch_options_rpc"]["Returns"][number]

export type BatchOptionItem = BatchOptionRpcRow & {
  current_system_id: number | null
  current_system_ids: number[]
  supplier_name?: string | null
}

function toSortedUniqueNumericIds(values: Array<number | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0)),
  ).sort((a, b) => a - b)
}

export function getBatchCurrentSystemIds(batch: Pick<BatchOptionItem, "current_system_ids" | "system_id">) {
  return batch.current_system_ids.length ? batch.current_system_ids : toSortedUniqueNumericIds([batch.system_id])
}

export function attachResolvedSystemIdsToBatches(
  batches: BatchOptionRpcRow[],
  batchSystemIds: Map<number, number[]>,
  supplierNames?: Map<number, string>,
) {
  return batches.map<BatchOptionItem>((batch) => {
    const currentSystemIds = toSortedUniqueNumericIds(batchSystemIds.get(batch.id) ?? [batch.system_id])
    const currentSystemId = currentSystemIds.length === 1 ? currentSystemIds[0] : null
    const resolvedSystemId = currentSystemId ?? currentSystemIds[0] ?? batch.system_id

    return {
      ...batch,
      system_id: resolvedSystemId,
      current_system_id: currentSystemId,
      current_system_ids: currentSystemIds,
      supplier_name: supplierNames?.get(batch.supplier_id) ?? null,
    }
  })
}

export function resolveBatchIdForSystem(
  batches: Array<Pick<BatchOptionItem, "id" | "current_system_ids" | "system_id">>,
  systemId: number | null | undefined,
) {
  if (!Number.isFinite(systemId) || !systemId || systemId <= 0) return null
  return batches.find((batch) => getBatchCurrentSystemIds(batch).includes(systemId))?.id ?? null
}

import type { Database } from "@/lib/types/database"

type BatchOptionRpcRow = Database["public"]["Functions"]["api_fingerling_batch_options_rpc"]["Returns"][number]
type FingerlingBatchRow = Pick<
  Database["public"]["Tables"]["fingerling_batch"]["Row"],
  "abw" | "date_of_delivery" | "farm_id" | "id" | "name" | "number_of_fish" | "supplier_id"
>
type ProductionCycleRow = Pick<Database["public"]["Tables"]["production_cycle"]["Row"], "batch_id" | "cycle_id" | "system_id">
type ProductionCycleSystemRow = Pick<
  Database["public"]["Tables"]["production_cycle_system"]["Row"],
  "cycle_id" | "is_current" | "system_id"
>
type FingerlingSupplierRow = Pick<Database["public"]["Tables"]["fingerling_supplier"]["Row"], "company_name" | "id">

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

export function attachCurrentSystemsToBatches(
  batches: BatchOptionRpcRow[],
  cycles: ProductionCycleRow[],
  cycleSystems: ProductionCycleSystemRow[],
): BatchOptionItem[] {
  const cycleToBatchId = new Map<number, number>()
  for (const cycle of cycles) {
    if (!Number.isFinite(cycle.cycle_id) || !Number.isFinite(cycle.batch_id)) continue
    cycleToBatchId.set(cycle.cycle_id, cycle.batch_id)
  }

  const systemsByBatchId = new Map<number, number[]>()
  for (const row of cycleSystems) {
    if (!row.is_current) continue
    const batchId = cycleToBatchId.get(row.cycle_id)
    if (!batchId || !Number.isFinite(row.system_id)) continue
    const current = systemsByBatchId.get(batchId) ?? []
    current.push(row.system_id)
    systemsByBatchId.set(batchId, current)
  }

  return batches.map((batch) => {
    const fallbackIds = toSortedUniqueNumericIds([batch.system_id])
    const currentSystemIds = toSortedUniqueNumericIds(systemsByBatchId.get(batch.id) ?? fallbackIds)
    return {
      ...batch,
      current_system_id: currentSystemIds.length === 1 ? currentSystemIds[0] : null,
      current_system_ids: currentSystemIds,
    }
  })
}

export function getBatchCurrentSystemIds(batch: Pick<BatchOptionItem, "current_system_ids" | "system_id">) {
  return batch.current_system_ids.length ? batch.current_system_ids : toSortedUniqueNumericIds([batch.system_id])
}

export function buildBatchOptionsFromSources(
  batches: FingerlingBatchRow[],
  cycles: ProductionCycleRow[],
  cycleSystems: ProductionCycleSystemRow[],
  suppliers: FingerlingSupplierRow[] = [],
) {
  const cycleToBatchId = new Map<number, number>()
  const fallbackSystemsByBatchId = new Map<number, number[]>()
  for (const cycle of cycles) {
    if (!Number.isFinite(cycle.cycle_id) || !Number.isFinite(cycle.batch_id)) continue
    cycleToBatchId.set(cycle.cycle_id, cycle.batch_id)
    const current = fallbackSystemsByBatchId.get(cycle.batch_id) ?? []
    if (Number.isFinite(cycle.system_id) && cycle.system_id > 0) current.push(cycle.system_id)
    fallbackSystemsByBatchId.set(cycle.batch_id, current)
  }

  const currentSystemsByBatchId = new Map<number, number[]>()
  for (const row of cycleSystems) {
    if (!row.is_current) continue
    const batchId = cycleToBatchId.get(row.cycle_id)
    if (!batchId || !Number.isFinite(row.system_id) || row.system_id <= 0) continue
    const current = currentSystemsByBatchId.get(batchId) ?? []
    current.push(row.system_id)
    currentSystemsByBatchId.set(batchId, current)
  }

  const supplierNameById = new Map<number, string>()
  for (const supplier of suppliers) {
    if (!Number.isFinite(supplier.id)) continue
    supplierNameById.set(supplier.id, supplier.company_name ?? "")
  }

  return batches.map<BatchOptionItem>((batch) => {
    const fallbackIds = toSortedUniqueNumericIds(fallbackSystemsByBatchId.get(batch.id) ?? [])
    const currentSystemIds = toSortedUniqueNumericIds(currentSystemsByBatchId.get(batch.id) ?? fallbackIds)
    const currentSystemId = currentSystemIds.length === 1 ? currentSystemIds[0] : null
    const resolvedSystemId = currentSystemId ?? currentSystemIds[0] ?? null

    return {
      id: batch.id,
      farm_id: batch.farm_id ?? "",
      system_id: resolvedSystemId,
      current_system_id: currentSystemId,
      current_system_ids: currentSystemIds,
      label: batch.name?.trim() ? batch.name : `Batch #${batch.id}`,
      date_of_delivery: batch.date_of_delivery,
      abw: batch.abw,
      number_of_fish: batch.number_of_fish,
      supplier_id: batch.supplier_id,
      supplier_name: supplierNameById.get(batch.supplier_id) ?? null,
    }
  })
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

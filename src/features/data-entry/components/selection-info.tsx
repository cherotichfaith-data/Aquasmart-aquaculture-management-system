"use client"

import { useMemo } from "react"
import type { BatchOptionItem } from "@/features/shared/batch-options"
import { formatCageLabel, type SystemOption } from "@/lib/system-options"
import { useFingerlingSupplierOptions } from "@/lib/hooks/use-options"
import { formatGrowthStage } from "@/lib/stage-filter"
import { parseNumericId } from "./form-utils"

type BatchOption = BatchOptionItem & {
  supplier_name?: string | null
}

/**
 * Compact one-line summary of the selected cage and its resolved batch/supplier.
 * Renders only the chips that resolve, and nothing at all until a cage is picked.
 */
export function SelectionChips({
  systems,
  systemId,
  batches,
  batchId,
}: {
  systems: SystemOption[]
  systemId: number | string | null | undefined
  batches?: BatchOption[]
  batchId?: number | string | null | undefined
}) {
  const system = systems.find((row) => row.id === parseNumericId(systemId)) ?? null
  const batch = batches?.find((row) => row.id === parseNumericId(batchId)) ?? null
  const suppliersQuery = useFingerlingSupplierOptions({ enabled: Boolean(batch) })
  const suppliers = useMemo(
    () => (suppliersQuery.data?.status === "success" ? suppliersQuery.data.data : []),
    [suppliersQuery.data],
  )
  const supplierName =
    batch?.supplier_name?.trim() ||
    suppliers.find((row) => row.id === batch?.supplier_id)?.company_name ||
    null

  if (!system && !batch) return null

  return (
    <div className="data-entry-chip-strip">
      {system ? <span className="data-entry-chip"><b>Cage</b> {formatCageLabel(system)}</span> : null}
      {system?.unit?.trim() ? <span className="data-entry-chip"><b>Unit</b> {system.unit.trim()}</span> : null}
      {system ? <span className="data-entry-chip"><b>Stage</b> {formatGrowthStage(system.growth_stage)}</span> : null}
      {batch ? <span className="data-entry-chip"><b>Batch</b> {batch.label}</span> : null}
      {supplierName ? <span className="data-entry-chip"><b>Source</b> {supplierName}</span> : null}
      {batch?.date_of_delivery ? <span className="data-entry-chip"><b>Delivered</b> {batch.date_of_delivery}</span> : null}
    </div>
  )
}

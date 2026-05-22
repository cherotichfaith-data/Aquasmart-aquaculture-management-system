"use client"

import { useMemo } from "react"
import type { Database } from "@/lib/types/database"
import { formatCageLabel, type SystemOption } from "@/lib/system-options"
import { useFingerlingSupplierOptions } from "@/lib/hooks/use-options"
import { formatGrowthStage } from "@/lib/stage-filter"
import { parseNumericId } from "./form-utils"

type BatchOption = Database["public"]["Functions"]["api_fingerling_batch_options_rpc"]["Returns"][number]

export function SelectedSystemInfo({
  systems,
  systemId,
  title = "Selected System",
}: {
  systems: SystemOption[]
  systemId: number | string | null | undefined
  title?: string
}) {
  const resolvedSystemId = parseNumericId(systemId)
  const selectedSystem = systems.find((system) => system.id === resolvedSystemId) ?? null

  if (!selectedSystem) return null

  return (
    <div className="data-entry-note-card rounded-md border border-border/80 px-3 py-2 text-sm">
      <div className="font-medium">{title}</div>
      <div className="text-muted-foreground">Cage: {formatCageLabel(selectedSystem)}</div>
      <div className="text-muted-foreground">Unit: {selectedSystem.unit?.trim() || "Not set"}</div>
      <div className="text-muted-foreground">
        Type: {String(selectedSystem.type ?? "").replaceAll("_", " ") || "Not set"}
      </div>
      <div className="text-muted-foreground">Stage: {formatGrowthStage(selectedSystem.growth_stage)}</div>
      <div className="text-muted-foreground">Status: {selectedSystem.is_active ? "Active" : "Inactive"}</div>
    </div>
  )
}

export function SelectedBatchSupplierInfo({
  batches,
  batchId,
}: {
  batches: BatchOption[]
  batchId: number | string | null | undefined
}) {
  const resolvedBatchId = parseNumericId(batchId)
  const selectedBatch = batches.find((batch) => batch.id === resolvedBatchId) ?? null
  const suppliersQuery = useFingerlingSupplierOptions({ enabled: Boolean(selectedBatch) })

  const suppliers = suppliersQuery.data?.status === "success" ? suppliersQuery.data.data : []
  const selectedSupplier = useMemo(() => {
    if (!selectedBatch) return null
    return suppliers.find((supplier) => supplier.id === selectedBatch.supplier_id) ?? null
  }, [selectedBatch, suppliers])
  const sourceName = selectedSupplier?.company_name ?? (suppliersQuery.isLoading ? "Loading source..." : "Source not found")

  if (!selectedBatch) return null

  return (
    <div className="data-entry-note-card rounded-md border border-border/80 px-3 py-2 text-sm">
      <div className="font-medium">Selected Batch</div>
      <div className="text-muted-foreground">Batch: {selectedBatch.label || `Batch ${selectedBatch.id}`}</div>
      <div className="text-muted-foreground">Source: {sourceName}</div>
      <div className="text-muted-foreground">Delivery Date: {selectedBatch.date_of_delivery}</div>
    </div>
  )
}

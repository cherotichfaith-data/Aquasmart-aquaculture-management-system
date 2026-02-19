"use client"

import { useEffect } from "react"
import type { Enums } from "@/lib/types/database"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { useBatchOptions, useSystemOptions } from "@/lib/hooks/use-options"

type StageFilter = "all" | Enums<"system_growth_stage">

interface FarmSelectorProps {
  selectedBatch: string
  selectedSystem: string
  selectedStage: StageFilter
  onBatchChange: (batch: string) => void
  onSystemChange: (system: string) => void
  onStageChange: (stage: StageFilter) => void
  showStage?: boolean
  variant?: "default" | "compact"
}

export default function FarmSelector({
  selectedBatch,
  selectedSystem,
  selectedStage,
  onBatchChange,
  onSystemChange,
  onStageChange,
  showStage = true,
  variant = "default",
}: FarmSelectorProps) {
  const { farmId } = useActiveFarm()
  const stages = [
    { value: "all", label: "All Stages" },
    { value: "nursing", label: "Nursing Stage" },
    { value: "grow_out", label: "Grow-out Stage" },
  ] as const
  
  const batchesQuery = useBatchOptions(farmId ? { farmId } : undefined)
  const systemsQuery = useSystemOptions(farmId ? { farmId, activeOnly: true } : undefined)

  const batches = (batchesQuery.data?.status === "success" ? batchesQuery.data.data : []).filter(
    (batch) => batch.id != null,
  )
  const systems = (systemsQuery.data?.status === "success" ? systemsQuery.data.data : []).filter(
    (system) => system.id != null,
  )

  useEffect(() => {
    if (batchesQuery.isLoading || selectedBatch === "all") return
    if (!batches.some((batch) => String(batch.id) === selectedBatch)) {
      onBatchChange("all")
    }
  }, [batches, batchesQuery.isLoading, onBatchChange, selectedBatch])

  useEffect(() => {
    if (systemsQuery.isLoading || selectedSystem === "all") return
    if (!systems.some((system) => String(system.id) === selectedSystem)) {
      onSystemChange("all")
    }
  }, [systemsQuery.isLoading, onSystemChange, selectedSystem, systems])

  const selectClass =
    variant === "compact"
      ? "h-9 min-w-[150px] rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground"
      : "px-3 py-2 rounded-md border border-input bg-background text-sm"

  return (
    <div className={variant === "compact" ? "flex flex-wrap items-center gap-2" : "flex flex-col gap-3 md:flex-row"}>
      {showStage ? (
        <select
          value={selectedStage}
          onChange={(e) => onStageChange(e.target.value as StageFilter)}
          className={selectClass}
          aria-label="Filter by stage"
        >
          {stages.map((stage) => (
            <option key={stage.value} value={stage.value}>
              {stage.label}
            </option>
          ))}
        </select>
      ) : null}

      <select
        value={selectedBatch}
        onChange={(e) => onBatchChange(e.target.value)}
        className={selectClass}
        disabled={batchesQuery.isLoading}
        aria-label="Filter by batch"
      >
        <option value="all">All Batches</option>
        {batchesQuery.isLoading ? <option value="" disabled>Loading batches...</option> : null}
        {!batchesQuery.isLoading && batches.length === 0 ? <option value="" disabled>No batches found</option> : null}
        {batches.map((batch) => (
          <option key={batch.id} value={String(batch.id)}>
            {batch.label || `Batch ${batch.id}`}
          </option>
        ))}
      </select>

      <select
        value={selectedSystem}
        onChange={(e) => onSystemChange(e.target.value)}
        className={selectClass}
        disabled={systemsQuery.isLoading}
        aria-label="Filter by system"
      >
        <option value="all">All Systems</option>
        {systemsQuery.isLoading ? <option value="" disabled>Loading systems...</option> : null}
        {!systemsQuery.isLoading && systems.length === 0 ? <option value="" disabled>No systems found</option> : null}
        {systems.map((system) => (
          <option key={system.id} value={String(system.id)}>
            {system.label || `System ${system.id}`}
          </option>
        ))}
      </select>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import type { Enums } from "@/lib/types/database"
import { fetchBatchesList, fetchSystemsList } from "@/lib/supabase-queries"

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
  const [batches, setBatches] = useState<Array<{ id: number; name: string }>>([])
  const [systems, setSystems] = useState<Array<{ id: number; name: string }>>([])
  const stages = [
    { value: "all", label: "All Stages" },
    { value: "nursing", label: "Nursing Stage" },
    { value: "grow_out", label: "Grow-out Stage" },
  ] as const
  
  useEffect(() => {
    const loadOptions = async () => {
      const [batchResult, systemResult] = await Promise.all([fetchBatchesList(), fetchSystemsList()])
      if (batchResult.status === "success") {
        setBatches(batchResult.data)
      }
      if (systemResult.status === "success") {
        setSystems(systemResult.data)
      }
    }
    loadOptions()
  }, [])

  const selectClass =
    variant === "compact"
      ? "h-9 rounded-full border border-border bg-card/80 px-4 text-xs font-semibold text-foreground shadow-sm"
      : "px-3 py-2 rounded-md border border-input bg-background text-sm"

  return (
    <div className={variant === "compact" ? "flex flex-wrap items-center gap-2" : "flex flex-col md:flex-row gap-3"}>
      {showStage ? (
        <select value={selectedStage} onChange={(e) => onStageChange(e.target.value as StageFilter)} className={selectClass}>
          {stages.map((stage) => (
            <option key={stage.value} value={stage.value}>
              {stage.label}
            </option>
          ))}
        </select>
      ) : null}

      <select value={selectedBatch} onChange={(e) => onBatchChange(e.target.value)} className={selectClass}>
        <option value="all">All Batches</option>
        {batches.map((batch) => (
          <option key={batch.id} value={String(batch.id)}>
            {batch.name}
          </option>
        ))}
      </select>

      <select value={selectedSystem} onChange={(e) => onSystemChange(e.target.value)} className={selectClass}>
        <option value="all">All Systems</option>
        {systems.map((system) => (
          <option key={system.id} value={String(system.id)}>
            {system.name}
          </option>
        ))}
      </select>
    </div>
  )
}

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
  const [loadingBatches, setLoadingBatches] = useState(true)
  const [loadingSystems, setLoadingSystems] = useState(true)
  const stages = [
    { value: "all", label: "All Stages" },
    { value: "nursing", label: "Nursing Stage" },
    { value: "grow_out", label: "Grow-out Stage" },
  ] as const
  
  useEffect(() => {
    const loadOptions = async () => {
      setLoadingBatches(true)
      setLoadingSystems(true)
      const [batchResult, systemResult] = await Promise.all([fetchBatchesList(), fetchSystemsList()])
      if (batchResult.status === "success") {
        setBatches(batchResult.data)
        setLoadingBatches(false)
      } else {
        console.error("Error loading batches:", batchResult.error)
        setBatches([])
        setLoadingBatches(false)
      }
      if (systemResult.status === "success") {
        setSystems(systemResult.data)
        setLoadingSystems(false)
      } else {
        console.error("Error loading systems:", systemResult.error)
        setSystems([])
        setLoadingSystems(false)
      }
    }
    loadOptions()
  }, [])

  useEffect(() => {
    if (loadingBatches || selectedBatch === "all") return
    if (!batches.some((batch) => String(batch.id) === selectedBatch)) {
      onBatchChange("all")
    }
  }, [batches, loadingBatches, onBatchChange, selectedBatch])

  useEffect(() => {
    if (loadingSystems || selectedSystem === "all") return
    if (!systems.some((system) => String(system.id) === selectedSystem)) {
      onSystemChange("all")
    }
  }, [loadingSystems, onSystemChange, selectedSystem, systems])

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

      <select
        value={selectedBatch}
        onChange={(e) => onBatchChange(e.target.value)}
        className={selectClass}
        disabled={loadingBatches}
      >
        <option value="all">All Batches</option>
        {loadingBatches ? <option value="" disabled>Loading batches...</option> : null}
        {!loadingBatches && batches.length === 0 ? <option value="" disabled>No batches found</option> : null}
        {batches.map((batch) => (
          <option key={batch.id} value={String(batch.id)}>
            {batch.name || `Batch ${batch.id}`}
          </option>
        ))}
      </select>

      <select
        value={selectedSystem}
        onChange={(e) => onSystemChange(e.target.value)}
        className={selectClass}
        disabled={loadingSystems}
      >
        <option value="all">All Systems</option>
        {loadingSystems ? <option value="" disabled>Loading systems...</option> : null}
        {!loadingSystems && systems.length === 0 ? <option value="" disabled>No systems found</option> : null}
        {systems.map((system) => (
          <option key={system.id} value={String(system.id)}>
            {system.name || `System ${system.id}`}
          </option>
        ))}
      </select>
    </div>
  )
}

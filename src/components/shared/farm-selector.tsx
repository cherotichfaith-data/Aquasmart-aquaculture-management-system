"use client"

import { useEffect, useMemo } from "react"
import type { Enums } from "@/lib/types/database"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useBatchOptions, useSystemOptions } from "@/lib/hooks/use-options"
import { useBatchSystemIds } from "@/lib/hooks/use-reports"

type StageFilter = "all" | Enums<"system_growth_stage">

interface FarmSelectorProps {
  selectedBatch: string
  selectedSystem: string
  selectedStage: StageFilter
  onBatchChange: (batch: string) => void
  onSystemChange: (system: string) => void
  onStageChange: (stage: StageFilter) => void
  showStage?: boolean
  showCounts?: boolean
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
  showCounts = true,
  variant = "default",
}: FarmSelectorProps) {
  const { farmId } = useActiveFarm()
  const batchId =
    selectedBatch !== "all" && Number.isFinite(Number(selectedBatch)) ? Number(selectedBatch) : undefined

  const batchesQuery = useBatchOptions(farmId ? { farmId } : undefined)
  const systemsQuery = useSystemOptions(farmId ? { farmId, activeOnly: true } : undefined)
  const batchSystemsQuery = useBatchSystemIds({
    batchId,
    farmId,
    enabled: selectedBatch !== "all",
  })

  const batches = (batchesQuery.data?.status === "success" ? batchesQuery.data.data : []).filter(
    (batch) => batch.id != null,
  )
  const allSystems = (systemsQuery.data?.status === "success" ? systemsQuery.data.data : []).filter(
    (system) => system.id != null,
  )
  const systems = useMemo(() => {
    const stageFiltered =
      selectedStage === "all"
        ? allSystems
        : allSystems.filter((system) => system.growth_stage === selectedStage)

    if (selectedBatch === "all" || batchSystemsQuery.data?.status !== "success") {
      return stageFiltered
    }

    const batchSystemIds = new Set(batchSystemsQuery.data.data.map((row) => row.system_id))
    return stageFiltered.filter((system) => batchSystemIds.has(system.id as number))
  }, [allSystems, batchSystemsQuery.data, selectedBatch, selectedStage])
  const systemCount = systems.length
  const batchCount = batches.length
  const formatStage = (value: StageFilter | string | null | undefined) => {
    if (value === "nursing") return "Nursing"
    if (value === "grow_out") return "Grow-out"
    return "Unspecified"
  }
  const stages = useMemo(() => {
    const stageSet = new Set<Enums<"system_growth_stage">>()
    allSystems.forEach((system) => {
      if (system.growth_stage === "nursing" || system.growth_stage === "grow_out") {
        stageSet.add(system.growth_stage)
      }
    })
    if (selectedStage !== "all") {
      stageSet.add(selectedStage as Enums<"system_growth_stage">)
    }
    const ordered = Array.from(stageSet).sort((a, b) => formatStage(a).localeCompare(formatStage(b)))
    return [
      { value: "all", label: "All Stages" },
      ...ordered.map((value) => ({ value, label: formatStage(value) })),
    ]
  }, [allSystems, selectedStage])

  useEffect(() => {
    if (batchesQuery.isLoading || selectedBatch === "all") return
    if (!batches.some((batch) => String(batch.id) === selectedBatch)) {
      onBatchChange("all")
    }
  }, [batches, batchesQuery.isLoading, onBatchChange, selectedBatch])

  useEffect(() => {
    if (systemsQuery.isLoading || (selectedBatch !== "all" && batchSystemsQuery.isLoading) || selectedSystem === "all") return
    if (!systems.some((system) => String(system.id) === selectedSystem)) {
      onSystemChange("all")
    }
  }, [batchSystemsQuery.isLoading, onSystemChange, selectedBatch, selectedSystem, systems, systemsQuery.isLoading])

  const selectClass =
    variant === "compact"
      ? "h-10 min-w-[150px] rounded-xl border border-input bg-background/90 px-3 text-sm font-medium text-foreground shadow-sm"
      : "px-3 py-2 rounded-md border border-input bg-background text-sm"

  return (
    <div className={variant === "compact" ? "flex flex-wrap items-center gap-2" : "flex flex-col gap-2 md:flex-row md:items-end"}>
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
        disabled={systemsQuery.isLoading || (selectedBatch !== "all" && batchSystemsQuery.isLoading)}
        aria-label="Filter by system"
      >
        <option value="all">All Systems</option>
        {systemsQuery.isLoading || (selectedBatch !== "all" && batchSystemsQuery.isLoading) ? <option value="" disabled>Loading systems...</option> : null}
        {!systemsQuery.isLoading && !(selectedBatch !== "all" && batchSystemsQuery.isLoading) && systems.length === 0 ? <option value="" disabled>No systems found</option> : null}
        {systems.map((system) => (
          <option key={system.id} value={String(system.id)}>
            {system.label || `System ${system.id}`}
          </option>
        ))}
      </select>
      {showCounts ? (
        <span className="text-xs text-muted-foreground">
          Systems: {systemCount} | Batches: {batchCount}
        </span>
      ) : null}
    </div>
  )
}

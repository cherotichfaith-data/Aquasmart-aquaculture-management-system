"use client"

import { useEffect, useMemo } from "react"
import type { Enums } from "@/lib/types/database"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useBatchOptions, useSystemOptions } from "@/lib/hooks/use-options"
import { useBatchSystemIds } from "@/lib/hooks/use-reports"
import { FilterPopover } from "@/components/shared/filter-popover"

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
  layout?: "grid" | "row"
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
  layout,
}: FarmSelectorProps) {
  const { farmId, loading: farmLoading } = useActiveFarm()
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
  const resolvedLayout = layout ?? (variant === "compact" ? "row" : "grid")
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
      {
        value: "all",
        label: "All Stages",
      },
      ...ordered.map((value) => ({
        value,
        label: formatStage(value),
      })),
    ]
  }, [allSystems, selectedStage])
  const batchOptions = useMemo(
    () => [
      {
        value: "all",
        label: "All Batches",
      },
      ...batches.map((batch) => ({
        value: String(batch.id),
        label: batch.label || `Batch ${batch.id}`,
        keywords: [batch.label ?? "", String(batch.id), batch.date_of_delivery ?? ""],
      })),
    ],
    [batches],
  )
  const systemOptions = useMemo(
    () => [
      {
        value: "all",
        label: "All Cages",
      },
      ...systems.map((system) => ({
        value: String(system.id),
        label: system.label || `System ${system.id}`,
        keywords: [
          system.label ?? "",
          system.unit ?? "",
          formatStage(system.growth_stage),
          String(system.type ?? "").replaceAll("_", " "),
          String(system.id),
        ],
      })),
    ],
    [systems],
  )

  useEffect(() => {
    if (!farmId || farmLoading || selectedBatch === "all") return
    if (batchesQuery.isLoading || batchesQuery.data?.status !== "success") return
    if (!batches.some((batch) => String(batch.id) === selectedBatch)) {
      onBatchChange("all")
    }
  }, [batches, batchesQuery.data?.status, batchesQuery.isLoading, farmId, farmLoading, onBatchChange, selectedBatch])

  useEffect(() => {
    if (!farmId || farmLoading || selectedSystem === "all") return
    if (systemsQuery.isLoading || systemsQuery.data?.status !== "success") return
    if (
      selectedBatch !== "all" &&
      (batchSystemsQuery.isLoading || batchSystemsQuery.data?.status !== "success")
    ) {
      return
    }
    if (!systems.some((system) => String(system.id) === selectedSystem)) {
      onSystemChange("all")
    }
  }, [
    batchSystemsQuery.data?.status,
    batchSystemsQuery.isLoading,
    farmId,
    farmLoading,
    onSystemChange,
    selectedBatch,
    selectedSystem,
    systems,
    systemsQuery.data?.status,
    systemsQuery.isLoading,
  ])

  return (
    <div
      className={
        resolvedLayout === "row"
          ? "flex min-w-0 flex-wrap items-center gap-2"
          : variant === "compact"
            ? "grid gap-2 sm:grid-cols-2 xl:grid-cols-3"
            : "grid gap-2 md:grid-cols-3"
      }
    >
      {showStage ? (
        <FilterPopover
          label="Stage"
          value={selectedStage}
          options={stages}
          placeholder="All stages"
          onChange={(value) => onStageChange(value as StageFilter)}
          searchable={stages.length > 6}
          searchPlaceholder="Search stage"
          emptyMessage="No stages found."
          triggerClassName={resolvedLayout === "row" ? "w-full sm:w-[150px]" : "w-full sm:min-w-0"}
        />
      ) : null}

      <FilterPopover
        label="Batch"
        value={selectedBatch}
        options={batchOptions}
        placeholder={batchesQuery.isLoading ? "Loading batches..." : "All batches"}
        onChange={onBatchChange}
        disabled={batchesQuery.isLoading}
        searchable
        searchPlaceholder="Search batch"
        emptyMessage="No batches found."
        triggerClassName={resolvedLayout === "row" ? "w-full sm:w-[180px]" : "w-full sm:min-w-0"}
      />

      <FilterPopover
        label="Cage"
        value={selectedSystem}
        options={systemOptions}
        placeholder={
          systemsQuery.isLoading || (selectedBatch !== "all" && batchSystemsQuery.isLoading)
            ? "Loading cages..."
            : `All cages${showCounts && systemCount ? ` (${systemCount})` : ""}`
        }
        onChange={onSystemChange}
        disabled={systemsQuery.isLoading || (selectedBatch !== "all" && batchSystemsQuery.isLoading)}
        searchable
        searchPlaceholder="Search cage"
        emptyMessage="No cages found."
        triggerClassName={
          resolvedLayout === "row" ? "w-full sm:w-[220px] lg:w-[260px]" : "w-full sm:min-w-0 xl:min-w-[16rem]"
        }
        contentClassName="sm:w-[24rem]"
      />
    </div>
  )
}

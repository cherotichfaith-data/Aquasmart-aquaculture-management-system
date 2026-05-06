"use client"

import { useEffect, useMemo } from "react"
import Box from "@mui/material/Box"
import type { Enums } from "@/lib/types/database"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useBatchOptions, useSystemOptions } from "@/lib/hooks/use-options"
import { useBatchSystemIds } from "@/lib/hooks/use-reports"
import { FilterPopover } from "@/components/shared/filter-popover"

type StageFilter = "all" | Enums<"system_growth_stage">

interface FarmSelectorProps {
  initialFarmId?: string | null
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
  systemLabel?: string
  allSystemsLabel?: string
  wrap?: boolean
}

export default function FarmSelector({
  initialFarmId,
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
  systemLabel = "Cage",
  allSystemsLabel = "All Cages",
  wrap = true,
}: FarmSelectorProps) {
  const { farmId, loading: farmLoading } = useActiveFarm({ initialFarmId })
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
        label: allSystemsLabel,
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
    [allSystemsLabel, systems],
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
    <Box
      sx={
        resolvedLayout === "row"
          ? {
              display: "flex",
              minWidth: 0,
              alignItems: "center",
              gap: 1,
              flexWrap: wrap ? "wrap" : "nowrap",
            }
          : variant === "compact"
            ? {
                display: "grid",
                gap: 1,
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  xl: "repeat(3, minmax(0, 1fr))",
                },
              }
            : {
                display: "grid",
                gap: 1,
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(3, minmax(0, 1fr))",
                },
              }
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
          triggerSx={resolvedLayout === "row" ? { width: { xs: "100%", sm: 150 } } : { width: "100%", minWidth: 0 }}
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
        triggerSx={resolvedLayout === "row" ? { width: { xs: "100%", sm: 180 } } : { width: "100%", minWidth: 0 }}
      />

      <FilterPopover
        label={systemLabel}
        value={selectedSystem}
        options={systemOptions}
        placeholder={
          systemsQuery.isLoading || (selectedBatch !== "all" && batchSystemsQuery.isLoading)
            ? "Loading cages..."
            : `${allSystemsLabel}${showCounts && systemCount ? ` (${systemCount})` : ""}`
        }
        onChange={onSystemChange}
        disabled={systemsQuery.isLoading || (selectedBatch !== "all" && batchSystemsQuery.isLoading)}
        searchable
        searchPlaceholder="Search cage"
        emptyMessage="No cages found."
        triggerSx={
          resolvedLayout === "row"
            ? { width: { xs: "100%", sm: 220, lg: 260 } }
            : { width: "100%", minWidth: { xs: 0, xl: "16rem" } }
        }
        contentSx={
          resolvedLayout === "row"
            ? { width: { xs: "min(24rem, calc(100vw - 24px))", sm: 320, lg: 384 } }
            : { width: { xs: "min(24rem, calc(100vw - 24px))", sm: 384 } }
        }
      />
    </Box>
  )
}

"use client"

import { useEffect, useMemo } from "react"
import { useBatchSystemIds } from "@/features/reports/hooks"
import type { DashboardBatchRow } from "@/features/dashboard/types"
import type { Enums } from "@/lib/types/database"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useBatchOptions, useSystemOptions } from "@/lib/hooks/use-options"
import type { SystemOption } from "@/lib/system-options"
import { FilterPopover } from "@/components/shared/filter-popover"
import { formatGrowthStage, GROWTH_STAGE_VALUES } from "@/lib/stage-filter"
import { formatCageLabel } from "@/lib/system-options"
import { cn } from "@/lib/utils"

type StageFilter = "all" | Enums<"system_growth_stage">

const normalizeBatchDisplayLabel = (label: string | null | undefined) => {
  const trimmed = label?.trim() ?? ""
  if (!trimmed) return ""

  return trimmed
    .replace(/\s*\(\s*split\s+[^)]+\)$/i, "")
    .replace(/\s*[-/|]\s*split\s+.+$/i, "")
    .replace(/\s+split\s+.+$/i, "")
    .trim()
}

interface FarmSelectorProps {
  initialFarmId?: string | null
  selectedBatch: string
  selectedSystem: string
  selectedStage: StageFilter
  onBatchChange: (batch: string) => void
  onSystemChange: (system: string) => void
  onStageChange: (stage: StageFilter) => void
  showBatch?: boolean
  showStage?: boolean
  showSystem?: boolean
  showCounts?: boolean
  variant?: "default" | "compact"
  layout?: "grid" | "row"
  allSystemsLabel?: string
  wrap?: boolean
  batchOptionsOverride?: DashboardBatchRow[]
  systemOptionsOverride?: SystemOption[]
  batchSystemIdsOverride?: number[] | null
  batchesLoadingOverride?: boolean
  systemsLoadingOverride?: boolean
}

export default function FarmSelector({
  initialFarmId,
  selectedBatch,
  selectedSystem,
  selectedStage,
  onBatchChange,
  onSystemChange,
  onStageChange,
  showBatch = true,
  showStage = true,
  showSystem = true,
  showCounts = true,
  variant = "default",
  layout,
  allSystemsLabel = "All Cages",
  wrap = true,
  batchOptionsOverride,
  systemOptionsOverride,
  batchSystemIdsOverride,
  batchesLoadingOverride,
  systemsLoadingOverride,
}: FarmSelectorProps) {
  const { farmId, loading: farmLoading } = useActiveFarm({ initialFarmId })
  const batchId =
    selectedBatch !== "all" && Number.isFinite(Number(selectedBatch)) ? Number(selectedBatch) : undefined

  const batchesQuery = useBatchOptions(farmId ? { farmId } : undefined)
  const systemsQuery = useSystemOptions(
    farmId ? { farmId, activeOnly: true, stockedOnly: !systemOptionsOverride } : undefined,
  )
  const batchSystemsQuery = useBatchSystemIds({
    batchId,
    farmId,
    enabled: selectedBatch !== "all",
  })

  const normalizedBatchOptionsOverride = useMemo(
    () =>
      batchOptionsOverride?.map((row) => ({
        id: row.batch_id,
        label: row.batch_name,
        date_of_delivery: null as string | null,
      })),
    [batchOptionsOverride],
  )
  const batches = (
    normalizedBatchOptionsOverride ?? (batchesQuery.data?.status === "success" ? batchesQuery.data.data : [])
  ).filter((batch) => batch.id != null)
  const allSystems = (
    systemOptionsOverride ?? (systemsQuery.data?.status === "success" ? systemsQuery.data.data : [])
  ).filter((system) => system.id != null)
  const batchesLoading = batchesLoadingOverride ?? batchesQuery.isLoading
  const systemsLoading = systemsLoadingOverride ?? systemsQuery.isLoading
  const batchesReady = batchOptionsOverride != null || batchesQuery.data?.status === "success"
  const systemsReady = systemOptionsOverride != null || systemsQuery.data?.status === "success"
  const selectedSystemId =
    selectedSystem !== "all" && Number.isFinite(Number(selectedSystem)) ? Number(selectedSystem) : null
  const selectedSystemRow = useMemo(
    () => (selectedSystemId == null ? null : allSystems.find((system) => system.id === selectedSystemId) ?? null),
    [allSystems, selectedSystemId],
  )
  const selectedBatchSystemIds = useMemo(() => {
    if (selectedBatch === "all") return null
    if (Array.isArray(batchSystemIdsOverride)) return new Set(batchSystemIdsOverride)
    if (batchSystemsQuery.data?.status !== "success") return null
    return new Set(batchSystemsQuery.data.data.map((row) => row.system_id))
  }, [batchSystemIdsOverride, batchSystemsQuery.data, selectedBatch])
  const systems = useMemo(() => {
    const stageFiltered =
      selectedStage === "all"
        ? allSystems
        : allSystems.filter((system) => system.growth_stage === selectedStage)

    if (selectedBatchSystemIds == null) {
      return stageFiltered
    }

    return stageFiltered.filter((system) => selectedBatchSystemIds.has(system.id as number))
  }, [allSystems, selectedBatchSystemIds, selectedStage])
  const systemCount = systems.length
  const resolvedLayout = layout ?? (variant === "compact" ? "row" : "grid")
  const filteredBatches = batches
  const stages = useMemo(() => {
    const stageSet = new Set<Enums<"system_growth_stage">>()
    const stageSystems =
      selectedSystemRow != null
        ? [selectedSystemRow]
        : selectedBatchSystemIds != null
          ? allSystems.filter((system) => selectedBatchSystemIds.has(system.id as number))
          : allSystems

    stageSystems.forEach((system) => {
      if (GROWTH_STAGE_VALUES.includes(system.growth_stage)) {
        stageSet.add(system.growth_stage)
      }
    })
    const ordered = GROWTH_STAGE_VALUES.filter((stage) => stageSet.has(stage))
    return [
      {
        value: "all",
        label: formatGrowthStage("all"),
      },
      ...ordered.map((value) => ({
        value,
        label: formatGrowthStage(value),
      })),
    ]
  }, [allSystems, selectedBatchSystemIds, selectedSystemRow])
  const batchOptions = useMemo(
    () => [
      {
        value: "all",
        label: "All Batches",
      },
      ...filteredBatches.map((batch) => ({
        value: String(batch.id),
        label: normalizeBatchDisplayLabel(batch.label) || batch.label,
        keywords: [normalizeBatchDisplayLabel(batch.label), batch.label, String(batch.id), batch.date_of_delivery ?? ""],
      })),
    ],
    [filteredBatches],
  )
  const systemOptions = useMemo(
    () => [
      {
        value: "all",
        label: allSystemsLabel,
      },
      ...systems.map((system) => ({
        value: String(system.id),
        label: formatCageLabel(system),
        keywords: [
          system.label ?? "",
          system.unit ?? "",
          formatGrowthStage(system.growth_stage),
          String(system.type ?? "").replaceAll("_", " "),
          String(system.id),
        ],
      })),
    ],
    [allSystemsLabel, systems],
  )

  useEffect(() => {
    if (!farmId || farmLoading || selectedBatch === "all") return
    if (batchesLoading || !batchesReady) return
    if (!filteredBatches.some((batch) => String(batch.id) === selectedBatch)) {
      onBatchChange("all")
    }
  }, [
    batchesLoading,
    batchesReady,
    farmId,
    farmLoading,
    filteredBatches,
    onBatchChange,
    selectedBatch,
  ])

  useEffect(() => {
    if (!farmId || farmLoading || selectedStage === "all") return
    if (systemsLoading || !systemsReady) return
    if (selectedBatch !== "all" && batchSystemIdsOverride == null && (batchSystemsQuery.isLoading || batchSystemsQuery.data?.status !== "success")) return
    if (!stages.some((stage) => stage.value === selectedStage)) {
      onStageChange(selectedSystemRow?.growth_stage ?? "all")
    }
  }, [
    batchSystemsQuery.data?.status,
    batchSystemsQuery.isLoading,
    batchSystemIdsOverride,
    farmId,
    farmLoading,
    onStageChange,
    selectedBatch,
    selectedStage,
    selectedSystemRow?.growth_stage,
    stages,
    systemsLoading,
    systemsReady,
  ])

  useEffect(() => {
    if (!farmId || farmLoading || selectedSystem === "all") return
    if (systemsLoading || !systemsReady) return
    if (
      selectedBatch !== "all" &&
      batchSystemIdsOverride == null &&
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
    batchSystemIdsOverride,
    farmId,
    farmLoading,
    onSystemChange,
    selectedBatch,
    selectedSystem,
    systems,
    systemsLoading,
    systemsReady,
  ])

  return (
    <div
      className={cn(
        "min-w-0",
        resolvedLayout === "row"
          ? cn("flex items-center gap-2", wrap ? "flex-wrap" : "flex-nowrap")
          : variant === "compact"
            ? "grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3"
            : "grid grid-cols-1 gap-2 md:grid-cols-3",
      )}
    >
      {showStage ? (
        <FilterPopover
          label={undefined}
          value={selectedStage}
          options={stages}
          placeholder="All stages"
          onChange={(value) => onStageChange(value as StageFilter)}
          searchable={stages.length > 6}
          searchPlaceholder="Search stage"
          emptyMessage="No stages found."
          className={resolvedLayout === "row" ? "w-full sm:w-[150px]" : "w-full min-w-0"}
        />
      ) : null}

      {showBatch ? (
        <FilterPopover
          label={undefined}
          value={selectedBatch}
          options={batchOptions}
          placeholder={batchesLoading ? "Loading batches..." : "All batches"}
          onChange={onBatchChange}
          disabled={batchesLoading}
          searchable
          searchPlaceholder="Search batch"
          emptyMessage="No batches found."
          className={resolvedLayout === "row" ? "w-full sm:w-[180px]" : "w-full min-w-0"}
        />
      ) : null}

      {showSystem ? (
        <FilterPopover
          label={undefined}
          value={selectedSystem}
          options={systemOptions}
          placeholder={
            systemsLoading || (selectedBatch !== "all" && batchSystemIdsOverride == null && batchSystemsQuery.isLoading)
              ? "Loading cages..."
              : `${allSystemsLabel}${showCounts && systemCount ? ` (${systemCount})` : ""}`
          }
          onChange={onSystemChange}
          disabled={systemsLoading || (selectedBatch !== "all" && batchSystemIdsOverride == null && batchSystemsQuery.isLoading)}
          searchable
          searchPlaceholder="Search cage"
          emptyMessage="No cages found."
          className={resolvedLayout === "row" ? "w-full sm:w-[220px] lg:w-[260px]" : "w-full min-w-0 xl:min-w-[16rem]"}
          contentClassName={resolvedLayout === "row" ? "w-[min(24rem,calc(100vw-24px))] sm:w-80 lg:w-96" : "w-[min(24rem,calc(100vw-24px))] sm:w-96"}
        />
      ) : null}
    </div>
  )
}

"use client"

import { useCallback, useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/app-ui/select"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useBatchOptions, useSystemOptions } from "@/lib/hooks/use-options"
import { formatCageLabel, type SystemOption } from "@/lib/system-options"

/**
 * Production page scope selector: one small "Cages / Batches" switch, and the
 * dropdown next to it lists whichever of the two the switch is on. Batch and
 * cage are mutually exclusive here -- pick a batch OR a cage, or leave it on
 * "All ..." for the consolidated farm view. All state lives in the URL so a
 * change re-renders the page from the server with fresh data.
 */
const normalizeBatchLabel = (label: string | null | undefined) => {
  const trimmed = label?.trim() ?? ""
  if (!trimmed) return ""
  return trimmed
    .replace(/\s*\(\s*split\s+[^)]+\)$/i, "")
    .replace(/\s*[-/|]\s*split\s+.+$/i, "")
    .replace(/\s+split\s+.+$/i, "")
    .trim()
}

export default function ProductionScopeFilter({
  initialFarmId,
  /** See ProductionMetricFilter's `startTransition` prop for why this exists. */
  startTransition,
  /**
   * Server-loaded fallbacks from the page's `initialData`. The client option
   * RPCs gate on trigger-maintained state (`cage_status`, an ongoing
   * `production_cycle`) that can be stale on imported/reconstructed farms and
   * then return nothing, leaving the dropdown stuck on just "All ...". These
   * lists come straight from the same data the chart/table already render, so
   * we union them in and never show fewer entries than the page itself knows
   * about.
   */
  fallbackSystems = [],
  fallbackBatches = [],
}: {
  initialFarmId?: string | null
  startTransition?: (callback: () => void) => void
  fallbackSystems?: SystemOption[]
  fallbackBatches?: Array<{ id: number; label: string }>
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { farmId } = useActiveFarm({ initialFarmId })

  const batchParam = searchParams.get("batch")
  const systemParam = searchParams.get("system") ?? searchParams.get("cage")
  const mode: "cage" | "batch" =
    searchParams.get("scope") === "batch" || batchParam ? "batch" : "cage"

  const batchesQuery = useBatchOptions(farmId ? { farmId } : undefined)
  const systemsQuery = useSystemOptions(
    farmId ? { farmId, activeOnly: true, stockedOnly: true } : undefined,
  )

  const batches = useMemo(() => {
    const fromRpc = (batchesQuery.data?.status === "success" ? batchesQuery.data.data : []).filter(
      (batch) => batch.id != null,
    )
    const byId = new Map<number, { id: number; label: string }>()
    for (const batch of fallbackBatches) {
      if (batch.id != null) byId.set(batch.id, { id: batch.id, label: batch.label })
    }
    for (const batch of fromRpc) {
      // RPC label wins when both know the batch -- it carries the real name.
      byId.set(batch.id as number, {
        id: batch.id as number,
        label: normalizeBatchLabel(batch.label) || batch.label || `Batch ${batch.id}`,
      })
    }
    return Array.from(byId.values()).sort((left, right) =>
      left.label.localeCompare(right.label, undefined, { numeric: true }),
    )
  }, [batchesQuery.data, fallbackBatches])
  const systems = useMemo(() => {
    const fromRpc = (systemsQuery.data?.status === "success" ? systemsQuery.data.data : []).filter(
      (system) => system.id != null,
    )
    const byId = new Map<number, SystemOption>()
    for (const system of fallbackSystems) {
      if (system.id != null) byId.set(system.id, system)
    }
    for (const system of fromRpc) byId.set(system.id, system)
    return Array.from(byId.values())
  }, [systemsQuery.data, fallbackSystems])

  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value == null) params.delete(key)
        else params.set(key, value)
      }
      const nextQuery = params.toString()
      if (nextQuery === searchParams.toString()) return
      const navigate = () => router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname)
      if (startTransition) startTransition(navigate)
      else navigate()
    },
    [pathname, router, searchParams, startTransition],
  )

  const handleModeChange = (next: string) => {
    // Switching the dimension always drops any selected batch/cage so we land
    // on the consolidated "All ..." view for the new dimension.
    setParams({
      scope: next === "batch" ? "batch" : null,
      batch: null,
      system: null,
      cage: null,
    })
  }

  const handleBatchChange = (value: string) => {
    setParams({
      scope: "batch",
      batch: value === "all" ? null : value,
      system: null,
      cage: null,
    })
  }

  const handleCageChange = (value: string) => {
    setParams({
      scope: null,
      // Keep the legacy `cage` param cleared so older links still resolve.
      system: value === "all" ? null : value,
      cage: null,
      batch: null,
    })
  }

  const sortedSystems = useMemo(
    () =>
      [...systems].sort((left, right) =>
        formatCageLabel(left).localeCompare(formatCageLabel(right), undefined, { numeric: true }),
      ),
    [systems],
  )

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <div className="w-[130px]">
        <Select value={mode} onValueChange={handleModeChange}>
          <SelectTrigger id="production-scope-mode" className="production-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="cage">Cages</SelectItem>
              <SelectItem value="batch">Batches</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="w-[200px] md:w-[220px]">
        {mode === "batch" ? (
          <Select
            value={batchParam ?? "all"}
            onValueChange={handleBatchChange}
            disabled={batchesQuery.isLoading && batches.length === 0}
          >
            <SelectTrigger id="production-batch-filter" className="production-select">
              <SelectValue
                placeholder={batchesQuery.isLoading && batches.length === 0 ? "Loading batches..." : "All batches"}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All batches</SelectItem>
                {batches.map((batch) => (
                  <SelectItem key={batch.id} value={String(batch.id)}>
                    {normalizeBatchLabel(batch.label) || batch.label || `Batch ${batch.id}`}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        ) : (
          <Select
            value={systemParam ?? "all"}
            onValueChange={handleCageChange}
            disabled={systemsQuery.isLoading && systems.length === 0}
          >
            <SelectTrigger id="production-cage-filter" className="production-select">
              <SelectValue
                placeholder={systemsQuery.isLoading && systems.length === 0 ? "Loading cages..." : "All cages"}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All cages</SelectItem>
                {sortedSystems.map((system) => (
                  <SelectItem key={system.id} value={String(system.id)}>
                    {formatCageLabel(system)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  )
}

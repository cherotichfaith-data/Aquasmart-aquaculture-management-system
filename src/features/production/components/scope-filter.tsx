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
import { formatCageLabel } from "@/lib/system-options"

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
}: {
  initialFarmId?: string | null
  startTransition?: (callback: () => void) => void
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

  const batches = useMemo(
    () =>
      (batchesQuery.data?.status === "success" ? batchesQuery.data.data : []).filter(
        (batch) => batch.id != null,
      ),
    [batchesQuery.data],
  )
  const systems = useMemo(
    () =>
      (systemsQuery.data?.status === "success" ? systemsQuery.data.data : []).filter(
        (system) => system.id != null,
      ),
    [systemsQuery.data],
  )

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
            disabled={batchesQuery.isLoading}
          >
            <SelectTrigger id="production-batch-filter" className="production-select">
              <SelectValue placeholder={batchesQuery.isLoading ? "Loading batches..." : "All batches"} />
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
            disabled={systemsQuery.isLoading}
          >
            <SelectTrigger id="production-cage-filter" className="production-select">
              <SelectValue placeholder={systemsQuery.isLoading ? "Loading cages..." : "All cages"} />
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

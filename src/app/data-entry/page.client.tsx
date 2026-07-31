"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { DataEntryAppShell } from "@/components/layout/data-entry-app-shell"
import { DataEntryInterface, DataEntryTabStrip } from "@/features/data-entry/components/data-entry-interface"
import { SystemForm } from "@/features/data-entry/components/system-form"
import type { getDataEntryPrefetch } from "@/features/data-entry/queries.server"
import { loadReferenceData, saveReferenceData } from "@/lib/offline/reference-cache"
import type { Database } from "@/lib/types/database"
import type { SystemOption } from "@/lib/system-options"

type BatchOption = Database["public"]["Functions"]["api_fingerling_batch_options_rpc"]["Returns"][number]
type FeedOption = Database["public"]["Functions"]["api_feed_type_options_rpc"]["Returns"][number]

const dataEntryTabs = [
  "feeding",
  "mortality",
  "sampling",
  "water_quality",
  "harvest",
  "transfer",
  "stocking",
  "feed_inventory",
  "system",
] as const

type DataEntryTab = (typeof dataEntryTabs)[number]

function resolveDataEntryTab(value: string | null): DataEntryTab {
  return dataEntryTabs.includes(value as DataEntryTab) ? (value as DataEntryTab) : "feeding"
}

function parsePositiveId(value: string | null) {
  if (!value?.trim()) return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export default function DataEntryPageClient({
  initialFarmId,
  initialFarmName,
  initialFarmRole,
  initialSystems,
  initialBatches,
  initialFeeds,
  initialRecentEntries,
}: {
  initialFarmId?: string | null
  initialFarmName?: string | null
  initialFarmRole?: Database["public"]["Tables"]["farm_user"]["Row"]["role"] | null
  initialSystems: SystemOption[]
  initialBatches: Database["public"]["Functions"]["api_fingerling_batch_options_rpc"]["Returns"][number][]
  initialFeeds: Database["public"]["Functions"]["api_feed_type_options_rpc"]["Returns"][number][]
  initialRecentEntries: Awaited<ReturnType<typeof getDataEntryPrefetch>>["recentEntries"]
}) {
  const searchParams = useSearchParams()
  const typeParam = searchParams.get("type")
  const systemParam = searchParams.get("system")
  const batchParam = searchParams.get("batch")

  const tab = useMemo(() => resolveDataEntryTab(typeParam), [typeParam])
  const requestedSystemId = useMemo(() => parsePositiveId(systemParam), [systemParam])
  const requestedBatchId = useMemo(() => parsePositiveId(batchParam), [batchParam])
  const farmId = initialFarmId ?? null

  // Systems/batches/feeds normally arrive fresh on every server render. When they don't
  // (a cold load with no network to reach the origin), fall back to whatever was last
  // cached in IndexedDB for this farm rather than showing empty dropdowns -- see
  // src/lib/offline/reference-cache.ts.
  const [cachedReferenceData, setCachedReferenceData] = useState<{
    systems: SystemOption[]
    batches: BatchOption[]
    feeds: FeedOption[]
  } | null>(null)

  useEffect(() => {
    if (!farmId) return
    void saveReferenceData("systems", farmId, initialSystems)
    void saveReferenceData("batches", farmId, initialBatches)
    void saveReferenceData("feeds", farmId, initialFeeds)
  }, [farmId, initialSystems, initialBatches, initialFeeds])

  useEffect(() => {
    if (!farmId) return
    let cancelled = false
    void (async () => {
      const [systems, batches, feeds] = await Promise.all([
        loadReferenceData<SystemOption>("systems", farmId),
        loadReferenceData<BatchOption>("batches", farmId),
        loadReferenceData<FeedOption>("feeds", farmId),
      ])
      if (!cancelled) setCachedReferenceData({ systems, batches, feeds })
    })()
    return () => {
      cancelled = true
    }
  }, [farmId])

  // Each field falls back independently -- a farm can legitimately have systems but zero
  // batches yet, and that shouldn't be treated the same as "this came back empty because
  // we're offline."
  const systems = initialSystems.length > 0 ? initialSystems : cachedReferenceData?.systems ?? initialSystems
  const batches = initialBatches.length > 0 ? initialBatches : cachedReferenceData?.batches ?? initialBatches
  const feeds = initialFeeds.length > 0 ? initialFeeds : cachedReferenceData?.feeds ?? initialFeeds
  const defaultSystemId = requestedSystemId && systems.some((system) => system.id === requestedSystemId)
    ? requestedSystemId
    : null
  const defaultBatchId = requestedBatchId && batches.some((batch) => batch.id === requestedBatchId)
    ? requestedBatchId
    : null
  const hasSystems = systems.length > 0

  const recentEntries = useMemo(
    () => ({
      mortality: initialRecentEntries.mortality.status === "success" ? initialRecentEntries.mortality.data : [],
      feeding: initialRecentEntries.feeding.status === "success" ? initialRecentEntries.feeding.data : [],
      sampling: initialRecentEntries.sampling.status === "success" ? initialRecentEntries.sampling.data : [],
      transfer: initialRecentEntries.transfer.status === "success" ? initialRecentEntries.transfer.data : [],
      harvest: initialRecentEntries.harvest.status === "success" ? initialRecentEntries.harvest.data : [],
      water_quality:
        initialRecentEntries.water_quality.status === "success" ? initialRecentEntries.water_quality.data : [],
      feed_inventory:
        initialRecentEntries.feed_inventory.status === "success" ? initialRecentEntries.feed_inventory.data : [],
      stocking: initialRecentEntries.stocking.status === "success" ? initialRecentEntries.stocking.data : [],
      systems: initialRecentEntries.systems.status === "success" ? initialRecentEntries.systems.data : [],
    }),
    [initialRecentEntries],
  )

  return (
    <DataEntryAppShell
      initialFarmId={initialFarmId}
      initialFarmName={initialFarmName}
      farmRole={initialFarmRole}
      tabs={
        hasSystems ? (
          <DataEntryTabStrip
            farmRole={initialFarmRole}
            tab={tab}
            defaultSystemId={defaultSystemId}
            defaultBatchId={defaultBatchId}
          />
        ) : null
      }
    >
      <div className="data-entry-page-shell">
        {!hasSystems ? (
          <div className="mx-auto max-w-2xl space-y-4 py-4">
            <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-6 text-center">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Set up your first system</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Add at least one system before recording farm operations.
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card p-6">
              <SystemForm />
            </div>
          </div>
        ) : (
          <DataEntryInterface
            farmId={farmId}
            farmRole={initialFarmRole}
            systems={systems}
            feeds={feeds}
            batches={batches}
            recentEntries={recentEntries}
            tab={tab}
            defaultSystemId={defaultSystemId}
            defaultBatchId={defaultBatchId}
          />
        )}
      </div>
    </DataEntryAppShell>
  )
}

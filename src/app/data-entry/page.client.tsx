"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { DataEntryInterface } from "@/features/data-entry/components/data-entry-interface"
import { SystemForm } from "@/features/data-entry/components/system-form"
import type { getDataEntryPrefetch } from "@/features/data-entry/queries.server"
import type { Database } from "@/lib/types/database"
import type { SystemOption } from "@/lib/system-options"

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
  const systems = initialSystems
  const batches = initialBatches
  const feeds = initialFeeds
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
    <DashboardLayout
      hideHeader
      initialFarmId={initialFarmId}
      initialFarmName={initialFarmName}
      headerDataOverrides={{ role: initialFarmRole ?? null }}
    >
      <div className="data-entry-page-shell container mx-auto py-0 sm:py-0">
        {!hasSystems ? (
          <div className="space-y-6">
            <div className="rounded-lg border border-dashed border-border/80 bg-muted/30 p-6 shadow-sm">
              <h2 className="text-xl font-semibold tracking-tight">Set up your first system</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Add at least one system before recording farm operations.
              </p>
            </div>
            <div className="rounded-lg border border-border/80 bg-card p-6 shadow-sm">
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
    </DashboardLayout>
  )
}

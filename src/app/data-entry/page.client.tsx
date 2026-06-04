"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { DataEntryInterface } from "@/components/data-entry/data-entry-interface"
import { SystemForm } from "@/components/data-entry/system-form"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useActiveFarmRole } from "@/lib/hooks/use-active-farm-role"
import { useBatchOptions, useFeedTypeOptions, useSystemOptions } from "@/lib/hooks/use-options"
import { useRecentEntries } from "@/lib/hooks/use-reports"
import { DataErrorState } from "@/components/shared/data-states"
import { getErrorMessage, getQueryResultError } from "@/lib/utils/query-result"

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
}: {
  initialFarmId?: string | null
  initialFarmName?: string | null
}) {
  const { farmId } = useActiveFarm({ initialFarmId, initialFarmName })
  const activeFarmRoleQuery = useActiveFarmRole(farmId)

  const systemsQuery = useSystemOptions({ farmId, activeOnly: true })
  const batchesQuery = useBatchOptions({ farmId })
  const feedsQuery = useFeedTypeOptions({ farmId })
  const recentEntriesQuery = useRecentEntries()
  const searchParams = useSearchParams()
  const typeParam = searchParams.get("type")
  const systemParam = searchParams.get("system")
  const batchParam = searchParams.get("batch")

  const tab = useMemo(() => resolveDataEntryTab(typeParam), [typeParam])
  const requestedSystemId = useMemo(() => parsePositiveId(systemParam), [systemParam])
  const requestedBatchId = useMemo(() => parsePositiveId(batchParam), [batchParam])

  const systemsLoading = systemsQuery.isLoading
  const loading =
    activeFarmRoleQuery.isLoading || batchesQuery.isLoading || feedsQuery.isLoading || recentEntriesQuery.isLoading

  const entryErrors = useMemo(() => {
    const data = recentEntriesQuery.data
    if (!data) return []
    return [
      getQueryResultError(data.mortality),
      getQueryResultError(data.feeding),
      getQueryResultError(data.sampling),
      getQueryResultError(data.transfer),
      getQueryResultError(data.harvest),
      getQueryResultError(data.water_quality),
      getQueryResultError(data.feed_inventory),
      getQueryResultError(data.stocking),
      getQueryResultError(data.systems),
    ].filter(Boolean) as string[]
  }, [recentEntriesQuery.data])
  const systemsErrorMessages = [
    getErrorMessage(systemsQuery.error),
    getQueryResultError(systemsQuery.data),
  ].filter(Boolean) as string[]
  const errorMessages = [
    getErrorMessage(activeFarmRoleQuery.error),
    getErrorMessage(batchesQuery.error),
    getQueryResultError(batchesQuery.data),
    getErrorMessage(feedsQuery.error),
    getQueryResultError(feedsQuery.data),
    getErrorMessage(recentEntriesQuery.error),
    ...entryErrors,
  ].filter(Boolean) as string[]
  const systems = systemsQuery.data?.status === "success" ? systemsQuery.data.data : []
  const batches = batchesQuery.data?.status === "success" ? batchesQuery.data.data : []
  const feeds = feedsQuery.data?.status === "success" ? feedsQuery.data.data : []
  const defaultSystemId = requestedSystemId && systems.some((system) => system.id === requestedSystemId)
    ? requestedSystemId
    : null
  const defaultBatchId = requestedBatchId && batches.some((batch) => batch.id === requestedBatchId)
    ? requestedBatchId
    : null
  const hasSystems = systems.length > 0

  const recentEntries = useMemo(
    () => ({
      mortality:
        recentEntriesQuery.data?.mortality?.status === "success" ? recentEntriesQuery.data.mortality.data : [],
      feeding:
        recentEntriesQuery.data?.feeding?.status === "success" ? recentEntriesQuery.data.feeding.data : [],
      sampling:
        recentEntriesQuery.data?.sampling?.status === "success" ? recentEntriesQuery.data.sampling.data : [],
      transfer:
        recentEntriesQuery.data?.transfer?.status === "success" ? recentEntriesQuery.data.transfer.data : [],
      harvest:
        recentEntriesQuery.data?.harvest?.status === "success" ? recentEntriesQuery.data.harvest.data : [],
      water_quality:
        recentEntriesQuery.data?.water_quality?.status === "success"
          ? recentEntriesQuery.data.water_quality.data
          : [],
      feed_inventory:
        recentEntriesQuery.data?.feed_inventory?.status === "success"
          ? recentEntriesQuery.data.feed_inventory.data
          : [],
      stocking:
        recentEntriesQuery.data?.stocking?.status === "success" ? recentEntriesQuery.data.stocking.data : [],
      systems:
        recentEntriesQuery.data?.systems?.status === "success" ? recentEntriesQuery.data.systems.data : [],
    }),
    [
      recentEntriesQuery.data,
    ],
  )

  return (
    <DashboardLayout hideHeader initialFarmId={initialFarmId} initialFarmName={initialFarmName}>
      <div className="data-entry-page-shell container mx-auto py-0 sm:py-0">
        {systemsErrorMessages.length > 0 ? (
          <DataErrorState
            title="Unable to load systems"
            description={systemsErrorMessages[0]}
            onRetry={() => {
              systemsQuery.refetch()
            }}
          />
        ) : systemsLoading ? (
          <div className="min-h-[300px] rounded-lg border border-border/80 bg-muted/40 animate-pulse shadow-sm" />
        ) : !hasSystems ? (
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
        ) : errorMessages.length > 0 ? (
          <DataErrorState
            title="Unable to load data-entry options"
            description={errorMessages[0]}
            onRetry={() => {
              systemsQuery.refetch()
              batchesQuery.refetch()
              feedsQuery.refetch()
              recentEntriesQuery.refetch()
            }}
          />
        ) : loading ? (
          <div className="min-h-[300px] rounded-lg border border-border/80 bg-muted/40 animate-pulse shadow-sm" />
        ) : (
          <DataEntryInterface
            farmId={farmId}
            farmRole={activeFarmRoleQuery.data}
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

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

export default function DataEntryPageClient() {
  const { farmId } = useActiveFarm()
  const activeFarmRoleQuery = useActiveFarmRole(farmId)

  const systemsQuery = useSystemOptions({ farmId })
  const batchesQuery = useBatchOptions({ farmId })
  const feedsQuery = useFeedTypeOptions()
  const recentEntriesQuery = useRecentEntries()
  const searchParams = useSearchParams()
  const typeParam = searchParams.get("type")
  const systemParam = searchParams.get("system")
  const batchParam = searchParams.get("batch")

  const defaultTab = useMemo(() => {
    if (!typeParam) {
      const role = activeFarmRoleQuery.data
      if (role === "system_operator") return "feeding"
      if (role === "data_analyst") return "sampling"
      if (role === "viewer") return "feeding"
      return "feeding"
    }
    const normalized = typeParam.toLowerCase()
    if (normalized === "system") return "system"
    if (normalized === "stocking") return "stocking"
    if (normalized === "mortality") return "mortality"
    if (normalized === "feeding") return "feeding"
    if (normalized === "sampling") return "sampling"
    if (normalized === "transfer") return "transfer"
    if (normalized === "harvest") return "harvest"
    if (normalized === "incoming_feed" || normalized === "incoming-feed") return "incoming_feed"
    if (normalized === "water_quality" || normalized === "water-quality") return "water_quality"
    return "feeding"
  }, [activeFarmRoleQuery.data, typeParam])
  const defaultSystemId = useMemo(() => {
    const parsed = Number(systemParam)
    return Number.isFinite(parsed) ? parsed : null
  }, [systemParam])
  const defaultBatchId = useMemo(() => {
    const parsed = Number(batchParam)
    return Number.isFinite(parsed) ? parsed : null
  }, [batchParam])

  const systemsLoading = systemsQuery.isLoading
  const loading = batchesQuery.isLoading || feedsQuery.isLoading || recentEntriesQuery.isLoading

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
      getQueryResultError(data.incoming_feed),
      getQueryResultError(data.stocking),
      getQueryResultError(data.systems),
    ].filter(Boolean) as string[]
  }, [recentEntriesQuery.data])
  const systemsErrorMessages = [
    getErrorMessage(systemsQuery.error),
    getQueryResultError(systemsQuery.data),
  ].filter(Boolean) as string[]
  const errorMessages = [
    getErrorMessage(batchesQuery.error),
    getQueryResultError(batchesQuery.data),
    getErrorMessage(feedsQuery.error),
    getQueryResultError(feedsQuery.data),
    getErrorMessage(recentEntriesQuery.error),
    ...entryErrors,
  ].filter(Boolean) as string[]
  const latestUpdatedAt = Math.max(
    systemsQuery.dataUpdatedAt ?? 0,
    batchesQuery.dataUpdatedAt ?? 0,
    feedsQuery.dataUpdatedAt ?? 0,
    recentEntriesQuery.dataUpdatedAt ?? 0,
  )
  const systems = systemsQuery.data?.status === "success" ? systemsQuery.data.data : []
  const batches = batchesQuery.data?.status === "success" ? batchesQuery.data.data : []
  const feeds = feedsQuery.data?.status === "success" ? feedsQuery.data.data : []
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
      incoming_feed:
        recentEntriesQuery.data?.incoming_feed?.status === "success"
          ? recentEntriesQuery.data.incoming_feed.data
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
    <DashboardLayout showHeaderToolbar={false}>
      <div className="container mx-auto py-0 sm:py-0">
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
            systems={systems}
            feeds={feeds}
            batches={batches}
            recentEntries={recentEntries}
            defaultTab={defaultTab}
            defaultSystemId={defaultSystemId}
            defaultBatchId={defaultBatchId}
          />
        )}
      </div>
    </DashboardLayout>
  )
}

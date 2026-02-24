"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { DataEntryInterface } from "@/components/data-entry/data-entry-interface"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { useBatchOptions, useFeedTypeOptions, useSystemOptions } from "@/lib/hooks/use-options"
import { useRecentEntries, useSuppliers } from "@/lib/hooks/use-reports"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt } from "@/components/shared/data-states"
import { getErrorMessage, getQueryResultError } from "@/lib/utils/query-result"

export default function DataEntryPageClient() {
  const { farmId } = useActiveFarm()

  const systemsQuery = useSystemOptions({ farmId })
  const batchesQuery = useBatchOptions({ farmId })
  const feedsQuery = useFeedTypeOptions()
  const suppliersQuery = useSuppliers()
  const recentEntriesQuery = useRecentEntries()
  const searchParams = useSearchParams()
  const typeParam = searchParams.get("type")
  const systemParam = searchParams.get("system")
  const batchParam = searchParams.get("batch")

  const defaultTab = useMemo(() => {
    if (!typeParam) return "stocking"
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
    return "stocking"
  }, [typeParam])
  const defaultSystemId = useMemo(() => {
    const parsed = Number(systemParam)
    return Number.isFinite(parsed) ? parsed : null
  }, [systemParam])
  const defaultBatchId = useMemo(() => {
    const parsed = Number(batchParam)
    return Number.isFinite(parsed) ? parsed : null
  }, [batchParam])

  const loading =
    systemsQuery.isLoading ||
    batchesQuery.isLoading ||
    feedsQuery.isLoading ||
    suppliersQuery.isLoading ||
    recentEntriesQuery.isLoading

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
  const errorMessages = [
    getErrorMessage(systemsQuery.error),
    getQueryResultError(systemsQuery.data),
    getErrorMessage(batchesQuery.error),
    getQueryResultError(batchesQuery.data),
    getErrorMessage(feedsQuery.error),
    getQueryResultError(feedsQuery.data),
    getErrorMessage(suppliersQuery.error),
    getQueryResultError(suppliersQuery.data),
    getErrorMessage(recentEntriesQuery.error),
    ...entryErrors,
  ].filter(Boolean) as string[]
  const latestUpdatedAt = Math.max(
    systemsQuery.dataUpdatedAt ?? 0,
    batchesQuery.dataUpdatedAt ?? 0,
    feedsQuery.dataUpdatedAt ?? 0,
    suppliersQuery.dataUpdatedAt ?? 0,
    recentEntriesQuery.dataUpdatedAt ?? 0,
  )
  const systems = systemsQuery.data?.status === "success" ? systemsQuery.data.data : []
  const batches = batchesQuery.data?.status === "success" ? batchesQuery.data.data : []
  const feeds = feedsQuery.data?.status === "success" ? feedsQuery.data.data : []
  const suppliers = suppliersQuery.data?.status === "success" ? suppliersQuery.data.data : []

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
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <div className="flex flex-col gap-2 mb-6 rounded-lg border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Data Entry</h1>
              <p className="text-muted-foreground">
                Record farm activities and measurements.
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 text-xs">
              <DataUpdatedAt updatedAt={latestUpdatedAt} />
              <DataFetchingBadge isFetching={recentEntriesQuery.isFetching} isLoading={loading} />
            </div>
          </div>
        </div>
        {errorMessages.length > 0 ? (
          <DataErrorState
            title="Unable to load data-entry options"
            description={errorMessages[0]}
            onRetry={() => {
              systemsQuery.refetch()
              batchesQuery.refetch()
              feedsQuery.refetch()
              suppliersQuery.refetch()
              recentEntriesQuery.refetch()
            }}
          />
        ) : loading ? (
          <div className="min-h-[300px] rounded-lg border border-border/80 bg-muted/40 animate-pulse shadow-sm" />
        ) : (
          <DataEntryInterface
            systems={systems}
            suppliers={suppliers}
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

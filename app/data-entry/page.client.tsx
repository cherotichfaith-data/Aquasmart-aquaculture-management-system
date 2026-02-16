"use client"

import { useMemo } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { DataEntryInterface } from "@/components/data-entry/data-entry-interface"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { useBatchOptions, useFeedTypeOptions, useSystemOptions } from "@/lib/hooks/use-options"
import { useRecentEntries, useSuppliers } from "@/lib/hooks/use-reports"

export default function DataEntryPageClient() {
  const { farmId } = useActiveFarm()

  const systemsQuery = useSystemOptions({ farmId })
  const batchesQuery = useBatchOptions({ farmId })
  const feedsQuery = useFeedTypeOptions()
  const suppliersQuery = useSuppliers()
  const recentEntriesQuery = useRecentEntries()

  const loading =
    systemsQuery.isLoading ||
    batchesQuery.isLoading ||
    feedsQuery.isLoading ||
    suppliersQuery.isLoading ||
    recentEntriesQuery.isLoading

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
        <div className="flex flex-col gap-2 mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Data Entry</h1>
          <p className="text-muted-foreground">
            Record farm activities and measurements.
          </p>
        </div>
        {loading ? (
          <div className="min-h-[300px] rounded-lg border border-border bg-muted/30 animate-pulse" />
        ) : (
          <DataEntryInterface
            systems={systems}
            suppliers={suppliers}
            feeds={feeds}
            batches={batches}
            recentEntries={recentEntries}
          />
        )}
      </div>
    </DashboardLayout>
  )
}

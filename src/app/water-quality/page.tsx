import { Suspense } from "react"
import { dehydrate } from "@tanstack/react-query"
import PageClient from "./page.client"
import { QueryHydration } from "@/components/providers/query-hydration"
import { resolveInitialFarmId } from "@/features/farm/queries.server"
import {
  getWaterQualityPageInitialData,
  parseWaterQualityPageFilters,
} from "@/features/water-quality/queries.server"
import { cleanScopedFilterState, parseSelectedNumericId } from "@/features/shared/scoped-analytics.server"
import { queryKeys } from "@/lib/cache/query-keys"
import { createQueryClient } from "@/lib/react-query/query-client"

type SearchParams = Record<string, string | string[] | undefined>

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const searchFarmId = typeof resolvedSearchParams.farmId === "string" ? resolvedSearchParams.farmId : null
  const initialFilters = parseWaterQualityPageFilters(resolvedSearchParams)
  const { farmId, farmName } = await resolveInitialFarmId(searchFarmId)
  const initialData = await getWaterQualityPageInitialData({
    farmId,
    filters: initialFilters,
  })
  const effectiveFilters =
    initialData.systemOptions.status === "success"
      ? cleanScopedFilterState(initialFilters, initialData.systemOptions.data)
      : initialFilters
  const selectedSystemId = parseSelectedNumericId(effectiveFilters.selectedSystem)
  const batchId = parseSelectedNumericId(effectiveFilters.selectedBatch)
  const queryClient = createQueryClient()

  if (initialData.bounds.start && initialData.bounds.end) {
    queryClient.setQueryData(
      queryKeys.timePeriodBounds({
        farmId,
        timePeriod: effectiveFilters.timePeriod,
        systemId: selectedSystemId,
        scope: "water_quality",
      }),
      initialData.bounds,
    )
  }
  queryClient.setQueryData(
    queryKeys.options.systems({
      farmId,
      stage: effectiveFilters.selectedStage,
      activeOnly: false,
    }),
    initialData.systemOptions,
  )
  queryClient.setQueryData(queryKeys.reports.batchSystemIds({ farmId, batchId }), initialData.batchSystems)
  queryClient.setQueryData(queryKeys.waterQuality.syncStatus(farmId), initialData.syncStatus)
  queryClient.setQueryData(
    queryKeys.waterQuality.latestStatus({ farmId, systemId: selectedSystemId }),
    initialData.latestStatus,
  )
  queryClient.setQueryData(queryKeys.waterQuality.thresholds(farmId), initialData.thresholds)

  if (initialData.bounds.start && initialData.bounds.end) {
    queryClient.setQueryData(
      queryKeys.waterQuality.dailyRating({
        farmId,
        systemId: selectedSystemId,
        dateFrom: initialData.bounds.start,
        dateTo: initialData.bounds.end,
        limit: 2000,
      }),
      initialData.ratings,
    )
    queryClient.setQueryData(
      queryKeys.waterQuality.measurements({
        farmId,
        systemId: selectedSystemId,
        dateFrom: initialData.bounds.start,
        dateTo: initialData.bounds.end,
        limit: 2000,
      }),
      initialData.measurements,
    )
    queryClient.setQueryData(
      queryKeys.waterQuality.overlay({
        farmId,
        systemId: selectedSystemId,
        dateFrom: initialData.bounds.start,
        dateTo: initialData.bounds.end,
      }),
      initialData.overlay,
    )
    queryClient.setQueryData(
      queryKeys.activity.recentActivities({
        tableName: "water_quality_measurement",
        dateFrom: `${initialData.bounds.start}T00:00:00`,
        dateTo: `${initialData.bounds.end}T23:59:59`,
        limit: 1500,
      }),
      initialData.activities,
    )
  }

  return (
    <Suspense fallback={null}>
      <QueryHydration state={dehydrate(queryClient)}>
        <PageClient initialFarmId={farmId} initialFarmName={farmName} initialFilters={effectiveFilters} />
      </QueryHydration>
    </Suspense>
  )
}

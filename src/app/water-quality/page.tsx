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
import { resolveSystemIdFromFilterValue } from "@/lib/system-options"

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
  const systemOptions = initialData.systemOptions.status === "success" ? initialData.systemOptions.data : []
  const selectedSystemId = resolveSystemIdFromFilterValue(effectiveFilters.selectedSystem, systemOptions)
  const batchId = parseSelectedNumericId(effectiveFilters.selectedBatch)
  const queryClient = createQueryClient()

  if (initialData.bounds.start && initialData.bounds.end) {
    queryClient.setQueryData(
      queryKeys.timePeriodBounds({
        farmId,
        timePeriod: effectiveFilters.timePeriod,
        systemId: selectedSystemId,
        batchId,
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
  queryClient.setQueryData(
    queryKeys.waterQuality.latestStatus({ farmId, systemId: selectedSystemId }),
    initialData.latestStatus,
  )

  if (initialData.bounds.start && initialData.bounds.end) {
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
  }

  return (
    <Suspense fallback={null}>
      <QueryHydration state={dehydrate(queryClient)}>
        <PageClient initialFarmId={farmId} initialFarmName={farmName} initialFilters={effectiveFilters} />
      </QueryHydration>
    </Suspense>
  )
}

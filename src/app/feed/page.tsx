import { Suspense } from "react"
import { dehydrate } from "@tanstack/react-query"
import PageClient from "./page.client"
import { QueryHydration } from "@/components/providers/query-hydration"
import { resolveInitialFarmId } from "@/features/farm/queries.server"
import { getFeedPageInitialData, parseFeedPageFilters } from "@/features/feed/queries.server"
import { cleanScopedFilterState, parseSelectedNumericId } from "@/features/shared/scoped-analytics.server"
import { queryKeys } from "@/lib/cache/query-keys"
import { createQueryClient } from "@/lib/react-query/query-client"
import { requireUserContext } from "@/lib/supabase/require-user"
import { resolveSystemIdFromFilterValue } from "@/lib/system-options"

type SearchParams = Record<string, string | string[] | undefined>

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const resolvedSearchParams = (await searchParams) ?? {}
  await requireUserContext("/feed")
  const searchFarmId = typeof resolvedSearchParams.farmId === "string" ? resolvedSearchParams.farmId : null
  const initialFilters = parseFeedPageFilters(resolvedSearchParams)
  const { farmId, farmName } = await resolveInitialFarmId(searchFarmId)
  const initialData = await getFeedPageInitialData({
    farmId,
    filters: initialFilters,
  })
  const effectiveFilters =
    initialData.systems.status === "success"
      ? cleanScopedFilterState(initialFilters, initialData.systems.data)
      : initialFilters
  const systemOptions = initialData.systems.status === "success" ? initialData.systems.data : []
  const selectedSystemId = resolveSystemIdFromFilterValue(effectiveFilters.selectedSystem, systemOptions)
  const batchId = parseSelectedNumericId(effectiveFilters.selectedBatch)
  const scopedSystemIdList =
    selectedSystemId != null
      ? [selectedSystemId]
        : effectiveFilters.selectedBatch === "all"
        ? initialData.systems.status === "success"
          ? initialData.systems.data
              .map((row) => row.id)
              .filter((id): id is number => typeof id === "number")
          : []
        : initialData.batchSystems.status === "success"
          ? initialData.batchSystems.data.map((row) => row.system_id)
          : []
  const feedRateScopeIds =
    selectedSystemId != null
      ? [selectedSystemId]
      : effectiveFilters.selectedStage === "all" &&
          effectiveFilters.selectedBatch === "all" &&
          effectiveFilters.selectedSystem === "all"
        ? null
        : scopedSystemIdList
  const queryClient = createQueryClient()

  if (initialData.bounds.start && initialData.bounds.end) {
    queryClient.setQueryData(
      queryKeys.timePeriodBounds({
        farmId,
        timePeriod: effectiveFilters.timePeriod,
        systemId: selectedSystemId,
        scope: "feeding",
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
    initialData.systems,
  )
  queryClient.setQueryData(
    queryKeys.options.systems({
      farmId,
      stage: effectiveFilters.selectedStage,
      activeOnly: true,
    }),
    initialData.systems,
  )
  queryClient.setQueryData(
    queryKeys.reports.batchSystemIds({
      farmId,
      batchId,
    }),
    initialData.batchSystems,
  )
  if (initialData.bounds.start && initialData.bounds.end) {
    queryClient.setQueryData(
      queryKeys.reports.feedingRecords({
        farmId,
        systemId: selectedSystemId ?? undefined,
        systemIds: selectedSystemId == null ? scopedSystemIdList : undefined,
        batchId: batchId ?? undefined,
        dateFrom: initialData.bounds.start,
        dateTo: initialData.bounds.end,
        limit: 4000,
      }),
      initialData.feedingRecords,
    )
    queryClient.setQueryData(
      queryKeys.analytics.feedRateAnalysis({
        farmId,
        systemIds: feedRateScopeIds,
        dateFrom: initialData.bounds.start,
        dateTo: initialData.bounds.end,
      }),
      initialData.feedRateSummary,
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

import { Suspense } from "react"
import { dehydrate } from "@tanstack/react-query"
import PageClient from "./page.client"
import { QueryHydration } from "@/components/providers/query-hydration"
import { resolveInitialFarmId } from "@/features/farm/queries.server"
import { getFeedPageInitialData, parseFeedPageFilters } from "@/features/feed/queries.server"
import { listFeedDemandForecastRows } from "@/features/shared/query-seed.server"
import { parseSelectedNumericId } from "@/features/shared/scoped-analytics.server"
import { queryKeys } from "@/lib/cache/query-keys"
import { createQueryClient } from "@/lib/react-query/query-client"
import { requireUserContext } from "@/lib/supabase/require-user"
import { createAccessTokenClient } from "@/lib/supabase/server"

type SearchParams = Record<string, string | string[] | undefined>

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const { accessToken } = await requireUserContext("/feed")
  const searchFarmId = typeof resolvedSearchParams.farmId === "string" ? resolvedSearchParams.farmId : null
  const initialFilters = parseFeedPageFilters(resolvedSearchParams)
  const { farmId, farmName } = await resolveInitialFarmId(searchFarmId)
  const initialData = await getFeedPageInitialData({
    farmId,
    filters: initialFilters,
  })
  const feedDemandForecast = farmId
    ? await listFeedDemandForecastRows(createAccessTokenClient(accessToken), { farmId, daysAhead: 14 })
    : []
  const selectedSystemId = parseSelectedNumericId(initialFilters.selectedSystem)
  const batchId = parseSelectedNumericId(initialFilters.selectedBatch)
  const scopedSystemIdList =
    selectedSystemId != null
      ? [selectedSystemId]
      : initialFilters.selectedBatch === "all"
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
      : initialFilters.selectedStage === "all" &&
          initialFilters.selectedBatch === "all" &&
          initialFilters.selectedSystem === "all"
        ? null
        : scopedSystemIdList
  const queryClient = createQueryClient()

  if (initialData.bounds.start && initialData.bounds.end) {
    queryClient.setQueryData(
      queryKeys.timePeriodBounds({
        farmId,
        timePeriod: initialFilters.timePeriod,
        systemId: selectedSystemId,
        scope: "feeding",
      }),
      initialData.bounds,
    )
  }
  queryClient.setQueryData(
    queryKeys.options.systems({
      farmId,
      stage: initialFilters.selectedStage,
      activeOnly: false,
    }),
    initialData.systems,
  )
  queryClient.setQueryData(
    queryKeys.options.systems({
      farmId,
      stage: initialFilters.selectedStage,
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
      queryKeys.inventory.daily({
        farmId,
        systemId: selectedSystemId ?? undefined,
        dateFrom: initialData.bounds.start,
        dateTo: initialData.bounds.end,
        limit: 5000,
        orderAsc: true,
      }),
      initialData.inventory,
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
  queryClient.setQueryData(
    queryKeys.analytics.feedDemand({ farmId, daysAhead: 14 }),
    { status: "success", data: feedDemandForecast },
  )

  return (
    <Suspense fallback={null}>
      <QueryHydration state={dehydrate(queryClient)}>
        <PageClient initialFarmId={farmId} initialFarmName={farmName} initialFilters={initialFilters} />
      </QueryHydration>
    </Suspense>
  )
}

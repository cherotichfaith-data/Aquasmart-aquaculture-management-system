import { Suspense } from "react"
import { dehydrate } from "@tanstack/react-query"
import PageClient from "./page.client"
import { QueryHydration } from "@/components/providers/query-hydration"
import { resolveInitialFarmId } from "@/features/farm/queries.server"
import { parseSelectedNumericId } from "@/features/shared/scoped-analytics.server"
import { getReportsPageInitialData, parseReportsPageFilters } from "@/features/reports/queries.server"
import { queryKeys } from "@/lib/cache/query-keys"
import { createQueryClient } from "@/lib/react-query/query-client"
import { requireUserContext } from "@/lib/supabase/require-user"
import { countTimeRangeDays } from "@/lib/time-period"

type SearchParams = Record<string, string | string[] | undefined>

export default async function Page({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const { user } = await requireUserContext("/reports")
  const searchFarmId = typeof resolvedSearchParams.farmId === "string" ? resolvedSearchParams.farmId : null
  const initialFilters = parseReportsPageFilters(resolvedSearchParams)
  const { farmId, farmName } = await resolveInitialFarmId(searchFarmId)
  const initialData = await getReportsPageInitialData({ farmId, filters: initialFilters })
  const selectedSystemId = parseSelectedNumericId(initialFilters.selectedSystem)
  const batchId = parseSelectedNumericId(initialFilters.selectedBatch)
  const scopedGrowthSystemIds =
    initialData.growthSystems.status === "success"
      ? selectedSystemId
        ? [selectedSystemId]
        : initialData.growthSystems.data.map((row) => row.id).filter((id): id is number => typeof id === "number")
      : []
  const queryClient = createQueryClient()

  if (initialData.bounds.start && initialData.bounds.end) {
    queryClient.setQueryData(
      queryKeys.timePeriodBounds({
        farmId,
        timePeriod: initialFilters.timePeriod,
        systemId: selectedSystemId,
        scope: "production",
      }),
      initialData.bounds,
    )
  }

  if (initialData.bounds.start && initialData.bounds.end) {
    queryClient.setQueryData(
      queryKeys.production.summary({
        farmId,
        systemId: selectedSystemId,
        stage: initialFilters.selectedStage === "all" ? undefined : initialFilters.selectedStage,
        dateFrom: initialData.bounds.start,
        dateTo: initialData.bounds.end,
        limit: 5000,
      }),
      initialData.productionPerformance,
    )
    queryClient.setQueryData(
      queryKeys.production.summary({
        farmId,
        systemId: selectedSystemId,
        dateFrom: initialData.bounds.start,
        dateTo: initialData.bounds.end,
        limit: 5000,
      }),
      initialData.productionFeeding,
    )
    queryClient.setQueryData(
      queryKeys.reports.feedingRecords({
        farmId,
        systemId: selectedSystemId,
        batchId,
        dateFrom: initialData.bounds.start,
        dateTo: initialData.bounds.end,
        limit: 5000,
      }),
      initialData.feedingRecords,
    )
    queryClient.setQueryData(
      queryKeys.mortality.events({
        farmId,
        systemId: selectedSystemId,
        batchId,
        dateFrom: initialData.bounds.start,
        dateTo: initialData.bounds.end,
        limit: 2000,
      }),
      initialData.mortalityEvents,
    )
    queryClient.setQueryData(
      queryKeys.inventory.daily({
        farmId,
        systemId: selectedSystemId,
        dateFrom: initialData.bounds.start,
        dateTo: initialData.bounds.end,
        limit: 2000,
      }),
      initialData.mortalityInventory,
    )
    queryClient.setQueryData(
      queryKeys.reports.growthTrend({
        systemIds: scopedGrowthSystemIds,
        dateFrom: initialData.bounds.start,
        dateTo: initialData.bounds.end,
        days: countTimeRangeDays(initialData.bounds.start, initialData.bounds.end) ?? 180,
      }),
      initialData.growthTrend,
    )
    queryClient.setQueryData(
      queryKeys.waterQuality.measurements({
        farmId,
        systemId: selectedSystemId,
        dateFrom: initialData.bounds.start,
        dateTo: initialData.bounds.end,
      }),
      initialData.waterQualityMeasurements,
    )
  }

  queryClient.setQueryData(
    queryKeys.options.systems({ farmId, stage: initialFilters.selectedStage, activeOnly: false }),
    initialData.growthSystems,
  )
  queryClient.setQueryData(queryKeys.appConfig(["target_harvest_weight_g"], user.id), initialData.appConfig)
  queryClient.setQueryData(queryKeys.waterQuality.thresholds(farmId), initialData.alertThresholds)

  return (
    <Suspense fallback={null}>
      <QueryHydration state={dehydrate(queryClient)}>
        <PageClient initialFarmId={farmId} initialFarmName={farmName} initialFilters={initialFilters} />
      </QueryHydration>
    </Suspense>
  )
}

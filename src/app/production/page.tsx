import { dehydrate } from "@tanstack/react-query"
import PageClient from "./page.client"
import { QueryHydration } from "@/components/providers/query-hydration"
import { resolveInitialFarmId } from "@/features/farm/queries.server"
import { cleanScopedFilterState, parseSelectedNumericId } from "@/features/shared/scoped-analytics.server"
import { getProductionPageInitialData, parseProductionPageFilters } from "@/features/production/queries.server"
import { queryKeys } from "@/lib/cache/query-keys"
import { createQueryClient } from "@/lib/react-query/query-client"

type SearchParams = Record<string, string | string[] | undefined>

export default async function Page({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const searchFarmId = typeof resolvedSearchParams.farmId === "string" ? resolvedSearchParams.farmId : null
  const initialFilters = parseProductionPageFilters(resolvedSearchParams)
  const { farmId, farmName } = await resolveInitialFarmId(searchFarmId)
  const initialData = await getProductionPageInitialData({ farmId, filters: initialFilters })
  const effectiveFilters =
    initialData.systems.status === "success"
      ? cleanScopedFilterState(initialFilters, initialData.systems.data)
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
        batchId,
        scope: "production",
      }),
      initialData.bounds,
    )
  }
  queryClient.setQueryData(
    queryKeys.options.systems({ farmId, stage: effectiveFilters.selectedStage, activeOnly: false }),
    initialData.systems,
  )
  queryClient.setQueryData(queryKeys.reports.batchSystemIds({ farmId, batchId }), initialData.batchSystems)
  if (initialData.bounds.start && initialData.bounds.end) {
    queryClient.setQueryData(
      queryKeys.production.summary({
        farmId,
        systemId: selectedSystemId,
        stage: effectiveFilters.selectedStage === "all" ? undefined : effectiveFilters.selectedStage,
        dateFrom: initialData.bounds.start,
        dateTo: initialData.bounds.end,
        limit: 2500,
      }),
      initialData.productionSummary,
    )
  }

  return (
    <QueryHydration state={dehydrate(queryClient)}>
      <PageClient initialFarmId={farmId} initialFarmName={farmName} initialFilters={effectiveFilters} />
    </QueryHydration>
  )
}

import { dehydrate } from "@tanstack/react-query"
import PageClient from "./page.client"
import { QueryHydration } from "@/components/providers/query-hydration"
import { PRODUCTION_METRICS, parseProductionMetric } from "@/components/production/metrics"
import { resolveInitialFarmId } from "@/features/farm/queries.server"
import { listCycleBenchmarkRows } from "@/features/shared/query-seed.server"
import { cleanScopedFilterState, parseSelectedNumericId } from "@/features/shared/scoped-analytics.server"
import { getProductionPageInitialData, parseProductionPageFilters } from "@/features/production/queries.server"
import { queryKeys } from "@/lib/cache/query-keys"
import { createQueryClient } from "@/lib/react-query/query-client"
import { requireUserContext } from "@/lib/supabase/require-user"
import { createAccessTokenClient } from "@/lib/supabase/server"

type SearchParams = Record<string, string | string[] | undefined>

export default async function Page({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const { accessToken } = await requireUserContext("/production")
  const searchFarmId = typeof resolvedSearchParams.farmId === "string" ? resolvedSearchParams.farmId : null
  const initialFilters = parseProductionPageFilters(resolvedSearchParams)
  const filterParam = typeof resolvedSearchParams.filter === "string" ? resolvedSearchParams.filter : null
  const metricFilter = parseProductionMetric(filterParam)
  const includeInventory = PRODUCTION_METRICS[metricFilter].source === "inventory"
  const { farmId, farmName } = await resolveInitialFarmId(searchFarmId)
  const initialData = await getProductionPageInitialData({ farmId, filters: initialFilters, includeInventory })
  const effectiveFilters =
    initialData.systems.status === "success"
      ? cleanScopedFilterState(initialFilters, initialData.systems.data)
      : initialFilters
  const selectedSystemId = parseSelectedNumericId(effectiveFilters.selectedSystem)
  const cycleBenchmarks = farmId
    ? await listCycleBenchmarkRows(createAccessTokenClient(accessToken), { farmId, systemId: selectedSystemId })
    : []
  const batchId = parseSelectedNumericId(effectiveFilters.selectedBatch)
  const queryClient = createQueryClient()

  if (initialData.bounds.start && initialData.bounds.end) {
    queryClient.setQueryData(
      queryKeys.timePeriodBounds({
        farmId,
        timePeriod: effectiveFilters.timePeriod,
        systemId: selectedSystemId,
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
    if (includeInventory) {
      queryClient.setQueryData(
        queryKeys.inventory.daily({
          farmId,
          systemId: selectedSystemId,
          dateFrom: initialData.bounds.start,
          dateTo: initialData.bounds.end,
          limit: 5000,
          orderAsc: true,
        }),
        initialData.inventory,
      )
    }
  }
  queryClient.setQueryData(
    queryKeys.analytics.cycleBenchmarks({ farmId, systemId: selectedSystemId }),
    { status: "success", data: cycleBenchmarks },
  )

  return (
    <QueryHydration state={dehydrate(queryClient)}>
      <PageClient initialFarmId={farmId} initialFarmName={farmName} initialFilters={effectiveFilters} />
    </QueryHydration>
  )
}

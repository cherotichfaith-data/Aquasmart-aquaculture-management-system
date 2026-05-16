import { Suspense } from "react"
import { dehydrate } from "@tanstack/react-query"
import PageClient from "./page.client"
import { QueryHydration } from "@/components/providers/query-hydration"
import { resolveInitialFarmId } from "@/features/farm/queries.server"
import { cleanScopedFilterState, parseSelectedNumericId } from "@/features/shared/scoped-analytics.server"
import { getSamplingPageInitialData, parseSamplingPageFilters } from "@/features/sampling/queries.server"
import { listHarvestForecastRows } from "@/features/shared/query-seed.server"
import { queryKeys } from "@/lib/cache/query-keys"
import { createQueryClient } from "@/lib/react-query/query-client"
import { requireUserContext } from "@/lib/supabase/require-user"
import { createAccessTokenClient } from "@/lib/supabase/server"

type SearchParams = Record<string, string | string[] | undefined>

function buildScopedSystemIdList(
  filters: ReturnType<typeof parseSamplingPageFilters>,
  systems: Array<{ id: number | null }>,
  batchSystems: Array<{ system_id: number }>,
) {
  const selectedSystemId = parseSelectedNumericId(filters.selectedSystem)
  if (selectedSystemId) return [selectedSystemId]

  const stageIds = systems.map((row) => row.id).filter((id): id is number => typeof id === "number")
  if (filters.selectedBatch === "all") return stageIds

  const stageSet = new Set(stageIds)
  return batchSystems.map((row) => row.system_id).filter((id) => stageSet.has(id))
}

export default async function Page({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const { user, accessToken } = await requireUserContext("/sampling")
  const searchFarmId = typeof resolvedSearchParams.farmId === "string" ? resolvedSearchParams.farmId : null
  const initialFilters = parseSamplingPageFilters(resolvedSearchParams)
  const { farmId, farmName } = await resolveInitialFarmId(searchFarmId)
  const initialData = await getSamplingPageInitialData({ farmId, filters: initialFilters })
  const effectiveFilters =
    initialData.systems.status === "success"
      ? cleanScopedFilterState(initialFilters, initialData.systems.data)
      : initialFilters
  const selectedSystemId = parseSelectedNumericId(effectiveFilters.selectedSystem)
  const batchId = parseSelectedNumericId(effectiveFilters.selectedBatch)
  const scopedSystemIds =
    initialData.systems.status === "success" && initialData.batchSystems.status === "success"
      ? buildScopedSystemIdList(effectiveFilters, initialData.systems.data, initialData.batchSystems.data)
      : []
  const harvestForecast = farmId
    ? await listHarvestForecastRows(createAccessTokenClient(accessToken), {
        farmId,
        systemId: selectedSystemId,
      })
    : []
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
  queryClient.setQueryData(
    queryKeys.options.systemVolumes({ farmId, stage: effectiveFilters.selectedStage, activeOnly: true }),
    initialData.systemVolumes,
  )
  queryClient.setQueryData(
    queryKeys.appConfig(
      ["target_density_kg_m3", "target_harvest_weight_g", "target_move_weight_g", "growth_curve_points"],
      user.id,
    ),
    initialData.appConfig,
  )
  queryClient.setQueryData(
    queryKeys.analytics.harvestForecast({ farmId, systemId: selectedSystemId }),
    { status: "success", data: harvestForecast },
  )

  if (initialData.bounds.start && initialData.bounds.end) {
    queryClient.setQueryData(
      queryKeys.dashboard.systemsTable({
        farmId,
        stage: effectiveFilters.selectedStage,
        batch: effectiveFilters.selectedBatch,
        system: effectiveFilters.selectedSystem,
        timePeriod: effectiveFilters.timePeriod,
        dateFrom: initialData.bounds.start,
        dateTo: initialData.bounds.end,
        includeIncomplete: true,
      }),
      initialData.systemsTable,
    )
    queryClient.setQueryData(
      queryKeys.reports.sampling({
        farmId,
        systemId: selectedSystemId,
        systemIds: selectedSystemId ? undefined : scopedSystemIds,
        batchId,
        dateFrom: initialData.bounds.start,
        dateTo: initialData.bounds.end,
        limit: 2000,
      }),
      initialData.sampling,
    )
    queryClient.setQueryData(
      queryKeys.production.summary({
        farmId,
        systemId: selectedSystemId,
        stage: effectiveFilters.selectedStage === "all" ? undefined : effectiveFilters.selectedStage,
        dateFrom: initialData.bounds.start,
        dateTo: initialData.bounds.end,
        limit: 5000,
      }),
      initialData.productionSummary,
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

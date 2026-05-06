import { Suspense } from "react"
import { dehydrate } from "@tanstack/react-query"
import PageClient from "./page.client"
import { QueryHydration } from "@/components/providers/query-hydration"
import { resolveInitialFarmId } from "@/features/farm/queries.server"
import {
  getMortalityPageInitialData,
  parseMortalityPageFilters,
} from "@/features/mortality/queries.server"
import { parseSelectedNumericId } from "@/features/shared/scoped-analytics.server"
import { queryKeys } from "@/lib/cache/query-keys"
import { createQueryClient } from "@/lib/react-query/query-client"
import type { MortalityPageInitialFilters } from "@/features/mortality/queries.server"

type SearchParams = Record<string, string | string[] | undefined>

function buildScopedSystemIdList(
  filters: MortalityPageInitialFilters,
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

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const searchFarmId = typeof resolvedSearchParams.farmId === "string" ? resolvedSearchParams.farmId : null
  const initialFilters = parseMortalityPageFilters(resolvedSearchParams)
  const { farmId, farmName } = await resolveInitialFarmId(searchFarmId)
  const initialData = await getMortalityPageInitialData({
    farmId,
    filters: initialFilters,
  })
  const selectedSystemId = parseSelectedNumericId(initialFilters.selectedSystem)
  const batchId = parseSelectedNumericId(initialFilters.selectedBatch)
  const scopedSystemIds =
    initialData.systems.status === "success" && initialData.batchSystems.status === "success"
      ? buildScopedSystemIdList(initialFilters, initialData.systems.data, initialData.batchSystems.data)
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
  queryClient.setQueryData(
    queryKeys.options.systems({
      farmId,
      stage: initialFilters.selectedStage,
      activeOnly: false,
    }),
    initialData.systems,
  )
  queryClient.setQueryData(queryKeys.reports.batchSystemIds({ farmId, batchId }), initialData.batchSystems)

  if (initialData.bounds.start && initialData.bounds.end) {
    queryClient.setQueryData(
      queryKeys.mortality.events({
        farmId,
        batchId,
        dateFrom: initialData.bounds.start,
        dateTo: initialData.bounds.end,
        limit: 5000,
      }),
      initialData.events,
    )
    queryClient.setQueryData(
      queryKeys.mortality.alertLog({
        farmId,
        ruleCodes: ["MASS_MORTALITY", "ELEVATED_MORTALITY"],
        limit: 200,
      }),
      initialData.alerts,
    )
    queryClient.setQueryData(
      queryKeys.reports.survivalTrendScoped({
        systemIds: scopedSystemIds,
        dateFrom: initialData.bounds.start,
        dateTo: initialData.bounds.end,
      }),
      initialData.survival,
    )
    queryClient.setQueryData(
      queryKeys.reports.feedingRecords({
        farmId,
        systemIds: scopedSystemIds,
        batchId,
        dateFrom: initialData.bounds.start,
        dateTo: initialData.bounds.end,
        limit: 5000,
      }),
      initialData.feeding,
    )
    queryClient.setQueryData(
      queryKeys.reports.sampling({
        farmId,
        systemIds: scopedSystemIds,
        batchId,
        dateFrom: initialData.bounds.start,
        dateTo: initialData.bounds.end,
        limit: 5000,
      }),
      initialData.sampling,
    )
    queryClient.setQueryData(
      queryKeys.waterQuality.measurements({
        farmId,
        dateFrom: initialData.bounds.start,
        dateTo: initialData.bounds.end,
        limit: 8000,
      }),
      initialData.measurements,
    )
  }

  return (
    <Suspense fallback={null}>
      <QueryHydration state={dehydrate(queryClient)}>
        <PageClient initialFarmId={farmId} initialFarmName={farmName} initialFilters={initialFilters} />
      </QueryHydration>
    </Suspense>
  )
}

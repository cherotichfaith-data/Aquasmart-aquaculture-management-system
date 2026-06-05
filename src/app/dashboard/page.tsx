import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { dehydrate } from "@tanstack/react-query"
import { cookies } from "next/headers"
import DashboardPageClient from "./page.client"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { QueryHydration } from "@/components/providers/query-hydration"
import { WORKSPACE_SELECT_PATH, resolveAppEntryPath, sanitizeNextPath } from "@/lib/app-entry"
import { getDashboardPageInitialData, parseDashboardPageFilters } from "@/features/dashboard/queries.server"
import { cleanScopedFilterState, parseSelectedNumericId } from "@/features/shared/scoped-analytics.server"
import { listBatchOptionRows, listDashboardTimePeriodRows } from "@/features/shared/query-seed.server"
import { loadWorkspaceContextForUser } from "@/lib/server/workspace"
import { requireUserContext } from "@/lib/supabase/require-user"
import { queryKeys } from "@/lib/cache/query-keys"
import { createQueryClient } from "@/lib/react-query/query-client"
import { createAccessTokenClient } from "@/lib/supabase/server"
import { ACTIVE_FARM_COOKIE, ACTIVE_ORGANIZATION_COOKIE, normalizeContextValue } from "@/lib/context"
import { toQuerySuccess } from "@/lib/api/_utils"

export const metadata: Metadata = {
  title: "Dashboard | AquaSmart",
  description: "Farm operations dashboard for AquaSmart.",
}

type SearchParams = Record<string, string | string[] | undefined>

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const routeSearchParams = new URLSearchParams()

  Object.entries(resolvedSearchParams).forEach(([key, value]) => {
    if (typeof value === "string") {
      routeSearchParams.set(key, value)
    }
  })

  const currentPath = sanitizeNextPath(
    `/dashboard${routeSearchParams.size > 0 ? `?${routeSearchParams.toString()}` : ""}`,
    "/dashboard",
  )

  const { user: contextUser, accessToken } = await requireUserContext(currentPath)
  const analyticsSupabase = createAccessTokenClient(accessToken)
  const searchFarmId = typeof resolvedSearchParams.farmId === "string" ? resolvedSearchParams.farmId : null
  const initialFilters = parseDashboardPageFilters(resolvedSearchParams)
  const cookieStore = await cookies()
  const cookieOrganizationId = normalizeContextValue(cookieStore.get(ACTIVE_ORGANIZATION_COOKIE)?.value)
  const cookieFarmId = normalizeContextValue(cookieStore.get(ACTIVE_FARM_COOKIE)?.value)
  const requestedFarmId = normalizeContextValue(searchFarmId) ?? cookieFarmId

  const workspaceContext = await loadWorkspaceContextForUser({
    userId: contextUser.id,
    accessToken,
    requestedFarmId,
    cookieOrganizationId,
    cookieFarmId,
  })

  const farmId = workspaceContext.farm?.id ?? null

  if (!farmId) {
    redirect(`${WORKSPACE_SELECT_PATH}?next=${encodeURIComponent(currentPath)}`)
  }

  if (!workspaceContext.role) {
    redirect("/unauthorized")
  }

  const entryPath = resolveAppEntryPath(workspaceContext.role as Parameters<typeof resolveAppEntryPath>[0])
  if (entryPath !== "/dashboard") {
    redirect(entryPath)
  }

  const initialData = await getDashboardPageInitialData({
    farmId,
    filters: initialFilters,
    accessToken,
  })
  const effectiveFilters =
    initialData.systemOptions.status === "success"
      ? cleanScopedFilterState(initialFilters, initialData.systemOptions.data)
      : initialFilters
  const [batchOptions, timePeriodOptions] = await Promise.all([
    listBatchOptionRows(analyticsSupabase, { farmId }),
    listDashboardTimePeriodRows(analyticsSupabase),
  ])
  const { data: farmRow } = await analyticsSupabase.from("farm").select("name").eq("id", farmId).maybeSingle()
  const initialFarmName = farmRow?.name ?? null
  const selectedSystemId = parseSelectedNumericId(effectiveFilters.selectedSystem)
  const batchId = parseSelectedNumericId(effectiveFilters.selectedBatch)
  const queryClient = createQueryClient()

  if (initialData.bounds.start && initialData.bounds.end) {
    queryClient.setQueryData(
      queryKeys.timePeriodBounds({
        farmId,
        timePeriod: effectiveFilters.timePeriod,
        systemId: undefined,
        scope: "dashboard",
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
  queryClient.setQueryData(
    queryKeys.options.systems({
      farmId,
      activeOnly: true,
    }),
    toQuerySuccess(
      initialData.systemOptions.status === "success"
        ? initialData.systemOptions.data.filter((row) => row.is_active !== false)
        : [],
    ),
  )
  queryClient.setQueryData(queryKeys.options.batches({ farmId }), toQuerySuccess(batchOptions))
  queryClient.setQueryData(queryKeys.options.timePeriods(), toQuerySuccess(timePeriodOptions))
  queryClient.setQueryData(queryKeys.reports.batchSystemIds({ farmId, batchId }), initialData.batchSystems)
  queryClient.setQueryData(queryKeys.farmUserRole(farmId, contextUser.id), workspaceContext.role)

  if (initialData.bounds.start && initialData.bounds.end) {
    queryClient.setQueryData(
      queryKeys.dashboard.kpiOverview({
        farmId,
        stage: effectiveFilters.selectedStage,
        timePeriod: effectiveFilters.timePeriod,
        batch: effectiveFilters.selectedBatch,
        system: effectiveFilters.selectedSystem,
        dateFrom: initialData.bounds.start,
        dateTo: initialData.bounds.end,
      }),
      initialData.kpiOverview,
    )
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
      queryKeys.dashboard.recommendedActions({
        farmId,
        stage: effectiveFilters.selectedStage,
        batch: effectiveFilters.selectedBatch,
        system: effectiveFilters.selectedSystem,
        timePeriod: effectiveFilters.timePeriod,
        dateFrom: initialData.bounds.start,
        dateTo: initialData.bounds.end,
      }),
      initialData.recommendedActions,
    )
    queryClient.setQueryData(
      queryKeys.waterQuality.measurements({
        farmId,
        systemId: selectedSystemId,
        dateFrom: initialData.bounds.start,
        dateTo: initialData.bounds.end,
        limit: 2000,
      }),
      initialData.waterQualityMeasurements,
    )
  }

  return (
    <QueryHydration state={dehydrate(queryClient)}>
      <DashboardLayout initialFarmId={farmId} initialFarmName={initialFarmName}>
        <DashboardPageClient
          initialFarmId={farmId}
          initialFarmName={initialFarmName}
          initialFilters={effectiveFilters}
        />
      </DashboardLayout>
    </QueryHydration>
  )
}

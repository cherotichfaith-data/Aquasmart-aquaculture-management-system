"use client"

import { useEffect, useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { DataErrorState, EmptyState } from "@/components/shared/data-states"
import { FeedManagementDashboard } from "@/features/feed/components/feed-management-dashboard"
import { useAnalyticsPageBootstrap } from "@/lib/hooks/app/use-analytics-page-bootstrap"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useFeedDashboardKpis, useFeedEfcrTrend, useFeedPlanVsActual, useFeedVsBiomassGain, useFeedingAlerts, useFeedingRateVsTarget, useFeedingResponseDistribution, useSystemFeedStatus } from "@/features/feed/analytics-hooks"
import { useScopedSystemIds } from "@/lib/hooks/use-scoped-system-ids"
import { useSystemOptions } from "@/lib/hooks/use-options"
import { getErrorMessage, getQueryResultError } from "@/lib/utils/query-result"
import { normalizeStageFilter } from "@/lib/stage-filter"
import { getSystemFilterUrlValue, resolveSystemIdFromFilterValue } from "@/lib/system-options"
import { resolveTimePeriod, toTimePeriodUrlValue } from "@/lib/time-period"
import type { FeedDashboardFilters } from "@/features/feed/types"

export default function FeedPageClient({
  initialFarmId,
  initialFarmName,
  initialFilters,
}: {
  initialFarmId?: string | null
  initialFarmName?: string | null
  initialFilters?: FeedDashboardFilters
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { isLoading: authLoading } = useAuth()
  const activeFarm = useActiveFarm({ initialFarmId, initialFarmName })
  const currentFarmId = activeFarm.farmId ?? initialFarmId ?? null
  const periodParam = searchParams.get("period")
  const systemParam = searchParams.get("cage") ?? searchParams.get("system")
  const batchParam = searchParams.get("batch")
  const stageParam = searchParams.get("stage")
  const filterSystemsQuery = useSystemOptions({ farmId: currentFarmId, activeOnly: false })
  const filterSystemOptions = useMemo(
    () => (filterSystemsQuery.data?.status === "success" ? filterSystemsQuery.data.data : []),
    [filterSystemsQuery.data],
  )
  const selectedSystemUrlValue = useMemo(() => {
    const systemId = resolveSystemIdFromFilterValue(systemParam, filterSystemOptions)
    if (systemId == null) return systemParam ?? undefined
    return getSystemFilterUrlValue(filterSystemOptions.find((system) => system.id === systemId)) || (systemParam ?? undefined)
  }, [filterSystemOptions, systemParam])

  const filterOverrides = useMemo(() => {
    const selectedSystemId = resolveSystemIdFromFilterValue(systemParam ?? "all", filterSystemOptions)
    return {
      selectedBatch: batchParam ?? "all",
      selectedSystem: selectedSystemId != null ? String(selectedSystemId) : systemParam ?? "all",
      selectedStage: normalizeStageFilter(stageParam),
      timePeriod: resolveTimePeriod(periodParam, initialFilters?.timePeriod ?? "month"),
    }
  }, [batchParam, filterSystemOptions, initialFilters?.timePeriod, periodParam, stageParam, systemParam])

  const filterUrlValues = useMemo(() => {
    const timePeriodValue = toTimePeriodUrlValue(filterOverrides.timePeriod)
    if (selectedSystemUrlValue && selectedSystemUrlValue !== "all") {
      return { selectedSystem: selectedSystemUrlValue, timePeriod: timePeriodValue }
    }
    return { timePeriod: timePeriodValue }
  }, [filterOverrides.timePeriod, selectedSystemUrlValue])

  const {
    farmId,
    selectedBatch,
    selectedSystem,
    selectedStage,
    dateFrom,
    dateTo,
    boundsQuery,
    boundsReady,
  } = useAnalyticsPageBootstrap({
    initialFarmId,
    initialFarmName,
    defaultTimePeriod: initialFilters?.timePeriod ?? "month",
    initialFilters,
    filterOverrides,
    filterUrlValues,
    boundsScope: "feeding",
  })

  const {
    selectedSystemId,
    scopedSystemIdList,
    hasScopeFilters,
    systemsQuery,
    batchSystemsQuery,
  } = useScopedSystemIds({
    farmId,
    selectedStage,
    selectedBatch,
    selectedSystem,
    activeOnly: false,
    enabled: boundsReady,
  })

  useEffect(() => {
    if (selectedSystem === "all" || selectedSystemId != null) return
    const params = new URLSearchParams(searchParams.toString())
    if ((params.get("cage") ?? params.get("system")) !== selectedSystem) return
    params.delete("system")
    params.delete("cage")
    const nextQuery = params.toString()
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname)
  }, [pathname, router, searchParams, selectedSystem, selectedSystemId])

  const scopeQueriesLoading =
    filterSystemsQuery.isLoading ||
    systemsQuery.isLoading ||
    batchSystemsQuery.isLoading

  const effectiveSystemIds = useMemo(() => {
    if (scopedSystemIdList.length > 0) return scopedSystemIdList
    return hasScopeFilters ? [] : undefined
  }, [hasScopeFilters, scopedSystemIdList])

  const enabled =
    boundsReady &&
    Boolean(farmId) &&
    !scopeQueriesLoading &&
    (!hasScopeFilters || scopedSystemIdList.length > 0)

  const scopedParams = useMemo(
    () => ({
      farmId,
      systemIds: effectiveSystemIds,
      dateFrom,
      dateTo,
      enabled,
    }),
    [dateFrom, dateTo, effectiveSystemIds, enabled, farmId],
  )

  const kpisQuery = useFeedDashboardKpis(scopedParams)
  const planQuery = useFeedPlanVsActual(scopedParams)
  const statusQuery = useSystemFeedStatus(scopedParams)
  const efcrQuery = useFeedEfcrTrend(scopedParams)
  const rateQuery = useFeedingRateVsTarget(scopedParams)
  const responseQuery = useFeedingResponseDistribution(scopedParams)
  const scatterQuery = useFeedVsBiomassGain(scopedParams)
  const alertsQuery = useFeedingAlerts(scopedParams)

  const kpiRow = kpisQuery.data?.status === "success" ? kpisQuery.data.data[0] ?? null : null
  const planRows = planQuery.data?.status === "success" ? planQuery.data.data : []
  const statusRows = statusQuery.data?.status === "success" ? statusQuery.data.data : []
  const efcrRows = efcrQuery.data?.status === "success" ? efcrQuery.data.data : []
  const rateRows = rateQuery.data?.status === "success" ? rateQuery.data.data : []
  const responseRows = responseQuery.data?.status === "success" ? responseQuery.data.data : []
  const scatterRows = scatterQuery.data?.status === "success" ? scatterQuery.data.data : []
  const alertRows = alertsQuery.data?.status === "success" ? alertsQuery.data.data : []

  const errorMessages = [
    getErrorMessage(boundsQuery.error),
    getErrorMessage(filterSystemsQuery.error),
    getQueryResultError(filterSystemsQuery.data),
    getErrorMessage(systemsQuery.error),
    getQueryResultError(systemsQuery.data),
    getErrorMessage(batchSystemsQuery.error),
    getQueryResultError(batchSystemsQuery.data),
    getErrorMessage(kpisQuery.error),
    getQueryResultError(kpisQuery.data),
    getErrorMessage(planQuery.error),
    getQueryResultError(planQuery.data),
    getErrorMessage(statusQuery.error),
    getQueryResultError(statusQuery.data),
    getErrorMessage(efcrQuery.error),
    getQueryResultError(efcrQuery.data),
    getErrorMessage(rateQuery.error),
    getQueryResultError(rateQuery.data),
    getErrorMessage(responseQuery.error),
    getQueryResultError(responseQuery.data),
    getErrorMessage(scatterQuery.error),
    getQueryResultError(scatterQuery.data),
    getErrorMessage(alertsQuery.error),
    getQueryResultError(alertsQuery.data),
  ].filter(Boolean) as string[]

  const pageBootstrapping =
    authLoading ||
    boundsQuery.isLoading ||
    filterSystemsQuery.isLoading ||
    systemsQuery.isLoading ||
    batchSystemsQuery.isLoading

  const showEmptyScopeState =
    boundsReady &&
    Boolean(farmId) &&
    !scopeQueriesLoading &&
    hasScopeFilters &&
    scopedSystemIdList.length === 0 &&
    errorMessages.length === 0

  const showNoBoundsState =
    !authLoading &&
    !boundsQuery.isLoading &&
    !boundsReady &&
    Boolean(farmId) &&
    errorMessages.length === 0

  return (
    <DashboardLayout initialFarmId={initialFarmId} initialFarmName={initialFarmName}>
      <div className="space-y-6">
        {errorMessages.length > 0 ? (
          <DataErrorState
            title="Unable to load feed management data"
            description={errorMessages[0]}
            onRetry={() => {
              filterSystemsQuery.refetch()
              systemsQuery.refetch()
              batchSystemsQuery.refetch()
              kpisQuery.refetch()
              planQuery.refetch()
              statusQuery.refetch()
              efcrQuery.refetch()
              rateQuery.refetch()
              responseQuery.refetch()
              scatterQuery.refetch()
              alertsQuery.refetch()
            }}
          />
        ) : null}
        {showEmptyScopeState ? (
          <EmptyState
            title="No systems found in the current feed scope"
            description="Adjust the farm, batch, stage, system, or date filters to load feed-management data."
          />
        ) : showNoBoundsState ? (
          <EmptyState
            title="No feed time window available"
            description="No feed-management records were available to resolve the selected time period."
          />
        ) : (
          <FeedManagementDashboard
            kpiRow={kpiRow}
            planRows={planRows}
            statusRows={statusRows}
            efcrRows={efcrRows}
            rateRows={rateRows}
            responseRows={responseRows}
            scatterRows={scatterRows}
            alertRows={alertRows}
            kpiLoading={pageBootstrapping || kpisQuery.isLoading}
            planLoading={pageBootstrapping || planQuery.isLoading}
            statusLoading={pageBootstrapping || statusQuery.isLoading}
            efcrLoading={pageBootstrapping || efcrQuery.isLoading}
            rateLoading={pageBootstrapping || rateQuery.isLoading}
            responseLoading={pageBootstrapping || responseQuery.isLoading}
            scatterLoading={pageBootstrapping || scatterQuery.isLoading}
            alertsLoading={pageBootstrapping || alertsQuery.isLoading}
          />
        )}
      </div>
    </DashboardLayout>
  )
}

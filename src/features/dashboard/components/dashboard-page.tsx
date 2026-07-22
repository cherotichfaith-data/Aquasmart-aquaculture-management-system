"use client"

import { useEffect, useMemo, type ReactNode } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"

import type { DashboardPageInitialFilters } from "@/features/dashboard/types"
import { useAnalyticsPageBootstrap } from "@/lib/hooks/app/use-analytics-page-bootstrap"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { useScopedSystemIds } from "@/lib/hooks/use-scoped-system-ids"
import { useSystemOptions } from "@/lib/hooks/use-options"
import { getSystemFilterUrlValue, resolveSystemIdFromFilterValue } from "@/lib/system-options"
import { resolveTimePeriod, toTimePeriodUrlValue } from "@/lib/time-period"
import { getErrorMessage } from "@/lib/utils/query-result"

import KPIOverview from "./kpi-overview"
import SystemsTable from "./systems-table"
import { parseDashboardStageParam } from "./dashboard-page-utils"
import { useKpiOverview, useSystemsTable } from "@/features/dashboard/hooks"

function SectionLabel({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1 }}>
      <Box>
        <Typography variant="body1" sx={{ fontSize: "0.9375rem", fontWeight: 600, letterSpacing: "-0.01em" }}>
          {title}
        </Typography>
        {description ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.125 }}>
            {description}
          </Typography>
        ) : null}
      </Box>
      {action ? <Box>{action}</Box> : null}
    </Box>
  )
}

export default function DashboardPage({
  initialFarmId,
  initialFarmName,
  initialFilters,
}: {
  initialFarmId?: string | null
  initialFarmName?: string | null
  initialFilters?: DashboardPageInitialFilters
}) {
  const debugEnabled = process.env.NEXT_PUBLIC_DEBUG === "true"
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeFarm = useActiveFarm({ initialFarmId, initialFarmName })
  const currentFarmId = activeFarm.farmId ?? initialFarmId ?? null
  const periodParam = searchParams.get("period")
  const systemParam = searchParams.get("cage") ?? searchParams.get("system")
  const batchParam = searchParams.get("batch")
  const stageParam = searchParams.get("stage")
  const systemOptionsQuery = useSystemOptions({
    farmId: currentFarmId,
    activeOnly: true,
  })
  const systemOptions = useMemo(
    () => (systemOptionsQuery.data?.status === "success" ? systemOptionsQuery.data.data : []),
    [systemOptionsQuery.data],
  )
  const selectedSystemUrlValue = useMemo(() => {
    const systemId = resolveSystemIdFromFilterValue(systemParam, systemOptions)
    if (systemId == null) return systemParam ?? undefined
    return getSystemFilterUrlValue(systemOptions.find((system) => system.id === systemId)) || (systemParam ?? undefined)
  }, [systemOptions, systemParam])

  const filterOverrides = useMemo(
    () => {
      const systemId = resolveSystemIdFromFilterValue(systemParam, systemOptions)

      return {
        selectedBatch: batchParam ?? "all",
        selectedSystem: systemId != null ? String(systemId) : systemParam ?? "all",
        selectedStage: parseDashboardStageParam(stageParam),
        timePeriod: resolveTimePeriod(periodParam, initialFilters?.timePeriod ?? "month"),
      }
    },
    [batchParam, initialFilters?.timePeriod, periodParam, stageParam, systemOptions, systemParam],
  )

  const {
    farmId,
    selectedBatch,
    selectedSystem,
    selectedStage,
    timePeriod,
    dateFrom,
    dateTo,
  } = useAnalyticsPageBootstrap({
    initialFarmId,
    initialFarmName,
    defaultTimePeriod: initialFilters?.timePeriod ?? "month",
    boundsScope: "dashboard",
    useSystemBounds: false,
    initialFilters,
    filterOverrides,
    filterUrlValues:
      selectedSystemUrlValue && selectedSystemUrlValue !== "all"
        ? { selectedSystem: selectedSystemUrlValue, timePeriod: toTimePeriodUrlValue(filterOverrides.timePeriod ?? "month") }
        : { timePeriod: toTimePeriodUrlValue(filterOverrides.timePeriod ?? "month") },
  })

  const { selectedSystemId, scopedSystemIdList, hasScopeFilters } = useScopedSystemIds({
    farmId,
    selectedStage,
    selectedBatch,
    selectedSystem,
  })
  const numericSelectedSystemId =
    selectedSystem !== "all" && Number.isFinite(Number(selectedSystem)) ? Number(selectedSystem) : null
  const resolvedSelectedSystemScopeId = selectedSystemId ?? numericSelectedSystemId
  const resolvedScopedSystemIdList = useMemo(
    () =>
      resolvedSelectedSystemScopeId != null
        ? [resolvedSelectedSystemScopeId]
        : scopedSystemIdList,
    [resolvedSelectedSystemScopeId, scopedSystemIdList],
  )
  const shouldApplySystemIdScope = hasScopeFilters
  const appliedScopedSystemIds = shouldApplySystemIdScope ? resolvedScopedSystemIdList : null
  useEffect(() => {
    if (selectedSystem === "all" || selectedSystemId != null) return
    const params = new URLSearchParams(searchParams.toString())
    if ((params.get("cage") ?? params.get("system")) !== selectedSystem) return
    params.delete("system")
    params.delete("cage")
    const nextQuery = params.toString()
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname)
  }, [pathname, router, searchParams, selectedSystem, selectedSystemId])

  useEffect(() => {
    if (!debugEnabled) return
    console.debug("[dashboard][client]", {
      farmId,
      dateFrom,
      dateTo,
      selectedStage,
      selectedBatch,
      selectedSystem,
      selectedSystemId,
      numericSelectedSystemId,
      resolvedSelectedSystemScopeId,
      scopedSystemIdList,
      resolvedScopedSystemIdList,
      hasScopeFilters,
      shouldApplySystemIdScope,
      appliedScopedSystemIds,
    })
  }, [
    appliedScopedSystemIds,
    dateFrom,
    dateTo,
    debugEnabled,
    farmId,
    hasScopeFilters,
    numericSelectedSystemId,
    resolvedSelectedSystemScopeId,
    resolvedScopedSystemIdList,
    scopedSystemIdList,
    selectedBatch,
    selectedStage,
    selectedSystem,
    selectedSystemId,
    shouldApplySystemIdScope,
  ])

  const kpiQuery = useKpiOverview({
    farmId,
    stage: selectedStage,
    timePeriod,
    batch: selectedBatch,
    system: selectedSystem,
    scopedSystemIds: appliedScopedSystemIds,
    dateFrom: dateFrom ?? null,
    dateTo: dateTo ?? null,
  })

  const systemsQuery = useSystemsTable({
    farmId,
    stage: selectedStage,
    batch: selectedBatch,
    system: selectedSystem,
    timePeriod,
    dateFrom: dateFrom ?? null,
    dateTo: dateTo ?? null,
    includeIncomplete: true,
    scopedSystemIds: appliedScopedSystemIds,
  })

  if (!farmId) return <Box sx={{ minHeight: "60vh" }} />

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 }, display: "flex", flexDirection: "column", gap: 2 }}>
      <section>
        <SectionLabel title="Core Performance Overview" />
        <KPIOverview
          metrics={kpiQuery.data?.metrics ?? []}
          isLoading={!dateFrom || !dateTo || kpiQuery.isLoading}
          isFetching={kpiQuery.isFetching}
          isError={kpiQuery.isError}
          errorMessage={getErrorMessage(kpiQuery.error)}
          onRetry={() => kpiQuery.refetch()}
          stage={selectedStage}
          timePeriod={timePeriod}
          batch={selectedBatch}
          system={selectedSystem}
        />
      </section>

      <section>
        <SectionLabel title="Production" />
        <SystemsTable
          rows={systemsQuery.data?.rows ?? []}
          isLoading={!dateFrom || !dateTo || systemsQuery.isLoading}
          isFetching={systemsQuery.isFetching}
          isError={systemsQuery.isError}
          errorMessage={getErrorMessage(systemsQuery.error)}
          emptyReason={systemsQuery.data?.meta.reason ?? null}
          updatedAt={systemsQuery.dataUpdatedAt}
          onRetry={() => systemsQuery.refetch()}
          stage={selectedStage}
          batch={selectedBatch}
          timePeriod={timePeriod}
          farmId={farmId}
          showHeader={false}
        />
      </section>
    </Box>
  )
}

"use client"

import { useEffect, useMemo, type ReactNode } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import Box from "@mui/material/Box"
import Grid from "@mui/material/Grid"
import Typography from "@mui/material/Typography"

import type { DashboardPageInitialFilters } from "@/features/dashboard/types"
import { useAnalyticsPageBootstrap } from "@/lib/hooks/app/use-analytics-page-bootstrap"
import { useScopedSystemIds } from "@/lib/hooks/use-scoped-system-ids"
import { useSystemOptions } from "@/lib/hooks/use-options"
import { getSystemFilterUrlValue, resolveSystemIdFromFilterValue } from "@/lib/system-options"
import { resolveTimePeriod, toTimePeriodUrlValue } from "@/lib/time-period"

import KPIOverview from "./kpi-overview"
import SystemsTable from "./systems-table"
import RecommendedActions from "./recommended-actions"
import FeedInputByPeriod from "./feed-input-by-period"
import FeedingResponseDonut from "./feeding-response-donut"
import { parseDashboardStageParam } from "./dashboard-page-utils"

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
  const periodParam = searchParams.get("period")
  const systemParam = searchParams.get("cage") ?? searchParams.get("system")
  const batchParam = searchParams.get("batch")
  const stageParam = searchParams.get("stage")
  const systemsQuery = useSystemOptions({
    farmId: initialFarmId,
    activeOnly: true,
  })
  const systemOptions = systemsQuery.data?.status === "success" ? systemsQuery.data.data : []
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
  const resolvedScopedSystemIdList =
    selectedSystemId != null
      ? [selectedSystemId]
      : numericSelectedSystemId != null
        ? [numericSelectedSystemId]
        : scopedSystemIdList
  const shouldApplySystemIdScope = selectedBatch !== "all" || numericSelectedSystemId != null
  const appliedScopedSystemIds = shouldApplySystemIdScope ? resolvedScopedSystemIdList : null
  const activeProductionSystemIds = resolvedScopedSystemIdList.length > 0 ? resolvedScopedSystemIdList : null

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
    resolvedScopedSystemIdList,
    scopedSystemIdList,
    selectedBatch,
    selectedStage,
    selectedSystem,
    selectedSystemId,
    shouldApplySystemIdScope,
  ])

  if (!farmId) return <Box sx={{ minHeight: "60vh" }} />

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 }, display: "flex", flexDirection: "column", gap: 2 }}>
      <section>
        <SectionLabel title="Core Performance Overview" />
        <KPIOverview
          farmId={farmId}
          stage={selectedStage}
          timePeriod={timePeriod}
          dateFrom={dateFrom}
          dateTo={dateTo}
          batch={selectedBatch}
          system={selectedSystem}
          scopedSystemIds={appliedScopedSystemIds}
        />
      </section>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <FeedInputByPeriod
            farmId={farmId}
            batch={selectedBatch}
            timePeriod={timePeriod}
            dateFrom={dateFrom}
            dateTo={dateTo}
            scopedSystemIds={activeProductionSystemIds}
            mode="daily"
          />
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <FeedingResponseDonut
            farmId={farmId}
            batch={selectedBatch}
            dateFrom={dateFrom}
            dateTo={dateTo}
            scopedSystemIds={activeProductionSystemIds}
          />
        </Grid>
      </Grid>

      <section>
        <SectionLabel title="Production" />
        <SystemsTable
          farmId={farmId}
          stage={selectedStage}
          batch={selectedBatch}
          system={selectedSystem}
          timePeriod={timePeriod}
          dateFrom={dateFrom}
          dateTo={dateTo}
          scopedSystemIds={appliedScopedSystemIds}
          showHeader={false}
        />
      </section>

      <section className="space-y-0">
        <SectionLabel title="Recommended Actions" />
        <RecommendedActions
          farmId={farmId}
          stage={selectedStage}
          batch={selectedBatch}
          system={selectedSystem}
          timePeriod={timePeriod}
          dateFrom={dateFrom}
          dateTo={dateTo}
          scopedSystemIds={appliedScopedSystemIds}
          maxItems={5}
          showHeader={false}
        />
      </section>
    </Box>
  )
}

"use client"

import { useEffect, useMemo, type ReactNode } from "react"
import { useSearchParams } from "next/navigation"
import Box from "@mui/material/Box"
import Grid from "@mui/material/Grid"
import Typography from "@mui/material/Typography"

import type { DashboardPageInitialFilters } from "@/features/dashboard/types"
import { useAnalyticsPageBootstrap } from "@/lib/hooks/app/use-analytics-page-bootstrap"
import { useScopedSystemIds } from "@/lib/hooks/use-scoped-system-ids"
import { logSbError } from "@/lib/supabase/log"
import { resolveTimePeriod } from "@/lib/time-period"

import KPIOverview from "./kpi-overview"
import PopulationOverview from "./population-overview"
import SystemsTable from "./systems-table"
import RecentActivities from "./recent-activities"
import WaterQualityIndex from "./water-quality-index"
import RecommendedActions from "./recommended-actions"
import SystemHealthOverview from "./system-health-overview"
import { DashboardExportButton } from "./dashboard-export-button"
import { downloadDashboardSummary, parseDashboardStageParam } from "./dashboard-page-utils"

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
  const searchParams = useSearchParams()
  const periodParam = searchParams.get("period")
  const systemParam = searchParams.get("system")
  const batchParam = searchParams.get("batch")
  const stageParam = searchParams.get("stage")

  const filterOverrides = useMemo(
    () => ({
      selectedBatch: batchParam ?? "all",
      selectedSystem: systemParam ?? "all",
      selectedStage: parseDashboardStageParam(stageParam),
      timePeriod: resolveTimePeriod(periodParam, initialFilters?.timePeriod ?? "month"),
    }),
    [batchParam, initialFilters?.timePeriod, periodParam, stageParam, systemParam],
  )

  const {
    farmId,
    selectedBatch,
    selectedSystem,
    selectedStage,
    timePeriod,
    dateFrom,
    dateTo,
    setTimePeriod,
  } = useAnalyticsPageBootstrap({
    initialFarmId,
    initialFarmName,
    defaultTimePeriod: initialFilters?.timePeriod ?? "month",
    boundsScope: "dashboard",
    initialFilters,
    filterOverrides,
  })

  const { selectedSystemId, scopedSystemIdList, hasScopeFilters } = useScopedSystemIds({
    farmId,
    selectedStage,
    selectedBatch,
    selectedSystem,
  })
  const appliedScopedSystemIds = hasScopeFilters ? scopedSystemIdList : null

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
      scopedSystemIdList,
      hasScopeFilters,
      appliedScopedSystemIds,
    })
  }, [
    appliedScopedSystemIds,
    dateFrom,
    dateTo,
    debugEnabled,
    farmId,
    hasScopeFilters,
    scopedSystemIdList,
    selectedBatch,
    selectedStage,
    selectedSystem,
    selectedSystemId,
  ])

  const handleDownload = async () => {
    try {
      await downloadDashboardSummary({ farmId, selectedSystem, selectedStage, dateFrom, dateTo })
    } catch (error) {
      logSbError("dashboard:download", error)
    }
  }

  if (!farmId) return <Box sx={{ minHeight: "60vh" }} />

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 }, display: "flex", flexDirection: "column", gap: 2 }}>
      <section>
        <SectionLabel title="Core Performance Overview" action={<DashboardExportButton onClick={handleDownload} />} />
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
          <SectionLabel title="System Health" />
          <SystemHealthOverview farmId={farmId} systemId={selectedSystemId} />
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <SectionLabel title="Water Quality Index" />
          <WaterQualityIndex
            farmId={farmId}
            stage={selectedStage}
            batch={selectedBatch}
            system={selectedSystem}
            dateFrom={dateFrom}
            dateTo={dateTo}
            scopedSystemIds={appliedScopedSystemIds}
            resolvedSystemId={selectedSystemId}
          />
        </Grid>
      </Grid>

      <section>
        <SectionLabel title="Feed, Growth & Mortality Trends" />
        <PopulationOverview
          farmId={farmId}
          stage={selectedStage}
          batch={selectedBatch}
          system={selectedSystem}
          timePeriod={timePeriod}
          scopedSystemIds={appliedScopedSystemIds}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onTimePeriodChange={setTimePeriod}
          showHeaderTitle={false}
          showUpdatedAt={false}
        />
      </section>

      <section>
        <SectionLabel
          title="System Status"
        />
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

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <section className="space-y-0">
            <SectionLabel title="Recent Activity" />
            <RecentActivities
              farmId={farmId}
              batch={selectedBatch}
              stage={selectedStage}
              system={selectedSystem}
              dateFrom={dateFrom}
              dateTo={dateTo}
              title="Recent Activity"
              countLabel="entries"
              maxItems={5}
              showHeader={false}
            />
          </section>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
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
        </Grid>
      </Grid>
    </Box>
  )
}

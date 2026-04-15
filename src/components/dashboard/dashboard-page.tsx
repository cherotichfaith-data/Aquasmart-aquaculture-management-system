"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import type { DashboardPageInitialData, DashboardPageInitialFilters } from "@/features/dashboard/types"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { useAnalyticsPageBootstrap } from "@/lib/hooks/app/use-analytics-page-bootstrap"
import { useScopedSystemIds } from "@/lib/hooks/use-scoped-system-ids"
import KPIOverview from "@/components/dashboard/kpi-overview"
import PopulationOverview from "@/components/dashboard/population-overview"
import SystemsTable from "@/components/dashboard/systems-table"
import RecentActivities from "@/components/dashboard/recent-activities"
import WaterQualityIndex from "@/components/dashboard/water-quality-index"
import RecommendedActions from "@/components/dashboard/recommended-actions"
import ProductionSummaryMetrics from "@/components/dashboard/production-summary-metrics"
import { logSbError } from "@/lib/supabase/log"
import { resolveTimePeriod } from "@/lib/time-period"
import { DashboardExportButton } from "./dashboard-export-button"
import { SectionHeading } from "@/components/shared/section-heading"
import {
  downloadDashboardSummary,
  parseDashboardStageParam,
} from "./dashboard-page-utils"

export default function DashboardPage({
  initialFarmId,
  initialFilters,
  initialData,
}: {
  initialFarmId?: string | null
  initialFilters?: DashboardPageInitialFilters
  initialData?: DashboardPageInitialData
}) {
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
      timePeriod: resolveTimePeriod(periodParam, initialFilters?.timePeriod ?? "2 weeks"),
    }),
    [batchParam, initialFilters?.timePeriod, periodParam, stageParam, systemParam],
  )
  const { farmId, selectedBatch, selectedSystem, selectedStage, timePeriod, dateFrom, dateTo } =
    useAnalyticsPageBootstrap({
      initialFarmId,
      defaultTimePeriod: initialFilters?.timePeriod ?? "2 weeks",
      boundsScope: "dashboard",
      initialFilters,
      filterOverrides,
      initialBounds: initialData?.bounds,
    })
  const { selectedSystemId, scopedSystemIdList, hasScopeFilters } = useScopedSystemIds({
    farmId,
    selectedStage,
    selectedBatch,
    selectedSystem,
    initialSystemsData: initialData?.systemOptions,
    initialBatchSystemsData: initialData?.batchSystems,
  })
  const appliedScopedSystemIds = hasScopeFilters ? scopedSystemIdList : null

  const handleDownload = async () => {
    try {
      await downloadDashboardSummary({
        farmId,
        selectedSystem,
        selectedStage,
        dateFrom,
        dateTo,
      })
    } catch (error) {
      logSbError("dashboard:download", error)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="space-y-4">
          <SectionHeading title="Core Performance Overview" actions={<DashboardExportButton onClick={handleDownload} />} />
          <KPIOverview
            farmId={farmId}
            stage={selectedStage}
            timePeriod={timePeriod}
            dateFrom={dateFrom}
            dateTo={dateTo}
            batch={selectedBatch}
            system={selectedSystem}
            scopedSystemIds={appliedScopedSystemIds}
            initialData={initialData?.kpiOverview}
          />
        </section>

        <section className="space-y-4">
          <SectionHeading
            title="Feed Efficiency and Water Quality Monitoring"
            description="Trends for production, efficiency, and water quality health."
          />
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <PopulationOverview
              farmId={farmId}
              stage={selectedStage}
              batch={selectedBatch}
              system={selectedSystem}
              timePeriod={timePeriod}
              scopedSystemIds={appliedScopedSystemIds}
              dateFrom={dateFrom}
              dateTo={dateTo}
              initialData={initialData?.productionTrend}
              initialBounds={initialData?.bounds}
            />
            <WaterQualityIndex
              farmId={farmId}
              stage={selectedStage}
              batch={selectedBatch}
              system={selectedSystem}
              dateFrom={dateFrom}
              dateTo={dateTo}
              scopedSystemIds={appliedScopedSystemIds}
              resolvedSystemId={selectedSystemId}
              initialSystemsData={initialData?.systemOptions}
              initialBatchSystemsData={initialData?.batchSystems}
              initialMeasurements={initialData?.waterQualityMeasurements}
              initialThresholds={initialData?.alertThresholds}
              initialBounds={initialData?.bounds}
            />
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeading
            title="System Status"
            description="Dense system table with row drilldown into unit history, exceptions, and next actions."
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
            initialData={initialData?.systemsTable}
          />
        </section>

        <section className="space-y-4">
          <SectionHeading
            title="Production Summary Metrics"
            description="Summary totals for stocked fish, mortalities, transfer adjustments, and harvest output."
          />
          <ProductionSummaryMetrics
            farmId={farmId}
            stage={selectedStage}
            batch={selectedBatch}
            system={selectedSystem}
            timePeriod={timePeriod}
            dateFrom={dateFrom}
            dateTo={dateTo}
            scopedSystemIds={appliedScopedSystemIds}
            initialData={initialData?.productionSummaryMetrics}
          />
        </section>

        <section className="space-y-4">
          <SectionHeading title="Recent Activity" description="Latest operational events and advisory timeline." />
          <RecentActivities
            farmId={farmId}
            batch={selectedBatch}
            stage={selectedStage}
            system={selectedSystem}
            title="Advisory Timeline"
            countLabel="events"
            initialEntries={initialData?.recentEntries}
            initialSystems={initialData?.systemOptions}
          />
        </section>

        <section className="space-y-4">
          <SectionHeading title="Recommended Actions" description="Supply and feed priorities based on recent activity." />
          <RecommendedActions
            farmId={farmId}
            stage={selectedStage}
            batch={selectedBatch}
            system={selectedSystem}
            timePeriod={timePeriod}
            dateFrom={dateFrom}
            dateTo={dateTo}
            scopedSystemIds={appliedScopedSystemIds}
            initialData={initialData?.recommendedActions}
            initialBounds={initialData?.bounds}
          />
        </section>
      </div>
    </DashboardLayout>
  )
}

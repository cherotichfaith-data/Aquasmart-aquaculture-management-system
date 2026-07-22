"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import RecommendedActions from "@/features/dashboard/components/recommended-actions"
import { SectionHeading } from "@/components/shared/section-heading"
import { useAnalyticsPageBootstrap } from "@/lib/hooks/app/use-analytics-page-bootstrap"
import { useScopedSystemIds } from "@/lib/hooks/use-scoped-system-ids"
import { parseDashboardStageParam } from "@/features/dashboard/components/dashboard-page-utils"
import { resolveTimePeriod } from "@/lib/time-period"

export default function ActionsPage({
  initialFarmId,
  initialFarmName,
}: {
  initialFarmId?: string | null
  initialFarmName?: string | null
}) {
  const searchParams = useSearchParams()
  const systemParam = searchParams.get("cage") ?? searchParams.get("system")
  const filterOverrides = useMemo(
    () => ({
      selectedBatch: searchParams.get("batch") ?? "all",
      selectedSystem: systemParam ?? "all",
      selectedStage: parseDashboardStageParam(searchParams.get("stage")),
      timePeriod: resolveTimePeriod(searchParams.get("period"), "month"),
    }),
    [searchParams, systemParam],
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
    defaultTimePeriod: "month",
    boundsScope: "dashboard",
    filterOverrides,
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
  const resolvedScopedSystemIdList =
    resolvedSelectedSystemScopeId != null ? [resolvedSelectedSystemScopeId] : scopedSystemIdList
  const scopedSystemIds = hasScopeFilters ? resolvedScopedSystemIdList : null

  return (
    <DashboardLayout initialFarmId={initialFarmId} initialFarmName={initialFarmName}>
      <div className="space-y-6">
        <SectionHeading
          title="Recommended Actions"
          description="All current operational priorities for the selected farm scope."
        />
        <RecommendedActions
          farmId={farmId}
          stage={selectedStage}
          batch={selectedBatch}
          system={selectedSystem}
          timePeriod={timePeriod}
          scopedSystemIds={scopedSystemIds}
          dateFrom={dateFrom}
          dateTo={dateTo}
        />
      </div>
    </DashboardLayout>
  )
}

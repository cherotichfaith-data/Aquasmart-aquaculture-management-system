"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import RecommendedActions from "@/features/dashboard/components/recommended-actions"
import { SectionHeading } from "@/components/shared/section-heading"
import { useAnalyticsPageBootstrap } from "@/lib/hooks/app/use-analytics-page-bootstrap"
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
  const filterOverrides = useMemo(
    () => ({
      selectedBatch: searchParams.get("batch") ?? "all",
      selectedSystem: searchParams.get("system") ?? "all",
      selectedStage: parseDashboardStageParam(searchParams.get("stage")),
      timePeriod: resolveTimePeriod(searchParams.get("period"), "2 weeks"),
    }),
    [searchParams],
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
    defaultTimePeriod: "2 weeks",
    boundsScope: "dashboard",
    filterOverrides,
  })

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
          dateFrom={dateFrom}
          dateTo={dateTo}
        />
      </div>
    </DashboardLayout>
  )
}

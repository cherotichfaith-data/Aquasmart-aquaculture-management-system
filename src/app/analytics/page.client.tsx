"use client"

import DashboardLayout from "@/components/layout/dashboard-layout"
import AnalyticsReport from "@/features/analytics/components/analytics-report"
import type { AnalyticsReportData } from "@/features/analytics/types"

export default function AnalyticsPage({
  initialFarmId,
  initialFarmName,
  initialFarmRole,
  data,
}: {
  initialFarmId?: string | null
  initialFarmName?: string | null
  initialFarmRole?: string | null
  data: AnalyticsReportData
}) {
  return (
    <DashboardLayout initialFarmId={initialFarmId} initialFarmName={initialFarmName} headerDataOverrides={{ role: initialFarmRole ?? null }}>
      <div className="page-shell !space-y-3 md:-mt-2">
        <AnalyticsReport data={data} />
      </div>
    </DashboardLayout>
  )
}

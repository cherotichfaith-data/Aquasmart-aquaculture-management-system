"use client"

import DashboardPage from "@/features/dashboard/components/dashboard-page"
import type { DashboardPageInitialFilters } from "@/features/dashboard/types"

export default function DashboardPageClient({
  initialFarmId,
  initialFarmName,
  initialFilters,
}: {
  initialFarmId?: string | null
  initialFarmName?: string | null
  initialFilters?: DashboardPageInitialFilters
}) {
  return (
    <DashboardPage
      initialFarmId={initialFarmId}
      initialFarmName={initialFarmName}
      initialFilters={initialFilters}
    />
  )
}

"use client"

import DashboardPage from "@/features/dashboard/components/dashboard-page"
import type { DashboardPageInitialData, DashboardPageInitialFilters } from "@/features/dashboard/types"

export default function DashboardPageClient({
  initialFarmId,
  initialFilters,
  initialData,
  renderedAt,
}: {
  initialFarmId?: string | null
  initialFilters?: DashboardPageInitialFilters
  initialData: DashboardPageInitialData
  renderedAt?: number
}) {
  return (
    <DashboardPage
      initialFarmId={initialFarmId}
      initialFilters={initialFilters}
      initialData={initialData}
      renderedAt={renderedAt}
    />
  )
}

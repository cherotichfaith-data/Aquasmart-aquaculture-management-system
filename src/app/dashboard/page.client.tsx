"use client"

import type { ReactNode as HarvestSummarySlot } from "react"

import DashboardPage from "@/features/dashboard/components/dashboard-page"
import type { DashboardPageInitialData, DashboardPageInitialFilters } from "@/features/dashboard/types"

export default function DashboardPageClient({
  initialFarmId,
  initialFilters,
  initialData,
  renderedAt,
  harvestSummary,
}: {
  initialFarmId?: string | null
  initialFilters?: DashboardPageInitialFilters
  initialData: DashboardPageInitialData
  renderedAt?: number
  harvestSummary?: HarvestSummarySlot
}) {
  return (
    <DashboardPage
      initialFarmId={initialFarmId}
      initialFilters={initialFilters}
      initialData={initialData}
      renderedAt={renderedAt}
      harvestSummary={harvestSummary}
    />
  )
}

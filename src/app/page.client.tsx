"use client"

import DashboardPage from "@/components/dashboard/dashboard-page"
import LandingPage from "@/components/marketing/landing-page"
import { useAuth } from "@/components/providers/auth-provider"
import type { DashboardPageInitialData, DashboardPageInitialFilters } from "@/features/dashboard/types"

export default function RootPageClient({
  initialView,
  initialFarmId,
  initialFilters,
  initialData,
}: {
  initialView?: "landing" | "dashboard"
  initialFarmId?: string | null
  initialFilters?: DashboardPageInitialFilters
  initialData?: DashboardPageInitialData
}) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    if (initialView === "dashboard") {
      return (
        <DashboardPage
          initialFarmId={initialFarmId}
          initialFilters={initialFilters}
          initialData={initialData}
        />
      )
    }
    if (initialView === "landing") {
      return <LandingPage />
    }
    return <div className="min-h-screen bg-background" />
  }

  if (!user) {
    return <LandingPage />
  }

  return (
    <DashboardPage
      initialFarmId={initialFarmId}
      initialFilters={initialFilters}
      initialData={initialData}
    />
  )
}

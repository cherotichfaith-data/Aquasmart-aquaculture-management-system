"use client"

import { Suspense } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import MetricsExplorer from "@/components/metrics/metrics-explorer"

export default function MetricsPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="p-6 text-center text-muted-foreground">Loading metrics...</div>}>
        <MetricsExplorer />
      </Suspense>
    </DashboardLayout>
  )
}

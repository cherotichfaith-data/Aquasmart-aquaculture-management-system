"use client"

import DashboardLayout from "@/components/layout/dashboard-layout"
import MetricsExplorer from "@/components/metrics/metrics-explorer"

export default function MetricsPage() {
  return (
    <DashboardLayout>
      <MetricsExplorer />
    </DashboardLayout>
  )
}

"use client"

import { useParams } from "next/navigation"

import DashboardLayout from "@/components/layout/dashboard-layout"
import MetricsExplorer from "@/components/metrics/metrics-explorer"

export default function MetricDetailPage() {
  const params = useParams<{ metric: string }>()

  return (
    <DashboardLayout>
      <MetricsExplorer initialMetric={params.metric} syncMetricToPath />
    </DashboardLayout>
  )
}

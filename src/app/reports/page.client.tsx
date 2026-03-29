"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import FeedingReport from "@/components/reports/feeding-report"
import PerformanceReport from "@/components/reports/performance-report"
import MortalityReport from "@/components/reports/mortality-report"
import GrowthReport from "@/components/reports/growth-report"
import WaterQualityComplianceReport from "@/components/reports/water-quality-compliance-report"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAnalyticsPageBootstrap } from "@/lib/hooks/app/use-analytics-page-bootstrap"

export default function ReportsPage() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState<string>("performance")
  const {
    farm,
    selectedBatch,
    selectedSystem,
    selectedStage,
    dateFrom: boundsStart,
    dateTo: boundsEnd,
  } = useAnalyticsPageBootstrap()
  const dateFrom = boundsStart ?? ""
  const dateTo = boundsEnd ?? ""
  const dateRange = { from: dateFrom, to: dateTo }

  useEffect(() => {
    if (!tabParam) return
    const normalized = tabParam.toLowerCase()
    const allowed = ["performance", "feeding", "mortality", "growth", "water-quality"]
    if (allowed.includes(normalized)) {
      setActiveTab(normalized)
    }
  }, [tabParam])

  const selectedSystemId = selectedSystem !== "all" ? Number(selectedSystem) : undefined
  const selectedBatchId = selectedBatch !== "all" ? Number(selectedBatch) : undefined

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="rounded-lg border border-border/80 bg-card p-4 shadow-sm">
          <div>
            <h1 className="text-3xl font-bold">Reports</h1>
            <p className="text-muted-foreground mt-1">Exports, compliance, and period summaries without inferring fake production dates.</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="overflow-x-auto pb-1">
            <TabsList className="inline-flex h-auto min-w-max flex-nowrap border border-border/80 bg-muted/60 p-1 sm:grid sm:w-full sm:max-w-4xl sm:grid-cols-5">
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="feeding">Feeding</TabsTrigger>
              <TabsTrigger value="mortality">Mortality</TabsTrigger>
              <TabsTrigger value="growth">Growth</TabsTrigger>
              <TabsTrigger value="water-quality">Water Quality</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="performance" className="mt-6">
            <PerformanceReport
              dateRange={dateRange}
              systemId={selectedSystemId}
              stage={selectedStage}
              farmName={farm?.name ?? null}
            />
          </TabsContent>

          <TabsContent value="feeding" className="mt-6">
            <FeedingReport
              dateRange={dateRange}
              systemId={selectedSystemId}
              batchId={selectedBatchId}
              farmName={farm?.name ?? null}
            />
          </TabsContent>

          <TabsContent value="mortality" className="mt-6">
            <MortalityReport
              dateRange={dateRange}
              systemId={selectedSystemId}
              batchId={selectedBatchId}
              farmName={farm?.name ?? null}
            />
          </TabsContent>

          <TabsContent value="growth" className="mt-6">
            <GrowthReport
              dateRange={dateRange}
              systemId={selectedSystemId}
              stage={selectedStage}
              farmName={farm?.name ?? null}
            />
          </TabsContent>

          <TabsContent value="water-quality" className="mt-6">
            <WaterQualityComplianceReport
              dateRange={dateRange}
              systemId={selectedSystemId}
              farmName={farm?.name ?? null}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}


"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import FeedingReport from "@/components/reports/feeding-report"
import PerformanceReport from "@/components/reports/performance-report"
import MortalityReport from "@/components/reports/mortality-report"
import GrowthReport from "@/components/reports/growth-report"
import WaterQualityComplianceReport from "@/components/reports/water-quality-compliance-report"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/app-ui/tabs"
import { useAnalyticsPageBootstrap } from "@/lib/hooks/app/use-analytics-page-bootstrap"
import type { SharedFiltersState } from "@/lib/hooks/app/use-shared-filters"

export default function ReportsPage({
  initialFarmId,
  initialFarmName,
  initialFilters,
}: {
  initialFarmId?: string | null
  initialFarmName?: string | null
  initialFilters?: Partial<SharedFiltersState>
}) {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState<string>("performance")
  const {
    farm,
    farmId,
    selectedBatch,
    selectedSystem,
    selectedStage,
    dateFrom: boundsStart,
    dateTo: boundsEnd,
    boundsQuery,
  } = useAnalyticsPageBootstrap({
    initialFarmId,
    initialFarmName,
    initialFilters,
    boundsScope: "production",
  })
  const dateFrom = boundsStart ?? ""
  const dateTo = boundsEnd ?? ""
  const dateRange = { from: dateFrom, to: dateTo, days: boundsQuery.data.resolvedDays }

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
    <DashboardLayout initialFarmId={initialFarmId} initialFarmName={initialFarmName}>
      <div className="page-shell">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="rounded-[1.35rem] bg-muted/20 p-1.5">
            <TabsList className="grid w-full grid-cols-1 gap-1 !border-0 bg-transparent p-0 !shadow-none backdrop-blur-0 sm:grid-cols-2 xl:grid-cols-5">
              <TabsTrigger
                value="performance"
                className="min-h-11 px-4 text-center leading-5 whitespace-normal !border-0 !shadow-none [aria-selected=true]:bg-card [aria-selected=true]:text-foreground [aria-selected=true]:!shadow-none"
              >
                Performance
              </TabsTrigger>
              <TabsTrigger
                value="feeding"
                className="min-h-11 px-4 text-center leading-5 whitespace-normal !border-0 !shadow-none [aria-selected=true]:bg-card [aria-selected=true]:text-foreground [aria-selected=true]:!shadow-none"
              >
                Feeding
              </TabsTrigger>
              <TabsTrigger
                value="mortality"
                className="min-h-11 px-4 text-center leading-5 whitespace-normal !border-0 !shadow-none [aria-selected=true]:bg-card [aria-selected=true]:text-foreground [aria-selected=true]:!shadow-none"
              >
                Mortality
              </TabsTrigger>
              <TabsTrigger
                value="growth"
                className="min-h-11 px-4 text-center leading-5 whitespace-normal !border-0 !shadow-none [aria-selected=true]:bg-card [aria-selected=true]:text-foreground [aria-selected=true]:!shadow-none"
              >
                Growth
              </TabsTrigger>
              <TabsTrigger
                value="water-quality"
                className="min-h-11 px-4 text-center leading-5 whitespace-normal !border-0 !shadow-none [aria-selected=true]:bg-card [aria-selected=true]:text-foreground [aria-selected=true]:!shadow-none"
              >
                Water Quality
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="performance" className="mt-5">
            <PerformanceReport
              farmId={farmId}
              dateRange={dateRange}
              systemId={selectedSystemId}
              stage={selectedStage}
              farmName={farm?.name ?? null}
            />
          </TabsContent>

          <TabsContent value="feeding" className="mt-5">
            <FeedingReport
              farmId={farmId}
              dateRange={dateRange}
              systemId={selectedSystemId}
              batchId={selectedBatchId}
              farmName={farm?.name ?? null}
            />
          </TabsContent>

          <TabsContent value="mortality" className="mt-5">
            <MortalityReport
              farmId={farmId}
              dateRange={dateRange}
              systemId={selectedSystemId}
              batchId={selectedBatchId}
              farmName={farm?.name ?? null}
            />
          </TabsContent>

          <TabsContent value="growth" className="mt-5">
            <GrowthReport
              farmId={farmId}
              dateRange={dateRange}
              systemId={selectedSystemId}
              stage={selectedStage}
              farmName={farm?.name ?? null}
            />
          </TabsContent>

          <TabsContent value="water-quality" className="mt-5">
            <WaterQualityComplianceReport
              farmId={farmId}
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



"use client"

import { useMemo, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import FeedingReport from "@/components/reports/feeding-report"
import PerformanceReport from "@/components/reports/performance-report"
import MortalityReport from "@/components/reports/mortality-report"
import GrowthReport from "@/components/reports/growth-report"
import WaterQualityComplianceReport from "@/components/reports/water-quality-compliance-report"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { useSharedFilters } from "@/hooks/use-shared-filters"
import { useTimePeriodBounds } from "@/hooks/use-time-period-bounds"
import { useDailyFishInventory } from "@/lib/hooks/use-inventory"
import { useRecentActivities } from "@/lib/hooks/use-dashboard"
import { useProductionSummary } from "@/lib/hooks/use-production"
import { downloadCsv } from "@/lib/utils/report-export"
import { Download } from "lucide-react"

export default function ReportsPage() {
  const { farmId, farm } = useActiveFarm()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState<string>("performance")
  const {
    selectedBatch,
    selectedSystem,
    selectedStage,
    timePeriod,
  } = useSharedFilters()
  const boundsQuery = useTimePeriodBounds({ farmId, timePeriod })
  const hasBounds = boundsQuery.hasBounds
  const dateFrom = boundsQuery.start ?? ""
  const dateTo = boundsQuery.end ?? ""
  const dateRange = useMemo(() => ({ from: dateFrom, to: dateTo }), [dateFrom, dateTo])

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
  const inventoryQuery = useDailyFishInventory({
    farmId,
    systemId: selectedSystemId,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    limit: 2000,
    enabled: hasBounds,
  })
  const activityQuery = useRecentActivities({
    dateFrom: dateFrom ? `${dateFrom}T00:00:00` : undefined,
    dateTo: dateTo ? `${dateTo}T23:59:59` : undefined,
    limit: 2000,
    enabled: hasBounds,
  })
  const kpiQuery = useProductionSummary({
    farmId,
    systemId: selectedSystemId,
    stage: selectedStage === "all" ? undefined : selectedStage,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    limit: 2000,
    enabled: hasBounds,
  })

  const inventoryRows = inventoryQuery.data?.status === "success" ? inventoryQuery.data.data : []
  const activityRows = activityQuery.data?.status === "success" ? activityQuery.data.data : []
  const kpiRows = kpiQuery.data?.status === "success" ? kpiQuery.data.data : []

  const exportInventoryCsv = () =>
    downloadCsv({
      filename: `inventory-${dateRange.from || "start"}-to-${dateRange.to || "end"}.csv`,
      headers: ["inventory_date", "system_id", "system_name", "number_of_fish", "feeding_amount", "mortality_rate"],
      rows: inventoryRows.map((row) => [
        row.inventory_date,
        row.system_id,
        row.system_name,
        row.number_of_fish,
        row.feeding_amount,
        row.mortality_rate,
      ]),
    })

  const exportTransactionsCsv = () =>
    downloadCsv({
      filename: `transactions-${dateRange.from || "start"}-to-${dateRange.to || "end"}.csv`,
      headers: ["change_time", "table_name", "record_id", "column_name", "change_type", "old_value", "new_value"],
      rows: activityRows.map((row) => [
        row.change_time,
        row.table_name,
        row.record_id,
        row.column_name,
        row.change_type,
        row.old_value,
        row.new_value,
      ]),
    })

  const exportKpisCsv = () =>
    downloadCsv({
      filename: `kpis-${dateRange.from || "start"}-to-${dateRange.to || "end"}.csv`,
      headers: ["date", "system_name", "efcr_period", "total_biomass", "total_feed_amount_period", "daily_mortality_count"],
      rows: kpiRows.map((row) => [
        row.date,
        row.system_name,
        row.efcr_period,
        row.total_biomass,
        row.total_feed_amount_period,
        row.daily_mortality_count,
      ]),
    })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-lg border border-border/80 bg-card p-4 shadow-sm">
          <div>
            <h1 className="text-3xl font-bold">Reports and Analytics</h1>
            <p className="text-muted-foreground mt-1">Performance, compliance, and export-ready reporting.</p>
          </div>
        </div>

        <section className="sticky top-[65px] z-10 rounded-lg border border-border bg-card/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/90">
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 gap-2 ml-auto">
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportInventoryCsv}>Inventory CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={exportTransactionsCsv}>Transactions CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={exportKpisCsv}>KPI CSV</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </section>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-4xl grid-cols-5 border border-border/80 bg-muted/60">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="feeding">Feeding</TabsTrigger>
            <TabsTrigger value="mortality">Mortality</TabsTrigger>
            <TabsTrigger value="growth">Growth</TabsTrigger>
            <TabsTrigger value="water-quality">Water Quality</TabsTrigger>
          </TabsList>

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


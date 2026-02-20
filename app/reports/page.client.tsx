"use client"

import { useMemo, useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import FarmSelector from "@/components/shared/farm-selector"
import FeedingReport from "@/components/reports/feeding-report"
import PerformanceReport from "@/components/reports/performance-report"
import MortalityReport from "@/components/reports/mortality-report"
import GrowthReport from "@/components/reports/growth-report"
import WaterQualityComplianceReport from "@/components/reports/water-quality-compliance-report"
import AnalysisOverview from "@/components/dashboard/analysis-overview"
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
import { useDailyFishInventory } from "@/lib/hooks/use-inventory"
import { useRecentActivities } from "@/lib/hooks/use-dashboard"
import { useProductionSummary } from "@/lib/hooks/use-production"
import { downloadCsv } from "@/lib/utils/report-export"
import { Download } from "lucide-react"

const shiftDays = (base: string, days: number) => {
  const d = new Date(`${base}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export default function ReportsPage() {
  const { farmId, farm } = useActiveFarm()
  const today = new Date().toISOString().slice(0, 10)
  const [dateRange, setDateRange] = useState({
    from: shiftDays(today, -30),
    to: today,
  })
  const {
    selectedBatch,
    setSelectedBatch,
    selectedSystem,
    setSelectedSystem,
    selectedStage,
    setSelectedStage,
  } = useSharedFilters()
  const [template, setTemplate] = useState<"weekly" | "monthly" | "seasonal">("monthly")

  const selectedSystemId = selectedSystem !== "all" ? Number(selectedSystem) : undefined
  const selectedBatchId = selectedBatch !== "all" ? Number(selectedBatch) : undefined
  const operationsPeriodParam = `custom_${dateRange.from}_${dateRange.to}`

  const inventoryQuery = useDailyFishInventory({
    farmId,
    systemId: selectedSystemId,
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    limit: 5000,
  })
  const activityQuery = useRecentActivities({
    dateFrom: `${dateRange.from}T00:00:00`,
    dateTo: `${dateRange.to}T23:59:59`,
    limit: 5000,
  })
  const kpiQuery = useProductionSummary({
    farmId,
    systemId: selectedSystemId,
    stage: selectedStage === "all" ? undefined : selectedStage,
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    limit: 5000,
  })

  const inventoryRows = inventoryQuery.data?.status === "success" ? inventoryQuery.data.data : []
  const activityRows = activityQuery.data?.status === "success" ? activityQuery.data.data : []
  const kpiRows = kpiQuery.data?.status === "success" ? kpiQuery.data.data : []

  const templateCommentary = useMemo(() => {
    if (template === "weekly") return "Weekly template for operational review."
    if (template === "seasonal") return "Seasonal template for strategic benchmarking."
    return "Monthly template for stakeholder performance review."
  }, [template])

  const applyTemplate = (next: "weekly" | "monthly" | "seasonal") => {
    setTemplate(next)
    const end = dateRange.to
    const span = next === "weekly" ? -7 : next === "monthly" ? -30 : -90
    setDateRange({ from: shiftDays(end, span), to: end })
  }

  const exportInventoryCsv = () =>
    downloadCsv({
      filename: `inventory-${dateRange.from}-to-${dateRange.to}.csv`,
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
      filename: `transactions-${dateRange.from}-to-${dateRange.to}.csv`,
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
      filename: `kpis-${dateRange.from}-to-${dateRange.to}.csv`,
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
            <FarmSelector
              selectedBatch={selectedBatch}
              selectedSystem={selectedSystem}
              selectedStage={selectedStage}
              onBatchChange={setSelectedBatch}
              onSystemChange={setSelectedSystem}
              onStageChange={setSelectedStage}
              variant="compact"
            />
            <select
              value={template}
              onChange={(event) => applyTemplate(event.target.value as "weekly" | "monthly" | "seasonal")}
              className="h-9 min-w-[130px] rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground"
              aria-label="Report template"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="seasonal">Seasonal</option>
            </select>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              aria-label="From date"
            />
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              aria-label="To date"
            />
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
          <p className="mt-2 text-xs text-muted-foreground">{templateCommentary}</p>
        </section>

        <Tabs defaultValue="performance" className="w-full">
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
            <section className="space-y-4 mt-6">
              <div>
                <h2 className="text-xl font-semibold">Operations Drilldown</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Production trend and system-level performance for the selected report window.
                </p>
              </div>
              <AnalysisOverview
                stage={selectedStage === "all" ? null : selectedStage}
                system={selectedSystem}
                timePeriod="month"
                periodParam={operationsPeriodParam}
              />
            </section>
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


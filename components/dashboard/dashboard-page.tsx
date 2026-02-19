"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Download, RefreshCw } from "lucide-react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import FarmSelector from "@/components/shared/farm-selector"
import { useAuth } from "@/components/providers/auth-provider"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { useSharedFilters } from "@/hooks/use-shared-filters"
import TimePeriodSelector, { type TimePeriod } from "@/components/shared/time-period-selector"
import KPIOverview from "@/components/dashboard/kpi-overview"
import PopulationOverview from "@/components/dashboard/population-overview"
import SystemsTable from "@/components/dashboard/systems-table"
import RecentActivities from "@/components/dashboard/recent-activities"
import HealthSummary from "@/components/dashboard/health-summary"
import RecommendedActions from "@/components/dashboard/recommended-actions"
import ProductionSummaryMetrics from "@/components/dashboard/production-summary-metrics"
import * as XLSX from "xlsx"
import { getProductionSummary } from "@/lib/api/production"
import { parseDateToTimePeriod } from "@/lib/utils"
import { logSbError } from "@/utils/supabase/log"

export default function DashboardPage() {
  const { profile, user } = useAuth()
  const { farm, farmId } = useActiveFarm()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const periodParam = searchParams.get("period")
  const parsedPeriod = parseDateToTimePeriod(periodParam)
  const {
    selectedBatch,
    setSelectedBatch,
    selectedSystem,
    setSelectedSystem,
    selectedStage,
    setSelectedStage,
    timePeriod,
    setTimePeriod,
  } = useSharedFilters(parsedPeriod.kind === "preset" ? parsedPeriod.period : "2 weeks")
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!periodParam || parsedPeriod.kind !== "preset") return
    if (parsedPeriod.period !== timePeriod) {
      setTimePeriod(parsedPeriod.period)
    }
  }, [parsedPeriod, periodParam, setTimePeriod, timePeriod])

  const handleDownload = async () => {
    try {
      const systemId = selectedSystem !== "all" ? Number(selectedSystem) : undefined
      const stage = selectedStage === "all" ? undefined : selectedStage
      const resolvedSystemId = Number.isFinite(systemId) ? systemId : undefined
      const result = await queryClient.fetchQuery({
        queryKey: [
          "production",
          "summary",
          farmId ?? "all",
          resolvedSystemId ?? "all",
          stage ?? "all",
          "",
          "",
          1000,
          "download",
        ],
        queryFn: () =>
          getProductionSummary({
            stage,
            systemId: resolvedSystemId,
            limit: 1000,
            farmId: farmId ?? null,
          }),
      })

      if (result.status === "success" && result.data && result.data.length > 0) {
        const worksheet = XLSX.utils.json_to_sheet(result.data)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, "Production Summary")
        XLSX.writeFile(workbook, `AquaSmart_Dashboard_Data_${new Date().toISOString().split("T")[0]}.xlsx`)
      }
    } catch (error) {
      logSbError("dashboard:download", error)
    }
  }

  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      await queryClient.invalidateQueries()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="rounded-lg border border-border bg-card p-4 shadow-sm md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                {farm?.name ?? profile?.farm_name ?? "Active farm"} operational intelligence and analytics.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 gap-2 rounded-md text-xs font-semibold cursor-pointer"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={handleDownload}
                className="h-9 gap-2 rounded-md px-4 text-xs font-semibold cursor-pointer bg-sidebar-primary hover:bg-sidebar-primary/85"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </section>

        <section className="sticky top-[65px] z-10 rounded-lg border border-border bg-card/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/90">
          <div className="flex flex-wrap items-center gap-2">
            <FarmSelector
              selectedBatch={selectedBatch}
              selectedSystem={selectedSystem}
              selectedStage={selectedStage}
              onBatchChange={setSelectedBatch}
              onSystemChange={setSelectedSystem}
              onStageChange={setSelectedStage}
              showStage
              variant="compact"
            />
            <TimePeriodSelector selectedPeriod={timePeriod} onPeriodChange={setTimePeriod} variant="compact" />
            <Link href="/data-entry" className="ml-auto">
              <Button className="h-9 rounded-md px-4 text-sm font-medium cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90">
                Add Data
              </Button>
            </Link>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Core Performance Overview</h2>
            <p className="text-sm text-muted-foreground">
              Real-time snapshot of core operational and water quality indicators.
            </p>
          </div>
          <KPIOverview
            stage={selectedStage}
            timePeriod={timePeriod}
            batch={selectedBatch}
            system={selectedSystem}
            periodParam={periodParam}
          />
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Feed Efficiency and Mortality Monitoring</h2>
            <p className="text-sm text-muted-foreground">Trends for production, efficiency, and system health.</p>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
            <PopulationOverview
              stage={selectedStage === "all" ? null : selectedStage}
              batch={selectedBatch}
              system={selectedSystem}
              timePeriod={timePeriod}
              periodParam={periodParam}
            />
            <HealthSummary
              stage={selectedStage}
              batch={selectedBatch}
              system={selectedSystem}
              timePeriod={timePeriod}
              periodParam={periodParam}
            />
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Operations Table</h2>
            <p className="text-sm text-muted-foreground">
              Dense system table with row drilldown for exceptions and next actions.
            </p>
          </div>
          <SystemsTable
            stage={selectedStage}
            batch={selectedBatch}
            system={selectedSystem}
            timePeriod={timePeriod}
            periodParam={periodParam}
          />
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Production Summary Metrics</h2>
            <p className="text-sm text-muted-foreground">
              Summary totals for stocked fish, mortalities, transfer adjustments, and harvest output.
            </p>
          </div>
          <ProductionSummaryMetrics
            stage={selectedStage}
            batch={selectedBatch}
            system={selectedSystem}
            timePeriod={timePeriod}
            periodParam={periodParam}
          />
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Recent Activity</h2>
            <p className="text-sm text-muted-foreground">Latest operational events and advisory timeline.</p>
          </div>
          <RecentActivities
            batch={selectedBatch}
            stage={selectedStage}
            system={selectedSystem}
            title="Advisory Timeline"
            countLabel="events"
          />
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Recommended Actions</h2>
            <p className="text-sm text-muted-foreground">Supply and feed priorities based on recent activity.</p>
          </div>
          <RecommendedActions
            stage={selectedStage}
            batch={selectedBatch}
            system={selectedSystem}
            timePeriod={timePeriod}
          />
        </section>
      </div>
    </DashboardLayout>
  )
}

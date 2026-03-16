"use client"

import { useEffect, useRef } from "react"
import { useSearchParams, usePathname } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Download } from "lucide-react"
import type { DashboardPageInitialData, DashboardPageInitialFilters } from "@/features/dashboard/types"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { useSharedFilters } from "@/hooks/use-shared-filters"
import { useTimePeriodBounds } from "@/hooks/use-time-period-bounds"
import KPIOverview from "@/components/dashboard/kpi-overview"
import PopulationOverview from "@/components/dashboard/population-overview"
import SystemsTable from "@/components/dashboard/systems-table"
import RecentActivities from "@/components/dashboard/recent-activities"
import WaterQualityIndex from "@/components/dashboard/water-quality-index"
import RecommendedActions from "@/components/dashboard/recommended-actions"
import ProductionSummaryMetrics from "@/components/dashboard/production-summary-metrics"
import * as XLSX from "xlsx"
import { getProductionSummary } from "@/lib/api/production"
import { parseDateToTimePeriod } from "@/lib/utils"
import { logSbError } from "@/utils/supabase/log"
import { useRouter } from "next/navigation"

export default function DashboardPage({
  initialFarmId,
  initialFilters,
  initialData,
}: {
  initialFarmId?: string | null
  initialFilters?: DashboardPageInitialFilters
  initialData?: DashboardPageInitialData
}) {
  const { farmId: activeFarmId } = useActiveFarm({ initialFarmId })
  const farmId = activeFarmId ?? initialFarmId ?? null
  const queryClient = useQueryClient()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const periodParam = searchParams.get("period")
  const parsedPeriod = parseDateToTimePeriod(periodParam)
  const {
    selectedBatch,
    selectedSystem,
    selectedStage,
    timePeriod,
    setTimePeriod,
  } = useSharedFilters(parsedPeriod.period, initialFilters)
  const boundsQuery = useTimePeriodBounds({ farmId, timePeriod, initialData: initialData?.bounds })
  const dateFrom = boundsQuery.start ?? undefined
  const dateTo = boundsQuery.end ?? undefined
  const lastPeriodParam = useRef<string | null>(periodParam)

  useEffect(() => {
    if (lastPeriodParam.current === periodParam) return
    lastPeriodParam.current = periodParam
    if (!periodParam) return
    if (parsedPeriod.period !== timePeriod) {
      setTimePeriod(parsedPeriod.period)
    }
  }, [periodParam, parsedPeriod.period, setTimePeriod, timePeriod])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (params.get("period") === timePeriod) return
    params.set("period", timePeriod)
    router.replace(`${pathname}?${params.toString()}`)
  }, [pathname, router, searchParams, timePeriod])

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
            dateFrom,
            dateTo,
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="text-lg font-semibold">Core Performance Overview</h2>
          </div>
            <Button
              size="sm"
              onClick={handleDownload}
              className="mt-1 h-9 gap-2 rounded-md px-4 text-xs font-semibold cursor-pointer bg-sidebar-primary hover:bg-sidebar-primary/85"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
          <KPIOverview
            farmId={farmId}
            stage={selectedStage}
            timePeriod={timePeriod}
            dateFrom={dateFrom}
            dateTo={dateTo}
            batch={selectedBatch}
            system={selectedSystem}
            periodParam={periodParam}
            initialData={initialData?.kpiOverview}
          />
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Feed Efficiency and Water Quality Monitoring</h2>
            <p className="text-sm text-muted-foreground">Trends for production, efficiency, and water quality health.</p>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
            <PopulationOverview
              farmId={farmId}
              stage={selectedStage === "all" ? null : selectedStage}
              batch={selectedBatch}
              system={selectedSystem}
              timePeriod={timePeriod}
              dateFrom={dateFrom}
              dateTo={dateTo}
              periodParam={periodParam}
              initialData={initialData?.productionTrend}
            />
            <WaterQualityIndex
              farmId={farmId}
              stage={selectedStage}
              batch={selectedBatch}
              system={selectedSystem}
              dateFrom={dateFrom}
              dateTo={dateTo}
              initialSystemsData={initialData?.systemOptions}
              initialBatchSystemsData={initialData?.batchSystems}
              initialMeasurements={initialData?.waterQualityMeasurements}
              initialThresholds={initialData?.alertThresholds}
            />
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">System Status</h2>
            <p className="text-sm text-muted-foreground">
              Dense system table with row drilldown into unit history, exceptions, and next actions.
            </p>
          </div>
          <SystemsTable
            farmId={farmId}
            stage={selectedStage}
            batch={selectedBatch}
            system={selectedSystem}
            timePeriod={timePeriod}
            dateFrom={dateFrom}
            dateTo={dateTo}
            periodParam={periodParam}
            initialData={initialData?.systemsTable}
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
            farmId={farmId}
            stage={selectedStage}
            batch={selectedBatch}
            system={selectedSystem}
            timePeriod={timePeriod}
            dateFrom={dateFrom}
            dateTo={dateTo}
            periodParam={periodParam}
            initialData={initialData?.productionSummaryMetrics}
          />
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Recent Activity</h2>
            <p className="text-sm text-muted-foreground">Latest operational events and advisory timeline.</p>
          </div>
          <RecentActivities
            farmId={farmId}
            batch={selectedBatch}
            stage={selectedStage}
            system={selectedSystem}
            title="Advisory Timeline"
            countLabel="events"
            initialEntries={initialData?.recentEntries}
            initialSystems={initialData?.systemOptions}
          />
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Recommended Actions</h2>
            <p className="text-sm text-muted-foreground">Supply and feed priorities based on recent activity.</p>
          </div>
          <RecommendedActions
            farmId={farmId}
            stage={selectedStage}
            batch={selectedBatch}
            system={selectedSystem}
            timePeriod={timePeriod}
            dateFrom={dateFrom}
            dateTo={dateTo}
            initialData={initialData?.recommendedActions}
          />
        </section>
      </div>
    </DashboardLayout>
  )
}

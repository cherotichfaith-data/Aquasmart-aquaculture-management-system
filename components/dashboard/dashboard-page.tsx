"use client"

import Link from "next/link"
import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Download } from "lucide-react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import FarmSelector from "@/components/shared/farm-selector"
import { useAuth } from "@/components/providers/auth-provider"
import { useActiveFarm } from "@/hooks/use-active-farm"
import TimePeriodSelector, { type TimePeriod } from "@/components/shared/time-period-selector"
import KPIOverview from "@/components/dashboard/kpi-overview"
import PopulationOverview from "@/components/dashboard/population-overview"
import SystemsTable from "@/components/dashboard/systems-table"
import RecentActivities from "@/components/dashboard/recent-activities"
import HealthSummary from "@/components/dashboard/health-summary"
import RecommendedActions from "@/components/dashboard/recommended-actions"
import * as XLSX from "xlsx"
import { getProductionSummary } from "@/lib/api/production"
import { parseDateToTimePeriod } from "@/lib/utils"
import { logSbError } from "@/utils/supabase/log"

export default function DashboardPage() {
  const { profile } = useAuth()
  const { farm, farmId } = useActiveFarm()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const periodParam = searchParams.get("period")
  const parsedPeriod = parseDateToTimePeriod(periodParam)
  const [selectedBatch, setSelectedBatch] = useState<string>("all")
  const [selectedSystem, setSelectedSystem] = useState<string>("all")
  const [selectedStage, setSelectedStage] = useState<"all" | "nursing" | "grow_out">("all")
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(
    parsedPeriod.kind === "preset" ? parsedPeriod.period : "2 weeks",
  )

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

  return (
    <DashboardLayout>
      <div className="space-y-10">
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-balance">
                {farm?.name ?? profile?.farm_name ?? "Dashboard"}
              </h1>
              <p className="text-muted-foreground mt-2">Monitor your farm check-ins and system performance</p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="inline-flex rounded-full bg-muted/70 p-1">
              {[
                { value: "all", label: "All" },
                { value: "nursing", label: "Nursing" },
                { value: "grow_out", label: "Grow out" },
              ].map((stage) => (
                <button
                  key={stage.value}
                  type="button"
                  onClick={() => setSelectedStage(stage.value as typeof selectedStage)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${selectedStage === stage.value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {stage.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <TimePeriodSelector selectedPeriod={timePeriod} onPeriodChange={setTimePeriod} />
              <Link href="/data-entry">
                <Button className="h-9 rounded-full px-4 text-xs font-semibold shadow-sm cursor-pointer bg-sidebar-primary hover:bg-sidebar-primary/80">
                  Add Data
                </Button>
              </Link>
              <Button
                size="sm"
                onClick={handleDownload}
                className="h-9 rounded-full px-4 text-xs font-semibold shadow-sm cursor-pointer bg-sidebar-primary hover:bg-sidebar-primary/80"
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </div>

          <FarmSelector
            selectedBatch={selectedBatch}
            selectedSystem={selectedSystem}
            selectedStage={selectedStage}
            onBatchChange={setSelectedBatch}
            onSystemChange={setSelectedSystem}
            onStageChange={setSelectedStage}
            showStage={false}
            variant="compact"
          />
        </div>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Health Overview</h2>
            <p className="text-sm text-muted-foreground">
              Snapshot of system performance, water quality, and feeding efficiency.
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
            <h2 className="text-lg font-semibold">Field Visualization</h2>
            <p className="text-sm text-muted-foreground">Live system status with a health snapshot.</p>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
            <SystemsTable
              stage={selectedStage}
              batch={selectedBatch}
              system={selectedSystem}
              timePeriod={timePeriod}
              periodParam={periodParam}
            />
            <HealthSummary system={selectedSystem} timePeriod={timePeriod} periodParam={periodParam} />
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Field Metrics</h2>
            <p className="text-sm text-muted-foreground">Trends across production, mortality, and efficiency.</p>
          </div>
          <PopulationOverview
            stage={selectedStage === "all" ? null : selectedStage}
            system={selectedSystem}
            timePeriod={timePeriod}
            periodParam={periodParam}
          />
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Advisory Timeline</h2>
            <p className="text-sm text-muted-foreground">Recent operational changes and farm events.</p>
          </div>
          <RecentActivities batch={selectedBatch} system={selectedSystem} title="Advisory Timeline" countLabel="events" />
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Recommended Actions</h2>
            <p className="text-sm text-muted-foreground">Supply and feed priorities based on recent activity.</p>
          </div>
          <RecommendedActions system={selectedSystem} timePeriod={timePeriod} />
        </section>
      </div>
    </DashboardLayout>
  )
}

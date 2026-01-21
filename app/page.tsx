"use client"

import Link from "next/link"
import { useState } from "react"
import { Bell, Download } from "lucide-react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import FarmSelector from "@/components/shared/farm-selector"
import TimePeriodSelector, { type TimePeriod } from "@/components/shared/time-period-selector"
import KPIOverview from "@/components/dashboard/kpi-overview"
import PopulationOverview from "@/components/dashboard/population-overview"
import SystemsTable from "@/components/dashboard/systems-table"
import RecentActivities from "@/components/dashboard/recent-activities"
import HealthSummary from "@/components/dashboard/health-summary"
import InventorySummary from "@/components/dashboard/inventory-summary"
import * as XLSX from "xlsx"
import { fetchProductionSummary } from "@/lib/supabase-queries"

export default function DashboardPage() {
  const [selectedBatch, setSelectedBatch] = useState<string>("all")
  const [selectedSystem, setSelectedSystem] = useState<string>("all")
  const [selectedStage, setSelectedStage] = useState<"all" | "nursing" | "grow_out">("all")
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("week")

  const handleDownload = async () => {
    try {
      const systemId = selectedSystem !== "all" ? Number(selectedSystem) : undefined
      const result = await fetchProductionSummary({
        growth_stage: selectedStage === "all" ? undefined : selectedStage,
        system_id: Number.isFinite(systemId) ? systemId : undefined,
        limit: 1000,
      })

      if (result.status === "success" && result.data && result.data.length > 0) {
        const worksheet = XLSX.utils.json_to_sheet(result.data)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, "Production Summary")
        XLSX.writeFile(workbook, `AquaSmart_Dashboard_Data_${new Date().toISOString().split("T")[0]}.xlsx`)
      } else {
        console.error("No data available to download")
      }
    } catch (error) {
      console.error("Error downloading data:", error)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-balance">Dashboard</h1>
              <p className="text-muted-foreground mt-2">Monitor your farm check-ins and system performance</p>
            </div>
            <button
              type="button"
              aria-label="Notifications"
              className="h-9 w-9 rounded-full border border-border bg-card shadow-sm hover:bg-accent transition-colors"
            >
              <Bell className="mx-auto h-4 w-4 text-muted-foreground" />
            </button>
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
                <Button>Add Data</Button>
              </Link>
              <Button
                size="sm"
                onClick={handleDownload}
                className="h-9 rounded-full px-4 text-xs font-semibold shadow-sm"
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

        <KPIOverview stage={selectedStage} timePeriod={timePeriod} batch={selectedBatch} system={selectedSystem} />

        {/* <PopulationOverview
          stage={selectedStage === "all" ? null : selectedStage}
          system={selectedSystem}
          timePeriod={timePeriod}
        /> */}

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
          <div className="space-y-6">
            <SystemsTable
              stage={selectedStage === "all" ? "grow_out" : selectedStage}
              batch={selectedBatch}
              system={selectedSystem}
              timePeriod={timePeriod}
            />
          </div>
          <div className="space-y-6">
            <HealthSummary system={selectedSystem} timePeriod={timePeriod} />
            <InventorySummary />
            <RecentActivities batch={selectedBatch} system={selectedSystem} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

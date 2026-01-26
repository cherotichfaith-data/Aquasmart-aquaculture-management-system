"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import FarmSelector from "@/components/shared/farm-selector"
import WaterQualityCharts from "@/components/water-quality/water-quality-charts"
import WaterQualityHistory from "@/components/water-quality/water-quality-history"

export default function WaterQualityPage() {
  const [selectedBatch, setSelectedBatch] = useState<string>("all")
  const [selectedSystem, setSelectedSystem] = useState<string>("all")
  const [selectedStage, setSelectedStage] = useState<"all" | "nursing" | "grow_out">("all")

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold">Water Quality Monitoring</h1>
            <p className="text-muted-foreground mt-1">Track environmental parameters and alerts</p>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <FarmSelector
              selectedBatch={selectedBatch}
              selectedSystem={selectedSystem}
              selectedStage={selectedStage}
              onBatchChange={setSelectedBatch}
              onSystemChange={setSelectedSystem}
              onStageChange={setSelectedStage}
            />
          </div>
        </div>

        <WaterQualityCharts />
        <WaterQualityHistory />
      </div>
    </DashboardLayout>
  )
}

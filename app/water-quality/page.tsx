"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import FarmSelector from "@/components/shared/farm-selector"
import WaterQualityForm from "@/components/water-quality/water-quality-form"
import WaterQualityCharts from "@/components/water-quality/water-quality-charts"
import WaterQualityHistory from "@/components/water-quality/water-quality-history"
import { Plus } from "lucide-react"

export default function WaterQualityPage() {
  const [showForm, setShowForm] = useState(false)
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

            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus size={18} />
              Record Reading
            </button>
          </div>
        </div>

        {showForm && (
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Water Quality Measurement</h2>
            <WaterQualityForm onClose={() => setShowForm(false)} />
          </div>
        )}

        <WaterQualityCharts />
        <WaterQualityHistory />
      </div>
    </DashboardLayout>
  )
}

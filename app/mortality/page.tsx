"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import FarmSelector from "@/components/shared/farm-selector"
import { fetchMortalityData } from "@/lib/supabase-queries"

export default function MortalityPage() {
  const [selectedBatch, setSelectedBatch] = useState<string>("all")
  const [selectedSystem, setSelectedSystem] = useState<string>("all")
  const [selectedStage, setSelectedStage] = useState<"all" | "nursing" | "grow_out">("all")
  const [mortalityData, setMortalityData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      const systemId = selectedSystem !== "all" ? Number(selectedSystem) : undefined
      const batchId = selectedBatch !== "all" ? Number(selectedBatch) : undefined
      const result = await fetchMortalityData({
        system_id: Number.isFinite(systemId) ? systemId : undefined,
        batch_id: Number.isFinite(batchId) ? batchId : undefined,
      })
      setMortalityData(result.status === "success" ? result.data : [])
      setLoading(false)
    }
    loadData()
  }, [selectedBatch, selectedSystem, selectedStage])

  const totalMortality = mortalityData.reduce(
    (sum, item) => sum + (item.number_of_fish_mortality || 0),
    0,
  )
  const uniqueSystems = new Set(mortalityData.map((item) => item.system_id)).size

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold">Mortality Tracking</h1>
            <p className="text-muted-foreground mt-1">Monitor fish mortality events</p>
          </div>

          <FarmSelector
            selectedBatch={selectedBatch}
            selectedSystem={selectedSystem}
            selectedStage={selectedStage}
            onBatchChange={setSelectedBatch}
            onSystemChange={setSelectedSystem}
            onStageChange={setSelectedStage}
          />
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold">Mortality Records</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">System</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Batch</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Fish Dead</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">ABW</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Total Weight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : mortalityData.length > 0 ? (
                  mortalityData.map((record) => (
                    <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 text-sm">{record.date}</td>
                      <td className="px-6 py-4 text-sm font-medium">{record.system_id}</td>
                      <td className="px-6 py-4 text-sm">{record.batch_id ?? "-"}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-destructive">
                        {record.number_of_fish_mortality}
                      </td>
                      <td className="px-6 py-4 text-sm">{record.abw ?? "-"}</td>
                      <td className="px-6 py-4 text-sm">{record.total_weight_mortality ?? "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      No mortality records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total Events</p>
            <p className="text-2xl font-bold mt-1">{mortalityData.length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total Fish Dead</p>
            <p className="text-2xl font-bold mt-1 text-destructive">{totalMortality}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Unique Systems</p>
            <p className="text-2xl font-bold mt-1">{uniqueSystems}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Latest Record</p>
            <p className="text-2xl font-bold mt-1">{mortalityData[0]?.date || "N/A"}</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

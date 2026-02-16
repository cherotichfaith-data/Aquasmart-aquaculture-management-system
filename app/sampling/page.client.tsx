"use client"

import { useMemo, useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import FarmSelector from "@/components/shared/farm-selector"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import { useSamplingData } from "@/lib/hooks/use-reports"
import { sortByDateAsc } from "@/lib/utils"

export default function SamplingPage() {
  const [selectedBatch, setSelectedBatch] = useState<string>("all")
  const [selectedSystem, setSelectedSystem] = useState<string>("all")
  const [selectedStage, setSelectedStage] = useState<"all" | "nursing" | "grow_out">("all")

  const systemId = selectedSystem !== "all" ? Number(selectedSystem) : undefined
  const batchId = selectedBatch !== "all" ? Number(selectedBatch) : undefined

  const samplingQuery = useSamplingData({
    systemId: Number.isFinite(systemId) ? systemId : undefined,
    batchId: Number.isFinite(batchId) ? batchId : undefined,
  })

  const samplingData = samplingQuery.data?.status === "success" ? samplingQuery.data.data : []
  const loading = samplingQuery.isLoading

  const chartData = useMemo(
    () =>
      sortByDateAsc(
        samplingData.map((item) => ({
          date: item.date,
          abw: item.abw,
          fishSampled: item.number_of_fish_sampling,
          totalWeight: item.total_weight_sampling,
        })),
        (item) => item.date,
      ),
    [samplingData],
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold">Sampling Data</h1>
            <p className="text-muted-foreground mt-1">Monitor fish growth through sampling records</p>
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

        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Average Body Weight (ABW) Trend</h2>
          {loading ? (
            <div className="h-80 flex items-center justify-center text-muted-foreground">Loading chart...</div>
          ) : chartData.length > 0 ? (
            <ChartContainer config={{ abw: { label: "ABW (g)", color: "hsl(var(--chart-1))" } }}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis label={{ value: "ABW (g)", angle: -90, position: "insideLeft" }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="abw" stroke="hsl(var(--chart-1))" name="ABW (g)" />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-muted-foreground">No data available</div>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold">Sampling Records</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">System</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Batch</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Fish Sampled</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Total Weight (g)</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">ABW (g)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : samplingData.length > 0 ? (
                  samplingData.map((record) => (
                    <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 text-sm">{record.date}</td>
                      <td className="px-6 py-4 text-sm font-medium">{record.system_id}</td>
                      <td className="px-6 py-4 text-sm">{record.batch_id ?? "-"}</td>
                      <td className="px-6 py-4 text-sm">{record.number_of_fish_sampling}</td>
                      <td className="px-6 py-4 text-sm">{record.total_weight_sampling}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-primary">{record.abw}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      No sampling data found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total Samples</p>
            <p className="text-2xl font-bold mt-1">{samplingData.length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Latest ABW</p>
            <p className="text-2xl font-bold mt-1">
              {samplingData.length > 0 ? samplingData[0]?.abw : "--"}g
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}


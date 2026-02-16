"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import FarmSelector from "@/components/shared/farm-selector"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import type { Tables } from "@/lib/types/database"
import { type FeedIncomingWithType } from "@/lib/api/reports"
import { useFeedIncoming, useFeedTypes } from "@/lib/hooks/use-reports"
import { useEfcrTrend } from "@/lib/hooks/use-production"
import { useDashboardConsolidatedSnapshot, useDashboardSnapshot } from "@/lib/hooks/use-dashboard"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { sortByDateAsc } from "@/lib/utils"

export default function FeedManagementPage() {
  const { farmId } = useActiveFarm()
  const [selectedBatch, setSelectedBatch] = useState<string>("all")
  const [selectedSystem, setSelectedSystem] = useState<string>("all")
  const [selectedStage, setSelectedStage] = useState<"all" | "nursing" | "grow_out">("all")
  const systemId = selectedSystem !== "all" ? Number(selectedSystem) : undefined
  const hasSystem = Number.isFinite(systemId)

  const feedIncomingQuery = useFeedIncoming()
  const feedTypesQuery = useFeedTypes()
  const efcrTrendQuery = useEfcrTrend({
    systemId: hasSystem ? (systemId as number) : undefined,
    limit: 90,
    enabled: hasSystem,
    farmId,
  })
  const systemSnapshotQuery = useDashboardSnapshot({
    farmId,
    systemId: hasSystem ? (systemId as number) : undefined,
    timePeriod: "month",
    enabled: hasSystem,
  })
  const consolidatedSnapshotQuery = useDashboardConsolidatedSnapshot({
    farmId,
    timePeriod: "month",
    enabled: !hasSystem,
  })

  const feedData = (feedIncomingQuery.data?.status === "success"
    ? feedIncomingQuery.data.data
    : []) as FeedIncomingWithType[]
  const feedTypes = (feedTypesQuery.data?.status === "success" ? feedTypesQuery.data.data : []) as Tables<"api_feed_type_options">[]
  const loading = feedIncomingQuery.isLoading || feedTypesQuery.isLoading

  const efcrTrend =
    efcrTrendQuery.data?.status === "success" ? efcrTrendQuery.data.data : []
  const efcrSnapshot = hasSystem
    ? systemSnapshotQuery.data?.efcr ?? null
    : consolidatedSnapshotQuery.data?.efcr_period_consolidated ?? null
  const efcrLoading =
    efcrTrendQuery.isLoading ||
    (hasSystem ? systemSnapshotQuery.isLoading : consolidatedSnapshotQuery.isLoading)

  const chartData = feedTypes.map((item) => ({
    feedType: item.feed_line ?? `Feed ${item.id}`,
    proteinContent: item.crude_protein_percentage ?? 0,
    pelletSize: item.feed_pellet_size,
  }))
  const efcrChartData = sortByDateAsc(efcrTrend, (row) => row.inventory_date)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold">Feed Management</h1>
            <p className="text-muted-foreground mt-1">Track feed inventory and specifications</p>
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
          <h2 className="text-lg font-semibold mb-4">Feed Protein Content by Type</h2>
          {loading ? (
            <div className="h-80 flex items-center justify-center text-muted-foreground">Loading chart...</div>
          ) : chartData.length > 0 ? (
            <ChartContainer config={{ proteinContent: { label: "Protein %", color: "hsl(var(--chart-2))" } }}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="feedType" />
                  <YAxis label={{ value: "Protein %", angle: -90, position: "insideLeft" }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="proteinContent" fill="hsl(var(--chart-2))" name="Protein %" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-muted-foreground">No data available</div>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Feed Efficiency (eFCR)</h2>
            <p className="text-sm text-muted-foreground">
              Aggregated efficiency metrics are provided by backend materialized views.
            </p>
          </div>
          {efcrLoading ? (
            <div className="h-80 flex items-center justify-center text-muted-foreground">Loading eFCR trend...</div>
          ) : selectedSystem === "all" ? (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              Select a system to view eFCR trend.
            </div>
          ) : efcrTrend.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current eFCR (30d)</p>
                  <p className="text-2xl font-bold">{efcrSnapshot ?? "N/A"}</p>
                </div>
              </div>
              <ChartContainer config={{ efcr: { label: "eFCR", color: "hsl(var(--chart-1))" } }}>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={efcrChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="inventory_date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="efcr_period_last_sampling" fill="hsl(var(--chart-1))" name="eFCR" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-muted-foreground">No eFCR data available</div>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold">Feed Inventory</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Feed Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Category</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Protein %</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Pellet Size (mm)</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Amount Received (kg)</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : feedData.length > 0 ? (
                  feedData.map((feed) => (
                    <tr key={feed.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium">
                        {feed.feed_type?.feed_line ?? `Feed ${feed.feed_type_id ?? "N/A"}`}
                      </td>
                      <td className="px-6 py-4 text-sm">{feed.feed_type?.feed_category ?? "-"}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-semibold">
                          {feed.feed_type?.crude_protein_percentage ?? "-"}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">{feed.feed_type?.feed_pellet_size ?? "-"}</td>
                      <td className="px-6 py-4 text-sm">{feed.feed_amount}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{feed.date}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      No feed data found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Feed Types</p>
            <p className="text-2xl font-bold mt-1">{feedTypes.length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Incoming Shipments</p>
            <p className="text-2xl font-bold mt-1">{feedData.length}</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}


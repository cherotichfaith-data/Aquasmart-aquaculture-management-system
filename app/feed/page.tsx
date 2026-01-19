"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import FarmSelector from "@/components/shared/farm-selector"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import type { Tables } from "@/lib/types/database"
import {
  fetchFeedData,
  fetchFeedTypes,
  fetchFeedingRecords,
  fetchProductionSummary,
  type FeedIncomingWithType,
  type FeedingRecordWithType,
} from "@/lib/supabase-queries"

type FeedEfficiencyRow = {
  feedType: string
  efcr: number
  totalFeed: number
}

export default function FeedManagementPage() {
  const [selectedBatch, setSelectedBatch] = useState<string>("all")
  const [selectedSystem, setSelectedSystem] = useState<string>("all")
  const [selectedStage, setSelectedStage] = useState<"all" | "nursing" | "grow_out">("all")
  const [feedData, setFeedData] = useState<FeedIncomingWithType[]>([])
  const [feedTypes, setFeedTypes] = useState<Tables<"feed_type">[]>([])
  const [feedEfficiency, setFeedEfficiency] = useState<FeedEfficiencyRow[]>([])
  const [efficiencyLoading, setEfficiencyLoading] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      const [incomingResult, typesResult] = await Promise.all([fetchFeedData(), fetchFeedTypes()])
      setFeedData(incomingResult.status === "success" ? incomingResult.data : [])
      setFeedTypes(typesResult.status === "success" ? typesResult.data : [])
      setLoading(false)
    }
    loadData()
  }, [selectedBatch, selectedSystem, selectedStage])

  useEffect(() => {
    const loadEfficiency = async () => {
      setEfficiencyLoading(true)
      const [summaryResult, feedingResult] = await Promise.all([
        fetchProductionSummary({ limit: 200 }),
        fetchFeedingRecords({ limit: 200 }),
      ])
      const summaryRows = summaryResult.status === "success" ? summaryResult.data : []
      const feedingRows = feedingResult.status === "success" ? feedingResult.data : []

      const efcrBySystem = new Map<number, number>()
      summaryRows.forEach((row) => {
        if (!row.system_id || efcrBySystem.has(row.system_id)) return
        if (typeof row.efcr_period === "number" && Number.isFinite(row.efcr_period)) {
          efcrBySystem.set(row.system_id, row.efcr_period)
        }
      })

      const totals = new Map<
        string,
        { label: string; totalFeed: number; weightedEfcr: number; records: number }
      >()

      feedingRows.forEach((row: FeedingRecordWithType) => {
        const feedTypeId = row.feed_type_id ?? row.feed_type?.id ?? null
        const key = feedTypeId ? String(feedTypeId) : "unassigned"
        const label = row.feed_type?.feed_line ?? (feedTypeId ? `Feed ${feedTypeId}` : "Unassigned")
        const amount = typeof row.feeding_amount === "number" ? row.feeding_amount : null
        const efcr = row.system_id ? efcrBySystem.get(row.system_id) : undefined
        if (efcr === undefined || !Number.isFinite(efcr)) return
        if (amount === null || !Number.isFinite(amount) || amount <= 0) return

        const entry = totals.get(key) ?? { label, totalFeed: 0, weightedEfcr: 0, records: 0 }
        entry.totalFeed += amount
        entry.weightedEfcr += efcr * amount
        entry.records += 1
        totals.set(key, entry)
      })

      const chartRows = Array.from(totals.values())
        .map((entry) => ({
          feedType: entry.label,
          efcr: entry.totalFeed > 0 ? entry.weightedEfcr / entry.totalFeed : 0,
          totalFeed: entry.totalFeed,
        }))
        .filter((row) => Number.isFinite(row.efcr))
        .sort((a, b) => a.efcr - b.efcr)

      setFeedEfficiency(chartRows)
      setEfficiencyLoading(false)
    }
    loadEfficiency()
  }, [selectedBatch, selectedSystem, selectedStage])

  const chartData = feedTypes.map((item) => ({
    feedType: item.feed_line ?? `Feed ${item.id}`,
    proteinContent: item.crude_protein_percentage ?? 0,
    pelletSize: item.feed_pellet_size,
  }))

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
            <h2 className="text-lg font-semibold">Feed Efficiency (eFCR) by Type</h2>
            <p className="text-sm text-muted-foreground">
              Weighted by recent feed usage; eFCR sourced from production summaries.
            </p>
          </div>
          {efficiencyLoading ? (
            <div className="h-80 flex items-center justify-center text-muted-foreground">Loading chart...</div>
          ) : feedEfficiency.length > 0 ? (
            <ChartContainer config={{ efcr: { label: "eFCR", color: "hsl(var(--chart-1))" } }}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={feedEfficiency}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="feedType" />
                  <YAxis tickFormatter={(value) => Number(value).toFixed(2)} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const row = payload[0].payload as FeedEfficiencyRow
                      return (
                        <div className="rounded-md border border-border bg-card px-3 py-2 shadow-md">
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="text-sm font-medium text-foreground">eFCR: {row.efcr.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            Feed used: {row.totalFeed.toFixed(1)} kg
                          </p>
                        </div>
                      )
                    }}
                  />
                  <Legend />
                  <Bar dataKey="efcr" fill="hsl(var(--chart-1))" name="eFCR" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-muted-foreground">No data available</div>
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
            <p className="text-sm text-muted-foreground">Avg Protein Content</p>
            <p className="text-2xl font-bold mt-1">
              {feedTypes.length > 0
                ? (
                    feedTypes.reduce((sum, f) => sum + (f.crude_protein_percentage || 0), 0) / feedTypes.length
                  ).toFixed(1)
                : 0}
              %
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total Received (kg)</p>
            <p className="text-2xl font-bold mt-1">{feedData.reduce((sum, f) => sum + (f.feed_amount || 0), 0)}</p>
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

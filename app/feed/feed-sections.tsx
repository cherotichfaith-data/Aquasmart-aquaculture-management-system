"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { FeedIncomingWithType, FeedingRecordWithType } from "@/lib/api/reports"
import { LazyRender } from "@/components/shared/lazy-render"
import { formatDateTime } from "./feed-utils"

type EfcrRow = { date: string; label: string; efcr: number }
type EfcrStats = { latest: number | null; best: number | null; avg: number | null; target: number | null; gap: number | null }
type ProteinRow = { feedType: string; proteinContent: number; crudeFat: number; amount: number }
type FeedingTrendRow = { date: string; label: string; feeding: number; expected: number; zScore: number; anomaly: boolean }

const formatNumber = (value: number, decimals = 2) =>
  value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

export function FeedEfcrSection({
  loading,
  efcrChartData,
  efcrStats,
}: {
  loading: boolean
  efcrChartData: EfcrRow[]
  efcrStats: EfcrStats
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">Feed Efficiency Metrics (eFCR)</h2>
      {loading ? (<div className="h-80 flex items-center justify-center text-muted-foreground">Loading eFCR trend...</div>) : efcrChartData.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-md border border-border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Average eFCR</p><p className="text-lg font-semibold">{efcrStats.avg != null ? efcrStats.avg.toFixed(2) : "N/A"}</p></div>
            <div className="rounded-md border border-border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Best (Lowest) eFCR</p><p className="text-lg font-semibold">{efcrStats.best != null ? efcrStats.best.toFixed(2) : "N/A"}</p></div>
            <div className="rounded-md border border-border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Target</p><p className="text-lg font-semibold">{efcrStats.target != null ? efcrStats.target.toFixed(2) : "N/A"}</p></div>
          </div>
          <div className="h-[320px] rounded-md border border-border/80 bg-muted/20 p-2">
            <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={efcrChartData}>
                <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => [`${formatNumber(Number(value), 2)}`, String(name)]}
                  labelFormatter={(_, payload) => String(payload?.[0]?.payload?.date ?? payload?.[0]?.payload?.label ?? "")}
                />
                <Legend />
                {efcrStats.target != null ? (<ReferenceLine y={efcrStats.target} stroke="hsl(var(--chart-4))" strokeDasharray="4 4" label="Target" />) : null}
                <Line type="monotone" dataKey="efcr" stroke="hsl(var(--chart-1))" strokeWidth={2.5} dot={false} name="eFCR" />
                </LineChart>
              </ResponsiveContainer>
            </LazyRender>
          </div>
        </div>
      ) : (<div className="h-80 flex items-center justify-center text-muted-foreground">No eFCR data available</div>)}
    </div>
  )
}

export function FeedNutritionSection({
  loading,
  proteinChartData,
}: {
  loading: boolean
  proteinChartData: ProteinRow[]
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">Feed Protein & Nutritional Analysis</h2>
      {loading ? (<div className="h-80 flex items-center justify-center text-muted-foreground">Loading nutritional analysis...</div>) : proteinChartData.length > 0 ? (
        <div className="h-[320px] rounded-md border border-border/80 bg-muted/20 p-2">
          <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={proteinChartData}>
              <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis dataKey="feedType" />
              <YAxis />
              <Tooltip
                formatter={(value, name) => [`${formatNumber(Number(value), 2)}%`, String(name)]}
                labelFormatter={(_, payload) => String(payload?.[0]?.payload?.feedType ?? "")}
              />
              <Legend />
              <Bar dataKey="proteinContent" fill="hsl(var(--chart-2))" name="Protein %" />
              <Bar dataKey="crudeFat" fill="hsl(var(--chart-3))" name="Crude Fat %" />
              </BarChart>
            </ResponsiveContainer>
          </LazyRender>
        </div>
      ) : (<div className="h-80 flex items-center justify-center text-muted-foreground">No nutrition data available</div>)}
    </div>
  )
}

export function FeedAnomaliesSection({
  loading,
  dailyFeedingTrend,
  anomalyRows,
  onExport,
}: {
  loading: boolean
  dailyFeedingTrend: FeedingTrendRow[]
  anomalyRows: FeedingTrendRow[]
  onExport: () => void
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold">Feeding Trends & Anomalies</h2>
        <button type="button" onClick={onExport} disabled={anomalyRows.length === 0} className="h-9 px-4 rounded-md border border-border text-sm font-semibold disabled:opacity-50">Export Anomaly Report</button>
      </div>
      {loading ? (<div className="h-80 flex items-center justify-center text-muted-foreground">Loading feeding trends...</div>) : dailyFeedingTrend.length > 0 ? (
        <div className="space-y-4">
          <div className="h-[320px] rounded-md border border-border/80 bg-muted/20 p-2">
            <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyFeedingTrend}>
                <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => [`${formatNumber(Number(value), 2)} kg`, String(name)]}
                  labelFormatter={(_, payload) => String(payload?.[0]?.payload?.date ?? payload?.[0]?.payload?.label ?? "")}
                />
                <Legend />
                <Line type="monotone" dataKey="feeding" stroke="hsl(var(--chart-1))" strokeWidth={2.5} name="Actual feed (kg)" />
                <Line type="monotone" dataKey="expected" stroke="hsl(var(--chart-4))" strokeDasharray="4 4" name="Expected feed (kg)" />
                </LineChart>
              </ResponsiveContainer>
            </LazyRender>
          </div>
          <div className="rounded-md border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/60 border-b border-border">
                  <th className="px-4 py-2 text-left font-semibold">Date</th>
                  <th className="px-4 py-2 text-left font-semibold">Actual (kg)</th>
                  <th className="px-4 py-2 text-left font-semibold">Expected (kg)</th>
                  <th className="px-4 py-2 text-left font-semibold">Deviation</th>
                  <th className="px-4 py-2 text-left font-semibold">Z-Score</th>
                  <th className="px-4 py-2 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {anomalyRows.length > 0 ? (
                  anomalyRows.map((row) => (
                    <tr key={row.date} className="border-b border-border/70 hover:bg-muted/35">
                      <td className="px-4 py-2">{row.date}</td>
                      <td className="px-4 py-2">{row.feeding.toFixed(2)}</td>
                      <td className="px-4 py-2">{row.expected.toFixed(2)}</td>
                      <td className="px-4 py-2">{(row.feeding - row.expected).toFixed(2)}</td>
                      <td className="px-4 py-2">{row.zScore.toFixed(2)}</td>
                      <td className="px-4 py-2"><span className="inline-flex rounded-full bg-destructive/15 text-destructive px-2 py-0.5 text-xs font-semibold">Outlier (&gt;2 SD)</span></td>
                    </tr>
                  ))
                ) : (<tr><td colSpan={6} className="px-4 py-4 text-center text-muted-foreground">No anomalies detected in the selected range</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      ) : (<div className="h-80 flex items-center justify-center text-muted-foreground">No feeding trend data available</div>)}
    </div>
  )
}

export function FeedAttentionTable({
  loading,
  attentionFeedingRecords,
  systemNameById,
  batchNameById,
}: {
  loading: boolean
  attentionFeedingRecords: FeedingRecordWithType[]
  systemNameById: Map<number, string>
  batchNameById: Map<number, string>
}) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold">Feeding Log Records Requiring Attention (Fair/Poor)</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/60 border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Timestamp</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">System</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Batch</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Feed Type</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Quantity (kg)</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Response</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (<tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>) : attentionFeedingRecords.length > 0 ? (
              attentionFeedingRecords.map((record) => (
                <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm">{formatDateTime(record.created_at)}</td>
                  <td className="px-4 py-3 text-sm">{systemNameById.get(record.system_id) ?? record.system_id}</td>
                  <td className="px-4 py-3 text-sm">{record.batch_id != null ? batchNameById.get(record.batch_id) ?? `Batch ${record.batch_id}` : "-"}</td>
                  <td className="px-4 py-3 text-sm">{record.feed_type?.label ?? record.feed_type?.feed_line ?? record.feed_type_id}</td>
                  <td className="px-4 py-3 text-sm">{record.feeding_amount}</td>
                  <td className="px-4 py-3 text-sm">{record.feeding_response}</td>
                </tr>
              ))
            ) : (<tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No fair/poor feeding records found for the selected filters</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function FeedIncomingInventoryTable({
  loading,
  filteredIncoming,
}: {
  loading: boolean
  filteredIncoming: FeedIncomingWithType[]
}) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border"><h2 className="font-semibold">Feed Incoming Inventory</h2></div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/60 border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Feed Type</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Category</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Protein %</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Crude Fat %</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Pellet Size</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Amount (kg)</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (<tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>) : filteredIncoming.length > 0 ? (
              filteredIncoming.map((feed) => (
                <tr key={feed.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium">{feed.feed_type?.feed_line ?? `Feed ${feed.feed_type_id ?? "N/A"}`}</td>
                  <td className="px-4 py-3 text-sm">{feed.feed_type?.feed_category ?? "-"}</td>
                  <td className="px-4 py-3 text-sm">{feed.feed_type?.crude_protein_percentage ?? "-"}</td>
                  <td className="px-4 py-3 text-sm">{feed.feed_type?.crude_fat_percentage ?? "-"}</td>
                  <td className="px-4 py-3 text-sm">{feed.feed_type?.feed_pellet_size ?? "-"}</td>
                  <td className="px-4 py-3 text-sm">{feed.feed_amount}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{feed.date}</td>
                </tr>
              ))
            ) : (<tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No feed deliveries found</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

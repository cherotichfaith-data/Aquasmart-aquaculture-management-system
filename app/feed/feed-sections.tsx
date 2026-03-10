"use client"

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { FeedIncomingWithType, FeedingRecordWithType } from "@/lib/api/reports"
import { LazyRender } from "@/components/shared/lazy-render"
import { formatDateTime } from "./feed-utils"

type EfcrRow = { date: string; label: string; efcr: number }
type EfcrStats = { latest: number | null; best: number | null; avg: number | null }
type FeedTypeMixRow = { feedType: string; proteinContent: number; crudeFat: number; amount: number; share: number }
type FeedTypeUsageRow = { date: string; label: string; [key: string]: number | string }
type FeedTypeSeries = { key: string; label: string; color: string }
type InventoryTrendRow = {
  date: string
  label: string
  feeding: number
  expected: number
  feedRate: number | null
  biomass: number
  mortality: number
  mortalityRate: number | null
  feedPerFish: number | null
}
type FeedingAnomalyRow = {
  id: number
  createdAt: string
  date: string
  systemLabel: string
  feedType: string
  amount: number
  response: string
  zScore: number
}
type FeedTrendStats = {
  feedRate: number | null
  biomass: number | null
  mortalityRate: number | null
  feedPer1kFish: number | null
}

const formatNumber = (value: number, decimals = 2) =>
  value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

const formatEfcrDate = (value: string | number) => {
  const parsed = new Date(String(value))
  if (Number.isNaN(parsed.getTime())) return String(value)
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(parsed)
}

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
          </div>
          <div className="h-[320px] rounded-md border border-border/80 bg-muted/20 p-2">
            <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={efcrChartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                  <defs>
                    <linearGradient id="feedEfcrFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.35} />
                  <XAxis dataKey="label" minTickGap={24} />
                  <YAxis width={64} tickFormatter={(value) => formatNumber(Number(value), 2)} />
                  <Tooltip
                    formatter={(value, name) => [`${formatNumber(Number(value), 2)}`, String(name)]}
                    labelFormatter={(label, payload) =>
                      formatEfcrDate(String(payload?.[0]?.payload?.date ?? label))
                    }
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="efcr"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2.6}
                    fill="url(#feedEfcrFill)"
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
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
  feedTypeMix,
  usageTrendRows,
  usageSeries,
}: {
  loading: boolean
  feedTypeMix: FeedTypeMixRow[]
  usageTrendRows: FeedTypeUsageRow[]
  usageSeries: FeedTypeSeries[]
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">Feed Type Mix & Nutritional Analysis</h2>
      {loading ? (
        <div className="h-80 flex items-center justify-center text-muted-foreground">Loading nutritional analysis...</div>
      ) : feedTypeMix.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-[300px] rounded-md border border-border/80 bg-muted/20 p-2">
              {usageTrendRows.length > 0 && usageSeries.length > 0 ? (
                <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={usageTrendRows}>
                      <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip
                        formatter={(value, name) => [`${formatNumber(Number(value), 2)} kg`, String(name)]}
                        labelFormatter={(_, payload) => String(payload?.[0]?.payload?.date ?? payload?.[0]?.payload?.label ?? "")}
                      />
                      <Legend />
                      {usageSeries.map((series) => (
                        <Line
                          key={series.key}
                          type="monotone"
                          dataKey={series.key}
                          name={series.label}
                          stroke={series.color}
                          strokeWidth={2.2}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </LazyRender>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">No feed type usage trend data</div>
              )}
            </div>
            <div className="h-[300px] rounded-md border border-border/80 bg-muted/20 p-2">
              <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={feedTypeMix}>
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
          </div>
          <div className="rounded-md border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/60 border-b border-border">
                  <th className="px-4 py-2 text-left font-semibold">Feed Type</th>
                  <th className="px-4 py-2 text-left font-semibold">Total Used (kg)</th>
                  <th className="px-4 py-2 text-left font-semibold">Share</th>
                  <th className="px-4 py-2 text-left font-semibold">Protein %</th>
                  <th className="px-4 py-2 text-left font-semibold">Crude Fat %</th>
                </tr>
              </thead>
              <tbody>
                {feedTypeMix.map((row) => (
                  <tr key={row.feedType} className="border-b border-border/70 hover:bg-muted/35">
                    <td className="px-4 py-2 font-medium">{row.feedType}</td>
                    <td className="px-4 py-2">{formatNumber(row.amount, 2)}</td>
                    <td className="px-4 py-2">{(row.share * 100).toFixed(1)}%</td>
                    <td className="px-4 py-2">{formatNumber(row.proteinContent, 2)}%</td>
                    <td className="px-4 py-2">{formatNumber(row.crudeFat, 2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="h-80 flex items-center justify-center text-muted-foreground">No nutrition data available</div>
      )}
    </div>
  )
}

export function FeedAnomaliesSection({
  loading,
  trendData,
  anomalyRows,
  trendStats,
  onExport,
}: {
  loading: boolean
  trendData: InventoryTrendRow[]
  anomalyRows: FeedingAnomalyRow[]
  trendStats: FeedTrendStats
  onExport: () => void
}) {
  const TrendTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean
    payload?: Array<{ name: string; value: number; payload: InventoryTrendRow }>
    label?: string
  }) => {
    if (!active || !payload?.length) return null
    const row = payload[0]?.payload
    if (!row) return null
    return (
      <div className="rounded-md border border-border bg-card p-3 text-xs shadow-sm">
        <p className="font-semibold text-foreground mb-2">{label ?? row.date}</p>
        <div className="space-y-1">
          <div>Feeding: {formatNumber(row.feeding, 2)} kg</div>
          <div>Expected: {formatNumber(row.expected, 2)} kg</div>
          <div>Feed rate: {row.feedRate != null ? `${formatNumber(row.feedRate, 2)} kg/t` : "N/A"}</div>
          <div>Biomass: {formatNumber(row.biomass, 1)} kg</div>
          <div>Mortality rate: {row.mortalityRate != null ? `${(row.mortalityRate * 100).toFixed(2)}%` : "N/A"}</div>
          <div>Feed/1k fish: {row.feedPerFish != null ? `${formatNumber(row.feedPerFish * 1000, 2)} kg` : "N/A"}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold">Feeding Trends & Anomalies</h2>
        <button type="button" onClick={onExport} disabled={anomalyRows.length === 0} className="h-9 px-4 rounded-md border border-border text-sm font-semibold disabled:opacity-50">Export Anomaly Report</button>
      </div>
      {trendStats ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Latest Feed Rate</p>
            <p className="text-sm font-semibold">{trendStats.feedRate != null ? `${formatNumber(trendStats.feedRate, 2)} kg/t` : "N/A"}</p>
          </div>
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Latest Biomass</p>
            <p className="text-sm font-semibold">{trendStats.biomass != null ? `${formatNumber(trendStats.biomass, 1)} kg` : "N/A"}</p>
          </div>
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Latest Mortality Rate</p>
            <p className="text-sm font-semibold">{trendStats.mortalityRate != null ? `${(trendStats.mortalityRate * 100).toFixed(2)}%` : "N/A"}</p>
          </div>
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Feed per 1k Fish</p>
            <p className="text-sm font-semibold">{trendStats.feedPer1kFish != null ? `${formatNumber(trendStats.feedPer1kFish, 2)} kg` : "N/A"}</p>
          </div>
        </div>
      ) : null}
      {loading ? (
        <div className="h-80 flex items-center justify-center text-muted-foreground">Loading feeding trends...</div>
      ) : (
        <div className="space-y-4">
          {trendData.length > 0 ? (
            <div className="h-[320px] rounded-md border border-border/80 bg-muted/20 p-2">
              <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip content={<TrendTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="feeding" stroke="hsl(var(--chart-1))" strokeWidth={2.5} name="Actual feed (kg)" />
                  <Line type="monotone" dataKey="expected" stroke="hsl(var(--chart-4))" strokeDasharray="4 4" name="Expected feed (kg)" />
                  </LineChart>
                </ResponsiveContainer>
              </LazyRender>
            </div>
          ) : (
            <div className="h-[320px] flex items-center justify-center text-muted-foreground">No feeding trend data available</div>
          )}
          <div className="rounded-md border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/60 border-b border-border">
                  <th className="px-4 py-2 text-left font-semibold">Timestamp</th>
                  <th className="px-4 py-2 text-left font-semibold">System</th>
                  <th className="px-4 py-2 text-left font-semibold">Feed Type</th>
                  <th className="px-4 py-2 text-left font-semibold">Amount (kg)</th>
                  <th className="px-4 py-2 text-left font-semibold">Response</th>
                  <th className="px-4 py-2 text-left font-semibold">Z-Score</th>
                </tr>
              </thead>
              <tbody>
                {anomalyRows.length > 0 ? (
                  anomalyRows.map((row) => (
                    <tr key={row.id} className="border-b border-border/70 hover:bg-muted/35">
                      <td className="px-4 py-2">{formatDateTime(row.createdAt)}</td>
                      <td className="px-4 py-2">{row.systemLabel}</td>
                      <td className="px-4 py-2">{row.feedType}</td>
                      <td className="px-4 py-2">{row.amount.toFixed(2)}</td>
                      <td className="px-4 py-2">{row.response}</td>
                      <td className="px-4 py-2">{row.zScore.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 text-center text-muted-foreground">No anomalies detected in the selected range</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
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

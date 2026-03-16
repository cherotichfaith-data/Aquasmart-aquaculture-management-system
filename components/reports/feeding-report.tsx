"use client"

import { useMemo, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useFeedingRecords } from "@/lib/hooks/use-reports"
import { useProductionSummary } from "@/lib/hooks/use-production"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { sortByDateAsc } from "@/lib/utils"
import { downloadCsv, printBrandedPdf } from "@/lib/utils/report-export"
import { DataErrorState, DataFetchingBadge, DataUpdatedAt } from "@/components/shared/data-states"
import { LazyRender } from "@/components/shared/lazy-render"
import { getErrorMessage, getQueryResultError } from "@/lib/utils/query-result"

const formatDateLabel = (value: string | number) => {
  const parsed = new Date(String(value))
  if (Number.isNaN(parsed.getTime())) return String(value)
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(parsed)
}

const formatMetric = (value: number | null | undefined, digits = 2) =>
  value == null || Number.isNaN(value)
    ? "N/A"
    : value.toLocaleString(undefined, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })

export default function FeedingReport({
  dateRange,
  systemId,
  batchId,
  farmName,
}: {
  dateRange?: { from: string; to: string }
  systemId?: number
  batchId?: number
  farmName?: string | null
}) {
  const { farmId } = useActiveFarm()
  const chartLimit = 2000
  const [tableLimit, setTableLimit] = useState("100")
  const [showFeedingRecords, setShowFeedingRecords] = useState(false)
  const boundsReady = Boolean(dateRange?.from && dateRange?.to)
  const feedingRecordsQuery = useFeedingRecords({
    systemId,
    batchId,
    limit: chartLimit,
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
    enabled: boundsReady,
  })
  const summaryQuery = useProductionSummary({
    farmId,
    systemId,
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
    limit: chartLimit,
    enabled: boundsReady,
  })
  const tableLimitValue = Number.isFinite(Number(tableLimit)) ? Number(tableLimit) : 100
  const feedingTableQuery = useFeedingRecords({
    systemId,
    batchId,
    limit: tableLimitValue,
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
    enabled: boundsReady && showFeedingRecords,
  })
  const records = feedingRecordsQuery.data?.status === "success" ? feedingRecordsQuery.data.data : []
  const tableRecords = feedingTableQuery.data?.status === "success" ? feedingTableQuery.data.data : []
  const summaryRows = summaryQuery.data?.status === "success" ? summaryQuery.data.data : []
  const loading = feedingRecordsQuery.isLoading
  const tableLoading = feedingTableQuery.isLoading
  const errorMessages = [
    getErrorMessage(feedingRecordsQuery.error),
    getQueryResultError(feedingRecordsQuery.data),
    getErrorMessage(summaryQuery.error),
    getQueryResultError(summaryQuery.data),
    getErrorMessage(feedingTableQuery.error),
    getQueryResultError(feedingTableQuery.data),
  ].filter(Boolean) as string[]
  const latestUpdatedAt = Math.max(
    feedingRecordsQuery.dataUpdatedAt ?? 0,
    summaryQuery.dataUpdatedAt ?? 0,
    feedingTableQuery.dataUpdatedAt ?? 0,
  )
  const chartRecords = useMemo(() => {
    const byDate = new Map<string, number>()
    records.forEach((row) => {
      if (!row.date) return
      byDate.set(row.date, (byDate.get(row.date) ?? 0) + (row.feeding_amount ?? 0))
    })
    return sortByDateAsc(
      Array.from(byDate.entries()).map(([date, feeding_amount]) => ({ date, feeding_amount })),
      (row) => row.date,
    )
  }, [records])
  const efficiencyTrendRows = useMemo(() => {
    const byDate = new Map<string, { weightedEfcr: number; weight: number; fallbackTotal: number; fallbackCount: number }>()
    summaryRows.forEach((row) => {
      if (!row.date || typeof row.efcr_period !== "number") return
      const bucket = byDate.get(row.date) ?? { weightedEfcr: 0, weight: 0, fallbackTotal: 0, fallbackCount: 0 }
      const weight = row.total_feed_amount_period ?? 0
      if (weight > 0) {
        bucket.weightedEfcr += row.efcr_period * weight
        bucket.weight += weight
      } else {
        bucket.fallbackTotal += row.efcr_period
        bucket.fallbackCount += 1
      }
      byDate.set(row.date, bucket)
    })

    return sortByDateAsc(
      Array.from(byDate.entries()).map(([date, bucket]) => ({
        date,
        efcr_period:
          bucket.weight > 0
            ? bucket.weightedEfcr / bucket.weight
            : bucket.fallbackCount > 0
              ? bucket.fallbackTotal / bucket.fallbackCount
              : null,
      })),
      (row) => row.date,
    )
  }, [summaryRows])

  const totalKgFed = useMemo(() => records.reduce((sum, row) => sum + (row.feeding_amount ?? 0), 0), [records])
  const avgProtein = useMemo(() => {
    const weighted = records.reduce(
      (acc, row) => {
        const p = row.feed_type?.crude_protein_percentage
        const amount = row.feeding_amount ?? 0
        if (typeof p === "number") {
          acc.proteinMass += p * amount
          acc.amount += amount
        }
        return acc
      },
      { proteinMass: 0, amount: 0 },
    )
    return weighted.amount > 0 ? weighted.proteinMass / weighted.amount : null
  }, [records])
  const avgEfcr = useMemo(() => {
    const vals = summaryRows.map((row) => row.efcr_period).filter((v): v is number => typeof v === "number")
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }, [summaryRows])
  const biomassGain = useMemo(() => {
    const vals = summaryRows.map((row) => row.biomass_increase_period).filter((v): v is number => typeof v === "number")
    return vals.reduce((a, b) => a + b, 0)
  }, [summaryRows])
  const costPerKgGainDisplay = totalKgFed > 0 && biomassGain > 0 ? "Awaiting cost data" : "N/A"
  const systemBreakdownRows = useMemo(() => {
    const bySystem = new Map<number, { totalKg: number; entries: number; proteinMass: number; proteinWeight: number; lastDate: string | null }>()
    records.forEach((row) => {
      if (row.system_id == null) return
      const bucket = bySystem.get(row.system_id) ?? {
        totalKg: 0,
        entries: 0,
        proteinMass: 0,
        proteinWeight: 0,
        lastDate: null,
      }
      const amount = row.feeding_amount ?? 0
      bucket.totalKg += amount
      bucket.entries += 1
      if (typeof row.feed_type?.crude_protein_percentage === "number") {
        bucket.proteinMass += row.feed_type.crude_protein_percentage * amount
        bucket.proteinWeight += amount
      }
      if (!bucket.lastDate || String(row.date ?? "") > bucket.lastDate) {
        bucket.lastDate = row.date ?? null
      }
      bySystem.set(row.system_id, bucket)
    })
    return Array.from(bySystem.entries())
      .map(([systemId, bucket]) => ({
        systemId,
        totalKg: bucket.totalKg,
        entries: bucket.entries,
        avgProtein: bucket.proteinWeight > 0 ? bucket.proteinMass / bucket.proteinWeight : null,
        lastDate: bucket.lastDate,
      }))
      .sort((left, right) => right.totalKg - left.totalKg)
  }, [records])

  if (errorMessages.length > 0) {
    return (
      <DataErrorState
        title="Unable to load feeding report"
        description={errorMessages[0]}
        onRetry={() => {
          feedingRecordsQuery.refetch()
          summaryQuery.refetch()
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="filter-bar text-xs">
        <DataUpdatedAt updatedAt={latestUpdatedAt} />
        <div className="legend-pills">
          <div className="legend-pill">{records.length} feeding rows</div>
          <div className="legend-pill">{systemBreakdownRows.length} systems in scope</div>
          <DataFetchingBadge isFetching={feedingRecordsQuery.isFetching || summaryQuery.isFetching || feedingTableQuery.isFetching} isLoading={loading} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Feed (kg)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalKgFed.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Within selected period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average eFCR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgEfcr?.toFixed(2) ?? "N/A"}</div>
            <p className="text-xs text-muted-foreground mt-1">From api_production_summary</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Protein (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgProtein?.toFixed(2) ?? "N/A"}</div>
            <p className="text-xs text-muted-foreground mt-1">Weighted by feeding amount</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cost per kg Gain</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{costPerKgGainDisplay}</div>
            <p className="text-xs text-muted-foreground mt-1">Add delivery pricing on incoming feed to unlock this KPI</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feeding Amounts Over Time</CardTitle>
          <CardDescription>Daily feeding records from the backend</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 legend-pills">
            <div className="legend-pill"><span className="legend-pill-swatch bg-[var(--color-chart-1)]" /> Feed (kg)</div>
          </div>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : (
            <div className="h-[300px] rounded-md border border-border/80 bg-muted/20 p-2">
              <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartRecords}>
                  <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.45} />
                  <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip
                    labelFormatter={formatDateLabel}
                    formatter={(value, name) => [`${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`, String(name)]}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: 8 }}
                  />
                  <Line type="monotone" dataKey="feeding_amount" stroke="var(--color-chart-1)" strokeWidth={2.4} name="Feed (kg)" />
                  </LineChart>
                </ResponsiveContainer>
              </LazyRender>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feed Efficiency Trend</CardTitle>
          <CardDescription>Daily eFCR trend for feed analysis reporting.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 legend-pills">
            <div className="legend-pill"><span className="legend-pill-swatch bg-[var(--color-chart-3)]" /> eFCR</div>
          </div>
          <div className="h-[300px] rounded-md border border-border/80 bg-muted/20 p-2">
            <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={efficiencyTrendRows}>
                <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.45} />
                <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <Tooltip
                  labelFormatter={formatDateLabel}
                  formatter={(value, name) => [Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), String(name)]}
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: 8 }}
                />
                <Line type="monotone" dataKey="efcr_period" stroke="var(--color-chart-3)" strokeWidth={2.4} name="eFCR" />
                </LineChart>
              </ResponsiveContainer>
            </LazyRender>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Per-Cage Feed Breakdown</CardTitle>
          <CardDescription>Total feed, entry count, and weighted protein by cage in the selected period.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="dense-table-shell">
            <table className="dense-table">
              <thead>
                <tr className="border-b border-border">
                  <th>System</th>
                  <th>Total Feed (kg)</th>
                  <th>Entries</th>
                  <th>Avg Protein (%)</th>
                  <th>Last Feed Date</th>
                </tr>
              </thead>
              <tbody>
                {systemBreakdownRows.length > 0 ? (
                  systemBreakdownRows.map((row) => (
                    <tr key={row.systemId} className="border-b border-border/70 hover:bg-muted/35">
                      <td className="font-medium">System {row.systemId}</td>
                      <td>{formatMetric(row.totalKg)}</td>
                      <td>{row.entries}</td>
                      <td>{formatMetric(row.avgProtein)}</td>
                      <td>{row.lastDate ?? "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-center text-muted-foreground">
                      No cage-level feeding rows found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Feeding Records</CardTitle>
              <CardDescription>Operational detail rows and export controls for the selected scope.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="filter-bar">
            <div className="legend-pills">
              <div className="legend-pill">{showFeedingRecords ? "Detailed table visible" : "Detailed table hidden"}</div>
              <div className="legend-pill">Max rows {tableLimitValue}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={tableLimit}
                onChange={(event) => setTableLimit(event.target.value)}
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm font-medium"
                aria-label="Rows to display"
              >
                <option value="50">50 rows</option>
                <option value="100">100 rows</option>
                <option value="250">250 rows</option>
              </select>
              <button
                type="button"
                className="h-10 rounded-xl border border-input px-3 text-sm hover:bg-muted/40"
                onClick={() => setShowFeedingRecords((prev) => !prev)}
              >
                {showFeedingRecords ? "Hide details" : "View details"}
              </button>
              <button
                type="button"
                className="h-10 rounded-xl border border-input px-3 text-sm hover:bg-muted/40"
                onClick={() =>
                  downloadCsv({
                    filename: `feed-analysis-${dateRange?.from ?? "start"}-to-${dateRange?.to ?? "end"}.csv`,
                    headers: ["date", "system_id", "batch_id", "feed_type", "feeding_amount", "feeding_response", "crude_protein_percentage"],
                    rows: (showFeedingRecords ? tableRecords : records.slice(0, tableLimitValue)).map((row) => [
                      row.date,
                      row.system_id,
                      row.batch_id,
                      row.feed_type?.feed_line ?? row.feed_type_id,
                      row.feeding_amount,
                      row.feeding_response,
                      row.feed_type?.crude_protein_percentage,
                    ]),
                  })
                }
              >
                Export CSV
              </button>
              <button
                type="button"
                className="h-10 rounded-xl border border-input px-3 text-sm hover:bg-muted/40"
                onClick={() =>
                  printBrandedPdf({
                    title: "Feed Analysis Report",
                    subtitle: "Consumption and efficiency analysis",
                    farmName,
                    dateRange,
                    summaryLines: [
                      `Total kg fed: ${totalKgFed.toFixed(2)}`,
                      `Average eFCR: ${avgEfcr?.toFixed(2) ?? "N/A"}`,
                      `Average protein (%): ${avgProtein?.toFixed(2) ?? "N/A"}`,
                      `Biomass gain (kg): ${biomassGain.toFixed(2)}`,
                    ],
                    tableHeaders: ["Date", "System", "Batch", "Feed Type", "Amount (kg)", "Response", "Protein (%)"],
                    tableRows: (showFeedingRecords ? tableRecords : records.slice(0, tableLimitValue)).map((row) => [
                      row.date,
                      row.system_id,
                      row.batch_id ?? "-",
                      row.feed_type?.feed_line ?? row.feed_type_id,
                      row.feeding_amount,
                      row.feeding_response,
                      row.feed_type?.crude_protein_percentage ?? "-",
                    ]),
                    commentary: "Cost per kg gain is not computed because feed cost fields are not available in current schema.",
                  })
                }
              >
                Export PDF
              </button>
            </div>
          </div>
          {showFeedingRecords ? (
            <div className="dense-table-shell">
              <table className="dense-table">
              <thead>
                <tr className="border-b border-border">
                  <th>Date</th>
                  <th>System</th>
                  <th>Batch</th>
                  <th>Feed Type</th>
                  <th>Amount (kg)</th>
                  <th>Response</th>
                </tr>
              </thead>
              <tbody>
                {tableLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 text-center text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : tableRecords.length > 0 ? (
                  tableRecords.map((row) => (
                    <tr key={row.id} className="border-b border-border/70 hover:bg-muted/35">
                      <td className="font-medium">{row.date}</td>
                      <td>{row.system_id}</td>
                      <td>{row.batch_id ?? "-"}</td>
                      <td>{row.feed_type?.feed_line ?? row.feed_type_id}</td>
                      <td>{row.feeding_amount}</td>
                      <td>{row.feeding_response}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 text-center text-muted-foreground">
                      No feeding records found
                    </td>
                  </tr>
                )}
              </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              Detailed records hidden. Click <span className="font-medium text-foreground">View details</span> to show up to {tableLimitValue} rows.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

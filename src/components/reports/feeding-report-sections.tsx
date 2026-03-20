"use client"

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DataFetchingBadge, DataUpdatedAt } from "@/components/shared/data-states"
import { LazyRender } from "@/components/shared/lazy-render"
import { downloadCsv, printBrandedPdf } from "@/lib/utils/report-export"
import { formatChartDate, formatNumberValue } from "@/lib/analytics-format"
import { ReportRecordsHiddenState, ReportRecordsToolbar } from "./report-shared"

export function FeedingStatusRow({
  latestUpdatedAt,
  recordsCount,
  systemCount,
  isFetching,
  isLoading,
}: {
  latestUpdatedAt: number
  recordsCount: number
  systemCount: number
  isFetching: boolean
  isLoading: boolean
}) {
  return (
    <div className="filter-bar text-xs">
      <DataUpdatedAt updatedAt={latestUpdatedAt} />
      <div className="legend-pills">
        <div className="legend-pill">{recordsCount} feeding rows</div>
        <div className="legend-pill">{systemCount} systems in scope</div>
        <DataFetchingBadge isFetching={isFetching} isLoading={isLoading} />
      </div>
    </div>
  )
}

export function FeedingSummaryCards({
  totalKgFed,
  avgEfcr,
  avgProtein,
  costPerKgGainDisplay,
}: {
  totalKgFed: number
  avgEfcr: number | null
  avgProtein: number | null
  costPerKgGainDisplay: string
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Feed (kg)</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{totalKgFed.toFixed(2)}</div><p className="text-xs text-muted-foreground mt-1">Within selected period</p></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Average eFCR</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{avgEfcr?.toFixed(2) ?? "N/A"}</div><p className="text-xs text-muted-foreground mt-1">From production rows with resolved timelines</p></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Avg Protein (%)</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{avgProtein?.toFixed(2) ?? "N/A"}</div><p className="text-xs text-muted-foreground mt-1">Weighted by feeding amount</p></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Cost per kg Gain</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{costPerKgGainDisplay}</div><p className="text-xs text-muted-foreground mt-1">Add delivery pricing on incoming feed to unlock this KPI</p></CardContent></Card>
    </div>
  )
}

export function FeedingTrendSection({
  title,
  description,
  legendLabel,
  stroke,
  loading,
  rows,
  dataKey,
  valueSuffix,
  name,
}: {
  title: string
  description: string
  legendLabel: string
  stroke: string
  loading: boolean
  rows: any[]
  dataKey: string
  valueSuffix: string
  name: string
}) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
      <CardContent>
        <div className="mb-4 legend-pills">
          <div className="legend-pill"><span className="legend-pill-swatch" style={{ backgroundColor: stroke }} /> {legendLabel}</div>
        </div>
        <div className="h-[300px] rounded-md border border-border/80 bg-muted/20 p-2">
          <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows}>
                <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.45} />
                <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <Tooltip labelFormatter={(label) => formatChartDate(label)} formatter={(value, tooltipName) => [`${formatNumberValue(Number(value), { decimals: 2, minimumDecimals: 2 })}${valueSuffix}`, String(tooltipName)]} contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: 8 }} />
                <Line type="monotone" dataKey={dataKey} stroke={stroke} strokeWidth={2.4} name={name} />
              </LineChart>
            </ResponsiveContainer>
          </LazyRender>
        </div>
      </CardContent>
    </Card>
  )
}

export function FeedingBreakdownSection({ rows }: { rows: any[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Per-Cage Feed Breakdown</CardTitle><CardDescription>Total feed, entry count, and weighted protein by cage in the selected period.</CardDescription></CardHeader>
      <CardContent>
        <div className="dense-table-shell">
          <table className="dense-table">
            <thead><tr className="border-b border-border"><th>System</th><th>Total Feed (kg)</th><th>Entries</th><th>Avg Protein (%)</th><th>Last Feed Date</th></tr></thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((row) => (
                  <tr key={row.systemId} className="border-b border-border/70 hover:bg-muted/35">
                    <td className="font-medium">System {row.systemId}</td><td>{formatNumberValue(row.totalKg, { decimals: 2, minimumDecimals: 2, fallback: "N/A" })}</td><td>{row.entries}</td><td>{formatNumberValue(row.avgProtein, { decimals: 2, minimumDecimals: 2, fallback: "N/A" })}</td><td>{row.lastDate ?? "-"}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="px-4 py-4 text-center text-muted-foreground">No cage-level feeding rows found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

export function FeedingRecordsSection({
  tableLimit,
  onTableLimitChange,
  showFeedingRecords,
  onToggleRecords,
  dateRange,
  farmName,
  totalKgFed,
  avgEfcr,
  avgProtein,
  biomassGain,
  tableRecords,
  records,
  tableLimitValue,
  tableLoading,
}: {
  tableLimit: string
  onTableLimitChange: (value: string) => void
  showFeedingRecords: boolean
  onToggleRecords: () => void
  dateRange?: { from: string; to: string }
  farmName?: string | null
  totalKgFed: number
  avgEfcr: number | null
  avgProtein: number | null
  biomassGain: number
  tableRecords: any[]
  records: any[]
  tableLimitValue: number
  tableLoading: boolean
}) {
  const exportRows = (showFeedingRecords ? tableRecords : records.slice(0, tableLimitValue)).map((row) => [
    row.date,
    row.system_id,
    row.batch_id,
    row.feed_type?.feed_line ?? row.feed_type_id,
    row.feeding_amount,
    row.feeding_response,
    row.feed_type?.crude_protein_percentage,
  ])
  return (
    <Card>
      <CardHeader><CardTitle>Feeding Records</CardTitle><CardDescription>Operational detail rows and export controls for the selected scope.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="filter-bar">
          <div className="legend-pills">
            <div className="legend-pill">{showFeedingRecords ? "Detailed table visible" : "Detailed table hidden"}</div>
            <div className="legend-pill">Max rows {tableLimitValue}</div>
          </div>
          <ReportRecordsToolbar
            tableLimit={tableLimit}
            onTableLimitChange={onTableLimitChange}
            showRecords={showFeedingRecords}
            onToggleRecords={onToggleRecords}
            compact
            onExportCsv={() =>
              downloadCsv({
                filename: `feed-analysis-${dateRange?.from ?? "start"}-to-${dateRange?.to ?? "end"}.csv`,
                headers: ["date", "system_id", "batch_id", "feed_type", "feeding_amount", "feeding_response", "crude_protein_percentage"],
                rows: exportRows,
              })
            }
            onExportPdf={() =>
              printBrandedPdf({
                title: "Feed Analysis Report",
                subtitle: "Consumption and efficiency analysis",
                farmName,
                dateRange,
                summaryLines: [`Total kg fed: ${totalKgFed.toFixed(2)}`, `Average eFCR: ${avgEfcr?.toFixed(2) ?? "N/A"}`, `Average protein (%): ${avgProtein?.toFixed(2) ?? "N/A"}`, `Biomass gain (kg): ${biomassGain.toFixed(2)}`],
                tableHeaders: ["Date", "System", "Batch", "Feed Type", "Amount (kg)", "Response", "Protein (%)"],
                tableRows: exportRows.map((row) => [row[0], row[1], row[2] ?? "-", row[3], row[4], row[5], row[6] ?? "-"]),
                commentary: "Cost per kg gain is not computed because feed cost fields are not available in current schema.",
              })
            }
          />
        </div>
        {showFeedingRecords ? (
          <div className="dense-table-shell">
            <table className="dense-table">
              <thead><tr className="border-b border-border"><th>Date</th><th>System</th><th>Batch</th><th>Feed Type</th><th>Amount (kg)</th><th>Response</th></tr></thead>
              <tbody>
                {tableLoading ? (
                  <tr><td colSpan={6} className="px-4 py-4 text-center text-muted-foreground">Loading...</td></tr>
                ) : tableRecords.length > 0 ? (
                  tableRecords.map((row) => (
                    <tr key={row.id} className="border-b border-border/70 hover:bg-muted/35">
                      <td className="font-medium">{row.date}</td><td>{row.system_id}</td><td>{row.batch_id ?? "-"}</td><td>{row.feed_type?.feed_line ?? row.feed_type_id}</td><td>{row.feeding_amount}</td><td>{row.feeding_response}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={6} className="px-4 py-4 text-center text-muted-foreground">No feeding records found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <ReportRecordsHiddenState label={`up to ${tableLimitValue} rows`} />
        )}
      </CardContent>
    </Card>
  )
}

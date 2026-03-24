"use client"

import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/data-states"
import { LazyRender } from "@/components/shared/lazy-render"
import { downloadCsv, printBrandedPdf } from "@/lib/utils/report-export"
import { formatChartDate } from "@/lib/analytics-format"
import { ReportRecordsHiddenState, ReportRecordsToolbar, ReportSectionHeader } from "./report-shared"

export function MortalitySummaryCards({
  latestDate,
  totalMortality,
  mortalityPercent,
  massEventCount,
}: {
  latestDate?: string
  totalMortality: number
  mortalityPercent: number | null
  massEventCount: number
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Latest Record</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{latestDate ?? "N/A"}</div><p className="text-xs text-muted-foreground mt-1">Most recent record</p></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Mortality</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{totalMortality}</div><p className="text-xs text-muted-foreground mt-1">Selected period</p></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Mortality %</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{mortalityPercent != null ? `${mortalityPercent.toFixed(2)}%` : "N/A"}</div><p className="text-xs text-muted-foreground mt-1">Against inventory baseline</p></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Mass Events</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{massEventCount}</div><p className="text-xs text-muted-foreground mt-1">Dead count &ge; 100 fish</p></CardContent></Card>
    </div>
  )
}

export function MortalityTrendSection({ loading, chartRows }: { loading: boolean; chartRows: any[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Mortality Trend</CardTitle><CardDescription>Daily mortality counts from mortality records</CardDescription></CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading...</div>
        ) : chartRows.length === 0 ? (
          <EmptyState title="No mortality records" description="No mortality records fall within the selected range." />
        ) : (
          <div className="h-[300px] rounded-md border border-border/80 bg-muted/20 p-2">
            <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartRows}>
                  <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.45} />
                  <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip labelFormatter={(label) => formatChartDate(label)} formatter={(value, name) => [Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 }), String(name)]} contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: 8 }} />
                  <Legend />
                  <Line type="monotone" dataKey="dead_count" stroke="var(--color-destructive)" strokeWidth={2.4} name="Mortality Count" />
                </LineChart>
              </ResponsiveContainer>
            </LazyRender>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function MortalityCauseSections({ causeBreakdown }: { causeBreakdown: Array<{ cause: string; label: string; count: number }> }) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
      <Card>
        <CardHeader><CardTitle>Cause Breakdown</CardTitle><CardDescription>Actual mortality causes captured on mortality records</CardDescription></CardHeader>
        <CardContent>
          {causeBreakdown.length === 0 ? (
            <EmptyState title="No cause data" description="New mortality records with cause tags will appear here." />
          ) : (
            <div className="h-[280px] rounded-md border border-border/80 bg-muted/20 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={causeBreakdown}>
                  <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.45} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={70} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => [Number(value).toLocaleString(), "Dead count"]} />
                  <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Cause Summary</CardTitle><CardDescription>Count of fish lost per reported cause</CardDescription></CardHeader>
        <CardContent>
          {causeBreakdown.length === 0 ? (
            <EmptyState title="No cause summary" description="No cause-tagged mortality records found." />
          ) : (
            <div className="space-y-2">
              {causeBreakdown.map((row) => (
                <div key={row.cause} className="flex justify-between rounded-md border border-border/80 px-3 py-2 text-sm">
                  <span>{row.label}</span><span className="font-medium">{row.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function MortalityRecordsSection({
  tableLimit,
  onTableLimitChange,
  showMortalityRecords,
  onToggleRecords,
  dateRange,
  farmName,
  totalMortality,
  mortalityPercent,
  causeBreakdown,
  tableRows,
  rows,
  tableLimitValue,
  tableLoading,
  causeLabels,
}: {
  tableLimit: string
  onTableLimitChange: (value: string) => void
  showMortalityRecords: boolean
  onToggleRecords: () => void
  dateRange?: { from: string; to: string }
  farmName?: string | null
  totalMortality: number
  mortalityPercent: number | null
  causeBreakdown: Array<{ label: string; count: number }>
  tableRows: any[]
  rows: any[]
  tableLimitValue: number
  tableLoading: boolean
  causeLabels: Record<string, string>
}) {
  const exportRows = (showMortalityRecords ? tableRows : rows.slice(0, tableLimitValue)).map((row) => [
    row.date,
    row.system_id,
    row.batch_id,
    row.number_of_fish_mortality,
    row.cause,
    row.notes ?? "",
  ])
  return (
    <Card>
      <ReportSectionHeader
        title="Mortality Records"
        actions={
          <ReportRecordsToolbar
            tableLimit={tableLimit}
            onTableLimitChange={onTableLimitChange}
            showRecords={showMortalityRecords}
            onToggleRecords={onToggleRecords}
            onExportCsv={() =>
              downloadCsv({
                filename: `mortality-analysis-${dateRange?.from ?? "start"}-to-${dateRange?.to ?? "end"}.csv`,
                headers: ["date", "system_id", "batch_id", "number_of_fish_mortality", "cause", "notes"],
                rows: exportRows,
              })
            }
            onExportPdf={() =>
              printBrandedPdf({
                title: "Mortality Analysis Report",
                subtitle: "Mortality timeline and recorded cause breakdown",
                farmName,
                dateRange,
                summaryLines: [`Total mortality count: ${totalMortality}`, `Mortality percentage: ${mortalityPercent != null ? `${mortalityPercent.toFixed(2)}%` : "N/A"}`, ...causeBreakdown.map((row) => `${row.label}: ${row.count}`)],
                tableHeaders: ["Date", "System", "Batch", "Fish Dead", "Cause"],
                tableRows: exportRows.map((row) => [row[0], row[1], row[2] ?? "-", row[3], causeLabels[String(row[4])] ?? row[4]]),
                commentary: "Cause breakdown is sourced directly from fish_mortality.",
              })
            }
          />
        }
      />
      <CardContent>
        {showMortalityRecords ? (
          <div className="overflow-x-auto rounded-md border border-border/80">
            <table className="w-full min-w-[720px] text-sm">
              <thead><tr className="border-b border-border bg-muted/60"><th className="px-4 py-2 text-left font-semibold text-foreground">Date</th><th className="px-4 py-2 text-left font-semibold text-foreground">System</th><th className="px-4 py-2 text-left font-semibold text-foreground">Batch</th><th className="px-4 py-2 text-left font-semibold text-foreground">Fish Dead</th><th className="px-4 py-2 text-left font-semibold text-foreground">Cause</th><th className="px-4 py-2 text-left font-semibold text-foreground">Notes</th></tr></thead>
              <tbody>
                {tableLoading ? (
                  <tr><td colSpan={6} className="px-4 py-4 text-center text-muted-foreground">Loading...</td></tr>
                ) : tableRows.length > 0 ? (
                  tableRows.map((row) => (
                    <tr key={row.id} className="border-b border-border/70 hover:bg-muted/35">
                      <td className="px-4 py-2 font-medium">{row.date}</td><td className="px-4 py-2">{row.system_id}</td><td className="px-4 py-2">{row.batch_id ?? "-"}</td><td className="px-4 py-2">{row.number_of_fish_mortality}</td><td className="px-4 py-2">{causeLabels[row.cause] ?? row.cause}</td><td className="px-4 py-2">{row.notes?.trim() || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={6} className="px-4 py-4 text-center text-muted-foreground">No mortality records found</td></tr>
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

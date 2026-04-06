"use client"

import { useMemo } from "react"
import type { ChartData, ChartOptions } from "chart.js"
import { Bar, Line } from "@/components/charts/chartjs"
import {
  buildCartesianOptions,
  buildDailyDateDomain,
  buildMetricAxisBounds,
  getChartPalette,
  getDateAxisMaxTicks,
} from "@/components/charts/chartjs-theme"
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
  const palette = getChartPalette()
  const dateDomain = useMemo(() => buildDailyDateDomain(chartRows.map((row) => row.date)), [chartRows])
  const rowsByDate = useMemo(() => new Map(chartRows.map((row) => [row.date, row])), [chartRows])
  const yBounds = useMemo(
    () => buildMetricAxisBounds(chartRows.map((row) => row.dead_count), { includeZero: true }),
    [chartRows],
  )
  const xLimit = getDateAxisMaxTicks(dateDomain.length)
  const data = useMemo<ChartData<"line">>(
    () => ({
      labels: dateDomain,
      datasets: [
        {
          label: "Mortality Count",
          data: dateDomain.map((date) => rowsByDate.get(date)?.dead_count ?? null),
          borderColor: palette.destructive,
          backgroundColor: palette.destructive,
          borderWidth: 2.4,
          pointRadius: 0,
          spanGaps: true,
        },
      ],
    }),
    [dateDomain, palette.destructive, rowsByDate],
  )
  const options = useMemo<ChartOptions<"line">>(
    () =>
      buildCartesianOptions({
        palette,
        legend: true,
        min: yBounds.min,
        max: yBounds.max,
        xMaxTicksLimit: xLimit,
        yTickFormatter: (value) => Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 }),
        tooltip: {
          callbacks: {
            title: (items: any) => formatChartDate(String(dateDomain[items[0]?.dataIndex ?? 0] ?? "")),
            label: (context: any) => `${context.dataset.label}: ${Number(context.parsed.y).toLocaleString()}`,
          },
        },
        xTickFormatter: (_value, index) =>
          formatChartDate(String(dateDomain[index] ?? ""), { month: "short", day: "numeric" }),
      }),
    [dateDomain, palette, xLimit, yBounds.max, yBounds.min],
  )

  return (
    <Card>
      <CardHeader><CardTitle>Mortality Trend</CardTitle><CardDescription>Daily mortality counts from mortality records</CardDescription></CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading...</div>
        ) : chartRows.length === 0 ? (
          <EmptyState title="No mortality records" description="No mortality records fall within the selected range." />
        ) : (
          <div className="chart-canvas-shell h-[300px]">
            <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
              <Line data={data} options={options} />
            </LazyRender>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function MortalityCauseSections({ causeBreakdown }: { causeBreakdown: Array<{ cause: string; label: string; count: number }> }) {
  const palette = getChartPalette()
  const data = useMemo<ChartData<"bar">>(
    () => ({
      labels: causeBreakdown.map((row) => row.label),
      datasets: [
        {
          label: "Dead count",
          data: causeBreakdown.map((row) => row.count),
          backgroundColor: palette.destructive,
          borderColor: palette.destructive,
          borderWidth: 0,
        },
      ],
    }),
    [causeBreakdown, palette.destructive],
  )
  const maxValue = Math.max(10, ...causeBreakdown.map((row) => row.count))
  const options = useMemo<ChartOptions<"bar">>(
    () =>
      buildCartesianOptions({
        palette,
        min: 0,
        max: Math.ceil(maxValue * 1.1),
        yTickFormatter: (value) => Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 }),
        tooltip: {
          callbacks: {
            label: (context: any) => `Dead count: ${Number(context.parsed.y).toLocaleString()}`,
          },
        },
      }),
    [maxValue, palette],
  )

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
      <Card>
        <CardHeader><CardTitle>Cause Breakdown</CardTitle><CardDescription>Actual mortality causes captured on mortality records</CardDescription></CardHeader>
        <CardContent>
          {causeBreakdown.length === 0 ? (
            <EmptyState title="No cause data" description="New mortality records with cause tags will appear here." />
          ) : (
            <div className="chart-canvas-shell h-[280px]">
              <Bar data={data} options={options} />
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
                <div key={row.cause} className="soft-panel-subtle flex justify-between px-3 py-2 text-sm">
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
          <div className="soft-table-shell">
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

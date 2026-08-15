"use client"

import { useMemo } from "react"
import type { ChartData, ChartOptions, TooltipItem } from "chart.js"
import { Bar, Line } from "@/components/charts/chartjs"
import {
  buildCartesianOptions,
  buildDailyDateDomain,
  getChartPalette,
  getDateAxisMaxTicks,
} from "@/components/charts/chartjs-theme"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/app-ui/card"
import { EmptyState } from "@/components/shared/data-states"
import { LazyRender } from "@/components/shared/lazy-render"
import { downloadCsv, printBrandedPdf } from "@/lib/utils/report-export"
import { formatChartDate } from "@/lib/analytics-format"
import {
  REPORT_CHART_SHELL_CLASS,
  REPORT_SURFACE_CARD_CLASS,
  REPORT_TABLE_SHELL_CLASS,
  ReportMetricCard,
  ReportRecordsHiddenState,
  ReportRecordsToolbar,
  ReportSectionHeader,
} from "./report-shared"

type MortalityTrendRow = {
  date: string
  dead_count: number | null
}

type MortalityRecordRow = {
  id: string | number
  date: string | null
  system_id: number | null
  batch_id: number | null
  number_of_fish_mortality: number | null
  cause: string
  notes?: string | null
}

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
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <ReportMetricCard title="Latest Record" value={latestDate ?? "N/A"} meta="Most recent mortality record in scope." />
      <ReportMetricCard title="Total Mortality" value={totalMortality.toLocaleString()} meta="Total fish lost in the selected period." />
      <ReportMetricCard
        title="Mortality %"
        value={mortalityPercent != null ? `${mortalityPercent.toFixed(2)}%` : "N/A"}
        meta="Mortality measured against the available inventory baseline."
      />
      <ReportMetricCard title="Mass Events" value={massEventCount.toLocaleString()} meta="Events with dead count at or above 100 fish." />
    </div>
  )
}

export function MortalityTrendSection({ loading, chartRows }: { loading: boolean; chartRows: MortalityTrendRow[] }) {
  const palette = getChartPalette()
  const dateDomain = useMemo(() => buildDailyDateDomain(chartRows.map((row) => row.date)), [chartRows])
  const rowsByDate = useMemo(() => new Map(chartRows.map((row) => [row.date, row])), [chartRows])
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
        xMaxTicksLimit: xLimit,
        xTitle: "Date",
        yTitle: "Mortality (fish)",
        yTickFormatter: (value) => Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 }),
        tooltip: {
          callbacks: {
            title: (items: TooltipItem<"line">[]) => formatChartDate(String(dateDomain[items[0]?.dataIndex ?? 0] ?? "")),
            label: (context: TooltipItem<"line">) => `${context.dataset.label}: ${Number(context.parsed.y).toLocaleString()}`,
          },
        },
        xTickFormatter: (_value, index) =>
          formatChartDate(String(dateDomain[index] ?? ""), { month: "short", day: "numeric" }),
      }),
    [dateDomain, palette, xLimit],
  )

  return (
    <Card className={REPORT_SURFACE_CARD_CLASS}>
      <CardHeader><CardTitle>Mortality Trend</CardTitle><CardDescription>Daily mortality counts from mortality records</CardDescription></CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading...</div>
        ) : chartRows.length === 0 ? (
          <EmptyState title="No mortality records" description="No mortality records fall within the selected range." />
        ) : (
          <div className={REPORT_CHART_SHELL_CLASS}>
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
  const options = useMemo<ChartOptions<"bar">>(
    () =>
      buildCartesianOptions({
        palette,
        xTitle: "Cause",
        yTitle: "Mortality (fish)",
        yTickFormatter: (value) => Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 }),
        tooltip: {
          callbacks: {
            label: (context: TooltipItem<"bar">) => `Dead count: ${Number(context.parsed.y).toLocaleString()}`,
          },
        },
      }),
    [palette],
  )

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
      <Card className={REPORT_SURFACE_CARD_CLASS}>
        <CardHeader><CardTitle>Cause Breakdown</CardTitle><CardDescription>Actual mortality causes captured on mortality records</CardDescription></CardHeader>
        <CardContent>
          {causeBreakdown.length === 0 ? (
            <EmptyState title="No cause data" description="New mortality records with cause tags will appear here." />
          ) : (
            <div className={REPORT_CHART_SHELL_CLASS}>
              <Bar data={data} options={options} />
            </div>
          )}
        </CardContent>
      </Card>
      <Card className={REPORT_SURFACE_CARD_CLASS}>
        <CardHeader><CardTitle>Cause Summary</CardTitle><CardDescription>Count of fish lost per reported cause</CardDescription></CardHeader>
        <CardContent>
          {causeBreakdown.length === 0 ? (
            <EmptyState title="No cause summary" description="No cause-tagged mortality records found." />
          ) : (
            <div className="space-y-2">
              {causeBreakdown.map((row) => (
                <div key={row.cause} className="flex justify-between rounded-2xl border border-border/60 bg-background px-3 py-2 text-sm">
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
  tableRows: MortalityRecordRow[]
  rows: MortalityRecordRow[]
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
    <Card className={REPORT_SURFACE_CARD_CLASS}>
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
          <div className={REPORT_TABLE_SHELL_CLASS}>
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


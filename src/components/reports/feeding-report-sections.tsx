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
import { DataFetchingBadge, DataUpdatedAt } from "@/components/shared/data-states"
import { LazyRender } from "@/components/shared/lazy-render"
import { downloadCsv, printBrandedPdf } from "@/lib/utils/report-export"
import { formatChartDate, formatNumberValue } from "@/lib/analytics-format"
import { ReportRecordsHiddenState, ReportRecordsToolbar } from "./report-shared"

type CageSeries = {
  key: string
  label: string
  color: string
}

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
        <div className="legend-pill">{systemCount} cages in scope</div>
        <DataFetchingBadge isFetching={isFetching} isLoading={isLoading} />
      </div>
    </div>
  )
}

export function FeedingSummaryCards({
  totalKgFed,
  avgEfcr,
  avgProtein,
}: {
  totalKgFed: number
  avgEfcr: number | null
  avgProtein: number | null
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Feed (kg)</CardTitle></CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumberValue(totalKgFed, { decimals: 2, minimumDecimals: 2, fallback: "0.00" })}</div>
          <p className="mt-1 text-xs text-muted-foreground">Within selected period</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Average eFCR</CardTitle></CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumberValue(avgEfcr, { decimals: 2, minimumDecimals: 2, fallback: "N/A" })}</div>
          <p className="mt-1 text-xs text-muted-foreground">Weighted from in-period `api_production_summary` eFCR rows</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Avg Protein (%)</CardTitle></CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumberValue(avgProtein, { decimals: 2, minimumDecimals: 2, fallback: "N/A" })}</div>
          <p className="mt-1 text-xs text-muted-foreground">Weighted by feed amount using joined `feed_type.crude_protein_percentage`</p>
        </CardContent>
      </Card>
    </div>
  )
}

function EmptyChartState({ label }: { label: string }) {
  return <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">{label}</div>
}

export function FeedByCageSection({
  loading,
  rows,
  cageSeries,
}: {
  loading: boolean
  rows: Array<Record<string, number | string>>
  cageSeries: CageSeries[]
}) {
  const palette = getChartPalette()
  const dateDomain = useMemo(() => buildDailyDateDomain(rows.map((row) => String(row.date ?? ""))), [rows])
  const rowsByDate = useMemo(
    () => new Map(rows.map((row) => [String(row.date ?? ""), row])),
    [rows],
  )
  const xLimit = getDateAxisMaxTicks(dateDomain.length)
  const data = useMemo<ChartData<"bar">>(
    () => ({
      labels: dateDomain,
      datasets: cageSeries.map((series) => ({
        label: series.label,
        data: dateDomain.map((date) => Number(rowsByDate.get(date)?.[series.key] ?? 0)),
        backgroundColor: series.color,
        borderColor: series.color,
        borderWidth: 0,
        stack: "feed",
      })),
    }),
    [cageSeries, dateDomain, rowsByDate],
  )
  const options = useMemo<ChartOptions<"bar">>(
    () =>
      buildCartesianOptions({
        palette,
        legend: true,
        stacked: true,
        min: 0,
        xMaxTicksLimit: xLimit,
        yTickFormatter: (value) => formatNumberValue(Number(value), { decimals: 1, minimumDecimals: 1 }),
        tooltip: {
          callbacks: {
            title: (items: any) => formatChartDate(String(dateDomain[items[0]?.dataIndex ?? 0] ?? "")),
            label: (context: any) =>
              `${context.dataset.label}: ${formatNumberValue(Number(context.parsed.y), {
                decimals: 2,
                minimumDecimals: 2,
              })} kg`,
          },
        },
        xTickFormatter: (_value, index) =>
          formatChartDate(String(dateDomain[index] ?? ""), { month: "short", day: "numeric" }),
      }),
    [dateDomain, palette, xLimit],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feed by Cage Over Time</CardTitle>
        <CardDescription>Stacked feed kilograms by date bucket and cage.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <EmptyChartState label="Loading..." />
        ) : rows.length === 0 ? (
          <EmptyChartState label="No feeding rows found for the selected period." />
        ) : (
          <div className="chart-canvas-shell h-[320px]">
            <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
              <Bar data={data} options={options} />
            </LazyRender>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function EfcrByCageSection({
  loading,
  rows,
  cageSeries,
}: {
  loading: boolean
  rows: Array<Record<string, number | string | null>>
  cageSeries: CageSeries[]
}) {
  const palette = getChartPalette()
  const dateDomain = useMemo(() => buildDailyDateDomain(rows.map((row) => String(row.date ?? ""))), [rows])
  const rowsByDate = useMemo(
    () => new Map(rows.map((row) => [String(row.date ?? ""), row])),
    [rows],
  )
  const yBounds = useMemo(
    () =>
      buildMetricAxisBounds(
        rows.flatMap((row) => cageSeries.map((series) => {
          const value = row[series.key]
          return value == null ? null : Number(value)
        })),
        { minFloor: 0, trimOutliers: true },
      ),
    [cageSeries, rows],
  )
  const xLimit = getDateAxisMaxTicks(dateDomain.length)
  const data = useMemo<ChartData<"line">>(
    () => ({
      labels: dateDomain,
      datasets: cageSeries.map((series) => ({
        label: series.label,
        data: dateDomain.map((date) => {
          const value = rowsByDate.get(date)?.[series.key]
          return value == null ? null : Number(value)
        }),
        borderColor: series.color,
        backgroundColor: series.color,
        borderWidth: 1.8,
        pointRadius: 2,
        pointHoverRadius: 4,
        spanGaps: true,
      })),
    }),
    [cageSeries, dateDomain, rowsByDate],
  )
  const options = useMemo<ChartOptions<"line">>(
    () =>
      buildCartesianOptions({
        palette,
        legend: true,
        min: yBounds.min,
        max: Math.max(2.5, yBounds.max ?? 2.5),
        xMaxTicksLimit: xLimit,
        yTickFormatter: (value) => formatNumberValue(Number(value), { decimals: 2, minimumDecimals: 2 }),
        tooltip: {
          callbacks: {
            title: (items: any) => formatChartDate(String(dateDomain[items[0]?.dataIndex ?? 0] ?? "")),
            label: (context: any) =>
              `${context.dataset.label}: ${formatNumberValue(Number(context.parsed.y), {
                decimals: 2,
                minimumDecimals: 2,
              })}`,
          },
        },
        xTickFormatter: (_value, index) =>
          formatChartDate(String(dateDomain[index] ?? ""), { month: "short", day: "numeric" }),
      }),
    [dateDomain, palette, xLimit, yBounds.max, yBounds.min],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>eFCR Trend by Cage</CardTitle>
        <CardDescription>Per-cage line trend from in-period `api_production_summary` rows.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <EmptyChartState label="Loading..." />
        ) : rows.length === 0 ? (
          <EmptyChartState label="No eFCR rows found for the selected period." />
        ) : (
          <div className="chart-canvas-shell h-[320px]">
            <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
              <Line data={data} options={options} />
            </LazyRender>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function FeedingBreakdownSection({
  rows,
}: {
  rows: Array<{ systemId: number; systemLabel: string; totalKg: number; entries: number; avgProtein: number | null; lastDate: string | null }>
}) {
  return (
    <Card>
      <CardHeader><CardTitle>Per-Cage Feed Breakdown</CardTitle><CardDescription>Total feed, entry count, and weighted protein by cage in the selected period.</CardDescription></CardHeader>
      <CardContent>
        <div className="dense-table-shell">
          <table className="dense-table">
            <thead><tr className="border-b border-border"><th>Cage</th><th>Total Feed (kg)</th><th>Entries</th><th>Avg Protein (%)</th><th>Last Feed Date</th></tr></thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((row) => (
                  <tr key={row.systemId} className="border-b border-border/70 hover:bg-muted/35">
                    <td className="font-medium">{row.systemLabel}</td><td>{formatNumberValue(row.totalKg, { decimals: 2, minimumDecimals: 2, fallback: "N/A" })}</td><td>{row.entries}</td><td>{formatNumberValue(row.avgProtein, { decimals: 2, minimumDecimals: 2, fallback: "N/A" })}</td><td>{row.lastDate ?? "-"}</td>
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
                summaryLines: [
                  `Total kg fed: ${formatNumberValue(totalKgFed, { decimals: 2, minimumDecimals: 2, fallback: "0.00" })}`,
                  `Average eFCR: ${formatNumberValue(avgEfcr, { decimals: 2, minimumDecimals: 2, fallback: "N/A" })}`,
                  `Average protein (%): ${formatNumberValue(avgProtein, { decimals: 2, minimumDecimals: 2, fallback: "N/A" })}`,
                  `Biomass gain (kg): ${formatNumberValue(biomassGain, { decimals: 2, minimumDecimals: 2, fallback: "0.00" })}`,
                ],
                tableHeaders: ["Date", "System", "Batch", "Feed Type", "Amount (kg)", "Response", "Protein (%)"],
                tableRows: exportRows.map((row) => [row[0], row[1], row[2] ?? "-", row[3], row[4], row[5], row[6] ?? "-"]),
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

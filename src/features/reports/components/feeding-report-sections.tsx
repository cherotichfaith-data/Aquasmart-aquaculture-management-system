"use client"

import { useMemo, useState } from "react"
import type { ChartData, ChartOptions, TooltipItem } from "chart.js"
import { Bar, Line } from "@/components/charts/chartjs"
import {
  buildCartesianOptions,
  buildDailyDateDomain,
  getChartPalette,
  getDateAxisMaxTicks,
} from "@/components/charts/chartjs-theme"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/app-ui/card"
import { LazyRender } from "@/components/shared/lazy-render"
import { MetricGrid } from "@/components/shared/metric-grid"
import { ResponsiveRecordList } from "@/components/shared/responsive-record-list"
import { downloadCsv, printBrandedPdf } from "@/lib/utils/report-export"
import { cn } from "@/lib/utils"
import { formatChartDate, formatNumberValue } from "@/lib/analytics-format"
import { formatFeedingResponseLevel } from "@/lib/feeding-response"
import {
  REPORT_CHART_SHELL_CLASS,
  REPORT_SURFACE_CARD_CLASS,
  REPORT_TABLE_SHELL_CLASS,
  ReportMetricCard,
  ReportRecordsHiddenState,
  ReportRecordsToolbar,
} from "./report-shared"

type CageSeries = {
  key: string
  label: string
  color: string
}

// A per-cage legend grows with farm size -- uncapped, it can wrap several
// lines inside the chart's fixed-height container and crowd out the plot
// itself. Cap it, and let the farmer opt back into the full legend.
const DEFAULT_CAGE_SERIES_LIMIT = 8

function useCappedCageSeries(cageSeries: CageSeries[], limit = DEFAULT_CAGE_SERIES_LIMIT) {
  const [showAll, setShowAll] = useState(false)
  const overflowCount = Math.max(cageSeries.length - limit, 0)
  const visibleSeries = showAll || overflowCount === 0 ? cageSeries : cageSeries.slice(0, limit)
  return { visibleSeries, overflowCount, showAll, setShowAll }
}

function CageSeriesOverflowToggle({
  overflowCount,
  showAll,
  onToggle,
}: {
  overflowCount: number
  showAll: boolean
  onToggle: () => void
}) {
  if (overflowCount === 0) return null
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mt-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground hover:underline"
    >
      {showAll ? "Show fewer cages" : `+${overflowCount} more ${overflowCount === 1 ? "cage" : "cages"} — show all`}
    </button>
  )
}

type FeedingRecordRow = {
  id: string | number
  date: string | null
  system_id: number | null
  batch_id: number | null
  feeding_amount: number | null
  feeding_response: number | string | null
  feed_type?: {
    feed_line?: string | null
    crude_protein_percentage?: number | null
  } | null
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
      <ReportMetricCard
        title="Total Feed"
        value={`${formatNumberValue(totalKgFed, { decimals: 2, minimumDecimals: 2, fallback: "0.00" })} kg`}
        meta="Feed issued within the selected report period."
      />
      <ReportMetricCard
        title="Average eFCR"
        value={formatNumberValue(avgEfcr, { decimals: 2, minimumDecimals: 2, fallback: "N/A" })}
        meta="Weighted from in-period eFCR data for the selected scope."
      />
      <ReportMetricCard
        title="Avg Protein"
        value={avgProtein != null ? `${formatNumberValue(avgProtein, { decimals: 2, minimumDecimals: 2 })}%` : "N/A"}
        meta="Weighted by feed amount using joined feed-type protein values."
      />
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
  const { visibleSeries, overflowCount, showAll, setShowAll } = useCappedCageSeries(cageSeries)
  const dateDomain = useMemo(() => buildDailyDateDomain(rows.map((row) => String(row.date ?? ""))), [rows])
  const rowsByDate = useMemo(
    () => new Map(rows.map((row) => [String(row.date ?? ""), row])),
    [rows],
  )
  const xLimit = getDateAxisMaxTicks(dateDomain.length)
  const data = useMemo<ChartData<"bar">>(
    () => ({
      labels: dateDomain,
      datasets: visibleSeries.map((series) => ({
        label: series.label,
        data: dateDomain.map((date) => Number(rowsByDate.get(date)?.[series.key] ?? 0)),
        backgroundColor: series.color,
        borderColor: series.color,
        borderWidth: 0,
        stack: "feed",
      })),
    }),
    [visibleSeries, dateDomain, rowsByDate],
  )
  const options = useMemo<ChartOptions<"bar">>(
    () =>
      buildCartesianOptions({
        palette,
        legend: true,
        stacked: true,
        min: 0,
        xMaxTicksLimit: xLimit,
        xTitle: "Date",
        yTitle: "Feed fed (kg)",
        yTickFormatter: (value) => formatNumberValue(Number(value), { decimals: 1, minimumDecimals: 1 }),
        tooltip: {
          callbacks: {
            title: (items: TooltipItem<"bar">[]) => formatChartDate(String(dateDomain[items[0]?.dataIndex ?? 0] ?? "")),
            label: (context: TooltipItem<"bar">) =>
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
    <Card className={REPORT_SURFACE_CARD_CLASS}>
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
          <>
            <div className={REPORT_CHART_SHELL_CLASS}>
              <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
                <Bar data={data} options={options} />
              </LazyRender>
            </div>
            <CageSeriesOverflowToggle overflowCount={overflowCount} showAll={showAll} onToggle={() => setShowAll((prev) => !prev)} />
          </>
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
  const { visibleSeries, overflowCount, showAll, setShowAll } = useCappedCageSeries(cageSeries)
  const dateDomain = useMemo(() => buildDailyDateDomain(rows.map((row) => String(row.date ?? ""))), [rows])
  const rowsByDate = useMemo(
    () => new Map(rows.map((row) => [String(row.date ?? ""), row])),
    [rows],
  )
  const xLimit = getDateAxisMaxTicks(dateDomain.length)
  const data = useMemo<ChartData<"line">>(
    () => ({
      labels: dateDomain,
      datasets: visibleSeries.map((series) => ({
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
    [visibleSeries, dateDomain, rowsByDate],
  )
  const options = useMemo<ChartOptions<"line">>(
    () =>
      buildCartesianOptions({
        palette,
        legend: true,
        xMaxTicksLimit: xLimit,
        xTitle: "Date",
        yTitle: "eFCR",
        yTickFormatter: (value) => formatNumberValue(Number(value), { decimals: 2, minimumDecimals: 2 }),
        tooltip: {
          callbacks: {
            title: (items: TooltipItem<"line">[]) => formatChartDate(String(dateDomain[items[0]?.dataIndex ?? 0] ?? "")),
            label: (context: TooltipItem<"line">) =>
              `${context.dataset.label}: ${formatNumberValue(Number(context.parsed.y), {
                decimals: 2,
                minimumDecimals: 2,
              })}`,
          },
        },
        xTickFormatter: (_value, index) =>
          formatChartDate(String(dateDomain[index] ?? ""), { month: "short", day: "numeric" }),
      }),
    [dateDomain, palette, xLimit],
  )

  return (
    <Card className={REPORT_SURFACE_CARD_CLASS}>
      <CardHeader>
        <CardTitle>eFCR Trend by Cage</CardTitle>
        <CardDescription>Per-cage eFCR trend for the selected time window.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <EmptyChartState label="Loading..." />
        ) : rows.length === 0 ? (
          <EmptyChartState label="No eFCR rows found for the selected period." />
        ) : (
          <>
            <div className={REPORT_CHART_SHELL_CLASS}>
              <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
                <Line data={data} options={options} />
              </LazyRender>
            </div>
            <CageSeriesOverflowToggle overflowCount={overflowCount} showAll={showAll} onToggle={() => setShowAll((prev) => !prev)} />
          </>
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
    <Card className={REPORT_SURFACE_CARD_CLASS}>
      <CardHeader><CardTitle>Per-Cage Feed Breakdown</CardTitle><CardDescription>Total feed, entry count, and weighted protein by cage in the selected period.</CardDescription></CardHeader>
      <CardContent>
        <ResponsiveRecordList
          className="md:hidden"
          data={rows}
          rowKey={(row) => row.systemId}
          emptyMessage="No cage-level feeding rows found"
          renderCard={(row) => (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold leading-5 text-foreground">{row.systemLabel}</p>
                <span className="text-xs text-muted-foreground">{row.lastDate ?? "-"}</span>
              </div>
              <MetricGrid
                items={[
                  { label: "Total Feed (kg)", value: formatNumberValue(row.totalKg, { decimals: 2, minimumDecimals: 2, fallback: "N/A" }) },
                  { label: "Entries", value: row.entries },
                  { label: "Avg Protein (%)", value: formatNumberValue(row.avgProtein, { decimals: 2, minimumDecimals: 2, fallback: "N/A" }) },
                ]}
              />
            </>
          )}
        />
        <div className={cn(REPORT_TABLE_SHELL_CLASS, "hidden md:block")}>
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
  tableRecords: FeedingRecordRow[]
  records: FeedingRecordRow[]
  tableLimitValue: number
  tableLoading: boolean
}) {
  const exportRows = (showFeedingRecords ? tableRecords : records.slice(0, tableLimitValue)).map((row) => [
    row.date,
    row.system_id,
    row.batch_id,
    row.feed_type?.feed_line,
    row.feeding_amount,
    formatFeedingResponseLevel(row.feeding_response),
    row.feed_type?.crude_protein_percentage,
  ])

  return (
    <Card className={REPORT_SURFACE_CARD_CLASS}>
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
          <>
            <ResponsiveRecordList
              className="md:hidden"
              data={tableRecords}
              rowKey={(row) => row.id}
              loading={tableLoading}
              emptyMessage="No feeding records found"
              renderCard={(row) => (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold leading-5 text-foreground">{row.date}</p>
                    <span className="text-xs text-muted-foreground">{row.feed_type?.feed_line}</span>
                  </div>
                  <MetricGrid
                    items={[
                      { label: "System", value: row.system_id ?? "-" },
                      { label: "Batch", value: row.batch_id ?? "-" },
                      { label: "Amount (kg)", value: row.feeding_amount ?? "-" },
                      { label: "Response", value: formatFeedingResponseLevel(row.feeding_response) },
                    ]}
                  />
                </>
              )}
            />
            <div className={cn(REPORT_TABLE_SHELL_CLASS, "hidden md:block")}>
              <table className="dense-table">
                <thead><tr className="border-b border-border"><th>Date</th><th>System</th><th>Batch</th><th>Feed Type</th><th>Amount (kg)</th><th>Response</th></tr></thead>
                <tbody>
                  {tableLoading ? (
                    <tr><td colSpan={6} className="px-4 py-4 text-center text-muted-foreground">Loading...</td></tr>
                  ) : tableRecords.length > 0 ? (
                    tableRecords.map((row) => (
                      <tr key={row.id} className="border-b border-border/70 hover:bg-muted/35">
                        <td className="font-medium">{row.date}</td><td>{row.system_id}</td><td>{row.batch_id ?? "-"}</td><td>{row.feed_type?.feed_line}</td><td>{row.feeding_amount}</td><td>{formatFeedingResponseLevel(row.feeding_response)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={6} className="px-4 py-4 text-center text-muted-foreground">No feeding records found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <ReportRecordsHiddenState label={`up to ${tableLimitValue} rows`} />
        )}
      </CardContent>
    </Card>
  )
}


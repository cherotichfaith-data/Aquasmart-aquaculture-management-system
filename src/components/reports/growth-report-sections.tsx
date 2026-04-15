"use client"

import { useMemo } from "react"
import type { ChartData, ChartOptions } from "chart.js"
import { Line } from "@/components/charts/chartjs"
import {
  buildCartesianOptions,
  buildDailyDateDomain,
  createVerticalGradient,
  getChartPalette,
  getDateAxisMaxTicks,
} from "@/components/charts/chartjs-theme"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LazyRender } from "@/components/shared/lazy-render"
import { downloadCsv, printBrandedPdf } from "@/lib/utils/report-export"
import { formatChartDate, formatNumberValue } from "@/lib/analytics-format"
import { ReportRecordsHiddenState, ReportRecordsToolbar, ReportSectionHeader } from "./report-shared"

type GrowthIntervalRow = {
  system_id: number
  system_name: string
  sample_date: string
  abw_g: number
  weight_gain_g: number
  days_interval: number
  sgr_pct_day: number
  adg_g_day: number
  days_to_harvest: number | null
}

export function GrowthSummaryCards({ latest }: { latest: any }) {
  return (
    <div className="kpi-grid md:grid-cols-4">
      <Card className="kpi-card"><CardHeader className="kpi-card-header"><CardTitle className="kpi-card-title">Current ABW</CardTitle></CardHeader><CardContent className="kpi-card-content"><div className="kpi-card-value">{formatNumberValue(latest?.average_body_weight, { decimals: 1, minimumDecimals: 1, fallback: "N/A" })}</div><p className="kpi-card-meta">Latest sampled ABW in scope</p></CardContent></Card>
      <Card className="kpi-card"><CardHeader className="kpi-card-header"><CardTitle className="kpi-card-title">Biomass Increase</CardTitle></CardHeader><CardContent className="kpi-card-content"><div className="kpi-card-value">{formatNumberValue(latest?.biomass_increase_period, { decimals: 1, minimumDecimals: 1, fallback: "N/A" })}</div><p className="kpi-card-meta">Latest period</p></CardContent></Card>
      <Card className="kpi-card"><CardHeader className="kpi-card-header"><CardTitle className="kpi-card-title">Total Biomass</CardTitle></CardHeader><CardContent className="kpi-card-content"><div className="kpi-card-value">{formatNumberValue(latest?.total_biomass, { decimals: 1, minimumDecimals: 1, fallback: "N/A" })}</div><p className="kpi-card-meta">Most recent production row in scope</p></CardContent></Card>
      <Card className="kpi-card"><CardHeader className="kpi-card-header"><CardTitle className="kpi-card-title">Feed Amount</CardTitle></CardHeader><CardContent className="kpi-card-content"><div className="kpi-card-value">{formatNumberValue(latest?.total_feed_amount_period, { decimals: 1, minimumDecimals: 1, fallback: "N/A" })}</div><p className="kpi-card-meta">Latest period</p></CardContent></Card>
    </div>
  )
}

export function GrowthAbwSection({ loading, chartRows }: { loading: boolean; chartRows: any[] }) {
  const palette = getChartPalette()
  const dateDomain = useMemo(() => buildDailyDateDomain(chartRows.map((row) => row.date)), [chartRows])
  const rowsByDate = useMemo(() => new Map(chartRows.map((row) => [row.date, row])), [chartRows])
  const xLimit = getDateAxisMaxTicks(dateDomain.length)
  const data = useMemo<ChartData<"line">>(
    () => ({
      labels: dateDomain,
      datasets: [
        {
          label: "ABW",
          data: dateDomain.map((date) => rowsByDate.get(date)?.average_body_weight ?? null),
          borderColor: palette.chart1,
          backgroundColor: createVerticalGradient(palette.chart1, 0.3, 0.04),
          borderWidth: 2.4,
          fill: true,
          pointRadius: 0,
          spanGaps: true,
        },
      ],
    }),
    [dateDomain, palette.chart1, rowsByDate],
  )
  const options = useMemo<ChartOptions<"line">>(
    () =>
      buildCartesianOptions({
        palette,
        xMaxTicksLimit: xLimit,
        xTitle: "Sampling date",
        yTitle: "ABW (g)",
        yTickFormatter: (value) => `${formatNumberValue(Number(value), { decimals: 1, minimumDecimals: 1 })} g`,
        tooltip: {
          callbacks: {
            title: (items: any) => formatChartDate(String(dateDomain[items[0]?.dataIndex ?? 0] ?? "")),
            label: (context: any) =>
              `ABW: ${formatNumberValue(Number(context.parsed.y), { decimals: 1, minimumDecimals: 1 })} g`,
          },
        },
        xTickFormatter: (_value, index) =>
          formatChartDate(String(dateDomain[index] ?? ""), { month: "short", day: "numeric" }),
      }),
    [dateDomain, palette, xLimit],
  )

  return (
    <Card>
      <CardHeader><CardTitle>Average Body Weight (ABW)</CardTitle><CardDescription>ABW progression over time</CardDescription></CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">Loading...</div>
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

export function GrowthBiomassSection({ loading, chartRows }: { loading: boolean; chartRows: any[] }) {
  const palette = getChartPalette()
  const dateDomain = useMemo(() => buildDailyDateDomain(chartRows.map((row) => row.date)), [chartRows])
  const rowsByDate = useMemo(() => new Map(chartRows.map((row) => [row.date, row])), [chartRows])
  const xLimit = getDateAxisMaxTicks(dateDomain.length)
  const data = useMemo<ChartData<"line">>(
    () => ({
      labels: dateDomain,
      datasets: [
        {
          label: "Biomass (kg)",
          data: dateDomain.map((date) => rowsByDate.get(date)?.total_biomass ?? null),
          borderColor: palette.chart2,
          backgroundColor: palette.chart2,
          borderWidth: 2.4,
          pointRadius: 0,
          spanGaps: true,
        },
      ],
    }),
    [dateDomain, palette.chart2, rowsByDate],
  )
  const options = useMemo<ChartOptions<"line">>(
    () =>
      buildCartesianOptions({
        palette,
        legend: true,
        xMaxTicksLimit: xLimit,
        xTitle: "Date",
        yTitle: "Biomass (kg)",
        yTickFormatter: (value) => `${formatNumberValue(Number(value), { decimals: 1, minimumDecimals: 1 })} kg`,
        tooltip: {
          callbacks: {
            title: (items: any) => formatChartDate(String(dateDomain[items[0]?.dataIndex ?? 0] ?? "")),
            label: (context: any) =>
              `Biomass (kg): ${formatNumberValue(Number(context.parsed.y), { decimals: 1, minimumDecimals: 1 })} kg`,
          },
        },
        xTickFormatter: (_value, index) =>
          formatChartDate(String(dateDomain[index] ?? ""), { month: "short", day: "numeric" }),
      }),
    [dateDomain, palette, xLimit],
  )

  return (
    <Card>
      <CardHeader><CardTitle>Biomass Trend</CardTitle><CardDescription>Total biomass per date</CardDescription></CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">Loading...</div>
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

export function GrowthRecordsSection({
  showGrowthRecords,
  onToggleRecords,
  loading,
  rows,
  dateRange,
  farmName,
  latestInterval,
  targetHarvestWeightG,
}: {
  showGrowthRecords: boolean
  onToggleRecords: () => void
  loading: boolean
  rows: GrowthIntervalRow[]
  dateRange?: { from: string; to: string }
  farmName?: string | null
  latestInterval: GrowthIntervalRow | null
  targetHarvestWeightG: number | null
}) {
  return (
    <Card>
      <ReportSectionHeader
        title="ABW and Growth by Cage"
        description="Per-sampling-interval growth rows from `get_growth_trend_window(system_id)` within the selected report window."
        actions={
          <ReportRecordsToolbar
            showRecords={showGrowthRecords}
            onToggleRecords={onToggleRecords}
            onExportCsv={() =>
              downloadCsv({
                filename: `growth-report-${dateRange?.from ?? "start"}-to-${dateRange?.to ?? "end"}.csv`,
                headers: ["cage", "sampling_date", "abw_g", "abw_gain_g", "days_interval", "sgr_pct_day", "adg_g_day", "days_to_harvest_projected"],
                rows: rows.map((row) => [row.system_name, row.sample_date, row.abw_g, row.weight_gain_g, row.days_interval, row.sgr_pct_day, row.adg_g_day, row.days_to_harvest]),
              })
            }
            onExportPdf={() =>
              printBrandedPdf({
                title: "Growth Report",
                subtitle: "ABW and interval growth progression",
                farmName,
                dateRange,
                summaryLines: [
                  `Latest cage: ${latestInterval?.system_name ?? "N/A"}`,
                  `Latest ABW: ${formatNumberValue(latestInterval?.abw_g, { decimals: 1, minimumDecimals: 1, fallback: "N/A" })} g`,
                  `Target harvest weight: ${formatNumberValue(targetHarvestWeightG, { decimals: 0, fallback: "N/A" })} g`,
                ],
                tableHeaders: ["Cage", "Sampling date", "ABW (g)", "ABW gain (g)", "Days interval", "SGR (%/day)", "ADG (g/day)", "Days to harvest"],
                tableRows: rows.map((row) => [
                  row.system_name,
                  row.sample_date,
                  formatNumberValue(row.abw_g, { decimals: 1, minimumDecimals: 1, fallback: "-" }),
                  formatNumberValue(row.weight_gain_g, { decimals: 1, minimumDecimals: 1, fallback: "-" }),
                  formatNumberValue(row.days_interval, { decimals: 0, fallback: "-" }),
                  formatNumberValue(row.sgr_pct_day, { decimals: 2, minimumDecimals: 2, fallback: "-" }),
                  formatNumberValue(row.adg_g_day, { decimals: 2, minimumDecimals: 2, fallback: "-" }),
                  formatNumberValue(row.days_to_harvest, { decimals: 0, fallback: "-" }),
                ]),
              })
            }
          />
        }
      />
      <CardContent>
        {showGrowthRecords ? (
          <div className="soft-table-shell">
            <table className="w-full min-w-[1040px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60">
                  <th className="px-4 py-2 text-left font-semibold text-foreground">Cage</th>
                  <th className="px-4 py-2 text-center font-semibold text-foreground">Sampling date</th>
                  <th className="px-4 py-2 text-center font-semibold text-foreground">ABW (g)</th>
                  <th className="px-4 py-2 text-center font-semibold text-foreground">ABW gain (g)</th>
                  <th className="px-4 py-2 text-center font-semibold text-foreground">Days interval</th>
                  <th className="px-4 py-2 text-center font-semibold text-foreground">SGR (%/day)</th>
                  <th className="px-4 py-2 text-center font-semibold text-foreground">ADG (g/day)</th>
                  <th className="px-4 py-2 text-center font-semibold text-foreground">Days to harvest</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-4 text-center text-muted-foreground">Loading...</td></tr>
                ) : rows.length > 0 ? (
                  rows.map((row) => (
                    <tr key={`${row.system_id}-${row.sample_date}`} className="border-b border-border/70 hover:bg-muted/35">
                      <td className="px-4 py-2 font-medium">{row.system_name}</td>
                      <td className="px-4 py-2 text-center">{row.sample_date}</td>
                      <td className="px-4 py-2 text-center">{formatNumberValue(row.abw_g, { decimals: 1, minimumDecimals: 1, fallback: "-" })}</td>
                      <td className="px-4 py-2 text-center">{formatNumberValue(row.weight_gain_g, { decimals: 1, minimumDecimals: 1, fallback: "-" })}</td>
                      <td className="px-4 py-2 text-center">{formatNumberValue(row.days_interval, { decimals: 0, fallback: "-" })}</td>
                      <td className="px-4 py-2 text-center">{formatNumberValue(row.sgr_pct_day, { decimals: 2, minimumDecimals: 2, fallback: "-" })}</td>
                      <td className="px-4 py-2 text-center">{formatNumberValue(row.adg_g_day, { decimals: 2, minimumDecimals: 2, fallback: "-" })}</td>
                      <td className="px-4 py-2 text-center">{formatNumberValue(row.days_to_harvest, { decimals: 0, fallback: "-" })}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={8} className="px-4 py-4 text-center text-muted-foreground">No growth intervals were found for the selected period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <ReportRecordsHiddenState label={`${rows.length} rows`} />
        )}
      </CardContent>
    </Card>
  )
}

"use client"

import {
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LazyRender } from "@/components/shared/lazy-render"
import { downloadCsv, printBrandedPdf } from "@/lib/utils/report-export"
import { formatChartDate, formatNumberValue } from "@/lib/analytics-format"
import { ReportRecordsHiddenState, ReportRecordsToolbar, ReportSectionHeader } from "./report-shared"

export function PerformanceSummaryCards({
  summary,
}: {
  summary: {
    efcr_period_consolidated: number | null
    feeding_rate: number | null
    average_biomass: number | null
    mortality_rate: number | null
  } | null
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Farm eFCR</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary?.efcr_period_consolidated ?? "N/A"}</div>
          <p className="text-xs text-muted-foreground mt-1">Derived from production rows with resolved timelines</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Farm Feeding Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary?.feeding_rate ?? "N/A"}</div>
          <p className="text-xs text-muted-foreground mt-1">Consolidated feed rate</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Farm Biomass</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary?.average_biomass ?? "N/A"}</div>
          <p className="text-xs text-muted-foreground mt-1">All systems</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Farm Mortality</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary?.mortality_rate ?? "N/A"}</div>
          <p className="text-xs text-muted-foreground mt-1">Consolidated rate</p>
        </CardContent>
      </Card>
    </div>
  )
}

export function PerformanceTrendSection({
  loading,
  chartRows,
}: {
  loading: boolean
  chartRows: Array<{ date: string; efcr_period: number | null; total_biomass: number }>
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Trend</CardTitle>
        <CardDescription>eFCR and biomass over time</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading...</div>
        ) : (
          <div className="h-[300px] rounded-md border border-border/80 bg-muted/20 p-2">
            <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartRows}>
                  <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.45} />
                  <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip
                    labelFormatter={(label) => formatChartDate(label)}
                    formatter={(value, name) => {
                      if (String(name).toLowerCase().includes("efcr")) {
                        return [formatNumberValue(Number(value), { decimals: 2, minimumDecimals: 2 }), String(name)]
                      }
                      return [`${formatNumberValue(Number(value), { decimals: 1, minimumDecimals: 1 })} kg`, String(name)]
                    }}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: 8 }}
                  />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="efcr_period" stroke="var(--color-chart-1)" strokeWidth={2.4} name="eFCR" />
                  <Line yAxisId="right" type="monotone" dataKey="total_biomass" stroke="var(--color-chart-2)" strokeWidth={2.4} name="Biomass (kg)" />
                </LineChart>
              </ResponsiveContainer>
            </LazyRender>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function SystemBiomassComparisonSection({
  loading,
  latestBySystemRows,
}: {
  loading: boolean
  latestBySystemRows: any[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>System Biomass Comparison</CardTitle>
        <CardDescription>Most recent `api_production_summary` row per in-scope system</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading...</div>
        ) : (
          <div className="h-[300px] rounded-md border border-border/80 bg-muted/20 p-2">
            <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={latestBySystemRows}>
                  <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.45} />
                  <XAxis dataKey="system_name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip
                    formatter={(value, name) => [`${formatNumberValue(Number(value), { decimals: 1, minimumDecimals: 1 })} kg`, String(name)]}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: 8 }}
                  />
                  <Legend />
                  <Bar dataKey="total_biomass" fill="var(--color-chart-1)" name="Biomass (kg)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </LazyRender>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function BenchmarkStatusSection({
  benchmarkCards,
}: {
  benchmarkCards: Array<{ metric: string; actual: number | null; benchmark: number; status: string; tone: string }>
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Benchmark Status</CardTitle>
        <CardDescription>Quick target checks for the two core risk metrics.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {benchmarkCards.map((item) => {
            const isMortality = item.metric === "Mortality Rate"
            const actual =
              typeof item.actual === "number"
                ? isMortality
                  ? `${(item.actual * 100).toFixed(2)}%`
                  : item.actual.toFixed(2)
                : "N/A"
            const benchmark = isMortality ? `${(item.benchmark * 100).toFixed(2)}%` : item.benchmark.toFixed(2)
            const toneClass =
              item.tone === "good"
                ? "bg-chart-2/10 border-chart-2/25 text-chart-2"
                : "bg-chart-4/10 border-chart-4/25 text-chart-4"

            return (
              <div key={item.metric} className="rounded-md border border-border/80 bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{item.metric}</p>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${toneClass}`}>
                    {item.status}
                  </span>
                </div>
                <p className="mt-2 text-sm">
                  Actual: <span className="font-semibold">{actual}</span>
                </p>
                <p className="text-xs text-muted-foreground">Target: {benchmark}</p>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export function PerformanceRecordsSection({
  tableLimit,
  onTableLimitChange,
  showPerformanceRecords,
  onToggleRecords,
  dateRange,
  farmName,
  summary,
  rows,
  tableRows,
  tableLimitValue,
  tableLoading,
}: {
  tableLimit: string
  onTableLimitChange: (value: string) => void
  showPerformanceRecords: boolean
  onToggleRecords: () => void
  dateRange?: { from: string; to: string }
  farmName?: string | null
  summary: {
    efcr_period_consolidated: number | null
    mortality_rate: number | null
    average_biomass: number | null
  } | null
  rows: any[]
  tableRows: any[]
  tableLimitValue: number
  tableLoading: boolean
}) {
  const exportRows = (showPerformanceRecords ? tableRows : rows.slice(0, tableLimitValue)).map((row) => [
    row.date,
    row.system_name ?? row.system_id,
    row.efcr_period,
    row.total_biomass,
    row.daily_mortality_count,
    row.efcr_aggregated,
  ])

  return (
    <Card>
      <ReportSectionHeader
        title="Performance Records"
        actions={
          <ReportRecordsToolbar
            tableLimit={tableLimit}
            onTableLimitChange={onTableLimitChange}
            showRecords={showPerformanceRecords}
            onToggleRecords={onToggleRecords}
            onExportCsv={() =>
              downloadCsv({
                filename: `performance-report-${dateRange?.from ?? "start"}-to-${dateRange?.to ?? "end"}.csv`,
                headers: ["date", "system_name", "efcr_period", "total_biomass", "daily_mortality_count", "efcr_aggregated"],
                rows: exportRows,
              })
            }
            onExportPdf={() =>
              printBrandedPdf({
                title: "Farm Performance Report",
                subtitle: "KPI summary, trends, and benchmark review",
                farmName,
                dateRange,
                summaryLines: [`Farm eFCR: ${summary?.efcr_period_consolidated ?? "N/A"}`, `Farm Mortality Rate: ${summary?.mortality_rate ?? "N/A"}`, `Farm Biomass: ${summary?.average_biomass ?? "N/A"}`],
                tableHeaders: ["Date", "System", "eFCR", "Biomass", "Mortality", "eFCR (Agg)"],
                tableRows: exportRows,
                commentary: "Generated from api_production_summary rows for systems with resolved production timelines.",
              })
            }
          />
        }
      />
      <CardContent>
        {showPerformanceRecords ? (
          <div className="overflow-x-auto rounded-md border border-border/80">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60">
                  <th className="px-4 py-2 text-left font-semibold text-foreground">Date</th>
                  <th className="px-4 py-2 text-left font-semibold text-foreground">System</th>
                  <th className="px-4 py-2 text-center font-semibold text-foreground">eFCR</th>
                  <th className="px-4 py-2 text-center font-semibold text-foreground">Biomass (kg)</th>
                  <th className="px-4 py-2 text-center font-semibold text-foreground">Mortality</th>
                  <th className="px-4 py-2 text-center font-semibold text-foreground">eFCR (Agg)</th>
                </tr>
              </thead>
              <tbody>
                {tableLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 text-center text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : tableRows.length > 0 ? (
                  tableRows.map((row) => (
                    <tr key={`${row.system_id}-${row.date}`} className="border-b border-border/70 hover:bg-muted/35">
                      <td className="px-4 py-2 font-medium">{row.date}</td>
                      <td className="px-4 py-2">{row.system_name ?? row.system_id}</td>
                      <td className="px-4 py-2 text-center">{row.efcr_period ?? "-"}</td>
                      <td className="px-4 py-2 text-center">{row.total_biomass ?? "-"}</td>
                      <td className="px-4 py-2 text-center">{row.daily_mortality_count ?? "-"}</td>
                      <td className="px-4 py-2 text-center">{row.efcr_aggregated ?? "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 text-center text-muted-foreground">
                      No performance records were found for systems with resolved production timelines.
                    </td>
                  </tr>
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

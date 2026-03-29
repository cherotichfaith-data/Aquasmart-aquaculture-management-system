"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LazyRender } from "@/components/shared/lazy-render"
import { downloadCsv, printBrandedPdf } from "@/lib/utils/report-export"
import { formatChartDate, formatNumberValue, formatPercentRateValue } from "@/lib/analytics-format"
import { ReportRecordsHiddenState, ReportRecordsToolbar, ReportSectionHeader } from "./report-shared"

export function PerformanceSummaryCards({
  summary,
}: {
  summary: {
    efcr_aggregated_consolidated: number | null
    average_biomass: number | null
    mortality_rate: number | null
    survival_rate_pct: number | null
    total_harvest_kg: number | null
    total_harvest_fish: number | null
  } | null
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Cycle eFCR</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatNumberValue(summary?.efcr_aggregated_consolidated, { decimals: 2, minimumDecimals: 2, fallback: "N/A" })}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Last in-period row per cycle from `api_production_summary`</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Survival Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {summary?.survival_rate_pct != null
              ? `${formatNumberValue(summary.survival_rate_pct, { decimals: 2, minimumDecimals: 2, fallback: "N/A" })}%`
              : "N/A"}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">(stocked - cumulative mortality - transfers out) / stocked</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Harvest</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatNumberValue(summary?.total_harvest_kg, { decimals: 1, minimumDecimals: 1, fallback: "N/A" })} kg
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatNumberValue(summary?.total_harvest_fish, { decimals: 0, fallback: "N/A" })} fish
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Farm Biomass</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumberValue(summary?.average_biomass, { decimals: 1, minimumDecimals: 1, fallback: "N/A" })}</div>
          <p className="mt-1 text-xs text-muted-foreground">Latest total biomass across in-scope cycles</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Farm Mortality</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPercentRateValue(summary?.mortality_rate, 2, "%/day", "N/A")}</div>
          <p className="mt-1 text-xs text-muted-foreground">Latest daily mortality ratio across in-scope cycles</p>
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
                  <ReferenceLine yAxisId="left" y={1.5} stroke="var(--color-chart-4)" strokeDasharray="6 4" ifOverflow="extendDomain" label={{ value: "App target 1.5", position: "insideTopLeft", fill: "currentColor", fontSize: 12 }} />
                  <ReferenceLine yAxisId="left" y={2} stroke="var(--color-chart-5)" strokeDasharray="3 3" ifOverflow="extendDomain" label={{ value: "Industry 2.0", position: "insideTopRight", fill: "currentColor", fontSize: 12 }} />
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
        <CardDescription>Hardcoded historical benchmarks for eFCR and mortality.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {benchmarkCards.map((item) => {
            const isMortality = item.metric === "Daily Mortality Rate"
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
    efcr_aggregated_consolidated: number | null
    mortality_rate: number | null
    average_biomass: number | null
    survival_rate_pct: number | null
    total_harvest_kg: number | null
    total_harvest_fish: number | null
  } | null
  rows: any[]
  tableRows: any[]
  tableLimitValue: number
  tableLoading: boolean
}) {
  const exportRows = (showPerformanceRecords ? tableRows : rows.slice(0, tableLimitValue)).map((row) => [
    row.date,
    row.system_name ?? row.system_id,
    row.cycle_id,
    row.efcr_aggregated,
    typeof row.number_of_fish_stocked === "number" && row.number_of_fish_stocked > 0
      ? ((row.number_of_fish_stocked - (row.cumulative_mortality ?? 0) - (row.number_of_fish_transfer_out ?? 0)) / row.number_of_fish_stocked) * 100
      : null,
    row.total_weight_harvested_aggregated,
    row.number_of_fish_harvested,
    row.daily_mortality_count,
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
                headers: ["date", "system_name", "cycle_id", "efcr_aggregated", "survival_rate_pct", "total_harvest_kg", "total_harvest_fish", "daily_mortality_count"],
                rows: exportRows,
              })
            }
            onExportPdf={() =>
              printBrandedPdf({
                title: "Farm Performance Report",
                subtitle: "KPI summary, trends, and benchmark review",
                farmName,
                dateRange,
                summaryLines: [
                  `Cycle eFCR: ${formatNumberValue(summary?.efcr_aggregated_consolidated, { decimals: 2, minimumDecimals: 2, fallback: "N/A" })}`,
                  `Survival rate: ${summary?.survival_rate_pct != null ? `${formatNumberValue(summary.survival_rate_pct, { decimals: 2, minimumDecimals: 2 })}%` : "N/A"}`,
                  `Farm Mortality Rate: ${formatPercentRateValue(summary?.mortality_rate, 2, "%/day", "N/A")}`,
                  `Farm Biomass: ${formatNumberValue(summary?.average_biomass, { decimals: 1, minimumDecimals: 1, fallback: "N/A" })} kg`,
                  `Total harvest: ${formatNumberValue(summary?.total_harvest_kg, { decimals: 1, minimumDecimals: 1, fallback: "N/A" })} kg / ${formatNumberValue(summary?.total_harvest_fish, { decimals: 0, fallback: "N/A" })} fish`,
                ],
                tableHeaders: ["Date", "System", "Cycle", "eFCR", "Survival (%)", "Harvest (kg)", "Harvest (fish)", "Mortality (%/day)"],
                tableRows: exportRows.map((row) => [
                  row[0],
                  row[1],
                  row[2],
                  typeof row[3] === "number" ? formatNumberValue(row[3], { decimals: 2, minimumDecimals: 2 }) : row[3],
                  typeof row[4] === "number" ? formatNumberValue(row[4], { decimals: 2, minimumDecimals: 2 }) : row[4],
                  typeof row[5] === "number" ? formatNumberValue(row[5], { decimals: 1, minimumDecimals: 1 }) : row[5],
                  row[6],
                  row[7],
                ]),
                commentary: "Generated from the last in-period `api_production_summary` row per cycle.",
              })
            }
          />
        }
      />
      <CardContent>
        {showPerformanceRecords ? (
          <div className="overflow-x-auto rounded-md border border-border/80">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60">
                  <th className="px-4 py-2 text-left font-semibold text-foreground">Date</th>
                  <th className="px-4 py-2 text-left font-semibold text-foreground">System</th>
                  <th className="px-4 py-2 text-center font-semibold text-foreground">Cycle</th>
                  <th className="px-4 py-2 text-center font-semibold text-foreground">eFCR</th>
                  <th className="px-4 py-2 text-center font-semibold text-foreground">Survival (%)</th>
                  <th className="px-4 py-2 text-center font-semibold text-foreground">Harvest (kg)</th>
                  <th className="px-4 py-2 text-center font-semibold text-foreground">Harvest (fish)</th>
                  <th className="px-4 py-2 text-center font-semibold text-foreground">Mortality (%/day)</th>
                </tr>
              </thead>
              <tbody>
                {tableLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-4 text-center text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : tableRows.length > 0 ? (
                  tableRows.map((row) => (
                    <tr key={`${row.system_id}-${row.date}`} className="border-b border-border/70 hover:bg-muted/35">
                      <td className="px-4 py-2 font-medium">{row.date}</td>
                      <td className="px-4 py-2">{row.system_name ?? row.system_id}</td>
                      <td className="px-4 py-2 text-center">{row.cycle_id ?? "-"}</td>
                      <td className="px-4 py-2 text-center">{formatNumberValue(row.efcr_aggregated, { decimals: 2, minimumDecimals: 2, fallback: "-" })}</td>
                      <td className="px-4 py-2 text-center">
                        {typeof row.number_of_fish_stocked === "number" && row.number_of_fish_stocked > 0
                          ? formatNumberValue(
                              ((row.number_of_fish_stocked - (row.cumulative_mortality ?? 0) - (row.number_of_fish_transfer_out ?? 0)) / row.number_of_fish_stocked) * 100,
                              { decimals: 2, minimumDecimals: 2, fallback: "-" },
                            )
                          : "-"}
                      </td>
                      <td className="px-4 py-2 text-center">{formatNumberValue(row.total_weight_harvested_aggregated, { decimals: 1, minimumDecimals: 1, fallback: "-" })}</td>
                      <td className="px-4 py-2 text-center">{formatNumberValue(row.number_of_fish_harvested, { decimals: 0, fallback: "-" })}</td>
                      <td className="px-4 py-2 text-center">{formatNumberValue(row.daily_mortality_count, { decimals: 0, fallback: "-" })}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-4 text-center text-muted-foreground">
                      No end-of-period cycle rows were found for the selected report window.
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

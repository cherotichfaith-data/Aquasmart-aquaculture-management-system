"use client"

import { useMemo, useState } from "react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useDashboardConsolidatedSnapshot } from "@/lib/hooks/use-dashboard"
import { useProductionSummary } from "@/lib/hooks/use-production"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { sortByDateAsc } from "@/lib/utils"
import { downloadCsv, printBrandedPdf } from "@/lib/utils/report-export"
import type { Enums } from "@/lib/types/database"

const formatDateLabel = (value: string | number) => {
  const parsed = new Date(String(value))
  if (Number.isNaN(parsed.getTime())) return String(value)
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(parsed)
}

export default function PerformanceReport({
  dateRange,
  systemId,
  stage,
  farmName,
}: {
  dateRange?: { from: string; to: string }
  systemId?: number
  stage?: "all" | Enums<"system_growth_stage">
  farmName?: string | null
}) {
  const { farmId } = useActiveFarm()
  const summaryQuery = useDashboardConsolidatedSnapshot({ farmId: farmId ?? null })
  const productionSummaryQuery = useProductionSummary({
    systemId,
    stage: stage && stage !== "all" ? stage : undefined,
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
    farmId: farmId ?? null,
  })
  const summary = summaryQuery.data ?? null
  const rows = productionSummaryQuery.data?.status === "success" ? productionSummaryQuery.data.data : []
  const loading = summaryQuery.isLoading || productionSummaryQuery.isLoading
  const [showPerformanceRecords, setShowPerformanceRecords] = useState(false)
  const chartRows = useMemo(() => {
    const byDate = new Map<string, { totalBiomass: number; weightedEfcr: number; efcrWeight: number; efcrFallback: number; efcrCount: number }>()
    rows.forEach((row) => {
      if (!row.date) return
      const current = byDate.get(row.date) ?? { totalBiomass: 0, weightedEfcr: 0, efcrWeight: 0, efcrFallback: 0, efcrCount: 0 }
      current.totalBiomass += row.total_biomass ?? 0
      if (typeof row.efcr_period === "number") {
        const weight = row.total_feed_amount_period ?? 0
        if (weight > 0) {
          current.weightedEfcr += row.efcr_period * weight
          current.efcrWeight += weight
        } else {
          current.efcrFallback += row.efcr_period
          current.efcrCount += 1
        }
      }
      byDate.set(row.date, current)
    })

    return sortByDateAsc(
      Array.from(byDate.entries()).map(([date, current]) => ({
        date,
        efcr_period:
          current.efcrWeight > 0
            ? current.weightedEfcr / current.efcrWeight
            : current.efcrCount > 0
              ? current.efcrFallback / current.efcrCount
              : null,
        total_biomass: current.totalBiomass,
      })),
      (row) => row.date,
    )
  }, [rows])
  const latestBySystemRows = useMemo(() => {
    const bySystem = new Map<number, (typeof rows)[number]>()
    rows.forEach((row) => {
      if (row.system_id == null || !row.date) return
      const current = bySystem.get(row.system_id)
      if (!current || String(row.date) > String(current.date ?? "")) {
        bySystem.set(row.system_id, row)
      }
    })
    return Array.from(bySystem.values())
  }, [rows])
  const efcrBenchmark = 1.5
  const mortalityBenchmark = 0.02

  const benchmarkCards = useMemo(() => {
    if (!summary) return []
    return [
      {
        metric: "eFCR",
        actual: summary.efcr_period_consolidated,
        benchmark: efcrBenchmark,
        status: typeof summary.efcr_period_consolidated === "number" && summary.efcr_period_consolidated <= efcrBenchmark ? "On target" : "Needs attention",
        tone:
          typeof summary.efcr_period_consolidated === "number" && summary.efcr_period_consolidated <= efcrBenchmark
            ? "good"
            : "warn",
      },
      {
        metric: "Mortality Rate",
        actual: summary.mortality_rate,
        benchmark: mortalityBenchmark,
        status: typeof summary.mortality_rate === "number" && summary.mortality_rate <= mortalityBenchmark ? "On target" : "Needs attention",
        tone:
          typeof summary.mortality_rate === "number" && summary.mortality_rate <= mortalityBenchmark
            ? "good"
            : "warn",
      },
    ]
  }, [summary])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Farm eFCR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.efcr_period_consolidated ?? "N/A"}</div>
            <p className="text-xs text-muted-foreground mt-1">Backend consolidated</p>
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
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartRows}>
                  <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.45} />
                  <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip
                    labelFormatter={formatDateLabel}
                    formatter={(value, name) => {
                      if (String(name).toLowerCase().includes("efcr")) {
                        return [Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), String(name)]
                      }
                      return [`${Number(value).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`, String(name)]
                    }}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: 8 }}
                  />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="efcr_period" stroke="var(--color-chart-1)" strokeWidth={2.4} name="eFCR" />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="total_biomass"
                    stroke="var(--color-chart-2)"
                    strokeWidth={2.4}
                    name="Biomass (kg)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Biomass Comparison</CardTitle>
          <CardDescription>Latest snapshot per system</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : (
            <div className="h-[300px] rounded-md border border-border/80 bg-muted/20 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={latestBySystemRows}>
                  <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.45} />
                  <XAxis dataKey="system_name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip
                    formatter={(value, name) => [`${Number(value).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`, String(name)]}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: 8 }}
                  />
                  <Legend />
                  <Bar dataKey="total_biomass" fill="var(--color-chart-1)" name="Biomass (kg)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Performance Records</CardTitle>
            <div className="flex gap-2">
              <button
                type="button"
                className="px-3 py-2 rounded-md border border-input text-sm hover:bg-muted/40"
                onClick={() => setShowPerformanceRecords((prev) => !prev)}
              >
                {showPerformanceRecords ? "Hide details" : "View details"}
              </button>
              <button
                type="button"
                className="px-3 py-2 rounded-md border border-input text-sm hover:bg-muted/40"
                onClick={() =>
                  downloadCsv({
                    filename: `performance-report-${dateRange?.from ?? "start"}-to-${dateRange?.to ?? "end"}.csv`,
                    headers: ["date", "system_name", "efcr_period", "total_biomass", "daily_mortality_count", "efcr_aggregated"],
                    rows: rows.map((row) => [
                      row.date,
                      row.system_name ?? row.system_id,
                      row.efcr_period,
                      row.total_biomass,
                      row.daily_mortality_count,
                      row.efcr_aggregated,
                    ]),
                  })
                }
              >
                Export CSV
              </button>
              <button
                type="button"
                className="px-3 py-2 rounded-md border border-input text-sm hover:bg-muted/40"
                onClick={() =>
                  printBrandedPdf({
                    title: "Farm Performance Report",
                    subtitle: "KPI summary, trends, and benchmark review",
                    farmName,
                    dateRange,
                    summaryLines: [
                      `Farm eFCR: ${summary?.efcr_period_consolidated ?? "N/A"}`,
                      `Farm Mortality Rate: ${summary?.mortality_rate ?? "N/A"}`,
                      `Farm Biomass: ${summary?.average_biomass ?? "N/A"}`,
                    ],
                    tableHeaders: ["Date", "System", "eFCR", "Biomass", "Mortality", "eFCR (Agg)"],
                    tableRows: rows.map((row) => [
                      row.date,
                      row.system_name ?? row.system_id,
                      row.efcr_period,
                      row.total_biomass,
                      row.daily_mortality_count,
                      row.efcr_aggregated,
                    ]),
                    commentary: "Generated from api_production_summary and api_dashboard_consolidated sources.",
                  })
                }
              >
                Export PDF
              </button>
            </div>
          </div>
        </CardHeader>
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
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 text-center text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : rows.length > 0 ? (
                  rows.map((row) => (
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
                      No performance records found
                    </td>
                  </tr>
                )}
              </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              Detailed records hidden. Click <span className="font-medium text-foreground">View details</span> to show {rows.length} rows.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

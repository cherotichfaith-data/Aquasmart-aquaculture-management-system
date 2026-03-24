"use client"

import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LazyRender } from "@/components/shared/lazy-render"
import { downloadCsv, printBrandedPdf } from "@/lib/utils/report-export"
import { formatChartDate, formatNumberValue } from "@/lib/analytics-format"
import { ReportRecordsHiddenState, ReportRecordsToolbar, ReportSectionHeader } from "./report-shared"

export function GrowthSummaryCards({ latest }: { latest: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Current ABW</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{latest?.average_body_weight ?? "N/A"}</div><p className="text-xs text-muted-foreground mt-1">Most recent production row in scope</p></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Biomass Increase</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{latest?.biomass_increase_period ?? "N/A"}</div><p className="text-xs text-muted-foreground mt-1">Latest period</p></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Biomass</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{latest?.total_biomass ?? "N/A"}</div><p className="text-xs text-muted-foreground mt-1">Most recent production row in scope</p></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Feed Amount</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{latest?.total_feed_amount_period ?? "N/A"}</div><p className="text-xs text-muted-foreground mt-1">Latest period</p></CardContent></Card>
    </div>
  )
}

export function GrowthAbwSection({ loading, chartRows }: { loading: boolean; chartRows: any[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Average Body Weight (ABW)</CardTitle><CardDescription>ABW progression over time</CardDescription></CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading...</div>
        ) : (
          <div className="h-[300px] rounded-md border border-border/80 bg-muted/20 p-2">
            <LazyRender className="h-full" fallback={<div className="h-full w-full" />}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartRows}>
                  <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.45} />
                  <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip labelFormatter={(label) => formatChartDate(label)} formatter={(value, name) => [`${formatNumberValue(Number(value), { decimals: 1, minimumDecimals: 1 })} g`, String(name)]} contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: 8 }} />
                  <Area type="monotone" dataKey="average_body_weight" fill="var(--color-chart-1)" stroke="var(--color-chart-1)" fillOpacity={0.3} strokeWidth={2.4} name="ABW" />
                </AreaChart>
              </ResponsiveContainer>
            </LazyRender>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function GrowthBiomassSection({ loading, chartRows }: { loading: boolean; chartRows: any[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Biomass Trend</CardTitle><CardDescription>Total biomass per date</CardDescription></CardHeader>
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
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip labelFormatter={(label) => formatChartDate(label)} formatter={(value, name) => [`${formatNumberValue(Number(value), { decimals: 1, minimumDecimals: 1 })} kg`, String(name)]} contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: 8 }} />
                  <Legend />
                  <Line type="monotone" dataKey="total_biomass" stroke="var(--color-chart-2)" strokeWidth={2.4} name="Biomass (kg)" />
                </LineChart>
              </ResponsiveContainer>
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
  latest,
}: {
  showGrowthRecords: boolean
  onToggleRecords: () => void
  loading: boolean
  rows: any[]
  dateRange?: { from: string; to: string }
  farmName?: string | null
  latest: any
}) {
  return (
    <Card>
      <ReportSectionHeader
        title="Growth by System"
        description="Most recent `api_production_summary` row per in-scope system"
        actions={
          <ReportRecordsToolbar
            showRecords={showGrowthRecords}
            onToggleRecords={onToggleRecords}
            onExportCsv={() =>
              downloadCsv({
                filename: `growth-report-${dateRange?.from ?? "start"}-to-${dateRange?.to ?? "end"}.csv`,
                headers: ["date", "system_name", "average_body_weight", "total_biomass", "number_of_fish_inventory", "biomass_increase_period"],
                rows: rows.map((row) => [row.date, row.system_name ?? row.system_id, row.average_body_weight, row.total_biomass, row.number_of_fish_inventory, row.biomass_increase_period]),
              })
            }
            onExportPdf={() =>
              printBrandedPdf({
                title: "Growth Report",
                subtitle: "ABW and biomass progression",
                farmName,
                dateRange,
                summaryLines: [`Current ABW: ${latest?.average_body_weight ?? "N/A"}`, `Biomass increase: ${latest?.biomass_increase_period ?? "N/A"}`, `Total biomass: ${latest?.total_biomass ?? "N/A"}`],
                tableHeaders: ["System", "ABW", "Biomass", "Fish Count", "Daily Gain"],
                tableRows: rows.map((row) => [row.system_name ?? row.system_id, row.average_body_weight ?? "-", row.total_biomass ?? "-", row.number_of_fish_inventory ?? "-", row.biomass_increase_period ?? "-"]),
                commentary: "Generated from api_production_summary rows for systems with resolved production timelines.",
              })
            }
          />
        }
      />
      <CardContent>
        {showGrowthRecords ? (
          <div className="overflow-x-auto rounded-md border border-border/80">
            <table className="w-full min-w-[720px] text-sm">
              <thead><tr className="border-b border-border bg-muted/60"><th className="px-4 py-2 text-left font-semibold text-foreground">System</th><th className="px-4 py-2 text-center font-semibold text-foreground">ABW</th><th className="px-4 py-2 text-center font-semibold text-foreground">Biomass</th><th className="px-4 py-2 text-center font-semibold text-foreground">Fish Count</th><th className="px-4 py-2 text-center font-semibold text-foreground">Daily Gain</th></tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-4 text-center text-muted-foreground">Loading...</td></tr>
                ) : rows.length > 0 ? (
                  rows.map((row) => (
                    <tr key={`${row.system_id}-${row.date}`} className="border-b border-border/70 hover:bg-muted/35">
                      <td className="px-4 py-2 font-medium">{row.system_name ?? row.system_id}</td><td className="px-4 py-2 text-center">{row.average_body_weight ?? "-"}</td><td className="px-4 py-2 text-center">{row.total_biomass ?? "-"}</td><td className="px-4 py-2 text-center">{row.number_of_fish_inventory ?? "-"}</td><td className="px-4 py-2 text-center">{row.biomass_increase_period ?? "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={5} className="px-4 py-4 text-center text-muted-foreground">No growth records were found for systems with resolved production timelines.</td></tr>
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

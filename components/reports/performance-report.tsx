"use client"

import { useMemo } from "react"
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

export default function PerformanceReport({ dateRange }: { dateRange?: { from: string; to: string } }) {
  const { farmId } = useActiveFarm()
  const summaryQuery = useDashboardConsolidatedSnapshot({ farmId: farmId ?? null })
  const productionSummaryQuery = useProductionSummary({
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
    farmId: farmId ?? null,
  })
  const summary = summaryQuery.data ?? null
  const rows = productionSummaryQuery.data?.status === "success" ? productionSummaryQuery.data.data : []
  const loading = summaryQuery.isLoading || productionSummaryQuery.isLoading
  const chartRows = useMemo(() => sortByDateAsc(rows, (row) => row.date), [rows])

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
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartRows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="efcr_period" stroke="var(--color-chart-1)" name="eFCR" />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="total_biomass"
                  stroke="var(--color-chart-2)"
                  name="Biomass (kg)"
                />
              </LineChart>
            </ResponsiveContainer>
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
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="system_name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total_biomass" fill="var(--color-chart-1)" name="Biomass (kg)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance Records</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left font-semibold">Date</th>
                <th className="px-4 py-2 text-left font-semibold">System</th>
                <th className="px-4 py-2 text-center font-semibold">eFCR</th>
                <th className="px-4 py-2 text-center font-semibold">Biomass (kg)</th>
                <th className="px-4 py-2 text-center font-semibold">Mortality</th>
                <th className="px-4 py-2 text-center font-semibold">eFCR (Agg)</th>
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
                  <tr key={`${row.system_id}-${row.date}`} className="border-b border-border hover:bg-muted/30">
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
        </CardContent>
      </Card>
    </div>
  )
}

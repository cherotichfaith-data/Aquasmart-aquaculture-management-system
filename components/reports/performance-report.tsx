"use client"

import { useEffect, useMemo, useState } from "react"
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
import { fetchDashboardSnapshot, fetchProductionSummary } from "@/lib/supabase-queries"

export default function PerformanceReport({ dateRange }: { dateRange?: { from: string; to: string } }) {
  const [summary, setSummary] = useState<any>(null)
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      const [summarySnapshot, summaryRows] = await Promise.all([fetchDashboardSnapshot(), fetchProductionSummary()])
      setSummary(summarySnapshot)
      setRows(summaryRows.status === "success" ? summaryRows.data : [])
      setLoading(false)
    }
    loadData()
  }, [dateRange])

  const latestBySystem = useMemo(() => {
    const map = new Map<number, any>()
    rows.forEach((row) => {
      if (!map.has(row.system_id)) {
        map.set(row.system_id, row)
      }
    })
    return Array.from(map.values())
  }, [rows])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Farm eFCR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.farm_efcr ?? "N/A"}</div>
            <p className="text-xs text-muted-foreground mt-1">Backend consolidated</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Farm Survival</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.farm_survival_rate ?? "N/A"}</div>
            <p className="text-xs text-muted-foreground mt-1">Consolidated rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Farm Biomass</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.farm_biomass ?? "N/A"}</div>
            <p className="text-xs text-muted-foreground mt-1">All systems</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Farm Mortality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.farm_mortality_count ?? "N/A"}</div>
            <p className="text-xs text-muted-foreground mt-1">Consolidated count</p>
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
              <LineChart data={rows}>
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
              <BarChart data={latestBySystem}>
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
                <th className="px-4 py-2 text-center font-semibold">Water Quality</th>
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
                    <td className="px-4 py-2 text-center">{row.water_quality_rating ?? "-"}</td>
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

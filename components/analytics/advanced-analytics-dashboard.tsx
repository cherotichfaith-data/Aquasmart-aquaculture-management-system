"use client"

import { useEffect, useMemo, useState } from "react"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchDashboardSnapshot, fetchProductionSummary } from "@/lib/supabase-queries"

export default function AdvancedAnalyticsDashboard({ timeRange, metric }: { timeRange: string; metric: string }) {
  const [summary, setSummary] = useState<any>(null)
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true)
      const [snapshot, summaryRows] = await Promise.all([fetchDashboardSnapshot(), fetchProductionSummary({ limit: 100 })])
      setSummary(snapshot)
      setRows(summaryRows.status === "success" ? summaryRows.data : [])
      setLoading(false)
    }
    loadAnalytics()
  }, [timeRange, metric])

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
            <p className="text-xs text-muted-foreground mt-1">Latest period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Water Quality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.farm_avg_water_quality ?? "N/A"}</div>
            <p className="text-xs text-muted-foreground mt-1">Backend rating</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Water Quality vs eFCR</CardTitle>
            <CardDescription>Relationship between rating and feed efficiency</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading...</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="water_quality_rating" name="Water Quality" />
                  <YAxis type="number" dataKey="efcr_period" name="eFCR" />
                  <Tooltip />
                  <Scatter name="Quality vs eFCR" data={rows} fill="var(--color-chart-1)" />
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feed Amount by System</CardTitle>
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
                  <Bar dataKey="total_feed_amount_period" fill="var(--color-chart-3)" name="Feed (kg)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Biomass Growth</CardTitle>
          <CardDescription>Area chart of total biomass</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={rows}>
                <defs>
                  <linearGradient id="colorBiomass" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="total_biomass" stroke="var(--color-chart-1)" fill="url(#colorBiomass)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

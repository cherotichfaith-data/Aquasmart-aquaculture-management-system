"use client"

import { useMemo } from "react"
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useProductionSummary } from "@/lib/hooks/use-production"
import { useActiveFarm } from "@/hooks/use-active-farm"
import { sortByDateAsc } from "@/lib/utils"

export default function GrowthReport({ dateRange }: { dateRange?: { from: string; to: string } }) {
  const { farmId } = useActiveFarm()
  const productionSummaryQuery = useProductionSummary({
    limit: 100,
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
    farmId: farmId ?? null,
  })
  const rows = productionSummaryQuery.data?.status === "success" ? productionSummaryQuery.data.data : []
  const loading = productionSummaryQuery.isLoading

  const latest = rows[0]
  const chartRows = useMemo(() => sortByDateAsc(rows, (row) => row.date), [rows])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current ABW</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latest?.average_body_weight ?? "N/A"}</div>
            <p className="text-xs text-muted-foreground mt-1">Latest snapshot</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Biomass Increase</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latest?.biomass_increase_period ?? "N/A"}</div>
            <p className="text-xs text-muted-foreground mt-1">Latest period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Biomass</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latest?.total_biomass ?? "N/A"}</div>
            <p className="text-xs text-muted-foreground mt-1">Latest snapshot</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Feed Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latest?.total_feed_amount_period ?? "N/A"}</div>
            <p className="text-xs text-muted-foreground mt-1">Latest period</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Average Body Weight (ABW)</CardTitle>
          <CardDescription>ABW progression over time</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartRows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="average_body_weight"
                  fill="var(--color-chart-1)"
                  stroke="var(--color-chart-1)"
                  name="ABW"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Biomass Trend</CardTitle>
          <CardDescription>Total biomass per date</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartRows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total_biomass" stroke="var(--color-chart-2)" name="Biomass (kg)" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Growth by System</CardTitle>
          <CardDescription>Latest snapshot per system</CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left font-semibold">System</th>
                <th className="px-4 py-2 text-center font-semibold">ABW</th>
                <th className="px-4 py-2 text-center font-semibold">Biomass</th>
                <th className="px-4 py-2 text-center font-semibold">Fish Count</th>
                <th className="px-4 py-2 text-center font-semibold">Daily Gain</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : rows.length > 0 ? (
                rows.map((row) => (
                  <tr key={`${row.system_id}-${row.date}`} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-2 font-medium">{row.system_name ?? row.system_id}</td>
                    <td className="px-4 py-2 text-center">{row.average_body_weight ?? "-"}</td>
                    <td className="px-4 py-2 text-center">{row.total_biomass ?? "-"}</td>
                    <td className="px-4 py-2 text-center">{row.number_of_fish_inventory ?? "-"}</td>
                    <td className="px-4 py-2 text-center">{row.biomass_increase_period ?? "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center text-muted-foreground">
                    No growth records found
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

"use client"

import { useMemo } from "react"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useMortalityData } from "@/lib/hooks/use-reports"
import { sortByDateAsc } from "@/lib/utils"

export default function MortalityReport({ dateRange }: { dateRange?: { from: string; to: string } }) {
  const mortalityQuery = useMortalityData({
    limit: 100,
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
  })
  const rows = mortalityQuery.data?.status === "success" ? mortalityQuery.data.data : []
  const loading = mortalityQuery.isLoading
  const chartRows = useMemo(() => sortByDateAsc(rows, (row) => row.date), [rows])

  const latest = rows[0]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Latest Record</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latest?.date ?? "N/A"}</div>
            <p className="text-xs text-muted-foreground mt-1">Most recent entry</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mortality Trend</CardTitle>
          <CardDescription>Daily mortality counts</CardDescription>
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
                <Line type="monotone" dataKey="number_of_fish_mortality" stroke="var(--color-destructive)" name="Mortality Count" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mortality by System</CardTitle>
          <CardDescription>Aggregate counts per system</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              System-level aggregation provided by backend views.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mortality Records</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left font-semibold">Date</th>
                <th className="px-4 py-2 text-left font-semibold">System</th>
                <th className="px-4 py-2 text-left font-semibold">Batch</th>
                <th className="px-4 py-2 text-left font-semibold">Fish Dead</th>
                <th className="px-4 py-2 text-left font-semibold">ABW</th>
                <th className="px-4 py-2 text-left font-semibold">Total Weight</th>
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
                  <tr key={row.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-2 font-medium">{row.date}</td>
                    <td className="px-4 py-2">{row.system_id}</td>
                    <td className="px-4 py-2">{row.batch_id ?? "-"}</td>
                    <td className="px-4 py-2">{row.number_of_fish_mortality}</td>
                    <td className="px-4 py-2">{row.abw ?? "-"}</td>
                    <td className="px-4 py-2">{row.total_weight_mortality ?? "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center text-muted-foreground">
                    No mortality records found
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

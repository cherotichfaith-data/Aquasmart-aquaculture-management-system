"use client"

import { useEffect, useMemo, useState } from "react"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchMortalityData } from "@/lib/supabase-queries"

export default function MortalityReport({ dateRange }: { dateRange?: { from: string; to: string } }) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      const result = await fetchMortalityData({ limit: 100 })
      setRows(result.status === "success" ? result.data : [])
      setLoading(false)
    }
    loadData()
  }, [dateRange])

  const totalMortality = rows.reduce((sum, row) => sum + (row.number_of_fish_mortality || 0), 0)
  const uniqueSystems = new Set(rows.map((row) => row.system_id)).size
  const avgPerRecord = rows.length > 0 ? totalMortality / rows.length : 0

  const trendData = useMemo(() => {
    const map = new Map<string, number>()
    rows.forEach((row) => {
      const key = row.date
      map.set(key, (map.get(key) ?? 0) + (row.number_of_fish_mortality || 0))
    })
    return Array.from(map.entries()).map(([date, count]) => ({ date, count }))
  }, [rows])

  const systemData = useMemo(() => {
    const map = new Map<number, number>()
    rows.forEach((row) => {
      map.set(row.system_id, (map.get(row.system_id) ?? 0) + (row.number_of_fish_mortality || 0))
    })
    return Array.from(map.entries()).map(([system_id, count]) => ({ system_id, count }))
  }, [rows])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Mortality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMortality}</div>
            <p className="text-xs text-muted-foreground mt-1">From backend records</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg per Record</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgPerRecord.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground mt-1">Deaths per entry</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unique Systems</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueSystems}</div>
            <p className="text-xs text-muted-foreground mt-1">With mortality logs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Latest Record</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rows[0]?.date ?? "N/A"}</div>
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
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="var(--color-destructive)" name="Mortality Count" />
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
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={systemData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="system_id" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="var(--color-destructive)" name="Fish Died" />
              </BarChart>
            </ResponsiveContainer>
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

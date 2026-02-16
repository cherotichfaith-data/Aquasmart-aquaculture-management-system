"use client"

import { useMemo } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useFeedingRecords } from "@/lib/hooks/use-reports"
import { sortByDateAsc } from "@/lib/utils"

export default function FeedingReport({ dateRange }: { dateRange?: { from: string; to: string } }) {
  const feedingRecordsQuery = useFeedingRecords({
    limit: 100,
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
  })
  const records = feedingRecordsQuery.data?.status === "success" ? feedingRecordsQuery.data.data : []
  const loading = feedingRecordsQuery.isLoading
  const chartRecords = useMemo(() => sortByDateAsc(records, (row) => row.date), [records])

  const latest = records[0]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Latest Feed Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latest?.feeding_amount ?? "N/A"} kg</div>
            <p className="text-xs text-muted-foreground mt-1">Most recent record</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Feeding Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{records.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 100 entries</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Latest Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{records[0]?.date ?? "N/A"}</div>
            <p className="text-xs text-muted-foreground mt-1">Most recent feeding</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feeding Amounts Over Time</CardTitle>
          <CardDescription>Daily feeding records from the backend</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartRecords}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="feeding_amount" stroke="var(--color-chart-1)" name="Feed (kg)" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feeding Records</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left font-semibold">Date</th>
                <th className="px-4 py-2 text-left font-semibold">System</th>
                <th className="px-4 py-2 text-left font-semibold">Batch</th>
                <th className="px-4 py-2 text-left font-semibold">Feed Type</th>
                <th className="px-4 py-2 text-left font-semibold">Amount (kg)</th>
                <th className="px-4 py-2 text-left font-semibold">Response</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : records.length > 0 ? (
                records.map((row) => (
                  <tr key={row.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-2 font-medium">{row.date}</td>
                    <td className="px-4 py-2">{row.system_id}</td>
                    <td className="px-4 py-2">{row.batch_id ?? "-"}</td>
                    <td className="px-4 py-2">{row.feed_type?.feed_line ?? row.feed_type_id}</td>
                    <td className="px-4 py-2">{row.feeding_amount}</td>
                    <td className="px-4 py-2">{row.feeding_response}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center text-muted-foreground">
                    No feeding records found
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

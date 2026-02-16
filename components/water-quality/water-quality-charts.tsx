"use client"

import { useMemo } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useWaterQualityRatings } from "@/lib/hooks/use-water-quality"
import { useActiveFarm } from "@/hooks/use-active-farm"

type ChartRow = {
  date: string
  rating: number | null
}

const formatDateLabel = (value: string) => {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date)
}

export default function WaterQualityCharts() {
  const { farmId } = useActiveFarm()
  const ratingsQuery = useWaterQualityRatings({ limit: 120, farmId })

  const data = useMemo<ChartRow[]>(() => {
    if (ratingsQuery.data?.status !== "success") return []
    return ratingsQuery.data.data
      .map((row) => ({
        date: row.rating_date?.split("T")[0] ?? "",
        rating: typeof row.rating_numeric === "number" ? row.rating_numeric : null,
      }))
      .filter((row) => row.date && row.rating != null)
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [ratingsQuery.data])

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Water Quality Rating</CardTitle>
          <CardDescription>Trend from the dashboard view</CardDescription>
        </CardHeader>
        <CardContent>
          {ratingsQuery.isLoading ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : data.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">No data available.</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDateLabel} />
                <YAxis domain={[0, 3]} />
                <Tooltip
                  formatter={(value) => [`${value}`, "Rating"]}
                  labelFormatter={(label) => formatDateLabel(String(label))}
                />
                <Line type="monotone" dataKey="rating" stroke="var(--color-chart-1)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

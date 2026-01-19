"use client"

import { useEffect, useMemo, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchWaterQualityMeasurements, type WaterQualityMeasurementWithUnit } from "@/lib/supabase-queries"

const parameterKeyMap = {
  dissolved_oxygen: "do",
  temperature: "temp",
  pH: "ph",
  ammonia_ammonium: "ammonia",
} as const

type ChartRow = {
  timestamp: string
  do?: number
  temp?: number
  ph?: number
  ammonia?: number
}

const buildSeries = (
  rows: WaterQualityMeasurementWithUnit[],
  parameters: Array<keyof typeof parameterKeyMap>,
) => {
  const seriesMap = new Map<string, ChartRow>()

  rows.forEach((row) => {
    if (!parameters.includes(row.parameter_name)) return
    const key = `${row.date} ${row.time}`
    const entry = seriesMap.get(key) ?? { timestamp: key }
    const valueKey = parameterKeyMap[row.parameter_name]
    entry[valueKey] = row.parameter_value
    seriesMap.set(key, entry)
  })

  return Array.from(seriesMap.values()).sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}

export default function WaterQualityCharts() {
  const [measurements, setMeasurements] = useState<WaterQualityMeasurementWithUnit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadMeasurements = async () => {
      setLoading(true)
      const result = await fetchWaterQualityMeasurements({ limit: 100 })
      setMeasurements(result.status === "success" ? result.data : [])
      setLoading(false)
    }
    loadMeasurements()
  }, [])

  const doTemperatureData = useMemo(
    () => buildSeries(measurements, ["dissolved_oxygen", "temperature"]),
    [measurements],
  )
  const phAmmoniaData = useMemo(
    () => buildSeries(measurements, ["pH", "ammonia_ammonium"]),
    [measurements],
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>DO & Temperature</CardTitle>
          <CardDescription>Recent measurements from monitored systems</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={doTemperatureData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="do" stroke="var(--color-chart-1)" name="DO (mg/L)" />
                <Line yAxisId="right" type="monotone" dataKey="temp" stroke="var(--color-chart-2)" name="Temp (deg C)" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>pH & Ammonia</CardTitle>
          <CardDescription>Recent chemistry readings</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={phAmmoniaData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis yAxisId="left" domain={[6, 8]} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 0.1]} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="ph" stroke="var(--color-chart-3)" name="pH" />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="ammonia"
                  stroke="var(--color-chart-4)"
                  name="Ammonia (mg/L)"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { fetchWaterQualityMeasurements, type WaterQualityMeasurementWithUnit } from "@/lib/supabase-queries"

export default function WaterQualityHistory() {
  const [history, setHistory] = useState<WaterQualityMeasurementWithUnit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true)
      const result = await fetchWaterQualityMeasurements({ limit: 20 })
      setHistory(result.status === "success" ? result.data : [])
      setLoading(false)
    }
    loadHistory()
  }, [])

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold">Recent Measurements</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-4 py-3 text-left font-semibold">Date</th>
              <th className="px-4 py-3 text-left font-semibold">Time</th>
              <th className="px-4 py-3 text-left font-semibold">System</th>
              <th className="px-4 py-3 text-left font-semibold">Parameter</th>
              <th className="px-4 py-3 text-left font-semibold">Value</th>
              <th className="px-4 py-3 text-left font-semibold">Unit</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : history.length > 0 ? (
              history.map((row) => (
                <tr key={row.id} className="border-b border-border hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{row.date}</td>
                  <td className="px-4 py-3">{row.time}</td>
                  <td className="px-4 py-3">{row.system_id}</td>
                  <td className="px-4 py-3">{row.parameter_name}</td>
                  <td className="px-4 py-3">{row.parameter_value}</td>
                  <td className="px-4 py-3">{row.water_quality_framework?.unit ?? "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  No measurements found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

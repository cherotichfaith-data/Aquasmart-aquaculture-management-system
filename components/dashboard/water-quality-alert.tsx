"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, AlertCircle } from "lucide-react"
import type { Enums } from "@/lib/types/database"
import { fetchWaterQualityRatings } from "@/lib/supabase-queries"

export default function WaterQualityAlert({ stage }: { stage: Enums<"system_growth_stage"> }) {
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadAlerts = async () => {
      setLoading(true)
      const result = await fetchWaterQualityRatings({ limit: 5 })
      const rows = result.status === "success" ? result.data : []
      const derivedAlerts = rows
        .filter((row) => row.rating !== "optimal")
        .map((row) => ({
          severity: row.rating === "critical" || row.rating === "lethal" ? "high" : "medium",
          message: `Water quality: ${row.rating}`,
          detail: row.worst_parameter
            ? `Worst: ${row.worst_parameter} ${row.worst_parameter_value ?? ""}${row.worst_parameter_unit ? ` ${row.worst_parameter_unit}` : ""}`
            : "No parameter details",
          timestamp: row.rating_date,
        }))
      setAlerts(derivedAlerts)
      setLoading(false)
    }
    loadAlerts()
  }, [stage])

  if (loading) {
    return (
      <div className="bg-muted/30 border border-border rounded-lg p-4 text-center text-muted-foreground text-sm">
        Loading water quality alerts...
      </div>
    )
  }

  const criticalAlerts = alerts.filter((a) => a.severity === "high")

  if (criticalAlerts.length === 0 && alerts.length === 0) {
    return (
      <div className="bg-chart-1/10 border border-chart-1/30 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle size={20} className="text-chart-1 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sm">Water Quality Status: Good</p>
          <p className="text-xs text-muted-foreground mt-1">All parameters are within optimal ranges</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <div
          key={i}
          className={`rounded-lg p-4 flex items-start gap-3 border ${
            alert.severity === "high"
              ? "bg-destructive/10 border-destructive/30"
              : "bg-yellow-500/10 border-yellow-500/30"
          }`}
        >
          <AlertTriangle
            size={20}
            className={`${alert.severity === "high" ? "text-destructive" : "text-yellow-600"} flex-shrink-0 mt-0.5`}
          />
          <div className="flex-1">
            <p className="font-semibold text-sm">{alert.message}</p>
            <p className="text-xs text-muted-foreground mt-1">{alert.detail}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

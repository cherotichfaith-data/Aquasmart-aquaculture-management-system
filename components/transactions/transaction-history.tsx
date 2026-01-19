"use client"

import { useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { AlertCircle, Clock, CornerDownRight, Droplets, Fish } from "lucide-react"
import { fetchActivities } from "@/lib/supabase-queries"
import type { Tables } from "@/lib/types/database"

type ChangeLogRow = Tables<"change_log">

const typeLabels: Record<string, string> = {
  feeding_record: "Feeding",
  fish_sampling_weight: "Sampling",
  water_quality_measurement: "Water Quality",
  fish_mortality: "Mortality",
  fish_transfer: "Transfer",
  fish_harvest: "Harvest",
  fish_stocking: "Stocking",
}

const getIcon = (table: string) => {
  switch (table) {
    case "feeding_record":
      return <Clock size={16} />
    case "fish_sampling_weight":
      return <Fish size={16} />
    case "water_quality_measurement":
      return <Droplets size={16} />
    case "fish_mortality":
      return <AlertCircle size={16} />
    case "fish_transfer":
      return <CornerDownRight size={16} />
    case "fish_harvest":
    case "fish_stocking":
      return <Fish size={16} />
    default:
      return <Clock size={16} />
  }
}

const getColor = (table: string) => {
  switch (table) {
    case "feeding_record":
      return "bg-blue-500/10 text-blue-600"
    case "fish_sampling_weight":
      return "bg-purple-500/10 text-purple-600"
    case "water_quality_measurement":
      return "bg-green-500/10 text-green-600"
    case "fish_mortality":
      return "bg-red-500/10 text-red-600"
    case "fish_transfer":
      return "bg-orange-500/10 text-orange-600"
    case "fish_harvest":
    case "fish_stocking":
      return "bg-amber-500/10 text-amber-600"
    default:
      return "bg-gray-500/10 text-gray-600"
  }
}

const formatTime = (value: string) => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return formatDistanceToNow(parsed, { addSuffix: true })
}

const formatDetails = (activity: ChangeLogRow) => {
  const parts: string[] = [activity.change_type]
  if (activity.column_name) parts.push(activity.column_name)
  if (activity.old_value && activity.new_value) {
    parts.push(`${activity.old_value} -> ${activity.new_value}`)
  } else if (activity.new_value) {
    parts.push(activity.new_value)
  } else if (activity.old_value) {
    parts.push(activity.old_value)
  }
  return parts.join(" ")
}

export default function TransactionHistory() {
  const [activities, setActivities] = useState<ChangeLogRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const loadActivities = async () => {
      setLoading(true)
      const result = await fetchActivities({ limit: 10 })
      if (!isMounted) return
      setActivities(result.status === "success" && result.data ? result.data : [])
      setLoading(false)
    }
    loadActivities()
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold">Recent Transactions</h2>
      </div>
      <div className="divide-y divide-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-4 py-3 text-left font-semibold">Type</th>
              <th className="px-4 py-3 text-left font-semibold">Table</th>
              <th className="px-4 py-3 text-left font-semibold">Record</th>
              <th className="px-4 py-3 text-left font-semibold">Details</th>
              <th className="px-4 py-3 text-left font-semibold">Time</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : activities.length > 0 ? (
              activities.map((activity) => (
                <tr key={activity.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className={`p-2 rounded-lg w-fit ${getColor(activity.table_name)}`}>
                      {getIcon(activity.table_name)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{typeLabels[activity.table_name] ?? activity.table_name}</div>
                    <div className="text-xs text-muted-foreground">{activity.table_name}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">#{activity.record_id}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDetails(activity)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatTime(activity.change_time)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  No recent transactions found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

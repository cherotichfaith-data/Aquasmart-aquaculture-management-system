"use client"

import { useEffect, useState } from "react"
import { Clock, Fish, Droplets, AlertCircle, CornerDownRight } from "lucide-react"
import { fetchActivities } from "@/lib/supabase-queries"

export default function RecentActivities({ batch = "all", system = "all" }: { batch?: string; system?: string }) {
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadActivities = async () => {
      setLoading(true)
      const result = await fetchActivities({
        limit: 5,
      })
      setActivities(result.data || [])
      setLoading(false)
    }
    loadActivities()
  }, [batch, system])

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
      default:
        return <Clock size={16} />
    }
  }

  const getColor = (table: string) => {
    switch (table) {
      case "feeding_record":
        return "bg-sky-500/10 text-sky-600"
      case "fish_sampling_weight":
        return "bg-purple-500/10 text-purple-600"
      case "water_quality_measurement":
        return "bg-emerald-500/10 text-emerald-600"
      case "fish_mortality":
        return "bg-rose-500/10 text-rose-600"
      case "fish_transfer":
        return "bg-amber-500/10 text-amber-600"
      default:
        return "bg-slate-500/10 text-slate-600"
    }
  }

  const getLabel = (table: string) => {
    switch (table) {
      case "feeding_record":
        return "Feeding"
      case "fish_sampling_weight":
        return "Sampling"
      case "water_quality_measurement":
        return "Water quality"
      case "fish_mortality":
        return "Mortality"
      case "fish_transfer":
        return "Transfer"
      default:
        return table.replace(/_/g, " ")
    }
  }

  const formatTime = (value: string) => {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "2-digit" }).format(parsed)
  }

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-sm">Activities</h2>
        </div>
        <div className="p-4 text-center text-muted-foreground text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold text-sm">Activities</h2>
        <span className="text-xs text-muted-foreground">{activities.length} updates</span>
      </div>
      <div className="divide-y divide-border">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <div key={activity.id} className="p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-full flex items-center justify-center ${getColor(activity.table_name)}`}>
                  {getIcon(activity.table_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground">{getLabel(activity.table_name)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activity.change_type}
                    {activity.column_name ? ` · ${activity.column_name}` : ""}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{formatTime(activity.change_time)}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="p-4 text-center text-muted-foreground text-sm">No recent activities found</div>
        )}
      </div>
    </div>
  )
}

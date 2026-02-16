"use client"

import { Clock, Fish, Droplets, AlertCircle, CornerDownRight } from "lucide-react"
import { useRecentActivities } from "@/lib/hooks/use-dashboard"

export default function RecentActivities({
  batch = "all",
  system = "all",
  title = "Activities",
  countLabel = "updates",
}: {
  batch?: string
  system?: string
  title?: string
  countLabel?: string
}) {
  const activitiesQuery = useRecentActivities({ limit: 5 })

  const activities = activitiesQuery.data?.status === "success" ? activitiesQuery.data.data : []
  const loading = activitiesQuery.isLoading

  const normalizeTableName = (table: string) => {
    switch (table) {
      case "feeding_events":
      case "feeding_record":
        return "feeding_record"
      case "sampling_events":
      case "fish_sampling_weight":
        return "fish_sampling_weight"
      case "water_quality_events":
      case "water_quality_measurement":
        return "water_quality_measurement"
      case "mortality_events":
      case "fish_mortality":
        return "fish_mortality"
      case "transfer_events":
      case "fish_transfer":
        return "fish_transfer"
      case "harvest_events":
      case "fish_harvest":
        return "fish_harvest"
      case "incoming_feed_events":
      case "feed_incoming":
        return "feed_incoming"
      case "stocking_events":
      case "fish_stocking":
        return "fish_stocking"
      default:
        return table
    }
  }

  const getIcon = (table: string) => {
    switch (normalizeTableName(table)) {
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
        return <Fish size={16} />
      case "feed_incoming":
        return <Clock size={16} />
      case "fish_stocking":
        return <Fish size={16} />
      default:
        return <Clock size={16} />
    }
  }

  const getColor = (table: string) => {
    switch (normalizeTableName(table)) {
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
      case "fish_harvest":
        return "bg-lime-500/10 text-lime-600"
      case "feed_incoming":
        return "bg-blue-500/10 text-blue-600"
      case "fish_stocking":
        return "bg-indigo-500/10 text-indigo-600"
      default:
        return "bg-slate-500/10 text-slate-600"
    }
  }

  const getLabel = (table: string) => {
    switch (normalizeTableName(table)) {
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
      case "fish_harvest":
        return "Harvest"
      case "feed_incoming":
        return "Incoming feed"
      case "fish_stocking":
        return "Stocking"
      default:
        return normalizeTableName(table).replace(/_/g, " ")
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
          <h2 className="font-semibold text-sm">{title}</h2>
        </div>
        <div className="p-4 text-center text-muted-foreground text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold text-sm">{title}</h2>
        <span className="text-xs text-muted-foreground">
          {activities.length} {countLabel}
        </span>
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

"use client"

import { useMemo } from "react"
import type { Enums } from "@/lib/types/database"
import { useRecommendedActions } from "@/lib/hooks/use-dashboard"
import { useActiveFarm } from "@/hooks/use-active-farm"

type ActionItem = {
  title: string
  description: string
  priority: "High" | "Medium" | "Info"
  due: string
}

const priorityStyles = {
  High: "bg-rose-50 text-rose-700",
  Medium: "bg-amber-50 text-amber-700",
  Info: "bg-emerald-50 text-emerald-700",
}

export default function RecommendedActions({
  system,
  timePeriod,
}: {
  system?: string
  timePeriod?: Enums<"time_period">
}) {
  const { farmId } = useActiveFarm()
  const actionsQuery = useRecommendedActions({ farmId, system, timePeriod })

  const actions = useMemo(() => actionsQuery.data ?? [], [actionsQuery.data])
  const loading = actionsQuery.isLoading

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array(3)
          .fill(0)
          .map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-4 h-40 animate-pulse" />
          ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {actions.map((action) => (
        <div key={action.title} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="h-2 bg-sidebar-primary" />
          <div className="p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-sm">{action.title}</h3>
              <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${priorityStyles[action.priority]}`}>
                {action.priority} Priority
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-3">{action.description}</p>
            <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
              <span>Due: {action.due}</span>
              <button className="text-sidebar-primary font-semibold">Schedule</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

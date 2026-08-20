"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarDays, CheckCircle2, Clock3, Plus, Trash2 } from "lucide-react"

import { Badge } from "@/components/app-ui/badge"
import { Button } from "@/components/app-ui/button"
import { Card, CardContent, CardHeader } from "@/components/app-ui/card"
import { Input } from "@/components/app-ui/input"
import {
  type PlannedActivity,
  buildDefaultPlannedActivityDate,
  formatPlannedActivityDateLabel,
  getLocalDateIso,
  getTomorrowDateIso,
  isThisWeek,
} from "@/features/dashboard/planned-activities"

export default function PlannedActivitiesTimeline({ farmId }: { farmId: string }) {
  const [activities, setActivities] = useState<PlannedActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")
  const [planningWindow, setPlanningWindow] = useState<PlannedActivity["planning_window"]>("tomorrow")
  const [date, setDate] = useState("")

  async function loadActivities(signal?: AbortSignal) {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/planned-activities?farmId=${encodeURIComponent(farmId)}`, {
        method: "GET",
        credentials: "include",
        signal,
      })
      const payload = (await response.json().catch(() => null)) as { data?: PlannedActivity[]; error?: string } | null
      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to load planned activities.")
      }
      setActivities(payload?.data ?? [])
    } catch (nextError) {
      if (signal?.aborted) return
      setError(nextError instanceof Error ? nextError.message : "Unable to load planned activities.")
    } finally {
      if (!signal?.aborted) setIsLoading(false)
    }
  }

  useEffect(() => {
    setDate(buildDefaultPlannedActivityDate("tomorrow"))
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadActivities(controller.signal)
    return () => controller.abort()
  }, [farmId])

  useEffect(() => {
    setDate((current) => current || buildDefaultPlannedActivityDate(planningWindow))
  }, [planningWindow])

  const upcomingActivities = useMemo(() => {
    const todayIso = getLocalDateIso()
    return activities
      .filter((activity) => activity.scheduled_date >= todayIso)
      .sort((left, right) => {
        if (left.scheduled_date !== right.scheduled_date) return left.scheduled_date.localeCompare(right.scheduled_date)
        return left.created_at.localeCompare(right.created_at)
      })
  }, [activities])

  const groupedActivities = useMemo(() => {
    const grouped = new Map<string, PlannedActivity[]>()
    for (const activity of upcomingActivities) {
      const bucket = grouped.get(activity.scheduled_date) ?? []
      bucket.push(activity)
      grouped.set(activity.scheduled_date, bucket)
    }
    return Array.from(grouped.entries())
  }, [upcomingActivities])

  const plannedCount = upcomingActivities.filter((activity) => activity.status === "planned").length
  const tomorrowCount = upcomingActivities.filter((activity) => activity.scheduled_date === getTomorrowDateIso()).length
  const thisWeekCount = upcomingActivities.filter((activity) => isThisWeek(activity.scheduled_date)).length

  function resetForm(nextWindow: PlannedActivity["planning_window"]) {
    setTitle("")
    setNotes("")
    setPlanningWindow(nextWindow)
    setDate(buildDefaultPlannedActivityDate(nextWindow))
  }

  async function addActivity() {
    const trimmedTitle = title.trim()
    if (!trimmedTitle || !date) return

    setIsSaving(true)
    setError(null)
    try {
      const response = await fetch("/api/planned-activities", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId,
          title: trimmedTitle,
          notes: notes.trim(),
          scheduledDate: date,
          planningWindow,
        }),
      })
      const payload = (await response.json().catch(() => null)) as { data?: PlannedActivity; error?: string } | null
      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error ?? "Unable to create planned activity.")
      }

      setActivities((current) =>
        [...current, payload.data!].sort((left, right) => {
          if (left.scheduled_date !== right.scheduled_date) return left.scheduled_date.localeCompare(right.scheduled_date)
          return left.created_at.localeCompare(right.created_at)
        }),
      )
      resetForm(planningWindow)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to create planned activity.")
    } finally {
      setIsSaving(false)
    }
  }

  async function toggleDone(activity: PlannedActivity) {
    setError(null)
    const nextStatus = activity.status === "done" ? "planned" : "done"
    try {
      const response = await fetch(`/api/planned-activities/${activity.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId,
          status: nextStatus,
        }),
      })
      const payload = (await response.json().catch(() => null)) as { data?: PlannedActivity; error?: string } | null
      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error ?? "Unable to update planned activity.")
      }

      setActivities((current) => current.map((item) => (item.id === activity.id ? payload.data! : item)))
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update planned activity.")
    }
  }

  async function removeActivity(activityId: string) {
    setError(null)
    try {
      const response = await fetch(`/api/planned-activities/${activityId}?farmId=${encodeURIComponent(farmId)}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!response.ok && response.status !== 204) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error ?? "Unable to delete planned activity.")
      }

      setActivities((current) => current.filter((activity) => activity.id !== activityId))
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to delete planned activity.")
    }
  }

  return (
    <Card>
      <CardHeader className="gap-4 md:flex md:flex-row md:items-start md:justify-between">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{tomorrowCount} tomorrow</Badge>
          <Badge variant="outline">{thisWeekCount} this week</Badge>
          <Badge variant={plannedCount > 0 ? "neutral" : "outline"}>{plannedCount} pending</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
          <div className="grid gap-3">
            <div className="grid gap-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Task</label>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Prepare feed inventory count"
                maxLength={120}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Plan window</label>
                <select
                  value={planningWindow}
                  onChange={(event) => {
                    const nextWindow = event.target.value as PlannedActivity["planning_window"]
                    setPlanningWindow(nextWindow)
                    setDate(buildDefaultPlannedActivityDate(nextWindow))
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="tomorrow">Tomorrow</option>
                  <option value="this_week">This week</option>
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Date</label>
                <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional detail for the team handoff"
                rows={4}
                className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <Button onClick={() => void addActivity()} disabled={!title.trim() || !date || isSaving} className="justify-self-start">
              <Plus className="size-4" />
              {isSaving ? "Saving..." : "Add to planner"}
            </Button>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-background">
          <div className="border-b border-border/80 px-4 py-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <CalendarDays className="size-4 text-primary" />
              Upcoming planned work
            </div>
          </div>
          <div className="px-4 py-4">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading activity planner...</div>
            ) : groupedActivities.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
                No planned activities yet. Add tomorrow&apos;s tasks or this week&apos;s work to fill the planner.
              </div>
            ) : (
              <div className="space-y-5">
                {groupedActivities.map(([groupDate, groupItems]) => (
                  <div key={groupDate} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-border/80" />
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {formatPlannedActivityDateLabel(groupDate)}
                      </div>
                      <div className="h-px flex-1 bg-border/80" />
                    </div>
                    <div className="space-y-3">
                      {groupItems.map((activity) => (
                        <div
                          key={activity.id}
                          className="grid gap-3 rounded-xl border border-border/80 bg-card px-4 py-4 md:grid-cols-[auto_1fr_auto]"
                        >
                          <div className="flex items-start pt-1">
                            <div
                              className={`size-3 rounded-full ${
                                activity.status === "done" ? "bg-success" : "bg-primary"
                              }`}
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium text-foreground">{activity.title}</p>
                              <Badge variant={activity.planning_window === "tomorrow" ? "secondary" : "outline"}>
                                {activity.planning_window === "tomorrow" ? "Tomorrow" : "This week"}
                              </Badge>
                              <Badge variant={activity.status === "done" ? "positive" : "neutral"}>
                                {activity.status === "done" ? "Done" : "Planned"}
                              </Badge>
                            </div>
                            {activity.notes ? (
                              <p className="text-sm leading-6 text-muted-foreground">{activity.notes}</p>
                            ) : null}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock3 className="size-3.5" />
                              <span>{activity.scheduled_date}</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 md:justify-self-end">
                            <Button variant="ghost" size="icon-sm" onClick={() => void toggleDone(activity)} aria-label="Toggle done">
                              <CheckCircle2 className="size-4" />
                            </Button>
                            <Button variant="ghost" size="icon-sm" onClick={() => void removeActivity(activity.id)} aria-label="Delete task">
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

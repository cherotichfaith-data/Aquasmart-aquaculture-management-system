export type PlannedActivityWindow = "tomorrow" | "this_week"
export type PlannedActivityStatus = "planned" | "done"

export type PlannedActivity = {
  id: string
  farm_id: string
  created_by: string
  title: string
  notes: string
  scheduled_date: string
  planning_window: PlannedActivityWindow
  status: PlannedActivityStatus
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type PlannedActivityInput = {
  farmId: string
  title: string
  notes: string
  scheduledDate: string
  planningWindow: PlannedActivityWindow
}

export function getLocalDateIso(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function getTomorrowDateIso(date = new Date()) {
  const next = new Date(date)
  next.setDate(next.getDate() + 1)
  return getLocalDateIso(next)
}

export function formatPlannedActivityDateLabel(date: string) {
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(parsed)
}

export function isThisWeek(date: string) {
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return false

  const today = new Date()
  const day = today.getDay()
  const distanceToMonday = day === 0 ? -6 : 1 - day
  const weekStart = new Date(today)
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(today.getDate() + distanceToMonday)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  return parsed >= weekStart && parsed <= weekEnd
}

export function buildDefaultPlannedActivityDate(window: PlannedActivityWindow) {
  if (window === "tomorrow") return getTomorrowDateIso()

  const today = new Date()
  const day = today.getDay()
  const distanceToFriday = day === 0 ? 5 : 5 - day
  const target = new Date(today)
  target.setDate(today.getDate() + (distanceToFriday >= 0 ? distanceToFriday : 1))
  return getLocalDateIso(target)
}

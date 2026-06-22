import { formatDateOnly } from "@/lib/analytics-format"
import type { TimePeriod } from "@/lib/time-period"

export type BucketGranularity = "day" | "week" | "month"

const DAY_MS = 86_400_000

const pad2 = (value: number) => String(value).padStart(2, "0")

export function parseDateOnly(value: string | null | undefined) {
  const parsed = new Date(`${value ?? ""}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function diffDateDays(start: string | null | undefined, end: string | null | undefined) {
  const startDate = parseDateOnly(start)
  const endDate = parseDateOnly(end)
  if (!startDate || !endDate || endDate < startDate) return null
  return Math.round((endDate.getTime() - startDate.getTime()) / DAY_MS)
}

function getWeekStart(date: Date) {
  const normalized = new Date(date.getTime())
  const day = normalized.getDay()
  const delta = day === 0 ? -6 : 1 - day
  normalized.setDate(normalized.getDate() + delta)
  return normalized
}

export function getBucketGranularity(
  timePeriod: TimePeriod,
  dateFrom?: string | null,
  dateTo?: string | null,
): BucketGranularity {
  const resolvedDays = diffDateDays(dateFrom, dateTo)
  const inclusiveDays = resolvedDays == null ? null : resolvedDays + 1

  if (inclusiveDays != null) {
    if (inclusiveDays <= 30) return "day"
    if (inclusiveDays <= 90) return "week"
    return "month"
  }

  if (timePeriod === "all history") return "month"
  return "day"
}

export function getBucketKey(value: string | null | undefined, granularity: BucketGranularity) {
  const date = parseDateOnly(value)
  if (!date) return null

  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  if (granularity === "day") {
    return `${year}-${pad2(month)}-${pad2(day)}`
  }

  if (granularity === "week") {
    return getBucketKey(toIsoDate(getWeekStart(date)), "day")
  }

  if (granularity === "month") {
    return `${year}-${pad2(month)}`
  }

  return `${year}-${pad2(month)}`
}

function toIsoDate(value: Date) {
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`
}

export function formatBucketLabel(value: string, granularity: BucketGranularity) {
  if (granularity === "day") {
    return formatDateOnly(value, value, { month: "short", day: "numeric" })
  }

  if (granularity === "week") {
    const start = parseDateOnly(value)
    if (!start) return value
    const end = new Date(start.getTime())
    end.setDate(end.getDate() + 6)
    return `${formatDateOnly(toIsoDate(start), value, { month: "short", day: "numeric" })} - ${formatDateOnly(
      toIsoDate(end),
      value,
      { month: "short", day: "numeric" },
    )}`
  }

  if (granularity === "month") {
    return formatDateOnly(`${value}-01`, value, { month: "short", year: "2-digit" })
  }

  return value
}

export function formatGranularityLabel(value: BucketGranularity) {
  if (value === "week") return "week"
  if (value === "month") return "month"
  return "day"
}

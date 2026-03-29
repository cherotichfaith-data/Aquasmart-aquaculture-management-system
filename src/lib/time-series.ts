import { formatDateOnly } from "@/lib/analytics-format"
import type { TimePeriod } from "@/lib/time-period"

export type BucketGranularity = "day" | "month" | "quarter"

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

export function getBucketGranularity(timePeriod: TimePeriod): BucketGranularity {
  switch (timePeriod) {
    case "quarter":
    case "6 months":
      return "month"
    case "year":
      return "quarter"
    default:
      return "day"
  }
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

  if (granularity === "month") {
    return `${year}-${pad2(month)}`
  }

  return `${year}-Q${Math.floor((month - 1) / 3) + 1}`
}

export function formatBucketLabel(value: string, granularity: BucketGranularity) {
  if (granularity === "day") {
    return formatDateOnly(value, value, { month: "short", day: "numeric" })
  }

  if (granularity === "month") {
    return formatDateOnly(`${value}-01`, value, { month: "short", year: "2-digit" })
  }

  const [year, quarterToken] = value.split("-Q")
  return quarterToken ? `Q${quarterToken} ${year}` : value
}

export function formatGranularityLabel(value: BucketGranularity) {
  if (value === "quarter") return "quarter"
  if (value === "month") return "month"
  return "day"
}

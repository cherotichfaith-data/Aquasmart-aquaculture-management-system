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


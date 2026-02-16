import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Enums } from './types/database'

const TIME_PERIOD_VALUES = [
  "day",
  "week",
  "2 weeks",
  "month",
  "quarter",
  "6 months",
  "year",
] as const

type TimePeriodValue = Enums<"time_period">
type ParsedTimePeriod =
  | { kind: "preset"; period: TimePeriodValue }
  | { kind: "custom"; period: "custom"; startDate: string; endDate: string }

const isTimePeriodValue = (value: string | null | undefined): value is TimePeriodValue =>
  Boolean(value && (TIME_PERIOD_VALUES as readonly string[]).includes(value))

const parseCustomRange = (value: string): { startDate: string; endDate: string } | null => {
  const match = /^custom_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})$/.exec(value)
  if (!match) return null

  const [, startDate, endDate] = match
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  if (start > end) return null

  return { startDate, endDate }
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseDateToTimePeriod(
  input: string | null | undefined,
  defaultPeriod: TimePeriodValue = "2 weeks",
): ParsedTimePeriod {
  const trimmed = input?.trim()
  if (isTimePeriodValue(trimmed)) {
    return { kind: "preset", period: trimmed }
  }

  if (trimmed) {
    const custom = parseCustomRange(trimmed)
    if (custom) {
      return { kind: "custom", period: "custom", ...custom }
    }
  }

  return { kind: "preset", period: defaultPeriod }
}

/**
 * Calculate date range based on time period
 * Returns start and end dates for the selected period
 */
export function getDateRangeFromPeriod(period: Enums<"time_period"> | string) {
  const today = new Date()
  const endDate = new Date(today)
  endDate.setHours(23, 59, 59, 999)

  const startDate = new Date(today)
  startDate.setHours(0, 0, 0, 0)

  switch (period) {
    case "day":
      // Last 1 day (today)
      startDate.setDate(startDate.getDate() - 1)
      break
    case "week":
      // Last 7 days
      startDate.setDate(startDate.getDate() - 7)
      break
    case "2 weeks":
      // Last 14 days
      startDate.setDate(startDate.getDate() - 14)
      break
    case "month":
      // Last 30 days
      startDate.setDate(startDate.getDate() - 30)
      break
    case "quarter":
      // Last 90 days
      startDate.setDate(startDate.getDate() - 90)
      break
    case "6 months":
      // Last 180 days
      startDate.setDate(startDate.getDate() - 180)
      break
    case "year":
      // Last 365 days
      startDate.setDate(startDate.getDate() - 365)
      break
    default:
      // Default to week
      startDate.setDate(startDate.getDate() - 7)
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  }
}

/**
 * Calculate date range for either a preset time period or a custom range.
 */
export function getDateRange(input: string | null | undefined, defaultPeriod: TimePeriodValue = "2 weeks") {
  const parsed = parseDateToTimePeriod(input, defaultPeriod)
  if (parsed.kind === "custom") {
    return {
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      period: parsed.period,
      isCustom: true,
    }
  }

  const range = getDateRangeFromPeriod(parsed.period)
  return {
    ...range,
    period: parsed.period,
    isCustom: false,
  }
}

/**
 * Format date range for display
 */
export function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate)
  const end = new Date(endDate)

  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const startStr = start.toLocaleDateString('en-US', options)
  const endStr = end.toLocaleDateString('en-US', { ...options, year: 'numeric' })

  return `${startStr} - ${endStr}`
}

/**
 * Convert time period to API period format
 */
export function toMetricsPeriod(period: Enums<"time_period"> | string): "7d" | "30d" | "90d" | "180d" | "365d" {
  const map: Record<string, "7d" | "30d" | "90d" | "180d" | "365d"> = {
    day: "7d",
    week: "7d",
    "2 weeks": "30d",
    month: "30d",
    quarter: "90d",
    "6 months": "180d",
    year: "365d",
  }
  return map[period] ?? "30d"
}

export function sortByDateAsc<T>(rows: T[], getDate: (row: T) => string | null | undefined): T[] {
  return [...rows].sort((a, b) => String(getDate(a) ?? "").localeCompare(String(getDate(b) ?? "")))
}

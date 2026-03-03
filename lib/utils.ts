import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Enums } from "./types/database"

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
  { kind: "preset"; period: TimePeriodValue }

const isTimePeriodValue = (value: string | null | undefined): value is TimePeriodValue =>
  Boolean(value && (TIME_PERIOD_VALUES as readonly string[]).includes(value))

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

  return { kind: "preset", period: defaultPeriod }
}

/**
 * Calculate date range based on time period
 * Returns start and end dates for the selected period
 */
export function getDateRangeFromPeriod(
  period: Enums<"time_period"> | string,
  asOfDate?: string | null,
): { startDate: string; endDate: string } {
  const anchor = asOfDate ? new Date(`${asOfDate}T00:00:00`) : new Date()
  const today = Number.isNaN(anchor.getTime()) ? new Date() : anchor
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
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  }
}

export function sortByDateAsc<T>(rows: T[], getDate: (row: T) => string | null | undefined): T[] {
  return [...rows].sort((a, b) => String(getDate(a) ?? "").localeCompare(String(getDate(b) ?? "")))
}

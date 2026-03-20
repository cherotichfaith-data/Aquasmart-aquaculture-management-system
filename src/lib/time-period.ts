import type { Enums } from "@/lib/types/database"

export type TimePeriod = Enums<"time_period">

export const TIME_PERIODS: TimePeriod[] = ["day", "week", "2 weeks", "month", "quarter", "6 months", "year"]

export const DEFAULT_TIME_PERIOD: TimePeriod = "2 weeks"

export const periodMap: Record<TimePeriod, TimePeriod> = {
  day: "day",
  week: "week",
  "2 weeks": "2 weeks",
  month: "month",
  quarter: "quarter",
  "6 months": "6 months",
  year: "year",
}

export const TIME_PERIOD_LABELS: Record<TimePeriod, string> = {
  day: "Today",
  week: "Week",
  "2 weeks": "2 Weeks",
  month: "Month",
  quarter: "Quarter",
  "6 months": "6 Months",
  year: "Year",
}

export const isTimePeriod = (value: unknown): value is TimePeriod =>
  typeof value === "string" && TIME_PERIODS.includes(value as TimePeriod)

export const resolveTimePeriod = (value: unknown, fallback: TimePeriod = DEFAULT_TIME_PERIOD): TimePeriod =>
  isTimePeriod(value) ? periodMap[value] : fallback

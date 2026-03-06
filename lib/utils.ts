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

export function sortByDateAsc<T>(rows: T[], getDate: (row: T) => string | null | undefined): T[] {
  return [...rows].sort((a, b) => String(getDate(a) ?? "").localeCompare(String(getDate(b) ?? "")))
}

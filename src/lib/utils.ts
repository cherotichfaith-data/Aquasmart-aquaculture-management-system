import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { TimePeriod } from "./time-period"
import { resolveTimePeriod } from "./time-period"
type ParsedTimePeriod =
  { kind: "preset"; period: TimePeriod }

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseDateToTimePeriod(
  input: string | null | undefined,
  defaultPeriod: TimePeriod = "2 weeks",
): ParsedTimePeriod {
  return { kind: "preset", period: resolveTimePeriod(input?.trim(), defaultPeriod) }
}

export function sortByDateAsc<T>(rows: T[], getDate: (row: T) => string | null | undefined): T[] {
  return [...rows].sort((a, b) => String(getDate(a) ?? "").localeCompare(String(getDate(b) ?? "")))
}

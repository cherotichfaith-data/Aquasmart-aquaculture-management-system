import { formatDateOnly, formatUnitValue } from "@/lib/analytics-format"

export const formatDayLabel = (value: string) => {
  return formatDateOnly(value, value, { month: "short", day: "numeric" })
}

export const formatFullDate = (value: string) => {
  return formatDateOnly(value, value, { year: "numeric", month: "short", day: "numeric" })
}

export const formatWithUnit = (value: number | null | undefined, decimals: number, unit: string) => {
  return formatUnitValue(value, decimals, unit)
}

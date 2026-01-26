import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Enums } from './types/database'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
  return map[period] ?? "30d"}
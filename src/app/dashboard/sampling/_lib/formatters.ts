import { formatDateOnly, formatUnitValue } from "@/lib/analytics-format"
import { diffDateDays } from "@/lib/time-series"

export const DEFAULT_TARGET_DENSITY = 15

export const formatDayLabel = (value: string) => {
  return formatDateOnly(value, value, { month: "short", day: "numeric" })
}

export const formatFullDate = (value: string) => {
  return formatDateOnly(value, value, { year: "numeric", month: "short", day: "numeric" })
}

export const formatWithUnit = (value: number | null | undefined, decimals: number, unit: string) => {
  return formatUnitValue(value, decimals, unit)
}

export const safeDayDiff = (start: string, end: string) => {
  return diffDateDays(start, end)
}

export const resolveTargetAbw = (daySinceStart: number, curve: Array<{ day: number; abw: number }>) => {
  if (!Number.isFinite(daySinceStart) || curve.length === 0) return null
  const points = curve.slice().sort((a, b) => a.day - b.day)
  if (daySinceStart <= points[0].day) return points[0].abw
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1]
    const next = points[i]
    if (daySinceStart <= next.day) {
      const span = next.day - prev.day
      if (span <= 0) return next.abw
      const progress = (daySinceStart - prev.day) / span
      return prev.abw + (next.abw - prev.abw) * progress
    }
  }
  return points[points.length - 1].abw
}

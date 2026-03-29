import { diffDateDays } from "@/lib/time-series"

export const DEFAULT_TARGET_DENSITY = 15
export const DEFAULT_HARVEST_TARGET_G = 1200
export const DEFAULT_MOVE_TARGET_G = 50
export const DEFAULT_GROWTH_CURVE = [
  { day: 0, abw: 10 },
  { day: 30, abw: 60 },
  { day: 60, abw: 150 },
  { day: 90, abw: 300 },
  { day: 120, abw: 500 },
  { day: 150, abw: 800 },
  { day: 180, abw: 1200 },
]

export const formatDayLabel = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(parsed)
}

export const formatFullDate = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(parsed)
}

export const formatWithUnit = (value: number | null | undefined, decimals: number, unit: string) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "--"
  return `${value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${unit}`
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

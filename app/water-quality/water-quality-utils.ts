import type { Enums } from "@/lib/types/database"

export type WqParameter = Enums<"water_quality_parameters">
export type StatusTone = "green" | "yellow" | "red"

export type MeasurementEvent = {
  key: string
  systemId: number
  systemLabel: string
  date: string
  time: string
  timestamp: string
  waterDepth: number
  dissolved_oxygen: number | null
  pH: number | null
  temperature: number | null
  ammonia_ammonium: number | null
  operator: string
  source: "measurement" | "rating"
}

export const parameterLabels: Record<WqParameter, string> = {
  dissolved_oxygen: "Dissolved Oxygen (mg/L)",
  pH: "pH",
  temperature: "Temperature (deg C)",
  ammonia_ammonium: "Ammonia (mg/L)",
  nitrite: "Nitrite (mg/L)",
  nitrate: "Nitrate (mg/L)",
  salinity: "Salinity (ppt)",
  secchi_disk_depth: "Secchi Depth",
}

export const operatorColumns = new Set(["created_by", "user_id", "operator_id"])

export const parseJsonish = (value: string | null | undefined): string | null => {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    return parsed == null ? null : String(parsed)
  } catch {
    return value
  }
}

export const statusClass = (tone: StatusTone) => {
  if (tone === "green") return "bg-green-500/10 text-green-600"
  if (tone === "yellow") return "bg-yellow-500/10 text-yellow-600"
  return "bg-red-500/10 text-red-600"
}

export const formatTimestamp = (value: string) => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed)
}

export const slope = (values: number[]) => {
  if (values.length < 2) return 0
  const n = values.length
  const xMean = (n - 1) / 2
  const yMean = values.reduce((sum, value) => sum + value, 0) / n
  let numerator = 0
  let denominator = 0
  for (let i = 0; i < n; i += 1) {
    numerator += (i - xMean) * (values[i] - yMean)
    denominator += (i - xMean) ** 2
  }
  return denominator === 0 ? 0 : numerator / denominator
}

export const getResultRows = <T,>(result: { status: "success" | "error"; data: T[] | null } | undefined): T[] =>
  result?.status === "success" ? (result.data ?? []) : []

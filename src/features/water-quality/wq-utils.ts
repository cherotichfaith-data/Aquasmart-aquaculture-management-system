import type { Enums } from "@/lib/types/database"

export type WqParameter = Enums<"water_quality_parameters">
export type StatusTone = "green" | "yellow" | "red"
export const DEFAULT_WQ_PARAMETER: WqParameter = "dissolved_oxygen"

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
  ammonia: number | null
  operator: string
  source: "measurement" | "rating"
}

export const parameterLabels: Record<WqParameter, string> = {
  dissolved_oxygen: "Dissolved Oxygen (mg/L)",
  pH: "pH",
  temperature: "Temperature (deg C)",
  ammonia: "Ammonia (mg/L)",
  nitrite: "Nitrite (mg/L)",
  nitrate: "Nitrate (mg/L)",
  salinity: "Salinity (ppt)",
  secchi_disk_depth: "Secchi Depth",
}

export const isWqParameter = (value: string | null | undefined): value is WqParameter =>
  typeof value === "string" && value in parameterLabels

export const statusClass = (tone: StatusTone) => {
  if (tone === "green") return "bg-success/10 text-success"
  if (tone === "yellow") return "bg-warning/10 text-warning"
  return "bg-destructive/10 text-destructive"
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

export const getResultRows = <T,>(result: { status: "success" | "error"; data: T[] | null } | undefined): T[] =>
  result?.status === "success" ? (result.data ?? []) : []

export type WqParameter =
  | "dissolved_oxygen"
  | "temperature"
  | "pH"
  | "ammonia"
  | "nitrite"
  | "nitrate"
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
}

export const isWqParameter = (value: string | null | undefined): value is WqParameter =>
  typeof value === "string" && value in parameterLabels

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

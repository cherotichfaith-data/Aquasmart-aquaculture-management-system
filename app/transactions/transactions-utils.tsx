import { AlertCircle, Clock, CornerDownRight, Droplets, Fish } from "lucide-react"

export type ActivityType =
  | "all"
  | "feeding_record"
  | "fish_sampling_weight"
  | "water_quality_measurement"
  | "fish_mortality"
  | "fish_transfer"
  | "fish_harvest"
  | "feed_incoming"
  | "fish_stocking"

export type ConsolidatedActivity = {
  id: string
  recordId: string
  tableName: string
  normalizedType: ActivityType
  changeType: string
  changeTime: string
  details: string
  systemIds: number[]
  batchId: number | null
  operatorId: string | null
  operatorLabel: string
  columnsChanged: string[]
  amountKg: number | null
}

export type OperatorSummary = {
  operatorId: string
  operatorLabel: string
  total: number
  feeds: number
  mortalities: number
  samplings: number
  systemsTouched: number
}

export const EVENT_LABEL: Record<ActivityType, string> = {
  all: "All Events",
  feeding_record: "Feeding",
  fish_sampling_weight: "Sampling",
  water_quality_measurement: "Water Quality",
  fish_mortality: "Mortality",
  fish_transfer: "Transfer",
  fish_harvest: "Harvest",
  feed_incoming: "Feed Incoming",
  fish_stocking: "Stocking",
}

export const operatorColumnNames = new Set(["created_by", "user_id", "operator_id"])
export const systemColumnNames = ["system_id", "origin_system_id", "target_system_id"]

export const normalizeTableName = (table: string): ActivityType => {
  switch (table) {
    case "feeding_events":
    case "feeding_record":
      return "feeding_record"
    case "sampling_events":
    case "fish_sampling_weight":
      return "fish_sampling_weight"
    case "water_quality_events":
    case "water_quality_measurement":
      return "water_quality_measurement"
    case "mortality_events":
    case "fish_mortality":
      return "fish_mortality"
    case "transfer_events":
    case "fish_transfer":
      return "fish_transfer"
    case "harvest_events":
    case "fish_harvest":
      return "fish_harvest"
    case "incoming_feed_events":
    case "feed_incoming":
      return "feed_incoming"
    case "stocking_events":
    case "fish_stocking":
      return "fish_stocking"
    default:
      return "all"
  }
}

const unwrapScalar = (raw: string | null | undefined): string | null => {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  try {
    const parsed = JSON.parse(trimmed)
    if (parsed == null) return null
    if (typeof parsed === "object") return JSON.stringify(parsed)
    return String(parsed)
  } catch {
    return trimmed.replace(/^"|"$/g, "")
  }
}

export const parseNumber = (raw: string | null | undefined): number | null => {
  const value = unwrapScalar(raw)
  if (!value) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

export const parseOperatorId = (raw: string | null | undefined): string | null => {
  const value = unwrapScalar(raw)
  if (!value) return null
  const lowered = value.toLowerCase()
  if (lowered === "null" || lowered === "undefined") return null
  return value
}

export const getIcon = (type: ActivityType) => {
  switch (type) {
    case "feeding_record":
      return <Clock size={16} />
    case "fish_sampling_weight":
      return <Fish size={16} />
    case "water_quality_measurement":
      return <Droplets size={16} />
    case "fish_mortality":
      return <AlertCircle size={16} />
    case "fish_transfer":
      return <CornerDownRight size={16} />
    case "fish_harvest":
      return <Fish size={16} />
    case "feed_incoming":
      return <Clock size={16} />
    case "fish_stocking":
      return <Fish size={16} />
    default:
      return <Clock size={16} />
  }
}

export const getColor = (type: ActivityType) => {
  switch (type) {
    case "feeding_record":
      return "bg-blue-500/10 text-blue-600"
    case "fish_sampling_weight":
      return "bg-purple-500/10 text-purple-600"
    case "water_quality_measurement":
      return "bg-green-500/10 text-green-600"
    case "fish_mortality":
      return "bg-red-500/10 text-red-600"
    case "fish_transfer":
      return "bg-orange-500/10 text-orange-600"
    case "fish_harvest":
      return "bg-lime-500/10 text-lime-600"
    case "feed_incoming":
      return "bg-sky-500/10 text-sky-600"
    case "fish_stocking":
      return "bg-indigo-500/10 text-indigo-600"
    default:
      return "bg-gray-500/10 text-gray-600"
  }
}

export const formatTime = (value: string) => {
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

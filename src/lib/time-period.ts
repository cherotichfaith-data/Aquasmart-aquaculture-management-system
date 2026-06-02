import type { Database, Enums } from "@/lib/types/database"

export type BaseTimePeriod = Enums<"time_period">
export type TimePeriod = BaseTimePeriod | "all history"
export type AnalyticsTimeScope =
  | "dashboard"
  | "inventory"
  | "production"
  | "water_quality"
  | "feeding"
  | "feed_inventory"

export const TIME_PERIODS: TimePeriod[] = [
  "day",
  "week",
  "2 weeks",
  "month",
  "quarter",
  "6 months",
  "year",
  "all history",
]

export const TIME_PERIOD_DAY_COUNTS: Record<BaseTimePeriod, number> = {
  day: 1,
  week: 7,
  "2 weeks": 14,
  month: 30,
  quarter: 90,
  "6 months": 180,
  year: 365,
}

export const DEFAULT_TIME_PERIOD: TimePeriod = "2 weeks"

export type TimeBounds = {
  start: string | null
  end: string | null
  anchorScope?: string | null
  latestAvailableDate?: string | null
  availableFromDate?: string | null
  requestedDays?: number | null
  availableDays?: number | null
  resolvedDays?: number | null
  stalenessDays?: number | null
  isTruncated?: boolean | null
}

type TimePeriodBoundsRpc = Database["public"]["Functions"]["api_time_period_bounds_scoped"]
type TimePeriodBoundsRpcRow = TimePeriodBoundsRpc["Returns"][number]
type TimePeriodBoundsRpcResult = {
  data: TimePeriodBoundsRpcRow | null
  error: unknown
}
type TimePeriodBoundsRpcQuery = PromiseLike<TimePeriodBoundsRpcResult> & {
  abortSignal?: (signal: AbortSignal) => TimePeriodBoundsRpcQuery
}
type RpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => {
    maybeSingle: () => TimePeriodBoundsRpcQuery
  }
}

export const TIME_PERIOD_LABELS: Record<TimePeriod, string> = {
  day: "Today",
  week: "Week",
  "2 weeks": "2 Weeks",
  month: "Month",
  quarter: "Quarter",
  "6 months": "6 Months",
  year: "Year",
  "all history": "All History",
}

export const TIME_PERIOD_URL_VALUES: Record<TimePeriod, string> = {
  day: "day",
  week: "week",
  "2 weeks": "2-weeks",
  month: "month",
  quarter: "quarter",
  "6 months": "6-months",
  year: "year",
  "all history": "all-history",
}

const TIME_PERIODS_BY_URL_VALUE = new Map(
  Object.entries(TIME_PERIOD_URL_VALUES).map(([period, urlValue]) => [urlValue, period as TimePeriod]),
)

export function toTimePeriodUrlValue(value: TimePeriod) {
  return TIME_PERIOD_URL_VALUES[value] ?? value
}

export function parseTimePeriodUrlValue(value: unknown): TimePeriod | null {
  if (typeof value !== "string") return null
  const normalized = value.trim().toLowerCase()
  return TIME_PERIODS_BY_URL_VALUE.get(normalized) ?? (isTimePeriod(normalized) ? normalized : null)
}

export const isTimePeriod = (value: unknown): value is TimePeriod =>
  typeof value === "string" && TIME_PERIODS.includes(value as TimePeriod)

export const isBaseTimePeriod = (value: unknown): value is BaseTimePeriod =>
  value !== "all history" && isTimePeriod(value)

export const resolveTimePeriod = (value: unknown, fallback: TimePeriod = DEFAULT_TIME_PERIOD): TimePeriod =>
  parseTimePeriodUrlValue(value) ?? fallback

const DAY_MS = 86_400_000

const parseUtcDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1))
}

export function countTimeRangeDays(startDate?: string | null, endDate?: string | null) {
  if (!startDate || !endDate) return null
  const start = parseUtcDate(startDate)
  const end = parseUtcDate(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return null
  }
  return Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1
}

const withAbortSignal = (query: TimePeriodBoundsRpcQuery, signal?: AbortSignal): TimePeriodBoundsRpcQuery => {
  if (!signal || typeof query.abortSignal !== "function") return query
  return query.abortSignal(signal)
}

export async function fetchTimePeriodBounds(
  supabase: RpcClient,
  params: {
    farmId: string
    timePeriod: TimePeriod
    scope?: AnalyticsTimeScope
    anchorDate?: string | null
    systemId?: number | null
    signal?: AbortSignal
  },
): Promise<TimeBounds> {
  const query = withAbortSignal(
    supabase
      .rpc("api_time_period_bounds_scoped", {
        p_farm_id: params.farmId,
        p_time_period: params.timePeriod,
        p_anchor_date: params.anchorDate ?? null,
        p_scope: params.scope ?? "dashboard",
        p_system_id: params.systemId ?? null,
      })
      .maybeSingle(),
    params.signal,
  )

  const { data, error } = await query
  if (error) {
    return { start: null, end: null }
  }

  const row = data as TimePeriodBoundsRpcRow | null
  return {
    start: row?.input_start_date ?? null,
    end: row?.input_end_date ?? null,
    anchorScope: row?.anchor_scope ?? null,
    latestAvailableDate: row?.latest_available_date ?? null,
    availableFromDate: row?.available_from_date ?? null,
    requestedDays: row?.requested_days ?? null,
    availableDays: row?.available_days ?? null,
    resolvedDays: row?.resolved_days ?? null,
    stalenessDays: row?.staleness_days ?? null,
    isTruncated: row?.is_truncated ?? null,
  }
}

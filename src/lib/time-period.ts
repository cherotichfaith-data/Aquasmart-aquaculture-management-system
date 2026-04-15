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
type TimePeriodBoundsRpcArgs = TimePeriodBoundsRpc["Args"]
type TimePeriodBoundsRpcRow = TimePeriodBoundsRpc["Returns"][number]
type TimePeriodBoundsRpcResult = {
  data: TimePeriodBoundsRpcRow | null
  error: unknown
}
type TimePeriodBoundsRpcQuery = PromiseLike<TimePeriodBoundsRpcResult> & {
  abortSignal?: (signal: AbortSignal) => TimePeriodBoundsRpcQuery
}
type RpcClient = {
  rpc: (fn: "api_time_period_bounds_scoped", args: TimePeriodBoundsRpcArgs) => {
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

export const isTimePeriod = (value: unknown): value is TimePeriod =>
  typeof value === "string" && TIME_PERIODS.includes(value as TimePeriod)

export const isBaseTimePeriod = (value: unknown): value is BaseTimePeriod =>
  value !== "all history" && isTimePeriod(value)

export const resolveTimePeriod = (value: unknown, fallback: TimePeriod = DEFAULT_TIME_PERIOD): TimePeriod =>
  isTimePeriod(value) ? value : fallback

const DAY_MS = 86_400_000

const parseUtcDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1))
}

const formatUtcDate = (value: Date) => value.toISOString().slice(0, 10)

export function countTimeRangeDays(startDate?: string | null, endDate?: string | null) {
  if (!startDate || !endDate) return null
  const start = parseUtcDate(startDate)
  const end = parseUtcDate(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return null
  }
  return Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1
}

export function buildTimeBoundsFromAvailableRange(params: {
  timePeriod: TimePeriod
  availableFromDate: string | null | undefined
  latestAvailableDate: string | null | undefined
  anchorScope?: string | null
}): TimeBounds {
  const availableFromDate = params.availableFromDate ?? null
  const latestAvailableDate = params.latestAvailableDate ?? null

  if (!availableFromDate || !latestAvailableDate || availableFromDate > latestAvailableDate) {
    return {
      start: null,
      end: null,
      anchorScope: params.anchorScope ?? null,
      latestAvailableDate,
      availableFromDate,
      requestedDays: params.timePeriod === "all history" ? null : TIME_PERIOD_DAY_COUNTS[params.timePeriod],
      availableDays: null,
      resolvedDays: null,
      stalenessDays: null,
      isTruncated: false,
    }
  }

  const availableStartDate = parseUtcDate(availableFromDate)
  const latestDate = parseUtcDate(latestAvailableDate)
  const availableDays = Math.floor((latestDate.getTime() - availableStartDate.getTime()) / DAY_MS) + 1
  const requestedDays = params.timePeriod === "all history" ? availableDays : TIME_PERIOD_DAY_COUNTS[params.timePeriod]
  const resolvedStartDate =
    params.timePeriod === "all history" ? availableStartDate : new Date(latestDate.getTime() - (requestedDays - 1) * DAY_MS)
  const resolvedStart = formatUtcDate(resolvedStartDate)
  const start = params.timePeriod === "all history" ? availableFromDate : resolvedStart < availableFromDate ? availableFromDate : resolvedStart
  const resolvedDays = Math.floor((latestDate.getTime() - parseUtcDate(start).getTime()) / DAY_MS) + 1
  const today = new Date()
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  const stalenessDays = Math.max(0, Math.floor((todayUtc.getTime() - latestDate.getTime()) / DAY_MS))

  return {
    start,
    end: latestAvailableDate,
    anchorScope: params.anchorScope ?? null,
    latestAvailableDate,
    availableFromDate,
    requestedDays,
    availableDays,
    resolvedDays,
    stalenessDays,
    isTruncated: params.timePeriod === "all history" ? false : start > resolvedStart,
  }
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
    signal?: AbortSignal
  },
): Promise<TimeBounds> {
  const rpcTimePeriod: BaseTimePeriod = params.timePeriod === "all history" ? "day" : params.timePeriod
  const query = withAbortSignal(
    supabase
      .rpc("api_time_period_bounds_scoped", {
        p_farm_id: params.farmId,
        p_time_period: rpcTimePeriod,
        p_anchor_date: params.anchorDate ?? undefined,
        p_scope: params.scope ?? "dashboard",
      })
      .maybeSingle(),
    params.signal,
  )

  const { data, error } = await query
  if (error) {
    return { start: null, end: null }
  }

  const row = data as TimePeriodBoundsRpcRow | null
  if (params.timePeriod === "all history") {
    return buildTimeBoundsFromAvailableRange({
      timePeriod: params.timePeriod,
      availableFromDate: row?.available_from_date ?? null,
      latestAvailableDate: row?.latest_available_date ?? null,
      anchorScope: row?.anchor_scope ?? null,
    })
  }

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

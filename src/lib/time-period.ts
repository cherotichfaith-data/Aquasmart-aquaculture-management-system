import { Constants, type Database, type Enums } from "@/lib/types/database"
import { toRpcDate, toRpcSystemId } from "@/lib/rpc-params"

export type BaseTimePeriod = Enums<"time_period">
export type TimePeriod = BaseTimePeriod | "all history"
export type AnalyticsTimeScope =
  | "dashboard"
  | "inventory"
  | "production"
  | "water_quality"
  | "feeding"
  | "feed_inventory"

export const BASE_TIME_PERIODS = Constants.public.Enums.time_period

export const TIME_PERIODS: TimePeriod[] = [...BASE_TIME_PERIODS, "all history"]

export const DEFAULT_TIME_PERIOD: TimePeriod = "month"

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

export const TIME_PERIOD_LABELS: Record<TimePeriod, string> = {
  day: "Last day",
  week: "Last 7 days",
  "2 weeks": "Last 14 days",
  month: "Last 30 days",
  quarter: "Last 90 days",
  "6 months": "Last 180 days",
  year: "Last 365 days",
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

const TIME_PERIOD_DAY_COUNTS: Record<BaseTimePeriod, number> = {
  day: 1,
  week: 7,
  "2 weeks": 14,
  month: 30,
  quarter: 90,
  "6 months": 180,
  year: 365,
}

export function getTimePeriodDays(value: TimePeriod): number | null {
  if (value === "all history") return null
  return TIME_PERIOD_DAY_COUNTS[value]
}

function parseDateOnly(value: string | null | undefined) {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatRangeDate(value: Date, includeYear: boolean) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    ...(includeYear ? { year: "numeric" } : {}),
  }).format(value)
}

export function formatResolvedDateRange(start: string | null | undefined, end: string | null | undefined) {
  const startDate = parseDateOnly(start)
  const endDate = parseDateOnly(end)
  if (!startDate || !endDate) return null
  if (startDate.getTime() === endDate.getTime()) {
    return formatRangeDate(endDate, true)
  }

  const sameYear = startDate.getFullYear() === endDate.getFullYear()
  return `${formatRangeDate(startDate, !sameYear)} - ${formatRangeDate(endDate, true)}`
}

export function formatResolvedTimeWindow(
  timePeriod: TimePeriod,
  start: string | null | undefined,
  end: string | null | undefined,
) {
  const label = TIME_PERIOD_LABELS[timePeriod]
  const range = formatResolvedDateRange(start, end)
  return range ? `${range} (${label})` : label
}

type TimePeriodBoundsRpc = Database["public"]["Functions"]["api_time_period_bounds_scoped"]
type TimePeriodBoundsRpcRow = TimePeriodBoundsRpc["Returns"][number]

type TimePeriodBoundsRpcQuery = PromiseLike<{
  data: TimePeriodBoundsRpcRow[] | null
  error: unknown
}> & {
  abortSignal?: (signal: AbortSignal) => TimePeriodBoundsRpcQuery
}

type TimePeriodBoundsRpcClient = {
  rpc: (
    name: "api_time_period_bounds_scoped",
    args: TimePeriodBoundsRpc["Args"] & { p_batch_id?: number },
  ) => TimePeriodBoundsRpcQuery
}

function mapTimeBoundsRow(row: TimePeriodBoundsRpcRow | null | undefined): TimeBounds {
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

export async function fetchTimePeriodBounds(
  supabase: unknown,
  params: {
    farmId: string
    timePeriod: TimePeriod
    scope?: AnalyticsTimeScope
    anchorDate?: string | null
    systemId?: number | null
    batchId?: number | null
    signal?: AbortSignal
  },
): Promise<TimeBounds> {
  const client = supabase as TimePeriodBoundsRpcClient
  let query = client.rpc("api_time_period_bounds_scoped", {
    p_farm_id: params.farmId,
    p_time_period: params.timePeriod,
    p_scope: params.scope ?? "dashboard",
    p_anchor_date: toRpcDate(params.anchorDate),
    p_system_id: toRpcSystemId(params.systemId),
    p_batch_id: params.batchId ?? undefined,
  } as TimePeriodBoundsRpc["Args"] & { p_batch_id?: number; p_anchor_date?: string | null; p_system_id: number | null })
  if (params.signal && typeof query.abortSignal === "function") {
    query = query.abortSignal(params.signal)
  }

  const { data, error } = await query
  if (params.signal?.aborted) return { start: null, end: null }
  if (error) return { start: null, end: null }

  return mapTimeBoundsRow(data?.[0])
}

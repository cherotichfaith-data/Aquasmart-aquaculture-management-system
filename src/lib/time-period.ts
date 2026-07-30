import { Constants, type Database, type Enums } from "@/lib/types/database"
import { toRpcDate, toRpcSystemId } from "@/lib/rpc-params"
import { fetchRpc } from "@/lib/supabase/query-transport"

export type BaseTimePeriod = Enums<"time_period">
export type DateType = BaseTimePeriod | "all history"
export type TimePeriod = DateType
export type AnalyticsTimeScope =
  | "dashboard"
  | "inventory"
  | "production"
  | "water_quality"
  | "feeding"
  | "feed_inventory"

export const BASE_TIME_PERIODS = Constants.public.Enums.time_period

export const DATE_TYPES: DateType[] = [...BASE_TIME_PERIODS, "all history"]
export const TIME_PERIODS: TimePeriod[] = DATE_TYPES

export const DEFAULT_DATE_TYPE: DateType = "month"
export const DEFAULT_TIME_PERIOD: TimePeriod = DEFAULT_DATE_TYPE

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

export const DATE_TYPE_LABELS: Record<DateType, string> = {
  day: "Day",
  week: "Week",
  "2 weeks": "2 Weeks",
  month: "Month",
  quarter: "Quarter",
  "6 months": "6 Months",
  year: "Year",
  "all history": "All History",
}
export const TIME_PERIOD_LABELS: Record<TimePeriod, string> = DATE_TYPE_LABELS

// URL slug === the internal DateType value itself (space-separated, e.g. "2 weeks"),
// matching aquasmart-main's convention. URLSearchParams encodes/decodes the spaces
// automatically, so no separate slug table is needed for the current form.
export const DATE_TYPE_URL_VALUES: Record<DateType, string> = {
  day: "day",
  week: "week",
  "2 weeks": "2 weeks",
  month: "month",
  quarter: "quarter",
  "6 months": "6 months",
  year: "year",
  "all history": "all history",
}
export const TIME_PERIOD_URL_VALUES: Record<TimePeriod, string> = DATE_TYPE_URL_VALUES

const DATE_TYPES_BY_URL_VALUE = new Map(
  Object.entries(DATE_TYPE_URL_VALUES).map(([dateType, urlValue]) => [urlValue, dateType as DateType]),
)

// Pre-alignment hyphenated slugs (e.g. "2-weeks", "all-history") — accepted so links
// shared before this change still resolve correctly.
const LEGACY_URL_VALUES: Record<string, DateType> = {
  "2-weeks": "2 weeks",
  "6-months": "6 months",
  "all-history": "all history",
}

export function toDateTypeUrlValue(value: DateType) {
  return DATE_TYPE_URL_VALUES[value] ?? value
}
export const toTimePeriodUrlValue = toDateTypeUrlValue

export function parseDateTypeUrlValue(value: unknown): DateType | null {
  if (typeof value !== "string") return null
  const normalized = value.trim().toLowerCase()
  if (normalized === "6months") return "6 months"
  if (normalized === "2weeks") return "2 weeks"
  if (normalized === "allhistory") return "all history"
  return (
    DATE_TYPES_BY_URL_VALUE.get(normalized) ?? LEGACY_URL_VALUES[normalized] ?? (isDateType(normalized) ? normalized : null)
  )
}
export const parseTimePeriodUrlValue = parseDateTypeUrlValue

export const isDateType = (value: unknown): value is DateType =>
  typeof value === "string" && DATE_TYPES.includes(value as DateType)
export const isTimePeriod = isDateType

export const isBaseTimePeriod = (value: unknown): value is BaseTimePeriod =>
  value !== "all history" && isDateType(value)

export const resolveDateType = (value: unknown, fallback: DateType = DEFAULT_DATE_TYPE): DateType =>
  parseDateTypeUrlValue(value) ?? fallback
export const resolveTimePeriod = resolveDateType

/**
 * Custom date range (aquasmart-main / v2 design): encoded in the same URL
 * param as presets, as `custom_YYYY-MM-DD_YYYY-MM-DD`. These are explicit
 * user-chosen dates — no window derivation happens client-side.
 */
export type CustomTimeRange = { start: string; end: string }

const CUSTOM_PERIOD_RE = /^custom_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})$/

export function parseCustomPeriodUrlValue(value: unknown): CustomTimeRange | null {
  if (typeof value !== "string") return null
  const match = value.trim().match(CUSTOM_PERIOD_RE)
  if (!match) return null
  const [, start, end] = match
  if (!parseDateOnly(start) || !parseDateOnly(end)) return null
  return start <= end ? { start, end } : { start: end, end: start }
}

export function toCustomPeriodUrlValue(range: CustomTimeRange): string {
  return `custom_${range.start}_${range.end}`
}

export function formatCustomRangeLabel(range: CustomTimeRange): string {
  return formatResolvedDateRange(range.start, range.end) ?? `${range.start} - ${range.end}`
}

const DATE_TYPE_DAY_COUNTS: Record<BaseTimePeriod, number> = {
  day: 1,
  week: 7,
  "2 weeks": 14,
  month: 30,
  quarter: 90,
  "6 months": 180,
  year: 365,
}

export function getDateTypeDays(value: DateType): number | null {
  if (value === "all history") return null
  return DATE_TYPE_DAY_COUNTS[value]
}
export const getTimePeriodDays = getDateTypeDays

export function getAvailableDateTypes(maxDaysSinceStart?: number | null): DateType[] {
  if (maxDaysSinceStart == null || !Number.isFinite(maxDaysSinceStart) || maxDaysSinceStart <= 0) {
    return DATE_TYPES
  }

  return DATE_TYPES.filter((dateType) => {
    const days = getDateTypeDays(dateType)
    return days == null || days <= maxDaysSinceStart
  })
}
export const getAvailableTimePeriods = getAvailableDateTypes

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
  timePeriod: DateType,
  start: string | null | undefined,
  end: string | null | undefined,
) {
  const label = DATE_TYPE_LABELS[timePeriod]
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

export function customRangeToBounds(range: CustomTimeRange): TimeBounds {
  const start = parseDateOnly(range.start)
  const end = parseDateOnly(range.end)
  const days =
    start && end ? Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1 : null
  return {
    start: range.start,
    end: range.end,
    anchorScope: "custom",
    latestAvailableDate: null,
    availableFromDate: null,
    requestedDays: days,
    availableDays: days,
    resolvedDays: days,
    stalenessDays: null,
    isTruncated: false,
  }
}

export async function fetchTimePeriodBounds(
  supabase: unknown,
  params: {
    farmId: string
    timePeriod: DateType
    /** Explicit custom range wins over the preset — no RPC round-trip needed. */
    customRange?: CustomTimeRange | null
    scope?: AnalyticsTimeScope
    anchorDate?: string | null
    systemId?: number | null
    batchId?: number | null
    signal?: AbortSignal
  },
): Promise<TimeBounds> {
  if (params.customRange) {
    return customRangeToBounds(params.customRange)
  }

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

/**
 * Client-side counterpart to fetchTimePeriodBounds(). Goes through the
 * authenticated /api/rpc proxy (src/lib/supabase/query-transport.ts) instead
 * of calling supabase.rpc(...) directly with a browser client -- this is the
 * one chosen client-read transport, so no feature (dashboard, production,
 * reports, feed, water-quality, or anything else that needs time bounds)
 * calls the RPC straight from the browser.
 */
export async function fetchTimePeriodBoundsClient(params: {
  farmId: string
  timePeriod: DateType
  customRange?: CustomTimeRange | null
  scope?: AnalyticsTimeScope
  anchorDate?: string | null
  systemId?: number | null
  batchId?: number | null
  signal?: AbortSignal
}): Promise<TimeBounds> {
  if (params.customRange) {
    return customRangeToBounds(params.customRange)
  }

  const result = await fetchRpc<TimePeriodBoundsRpcRow>(
    "fetchTimePeriodBoundsClient",
    "api_time_period_bounds_scoped",
    {
      p_farm_id: params.farmId,
      p_time_period: params.timePeriod,
      p_scope: params.scope ?? "dashboard",
      p_anchor_date: toRpcDate(params.anchorDate),
      p_system_id: toRpcSystemId(params.systemId),
      p_batch_id: params.batchId ?? undefined,
    },
    params.signal,
  )

  if (params.signal?.aborted || result.status === "error") return { start: null, end: null }

  return mapTimeBoundsRow(result.data[0])
}

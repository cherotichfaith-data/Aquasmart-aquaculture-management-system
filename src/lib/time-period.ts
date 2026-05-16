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
  from?: (table: string) => unknown
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

type TableQuery = {
  select: (columns: string) => TableQuery
  eq: (column: string, value: unknown) => TableQuery
  in: (column: string, values: unknown[]) => TableQuery
  or: (filters: string) => TableQuery
  order: (column: string, options: { ascending: boolean }) => TableQuery
  limit: (count: number) => PromiseLike<{ data: Array<Record<string, unknown>> | null; error: unknown }> & {
    abortSignal?: (signal: AbortSignal) => PromiseLike<{ data: Array<Record<string, unknown>> | null; error: unknown }>
  }
}

const asTableQuery = (value: unknown): TableQuery | null => {
  if (!value || typeof value !== "object") return null
  return value as TableQuery
}

async function fetchSingleDate(
  supabase: RpcClient,
  table: string,
  column: string,
  systemIds: number[],
  ascending: boolean,
  dateColumn = "date",
  signal?: AbortSignal,
): Promise<string | null> {
  if (!supabase.from || systemIds.length === 0) return null
  let query = asTableQuery(supabase.from(table))
    ?.select(dateColumn)
    .in(column, systemIds)
    .order(dateColumn, { ascending })
    .limit(1)
  if (!query) return null
  if (signal && typeof query.abortSignal === "function") query = query.abortSignal(signal)
  const { data, error } = await query
  if (error) return null
  const value = data?.[0]?.[dateColumn]
  return typeof value === "string" ? value : null
}

async function fetchFarmDate(
  supabase: RpcClient,
  table: string,
  farmId: string,
  ascending: boolean,
  dateColumn = "date",
  signal?: AbortSignal,
): Promise<string | null> {
  if (!supabase.from) return null
  let query = asTableQuery(supabase.from(table))
    ?.select(dateColumn)
    .eq("farm_id", farmId)
    .order(dateColumn, { ascending })
    .limit(1)
  if (!query) return null
  if (signal && typeof query.abortSignal === "function") query = query.abortSignal(signal)
  const { data, error } = await query
  if (error) return null
  const value = data?.[0]?.[dateColumn]
  return typeof value === "string" ? value : null
}

async function fetchActiveFarmRange(
  supabase: RpcClient,
  farmId: string,
  signal?: AbortSignal,
): Promise<{ availableFromDate: string | null; latestAvailableDate: string | null } | null> {
  if (!supabase.from) return null

  let systemsQuery = asTableQuery(supabase.from("system"))
    ?.select("id")
    .eq("farm_id", farmId)
    .eq("is_active", true)
    .order("id", { ascending: true })
    .limit(1000)
  if (!systemsQuery) return null
  if (signal && typeof systemsQuery.abortSignal === "function") systemsQuery = systemsQuery.abortSignal(signal)
  const { data: systems, error } = await systemsQuery
  if (error) return null

  const systemIds = (systems ?? [])
    .map((row) => row.id)
    .filter((id): id is number => typeof id === "number" && Number.isFinite(id))
  if (systemIds.length === 0) return null

  const eventSources: Array<[string, string]> = [
    ["fish_stocking", "system_id"],
    ["feeding_record", "system_id"],
    ["fish_mortality", "system_id"],
    ["fish_sampling_weight", "system_id"],
    ["fish_harvest", "system_id"],
    ["water_quality_measurement", "system_id"],
  ]
  const ratingSource: [string, string, string] = ["daily_water_quality_rating", "system_id", "rating_date"]
  const farmDateSources: Array<[string, string]> = [
    ["feed_incoming", "date"],
    ["feed_inventory", "inventory_date"],
  ]

  const mins = await Promise.all([
    ...eventSources.map(([table, column]) => fetchSingleDate(supabase, table, column, systemIds, true, "date", signal)),
    fetchSingleDate(supabase, ratingSource[0], ratingSource[1], systemIds, true, ratingSource[2], signal),
    fetchSingleDate(supabase, "fish_transfer", "origin_system_id", systemIds, true, "date", signal),
    fetchSingleDate(supabase, "fish_transfer", "target_system_id", systemIds, true, "date", signal),
    ...farmDateSources.map(([table, dateColumn]) => fetchFarmDate(supabase, table, farmId, true, dateColumn, signal)),
  ])
  const maxes = await Promise.all([
    ...eventSources.map(([table, column]) => fetchSingleDate(supabase, table, column, systemIds, false, "date", signal)),
    fetchSingleDate(supabase, ratingSource[0], ratingSource[1], systemIds, false, ratingSource[2], signal),
    fetchSingleDate(supabase, "fish_transfer", "origin_system_id", systemIds, false, "date", signal),
    fetchSingleDate(supabase, "fish_transfer", "target_system_id", systemIds, false, "date", signal),
    ...farmDateSources.map(([table, dateColumn]) => fetchFarmDate(supabase, table, farmId, false, dateColumn, signal)),
  ])

  const availableFromDate = mins.filter((date): date is string => Boolean(date)).sort()[0] ?? null
  const latestAvailableDate = maxes.filter((date): date is string => Boolean(date)).sort().at(-1) ?? null
  return availableFromDate && latestAvailableDate ? { availableFromDate, latestAvailableDate } : null
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
  const fallbackToActiveRange = async (anchorScope?: string | null) => {
    if (params.anchorDate) return null
    const activeRange = await fetchActiveFarmRange(supabase, params.farmId, params.signal)
    if (activeRange) {
      return buildTimeBoundsFromAvailableRange({
        timePeriod: params.timePeriod,
        availableFromDate: activeRange.availableFromDate,
        latestAvailableDate: activeRange.latestAvailableDate,
        anchorScope: anchorScope ?? `${params.scope ?? "dashboard"}:active-farm-data`,
      })
    }
    return null
  }

  if ((params.scope ?? "dashboard") === "dashboard" && !params.anchorDate) {
    const activeBounds = await fallbackToActiveRange("dashboard:active-systems")
    if (activeBounds) return activeBounds
  }

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
    return (await fallbackToActiveRange()) ?? { start: null, end: null }
  }

  const row = data as TimePeriodBoundsRpcRow | null
  if (params.timePeriod === "all history") {
    const bounds = buildTimeBoundsFromAvailableRange({
      timePeriod: params.timePeriod,
      availableFromDate: row?.available_from_date ?? null,
      latestAvailableDate: row?.latest_available_date ?? null,
      anchorScope: row?.anchor_scope ?? null,
    })
    return bounds.start && bounds.end ? bounds : ((await fallbackToActiveRange(row?.anchor_scope)) ?? bounds)
  }

  const bounds = {
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
  return bounds.start && bounds.end ? bounds : ((await fallbackToActiveRange(row?.anchor_scope)) ?? bounds)
}

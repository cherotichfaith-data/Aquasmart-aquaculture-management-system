import type { Enums, Tables } from "@/lib/types/database"
import { parseDateToTimePeriod } from "@/lib/utils"
import type { QueryResult } from "@/lib/supabase-client"
import { getClientOrError, toQueryError, toQuerySuccess } from "@/lib/api/_utils"

type DashboardRow = Tables<"api_dashboard">
type DashboardConsolidatedRow = Tables<"api_dashboard_consolidated">
type DashboardTimeBoundsRow = Pick<DashboardConsolidatedRow, "input_start_date" | "input_end_date" | "time_period">

type DashboardRpcArgs = {
  p_farm_id: string
  p_system_id?: number | null
  p_growth_stage?: string | null
  p_start_date?: string | null
  p_end_date?: string | null
  p_time_period?: string | null
}

const dashboardRpcArgs = (params: {
  farmId: string
  systemId?: number
  stage?: Enums<"system_growth_stage">
  dateFrom?: string
  dateTo?: string
  timePeriod?: Enums<"time_period"> | string
}): DashboardRpcArgs => ({
  p_farm_id: params.farmId,
  p_system_id: params.systemId ?? null,
  p_growth_stage: params.stage ?? null,
  p_start_date: params.dateFrom ?? null,
  p_end_date: params.dateTo ?? null,
  p_time_period: params.timePeriod ?? null,
})

type DashboardConsolidatedRpcArgs = {
  p_farm_id: string
  p_system_id?: number | null
  p_start_date?: string | null
  p_end_date?: string | null
  p_time_period?: string | null
}

const dashboardConsolidatedRpcArgs = (params: {
  farmId: string
  systemId?: number
  dateFrom?: string
  dateTo?: string
  timePeriod?: Enums<"time_period"> | string
}): DashboardConsolidatedRpcArgs => ({
  p_farm_id: params.farmId,
  p_system_id: params.systemId ?? null,
  p_start_date: params.dateFrom ?? null,
  p_end_date: params.dateTo ?? null,
  p_time_period: params.timePeriod ?? null,
})

export async function getDashboardSnapshot(params?: {
  systemId?: number
  timePeriod?: Enums<"time_period">
  stage?: Enums<"system_growth_stage">
  allowFallback?: boolean
  farmId?: string | null
  signal?: AbortSignal
}) {
  if (!params?.farmId) {
    return null
  }
  const clientResult = await getClientOrError("getDashboardSnapshot", { requireSession: true })
  if ("error" in clientResult) return null
  const { supabase } = clientResult

  const baseArgs = dashboardRpcArgs({
    farmId: params.farmId,
    systemId: params.systemId,
    stage: params.stage,
    timePeriod: params.timePeriod,
  })

  let query = supabase.rpc("api_dashboard", {
    ...baseArgs,
    p_limit: 1,
    p_order_desc: true,
  })
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    toQueryError("getDashboardSnapshot", error)
    return null
  }

  const rows = (data ?? []) as DashboardRow[]
  return rows[0] ?? null
}

export async function getDashboardConsolidatedSnapshot(params?: {
  timePeriod?: Enums<"time_period">
  allowFallback?: boolean
  farmId?: string | null
  signal?: AbortSignal
}) {
  if (!params?.farmId) {
    return null
  }
  const clientResult = await getClientOrError("getDashboardConsolidatedSnapshot", { requireSession: true })
  if ("error" in clientResult) return null
  const { supabase } = clientResult

  const baseArgs = dashboardConsolidatedRpcArgs({
    farmId: params.farmId,
    timePeriod: params.timePeriod,
  })

  let query = supabase.rpc("api_dashboard_consolidated", {
    ...baseArgs,
    p_limit: 1,
    p_order_desc: true,
  })
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    toQueryError("getDashboardConsolidatedSnapshot", error)
    return null
  }

  const rows = (data ?? []) as DashboardConsolidatedRow[]
  return rows[0] ?? null
}

export async function getSystemsDashboard(params?: {
  systemId?: number
  stage?: Enums<"system_growth_stage">
  timePeriod?: Enums<"time_period">
  dateFrom?: string
  dateTo?: string
  limit?: number
  farmId?: string | null
  signal?: AbortSignal
}): Promise<QueryResult<DashboardRow>> {
  if (!params?.farmId) {
    return toQuerySuccess<DashboardRow>([])
  }
  const clientResult = await getClientOrError("getSystemsDashboard", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase
    .rpc("api_dashboard", dashboardRpcArgs({
      farmId: params.farmId,
      systemId: params.systemId,
      stage: params.stage,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      timePeriod: params.timePeriod,
    }))
    .order("input_end_date", { ascending: false })
  if (params?.limit) query = query.limit(params.limit)
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) return toQueryError("getSystemsDashboard", error)
  const rows = (data ?? []) as DashboardRow[]
  const sorted = rows
    .slice()
    .sort((a, b) => (b.input_end_date ?? "").localeCompare(a.input_end_date ?? ""))
  const limited = params?.limit ? sorted.slice(0, params.limit) : sorted
  return toQuerySuccess<DashboardRow>(limited)
}

export async function getTimePeriodBounds(
  timePeriod: Enums<"time_period"> | string,
  signal?: AbortSignal,
  farmId?: string | null,
) {
  const parsed = parseDateToTimePeriod(timePeriod)

  if (!farmId) {
    return parsed.kind === "custom"
      ? { start: parsed.startDate, end: parsed.endDate }
      : { start: null, end: null }
  }

  const clientResult = await getClientOrError("getTimePeriodBounds", { requireSession: true })
  if ("error" in clientResult) {
    return parsed.kind === "custom"
      ? { start: parsed.startDate, end: parsed.endDate }
      : { start: null, end: null }
  }
  const { supabase } = clientResult

  const consolidatedArgs = dashboardConsolidatedRpcArgs({
    farmId,
    timePeriod: parsed.kind === "preset" ? parsed.period : undefined,
    dateFrom: parsed.kind === "custom" ? parsed.startDate : undefined,
    dateTo: parsed.kind === "custom" ? parsed.endDate : undefined,
  })

  let consolidatedQuery = supabase.rpc("api_dashboard_consolidated", {
    ...consolidatedArgs,
    p_limit: 1,
    p_order_desc: true,
  })
  if (signal) consolidatedQuery = consolidatedQuery.abortSignal(signal)

  const { data: consolidatedData, error: consolidatedError } = await consolidatedQuery
  if (!consolidatedError) {
    const rows = (consolidatedData ?? []) as DashboardTimeBoundsRow[]
    const row = rows[0]
    if (row?.input_start_date || row?.input_end_date) {
      return { start: row?.input_start_date ?? null, end: row?.input_end_date ?? null }
    }
  }

  const dashboardArgs = dashboardRpcArgs({
    farmId,
    timePeriod: parsed.kind === "preset" ? parsed.period : undefined,
    dateFrom: parsed.kind === "custom" ? parsed.startDate : undefined,
    dateTo: parsed.kind === "custom" ? parsed.endDate : undefined,
  })

  let dashboardQuery = supabase.rpc("api_dashboard", {
    ...dashboardArgs,
    p_limit: 1,
    p_order_desc: true,
  })
  if (signal) dashboardQuery = dashboardQuery.abortSignal(signal)

  const { data: dashboardData, error: dashboardError } = await dashboardQuery
  if (!dashboardError) {
    const rows = (dashboardData ?? []) as DashboardTimeBoundsRow[]
    const row = rows[0]
    return { start: row?.input_start_date ?? null, end: row?.input_end_date ?? null }
  }

  return parsed.kind === "custom"
    ? { start: parsed.startDate, end: parsed.endDate }
    : { start: null, end: null }
}

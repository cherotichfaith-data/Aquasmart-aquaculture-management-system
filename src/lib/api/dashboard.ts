import type { Database, Enums } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import { getClientOrError, isAbortLikeError, isMissingObjectError, queryKpiRpc, toQueryError, toQuerySuccess } from "@/lib/api/_utils"
import { isSbAuthMissing, isSbPermissionDenied } from "@/lib/supabase/log"
import type { TimePeriod } from "@/lib/time-period"

export type DashboardSystemRpcRow = Database["public"]["Functions"]["api_dashboard_systems"]["Returns"][number]
type DashboardConsolidatedRow = Database["public"]["Functions"]["api_dashboard_consolidated"]["Returns"][number]

const isMissingRpcError = isMissingObjectError

const isQuietError = (err: unknown): boolean =>
  isAbortLikeError(err) || isSbPermissionDenied(err) || isSbAuthMissing(err)

export async function getDashboardSystems(params?: {
  farmId?: string | null
  stage?: Enums<"system_growth_stage"> | null
  systemId?: number | null
  dateFrom?: string | null
  dateTo?: string | null
  signal?: AbortSignal
}): Promise<QueryResult<DashboardSystemRpcRow>> {
  if (!params?.farmId) return toQuerySuccess<DashboardSystemRpcRow>([])

  const clientResult = await getClientOrError("getDashboardSystems", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = queryKpiRpc(
    supabase,
    "api_dashboard_systems",
    {
      p_farm_id: params.farmId,
      p_stage: params.stage ?? undefined,
      p_system_id: params.systemId ?? undefined,
      p_start_date: params.dateFrom ?? undefined,
      p_end_date: params.dateTo ?? undefined,
    },
  )
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (params?.signal?.aborted) return toQuerySuccess<DashboardSystemRpcRow>([])
  if (error && isQuietError(error)) return toQuerySuccess<DashboardSystemRpcRow>([])
  if (error) return toQueryError("getDashboardSystems", error)

  const rows = (data ?? []) as DashboardSystemRpcRow[]
  return toQuerySuccess<DashboardSystemRpcRow>(rows)
}

export async function getDashboardConsolidated(params?: {
  farmId?: string | null
  stage?: Enums<"system_growth_stage"> | null
  systemId?: number | null
  dateFrom?: string | null
  dateTo?: string | null
  timePeriod?: TimePeriod
  signal?: AbortSignal
}): Promise<QueryResult<DashboardConsolidatedRow>> {
  if (!params?.farmId) return toQuerySuccess<DashboardConsolidatedRow>([])

  const clientResult = await getClientOrError("getDashboardConsolidated", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = queryKpiRpc(
    supabase,
    "api_dashboard_consolidated",
    {
      p_farm_id: params.farmId,
      p_system_id: params.systemId ?? undefined,
      p_stage: params.stage ?? undefined,
      p_start_date: params.dateFrom ?? undefined,
      p_end_date: params.dateTo ?? undefined,
      p_time_period:
        !params.dateFrom && !params.dateTo ? (params.timePeriod ?? undefined) : undefined,
    },
  )
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (params?.signal?.aborted || isQuietError(error) || isMissingRpcError(error)) {
      return toQuerySuccess<DashboardConsolidatedRow>([])
    }
    // Treat unknown RPC errors as quiet to avoid spamming the console.
    return toQuerySuccess<DashboardConsolidatedRow>([])
  }

  return toQuerySuccess<DashboardConsolidatedRow>((data ?? []) as DashboardConsolidatedRow[])
}

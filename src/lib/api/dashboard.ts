import type { Database, Enums } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import { getClientOrError, isAbortLikeError, isMissingObjectError, queryKpiRpc, toQueryError, toQuerySuccess } from "@/lib/api/_utils"
import { isSbAuthMissing, isSbPermissionDenied } from "@/lib/supabase/log"
import type { TimePeriod } from "@/lib/time-period"
import { toRpcDate, toRpcSystemIds } from "@/lib/rpc-params"
import type { DashboardSystemRow } from "@/features/dashboard/types"

export type DashboardSystemRpcRow = Database["public"]["Functions"]["api_dashboard_systems"]["Returns"][number]
type DashboardConsolidatedRow = Database["public"]["Functions"]["api_dashboard_consolidated"]["Returns"][number]

const isMissingRpcError = isMissingObjectError

const isQuietError = (err: unknown): boolean =>
  isAbortLikeError(err) || isSbPermissionDenied(err) || isSbAuthMissing(err)

export async function getDashboardSystems(params?: {
  farmId?: string | null
  stage?: Enums<"system_growth_stage"> | null
  systemId?: number | null
  systemIds?: number[] | null
  dateFrom?: string | null
  dateTo?: string | null
  signal?: AbortSignal
}): Promise<QueryResult<DashboardSystemRow>> {
  if (!params?.farmId) return toQuerySuccess<DashboardSystemRow>([])

  const clientResult = await getClientOrError("getDashboardSystems", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = queryKpiRpc(
    supabase,
    "api_dashboard_systems",
    {
      p_farm_id: params.farmId,
      p_stage: params.stage ?? undefined,
      p_system_ids: toRpcSystemIds(params.systemIds ?? params.systemId),
      p_start_date: toRpcDate(params.dateFrom),
      p_end_date: toRpcDate(params.dateTo),
    },
  )
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (params?.signal?.aborted) return toQuerySuccess<DashboardSystemRow>([])
  if (error && isQuietError(error)) return toQuerySuccess<DashboardSystemRow>([])
  if (error) return toQueryError("getDashboardSystems", error)

  const rows = (data ?? []) as DashboardSystemRpcRow[]
  const batchOptionsResult = await supabase.rpc("api_fingerling_batch_options_rpc", {
    p_farm_id: params.farmId,
    p_active_only: true,
  })
  const batchLabelById = new Map(
    ((batchOptionsResult.data ?? []) as Array<{ id: number; label: string | null }>).map((row) => [
      row.id,
      row.label || `Batch ${row.id}`,
    ]),
  )

  const enrichedRows: DashboardSystemRow[] = await Promise.all(
    rows.map(async (row) => {
      const { data: cycleRows } = await supabase.rpc("resolve_cycle_batch_for_system_date", {
        p_system_id: row.system_id,
        p_date: row.as_of_date,
      })
      const batchId = cycleRows?.[0]?.batch_id ?? null
      return {
        ...row,
        batch_name: batchId != null ? batchLabelById.get(batchId) ?? `Batch ${batchId}` : null,
      }
    }),
  )

  return toQuerySuccess<DashboardSystemRow>(enrichedRows)
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
  const dateFrom = toRpcDate(params.dateFrom)
  const dateTo = toRpcDate(params.dateTo)

  let query = queryKpiRpc(
    supabase,
    "api_dashboard_consolidated",
    {
      p_farm_id: params.farmId,
      p_system_ids: toRpcSystemIds(params.systemId),
      p_stage: params.stage ?? undefined,
      p_start_date: dateFrom,
      p_end_date: dateTo,
      p_time_period:
        !dateFrom && !dateTo ? (params.timePeriod ?? undefined) : undefined,
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

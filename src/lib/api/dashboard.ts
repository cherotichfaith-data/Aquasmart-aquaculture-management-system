import type { Database, Enums } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import { getClientOrError, isAbortLikeError, queryKpiRpc, toQueryError, toQuerySuccess } from "@/lib/api/_utils"
import { isSbAuthMissing, isSbPermissionDenied } from "@/lib/supabase/log"
import { toRpcDate, toRpcSystemIds } from "@/lib/rpc-params"
import type { DashboardSystemRow } from "@/features/dashboard/types"

type DashboardSystemRpcRow = Database["public"]["Functions"]["api_dashboard_systems"]["Returns"][number]

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

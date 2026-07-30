"use client"

import type { Database } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import { getClientOrError, isAbortLikeError, queryKpiRpc, toQueryError, toQuerySuccess } from "@/lib/supabase/query-transport"
import { isSbAuthMissing, isSbPermissionDenied } from "@/lib/supabase/log"
import { toRpcDate, toRpcSystemIds } from "@/lib/rpc-params"
import type { DashboardSystemRow } from "./types"

type DashboardSystemRpcRow = Database["public"]["Functions"]["api_dashboard_systems"]["Returns"][number]
const isQuietError = (err: unknown): boolean =>
  isAbortLikeError(err) || isSbPermissionDenied(err) || isSbAuthMissing(err)

export async function getDashboardSystems(params?: {
  farmId?: string | null
  stage?: Database["public"]["Enums"]["system_growth_stage"] | null
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

  return toQuerySuccess<DashboardSystemRow>(((data ?? []) as DashboardSystemRpcRow[]).slice())
}

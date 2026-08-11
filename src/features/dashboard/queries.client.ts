"use client"

import type { Database } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import { fetchRpc } from "@/lib/supabase/query-transport"
import { toRpcDate, toRpcSystemIds } from "@/lib/rpc-params"
import type { DashboardSystemRow } from "./types"

type DashboardSystemRpcRow = Database["public"]["Functions"]["api_dashboard_systems"]["Returns"][number]

export async function getDashboardSystems(params?: {
  farmId?: string | null
  stage?: Database["public"]["Enums"]["system_growth_stage"] | null
  systemId?: number | null
  systemIds?: number[] | null
  dateFrom?: string | null
  dateTo?: string | null
  signal?: AbortSignal
}): Promise<QueryResult<DashboardSystemRow>> {
  if (!params?.farmId) return { status: "success", data: [] }

  // Goes through the /api/rpc server proxy rather than a direct browser
  // Supabase client call -- the direct-client path (getClientOrError ->
  // supabase.rpc(...)) has repeatedly hung or silently returned empty here
  // due to the SDK's client-side session lock, while the server-backed
  // proxy (already used by farm/options RPCs) has been reliable throughout.
  const result = await fetchRpc<DashboardSystemRpcRow>(
    "getDashboardSystems",
    "api_dashboard_systems",
    {
      p_farm_id: params.farmId,
      p_stage: params.stage ?? undefined,
      p_system_ids: toRpcSystemIds(params.systemIds ?? params.systemId),
      p_start_date: toRpcDate(params.dateFrom),
      p_end_date: toRpcDate(params.dateTo),
    },
    params.signal,
  )

  return result as QueryResult<DashboardSystemRow>
}

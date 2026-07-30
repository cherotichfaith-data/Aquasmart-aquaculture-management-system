"use client"

import type { QueryResult } from "@/lib/supabase-client"
import { fetchRpc } from "@/lib/supabase/query-transport"
import type { RecommendedActionRow } from "@/lib/types/insights"
import { toRpcSystemId } from "@/lib/rpc-params"

export async function getRecommendedActions(params: {
  farmId: string
  systemId?: number | null
  signal?: AbortSignal
}): Promise<QueryResult<RecommendedActionRow>> {
  return fetchRpc<RecommendedActionRow>(
    "getRecommendedActions",
    "api_recommended_actions",
    { p_farm_id: params.farmId, p_system_id: toRpcSystemId(params.systemId) },
    params.signal,
  )
}

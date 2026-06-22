"use client"

import type { QueryResult } from "@/lib/supabase-client"
import { getClientOrError, isAbortLikeError, toQueryError, toQuerySuccess } from "@/lib/api/_utils"
import { createAccessTokenClient } from "@/lib/supabase/access-token-client"
import { createClient } from "@/lib/supabase/client"
import { isSbAuthMissing, isSbPermissionDenied } from "@/lib/supabase/log"
import type { RecommendedActionRow } from "@/lib/types/insights"
import { getDashboardSystems } from "@/lib/api/dashboard"
import { toSystemsOverviewRows } from "@/features/dashboard/systems-overview"
import type { SystemsOverviewRow } from "@/features/dashboard/types"
import { toRpcSystemId } from "@/lib/rpc-params"

const isQuietError = (err: unknown): boolean =>
  isAbortLikeError(err) || isSbPermissionDenied(err) || isSbAuthMissing(err)

async function getAuthenticatedClient(tag: string): Promise<
  | { supabase: ReturnType<typeof createClient> | ReturnType<typeof createAccessTokenClient> }
  | { error: QueryResult<never> }
> {
  return getClientOrError(`analytics:${tag}`, { requireSession: true })
}

async function callAnalyticsRpc<T>(params: {
  tag: string
  rpcName: string
  args: Record<string, unknown>
  signal?: AbortSignal
}): Promise<QueryResult<T>> {
  const clientResult = await getAuthenticatedClient(params.tag)
  if ("error" in clientResult) return clientResult.error as QueryResult<T>
  const { supabase } = clientResult

  let query = supabase.rpc(params.rpcName as never, params.args as never)
  if (params.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (isQuietError(error)) return toQuerySuccess<T>([])
    return toQueryError<T>(params.tag, error)
  }

  return toQuerySuccess<T>((data ?? []) as unknown as T[])
}

export async function getRecommendedActions(params: {
  farmId: string
  systemId?: number | null
  signal?: AbortSignal
}): Promise<QueryResult<RecommendedActionRow>> {
  return callAnalyticsRpc<RecommendedActionRow>({
    tag: "getRecommendedActions",
    rpcName: "api_recommended_actions",
    args: { p_farm_id: params.farmId, p_system_id: toRpcSystemId(params.systemId) },
    signal: params.signal,
  })
}

export async function fetchSystemsOverview(
  farmId?: string | null,
  signal?: AbortSignal,
): Promise<SystemsOverviewRow[]> {
  if (!farmId) return []

  const result = await getDashboardSystems({
    farmId,
    signal,
  })

  if (result.status !== "success") {
    throw new Error(result.error || "Unable to load systems overview")
  }

  return toSystemsOverviewRows(result.data)
}

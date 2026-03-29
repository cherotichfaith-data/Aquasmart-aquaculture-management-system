import type { Database } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import { getClientOrError, isAbortLikeError, queryKpiRpc, toQueryError, toQuerySuccess } from "@/lib/api/_utils"
import { isSbAuthMissing, isSbPermissionDenied } from "@/lib/supabase/log"

export type SystemTimelineBoundsRow =
  Database["public"]["Functions"]["api_system_timeline_bounds"]["Returns"][number]

const empty = (): QueryResult<SystemTimelineBoundsRow> => toQuerySuccess<SystemTimelineBoundsRow>([])

export async function getSystemTimelineBounds(params?: {
  farmId?: string | null
  systemId?: number
  signal?: AbortSignal
}): Promise<QueryResult<SystemTimelineBoundsRow>> {
  if (!params?.farmId) return empty()

  const clientResult = await getClientOrError("getSystemTimelineBounds", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = queryKpiRpc(supabase, "api_system_timeline_bounds", {
    p_farm_id: params.farmId,
    p_system_id: params.systemId ?? undefined,
  })

  if (params.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (params.signal?.aborted || isAbortLikeError(error) || isSbPermissionDenied(error) || isSbAuthMissing(error)) {
      return empty()
    }
    return toQueryError("getSystemTimelineBounds", error)
  }

  return toQuerySuccess<SystemTimelineBoundsRow>((data ?? []) as SystemTimelineBoundsRow[])
}

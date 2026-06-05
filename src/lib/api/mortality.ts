import type { QueryResult } from "@/lib/supabase-client"
import type { Tables } from "@/lib/types/database"
import { postJson } from "@/lib/commands/_utils"
import { isAbortLikeError, toQueryError, toQuerySuccess } from "@/lib/api/_utils"

export type AlertLogRow = {
  id: string | number
  farm_id: string | null
  system_id: number | null
  severity: string | null
  rule_code: string | null
  message: string | null
  acknowledged_at: string | null
  fired_at: string | null
}
type MortalityEventRow = Tables<"fish_mortality">

export async function getMortalityEvents(params?: {
  farmId?: string | null
  systemId?: number
  batchId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<MortalityEventRow>> {
  try {
    const response = await postJson<{ data: MortalityEventRow[] }, Omit<NonNullable<typeof params>, "signal">>(
      "/api/mortality/events/query",
      {
        farmId: params?.farmId,
        systemId: params?.systemId,
        batchId: params?.batchId,
        dateFrom: params?.dateFrom,
        dateTo: params?.dateTo,
        limit: params?.limit,
      },
      { signal: params?.signal },
    )
    return toQuerySuccess<MortalityEventRow>(response.data)
  } catch (error) {
    if (params?.signal?.aborted || isAbortLikeError(error)) return toQuerySuccess<MortalityEventRow>([])
    return toQueryError("getMortalityEvents", error)
  }
}



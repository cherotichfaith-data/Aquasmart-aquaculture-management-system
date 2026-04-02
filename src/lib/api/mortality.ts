import type { QueryResult } from "@/lib/supabase-client"
import type { Database, Tables } from "@/lib/types/database"
import type { AlertSeverity } from "@/lib/mortality"
import { postJson } from "@/lib/commands/_utils"
import { isAbortLikeError, toQueryError, toQuerySuccess } from "@/lib/api/_utils"

type AlertLogRow = Tables<"alert_log">
type MortalityEventRow = Tables<"fish_mortality">
type SurvivalTrendRow = Database["public"]["Functions"]["get_survival_trend"]["Returns"][number]

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

export async function getAlertLog(params?: {
  farmId?: string | null
  systemId?: number
  severity?: AlertSeverity
  ruleCodes?: string[]
  unacknowledgedOnly?: boolean
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<AlertLogRow>> {
  try {
    const response = await postJson<{ data: AlertLogRow[] }, Omit<NonNullable<typeof params>, "signal">>(
      "/api/mortality/alerts/query",
      {
        farmId: params?.farmId,
        systemId: params?.systemId,
        severity: params?.severity,
        ruleCodes: params?.ruleCodes,
        unacknowledgedOnly: params?.unacknowledgedOnly,
        limit: params?.limit,
      },
      { signal: params?.signal },
    )
    return toQuerySuccess<AlertLogRow>(response.data)
  } catch (error) {
    if (params?.signal?.aborted || isAbortLikeError(error)) return toQuerySuccess<AlertLogRow>([])
    return toQueryError("getAlertLog", error)
  }
}

export async function getSurvivalTrend(params: {
  systemId?: number
  dateFrom?: string
  dateTo?: string
  signal?: AbortSignal
}): Promise<QueryResult<SurvivalTrendRow>> {
  if (!params.systemId || !params.dateFrom) {
    return toQuerySuccess<SurvivalTrendRow>([])
  }
  try {
    const response = await postJson<{ data: SurvivalTrendRow[] }, Omit<typeof params, "signal">>(
      "/api/mortality/survival-trend/query",
      {
        systemId: params.systemId,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
      },
      { signal: params.signal },
    )
    return toQuerySuccess<SurvivalTrendRow>(response.data)
  } catch (error) {
    if (params.signal?.aborted || isAbortLikeError(error)) return toQuerySuccess<SurvivalTrendRow>([])
    return toQueryError("getSurvivalTrend", error)
  }
}

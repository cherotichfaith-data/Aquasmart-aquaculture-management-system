import type { QueryResult } from "@/lib/supabase-client"
import type { AlertSeverity, AlertLogRow, MortalityEventRow, SurvivalTrendRow } from "@/lib/types/mortality"
import { getClientOrError, toQueryError, toQuerySuccess } from "@/lib/api/_utils"
import { isSbAuthMissing, isSbPermissionDenied } from "@/utils/supabase/log"

const fromTable = (
  supabase: ReturnType<typeof import("@/utils/supabase/client").createClient>,
  table: string,
) => (supabase as unknown as { from: (name: string) => any }).from(table)

const runRpc = (
  supabase: ReturnType<typeof import("@/utils/supabase/client").createClient>,
  name: string,
  args: Record<string, unknown>,
) => (supabase as unknown as { rpc: (rpcName: string, rpcArgs?: Record<string, unknown>) => any }).rpc(name, args)

const isAbortLikeError = (err: unknown): boolean => {
  if (!err) return false
  const e = err as { name?: string; message?: string }
  const name = String(e.name ?? "").toLowerCase()
  const message = String(e.message ?? "").toLowerCase()
  return name.includes("abort") || name.includes("cancel") || message.includes("abort") || message.includes("cancel")
}

const isMissingObjectError = (err: unknown) => {
  const code = String(
    typeof err === "object" && err !== null && "code" in err ? (err as { code?: string }).code ?? "" : "",
  )
  return code === "42P01" || code === "42883"
}

export async function getMortalityEvents(params?: {
  farmId?: string | null
  systemId?: number
  batchId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<MortalityEventRow>> {
  const clientResult = await getClientOrError("getMortalityEvents", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = fromTable(supabase, "fish_mortality_events").select("*")
  if (params?.farmId) query = query.eq("farm_id", params.farmId)
  if (params?.systemId) query = query.eq("system_id", params.systemId)
  if (params?.batchId) query = query.eq("batch_id", params.batchId)
  if (params?.dateFrom) query = query.gte("event_date", params.dateFrom)
  if (params?.dateTo) query = query.lte("event_date", params.dateTo)
  query = query.order("event_date", { ascending: false }).order("created_at", { ascending: false })
  if (params?.limit) query = query.limit(params.limit)
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (
      params?.signal?.aborted ||
      isAbortLikeError(error) ||
      isSbPermissionDenied(error) ||
      isSbAuthMissing(error) ||
      isMissingObjectError(error)
    ) {
      return toQuerySuccess<MortalityEventRow>([])
    }
    return toQueryError("getMortalityEvents", error)
  }

  return toQuerySuccess<MortalityEventRow>((data ?? []) as MortalityEventRow[])
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
  const clientResult = await getClientOrError("getAlertLog", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = fromTable(supabase, "alert_log").select("*")
  if (params?.farmId) query = query.eq("farm_id", params.farmId)
  if (params?.systemId) query = query.eq("system_id", params.systemId)
  if (params?.severity) query = query.eq("severity", params.severity)
  if (params?.ruleCodes?.length) query = query.in("rule_code", params.ruleCodes)
  if (params?.unacknowledgedOnly) query = query.is("acknowledged_at", null)
  query = query.order("fired_at", { ascending: false })
  if (params?.limit) query = query.limit(params.limit)
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (
      params?.signal?.aborted ||
      isAbortLikeError(error) ||
      isSbPermissionDenied(error) ||
      isSbAuthMissing(error) ||
      isMissingObjectError(error)
    ) {
      return toQuerySuccess<AlertLogRow>([])
    }
    return toQueryError("getAlertLog", error)
  }

  return toQuerySuccess<AlertLogRow>((data ?? []) as AlertLogRow[])
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

  const clientResult = await getClientOrError("getSurvivalTrend", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = runRpc(supabase, "get_survival_trend", {
    p_system_id: params.systemId,
    p_start_date: params.dateFrom,
    p_end_date: params.dateTo,
  })
  if (params.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (
      params.signal?.aborted ||
      isAbortLikeError(error) ||
      isSbPermissionDenied(error) ||
      isSbAuthMissing(error) ||
      isMissingObjectError(error)
    ) {
      return toQuerySuccess<SurvivalTrendRow>([])
    }
    return toQueryError("getSurvivalTrend", error)
  }

  return toQuerySuccess<SurvivalTrendRow>((data ?? []) as SurvivalTrendRow[])
}

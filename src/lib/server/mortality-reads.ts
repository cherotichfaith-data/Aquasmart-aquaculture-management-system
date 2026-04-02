import type { Database } from "@/lib/types/database"
import { createClient } from "@/lib/supabase/server"
import { isMissingObjectError } from "@/lib/api/_utils"
import { isSbAuthMissing, isSbPermissionDenied } from "@/lib/supabase/log"

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>
type AlertSeverity = string
type AlertLogRow = Database["public"]["Tables"]["alert_log"]["Row"]
type MortalityEventRow = Database["public"]["Tables"]["fish_mortality"]["Row"]
type SurvivalTrendRow = Database["public"]["Functions"]["get_survival_trend"]["Returns"][number]

const isQuietReadError = (error: unknown) =>
  isSbPermissionDenied(error) || isSbAuthMissing(error) || isMissingObjectError(error)

export async function listMortalityEvents(
  supabase: ServerSupabaseClient,
  params?: {
    farmId?: string | null
    systemId?: number
    batchId?: number
    dateFrom?: string
    dateTo?: string
    limit?: number
  },
): Promise<MortalityEventRow[]> {
  let query = supabase.from("fish_mortality").select("*")
  if (params?.farmId) query = query.eq("farm_id", params.farmId)
  if (params?.systemId) query = query.eq("system_id", params.systemId)
  if (params?.batchId) query = query.eq("batch_id", params.batchId)
  if (params?.dateFrom) query = query.gte("date", params.dateFrom)
  if (params?.dateTo) query = query.lte("date", params.dateTo)

  const { data, error } = await query
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(params?.limit ?? 100)

  if (error) {
    if (isQuietReadError(error)) return []
    throw error
  }

  return (data ?? []) as MortalityEventRow[]
}

export async function listAlertLog(
  supabase: ServerSupabaseClient,
  params?: {
    farmId?: string | null
    systemId?: number
    severity?: AlertSeverity
    ruleCodes?: string[]
    unacknowledgedOnly?: boolean
    limit?: number
  },
): Promise<AlertLogRow[]> {
  let query = supabase.from("alert_log").select("*")
  if (params?.farmId) query = query.eq("farm_id", params.farmId)
  if (params?.systemId) query = query.eq("system_id", params.systemId)
  if (params?.severity) query = query.eq("severity", params.severity)
  if (params?.ruleCodes?.length) query = query.in("rule_code", params.ruleCodes)
  if (params?.unacknowledgedOnly) query = query.is("acknowledged_at", null)

  const { data, error } = await query.order("fired_at", { ascending: false }).limit(params?.limit ?? 50)
  if (error) {
    if (isQuietReadError(error)) return []
    throw error
  }

  return (data ?? []) as AlertLogRow[]
}

export async function listSurvivalTrend(
  supabase: ServerSupabaseClient,
  params: {
    systemId?: number
    dateFrom?: string
    dateTo?: string
  },
): Promise<SurvivalTrendRow[]> {
  if (!params.systemId || !params.dateFrom) return []

  const { data, error } = await supabase.rpc("get_survival_trend", {
    p_system_id: params.systemId,
    p_start_date: params.dateFrom,
    p_end_date: params.dateTo,
  })

  if (error) {
    if (isQuietReadError(error)) return []
    throw error
  }

  return ((data ?? []) as SurvivalTrendRow[]) ?? []
}

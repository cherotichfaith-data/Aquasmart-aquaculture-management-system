import type { Database } from "@/lib/types/database"
import { createAccessTokenClient } from "@/lib/supabase/server"
import { buildProductionSummaryRpcArgs, type ProductionSummaryParams } from "@/lib/production-summary-rpc"

export type ServerClient = ReturnType<typeof createAccessTokenClient>

type ProductionSummaryRow = Database["public"]["Functions"]["api_production_summary"]["Returns"][number]
type SystemVolumeRow = Pick<
  Database["public"]["Tables"]["system"]["Row"],
  "commissioned_at" | "growth_stage" | "id" | "is_active" | "name" | "volume"
>
type AppConfigRow = Database["public"]["Tables"]["app_config"]["Row"]
type BatchOptionRow = Database["public"]["Functions"]["api_fingerling_batch_options_rpc"]["Returns"][number]
type FeedTypeOptionRow = Database["public"]["Functions"]["api_feed_type_options_rpc"]["Returns"][number]
type AlertThresholdRow = Database["public"]["Views"]["api_alert_thresholds"]["Row"]
type WaterQualityMeasurementRow = Database["public"]["Views"]["api_water_quality_measurements"]["Row"]
type DashboardSystemRow = Database["public"]["Functions"]["api_dashboard_systems"]["Returns"][number]
type FarmMember = {
  user_id: string
  role: string
  created_at: string
  full_name?: string | null
}

export async function listProductionSummaryRows(
  supabase: ServerClient,
  params: ProductionSummaryParams,
): Promise<ProductionSummaryRow[]> {
  const { data, error } = await supabase.rpc("api_production_summary", buildProductionSummaryRpcArgs(params) as never)
  if (error) return []

  let rows = ((data ?? []) as ProductionSummaryRow[])
    .slice()
    .sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")))

  if (params.limit) {
    rows = rows.slice(0, params.limit)
  }
  return rows
}

export async function listSystemVolumeRows(
  supabase: ServerClient,
  params: {
    farmId: string
    stage?: "all" | Database["public"]["Enums"]["system_growth_stage"]
    activeOnly?: boolean
  },
): Promise<SystemVolumeRow[]> {
  let query = supabase
    .from("system")
    .select("id, commissioned_at, name, volume, growth_stage, is_active, farm_id")
    .eq("farm_id", params.farmId)

  if (params.stage && params.stage !== "all") {
    query = query.eq("growth_stage", params.stage)
  }
  if (params.activeOnly ?? true) {
    query = query.eq("is_active", true)
  }

  const { data, error } = await query
    .order("is_active", { ascending: false })
    .order("commissioned_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
  if (error) return []
  return (data ?? []) as SystemVolumeRow[]
}

export async function listAppConfigRows(
  supabase: ServerClient,
  params: { keys: string[] },
): Promise<AppConfigRow[]> {
  if (!params.keys.length) return []
  const { data, error } = await supabase.from("app_config").select("key, value").in("key", params.keys)
  if (error) return []
  return (data ?? []) as AppConfigRow[]
}

export async function listBatchOptionRows(
  supabase: ServerClient,
  params: { farmId: string; activeOnly?: boolean },
): Promise<BatchOptionRow[]> {
  const { data, error } = await supabase.rpc("api_fingerling_batch_options_rpc", {
    p_farm_id: params.farmId,
    p_active_only: params.activeOnly ?? true,
  })
  if (error) return []
  return (data ?? []) as BatchOptionRow[]
}

export async function listFeedTypeOptionRows(
  supabase: ServerClient,
  params: { farmId: string },
): Promise<FeedTypeOptionRow[]> {
  const { data, error } = await supabase.rpc("api_feed_type_options_rpc", {
    p_farm_id: params.farmId,
  })
  if (error) return []

  return (data ?? []) as FeedTypeOptionRow[]
}

export async function listAlertThresholdRows(
  supabase: ServerClient,
  farmId: string,
  userId?: string | null,
): Promise<AlertThresholdRow[]> {
  void userId
  const { data, error } = await supabase.from("alert_threshold").select("*").or(`farm_id.eq.${farmId},scope.eq.default`)
  if (error) return []
  return (data ?? []) as unknown as AlertThresholdRow[]
}

export async function listWaterQualityMeasurementRows(
  supabase: ServerClient,
  params: {
    farmId: string
    systemId?: number
    dateFrom?: string
    dateTo?: string
    parameterName?: Database["public"]["Views"]["api_water_quality_measurements"]["Row"]["parameter_name"]
    limit?: number
  },
): Promise<WaterQualityMeasurementRow[]> {
  let query = supabase.from("api_water_quality_measurements").select("*").eq("farm_id", params.farmId)
  if (params.systemId) query = query.eq("system_id", params.systemId)
  if (params.dateFrom) query = query.gte("date", params.dateFrom)
  if (params.dateTo) query = query.lte("date", params.dateTo)
  if (params.parameterName) query = query.eq("parameter_name", params.parameterName)
  if (params.limit) query = query.limit(params.limit)

  const { data, error } = await query.order("date", { ascending: true }).order("time", { ascending: true })
  if (error) return []
  return (data ?? []) as WaterQualityMeasurementRow[]
}

export async function listDashboardSystemsRows(
  supabase: ServerClient,
  params: {
    farmId: string
    systemIds?: number[]
    stage?: Database["public"]["Enums"]["system_growth_stage"]
    dateFrom?: string
    dateTo?: string
  },
): Promise<DashboardSystemRow[]> {
  const { data, error } = await supabase.rpc("api_dashboard_systems", {
    p_farm_id: params.farmId,
    p_stage: params.stage ?? undefined,
    p_system_ids: params.systemIds?.length ? params.systemIds : undefined,
    p_start_date: params.dateFrom ?? undefined,
    p_end_date: params.dateTo ?? undefined,
  })
  if (error) return []
  return (data ?? []) as DashboardSystemRow[]
}

export async function listFarmMembers(
  supabase: ServerClient,
  farmId: string,
): Promise<FarmMember[]> {
  const { data: membersData, error: membersError } = await supabase
    .from("farm_user")
    .select("user_id, role, created_at")
    .eq("farm_id", farmId)
    .order("created_at")

  if (membersError) return []

  const userIds = (membersData ?? []).map((member) => member.user_id)
  const { data: profiles, error: profilesError } =
    userIds.length > 0
      ? await supabase.from("user_profile").select("user_id, full_name").in("user_id", userIds)
      : { data: [], error: null }

  if (profilesError) return []

  const profileMap = Object.fromEntries((profiles ?? []).map((profile) => [profile.user_id, profile.full_name]))
  return (membersData ?? []).map((member) => ({
    user_id: member.user_id,
    role: member.role,
    created_at: member.created_at ?? new Date().toISOString(),
    full_name: profileMap[member.user_id] ?? null,
  }))
}

export async function getFarmUserRole(
  supabase: ServerClient,
  params: { farmId?: string | null; userId: string },
) {
  if (!params.farmId) return null

  const { data } = await supabase
    .from("farm_user")
    .select("role")
    .eq("farm_id", params.farmId)
    .eq("user_id", params.userId)
    .maybeSingle()

  return (data?.role ?? null) as Database["public"]["Tables"]["farm_user"]["Row"]["role"] | null
}

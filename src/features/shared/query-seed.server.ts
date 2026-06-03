import type { Database } from "@/lib/types/database"
import { createAccessTokenClient } from "@/lib/supabase/server"
import type { CycleBenchmarkRow, FeedDemandRow, HarvestForecastRow, SystemHealthRow } from "@/lib/types/insights"
import { normalizeSystemHealthRow } from "@/lib/health-grade"
import { parseAlertThresholdSettings } from "@/lib/alert-thresholds"
import { logSbError } from "@/lib/supabase/log"

export type ServerClient = ReturnType<typeof createAccessTokenClient>

type ProductionSummaryRow = Database["public"]["Functions"]["api_production_summary"]["Returns"][number]
type DailyFishInventoryRow = Database["public"]["Functions"]["api_daily_fish_inventory_rpc"]["Returns"][number]
type SystemVolumeRow = Pick<
  Database["public"]["Tables"]["system"]["Row"],
  "commissioned_at" | "growth_stage" | "id" | "is_active" | "name" | "volume"
>
type AppConfigRow = Database["public"]["Tables"]["app_config"]["Row"]
type BatchOptionRow = Database["public"]["Functions"]["api_fingerling_batch_options_rpc"]["Returns"][number]
type FeedTypeOptionRow = Database["public"]["Functions"]["api_feed_type_options_rpc"]["Returns"][number]
type DashboardTimePeriodRow = Database["public"]["Tables"]["dashboard_time_period"]["Row"]
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
  params: {
    farmId: string
    systemId?: number
    stage?: Database["public"]["Enums"]["system_growth_stage"]
    dateFrom?: string
    dateTo?: string
    limit?: number
  },
): Promise<ProductionSummaryRow[]> {
  const { data, error } = await supabase.rpc("api_production_summary", {
    p_farm_id: params.farmId,
    p_system_id: params.systemId,
    p_stage: params.stage,
    p_start_date: params.dateFrom,
    p_end_date: params.dateTo,
  })
  if (error) return []

  let rows = ((data ?? []) as ProductionSummaryRow[])
    .slice()
    .sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")))

  if (params.limit) {
    rows = rows.slice(0, params.limit)
  }
  return rows
}

export async function listDailyFishInventoryRows(
  supabase: ServerClient,
  params: {
    farmId: string
    systemId?: number
    stage?: Database["public"]["Enums"]["system_growth_stage"]
    dateFrom?: string
    dateTo?: string
    cursorDate?: string
    orderAsc?: boolean
    limit?: number
  },
): Promise<DailyFishInventoryRow[]> {
  const { data, error } = await supabase.rpc("api_daily_fish_inventory_rpc", {
    p_farm_id: params.farmId,
    p_system_id: params.systemId,
    p_stage: params.stage,
    p_start_date: params.dateFrom,
    p_end_date: params.dateTo,
    p_cursor_date: params.cursorDate,
    p_order_asc: params.orderAsc ?? false,
    p_limit: params.limit ?? 5000,
  })
  if (error) return []
  return (data ?? []) as DailyFishInventoryRow[]
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
  })
  if (error) return []
  const rows = ((data ?? []) as BatchOptionRow[])
    .slice()
    .sort((a, b) => String(b.date_of_delivery ?? "").localeCompare(String(a.date_of_delivery ?? "")))

  const { data: activeSystems } = await supabase
    .from("system")
    .select("id, commissioned_at")
    .eq("farm_id", params.farmId)
    .eq("is_active", true)

  const activeSystemStartById = new Map(
    (activeSystems ?? [])
      .filter((row): row is { id: number; commissioned_at: string | null } => typeof row.id === "number")
      .map((row) => [row.id, row.commissioned_at ?? "0001-01-01"]),
  )
  const activeSystemIds = Array.from(activeSystemStartById.keys())
  if (params.activeOnly === false) return rows

  if (activeSystemIds.length === 0) return []
  const batchIds = new Set<number>()
  const { data: transfers } = await supabase
    .from("fish_transfer")
    .select("batch_id, target_system_id, date")
    .in("target_system_id", activeSystemIds)

  ;(transfers ?? []).forEach((row) => {
    if (typeof row.batch_id !== "number" || typeof row.target_system_id !== "number") return
    if (String(row.date ?? "") >= (activeSystemStartById.get(row.target_system_id) ?? "0001-01-01")) {
      batchIds.add(row.batch_id)
    }
  })

  const { data: stockings } = await supabase
    .from("fish_stocking")
    .select("batch_id, system_id, date")
    .in("system_id", activeSystemIds)

  ;(stockings ?? []).forEach((row) => {
    if (typeof row.batch_id !== "number" || typeof row.system_id !== "number") return
    if (String(row.date ?? "") >= (activeSystemStartById.get(row.system_id) ?? "0001-01-01")) {
      batchIds.add(row.batch_id)
    }
  })

  return rows.filter((row) => {
    const systemStart = activeSystemStartById.get(row.system_id)
    if (!systemStart) return false
    return batchIds.has(row.id) || String(row.date_of_delivery ?? "") >= systemStart
  })
}

export async function listFeedTypeOptionRows(
  supabase: ServerClient,
  params: { farmId: string },
): Promise<FeedTypeOptionRow[]> {
  const { data, error } = await supabase.rpc("api_feed_type_options_rpc", {
    p_farm_id: params.farmId,
  })
  if (error) return []

  const { data: existingRows } = await supabase
    .from("feed_type")
    .select("id")
    .or(`farm_id.eq.${params.farmId},farm_id.is.null`)

  const existingIds = new Set(
    (existingRows ?? []).map((row) => row.id).filter((id): id is number => typeof id === "number"),
  )

  return ((data ?? []) as FeedTypeOptionRow[])
    .filter((row) => typeof row.id === "number" && (existingIds.size === 0 || existingIds.has(row.id)))
    .slice()
    .sort((a, b) => String(a.label ?? "").localeCompare(String(b.label ?? "")))
}

export async function listDashboardTimePeriodRows(
  supabase: ServerClient,
): Promise<Array<{ time_period: Database["public"]["Enums"]["time_period"] | "all history"; days_since_start: number | null }>> {
  const { data, error } = await supabase
    .from("dashboard_time_period")
    .select("time_period, days_since_start")
    .order("days_since_start", { ascending: true })

  if (error) return []

  return [
    ...((data ?? []) as DashboardTimePeriodRow[]),
    { time_period: "all history", days_since_start: null },
  ]
}

export async function listAlertThresholdRows(
  supabase: ServerClient,
  farmId: string,
  userId?: string | null,
): Promise<AlertThresholdRow[]> {
  const [{ data: settingsRow, error: settingsError }, { data, error }] = await Promise.all([
    userId
      ? supabase.from("user_settings").select("alert_thresholds").eq("user_id", userId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("alert_threshold").select("*").or(`farm_id.eq.${farmId},scope.eq.default`),
  ])

  if (settingsError) return []
  const settingsThresholds = parseAlertThresholdSettings(settingsRow?.alert_thresholds ?? null, farmId)
  if (settingsThresholds.length > 0) {
    return settingsThresholds as unknown as AlertThresholdRow[]
  }

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
    stage?: Database["public"]["Enums"]["system_growth_stage"] | null
    systemId?: number | null
    dateFrom?: string | null
    dateTo?: string | null
  },
): Promise<DashboardSystemRow[]> {
  const { data, error } = await supabase.rpc("api_dashboard_systems", {
    p_farm_id: params.farmId,
    p_stage: params.stage ?? undefined,
    p_system_id: params.systemId ?? undefined,
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

export async function listSystemHealthScoreRows(
  supabase: ServerClient,
  params: { farmId: string; systemId?: number },
): Promise<SystemHealthRow[]> {
  const { data, error } = await supabase.rpc("api_system_health_score", {
    p_farm_id: params.farmId,
    ...(params.systemId != null ? { p_system_id: params.systemId } : {}),
  })
  if (error) {
    logSbError("query-seed:listSystemHealthScoreRows", error)
    return []
  }
  return ((data ?? []) as SystemHealthRow[]).map(normalizeSystemHealthRow)
}

export async function listHarvestForecastRows(
  supabase: ServerClient,
  params: { farmId: string; systemId?: number },
): Promise<HarvestForecastRow[]> {
  const { data, error } = await supabase.rpc("api_harvest_forecast", {
    p_farm_id: params.farmId,
    ...(params.systemId != null ? { p_system_id: params.systemId } : {}),
  })
  if (error) {
    logSbError("query-seed:listHarvestForecastRows", error)
    return []
  }
  return (data ?? []) as HarvestForecastRow[]
}

export async function listFeedDemandForecastRows(
  supabase: ServerClient,
  params: { farmId: string; daysAhead?: number },
): Promise<FeedDemandRow[]> {
  const { data, error } = await supabase.rpc("api_feed_demand_forecast", {
    p_farm_id: params.farmId,
    p_days_ahead: params.daysAhead ?? 14,
  })
  if (error) {
    logSbError("query-seed:listFeedDemandForecastRows", error)
    return []
  }
  return (data ?? []) as FeedDemandRow[]
}

export async function listCycleBenchmarkRows(
  supabase: ServerClient,
  params: { farmId: string; systemId?: number },
): Promise<CycleBenchmarkRow[]> {
  const { data, error } = await supabase.rpc("api_cycle_benchmarks", {
    p_farm_id: params.farmId,
    ...(params.systemId != null ? { p_system_id: params.systemId } : {}),
  })
  if (error) {
    logSbError("query-seed:listCycleBenchmarkRows", error)
    return []
  }
  return (data ?? []) as CycleBenchmarkRow[]
}

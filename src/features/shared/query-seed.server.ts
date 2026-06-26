import type { Database } from "@/lib/types/database"
import { createAccessTokenClient } from "@/lib/supabase/server"
import { buildProductionSummaryRpcArgs, type ProductionSummaryParams } from "@/lib/production-summary-rpc"
import { toRpcDate, toRpcSystemIds } from "@/lib/rpc-params"
import type { DashboardSystemRow } from "@/features/dashboard/types"

export type ServerClient = ReturnType<typeof createAccessTokenClient>

type ProductionSummaryRow = Database["public"]["Functions"]["api_production_summary"]["Returns"][number]
type SystemVolumeRow = Pick<
  Database["public"]["Tables"]["system"]["Row"],
  "commissioned_at" | "growth_stage" | "id" | "is_active" | "name" | "volume"
>
type AppConfigRow = Database["public"]["Tables"]["app_config"]["Row"]
type BatchOptionRow = Database["public"]["Functions"]["api_fingerling_batch_options_rpc"]["Returns"][number]
type ProductionCycleBatchRow = Pick<
  Database["public"]["Tables"]["production_cycle"]["Row"],
  "batch_id" | "cycle_end" | "cycle_start" | "system_id"
>
type BatchActivityRow = {
  batch_id: number
  date: string
  system_id: number
}
type FeedTypeOptionRow = Database["public"]["Functions"]["api_feed_type_options_rpc"]["Returns"][number]
type DashboardTimePeriodRow = Database["public"]["Tables"]["dashboard_time_period"]["Row"]
type AlertThresholdRow = Database["public"]["Views"]["api_alert_thresholds"]["Row"]
type WaterQualityMeasurementRow = Database["public"]["Views"]["api_water_quality_measurements"]["Row"]
type FarmMember = {
  user_id: string
  role: string
  created_at: string
  full_name?: string | null
}

const dateFitsCycle = (asOfDate: string | null, cycle: ProductionCycleBatchRow) => {
  if (!asOfDate) return false
  if (cycle.cycle_start > asOfDate) return false
  if (cycle.cycle_end && cycle.cycle_end < asOfDate) return false
  return true
}

function attachBatchNamesToDashboardRows<T extends { system_id: number; as_of_date: string | null; batch_name?: string | null }>(
  rows: T[],
  cycles: ProductionCycleBatchRow[],
  activities: BatchActivityRow[],
  batchLabelById: Map<number, string>,
): T[] {
  if (!rows.length || !batchLabelById.size) return rows

  const cyclesBySystemId = new Map<number, ProductionCycleBatchRow[]>()
  cycles.forEach((cycle) => {
    const current = cyclesBySystemId.get(cycle.system_id) ?? []
    current.push(cycle)
    cyclesBySystemId.set(cycle.system_id, current)
  })

  cyclesBySystemId.forEach((systemCycles) => {
    systemCycles.sort((left, right) => right.cycle_start.localeCompare(left.cycle_start))
  })

  const activitiesBySystemId = new Map<number, BatchActivityRow[]>()
  activities.forEach((activity) => {
    const current = activitiesBySystemId.get(activity.system_id) ?? []
    current.push(activity)
    activitiesBySystemId.set(activity.system_id, current)
  })

  activitiesBySystemId.forEach((systemActivities) => {
    systemActivities.sort((left, right) => right.date.localeCompare(left.date))
  })

  return rows.map((row) => {
    const systemCycles = cyclesBySystemId.get(row.system_id) ?? []
    const match = systemCycles.find((cycle) => dateFitsCycle(row.as_of_date, cycle))
    const directBatchId = match?.batch_id ?? null
    const fallbackBatchId =
      directBatchId == null
        ? (activitiesBySystemId.get(row.system_id) ?? []).find((activity) => row.as_of_date && activity.date <= row.as_of_date)?.batch_id ?? null
        : null
    const batchId = directBatchId ?? fallbackBatchId
    if (batchId == null) return row

    const batchName = batchLabelById.get(batchId) ?? `Batch ${batchId}`
    return {
      ...row,
      batch_name: batchName,
    }
  })
}

async function listDashboardBatchActivityRows(
  supabase: ServerClient,
  params: {
    systemIds: number[]
    maxDate: string
  },
): Promise<BatchActivityRow[]> {
  const [feedingResult, samplingResult, mortalityResult, harvestResult, stockingResult, transferResult] = await Promise.all([
    supabase.from("feeding_record").select("system_id, batch_id, date").in("system_id", params.systemIds).lte("date", params.maxDate),
    supabase.from("fish_sampling_weight").select("system_id, batch_id, date").in("system_id", params.systemIds).lte("date", params.maxDate),
    supabase.from("fish_mortality").select("system_id, batch_id, date").in("system_id", params.systemIds).lte("date", params.maxDate),
    supabase.from("fish_harvest").select("system_id, batch_id, date").in("system_id", params.systemIds).lte("date", params.maxDate),
    supabase.from("fish_stocking").select("system_id, batch_id, date").in("system_id", params.systemIds).lte("date", params.maxDate),
    supabase
      .from("fish_transfer")
      .select("origin_system_id, target_system_id, batch_id, date")
      .or(`origin_system_id.in.(${params.systemIds.join(",")}),target_system_id.in.(${params.systemIds.join(",")})`)
      .lte("date", params.maxDate),
  ])

  const results = [feedingResult, samplingResult, mortalityResult, harvestResult, stockingResult, transferResult]
  for (const result of results) {
    if (result.error) return []
  }

  const baseActivities = [feedingResult.data, samplingResult.data, mortalityResult.data, harvestResult.data, stockingResult.data]
    .flatMap((rows) => rows ?? [])
    .flatMap((row) =>
      typeof row.system_id === "number" && typeof row.batch_id === "number" && typeof row.date === "string"
        ? [{ system_id: row.system_id, batch_id: row.batch_id, date: row.date }]
        : [],
    )

  const transferActivities = (transferResult.data ?? []).flatMap((row) => {
    if (typeof row.batch_id !== "number" || typeof row.date !== "string") return []
    const activities: BatchActivityRow[] = []
    if (typeof row.origin_system_id === "number") {
      activities.push({ system_id: row.origin_system_id, batch_id: row.batch_id, date: row.date })
    }
    if (typeof row.target_system_id === "number") {
      activities.push({ system_id: row.target_system_id, batch_id: row.batch_id, date: row.date })
    }
    return activities
  })

  return [...baseActivities, ...transferActivities]
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
    stage?: Database["public"]["Enums"]["system_growth_stage"] | null
    systemId?: number | null
    systemIds?: number[] | null
    dateFrom?: string | null
    dateTo?: string | null
  },
): Promise<DashboardSystemRow[]> {
  const { data, error } = await supabase.rpc("api_dashboard_systems", {
    p_farm_id: params.farmId,
    p_stage: params.stage ?? undefined,
    p_system_ids: toRpcSystemIds(params.systemIds ?? params.systemId),
    p_start_date: toRpcDate(params.dateFrom),
    p_end_date: toRpcDate(params.dateTo),
  } as Database["public"]["Functions"]["api_dashboard_systems"]["Args"] & {
    p_system_ids: number[] | null
    p_start_date: string | null
    p_end_date: string | null
  })
  if (error) return []
  const rows = ((data ?? []) as DashboardSystemRow[]).slice()
  const systemIds = Array.from(
    new Set(rows.map((row) => row.system_id).filter((id): id is number => typeof id === "number" && Number.isFinite(id))),
  )
  const asOfDates = rows.map((row) => row.as_of_date).filter((value): value is string => typeof value === "string" && value.length > 0)
  if (!rows.length || !systemIds.length || !asOfDates.length) return rows

  const minDate = asOfDates.reduce((current, value) => (value < current ? value : current))
  const maxDate = asOfDates.reduce((current, value) => (value > current ? value : current))

  const [batchOptions, activityRows, cycleRowsResponse] = await Promise.all([
    supabase.rpc("api_fingerling_batch_options_rpc", {
      p_farm_id: params.farmId,
      p_active_only: false,
    }),
    listDashboardBatchActivityRows(supabase, { systemIds, maxDate }),
    supabase
      .from("production_cycle")
      .select("system_id, batch_id, cycle_start, cycle_end")
      .in("system_id", systemIds)
      .lte("cycle_start", maxDate)
      .or(`cycle_end.is.null,cycle_end.gte.${minDate}`),
  ])

  const batchLabelById = new Map(
    ((batchOptions.data ?? []) as BatchOptionRow[]).map((row) => [row.id, row.label || `Batch ${row.id}`]),
  )
  const cycleRows = (cycleRowsResponse.data ?? []) as ProductionCycleBatchRow[]

  return attachBatchNamesToDashboardRows(rows, cycleRows, activityRows, batchLabelById)
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

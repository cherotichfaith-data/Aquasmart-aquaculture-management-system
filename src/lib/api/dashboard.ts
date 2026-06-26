import type { Database, Enums } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import { createClient } from "@/lib/supabase/client"
import { createAccessTokenClient } from "@/lib/supabase/access-token-client"
import { getClientOrError, isAbortLikeError, queryKpiRpc, toQueryError, toQuerySuccess } from "@/lib/api/_utils"
import { isSbAuthMissing, isSbPermissionDenied } from "@/lib/supabase/log"
import { toRpcDate, toRpcSystemIds } from "@/lib/rpc-params"
import type { DashboardSystemRow } from "@/features/dashboard/types"

type DashboardSystemRpcRow = Database["public"]["Functions"]["api_dashboard_systems"]["Returns"][number]
type DashboardReadClient = ReturnType<typeof createClient> | ReturnType<typeof createAccessTokenClient>
type ProductionCycleBatchRow = Pick<
  Database["public"]["Tables"]["production_cycle"]["Row"],
  "batch_id" | "cycle_end" | "cycle_start" | "system_id"
>
type BatchActivityRow = {
  batch_id: number
  date: string
  system_id: number
}

const isQuietError = (err: unknown): boolean =>
  isAbortLikeError(err) || isSbPermissionDenied(err) || isSbAuthMissing(err)

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
  supabase: DashboardReadClient,
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
    if (result.error && isQuietError(result.error)) return []
    if (result.error) throw result.error
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

async function listDashboardCycleRows(
  supabase: DashboardReadClient,
  params: {
    systemIds: number[]
    minDate: string
    maxDate: string
  },
): Promise<ProductionCycleBatchRow[]> {
  let query = supabase
    .from("production_cycle")
    .select("system_id, batch_id, cycle_start, cycle_end")
    .in("system_id", params.systemIds)
    .lte("cycle_start", params.maxDate)
    .or(`cycle_end.is.null,cycle_end.gte.${params.minDate}`)

  const { data, error } = await query
  if (error && isQuietError(error)) return []
  if (error) throw error
  return (data ?? []) as ProductionCycleBatchRow[]
}

export async function getDashboardSystems(params?: {
  farmId?: string | null
  stage?: Enums<"system_growth_stage"> | null
  systemId?: number | null
  systemIds?: number[] | null
  dateFrom?: string | null
  dateTo?: string | null
  signal?: AbortSignal
}): Promise<QueryResult<DashboardSystemRow>> {
  if (!params?.farmId) return toQuerySuccess<DashboardSystemRow>([])

  const clientResult = await getClientOrError("getDashboardSystems", { requireSession: true })
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = queryKpiRpc(
    supabase,
    "api_dashboard_systems",
    {
      p_farm_id: params.farmId,
      p_stage: params.stage ?? undefined,
      p_system_ids: toRpcSystemIds(params.systemIds ?? params.systemId),
      p_start_date: toRpcDate(params.dateFrom),
      p_end_date: toRpcDate(params.dateTo),
    },
  )
  if (params?.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (params?.signal?.aborted) return toQuerySuccess<DashboardSystemRow>([])
  if (error && isQuietError(error)) return toQuerySuccess<DashboardSystemRow>([])
  if (error) return toQueryError("getDashboardSystems", error)

  const rows = ((data ?? []) as DashboardSystemRpcRow[]).slice()
  const systemIds = Array.from(
    new Set(rows.map((row) => row.system_id).filter((id): id is number => typeof id === "number" && Number.isFinite(id))),
  )
  const asOfDates = rows.map((row) => row.as_of_date).filter((value): value is string => typeof value === "string" && value.length > 0)

  if (!rows.length || !systemIds.length || !asOfDates.length) {
    return toQuerySuccess<DashboardSystemRow>(rows)
  }

  const minDate = asOfDates.reduce((current, value) => (value < current ? value : current))
  const maxDate = asOfDates.reduce((current, value) => (value > current ? value : current))

  const [batchOptionsResult, cycleRows, activityRows] = await Promise.all([
    supabase.rpc("api_fingerling_batch_options_rpc", {
      p_farm_id: params.farmId,
      p_active_only: false,
    }),
    listDashboardCycleRows(supabase, { systemIds, minDate, maxDate }),
    listDashboardBatchActivityRows(supabase, { systemIds, maxDate }),
  ])

  const batchLabelById = new Map(
    ((batchOptionsResult.data ?? []) as Array<{ id: number; label: string | null }>).map((row) => [
      row.id,
      row.label || `Batch ${row.id}`,
    ]),
  )

  return toQuerySuccess<DashboardSystemRow>(attachBatchNamesToDashboardRows(rows, cycleRows, activityRows, batchLabelById))
}

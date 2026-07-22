"use client"

import type { Database } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import { createClient } from "@/lib/supabase/client"
import { createAccessTokenClient } from "@/lib/supabase/access-token-client"
import { getClientOrError, isAbortLikeError, queryKpiRpc, toQueryError, toQuerySuccess } from "@/lib/supabase/query-transport"
import { isSbAuthMissing, isSbPermissionDenied } from "@/lib/supabase/log"
import { toRpcDate, toRpcSystemIds } from "@/lib/rpc-params"
import { buildKpiOverviewFromRpc } from "./analytics-rpc-shared"
import type { DashboardPageInitialData, DashboardSystemRow } from "./types"

type DashboardConsolidatedRow = Database["public"]["Functions"]["api_dashboard_consolidated"]["Returns"][number]
type DashboardSystemRpcRow = Database["public"]["Functions"]["api_dashboard_systems"]["Returns"][number]
type DashboardReadClient = ReturnType<typeof createClient> | ReturnType<typeof createAccessTokenClient>
type BatchActivityRow = {
  batch_id: number
  date: string
  system_id: number
}

const isQuietError = (err: unknown): boolean =>
  isAbortLikeError(err) || isSbPermissionDenied(err) || isSbAuthMissing(err)

function attachBatchNamesToDashboardRows<T extends { system_id: number; as_of_date: string | null; batch_name?: string | null }>(
  rows: T[],
  activities: BatchActivityRow[],
  batchLabelById: Map<number, string>,
): T[] {
  if (!rows.length || !batchLabelById.size) return rows

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
    const batchId = (activitiesBySystemId.get(row.system_id) ?? [])
      .find((activity) => row.as_of_date && activity.date <= row.as_of_date)?.batch_id ?? null
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

export async function getDashboardKpiOverview(params?: {
  farmId?: string | null
  stage?: string | null
  systemIds?: number[] | null
  timePeriod?: string | null
  dateFrom?: string | null
  dateTo?: string | null
  signal?: AbortSignal
}): Promise<DashboardPageInitialData["kpiOverview"]> {
  if (!params?.farmId || !params.dateFrom || !params.dateTo) {
    return { metrics: [], dateBounds: { start: params?.dateFrom ?? null, end: params?.dateTo ?? null } }
  }

  const scopedSystemIds =
    params.systemIds?.filter((id): id is number => typeof id === "number" && Number.isFinite(id) && id > 0) ?? null
  if (scopedSystemIds && scopedSystemIds.length === 0) {
    return { metrics: [], dateBounds: { start: params.dateFrom, end: params.dateTo } }
  }

  const clientResult = await getClientOrError("getDashboardKpiOverview", { requireSession: true })
  if ("error" in clientResult) {
    return { metrics: [], dateBounds: { start: params.dateFrom, end: params.dateTo } }
  }
  const { supabase } = clientResult

  try {
    let query = queryKpiRpc(supabase, "api_dashboard_consolidated", {
      p_farm_id: params.farmId,
      p_system_ids: toRpcSystemIds(scopedSystemIds),
      p_stage: params.stage ?? undefined,
      p_start_date: toRpcDate(params.dateFrom),
      p_end_date: toRpcDate(params.dateTo),
      p_time_period: params.timePeriod ?? undefined,
    })
    if (params.signal) query = query.abortSignal(params.signal)

    const { data, error } = await query
    if (error) {
      return { metrics: [], dateBounds: { start: params.dateFrom, end: params.dateTo } }
    }

    return buildKpiOverviewFromRpc({
      scopedSystemIds:
        scopedSystemIds ??
        Array.from(
          new Set(
            ((data ?? []) as DashboardConsolidatedRow[])
              .map((row) => row.system_id)
              .filter((systemId): systemId is number => typeof systemId === "number" && Number.isFinite(systemId)),
          ),
        ),
      consolidatedRows: (data ?? []) as DashboardConsolidatedRow[],
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    })
  } catch (error) {
    if (params.signal?.aborted || isAbortLikeError(error)) {
      return { metrics: [], dateBounds: { start: params.dateFrom ?? null, end: params.dateTo ?? null } }
    }
    return { metrics: [], dateBounds: { start: params.dateFrom ?? null, end: params.dateTo ?? null } }
  }
}

export async function getDashboardSystems(params?: {
  farmId?: string | null
  stage?: Database["public"]["Enums"]["system_growth_stage"] | null
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

  const maxDate = asOfDates.reduce((current, value) => (value > current ? value : current))

  const [batchOptionsResult, activityRows] = await Promise.all([
    supabase.rpc("api_fingerling_batch_options_rpc", {
      p_farm_id: params.farmId,
      p_active_only: false,
    }),
    listDashboardBatchActivityRows(supabase, { systemIds, maxDate }),
  ])

  const batchLabelById = new Map(
    ((batchOptionsResult.data ?? []) as Array<{ id: number; label: string | null }>).map((row) => [
      row.id,
      row.label || `Batch ${row.id}`,
    ]),
  )

  return toQuerySuccess<DashboardSystemRow>(attachBatchNamesToDashboardRows(rows, activityRows, batchLabelById))
}

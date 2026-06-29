"use client"

import type { Enums, Tables } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import {
  getClientOrError,
  isAbortLikeError,
  queryKpiRpc,
  queryOptionsRpc,
  toQueryError,
  toQuerySuccess,
} from "@/lib/api/_utils"
import { isSbAuthMissing, isSbPermissionDenied } from "@/lib/supabase/log"
import { toRpcDate, toRpcSystemIds } from "@/lib/rpc-params"
import { getProductionSummary } from "@/features/production/queries.client"
import type { ProductionSummaryRpcRow } from "@/features/production/types"
import type {
  ChangeLogRow,
  FeedingBreakdownRow,
  FeedingRecordWithType,
  FeedGrowthTrendRow,
  FeedRunningStockRow,
  FeedingSummaryRow,
  PerformanceSummaryRow,
  PerformanceRecordRow,
} from "./types"

type FeedTypeRow = FeedingRecordWithType["feed_type"] extends infer T ? T : never
type FeedInventoryRow = Tables<"feed_inventory">
type FeedingRecordRow = Tables<"feeding_record">
type FishHarvestRow = Tables<"fish_harvest">
type FishSamplingWeightRow = Tables<"fish_sampling_weight">
type FishMortalityRow = Tables<"fish_mortality">
type SystemRow = Tables<"system">
type WaterQualityMeasurementRow = Tables<"water_quality_measurement">
type FishTransferRow = Tables<"fish_transfer">
type FishStockingRow = Tables<"fish_stocking">
type RecentRowsTable =
  | "fish_mortality"
  | "feeding_record"
  | "fish_sampling_weight"
  | "fish_transfer"
  | "fish_harvest"
  | "water_quality_measurement"
  | "feed_inventory"
  | "fish_stocking"
  | "system"
type FeedTypeProjection = {
  feed_type_id: number | null
  feed_label: string | null
  feed_line: string | null
  crude_protein_percentage: number | null
  crude_fat_percentage: number | null
  feed_category: string | null
  feed_pellet_size: string | null
}
type FeedingRecordJoinedRow = {
  id: number | null
  created_at: string | null
  date: string | null
  batch_id: number | null
  feed_type_id: number | null
  feeding_amount: number | null
  feeding_response: FeedingRecordRow["feeding_response"] | null
  system_id: number | null
  feed_type: {
    id: number | null
    feed_line: string | null
    crude_protein_percentage: number | null
    crude_fat_percentage: number | null
    feed_category: string | null
    feed_pellet_size: string | null
  } | null
}

type FeedingActivityRow = Pick<
  FeedingRecordRow,
  "id" | "created_at" | "date" | "batch_id" | "feeding_amount" | "feeding_response" | "system_id"
>

export type {
  ChangeLogRow,
  FeedingBreakdownRow,
  FeedingRecordWithType,
  FeedGrowthTrendRow,
  FeedRunningStockRow,
  FeedingSummaryRow,
  PerformanceRecordRow,
  PerformanceSummaryRow,
} from "./types"

const isQuietError = (err: unknown): boolean =>
  isAbortLikeError(err) || isSbPermissionDenied(err) || isSbAuthMissing(err)

const empty = <T,>(): QueryResult<T> => toQuerySuccess<T>([])

const normalizeSystemIds = (params?: { systemId?: number; systemIds?: number[] }) =>
  Array.from(
    new Set(
      [
        ...(params?.systemIds ?? []),
        ...(typeof params?.systemId === "number" ? [params.systemId] : []),
      ].filter((id): id is number => typeof id === "number" && Number.isFinite(id) && id > 0),
    ),
  )

const isFiniteNumber = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value)

const projectFeedType = (row: FeedTypeProjection | null | undefined): FeedTypeRow | null => {
  if (!row || typeof row.feed_type_id !== "number") return null

  return {
    id: row.feed_type_id,
    label: row.feed_label as FeedTypeRow extends infer T ? T extends { label: infer Label } ? Label : never : never,
    feed_line: row.feed_line as FeedTypeRow extends infer T ? T extends { feed_line: infer Line } ? Line : never : never,
    crude_protein_percentage: row.crude_protein_percentage ?? 0,
    crude_fat_percentage: row.crude_fat_percentage ?? 0,
    feed_category: String(row.feed_category ?? ""),
    feed_pellet_size: String(row.feed_pellet_size ?? ""),
    farm_id: "",
    visibility_scope: "joined_record",
  } as FeedTypeRow
}

async function getReportsClient(tag: string) {
  return getClientOrError(tag, { requireSession: true })
}

async function getFarmSystemIds(
  supabase: Exclude<Awaited<ReturnType<typeof getReportsClient>>, { error: QueryResult<never> }>["supabase"],
  farmId: string,
  signal?: AbortSignal,
) {
  let query = supabase.from("system").select("id").eq("farm_id", farmId)
  if (signal) query = query.abortSignal(signal)

  const { data, error } = await query
  if (error) {
    if (signal?.aborted || isQuietError(error)) return []
    throw error
  }

  return Array.from(
    new Set((data ?? []).map((row) => row.id).filter((id): id is number => typeof id === "number" && Number.isFinite(id))),
  )
}

async function resolveScopedSystemIds(
  supabase: Exclude<Awaited<ReturnType<typeof getReportsClient>>, { error: QueryResult<never> }>["supabase"],
  params: {
    farmId?: string | null
    systemId?: number
    systemIds?: number[]
    signal?: AbortSignal
  },
): Promise<number[] | null> {
  const requestedIds = normalizeSystemIds(params)
  if (!params.farmId) return requestedIds.length > 0 ? requestedIds : null

  const farmSystemIds = await getFarmSystemIds(supabase, params.farmId, params.signal)
  if (farmSystemIds.length === 0) return []
  if (requestedIds.length === 0) return farmSystemIds

  const farmSystemIdSet = new Set(farmSystemIds)
  return requestedIds.filter((id) => farmSystemIdSet.has(id))
}

async function listProductionSummaryRows(params?: {
  farmId?: string | null
  systemId?: number
  stage?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<ProductionSummaryRpcRow>> {
  return getProductionSummary({
    farmId: params?.farmId,
    systemId: params?.systemId,
    stage: params?.stage as Enums<"system_growth_stage"> | undefined,
    dateFrom: params?.dateFrom,
    dateTo: params?.dateTo,
    limit: params?.limit,
    signal: params?.signal,
  })
}

export async function getFeedingRecords(params?: {
  farmId?: string | null
  systemId?: number
  systemIds?: number[]
  batchId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<FeedingRecordWithType>> {
  if (!params?.farmId) return empty<FeedingRecordWithType>()

  const clientResult = await getReportsClient("getFeedingRecords")
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  try {
    const scopedSystemIds = await resolveScopedSystemIds(supabase, params)
    if (!scopedSystemIds || scopedSystemIds.length === 0) return empty<FeedingRecordWithType>()

    let query = supabase.from("feeding_record").select(`
        id,
        created_at,
        date,
        batch_id,
        feed_type_id,
        feeding_amount,
        feeding_response,
        system_id,
        feed_type:feed_type (
          id,
          feed_line,
          crude_protein_percentage,
          crude_fat_percentage,
          feed_category,
          feed_pellet_size
        )
      `)

    query = query.in("system_id", scopedSystemIds)
    if (params.batchId) query = query.eq("batch_id", params.batchId)
    if (params.dateFrom) query = query.gte("date", params.dateFrom)
    if (params.dateTo) query = query.lte("date", params.dateTo)
    if (params.limit) query = query.limit(params.limit)
    if (params.signal) query = query.abortSignal(params.signal)

    const { data, error } = await query.order("date", { ascending: false })
    if (error) {
      if (params.signal?.aborted || isQuietError(error)) return empty<FeedingRecordWithType>()
      return toQueryError("getFeedingRecords", error)
    }

    return toQuerySuccess<FeedingRecordWithType>(
      ((data ?? []) as FeedingRecordJoinedRow[]).map((row) => ({
        id: row.id,
        created_at: row.created_at,
        date: row.date,
        batch_id: row.batch_id,
        feed_type_id: row.feed_type_id,
        feeding_amount: row.feeding_amount,
        feeding_response: row.feeding_response,
        system_id: row.system_id,
        feed_type: projectFeedType(
          row.feed_type
            ? {
                feed_type_id: row.feed_type.id,
                feed_label: row.feed_type.feed_line,
                feed_line: row.feed_type.feed_line,
                crude_protein_percentage: row.feed_type.crude_protein_percentage,
                crude_fat_percentage: row.feed_type.crude_fat_percentage,
                feed_category: row.feed_type.feed_category,
                feed_pellet_size: row.feed_type.feed_pellet_size,
              }
            : null,
        ),
      })) as FeedingRecordWithType[],
    )
  } catch (error) {
    if (params.signal?.aborted || isQuietError(error)) return empty<FeedingRecordWithType>()
    return toQueryError("getFeedingRecords", error)
  }
}

export async function getFeedingActivityRecords(params?: {
  farmId?: string | null
  systemId?: number
  systemIds?: number[]
  batchId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<FeedingActivityRow>> {
  if (!params?.farmId) return empty<FeedingActivityRow>()

  const clientResult = await getReportsClient("getFeedingActivityRecords")
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  try {
    const scopedSystemIds = await resolveScopedSystemIds(supabase, params)
    if (!scopedSystemIds || scopedSystemIds.length === 0) return empty<FeedingActivityRow>()

    let query = supabase
      .from("feeding_record")
      .select("id, created_at, date, batch_id, feeding_amount, feeding_response, system_id")

    query = query.in("system_id", scopedSystemIds)
    if (params.batchId) query = query.eq("batch_id", params.batchId)
    if (params.dateFrom) query = query.gte("date", params.dateFrom)
    if (params.dateTo) query = query.lte("date", params.dateTo)
    if (params.limit) query = query.limit(params.limit)
    if (params.signal) query = query.abortSignal(params.signal)

    const { data, error } = await query.order("date", { ascending: false })
    if (error) {
      if (params.signal?.aborted || isQuietError(error)) return empty<FeedingActivityRow>()
      return toQueryError("getFeedingActivityRecords", error)
    }

    return toQuerySuccess<FeedingActivityRow>((data ?? []) as FeedingActivityRow[])
  } catch (error) {
    if (params.signal?.aborted || isQuietError(error)) return empty<FeedingActivityRow>()
    return toQueryError("getFeedingActivityRecords", error)
  }
}

export async function getFeedingSummary(params?: {
  farmId?: string | null
  systemId?: number
  batchId?: number
  dateFrom?: string
  dateTo?: string
  signal?: AbortSignal
}): Promise<QueryResult<FeedingSummaryRow>> {
  if (!params?.farmId || !params.dateFrom || !params.dateTo) return empty<FeedingSummaryRow>()

  const [recordsResult, productionRowsResult] = await Promise.all([
    getFeedingRecords(params),
    listProductionSummaryRows({
      farmId: params.farmId,
      systemId: params.systemId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      signal: params.signal,
    }),
  ])

  if (recordsResult.status === "error") return recordsResult
  if (productionRowsResult.status === "error") return productionRowsResult

  const totalKgFed = recordsResult.data.reduce((sum, row) => sum + (row.feeding_amount ?? 0), 0)
  const relevantFeedRows = recordsResult.data.filter((row) => (row.feeding_amount ?? 0) > 0)
  const averageProteinPct = relevantFeedRows.some((row) => !isFiniteNumber(row.feed_type?.crude_protein_percentage))
    ? null
    : (() => {
        const weighted = relevantFeedRows.reduce(
          (acc, row) => {
            const amount = row.feeding_amount ?? 0
            acc.proteinMass += (row.feed_type?.crude_protein_percentage ?? 0) * amount
            acc.amount += amount
            return acc
          },
          { proteinMass: 0, amount: 0 },
        )
        return weighted.amount > 0 ? weighted.proteinMass / weighted.amount : null
      })()

  const efcrWeighted = productionRowsResult.data.reduce(
    (acc, row) => {
      if (!isFiniteNumber(row.efcr_period)) return acc
      const weight = row.total_feed_amount_period ?? 0
      if (weight <= 0) return acc
      acc.value += row.efcr_period * weight
      acc.weight += weight
      return acc
    },
    { value: 0, weight: 0 },
  )

  const biomassGainKg = productionRowsResult.data.reduce((sum, row) => sum + Math.max(0, row.biomass_increase_period ?? 0), 0)

  return toQuerySuccess<FeedingSummaryRow>([
    {
      total_kg_fed: totalKgFed,
      average_protein_pct: averageProteinPct,
      average_efcr: efcrWeighted.weight > 0 ? efcrWeighted.value / efcrWeighted.weight : null,
      biomass_gain_kg: biomassGainKg,
    },
  ])
}

export async function getFeedingBreakdown(params?: {
  farmId?: string | null
  systemId?: number
  batchId?: number
  dateFrom?: string
  dateTo?: string
  signal?: AbortSignal
}): Promise<QueryResult<FeedingBreakdownRow>> {
  if (!params?.farmId || !params.dateFrom || !params.dateTo) return empty<FeedingBreakdownRow>()

  const recordsResult = await getFeedingRecords(params)
  if (recordsResult.status === "error") return recordsResult

  const bySystem = new Map<
    number,
    { totalKg: number; entries: number; proteinMass: number; proteinWeight: number; lastDate: string | null }
  >()

  recordsResult.data.forEach((row) => {
    if (row.system_id == null) return
    const bucket = bySystem.get(row.system_id) ?? {
      totalKg: 0,
      entries: 0,
      proteinMass: 0,
      proteinWeight: 0,
      lastDate: null,
    }
    const amount = row.feeding_amount ?? 0
    bucket.totalKg += amount
    bucket.entries += 1
    if (isFiniteNumber(row.feed_type?.crude_protein_percentage)) {
      bucket.proteinMass += row.feed_type.crude_protein_percentage * amount
      bucket.proteinWeight += amount
    }
    if (!bucket.lastDate || String(row.date ?? "") > bucket.lastDate) {
      bucket.lastDate = row.date ?? null
    }
    bySystem.set(row.system_id, bucket)
  })

  return toQuerySuccess<FeedingBreakdownRow>(
    Array.from(bySystem.entries())
      .map(([systemId, bucket]) => ({
        system_id: systemId,
        system_label: `Cage ${systemId}`,
        total_kg: bucket.totalKg,
        entries: bucket.entries,
        avg_protein: bucket.proteinWeight > 0 ? bucket.proteinMass / bucket.proteinWeight : null,
        last_date: bucket.lastDate,
      }))
      .sort((left, right) => right.total_kg - left.total_kg),
  )
}

export async function getRunningStock(params: {
  farmId?: string | null
  signal?: AbortSignal
}): Promise<QueryResult<FeedRunningStockRow>> {
  if (!params.farmId) return empty<FeedRunningStockRow>()

  const clientResult = await getReportsClient("getRunningStock")
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = queryKpiRpc(supabase, "api_running_stock", {
    p_farm_id: params.farmId,
  })
  if (params.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (params.signal?.aborted || isQuietError(error)) return empty<FeedRunningStockRow>()
    return toQueryError("getRunningStock", error)
  }

  return toQuerySuccess<FeedRunningStockRow>((data ?? []) as FeedRunningStockRow[])
}

export async function getGrowthTrend(params: {
  farmId?: string | null
  systemId?: number
  systemIds?: number[]
  days?: number
  dateFrom?: string
  dateTo?: string
  signal?: AbortSignal
}): Promise<QueryResult<FeedGrowthTrendRow>> {
  if (!params.farmId) return empty<FeedGrowthTrendRow>()

  const clientResult = await getReportsClient("getGrowthTrend")
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  try {
    const systemIds = await resolveScopedSystemIds(supabase, params)
    if (!systemIds || systemIds.length === 0) return empty<FeedGrowthTrendRow>()

    let query = queryKpiRpc(supabase, "api_growth_trend", {
      p_farm_id: params.farmId,
      p_system_ids: toRpcSystemIds(systemIds),
      p_start_date: toRpcDate(params.dateFrom),
      p_end_date: toRpcDate(params.dateTo),
      p_days: params.dateFrom || params.dateTo ? undefined : params.days,
    })
    if (params.signal) query = query.abortSignal(params.signal)

    const { data, error } = await query
    if (error) {
      if (params.signal?.aborted || isQuietError(error)) return empty<FeedGrowthTrendRow>()
      return toQueryError("getGrowthTrend", error)
    }

    const rows = ((data ?? []) as FeedGrowthTrendRow[]).map((row) => ({
      ...row,
      system_id:
        typeof row.system_id === "number" ? row.system_id : systemIds.length === 1 ? systemIds[0] : row.system_id,
    }))
    return toQuerySuccess<FeedGrowthTrendRow>(rows)
  } catch (error) {
    if (params.signal?.aborted || isQuietError(error)) return empty<FeedGrowthTrendRow>()
    return toQueryError("getGrowthTrend", error)
  }
}

export async function getPerformanceSummary(params?: {
  farmId?: string | null
  systemId?: number
  stage?: string
  dateFrom?: string
  dateTo?: string
  signal?: AbortSignal
}): Promise<QueryResult<PerformanceSummaryRow>> {
  if (!params?.farmId || !params.dateFrom || !params.dateTo) return empty<PerformanceSummaryRow>()

  const rowsResult = await listProductionSummaryRows(params)
  if (rowsResult.status === "error") return rowsResult

  const byCycle = new Map<string, ProductionSummaryRpcRow>()
  rowsResult.data.forEach((row) => {
    const cycleKey = `${row.cycle_id ?? "no-cycle"}-${row.system_id ?? "no-system"}`
    const current = byCycle.get(cycleKey)
    if (!current || String(row.date ?? "") > String(current.date ?? "")) {
      byCycle.set(cycleKey, row)
    }
  })

  const latestCycleRows = Array.from(byCycle.values())
  if (!latestCycleRows.length) return empty<PerformanceSummaryRow>()

  const totals = latestCycleRows.reduce(
    (acc, row) => {
      acc.totalBiomass += row.total_biomass ?? 0
      acc.totalFish += row.number_of_fish_inventory ?? 0
      acc.totalMortality += row.mortality_count_period ?? 0
      acc.totalHarvestKg += row.total_weight_harvested_aggregated ?? 0
      acc.totalHarvestFish += row.number_of_fish_harvested_aggregated ?? 0
      const survivalWeight = row.fish_count_period_start ?? 0
      if (survivalWeight > 0 && isFiniteNumber(row.survival_rate_pct)) {
        acc.survivalWeightedValue += row.survival_rate_pct * survivalWeight
        acc.survivalWeight += survivalWeight
      }
      if (acc.efcrAggregated == null && isFiniteNumber(row.efcr_aggregated)) {
        acc.efcrAggregated = row.efcr_aggregated
      }
      return acc
    },
    {
      totalBiomass: 0,
      totalFish: 0,
      totalMortality: 0,
      totalHarvestKg: 0,
      totalHarvestFish: 0,
      efcrAggregated: null as number | null,
      survivalWeightedValue: 0,
      survivalWeight: 0,
    },
  )

  return toQuerySuccess<PerformanceSummaryRow>([
    {
      efcr_aggregated_consolidated: totals.efcrAggregated,
      average_biomass: totals.totalBiomass,
      mortality_rate: totals.totalFish > 0 ? totals.totalMortality / totals.totalFish : null,
      survival_rate_pct:
        totals.survivalWeight > 0 ? totals.survivalWeightedValue / totals.survivalWeight : null,
      total_harvest_kg: totals.totalHarvestKg,
      total_harvest_fish: totals.totalHarvestFish,
    },
  ])
}

export async function getPerformanceRecords(params?: {
  farmId?: string | null
  systemId?: number
  stage?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<PerformanceRecordRow>> {
  if (!params?.farmId || !params.dateFrom || !params.dateTo) return empty<PerformanceRecordRow>()

  const rowsResult = await listProductionSummaryRows(params)
  if (rowsResult.status === "error") return rowsResult

  return toQuerySuccess<PerformanceRecordRow>(
    rowsResult.data.map((row) => ({
      date: row.date ?? null,
      system_id: row.system_id ?? null,
      system_name: row.system_name ?? null,
      cycle_id: row.cycle_id ?? null,
      efcr_aggregated: row.efcr_aggregated ?? null,
      survival_rate_pct: row.survival_rate_pct ?? null,
      total_weight_harvested_aggregated: row.total_weight_harvested_aggregated ?? null,
      number_of_fish_harvested: row.number_of_fish_harvested ?? null,
      mortality_count_period: row.mortality_count_period ?? null,
    })),
  )
}

async function getScopedTableRows<T extends FishHarvestRow | FishStockingRow | FishSamplingWeightRow>(
  tag: string,
  table: "fish_harvest" | "fish_stocking" | "fish_sampling_weight",
  params?: {
    farmId?: string | null
    systemId?: number
    systemIds?: number[]
    batchId?: number
    dateFrom?: string
    dateTo?: string
    limit?: number
    signal?: AbortSignal
  },
): Promise<QueryResult<T>> {
  if (!params?.farmId) return empty<T>()

  const clientResult = await getReportsClient(tag)
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  try {
    const scopedSystemIds = await resolveScopedSystemIds(supabase, params)
    if (!scopedSystemIds || scopedSystemIds.length === 0) return empty<T>()

    let query = supabase.from(table).select("*").in("system_id", scopedSystemIds)
    if (params.batchId) query = query.eq("batch_id", params.batchId)
    if (params.dateFrom) query = query.gte("date", params.dateFrom)
    if (params.dateTo) query = query.lte("date", params.dateTo)
    if (params.limit) query = query.limit(params.limit)
    if (params.signal) query = query.abortSignal(params.signal)

    const { data, error } = await query.order("date", { ascending: false })
    if (error) {
      if (params.signal?.aborted || isQuietError(error)) return empty<T>()
      return toQueryError(tag, error)
    }

    return toQuerySuccess<T>((data ?? []) as T[])
  } catch (error) {
    if (params?.signal?.aborted || isQuietError(error)) return empty<T>()
    return toQueryError(tag, error)
  }
}

export async function getHarvests(params?: {
  farmId?: string | null
  systemId?: number
  systemIds?: number[]
  batchId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<FishHarvestRow>> {
  return getScopedTableRows<FishHarvestRow>("getHarvests", "fish_harvest", params)
}

export async function getStockings(params?: {
  farmId?: string | null
  systemId?: number
  systemIds?: number[]
  batchId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<FishStockingRow>> {
  return getScopedTableRows<FishStockingRow>("getStockings", "fish_stocking", params)
}

export async function getSamplingData(params?: {
  farmId?: string | null
  systemId?: number
  systemIds?: number[]
  batchId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<FishSamplingWeightRow>> {
  return getScopedTableRows<FishSamplingWeightRow>("getSamplingData", "fish_sampling_weight", params)
}

export async function getMortalityData(params?: {
  farmId?: string | null
  systemId?: number
  systemIds?: number[]
  batchId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<FishMortalityRow>> {
  if (!params?.farmId) return empty<FishMortalityRow>()

  const clientResult = await getReportsClient("getMortalityData")
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  try {
    const scopedSystemIds = await resolveScopedSystemIds(supabase, params)
    if (!scopedSystemIds || scopedSystemIds.length === 0) return empty<FishMortalityRow>()

    let query = supabase.from("fish_mortality").select("*").eq("farm_id", params.farmId).in("system_id", scopedSystemIds)
    if (params.batchId) query = query.eq("batch_id", params.batchId)
    if (params.dateFrom) query = query.gte("date", params.dateFrom)
    if (params.dateTo) query = query.lte("date", params.dateTo)
    if (params.limit) query = query.limit(params.limit)
    if (params.signal) query = query.abortSignal(params.signal)

    const { data, error } = await query.order("date", { ascending: false })
    if (error) {
      if (params.signal?.aborted || isQuietError(error)) return empty<FishMortalityRow>()
      return toQueryError("getMortalityData", error)
    }

    return toQuerySuccess<FishMortalityRow>((data ?? []) as FishMortalityRow[])
  } catch (error) {
    if (params.signal?.aborted || isQuietError(error)) return empty<FishMortalityRow>()
    return toQueryError("getMortalityData", error)
  }
}

export async function getTransferData(params?: {
  farmId?: string | null
  batchId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<FishTransferRow>> {
  if (!params?.farmId) return empty<FishTransferRow>()

  const clientResult = await getReportsClient("getTransferData")
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  try {
    const scopedSystemIds = await resolveScopedSystemIds(supabase, { farmId: params.farmId, signal: params.signal })
    if (!scopedSystemIds || scopedSystemIds.length === 0) return empty<FishTransferRow>()

    let query = supabase
      .from("fish_transfer")
      .select("*")
      .or(`origin_system_id.in.(${scopedSystemIds.join(",")}),target_system_id.in.(${scopedSystemIds.join(",")})`)
    if (params.batchId) query = query.eq("batch_id", params.batchId)
    if (params.dateFrom) query = query.gte("date", params.dateFrom)
    if (params.dateTo) query = query.lte("date", params.dateTo)
    if (params.limit) query = query.limit(params.limit)
    if (params.signal) query = query.abortSignal(params.signal)

    const { data, error } = await query.order("date", { ascending: false })
    if (error) {
      if (params.signal?.aborted || isQuietError(error)) return empty<FishTransferRow>()
      return toQueryError("getTransferData", error)
    }

    return toQuerySuccess<FishTransferRow>((data ?? []) as FishTransferRow[])
  } catch (error) {
    if (params.signal?.aborted || isQuietError(error)) return empty<FishTransferRow>()
    return toQueryError("getTransferData", error)
  }
}

export async function getRecentActivities(params?: {
  farmId?: string | null
  tableName?: string
  changeType?: Enums<"change_type_enum">
  dateFrom?: string
  dateTo?: string
  limit?: number
  signal?: AbortSignal
}): Promise<QueryResult<ChangeLogRow>> {
  if (!params?.farmId) return empty<ChangeLogRow>()

  const clientResult = await getReportsClient("getRecentActivities")
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = supabase.rpc("api_recent_activity_feed", {
    p_farm_id: params.farmId,
    p_limit: params.limit ?? 50,
    p_date_from: toRpcDate(params.dateFrom),
    p_date_to: toRpcDate(params.dateTo),
    p_table: params.tableName && params.tableName !== "all" ? params.tableName : undefined,
  } as never)
  if (params.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (params.signal?.aborted || isQuietError(error)) return empty<ChangeLogRow>()
    return toQuerySuccess<ChangeLogRow>([])
  }

  return toQuerySuccess<ChangeLogRow>(
    ((data ?? []) as Array<{ id: string | number; table_name: string | null; activity_date: string | null; system_id?: number | null; batch_id?: number | null }>).map(
      (row) => ({
        id: row.id,
        table_name: row.table_name,
        change_type: "INSERT",
        column_name: null,
        change_time: row.activity_date,
        system_id: row.system_id,
        batch_id: row.batch_id,
      }),
    ),
  )
}

const emptyRecentEntries = () => ({
  mortality: toQuerySuccess<FishMortalityRow>([]),
  feeding: toQuerySuccess<FeedingRecordRow>([]),
  sampling: toQuerySuccess<FishSamplingWeightRow>([]),
  transfer: toQuerySuccess<FishTransferRow>([]),
  harvest: toQuerySuccess<FishHarvestRow>([]),
  water_quality: toQuerySuccess<WaterQualityMeasurementRow>([]),
  feed_inventory: toQuerySuccess<FeedInventoryRow>([]),
  stocking: toQuerySuccess<FishStockingRow>([]),
  systems: toQuerySuccess<SystemRow>([]),
})

async function getRecentRows<T>(
  supabase: Exclude<Awaited<ReturnType<typeof getReportsClient>>, { error: QueryResult<never> }>["supabase"],
  table: RecentRowsTable,
  orderColumn: string,
  params: {
    farmId: string
    farmSystemIds: number[]
    signal?: AbortSignal
    limit?: number
  },
): Promise<T[]> {
  const limit = params.limit ?? 5
  let query: any = supabase.from(table).select("*")

  switch (table) {
    case "fish_mortality":
    case "feed_inventory":
    case "system":
      query = query.eq("farm_id", params.farmId)
      break
    case "fish_transfer":
      if (params.farmSystemIds.length === 0) return []
      query = query.or(
        `origin_system_id.in.(${params.farmSystemIds.join(",")}),target_system_id.in.(${params.farmSystemIds.join(",")})`,
      )
      break
    default:
      if (params.farmSystemIds.length === 0) return []
      query = query.in("system_id", params.farmSystemIds)
      break
  }

  if (params.signal) query = query.abortSignal(params.signal)
  const { data, error } = await query.order(orderColumn, { ascending: false }).limit(limit)
  if (error) {
    if (params.signal?.aborted || isQuietError(error)) return []
    throw error
  }

  return (data ?? []) as T[]
}

export async function getRecentEntries(farmId?: string | null, signal?: AbortSignal) {
  if (!farmId) return emptyRecentEntries()

  const clientResult = await getReportsClient("getRecentEntries")
  if ("error" in clientResult) return emptyRecentEntries()
  const { supabase } = clientResult

  try {
    const farmSystemIds = await getFarmSystemIds(supabase, farmId, signal)
    const [
      mortality,
      feeding,
      sampling,
      transfer,
      harvest,
      waterQuality,
      feedInventory,
      stocking,
      systems,
    ] = await Promise.all([
      getRecentRows<FishMortalityRow>(supabase, "fish_mortality", "date", { farmId, farmSystemIds, signal }),
      getRecentRows<FeedingRecordRow>(supabase, "feeding_record", "date", { farmId, farmSystemIds, signal }),
      getRecentRows<FishSamplingWeightRow>(supabase, "fish_sampling_weight", "date", { farmId, farmSystemIds, signal }),
      getRecentRows<FishTransferRow>(supabase, "fish_transfer", "date", { farmId, farmSystemIds, signal }),
      getRecentRows<FishHarvestRow>(supabase, "fish_harvest", "date", { farmId, farmSystemIds, signal }),
      getRecentRows<WaterQualityMeasurementRow>(supabase, "water_quality_measurement", "date", {
        farmId,
        farmSystemIds,
        signal,
      }),
      getRecentRows<FeedInventoryRow>(supabase, "feed_inventory", "inventory_date", { farmId, farmSystemIds, signal }),
      getRecentRows<FishStockingRow>(supabase, "fish_stocking", "date", { farmId, farmSystemIds, signal }),
      getRecentRows<SystemRow>(supabase, "system", "created_at", { farmId, farmSystemIds, signal }),
    ])

    return {
      mortality: toQuerySuccess(mortality),
      feeding: toQuerySuccess(feeding),
      sampling: toQuerySuccess(sampling),
      transfer: toQuerySuccess(transfer),
      harvest: toQuerySuccess(harvest),
      water_quality: toQuerySuccess(waterQuality),
      feed_inventory: toQuerySuccess(feedInventory),
      stocking: toQuerySuccess(stocking),
      systems: toQuerySuccess(systems),
    }
  } catch {
    return emptyRecentEntries()
  }
}

export async function getBatchSystemIds(params: {
  batchId: number
  signal?: AbortSignal
}): Promise<QueryResult<{ system_id: number }>> {
  const clientResult = await getReportsClient("getBatchSystemIds")
  if ("error" in clientResult) return clientResult.error
  const { supabase } = clientResult

  let query = queryOptionsRpc(supabase, "api_batch_system_ids", { p_batch_id: params.batchId })
  if (params.signal) query = query.abortSignal(params.signal)

  const { data, error } = await query
  if (error) {
    if (params.signal?.aborted || isQuietError(error)) return empty<{ system_id: number }>()
    return toQueryError("getBatchSystemIds", error)
  }

  return toQuerySuccess<{ system_id: number }>(
    ((data ?? []) as Array<{ system_id: number | null }>).flatMap((row) =>
      typeof row.system_id === "number" && Number.isFinite(row.system_id) ? [{ system_id: row.system_id }] : [],
    ),
  )
}

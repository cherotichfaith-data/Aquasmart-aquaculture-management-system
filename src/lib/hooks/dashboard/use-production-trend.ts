"use client"

import { useQuery } from "@tanstack/react-query"
import type { Enums } from "@/lib/types/database"
import { useAuth } from "@/components/providers/auth-provider"
import { queryKeys } from "@/lib/cache/query-keys"
import type { ProductionTrendRow } from "@/features/dashboard/types"
import { getProductionSummary } from "@/lib/api/production"
import { getDailyFishInventory } from "@/lib/api/inventory"
import { getFeedingRecords, getMortalityData, getSamplingData } from "@/lib/api/reports"
import { sortByDateAsc } from "@/lib/utils"
import type { TimePeriod } from "@/lib/time-period"
import { formatCageLabel } from "@/lib/system-options"

type InventoryTrendRow = Awaited<ReturnType<typeof getDailyFishInventory>> extends infer Result
  ? Result extends { status: "success"; data: Array<infer Row> }
    ? Row
    : never
  : never

function toTrendRowFromInventory(row: InventoryTrendRow): ProductionTrendRow {
  return toTrendRow({
    date: row.inventory_date,
    systemId: row.system_id,
    systemName: row.system_name,
    averageBodyWeight: row.abw_last_sampling,
    fishCount: row.number_of_fish,
    feedAmount: row.feeding_amount,
    biomass: row.biomass_last_sampling,
    cumulativeFeed: null,
    dailyMortality: row.number_of_fish_mortality,
    cumulativeMortality: null,
    transferOut: null,
    transferIn: null,
    harvested: null,
    stocked: null,
    activity: "daily_inventory",
  })
}

function toTrendRow(params: {
  date: string
  systemId: number
  systemName?: string | null
  averageBodyWeight?: number | null
  fishCount?: number | null
  feedAmount?: number | null
  biomass?: number | null
  cumulativeFeed?: number | null
  dailyMortality?: number | null
  cumulativeMortality?: number | null
  transferOut?: number | null
  transferIn?: number | null
  harvested?: number | null
  stocked?: number | null
  activity?: string
}): ProductionTrendRow {
  return {
    cycle_id: 0,
    date: params.date,
    system_id: params.systemId,
    system_name: formatCageLabel({ id: params.systemId, label: params.systemName ?? null, unit: null }),
    growth_stage: null,
    ongoing_cycle: true,
    average_body_weight: params.averageBodyWeight ?? 0,
    number_of_fish_inventory: params.fishCount ?? 0,
    total_feed_amount_period: params.feedAmount ?? 0,
    activity: params.activity ?? "operational_event",
    activity_rank: 0,
    total_biomass: params.biomass ?? 0,
    biomass_increase_period: 0,
    total_feed_amount_aggregated: params.cumulativeFeed ?? 0,
    biomass_increase_aggregated: 0,
    daily_mortality_count: params.dailyMortality ?? 0,
    cumulative_mortality: params.cumulativeMortality ?? 0,
    number_of_fish_transfer_out: params.transferOut ?? 0,
    total_weight_transfer_out: 0,
    total_weight_transfer_out_aggregated: 0,
    number_of_fish_transfer_in: params.transferIn ?? 0,
    total_weight_transfer_in: 0,
    total_weight_transfer_in_aggregated: 0,
    number_of_fish_harvested: params.harvested ?? 0,
    total_weight_harvested: 0,
    total_weight_harvested_aggregated: 0,
    number_of_fish_stocked: params.stocked ?? 0,
    total_weight_stocked: 0,
    total_weight_stocked_aggregated: 0,
    efcr_period: 0,
    efcr_aggregated: 0,
    feeding_rate: null,
  } as unknown as ProductionTrendRow
}

async function getOperationalTrendFallback(params: {
  farmId?: string | null
  systemId?: number
  systemIds?: number[] | null
  dateFrom?: string | null
  dateTo?: string | null
  signal?: AbortSignal
}) {
  if (!params.farmId) return [] as ProductionTrendRow[]
  const systemIds = Array.isArray(params.systemIds) && params.systemIds.length > 0 ? params.systemIds : undefined
  const [feedingResult, samplingResult, mortalityResult] = await Promise.all([
    getFeedingRecords({
      farmId: params.farmId,
      systemId: params.systemId,
      systemIds,
      dateFrom: params.dateFrom ?? undefined,
      dateTo: params.dateTo ?? undefined,
      limit: 5000,
      signal: params.signal,
    }),
    getSamplingData({
      farmId: params.farmId,
      systemId: params.systemId,
      systemIds,
      dateFrom: params.dateFrom ?? undefined,
      dateTo: params.dateTo ?? undefined,
      limit: 5000,
      signal: params.signal,
    }),
    getMortalityData({
      farmId: params.farmId,
      systemId: params.systemId,
      systemIds,
      dateFrom: params.dateFrom ?? undefined,
      dateTo: params.dateTo ?? undefined,
      limit: 5000,
      signal: params.signal,
    }),
  ])

  const rows = new Map<string, ProductionTrendRow>()
  const getRow = (date: string, systemId: number) => {
    const key = `${date}:${systemId}`
    const current = rows.get(key)
    if (current) return current
    const next = toTrendRow({ date, systemId })
    rows.set(key, next)
    return next
  }

  const feedingRows = feedingResult.status === "success" ? feedingResult.data : []
  const samplingRows = samplingResult.status === "success" ? samplingResult.data : []
  const mortalityRows = mortalityResult.status === "success" ? mortalityResult.data : []

  feedingRows.forEach((row) => {
    const current = getRow(row.date, row.system_id)
    current.total_feed_amount_period = (current.total_feed_amount_period ?? 0) + (row.feeding_amount ?? 0)
  })

  samplingRows.forEach((row) => {
    const current = getRow(row.date, row.system_id)
    const sampleCount = row.number_of_fish_sampling ?? 0
    const resolvedAbw =
      row.abw ?? (sampleCount > 0 && row.total_weight_sampling != null ? row.total_weight_sampling / sampleCount : null)
    if (resolvedAbw != null) current.average_body_weight = resolvedAbw
    if (sampleCount > 0) current.number_of_fish_inventory = sampleCount
  })

  mortalityRows.forEach((row) => {
      const current = getRow(row.date, row.system_id)
      current.daily_mortality_count = (current.daily_mortality_count ?? 0) + (row.number_of_fish_mortality ?? 0)
  })

  if (params.signal?.aborted) return []
  return sortByDateAsc(Array.from(rows.values()), (row) => row.date)
}

export function useProductionTrend(params: {
  farmId?: string | null
  stage?: Enums<"system_growth_stage">
  batch?: string
  system?: string
  timePeriod: TimePeriod
  dateFrom?: string | null
  dateTo?: string | null
  scopedSystemIds?: number[] | null
}) {
  const { session, user } = useAuth()
  const hasBounds = Boolean(params.dateFrom) && Boolean(params.dateTo)

  return useQuery({
    queryKey: queryKeys.dashboard.productionTrend(params),
    queryFn: async ({ signal }) => {
      const dateFrom = params.dateFrom ?? null
      const dateTo = params.dateTo ?? null
      const parsedSystemId =
        params.system && params.system !== "all" && Number.isFinite(Number(params.system))
          ? Number(params.system)
          : undefined
      if (!dateFrom || !dateTo) {
        const inventoryResult = await getDailyFishInventory({
          farmId: params.farmId ?? null,
          systemId: parsedSystemId,
          stage: params.stage,
          orderAsc: false,
          limit: 5000,
          signal,
        })
        const inventoryRows = inventoryResult.status === "success" ? inventoryResult.data.map(toTrendRowFromInventory) : []
        if (inventoryRows.length > 0) return sortByDateAsc(inventoryRows, (row) => row.date)
        return getOperationalTrendFallback({
          farmId: params.farmId ?? null,
          systemId: parsedSystemId,
          signal,
        })
      }
      const scopedSystemIds = Array.isArray(params.scopedSystemIds) ? params.scopedSystemIds : null
      if (scopedSystemIds && scopedSystemIds.length === 0) return []
      const systemId = scopedSystemIds?.length === 1 ? scopedSystemIds[0] : parsedSystemId
      const summaryResult = await getProductionSummary({
        farmId: params.farmId ?? null,
        stage: params.stage ?? undefined,
        systemId,
        dateFrom,
        dateTo,
        limit: 500,
        signal,
      })
      const summaryRows = summaryResult.status === "success" ? summaryResult.data : []
      const filtered = scopedSystemIds
        ? summaryRows.filter((row) => row.system_id != null && scopedSystemIds.includes(row.system_id))
        : summaryRows
      if (filtered.length > 0) return sortByDateAsc(filtered, (row) => row.date)

      const inventoryResult = await getDailyFishInventory({
        farmId: params.farmId ?? null,
        systemId,
        stage: params.stage,
        dateFrom,
        dateTo,
        orderAsc: true,
        limit: 100000,
        signal,
      })
      if (inventoryResult.status !== "success") return []
      const inventoryRows = scopedSystemIds
        ? inventoryResult.data.filter((row) => row.system_id != null && scopedSystemIds.includes(row.system_id))
        : inventoryResult.data
      const inventoryTrendRows = inventoryRows.map(toTrendRowFromInventory)
      if (inventoryTrendRows.length > 0) return sortByDateAsc(inventoryTrendRows, (row) => row.date)
      return getOperationalTrendFallback({
        farmId: params.farmId ?? null,
        systemId,
        systemIds: scopedSystemIds,
        dateFrom,
        dateTo,
        signal,
      })
    },
    enabled: (Boolean(session) || Boolean(user)) && Boolean(params.farmId),
    staleTime: 0,
    refetchOnMount: "always",
  })
}

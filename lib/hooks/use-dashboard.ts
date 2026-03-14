"use client"

import { useQuery } from "@tanstack/react-query"
import type { Database, Enums } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import { useAuth } from "@/components/providers/auth-provider"
import type {
  DashboardSystemRow,
  KPIOverviewMetric,
  ProductionSummaryMetrics,
  ProductionTrendRow,
  RecommendedAction,
  SystemsTableData,
} from "@/features/dashboard/types"
import {
  buildRecommendedActionsFromAnalytics,
  computeMortalityRateFromProduction,
  toTrendPercent,
} from "@/features/dashboard/analytics-shared"
import {
  getDashboardSystems,
  getDashboardConsolidated,
} from "@/lib/api/dashboard"
import { sortByDateAsc } from "@/lib/utils"
import { getDailyFishInventory } from "@/lib/api/inventory"
import { getWaterQualityRatings } from "@/lib/api/water-quality"
import { getProductionSummary } from "@/lib/api/production"
import { getBatchSystemIds, getRecentActivities, getTransferData } from "@/lib/api/reports"

async function resolveScopedSystemIds(params: {
  farmId?: string | null
  stage?: "all" | Enums<"system_growth_stage">
  system?: string
  batch?: string
  dateFrom?: string | null
  dateTo?: string | null
  signal?: AbortSignal
}): Promise<number[] | null> {
  const farmId = params.farmId ?? null
  if (!farmId) return null

  const parsedSystemId =
    params.system && params.system !== "all" && Number.isFinite(Number(params.system))
      ? Number(params.system)
      : undefined

  const systemsResult = await getDashboardSystems({
    farmId,
    stage: params.stage && params.stage !== "all" ? params.stage : undefined,
    systemId: parsedSystemId,
    dateFrom: params.dateFrom ?? undefined,
    dateTo: params.dateTo ?? undefined,
    signal: params.signal,
  })
  if (systemsResult.status !== "success") return null

  let scoped = systemsResult.data
    .map((row) => row.system_id)
    .filter((id): id is number => typeof id === "number")

  if (params.system && params.system !== "all") {
    const parsed = Number(params.system)
    if (Number.isFinite(parsed)) {
      scoped = scoped.filter((id) => id === parsed)
    } else {
      scoped = []
    }
  }

  if (params.batch && params.batch !== "all") {
    const batchId = Number(params.batch)
    if (!Number.isFinite(batchId)) return []
    const batchSystemsResult = await getBatchSystemIds({ batchId, signal: params.signal })
    if (batchSystemsResult.status !== "success") return []
    const batchIds = new Set(batchSystemsResult.data.map((row) => row.system_id))
    scoped = scoped.filter((id) => batchIds.has(id))
  }

  return scoped
}

const hasCompleteSystemMetrics = (row: DashboardSystemRow): boolean => {
  const requiredNumericMetrics: Array<number | null> = [
    row.fish_end,
    row.biomass_end,
    row.feed_total,
    row.efcr,
    row.abw,
    row.feeding_rate,
    row.mortality_rate,
    row.biomass_density,
  ]

  const hasAllNumericMetrics = requiredNumericMetrics.every(
    (value) => typeof value === "number" && Number.isFinite(value),
  )
  if (!hasAllNumericMetrics) return false

  return typeof row.water_quality_rating_average === "string" && row.water_quality_rating_average.trim().length > 0
}


export function useKpiOverview(params: {
  farmId?: string | null
  stage: "all" | Enums<"system_growth_stage">
  timePeriod: Enums<"time_period">
  batch?: string
  system?: string
  periodParam?: string | null
  dateFrom?: string | null
  dateTo?: string | null
  initialData?: { metrics: KPIOverviewMetric[]; dateBounds: { start: string | null; end: string | null } }
}) {
  const { session } = useAuth()
  return useQuery({
    queryKey: [
      "kpi-overview",
      params.farmId ?? "all",
      params.stage,
      params.timePeriod,
      params.batch ?? "all",
      params.system ?? "all",
      params.periodParam ?? "",
      params.dateFrom ?? "",
      params.dateTo ?? "",
    ],
    queryFn: async ({ signal }) => {
      const ratingToneMap: Record<string, { tone: KPIOverviewMetric["tone"]; badge: string }> = {
        optimal: { tone: "good", badge: "Optimal" },
        acceptable: { tone: "warn", badge: "Acceptable" },
        critical: { tone: "bad", badge: "Critical" },
        lethal: { tone: "bad", badge: "Lethal" },
      }
      const dateFrom = params.dateFrom ?? null
      const dateTo = params.dateTo ?? null

      const buildRangeMetrics = async (range: { start: string; end: string }) => {
        const scopedSystemIds = await resolveScopedSystemIds({
          farmId: params.farmId ?? null,
          stage: params.stage,
          system: params.system,
          batch: params.batch ?? "all",
          dateFrom: range.start,
          dateTo: range.end,
          signal,
        })
        if (scopedSystemIds === null) return { metrics: [], dateBounds: range }
        if (scopedSystemIds.length === 0) return { metrics: [], dateBounds: range }
        const singleSystemId = scopedSystemIds.length === 1 ? scopedSystemIds[0] : undefined

        const inventoryResult = await getDailyFishInventory({
          farmId: params.farmId ?? null,
          systemId: singleSystemId,
          dateFrom: range.start,
          dateTo: range.end,
          limit: 5000,
          signal,
        })

        const productionResult = await getProductionSummary({
          farmId: params.farmId ?? null,
          systemId: singleSystemId,
          stage: params.stage === "all" ? undefined : params.stage,
          dateFrom: range.start,
          dateTo: range.end,
          limit: 5000,
          signal,
        })

        if (inventoryResult.status !== "success" && productionResult.status !== "success") {
          return { metrics: [], dateBounds: range }
        }

        const inventoryRowsRaw = inventoryResult.status === "success" ? inventoryResult.data : []
        const productionRowsRaw = productionResult.status === "success" ? productionResult.data : []
        const inventoryRows = inventoryRowsRaw.filter(
          (row) => row.system_id != null && scopedSystemIds.includes(row.system_id),
        )
        const productionRows = productionRowsRaw.filter(
          (row) => row.system_id != null && scopedSystemIds.includes(row.system_id),
        )

        let totalFeed = 0
        let totalBiomass = 0
        let biomassCount = 0
        let totalAbw = 0
        let abwCount = 0
        let totalBiomassDensity = 0
        let biomassDensityCount = 0
        let totalFish = 0
        let fishCount = 0
        let mortalityWeighted = 0
        let feedingWeighted = 0

        inventoryRows.forEach((row) => {
          const feed = row.feeding_amount ?? 0
          const biomass = row.biomass_last_sampling
          const fish = row.number_of_fish
          const abw = row.abw_last_sampling
          const biomassDensity = row.biomass_density
          const mortalityCount = row.number_of_fish_mortality ?? 0

          totalFeed += feed
          if (typeof biomass === "number") {
            totalBiomass += biomass
            biomassCount += 1
          }
          if (typeof abw === "number") {
            totalAbw += abw
            abwCount += 1
          }
          if (typeof biomassDensity === "number") {
            totalBiomassDensity += biomassDensity
            biomassDensityCount += 1
          }
          if (typeof fish === "number") {
            totalFish += fish
            fishCount += 1
          }

          if (typeof fish === "number" && fish > 0) {
            const mortalityRateRow =
              typeof row.mortality_rate === "number"
                ? row.mortality_rate
                : mortalityCount / fish
            mortalityWeighted += mortalityRateRow * fish
          }

          if (typeof biomass === "number" && biomass > 0) {
            const feedingRateRow =
              typeof row.feeding_rate === "number"
                ? row.feeding_rate
                : (feed * 1000) / biomass
            feedingWeighted += feedingRateRow * biomass
          }
        })

        const avgBiomass = biomassCount > 0 ? totalBiomass / biomassCount : null
        const avgAbw = abwCount > 0 ? totalAbw / abwCount : null
        const avgBiomassDensity = biomassDensityCount > 0 ? totalBiomassDensity / biomassDensityCount : null
        const feedRate =
          totalBiomass > 0 ? (feedingWeighted > 0 ? feedingWeighted / totalBiomass : (totalFeed * 1000) / totalBiomass) : null
        const mortalityRateFromInventory = totalFish > 0 ? mortalityWeighted / totalFish : null

        const gainAdjusted = productionRows.reduce((sum, row) => {
          const biomassIncrease = row.biomass_increase_period ?? 0
          const transferOut = (row as any).total_weight_transfer_out ?? 0
          const transferIn = (row as any).total_weight_transfer_in ?? 0
          const harvested = (row as any).total_weight_harvested ?? 0
          const stocked = (row as any).total_weight_stocked ?? 0
          return sum + (biomassIncrease - transferOut + transferIn + harvested - stocked)
        }, 0)

        const feedSum = productionRows.reduce(
          (sum, row) => sum + (row.total_feed_amount_period ?? 0),
          0,
        )

        const efcr = gainAdjusted !== 0 ? feedSum / gainAdjusted : null
        const mortalityRateFromProduction = computeMortalityRateFromProduction(
          productionRows.map((row) => ({
            number_of_fish_inventory: row.number_of_fish_inventory,
            daily_mortality_count: row.daily_mortality_count,
          })),
        )
        const mortalityRate = mortalityRateFromInventory ?? mortalityRateFromProduction

        const wqResult = await getWaterQualityRatings({
          farmId: params.farmId ?? null,
          systemId: singleSystemId,
          dateFrom: range.start,
          dateTo: range.end,
          limit: 2000,
          signal,
        })
        if (wqResult.status !== "success") {
          return { metrics: [], dateBounds: range }
        }
        const wqRows = wqResult.data.filter(
          (row) => row.system_id != null && scopedSystemIds.includes(row.system_id),
        )
        const consolidatedResult = await getDashboardConsolidated({
          farmId: params.farmId ?? null,
          systemId: singleSystemId,
          dateFrom: range.start,
          dateTo: range.end,
          signal,
        })
        const consolidatedRow =
          consolidatedResult.status === "success" ? consolidatedResult.data[0] ?? null : null

        const resolvedEfcr = consolidatedRow?.efcr_period_consolidated ?? efcr
        const resolvedMortalityRate = consolidatedRow?.mortality_rate ?? mortalityRate
        const resolvedAvgBiomass = consolidatedRow?.average_biomass ?? avgBiomass
        const resolvedBiomassDensity = consolidatedRow?.biomass_density ?? avgBiomassDensity
        const resolvedFeedingRate = consolidatedRow?.feeding_rate ?? feedRate
        const resolvedAbw = consolidatedRow?.abw_asof_end ?? avgAbw
        const resolvedWqAverage =
          wqRows && wqRows.length
            ? wqRows.reduce((sum, row) => sum + (row.rating_numeric ?? 0), 0) / wqRows.length
            : null

        const wqRounded = resolvedWqAverage === null ? null : Math.round(resolvedWqAverage)
        const wqLabel =
          wqRounded === null
            ? null
            : wqRounded === 0
              ? "lethal"
              : wqRounded === 1
                ? "critical"
                : wqRounded === 2
                  ? "acceptable"
                  : "optimal"
        const wqTone = wqLabel ? ratingToneMap[wqLabel]?.tone ?? "neutral" : "neutral"
        const wqBadge = wqLabel ? ratingToneMap[wqLabel]?.badge ?? "Monitoring" : "Monitoring"

        const trendByKey: Record<string, number | null> = consolidatedRow
          ? {
              efcr: toTrendPercent(resolvedEfcr, consolidatedRow.efcr_period_consolidated_delta),
              mortality: toTrendPercent(resolvedMortalityRate, consolidatedRow.mortality_rate_delta),
              biomass: toTrendPercent(resolvedAvgBiomass, consolidatedRow.average_biomass_delta),
              biomass_density: toTrendPercent(resolvedBiomassDensity, consolidatedRow.biomass_density_delta),
              feeding: toTrendPercent(resolvedFeedingRate, consolidatedRow.feeding_rate_delta),
              abw: toTrendPercent(resolvedAbw, consolidatedRow.abw_asof_end_delta),
              water_quality: null,
            }
          : {}

        const nextMetrics: KPIOverviewMetric[] = [
          {
            key: "efcr",
            label: "eFCR",
            value: resolvedEfcr,
            decimals: 2,
            trend: trendByKey.efcr ?? null,
            invertTrend: true,
          },
          {
            key: "mortality",
            label: "Mortality Rate",
            value: resolvedMortalityRate,
            unit: "rate/day",
            decimals: 4,
            trend: trendByKey.mortality ?? null,
            invertTrend: true,
          },
          {
            key: "abw",
            label: "Avg Body Weight",
            value: resolvedAbw,
            unit: "g",
            decimals: 1,
            trend: trendByKey.abw ?? null,
            invertTrend: false,
          },
          {
            key: "biomass",
            label: "Avg Biomass",
            value: resolvedAvgBiomass,
            unit: "kg",
            decimals: 1,
            trend: trendByKey.biomass ?? null,
            invertTrend: false,
          },
          {
            key: "biomass_density",
            label: "Biomass Density",
            value: resolvedBiomassDensity,
            unit: "kg/m3",
            decimals: 2,
            trend: trendByKey.biomass_density ?? null,
            invertTrend: false,
          },
          {
            key: "feeding",
            label: "Feeding Rate",
            value: resolvedFeedingRate,
            unit: "kg/t",
            decimals: 2,
            trend: trendByKey.feeding ?? null,
            invertTrend: false,
          },
          {
            key: "water_quality",
            label: "Water Quality",
            value: resolvedWqAverage,
            decimals: 1,
            trend: trendByKey.water_quality ?? null,
            invertTrend: false,
            tone: wqTone,
            badge: wqBadge,
          },
        ]

        return { metrics: nextMetrics, dateBounds: range }
      }

      if (!dateFrom || !dateTo) {
        return { metrics: [], dateBounds: { start: dateFrom, end: dateTo } }
      }
      return buildRangeMetrics({ start: dateFrom, end: dateTo })
    },
    enabled: Boolean(session) && Boolean(params.farmId),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: true,
    initialData: params.initialData,
    initialDataUpdatedAt: params.initialData ? 0 : undefined,
  })
}

export function useProductionSummaryMetrics(params: {
  farmId?: string | null
  stage: "all" | Enums<"system_growth_stage">
  batch?: string
  system?: string
  timePeriod?: Enums<"time_period">
  periodParam?: string | null
  dateFrom?: string | null
  dateTo?: string | null
  initialData?: ProductionSummaryMetrics
}) {
  const { session } = useAuth()
  return useQuery({
    queryKey: [
      "production-summary-metrics",
      params.farmId ?? "all",
      params.stage ?? "all",
      params.batch ?? "all",
      params.system ?? "all",
      params.periodParam ?? params.timePeriod ?? "2 weeks",
      params.dateFrom ?? "",
      params.dateTo ?? "",
    ],
    queryFn: async ({ signal }) => {
      const empty: ProductionSummaryMetrics = {
        totalStockedFish: 0,
        totalMortalities: 0,
        netTransferAdjustments: 0,
        totalHarvestedFish: 0,
        totalHarvestedKg: 0,
        dateBounds: { start: null, end: null },
      }

      const dateFrom = params.dateFrom ?? null
      const dateTo = params.dateTo ?? null

      if (!dateFrom || !dateTo) {
        return {
          ...empty,
          dateBounds: { start: dateFrom, end: dateTo },
        }
      }

      const scopedSystemIds = await resolveScopedSystemIds({
        farmId: params.farmId ?? null,
        stage: params.stage ?? "all",
        system: params.system,
        batch: params.batch ?? "all",
        dateFrom,
        dateTo,
        signal,
      })
      if (scopedSystemIds === null || scopedSystemIds.length === 0) return empty

      const singleSystemId = scopedSystemIds.length === 1 ? scopedSystemIds[0] : undefined
      const summaryResult = await getProductionSummary({
        farmId: params.farmId ?? null,
        systemId: singleSystemId,
        stage: params.stage === "all" ? undefined : params.stage,
        dateFrom,
        dateTo,
        limit: 5000,
        signal,
      })
      if (summaryResult.status !== "success") {
        return {
          ...empty,
          dateBounds: { start: dateFrom, end: dateTo },
        }
      }

      const batchId =
        params.batch && params.batch !== "all" && Number.isFinite(Number(params.batch))
          ? Number(params.batch)
          : undefined
      const transferResult = await getTransferData({
        batchId,
        dateFrom,
        dateTo,
        limit: 5000,
        signal,
      })
      if (transferResult.status !== "success") {
        return {
          ...empty,
          dateBounds: { start: dateFrom, end: dateTo },
        }
      }

      const filtered = summaryResult.data.filter(
        (row) => row.system_id != null && scopedSystemIds.includes(row.system_id),
      )
      const scopedSet = new Set(scopedSystemIds)

      let totalStockedFish = 0
      let totalMortalities = 0
      let totalHarvestedFish = 0
      let totalHarvestedKg = 0

      filtered.forEach((row) => {
        totalStockedFish += row.number_of_fish_stocked ?? 0
        totalMortalities += row.daily_mortality_count ?? 0
        totalHarvestedFish += row.number_of_fish_harvested ?? 0
        totalHarvestedKg += row.total_weight_harvested ?? 0
      })

      const netTransferAdjustments = transferResult.data.reduce((sum, row) => {
        const count = row.number_of_fish_transfer ?? 0
        const originInScope = scopedSet.has(row.origin_system_id)
        const targetInScope = scopedSet.has(row.target_system_id)

        if (targetInScope && !originInScope) return sum + count
        if (originInScope && !targetInScope) return sum - count
        return sum
      }, 0)

      return {
        totalStockedFish,
        totalMortalities,
        netTransferAdjustments,
        totalHarvestedFish,
        totalHarvestedKg,
        dateBounds: { start: dateFrom, end: dateTo },
      } as ProductionSummaryMetrics
    },
    enabled: Boolean(session) && Boolean(params.farmId),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: true,
    initialData: params.initialData,
    initialDataUpdatedAt: params.initialData ? 0 : undefined,
  })
}

export function useSystemsTable(params: {
  farmId?: string | null
  stage: Enums<"system_growth_stage"> | "all"
  batch?: string
  system?: string
  timePeriod?: Enums<"time_period">
  periodParam?: string | null
  dateFrom?: string | null
  dateTo?: string | null
  includeIncomplete?: boolean
  initialData?: SystemsTableData
}) {
  const { session } = useAuth()
  return useQuery({
    queryKey: [
      "systems-table",
      params.farmId ?? "all",
      params.stage,
      params.batch ?? "all",
      params.system ?? "all",
      params.timePeriod ?? "2 weeks",
      params.periodParam ?? "",
      params.dateFrom ?? "",
      params.dateTo ?? "",
      params.includeIncomplete ?? false,
    ],
    queryFn: async ({ signal }) => {
      const farmId = params.farmId ?? null
      if (!farmId) {
        return {
          rows: [] as DashboardSystemRow[],
          meta: { reason: "Missing farmId", start: null, end: null },
        }
      }

      const startDate = params.dateFrom ?? null
      const endDate = params.dateTo ?? null

      if (!startDate || !endDate) {
        return {
          rows: [] as DashboardSystemRow[],
          meta: { reason: "Missing time bounds", start: startDate, end: endDate },
        }
      }

      const stage = params.stage === "all" ? null : params.stage
      const parsedSystemId = params.system && params.system !== "all" ? Number(params.system) : null
      const systemId = Number.isFinite(parsedSystemId) ? (parsedSystemId as number) : null
      const scopedSystemIds = await resolveScopedSystemIds({
        farmId,
        stage: params.stage,
        batch: params.batch ?? "all",
        system: params.system,
        dateFrom: startDate,
        dateTo: endDate,
        signal,
      })
      if (scopedSystemIds === null) {
        return {
          rows: [] as DashboardSystemRow[],
          meta: { reason: "Scoped systems error", start: startDate, end: endDate },
        }
      }
      if (scopedSystemIds.length === 0) {
        return {
          rows: [] as DashboardSystemRow[],
          meta: { reason: "No scoped systems", start: startDate, end: endDate },
        }
      }

      const result = await getDashboardSystems({
        farmId,
        stage,
        systemId,
        dateFrom: startDate,
        dateTo: endDate,
        signal,
      })

      if (result.status !== "success") {
        return {
          rows: [] as DashboardSystemRow[],
          meta: { reason: "RPC error", error: result.error, start: startDate, end: endDate },
        }
      }

      return {
        rows: ((result.data ?? []) as DashboardSystemRow[]).filter((row) => {
          if (!scopedSystemIds.includes(row.system_id)) return false
          if (params.includeIncomplete) return true
          return hasCompleteSystemMetrics(row)
        }),
        meta: { source: "api_dashboard_systems", start: startDate, end: endDate },
      }
    },
    enabled: Boolean(session) && Boolean(params.farmId),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: true,
    initialData: params.initialData,
    initialDataUpdatedAt: params.initialData ? 0 : undefined,
  })
}

export function useProductionTrend(params: {
  farmId?: string | null
  stage?: Enums<"system_growth_stage">
  batch?: string
  system?: string
  timePeriod: Enums<"time_period"> | string
  dateFrom?: string | null
  dateTo?: string | null
  initialData?: ProductionTrendRow[]
}) {
  const { session } = useAuth()
  return useQuery({
    queryKey: [
      "production-trend",
      params.farmId ?? "all",
      params.stage ?? "all",
      params.batch ?? "all",
      params.system ?? "all",
      params.timePeriod,
      params.dateFrom ?? "",
      params.dateTo ?? "",
    ],
    queryFn: async ({ signal }) => {
      const dateFrom = params.dateFrom ?? null
      const dateTo = params.dateTo ?? null
      if (!dateFrom || !dateTo) return []
      const scopedSystemIds = await resolveScopedSystemIds({
        farmId: params.farmId ?? null,
        stage: (params.stage ?? "all") as "all" | Enums<"system_growth_stage">,
        batch: params.batch ?? "all",
        system: params.system,
        dateFrom,
        dateTo,
        signal,
      })
      if (scopedSystemIds === null || scopedSystemIds.length === 0) return []
      const systemId = scopedSystemIds.length === 1 ? scopedSystemIds[0] : undefined
      const summaryResult = await getProductionSummary({
        farmId: params.farmId ?? null,
        stage: params.stage ?? undefined,
        systemId,
        dateFrom,
        dateTo,
        limit: 500,
        signal,
      })
      if (summaryResult.status !== "success") return []
      const filtered = summaryResult.data.filter(
        (row) => row.system_id != null && scopedSystemIds.includes(row.system_id),
      )
      return sortByDateAsc(filtered, (row) => row.date)
    },
    enabled: Boolean(session) && Boolean(params.farmId),
    staleTime: 5 * 60_000,
    initialData: params.initialData,
    initialDataUpdatedAt: params.initialData ? 0 : undefined,
  })
}

export function useRecentActivities(params?: {
  tableName?: string
  changeType?: Enums<"change_type_enum">
  dateFrom?: string
  dateTo?: string
  limit?: number
  enabled?: boolean
  initialData?: QueryResult<Database["public"]["Tables"]["change_log"]["Row"]>
}) {
  return useQuery({
    queryKey: [
      "recent-activities",
      params?.tableName ?? "all",
      params?.changeType ?? "all",
      params?.dateFrom ?? "all",
      params?.dateTo ?? "all",
      params?.limit ?? 5,
    ],
    queryFn: ({ signal }) =>
      getRecentActivities({
        tableName: params?.tableName,
        changeType: params?.changeType,
        dateFrom: params?.dateFrom,
        dateTo: params?.dateTo,
        limit: params?.limit ?? 5,
        signal,
      }),
    enabled: params?.enabled ?? true,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60_000,
    initialData: params?.initialData,
    initialDataUpdatedAt: params?.initialData ? 0 : undefined,
  })
}

export function useRecommendedActions(params: {
  farmId?: string | null
  stage?: "all" | Enums<"system_growth_stage">
  batch?: string
  system?: string
  timePeriod?: Enums<"time_period">
  dateFrom?: string | null
  dateTo?: string | null
  initialData?: RecommendedAction[]
}) {
  const { session } = useAuth()
  return useQuery({
    queryKey: [
      "recommended-actions",
      params.farmId ?? "all",
      params.stage ?? "all",
      params.batch ?? "all",
      params.system ?? "all",
      params.timePeriod ?? "2 weeks",
      params.dateFrom ?? "",
      params.dateTo ?? "",
    ],
    queryFn: async ({ signal }) => {
      const dateFrom = params.dateFrom ?? null
      const dateTo = params.dateTo ?? null
      if (!dateFrom || !dateTo) {
        return [] as Array<{
          title: string
          description: string
          priority: "High" | "Medium" | "Info"
          due: string
        }>
      }
      const scopedSystemIds = await resolveScopedSystemIds({
        farmId: params.farmId ?? null,
        stage: params.stage ?? "all",
        batch: params.batch ?? "all",
        system: params.system,
        dateFrom,
        dateTo,
        signal,
      })
      if (scopedSystemIds === null || scopedSystemIds.length === 0) {
        return [] as Array<{
          title: string
          description: string
          priority: "High" | "Medium" | "Info"
          due: string
        }>
      }
      const systemId = scopedSystemIds.length === 1 ? scopedSystemIds[0] : undefined
      const inventoryResult = await getDailyFishInventory({
        farmId: params.farmId ?? null,
        systemId,
        dateFrom,
        dateTo,
        limit: 1000,
        signal,
      })
      const wqResult = await getWaterQualityRatings({
        farmId: params.farmId ?? null,
        systemId,
        dateFrom,
        dateTo,
        limit: 1000,
        signal,
      })

      if (inventoryResult.status !== "success" || wqResult.status !== "success") {
        return [] as Array<{
          title: string
          description: string
          priority: "High" | "Medium" | "Info"
          due: string
        }>
      }

      return buildRecommendedActionsFromAnalytics({
        scopedSystemIds,
        inventoryRows: inventoryResult.data,
        waterQualityRows: wqResult.data,
      })
    },
    enabled: Boolean(session) && Boolean(params.farmId),
    staleTime: 5 * 60_000,
    initialData: params.initialData,
    initialDataUpdatedAt: params.initialData ? 0 : undefined,
  })
}



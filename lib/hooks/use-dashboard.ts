"use client"

import { useQuery } from "@tanstack/react-query"
import type { Enums } from "@/lib/types/database"
import { useAuth } from "@/components/providers/auth-provider"
import {
  getDashboardSystems,
  getDashboardConsolidatedSnapshot,
  getDashboardSnapshot,
  getTimePeriodBounds,
} from "@/lib/api/dashboard"
import { parseDateToTimePeriod, sortByDateAsc } from "@/lib/utils"
import { getDailyFishInventory } from "@/lib/api/inventory"
import { getWaterQualityRatings } from "@/lib/api/water-quality"
import { getProductionSummary } from "@/lib/api/production"
import { getBatchSystemIds, getRecentActivities, getTransferData } from "@/lib/api/reports"

const computeMortalityRateFromProduction = (
  rows: Array<{ number_of_fish_inventory: number | null; daily_mortality_count: number | null }>,
): number | null => {
  let weightedMortality = 0
  let totalFish = 0
  rows.forEach((row) => {
    const fish = row.number_of_fish_inventory ?? 0
    const mortality = row.daily_mortality_count ?? 0
    if (fish > 0) {
      weightedMortality += (mortality / fish) * fish
      totalFish += fish
    }
  })
  return totalFish > 0 ? weightedMortality / totalFish : null
}

async function resolveScopedSystemIds(params: {
  farmId?: string | null
  stage?: "all" | Enums<"system_growth_stage">
  system?: string
  batch?: string
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

export function useDashboardConsolidatedSnapshot(params?: { timePeriod?: Enums<"time_period">; enabled?: boolean; farmId?: string | null }) {
  const { session } = useAuth()
  const enabled = Boolean(session) && Boolean(params?.farmId) && (params?.enabled ?? true)
  return useQuery({
    queryKey: ["dashboard", "snapshot", "consolidated", params?.farmId ?? "all", params?.timePeriod ?? "2 weeks"],
    queryFn: ({ signal }) => getDashboardConsolidatedSnapshot({ ...params, farmId: params?.farmId ?? null, signal }),
    enabled,
    staleTime: 5 * 60_000,
  })
}

export type HealthSummaryState = {
  waterQuality: { title: string; status: string; tone: "good" | "warn" | "bad"; progress: number; detail?: string } | null
  fishHealth: { title: string; status: string; tone: "good" | "warn" | "bad"; progress: number; detail?: string } | null
}

export function useHealthSummary(params: {
  farmId?: string | null
  stage?: "all" | Enums<"system_growth_stage">
  batch?: string
  system?: string
  timePeriod?: Enums<"time_period">
  periodParam?: string | null
}) {
  const { session } = useAuth()
  return useQuery({
    queryKey: [
      "health-summary",
      params.farmId ?? "all",
      params.stage ?? "all",
      params.batch ?? "all",
      params.system ?? "all",
      params.periodParam ?? params.timePeriod ?? "2 weeks",
    ],
    queryFn: async ({ signal }) => {
      const ratingToneMap: Record<string, { status: string; tone: "good" | "warn" | "bad"; progress: number }> = {
        optimal: { status: "Good", tone: "good", progress: 0.85 },
        acceptable: { status: "Fair", tone: "warn", progress: 0.6 },
        critical: { status: "Poor", tone: "bad", progress: 0.35 },
        lethal: { status: "Critical", tone: "bad", progress: 0.2 },
      }

      const scopedSystemIds = await resolveScopedSystemIds({
        farmId: params.farmId ?? null,
        stage: params.stage ?? "all",
        system: params.system,
        batch: params.batch ?? "all",
        signal,
      })
      const resolvedSystemId =
        scopedSystemIds && scopedSystemIds.length === 1 ? scopedSystemIds[0] : undefined
      const parsed = parseDateToTimePeriod(params.periodParam ?? params.timePeriod)
      const bounds = await getTimePeriodBounds(
        params.periodParam ?? params.timePeriod ?? "2 weeks",
        signal,
        params.farmId ?? null,
      )
      const hasCustomRange = parsed.kind === "custom" && bounds.start && bounds.end

      const waterQualityState: NonNullable<HealthSummaryState["waterQuality"]> = {
        title: "Water quality",
        status: "Monitoring",
        tone: "good",
        progress: 0.8,
        detail: resolvedSystemId ? "Latest system rating" : "Latest farm rating",
      }

      const fishState: NonNullable<HealthSummaryState["fishHealth"]> = {
        title: "Fish health",
        status: "Monitoring",
        tone: "warn",
        progress: 0.6,
        detail: "Latest snapshot from dashboard view",
      }

      const forceRangeMode =
        (params.batch && params.batch !== "all") ||
        (params.stage && params.stage !== "all")

      if (hasCustomRange || forceRangeMode) {
        if (!bounds.start || !bounds.end) {
          return { waterQuality: waterQualityState, fishHealth: fishState } as HealthSummaryState
        }
        const wqResult = await getWaterQualityRatings({
          farmId: params.farmId ?? null,
          systemId: resolvedSystemId,
          dateFrom: bounds.start,
          dateTo: bounds.end,
          limit: 2000,
          signal,
        })

        const invResult = await getDailyFishInventory({
          farmId: params.farmId ?? null,
          systemId: resolvedSystemId,
          dateFrom: bounds.start,
          dateTo: bounds.end,
          limit: 2000,
          signal,
        })

        if (wqResult.status === "success" && wqResult.data.length) {
          const filteredWq = scopedSystemIds?.length
            ? wqResult.data.filter((row) => row.system_id != null && scopedSystemIds.includes(row.system_id))
            : wqResult.data
          if (!filteredWq.length) {
            return { waterQuality: waterQualityState, fishHealth: fishState } as HealthSummaryState
          }
          const avg =
            filteredWq.reduce((sum, row) => sum + (row.rating_numeric ?? 0), 0) / filteredWq.length
          const rounded = Math.round(avg)
          const mapped = ratingToneMap[
            rounded === 0 ? "lethal" : rounded === 1 ? "critical" : rounded === 2 ? "acceptable" : "optimal"
          ] ?? ratingToneMap.optimal
          waterQualityState.tone = mapped.tone
          waterQualityState.status = mapped.status
          waterQualityState.progress = mapped.progress
          waterQualityState.detail = `Rating: ${rounded}`
        }

        if (invResult.status === "success" && invResult.data.length) {
          const filteredInventory = scopedSystemIds?.length
            ? invResult.data.filter((row) => row.system_id != null && scopedSystemIds.includes(row.system_id))
            : invResult.data
          const totalMortality = filteredInventory.reduce((sum, row) => sum + (row.number_of_fish_mortality ?? 0), 0)
          const totalFish = filteredInventory.reduce((sum, row) => sum + (row.number_of_fish ?? 0), 0)
          if (totalFish > 0) {
            fishState.detail = `Mortality rate/day: ${(totalMortality / totalFish).toFixed(4)}`
          }
        }
      } else if (resolvedSystemId) {
        const snapshot = await getDashboardSnapshot({
          farmId: params.farmId ?? null,
          systemId: resolvedSystemId,
          timePeriod: params.timePeriod ?? "2 weeks",
          signal,
        })

        if (snapshot?.water_quality_rating_average) {
          const mapped = ratingToneMap[snapshot.water_quality_rating_average] ?? ratingToneMap.optimal
          waterQualityState.tone = mapped.tone
          waterQualityState.status = mapped.status
          waterQualityState.progress = mapped.progress
          waterQualityState.detail = `Rating: ${snapshot.water_quality_rating_average}`
        }

        if (snapshot?.mortality_rate != null) {
          fishState.detail = `Mortality rate/day: ${snapshot.mortality_rate}`
        }
      } else {
        const snapshot = await getDashboardConsolidatedSnapshot({
          farmId: params.farmId ?? null,
          timePeriod: params.timePeriod ?? "2 weeks",
          signal,
        })

        if (snapshot?.water_quality_rating_average) {
          const mapped = ratingToneMap[snapshot.water_quality_rating_average] ?? ratingToneMap.optimal
          waterQualityState.tone = mapped.tone
          waterQualityState.status = mapped.status
          waterQualityState.progress = mapped.progress
          waterQualityState.detail = `Rating: ${snapshot.water_quality_rating_average}`
        }

        if (snapshot?.mortality_rate != null) {
          fishState.detail = `Mortality rate/day: ${snapshot.mortality_rate}`
        }
      }

      return { waterQuality: waterQualityState, fishHealth: fishState } as HealthSummaryState
    },
    enabled: Boolean(session) && Boolean(params.farmId),
    staleTime: 5 * 60_000,
  })
}

export type KPIOverviewMetric = {
  key: string
  label: string
  value: number | null
  unit?: string
  decimals?: number
  trend: number | null
  invertTrend: boolean
  tone?: "good" | "warn" | "bad" | "neutral"
  badge?: string
}

export type ProductionSummaryMetrics = {
  totalStockedFish: number
  totalMortalities: number
  netTransferAdjustments: number
  totalHarvestedFish: number
  totalHarvestedKg: number
  dateBounds: { start: string | null; end: string | null }
}

export type DashboardSystemRow = {
  system_id: number
  system_name: string | null
  growth_stage: "nursing" | "grow out" | "grow_out" | string | null
  input_start_date: string | null
  input_end_date: string | null
  as_of_date: string | null
  sampling_end_date: string | null
  sample_age_days: number | null
  efcr: number | null
  efcr_date: string | null
  feed_total: number | null
  abw: number | null
  feeding_rate: number | null
  mortality_rate: number | null
  biomass_density: number | null
  fish_end: number | null
  biomass_end: number | null
  missing_days_count: number | null
  water_quality_rating_average: "optimal" | "acceptable" | "critical" | "lethal" | string | null
  water_quality_rating_numeric_average: number | null
  water_quality_latest_date: string | null
  worst_parameter: string | null
  worst_parameter_value: number | null
  worst_parameter_unit: string | null
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

const toIsoDate = (value: Date) => value.toISOString().slice(0, 10)

const getPreviousRange = (range: { start: string; end: string }): { start: string; end: string } | null => {
  const startDate = new Date(`${range.start}T00:00:00`)
  const endDate = new Date(`${range.end}T00:00:00`)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null
  if (endDate < startDate) return null

  const spanMs = endDate.getTime() - startDate.getTime()
  const prevEnd = new Date(startDate.getTime() - 24 * 60 * 60 * 1000)
  const prevStart = new Date(prevEnd.getTime() - spanMs)

  return { start: toIsoDate(prevStart), end: toIsoDate(prevEnd) }
}

const computeTrendPercent = (current: number | null, previous: number | null): number | null => {
  if (current === null || previous === null) return null
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / Math.abs(previous)) * 100
}

export function useKpiOverview(params: {
  farmId?: string | null
  stage: "all" | Enums<"system_growth_stage">
  timePeriod: Enums<"time_period">
  batch?: string
  system?: string
  periodParam?: string | null
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
    ],
    queryFn: async ({ signal }) => {
      const ratingToneMap: Record<string, { tone: KPIOverviewMetric["tone"]; badge: string }> = {
        optimal: { tone: "good", badge: "Optimal" },
        acceptable: { tone: "warn", badge: "Acceptable" },
        critical: { tone: "bad", badge: "Critical" },
        lethal: { tone: "bad", badge: "Lethal" },
      }
      const bounds = await getTimePeriodBounds(params.periodParam ?? params.timePeriod, signal, params.farmId ?? null)

      const buildRangeMetrics = async (range: { start: string; end: string }) => {
        const scopedSystemIds = await resolveScopedSystemIds({
          farmId: params.farmId ?? null,
          stage: params.stage,
          system: params.system,
          batch: params.batch ?? "all",
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
        const avgFish = fishCount > 0 ? totalFish / fishCount : null
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
        const wqAverage =
          wqRows && wqRows.length
            ? wqRows.reduce((sum, row) => sum + (row.rating_numeric ?? 0), 0) / wqRows.length
            : null
        const wqRounded = wqAverage === null ? null : Math.round(wqAverage)
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

        const nextMetrics: KPIOverviewMetric[] = [
          {
            key: "efcr",
            label: "eFCR",
            value: efcr,
            decimals: 2,
            trend: null,
            invertTrend: true,
          },
          {
            key: "mortality",
            label: "Mortality Rate",
            value: mortalityRate,
            unit: "rate/day",
            decimals: 4,
            trend: null,
            invertTrend: true,
          },
          {
            key: "abw",
            label: "Avg Body Weight",
            value: avgAbw,
            unit: "g",
            decimals: 1,
            trend: null,
            invertTrend: false,
          },
          {
            key: "biomass",
            label: "Avg Biomass",
            value: avgBiomass,
            unit: "kg",
            decimals: 1,
            trend: null,
            invertTrend: false,
          },
          {
            key: "biomass_density",
            label: "Biomass Density",
            value: avgBiomassDensity,
            unit: "kg/m3",
            decimals: 2,
            trend: null,
            invertTrend: false,
          },
          {
            key: "feeding",
            label: "Feeding Rate",
            value: feedRate,
            unit: "kg/t",
            decimals: 2,
            trend: null,
            invertTrend: false,
          },
          {
            key: "water_quality",
            label: "Water Quality",
            value: wqAverage,
            decimals: 1,
            trend: null,
            invertTrend: false,
            tone: wqTone,
            badge: wqBadge,
          },
        ]

        return { metrics: nextMetrics, dateBounds: range }
      }

      if (!bounds.start || !bounds.end) {
        return { metrics: [], dateBounds: bounds }
      }
      const current = await buildRangeMetrics({ start: bounds.start, end: bounds.end })
      const previousRange = getPreviousRange({ start: bounds.start, end: bounds.end })
      if (!previousRange) return current

      const previous = await buildRangeMetrics(previousRange)
      const previousByKey = new Map(previous.metrics.map((metric) => [metric.key, metric.value]))
      const withTrend = current.metrics.map((metric) => ({
        ...metric,
        trend: computeTrendPercent(metric.value, previousByKey.get(metric.key) ?? null),
      }))

      return { ...current, metrics: withTrend }
    },
    enabled: Boolean(session) && Boolean(params.farmId),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: true,
  })
}

export function useProductionSummaryMetrics(params: {
  farmId?: string | null
  stage: "all" | Enums<"system_growth_stage">
  batch?: string
  system?: string
  timePeriod?: Enums<"time_period">
  periodParam?: string | null
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

      const scopedSystemIds = await resolveScopedSystemIds({
        farmId: params.farmId ?? null,
        stage: params.stage ?? "all",
        system: params.system,
        batch: params.batch ?? "all",
        signal,
      })
      if (scopedSystemIds === null || scopedSystemIds.length === 0) return empty

      const bounds = await getTimePeriodBounds(
        params.periodParam ?? params.timePeriod ?? "2 weeks",
        signal,
        params.farmId ?? null,
      )
      if (!bounds.start || !bounds.end) {
        return {
          ...empty,
          dateBounds: bounds,
        }
      }

      const singleSystemId = scopedSystemIds.length === 1 ? scopedSystemIds[0] : undefined
      const summaryResult = await getProductionSummary({
        farmId: params.farmId ?? null,
        systemId: singleSystemId,
        stage: params.stage === "all" ? undefined : params.stage,
        dateFrom: bounds.start,
        dateTo: bounds.end,
        limit: 5000,
        signal,
      })
      if (summaryResult.status !== "success") {
        return {
          ...empty,
          dateBounds: bounds,
        }
      }

      const batchId =
        params.batch && params.batch !== "all" && Number.isFinite(Number(params.batch))
          ? Number(params.batch)
          : undefined
      const transferResult = await getTransferData({
        batchId,
        dateFrom: bounds.start,
        dateTo: bounds.end,
        limit: 5000,
        signal,
      })
      if (transferResult.status !== "success") {
        return {
          ...empty,
          dateBounds: bounds,
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
        dateBounds: bounds,
      } as ProductionSummaryMetrics
    },
    enabled: Boolean(session) && Boolean(params.farmId),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: true,
  })
}

export function useSystemsTable(params: {
  farmId?: string | null
  stage: Enums<"system_growth_stage"> | "all"
  batch?: string
  system?: string
  timePeriod?: Enums<"time_period">
  periodParam?: string | null
  includeIncomplete?: boolean
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

      const bounds = await getTimePeriodBounds(
        params.periodParam ?? params.timePeriod ?? "2 weeks",
        signal,
        farmId,
      )
      const startDate = bounds.start ?? null
      const endDate = bounds.end ?? null

      const stage = params.stage === "all" ? null : params.stage
      const parsedSystemId = params.system && params.system !== "all" ? Number(params.system) : null
      const systemId = Number.isFinite(parsedSystemId) ? (parsedSystemId as number) : null
      const scopedSystemIds = await resolveScopedSystemIds({
        farmId,
        stage: params.stage,
        batch: params.batch ?? "all",
        system: params.system,
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
  })
}

export function useProductionTrend(params: {
  farmId?: string | null
  stage?: Enums<"system_growth_stage">
  batch?: string
  system?: string
  timePeriod: Enums<"time_period"> | string
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
    ],
    queryFn: async ({ signal }) => {
      const scopedSystemIds = await resolveScopedSystemIds({
        farmId: params.farmId ?? null,
        stage: (params.stage ?? "all") as "all" | Enums<"system_growth_stage">,
        batch: params.batch ?? "all",
        system: params.system,
        signal,
      })
      if (scopedSystemIds === null || scopedSystemIds.length === 0) return []
      const systemId = scopedSystemIds.length === 1 ? scopedSystemIds[0] : undefined
      const bounds = await getTimePeriodBounds(params.timePeriod, signal, params.farmId ?? null)
      const summaryResult = await getProductionSummary({
        farmId: params.farmId ?? null,
        stage: params.stage ?? undefined,
        systemId,
        dateFrom: bounds.start ?? undefined,
        dateTo: bounds.end ?? undefined,
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
  })
}

export function useRecentActivities(params?: {
  tableName?: string
  changeType?: Enums<"change_type_enum">
  dateFrom?: string
  dateTo?: string
  limit?: number
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
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60_000,
  })
}

export function useRecommendedActions(params: {
  farmId?: string | null
  stage?: "all" | Enums<"system_growth_stage">
  batch?: string
  system?: string
  timePeriod?: Enums<"time_period">
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
    ],
    queryFn: async ({ signal }) => {
      const scopedSystemIds = await resolveScopedSystemIds({
        farmId: params.farmId ?? null,
        stage: params.stage ?? "all",
        batch: params.batch ?? "all",
        system: params.system,
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
      const bounds = await getTimePeriodBounds(params.timePeriod ?? "2 weeks", signal, params.farmId ?? null)
      const inventoryResult = await getDailyFishInventory({
        farmId: params.farmId ?? null,
        systemId,
        dateFrom: bounds.start ?? undefined,
        dateTo: bounds.end ?? undefined,
        limit: 1000,
        signal,
      })
      const wqResult = await getWaterQualityRatings({
        farmId: params.farmId ?? null,
        systemId,
        dateFrom: bounds.start ?? undefined,
        dateTo: bounds.end ?? undefined,
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

      const inventoryRows = inventoryResult.data.filter(
        (row) => row.system_id != null && scopedSystemIds.includes(row.system_id),
      )
      const wqRows = wqResult.data.filter(
        (row) => row.system_id != null && scopedSystemIds.includes(row.system_id),
      )

      const latestInventoryDate = inventoryRows
        .map((row) => row.inventory_date)
        .filter(Boolean)
        .sort()
        .pop() as string | undefined

      const latestInventory = latestInventoryDate
        ? inventoryRows.filter((row) => row.inventory_date === latestInventoryDate)
        : []

      const mortalityRate =
        latestInventory.length > 0
          ? latestInventory.reduce((sum, row) => {
              if (typeof row.mortality_rate === "number") return sum + row.mortality_rate
              const fish = row.number_of_fish ?? 0
              const mortality = row.number_of_fish_mortality ?? 0
              return fish > 0 ? sum + (mortality / fish) * 100 : sum
            }, 0) / latestInventory.length
          : null

      const feedingRate =
        latestInventory.length > 0
          ? latestInventory.reduce((sum, row) => {
              if (typeof row.feeding_rate === "number") return sum + row.feeding_rate
              const feed = row.feeding_amount ?? 0
              const biomass = row.biomass_last_sampling ?? 0
              return biomass > 0 ? sum + (feed * 1000) / biomass : sum
            }, 0) / latestInventory.length
          : null

      const latestWqDate = wqRows
        .map((row) => row.rating_date)
        .filter(Boolean)
        .sort()
        .pop() as string | undefined

      const latestWq = latestWqDate ? wqRows.filter((row) => row.rating_date === latestWqDate) : []
      const waterQuality =
        latestWq.length > 0
          ? Math.round(
              latestWq.reduce((sum, row) => sum + (row.rating_numeric ?? 0), 0) / latestWq.length,
            )
          : null

      const nextActions: Array<{
        title: string
        description: string
        priority: "High" | "Medium" | "Info"
        due: string
      }> = []

      if (waterQuality !== null && waterQuality <= 1) {
        nextActions.push({
          title: "Water Quality Check",
          description: "Critical water quality detected. Run a full parameter test and correct immediately.",
          priority: "High",
          due: "Today",
        })
      } else if (waterQuality !== null && waterQuality === 2) {
        nextActions.push({
          title: "Stabilize Water Quality",
          description: "Water quality rating is below optimal. Inspect aeration and filtration.",
          priority: "Medium",
          due: "This week",
        })
      }

      if (mortalityRate !== null && mortalityRate > 0.02) {
        nextActions.push({
          title: "Mortality Investigation",
          description: "Mortality rate is elevated. Review recent handling, feeding, and water quality logs.",
          priority: "High",
          due: "This week",
        })
      } else if (mortalityRate !== null && mortalityRate > 0.01) {
        nextActions.push({
          title: "Monitor Mortality",
          description: "Mortality rate is trending up. Add an extra health inspection.",
          priority: "Medium",
          due: "This week",
        })
      }

      if (feedingRate !== null && feedingRate > 40) {
        nextActions.push({
          title: "Adjust Feeding Plan",
          description: "Feeding rate (kg/t) is above target. Review feed schedule and check consumption.",
          priority: "Medium",
          due: "Next 3 days",
        })
      } else if (feedingRate !== null && feedingRate < 15) {
        nextActions.push({
          title: "Review Feed Intake",
          description: "Feeding rate (kg/t) is below target. Verify appetite and update feeding logs.",
          priority: "Info",
          due: "Next 3 days",
        })
      }

      if (!nextActions.length) {
        nextActions.push({
          title: "Routine System Review",
          description: "No critical issues detected. Continue routine checks for water and feeding.",
          priority: "Info",
          due: "This week",
        })
      }

      return nextActions.slice(0, 3)
    },
    enabled: Boolean(session) && Boolean(params.farmId),
    staleTime: 5 * 60_000,
  })
}



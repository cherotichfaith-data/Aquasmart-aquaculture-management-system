"use client"

import { useQuery } from "@tanstack/react-query"
import type { Enums } from "@/lib/types/database"
import { useAuth } from "@/components/providers/auth-provider"
import {
  getDashboardConsolidatedSnapshot,
  getDashboardSnapshot,
  getSystemsDashboard,
  getTimePeriodBounds,
} from "@/lib/api/dashboard"
import { parseDateToTimePeriod, sortByDateAsc } from "@/lib/utils"
import { getDailyFishInventory } from "@/lib/api/inventory"
import { getWaterQualityRatings } from "@/lib/api/water-quality"
import { getSystemOptions } from "@/lib/api/options"
import { getProductionSummary } from "@/lib/api/production"
import { getRecentActivities, getFeedIncomingWithType } from "@/lib/api/reports"

const computeMortalityRateFromProduction = (
  rows: Array<{ number_of_fish_inventory: number | null; daily_mortality_count: number | null }>,
): number | null => {
  let weightedMortality = 0
  let totalFish = 0
  rows.forEach((row) => {
    const fish = row.number_of_fish_inventory ?? 0
    const mortality = row.daily_mortality_count ?? 0
    if (fish > 0) {
      weightedMortality += ((mortality / fish) * 100) * fish
      totalFish += fish
    }
  })
  return totalFish > 0 ? weightedMortality / totalFish : null
}

export function useDashboardSnapshot(params?: {
  systemId?: number
  stage?: Enums<"system_growth_stage">
  timePeriod?: Enums<"time_period">
  farmId?: string | null
  enabled?: boolean
}) {
  const { session } = useAuth()
  const enabled = Boolean(session) && Boolean(params?.farmId) && (params?.enabled ?? true)
  return useQuery({
    queryKey: [
      "dashboard",
      "snapshot",
      params?.farmId ?? "all",
      params?.systemId ?? "all",
      params?.stage ?? "all",
      params?.timePeriod ?? "2 weeks",
    ],
    queryFn: ({ signal }) => getDashboardSnapshot({ ...params, farmId: params?.farmId ?? null, signal }),
    enabled,
    staleTime: 5 * 60_000,
  })
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

export function useSystemsDashboard(params?: {
  systemId?: number
  stage?: Enums<"system_growth_stage">
  timePeriod?: Enums<"time_period">
  dateFrom?: string
  dateTo?: string
  limit?: number
  farmId?: string | null
}) {
  const { session } = useAuth()
  const enabled = Boolean(session) && Boolean(params?.farmId)
  return useQuery({
    queryKey: [
      "dashboard",
      "systems",
      params?.farmId ?? "all",
      params?.systemId ?? "all",
      params?.stage ?? "all",
      params?.timePeriod ?? "2 weeks",
      params?.dateFrom ?? "",
      params?.dateTo ?? "",
    ],
    queryFn: ({ signal }) => getSystemsDashboard({ ...params, farmId: params?.farmId ?? null, signal }),
    enabled,
    staleTime: 5 * 60_000,
  })
}

export function useTimePeriodBounds(timePeriod: Enums<"time_period"> | string, farmId?: string | null) {
  const { session } = useAuth()
  return useQuery({
    queryKey: ["dashboard", "time-bounds", farmId ?? "all", timePeriod],
    queryFn: ({ signal }) => getTimePeriodBounds(timePeriod, signal, farmId ?? null),
    enabled: Boolean(session) && Boolean(farmId),
    staleTime: 5 * 60_000,
  })
}

export type HealthSummaryState = {
  waterQuality: { title: string; status: string; tone: "good" | "warn" | "bad"; progress: number; detail?: string } | null
  fishHealth: { title: string; status: string; tone: "good" | "warn" | "bad"; progress: number; detail?: string } | null
}

export function useHealthSummary(params: {
  farmId?: string | null
  system?: string
  timePeriod?: Enums<"time_period">
  periodParam?: string | null
}) {
  const { session } = useAuth()
  return useQuery({
    queryKey: ["health-summary", params.farmId ?? "all", params.system ?? "all", params.periodParam ?? params.timePeriod ?? "2 weeks"],
    queryFn: async ({ signal }) => {
      const ratingToneMap: Record<string, { status: string; tone: "good" | "warn" | "bad"; progress: number }> = {
        optimal: { status: "Good", tone: "good", progress: 0.85 },
        acceptable: { status: "Fair", tone: "warn", progress: 0.6 },
        critical: { status: "Poor", tone: "bad", progress: 0.35 },
        lethal: { status: "Critical", tone: "bad", progress: 0.2 },
      }

      const systemId = params.system && params.system !== "all" ? Number(params.system) : undefined
      const resolvedSystemId = Number.isFinite(systemId) ? systemId : undefined
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

      if (hasCustomRange) {
        const wqResult = await getWaterQualityRatings({
          farmId: params.farmId ?? null,
          systemId: resolvedSystemId,
          dateFrom: bounds.start!,
          dateTo: bounds.end!,
          limit: 2000,
          signal,
        })

        const invResult = await getDailyFishInventory({
          farmId: params.farmId ?? null,
          systemId: resolvedSystemId,
          dateFrom: bounds.start!,
          dateTo: bounds.end!,
          limit: 2000,
          signal,
        })

        if (wqResult.status === "success" && wqResult.data.length) {
          const avg =
            wqResult.data.reduce((sum, row) => sum + (row.rating_numeric ?? 0), 0) / wqResult.data.length
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
          const totalMortality = invResult.data.reduce((sum, row) => sum + (row.number_of_fish_mortality ?? 0), 0)
          const totalFish = invResult.data.reduce((sum, row) => sum + (row.number_of_fish ?? 0), 0)
          if (totalFish > 0) {
            fishState.detail = `Mortality rate: ${totalMortality / totalFish}`
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
          fishState.detail = `Mortality rate: ${snapshot.mortality_rate}`
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
          fishState.detail = `Mortality rate: ${snapshot.mortality_rate}`
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
        const systemId = params.system && params.system !== "all" ? Number(params.system) : undefined
        let systemIds: number[] | undefined

        if (!Number.isFinite(systemId) && params.stage !== "all") {
          const systemsResult = await getSystemOptions({
            farmId: params.farmId ?? null,
            stage: params.stage,
            activeOnly: true,
            signal,
          })
          if (systemsResult.status !== "success") {
            return { metrics: [], dateBounds: range }
          }
          systemIds = systemsResult.data.map((row) => row.id as number)
        }

        const inventoryResult = await getDailyFishInventory({
          farmId: params.farmId ?? null,
          systemId: Number.isFinite(systemId) ? (systemId as number) : undefined,
          dateFrom: range.start,
          dateTo: range.end,
          limit: 5000,
          signal,
        })

        const productionResult = await getProductionSummary({
          farmId: params.farmId ?? null,
          systemId: Number.isFinite(systemId) ? (systemId as number) : undefined,
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
        const inventoryRows = systemIds
          ? inventoryRowsRaw.filter((row) => row.system_id != null && systemIds.includes(row.system_id))
          : inventoryRowsRaw
        const productionRows = systemIds
          ? productionRowsRaw.filter((row) => row.system_id != null && systemIds.includes(row.system_id))
          : productionRowsRaw

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
                : (mortalityCount / fish) * 100
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
          systemId: Number.isFinite(systemId) ? (systemId as number) : undefined,
          dateFrom: range.start,
          dateTo: range.end,
          limit: 2000,
          signal,
        })
        if (wqResult.status !== "success") {
          return { metrics: [], dateBounds: range }
        }
        const wqRows = systemIds
          ? wqResult.data.filter((row) => row.system_id != null && systemIds.includes(row.system_id))
          : wqResult.data
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
            label: "Daily Mortality Rate",
            value: mortalityRate,
            unit: "%",
            decimals: 2,
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
      return buildRangeMetrics({ start: bounds.start, end: bounds.end })
    },
    enabled: Boolean(session) && Boolean(params.farmId),
    staleTime: 5 * 60_000,
  })
}

export function useSystemsTable(params: {
  farmId?: string | null
  stage: Enums<"system_growth_stage"> | "all"
  system?: string
  timePeriod?: Enums<"time_period">
  periodParam?: string | null
}) {
  const { session } = useAuth()
  return useQuery({
    queryKey: ["systems-table", params.farmId ?? "all", params.stage, params.system ?? "all", params.timePeriod ?? "2 weeks", params.periodParam ?? ""],
    queryFn: async ({ signal }) => {
      try {
        const systemId = params.system && params.system !== "all" ? Number(params.system) : undefined
        const stageFilter = params.stage === "all" ? null : params.stage
        const systemIds: number[] = []
        if (Number.isFinite(systemId)) {
          systemIds.push(systemId as number)
        } else {
          const systemsResult = await getSystemOptions({
            farmId: params.farmId ?? null,
            stage: stageFilter ?? undefined,
            activeOnly: true,
            signal,
          })
          if (systemsResult.status !== "success") {
            return {
              rows: [] as any[],
              meta: { reason: "System options error", error: systemsResult.error ?? "Unknown", farmId: params.farmId ?? null },
            }
          }
          systemsResult.data.forEach((row) => systemIds.push(row.id as number))
        }

        if (!systemIds.length) {
          return {
            rows: [] as any[],
            meta: { reason: "No system IDs resolved", systemIds, farmId: params.farmId ?? null },
          }
        }

        const bounds = await getTimePeriodBounds(
          params.periodParam ?? params.timePeriod ?? "2 weeks",
          signal,
          params.farmId ?? null,
        )

        const buildTableForRange = async (range: { start: string; end: string }) => {
        const inventoryResult = await getDailyFishInventory({
          farmId: params.farmId ?? null,
          dateFrom: range.start,
          dateTo: range.end,
          limit: 5000,
          signal,
        })

        const summaryResult = await getProductionSummary({
          farmId: params.farmId ?? null,
          dateFrom: range.start,
          dateTo: range.end,
          limit: 5000,
          signal,
        })

        const systemsResult = await getSystemOptions({
          farmId: params.farmId ?? null,
          stage: stageFilter ?? undefined,
          signal,
        })

        const wqResult = await getWaterQualityRatings({
          farmId: params.farmId ?? null,
          dateFrom: range.start,
          dateTo: range.end,
          limit: 2000,
          signal,
        })

        const bySystem: Record<number, any> = {}
        if (systemsResult.status === "success") {
          systemsResult.data
            .filter((row) => row.id != null && systemIds.includes(row.id))
            .forEach((row) => {
              const systemId = row.id as number
              bySystem[systemId] = {
                system_id: systemId,
                system_name: row.label,
                growth_stage: row.growth_stage,
                input_start_date: range.start,
                input_end_date: range.end,
                sampling_end_date: null,
                abw: null,
                efcr: null,
                feeding_rate: null,
                mortality_rate: null,
                biomass_density: null,
                water_quality_rating_average: null,
              }
            })
        }

        const invAgg: Record<
          number,
          {
            feed: number
            biomass: number
            biomassCount: number
            mortalityCount: number
            fish: number
            fishCount: number
            volume: number
            volumeCount: number
            mortalityWeighted: number
            feedingWeighted: number
            densityWeighted: number
            densityCount: number
          }
        > = {}

        ;((inventoryResult.status === "success" ? inventoryResult.data : []) ?? [])
          .filter((row) => systemIds.includes(row.system_id as number))
          .forEach((row) => {
            const id = row.system_id as number
            if (!invAgg[id]) {
              invAgg[id] = {
                feed: 0,
                biomass: 0,
                biomassCount: 0,
                mortalityCount: 0,
                fish: 0,
                fishCount: 0,
                volume: 0,
                volumeCount: 0,
                mortalityWeighted: 0,
                feedingWeighted: 0,
                densityWeighted: 0,
                densityCount: 0,
              }
            }

            const feed = row.feeding_amount ?? 0
            const biomass = row.biomass_last_sampling
            const fish = row.number_of_fish
            const mortalityCount = row.number_of_fish_mortality ?? 0
            const volume = row.system_volume

            invAgg[id].feed += feed
            invAgg[id].mortalityCount += mortalityCount

            if (typeof biomass === "number") {
              invAgg[id].biomass += biomass
              invAgg[id].biomassCount += 1
            }
            if (typeof fish === "number") {
              invAgg[id].fish += fish
              invAgg[id].fishCount += 1
            }
            if (typeof volume === "number") {
              invAgg[id].volume += volume
              invAgg[id].volumeCount += 1
            }

            if (typeof fish === "number" && fish > 0) {
              const mortalityRateRow =
                typeof row.mortality_rate === "number"
                  ? row.mortality_rate
                  : (mortalityCount / fish) * 100
              invAgg[id].mortalityWeighted += mortalityRateRow * fish
            }

            if (typeof biomass === "number" && biomass > 0) {
              const feedingRateRow =
                typeof row.feeding_rate === "number"
                  ? row.feeding_rate
                  : (feed * 1000) / biomass
              invAgg[id].feedingWeighted += feedingRateRow * biomass
            }

            if (typeof row.biomass_density === "number") {
              invAgg[id].densityWeighted += row.biomass_density
              invAgg[id].densityCount += 1
            }
          })

        const psAgg: Record<
          number,
          {
            feed: number
            gain: number
            abw: number | null
            lastDate: string | null
            totalBiomass: number
            biomassCount: number
            biomassWeightedFeeding: number
            mortalityWeighted: number
            totalFish: number
          }
        > = {}
        ;((summaryResult.status === "success" ? summaryResult.data : []) ?? [])
          .filter((row) => systemIds.includes(row.system_id as number))
          .forEach((row) => {
            const id = row.system_id as number
            if (!psAgg[id]) {
              psAgg[id] = {
                feed: 0,
                gain: 0,
                abw: null,
                lastDate: null,
                totalBiomass: 0,
                biomassCount: 0,
                biomassWeightedFeeding: 0,
                mortalityWeighted: 0,
                totalFish: 0,
              }
            }
            const gain =
              (row.biomass_increase_period ?? 0) -
              (row.total_weight_transfer_out ?? 0) +
              (row.total_weight_transfer_in ?? 0) +
              (row.total_weight_harvested ?? 0) -
              (row.total_weight_stocked ?? 0)
            psAgg[id].feed += row.total_feed_amount_period ?? 0
            psAgg[id].gain += gain
            const biomass = row.total_biomass ?? 0
            if (biomass > 0) {
              const feedingRateFromProduction = ((row.total_feed_amount_period ?? 0) * 1000) / biomass
              psAgg[id].biomassWeightedFeeding += feedingRateFromProduction * biomass
              psAgg[id].totalBiomass += biomass
              psAgg[id].biomassCount += 1
            }
            const fish = row.number_of_fish_inventory ?? 0
            const mortality = row.daily_mortality_count ?? 0
            if (fish > 0) {
              psAgg[id].mortalityWeighted += ((mortality / fish) * 100) * fish
              psAgg[id].totalFish += fish
            }
            if (row.average_body_weight != null) {
              if (!psAgg[id].lastDate || String(row.date) >= psAgg[id].lastDate!) {
                psAgg[id].abw = row.average_body_weight
                psAgg[id].lastDate = String(row.date)
              }
            }
          })

        const wqAgg: Record<number, { sum: number; count: number }> = {}
        if (wqResult.status === "success") {
          wqResult.data.forEach((row) => {
            if (row.system_id == null) return
            if (!systemIds.includes(row.system_id)) return
            const id = row.system_id as number
            if (!wqAgg[id]) wqAgg[id] = { sum: 0, count: 0 }
            const numeric = typeof row.rating_numeric === "number" ? row.rating_numeric : null
            if (numeric != null) {
              wqAgg[id].sum += numeric
              wqAgg[id].count += 1
            }
          })
        }

        Object.keys(bySystem).forEach((key) => {
          const id = Number(key)
          const inv = invAgg[id]
          const ps = psAgg[id]
          const wq = wqAgg[id]

          const avgBiomassFromInventory = inv && inv.biomassCount > 0 ? inv.biomass / inv.biomassCount : null
          const avgBiomassFromProduction = ps && ps.biomassCount > 0 ? ps.totalBiomass / ps.biomassCount : null
          const avgBiomass = avgBiomassFromInventory ?? avgBiomassFromProduction
          const feedingRateFromInventory =
            inv && inv.biomass > 0
              ? inv.feedingWeighted > 0
                ? inv.feedingWeighted / inv.biomass
                : (inv.feed * 1000) / inv.biomass
              : null
          const feedingRateFromProduction =
            ps && ps.totalBiomass > 0 ? ps.biomassWeightedFeeding / ps.totalBiomass : null
          const feedingRate = feedingRateFromInventory ?? feedingRateFromProduction
          const mortalityRateFromInventory = inv && inv.fish > 0 ? inv.mortalityWeighted / inv.fish : null
          const mortalityRateFromProduction = ps && ps.totalFish > 0 ? ps.mortalityWeighted / ps.totalFish : null
          const mortalityRate = mortalityRateFromInventory ?? mortalityRateFromProduction
          const avgVolume = inv && inv.volumeCount > 0 ? inv.volume / inv.volumeCount : null
          const biomassDensity =
            inv && inv.densityCount > 0
              ? inv.densityWeighted / inv.densityCount
              : avgVolume && avgVolume > 0 && avgBiomass ? avgBiomass / avgVolume : null
          const efcr = ps && ps.gain !== 0 ? ps.feed / ps.gain : null

          let wqLabel: string | null = null
          if (wq && wq.count > 0) {
            const avg = Math.round((wq.sum / wq.count))
            if (avg === 0) wqLabel = "lethal"
            else if (avg === 1) wqLabel = "critical"
            else if (avg === 2) wqLabel = "acceptable"
            else if (avg === 3) wqLabel = "optimal"
          }

          bySystem[id].abw = ps?.abw ?? null
          bySystem[id].sampling_end_date = ps?.lastDate ?? null
          bySystem[id].efcr = efcr
          bySystem[id].feeding_rate = feedingRate
          bySystem[id].mortality_rate = mortalityRate
          bySystem[id].biomass_density = biomassDensity
          bySystem[id].water_quality_rating_average = wqLabel
        })

        const rows = Object.values(bySystem)
          .filter((row) => (stageFilter ? row.growth_stage === stageFilter : true))
          .sort((a, b) => String(a.system_name ?? "").localeCompare(String(b.system_name ?? "")))

          return {
            rows,
            meta: { source: "range", systemIds, start: range.start, end: range.end },
          }
        }

        if (!bounds.start || !bounds.end) {
          return {
            rows: [] as any[],
            meta: { reason: "Missing period bounds", farmId: params.farmId ?? null },
          }
        }
        return buildTableForRange({ start: bounds.start, end: bounds.end })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { rows: [] as any[], meta: { reason: "Unhandled error", error: message } }
      }
    },
    enabled: Boolean(session) && Boolean(params.farmId),
    staleTime: 5 * 60_000,
  })
}

export function useProductionTrend(params: {
  farmId?: string | null
  stage?: Enums<"system_growth_stage">
  system?: string
  timePeriod: Enums<"time_period"> | string
}) {
  const { session } = useAuth()
  return useQuery({
    queryKey: ["production-trend", params.farmId ?? "all", params.stage ?? "all", params.system ?? "all", params.timePeriod],
    queryFn: async ({ signal }) => {
      const systemId = params.system && params.system !== "all" ? Number(params.system) : undefined
      const bounds = await getTimePeriodBounds(params.timePeriod, signal, params.farmId ?? null)
      const summaryResult = await getProductionSummary({
        farmId: params.farmId ?? null,
        stage: params.stage ?? undefined,
        systemId: Number.isFinite(systemId) ? systemId : undefined,
        dateFrom: bounds.start ?? undefined,
        dateTo: bounds.end ?? undefined,
        limit: 500,
        signal,
      })
      if (summaryResult.status !== "success") return []
      return sortByDateAsc(summaryResult.data, (row) => row.date)
    },
    enabled: Boolean(session) && Boolean(params.farmId),
    staleTime: 5 * 60_000,
  })
}

export function useRecentActivities(params?: { limit?: number }) {
  return useQuery({
    queryKey: ["recent-activities", params?.limit ?? 5],
    queryFn: ({ signal }) => getRecentActivities({ limit: params?.limit ?? 5, signal }),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60_000,
  })
}

export function useRecommendedActions(params: {
  farmId?: string | null
  system?: string
  timePeriod?: Enums<"time_period">
}) {
  const { session } = useAuth()
  return useQuery({
    queryKey: ["recommended-actions", params.farmId ?? "all", params.system ?? "all", params.timePeriod ?? "2 weeks"],
    queryFn: async ({ signal }) => {
      const systemId = params.system && params.system !== "all" ? Number(params.system) : undefined
      const bounds = await getTimePeriodBounds(params.timePeriod ?? "2 weeks", signal, params.farmId ?? null)
      const inventoryResult = await getDailyFishInventory({
        farmId: params.farmId ?? null,
        systemId: Number.isFinite(systemId) ? (systemId as number) : undefined,
        dateFrom: bounds.start ?? undefined,
        dateTo: bounds.end ?? undefined,
        limit: 1000,
        signal,
      })
      const wqResult = await getWaterQualityRatings({
        farmId: params.farmId ?? null,
        systemId: Number.isFinite(systemId) ? (systemId as number) : undefined,
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

      const inventoryRows = inventoryResult.data
      const wqRows = wqResult.data

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

      if (feedingRate !== null && feedingRate > 0.04) {
        nextActions.push({
          title: "Adjust Feeding Plan",
          description: "Feeding rate is above target. Review feed schedule and check consumption.",
          priority: "Medium",
          due: "Next 3 days",
        })
      } else if (feedingRate !== null && feedingRate < 0.015) {
        nextActions.push({
          title: "Review Feed Intake",
          description: "Feeding rate is below target. Verify appetite and update feeding logs.",
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

export function useRecentFeedDeliveries(params?: { limit?: number }) {
  return useQuery({
    queryKey: ["inventory-summary", "feed-deliveries", params?.limit ?? 10],
    queryFn: ({ signal }) => getFeedIncomingWithType({ limit: params?.limit ?? 10, signal }),
    staleTime: 5 * 60_000,
  })
}


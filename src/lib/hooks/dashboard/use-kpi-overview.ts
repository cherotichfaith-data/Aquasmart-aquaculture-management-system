"use client"

import { useQuery } from "@tanstack/react-query"
import type { Enums } from "@/lib/types/database"
import { useAuth } from "@/components/providers/auth-provider"
import type { KPIOverviewMetric } from "@/features/dashboard/types"
import {
  computeMortalityRateFromProduction,
  toTrendPercent,
} from "@/features/dashboard/analytics-shared"
import { getDashboardConsolidated } from "@/lib/api/dashboard"
import { getDailyFishInventory } from "@/lib/api/inventory"
import { getProductionSummary } from "@/lib/api/production"
import { getWaterQualityRatings } from "@/lib/api/water-quality"
import type { TimePeriod } from "@/lib/time-period"
import { resolveScopedSystemIds } from "./shared"

export function useKpiOverview(params: {
  farmId?: string | null
  stage: "all" | Enums<"system_growth_stage">
  timePeriod: TimePeriod
  batch?: string
  system?: string
  dateFrom?: string | null
  dateTo?: string | null
  scopedSystemIds?: number[] | null
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
          scopedSystemIds: params.scopedSystemIds,
        })
        if (scopedSystemIds === null) return { metrics: [], dateBounds: range }
        if (Array.isArray(scopedSystemIds) && scopedSystemIds.length === 0) return { metrics: [], dateBounds: range }
        const singleSystemId = Array.isArray(scopedSystemIds) && scopedSystemIds.length === 1 ? scopedSystemIds[0] : undefined

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
        const scopedIdSet = Array.isArray(scopedSystemIds) ? new Set(scopedSystemIds) : null
        const inventoryRows = scopedIdSet
          ? inventoryRowsRaw.filter((row) => row.system_id != null && scopedIdSet.has(row.system_id))
          : inventoryRowsRaw
        const productionRows = scopedIdSet
          ? productionRowsRaw.filter((row) => row.system_id != null && scopedIdSet.has(row.system_id))
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
        const wqRows = scopedIdSet
          ? wqResult.data.filter((row) => row.system_id != null && scopedIdSet.has(row.system_id))
          : wqResult.data
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

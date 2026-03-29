"use client"

import { useQuery } from "@tanstack/react-query"
import type { Enums } from "@/lib/types/database"
import { useAuth } from "@/components/providers/auth-provider"
import type { KPIOverviewMetric } from "@/features/dashboard/types"
import { scaleFractionToPercent } from "@/lib/analytics-format"
import {
  aggregateInventoryMetrics,
  computeEfcrFromProductionRows,
  computeMortalityRateFromProduction,
  toTrendDelta,
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
  const canUseInitialData =
    Boolean(params.initialData) &&
    Boolean(params.dateFrom) &&
    Boolean(params.dateTo) &&
    params.initialData?.dateBounds.start === params.dateFrom &&
    params.initialData?.dateBounds.end === params.dateTo

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

        const inventoryMetrics = aggregateInventoryMetrics(inventoryRows)
        const efcr = computeEfcrFromProductionRows(productionRows)
        const mortalityRateFromProduction = computeMortalityRateFromProduction(
          productionRows.map((row) => ({
            number_of_fish_inventory: row.number_of_fish_inventory,
            daily_mortality_count: row.daily_mortality_count,
          })),
        )
        const mortalityRate = inventoryMetrics.mortalityRate ?? mortalityRateFromProduction

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
        const consolidatedResult = singleSystemId
          ? await getDashboardConsolidated({
              farmId: params.farmId ?? null,
              systemId: singleSystemId,
              dateFrom: range.start,
              dateTo: range.end,
              signal,
            })
          : null
        const consolidatedRow =
          consolidatedResult?.status === "success" ? consolidatedResult.data[0] ?? null : null

        const resolvedEfcr = consolidatedRow?.efcr_period_consolidated ?? efcr
        const resolvedMortalityRate = consolidatedRow?.mortality_rate ?? mortalityRate
        const resolvedAvgBiomass = consolidatedRow?.average_biomass ?? inventoryMetrics.averageBiomass
        const resolvedBiomassDensity = consolidatedRow?.biomass_density ?? inventoryMetrics.biomassDensity
        const resolvedFeedingRate = consolidatedRow?.feeding_rate ?? inventoryMetrics.feedingRate
        const resolvedAbw = consolidatedRow?.abw_asof_end ?? inventoryMetrics.abwAsOfEnd
        const displayedMortalityRate = scaleFractionToPercent(resolvedMortalityRate)
        const displayedFeedingRate = scaleFractionToPercent(resolvedFeedingRate)
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
              efcr: toTrendDelta(consolidatedRow.efcr_period_consolidated_delta),
              mortality: scaleFractionToPercent(toTrendDelta(consolidatedRow.mortality_rate_delta)),
              biomass: toTrendDelta(consolidatedRow.average_biomass_delta),
              biomass_density: toTrendDelta(consolidatedRow.biomass_density_delta),
              feeding: scaleFractionToPercent(toTrendDelta(consolidatedRow.feeding_rate_delta)),
              abw: toTrendDelta(consolidatedRow.abw_asof_end_delta),
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
            trendFormat: "delta",
            trendDecimals: 2,
            invertTrend: true,
          },
          {
            key: "mortality",
            label: "Mortality Rate",
            value: displayedMortalityRate,
            unit: "%/day",
            decimals: 2,
            trend: trendByKey.mortality ?? null,
            trendFormat: "delta",
            trendDecimals: 2,
            trendUnit: "%/day",
            invertTrend: true,
          },
          {
            key: "abw",
            label: "Avg Body Weight",
            value: resolvedAbw,
            unit: "g",
            decimals: 1,
            trend: trendByKey.abw ?? null,
            trendFormat: "delta",
            trendDecimals: 1,
            trendUnit: "g",
            invertTrend: false,
          },
          {
            key: "biomass",
            label: "Avg Biomass",
            value: resolvedAvgBiomass,
            unit: "kg",
            decimals: 1,
            trend: trendByKey.biomass ?? null,
            trendFormat: "delta",
            trendDecimals: 1,
            trendUnit: "kg",
            invertTrend: false,
          },
          {
            key: "biomass_density",
            label: "Biomass Density",
            value: resolvedBiomassDensity,
            unit: "kg/m3",
            decimals: 2,
            trend: trendByKey.biomass_density ?? null,
            trendFormat: "delta",
            trendDecimals: 2,
            trendUnit: "kg/m3",
            invertTrend: false,
          },
          {
            key: "feeding",
            label: "Feeding Rate",
            value: displayedFeedingRate,
            unit: "% BW/day",
            decimals: 2,
            trend: trendByKey.feeding ?? null,
            trendFormat: "delta",
            trendDecimals: 2,
            trendUnit: "% BW/day",
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
    enabled: Boolean(session) && Boolean(params.farmId) && Boolean(params.dateFrom) && Boolean(params.dateTo),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: true,
    initialData: canUseInitialData ? params.initialData : undefined,
    initialDataUpdatedAt: canUseInitialData ? 0 : undefined,
  })
}

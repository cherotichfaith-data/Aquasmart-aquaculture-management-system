"use client"

import { useQuery } from "@tanstack/react-query"
import type { Enums } from "@/lib/types/database"
import { useAuth } from "@/components/providers/auth-provider"
import type { ProductionSummaryMetrics } from "@/features/dashboard/types"
import { getProductionSummary } from "@/lib/api/production"
import { getTransferData } from "@/lib/api/reports"
import type { TimePeriod } from "@/lib/time-period"
import { resolveScopedSystemIds } from "./shared"

export function useProductionSummaryMetrics(params: {
  farmId?: string | null
  stage: "all" | Enums<"system_growth_stage">
  batch?: string
  system?: string
  timePeriod?: TimePeriod
  dateFrom?: string | null
  dateTo?: string | null
  scopedSystemIds?: number[] | null
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
      params.timePeriod ?? "2 weeks",
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
        scopedSystemIds: params.scopedSystemIds,
      })
      if (scopedSystemIds === null) return empty
      if (Array.isArray(scopedSystemIds) && scopedSystemIds.length === 0) return empty

      const singleSystemId = Array.isArray(scopedSystemIds) && scopedSystemIds.length === 1 ? scopedSystemIds[0] : undefined
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

      const scopedSet = Array.isArray(scopedSystemIds) ? new Set(scopedSystemIds) : null
      const filtered = scopedSet
        ? summaryResult.data.filter((row) => row.system_id != null && scopedSet.has(row.system_id))
        : summaryResult.data

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

      const netTransferAdjustments =
        scopedSet === null
          ? 0
          : transferResult.data.reduce((sum, row) => {
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

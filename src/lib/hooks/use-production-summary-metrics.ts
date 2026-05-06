"use client"

import { useQuery } from "@tanstack/react-query"
import type { Enums } from "@/lib/types/database"
import { useAuth } from "@/components/providers/auth-provider"
import { queryKeys } from "@/lib/cache/query-keys"
import { getProductionSummary } from "@/lib/api/production"
import { getTransferData } from "@/lib/api/reports"
import type { TimePeriod } from "@/lib/time-period"
import { resolveScopedSystemIds } from "@/lib/hooks/dashboard/shared"

const ENABLE_BACKGROUND_REFETCH = process.env.NODE_ENV === "production"

type ProductionSummaryMetricsData = {
  totalStockedFish: number
  cumulativeMortality: number
  transferInFish: number
  transferOutFish: number
  totalHarvestedFish: number
  totalHarvestedKg: number
  dateBounds: { start: string | null; end: string | null }
}

export function useProductionSummaryMetrics(params: {
  farmId?: string | null
  stage: "all" | Enums<"system_growth_stage">
  batch?: string
  system?: string
  timePeriod?: TimePeriod
  dateFrom?: string | null
  dateTo?: string | null
  scopedSystemIds?: number[] | null
}) {
  const { session } = useAuth()
  const hasBounds = Boolean(params.dateFrom) && Boolean(params.dateTo)

  return useQuery({
    queryKey: queryKeys.production.summaryMetrics(params),
    queryFn: async ({ signal }) => {
      const empty: ProductionSummaryMetricsData = {
        totalStockedFish: 0,
        cumulativeMortality: 0,
        transferInFish: 0,
        transferOutFish: 0,
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
        farmId: params.farmId ?? null,
        batchId,
        dateFrom,
        dateTo,
        limit: 5000,
        signal,
      })
      const scopedSet = Array.isArray(scopedSystemIds) ? new Set(scopedSystemIds) : null
      const filtered = scopedSet
        ? summaryResult.data.filter((row) => row.system_id != null && scopedSet.has(row.system_id))
        : summaryResult.data

      let totalStockedFish = 0
      let cumulativeMortality = 0
      let totalHarvestedFish = 0
      let totalHarvestedKg = 0
      let transferInFish = 0
      let transferOutFish = 0

      filtered.forEach((row) => {
        totalStockedFish += row.number_of_fish_stocked ?? 0
        cumulativeMortality += row.daily_mortality_count ?? 0
        totalHarvestedFish += row.number_of_fish_harvested ?? 0
        totalHarvestedKg += row.total_weight_harvested ?? 0
      })

      if (transferResult.status === "success" && scopedSet !== null) {
        transferResult.data.forEach((row) => {
          const count = row.number_of_fish_transfer ?? 0
          const originInScope = scopedSet.has(row.origin_system_id)
          const targetInScope = row.target_system_id != null && scopedSet.has(row.target_system_id)

          if (targetInScope && !originInScope) {
            transferInFish += count
          } else if (originInScope && !targetInScope) {
            transferOutFish += count
          }
        })
      }

      return {
        totalStockedFish,
        cumulativeMortality,
        transferInFish,
        transferOutFish,
        totalHarvestedFish,
        totalHarvestedKg,
        dateBounds: { start: dateFrom, end: dateTo },
      } as ProductionSummaryMetricsData
    },
    enabled: Boolean(session) && Boolean(params.farmId) && hasBounds,
    staleTime: 5 * 60_000,
    refetchInterval: ENABLE_BACKGROUND_REFETCH ? 5 * 60_000 : false,
    refetchIntervalInBackground: ENABLE_BACKGROUND_REFETCH,
    refetchOnMount: ENABLE_BACKGROUND_REFETCH ? undefined : false,
  })
}

"use client"

import { useQuery } from "@tanstack/react-query"
import type { Enums } from "@/lib/types/database"
import { useAuth } from "@/components/providers/auth-provider"
import type { RecommendedAction } from "@/features/dashboard/types"
import { buildRecommendedActionsFromAnalytics } from "@/features/dashboard/analytics-shared"
import { getDailyFishInventory } from "@/lib/api/inventory"
import { getWaterQualityRatings } from "@/lib/api/water-quality"
import type { TimePeriod } from "@/lib/time-period"
import { normalizeSystemIds, resolveScopedSystemIds } from "./shared"

export function useRecommendedActions(params: {
  farmId?: string | null
  stage?: "all" | Enums<"system_growth_stage">
  batch?: string
  system?: string
  timePeriod?: TimePeriod
  dateFrom?: string | null
  dateTo?: string | null
  scopedSystemIds?: number[] | null
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
        scopedSystemIds: params.scopedSystemIds,
      })
      if (scopedSystemIds === null) {
        return [] as Array<{
          title: string
          description: string
          priority: "High" | "Medium" | "Info"
          due: string
        }>
      }
      if (Array.isArray(scopedSystemIds) && scopedSystemIds.length === 0) {
        return [] as Array<{
          title: string
          description: string
          priority: "High" | "Medium" | "Info"
          due: string
        }>
      }
      const systemId = Array.isArray(scopedSystemIds) && scopedSystemIds.length === 1 ? scopedSystemIds[0] : undefined
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
        scopedSystemIds: Array.isArray(scopedSystemIds)
          ? scopedSystemIds
          : normalizeSystemIds(
              [
                ...inventoryResult.data.map((row) => row.system_id),
                ...wqResult.data.map((row) => row.system_id),
              ],
            ),
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

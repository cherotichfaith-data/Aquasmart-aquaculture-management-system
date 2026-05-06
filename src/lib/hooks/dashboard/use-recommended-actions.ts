"use client"

import { useQuery } from "@tanstack/react-query"
import type { Enums } from "@/lib/types/database"
import { useAuth } from "@/components/providers/auth-provider"
import { queryKeys } from "@/lib/cache/query-keys"
import type { RecommendedAction } from "@/features/dashboard/types"
import { mergeRecommendedActionRows } from "@/features/dashboard/analytics-rpc-shared"
import { getScopedRecommendedActions } from "@/lib/api/analytics"
import type { TimePeriod } from "@/lib/time-period"
import { resolveScopedSystemIds } from "./shared"

export function useRecommendedActions(params: {
  farmId?: string | null
  stage?: "all" | Enums<"system_growth_stage">
  batch?: string
  system?: string
  timePeriod?: TimePeriod
  dateFrom?: string | null
  dateTo?: string | null
  scopedSystemIds?: number[] | null
}) {
  const { session, user } = useAuth()
  const hasBounds = Boolean(params.dateFrom) && Boolean(params.dateTo)

  return useQuery({
    queryKey: queryKeys.dashboard.recommendedActions(params),
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
        return [] as RecommendedAction[]
      }
      if (Array.isArray(scopedSystemIds) && scopedSystemIds.length === 0) {
        return [] as RecommendedAction[]
      }
      const actionsResult = await getScopedRecommendedActions({
        farmId: params.farmId!,
        systemIds: Array.isArray(scopedSystemIds) ? scopedSystemIds : undefined,
        signal,
      })

      if (actionsResult.status !== "success") {
        return [] as RecommendedAction[]
      }

      return mergeRecommendedActionRows(actionsResult.data)
    },
    enabled: (Boolean(session) || Boolean(user)) && Boolean(params.farmId) && hasBounds,
    staleTime: 5 * 60_000,
  })
}

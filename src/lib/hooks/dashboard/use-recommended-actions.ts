"use client"

import { useQuery } from "@tanstack/react-query"
import type { Enums } from "@/lib/types/database"
import { useAuth } from "@/components/providers/auth-provider"
import { queryKeys } from "@/lib/cache/query-keys"
import type { RecommendedAction } from "@/features/dashboard/types"
import { mergeRecommendedActionRows } from "@/features/dashboard/analytics-rpc-shared"
import { getScopedRecommendedActions } from "@/lib/api/analytics"
import type { TimePeriod } from "@/lib/time-period"

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
      const scopedSystemIds = Array.isArray(params.scopedSystemIds) ? params.scopedSystemIds : null
      if (scopedSystemIds && scopedSystemIds.length === 0) {
        return [] as RecommendedAction[]
      }
      const actionsResult = await getScopedRecommendedActions({
        farmId: params.farmId!,
        systemIds: scopedSystemIds ?? undefined,
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

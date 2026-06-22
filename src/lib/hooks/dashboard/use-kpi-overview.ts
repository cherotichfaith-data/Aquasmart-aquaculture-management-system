"use client"

import { useQuery } from "@tanstack/react-query"
import type { Enums } from "@/lib/types/database"
import { useAuth } from "@/components/providers/auth-provider"
import { queryKeys } from "@/lib/cache/query-keys"
import type { TimePeriod } from "@/lib/time-period"
import { getDashboardKpiOverview } from "@/features/dashboard/queries.client"

export function useKpiOverview(params: {
  farmId?: string | null
  stage: "all" | Enums<"system_growth_stage">
  timePeriod: TimePeriod
  batch?: string
  system?: string
  dateFrom?: string | null
  dateTo?: string | null
  scopedSystemIds?: number[] | null
}) {
  const { session, user } = useAuth()

  return useQuery({
    queryKey: queryKeys.dashboard.kpiOverview(params),
    queryFn: async ({ signal }) => {
      const dateFrom = params.dateFrom ?? null
      const dateTo = params.dateTo ?? null
      if (!dateFrom || !dateTo) {
        return { metrics: [], dateBounds: { start: dateFrom, end: dateTo } }
      }
      const scopedSystemIds = Array.isArray(params.scopedSystemIds) ? params.scopedSystemIds : null
      if (scopedSystemIds && scopedSystemIds.length === 0) {
        return { metrics: [], dateBounds: { start: dateFrom, end: dateTo } }
      }

      const result = await getDashboardKpiOverview({
        farmId: params.farmId ?? null,
        stage: params.stage === "all" ? undefined : params.stage,
        systemIds: scopedSystemIds,
        dateFrom,
        dateTo,
        signal,
      })

      return result
    },
    enabled: (Boolean(session) || Boolean(user)) && Boolean(params.farmId) && Boolean(params.dateFrom) && Boolean(params.dateTo),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: true,
  })
}

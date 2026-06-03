"use client"

import { useQuery } from "@tanstack/react-query"
import type { Enums } from "@/lib/types/database"
import { useAuth } from "@/components/providers/auth-provider"
import { queryKeys } from "@/lib/cache/query-keys"
import { buildKpiOverviewFromRpc } from "@/features/dashboard/analytics-rpc-shared"
import { getDashboardConsolidated } from "@/lib/api/dashboard"
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
}) {
  const { session, user } = useAuth()

  return useQuery({
    queryKey: queryKeys.dashboard.kpiOverview(params),
    queryFn: async ({ signal }) => {
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

        const consolidatedResult = await getDashboardConsolidated({
          farmId: params.farmId ?? null,
          systemId: singleSystemId,
          dateFrom: range.start,
          dateTo: range.end,
          signal,
        })

        if (consolidatedResult.status !== "success") {
          return { metrics: [], dateBounds: range }
        }

        const resolvedSystemIds = Array.isArray(scopedSystemIds)
          ? scopedSystemIds
          : consolidatedResult.data
              .map((row) => row.system_id)
              .filter((systemId): systemId is number => typeof systemId === "number" && Number.isFinite(systemId))

        return buildKpiOverviewFromRpc({
          scopedSystemIds: resolvedSystemIds,
          consolidatedRows: consolidatedResult.data,
          dateFrom: range.start,
          dateTo: range.end,
        })
      }

      if (!dateFrom || !dateTo) {
        return { metrics: [], dateBounds: { start: dateFrom, end: dateTo } }
      }
      return buildRangeMetrics({ start: dateFrom, end: dateTo })
    },
    enabled: (Boolean(session) || Boolean(user)) && Boolean(params.farmId) && Boolean(params.dateFrom) && Boolean(params.dateTo),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: true,
  })
}

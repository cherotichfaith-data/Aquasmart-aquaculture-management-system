"use client"

import { useQuery } from "@tanstack/react-query"
import type { Enums } from "@/lib/types/database"
import { useAuth } from "@/components/providers/auth-provider"
import type { ProductionTrendRow } from "@/features/dashboard/types"
import { getProductionSummary } from "@/lib/api/production"
import { sortByDateAsc } from "@/lib/utils"
import type { TimePeriod } from "@/lib/time-period"
import { resolveScopedSystemIds } from "./shared"

export function useProductionTrend(params: {
  farmId?: string | null
  stage?: Enums<"system_growth_stage">
  batch?: string
  system?: string
  timePeriod: TimePeriod
  dateFrom?: string | null
  dateTo?: string | null
  scopedSystemIds?: number[] | null
  initialData?: ProductionTrendRow[]
}) {
  const { session } = useAuth()

  return useQuery({
    queryKey: [
      "production-trend",
      params.farmId ?? "all",
      params.stage ?? "all",
      params.batch ?? "all",
      params.system ?? "all",
      params.timePeriod,
      params.dateFrom ?? "",
      params.dateTo ?? "",
    ],
    queryFn: async ({ signal }) => {
      const dateFrom = params.dateFrom ?? null
      const dateTo = params.dateTo ?? null
      if (!dateFrom || !dateTo) return []
      const scopedSystemIds = await resolveScopedSystemIds({
        farmId: params.farmId ?? null,
        stage: (params.stage ?? "all") as "all" | Enums<"system_growth_stage">,
        batch: params.batch ?? "all",
        system: params.system,
        dateFrom,
        dateTo,
        signal,
        scopedSystemIds: params.scopedSystemIds,
      })
      if (scopedSystemIds === null) return []
      if (Array.isArray(scopedSystemIds) && scopedSystemIds.length === 0) return []
      const systemId = Array.isArray(scopedSystemIds) && scopedSystemIds.length === 1 ? scopedSystemIds[0] : undefined
      const summaryResult = await getProductionSummary({
        farmId: params.farmId ?? null,
        stage: params.stage ?? undefined,
        systemId,
        dateFrom,
        dateTo,
        limit: 500,
        signal,
      })
      if (summaryResult.status !== "success") return []
      const filtered = Array.isArray(scopedSystemIds)
        ? summaryResult.data.filter((row) => row.system_id != null && scopedSystemIds.includes(row.system_id))
        : summaryResult.data
      return sortByDateAsc(filtered, (row) => row.date)
    },
    enabled: Boolean(session) && Boolean(params.farmId),
    staleTime: 5 * 60_000,
    initialData: params.initialData,
    initialDataUpdatedAt: params.initialData ? 0 : undefined,
  })
}

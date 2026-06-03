"use client"

import { useQuery } from "@tanstack/react-query"
import type { Enums } from "@/lib/types/database"
import { useAuth } from "@/components/providers/auth-provider"
import { queryKeys } from "@/lib/cache/query-keys"
import type { DashboardSystemRow, SystemsTableData } from "@/features/dashboard/types"
import { getDashboardSystems } from "@/lib/api/dashboard"
import type { TimePeriod } from "@/lib/time-period"
import { hasCompleteSystemMetrics } from "./shared"

export function useSystemsTable(params: {
  farmId?: string | null
  stage: Enums<"system_growth_stage"> | "all"
  batch?: string
  system?: string
  timePeriod?: TimePeriod
  dateFrom?: string | null
  dateTo?: string | null
  includeIncomplete?: boolean
  scopedSystemIds?: number[] | null
}) {
  const { session, user } = useAuth()
  const hasBounds = Boolean(params.dateFrom) && Boolean(params.dateTo)
  const debugEnabled = process.env.NEXT_PUBLIC_DEBUG === "true"

  return useQuery({
    queryKey: queryKeys.dashboard.systemsTable(params),
    queryFn: async ({ signal }) => {
      const farmId = params.farmId ?? null
      if (!farmId) {
        return {
          rows: [] as DashboardSystemRow[],
          meta: { reason: "Missing farmId", start: null, end: null },
        }
      }

      const startDate = params.dateFrom ?? null
      const endDate = params.dateTo ?? null

      if (!startDate || !endDate) {
        return {
          rows: [] as DashboardSystemRow[],
          meta: { reason: "Missing time bounds", start: startDate, end: endDate },
        }
      }

      const stage = params.stage === "all" ? null : params.stage
      const parsedSystemId = params.system && params.system !== "all" ? Number(params.system) : null
      const systemId = Number.isFinite(parsedSystemId) ? (parsedSystemId as number) : null
      const scopedSystemIds = Array.isArray(params.scopedSystemIds) ? params.scopedSystemIds : null
      if (debugEnabled) {
        console.debug("[dashboard][useSystemsTable]", {
          farmId,
          dateFrom: startDate,
          dateTo: endDate,
          stage: params.stage,
          batch: params.batch ?? "all",
          system: params.system ?? "all",
          scopedSystemIds,
        })
      }
      if (scopedSystemIds && scopedSystemIds.length === 0) {
        return {
          rows: [] as DashboardSystemRow[],
          meta: { reason: "No scoped systems", start: startDate, end: endDate },
        }
      }

      const result = await getDashboardSystems({
        farmId,
        stage,
        systemId,
        dateFrom: startDate,
        dateTo: endDate,
        signal,
      })

      if (result.status !== "success") {
        return {
          rows: [] as DashboardSystemRow[],
          meta: { reason: "RPC error", error: result.error, start: startDate, end: endDate },
        }
      }

      const rows = ((result.data ?? []) as DashboardSystemRow[]).filter((row) => {
        if (scopedSystemIds && !scopedSystemIds.includes(row.system_id)) return false
        if (params.includeIncomplete) return true
        return hasCompleteSystemMetrics(row)
      })

      if (debugEnabled) {
        console.debug("[dashboard][useSystemsTable][rows]", {
          resultCount: result.data?.length ?? 0,
          filteredCount: rows.length,
        })
      }

      return {
        rows,
        meta: { source: "api_dashboard_systems", start: startDate, end: endDate },
      }
    },
    enabled: (Boolean(session) || Boolean(user)) && Boolean(params.farmId) && hasBounds,
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: true,
  })
}

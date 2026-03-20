"use client"

import { useQuery } from "@tanstack/react-query"
import type { Enums } from "@/lib/types/database"
import { useAuth } from "@/components/providers/auth-provider"
import type { DashboardSystemRow, SystemsTableData } from "@/features/dashboard/types"
import { getDashboardSystems } from "@/lib/api/dashboard"
import type { TimePeriod } from "@/lib/time-period"
import { hasCompleteSystemMetrics, resolveScopedSystemIds } from "./shared"

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
  initialData?: SystemsTableData
}) {
  const { session } = useAuth()

  return useQuery({
    queryKey: [
      "systems-table",
      params.farmId ?? "all",
      params.stage,
      params.batch ?? "all",
      params.system ?? "all",
      params.timePeriod ?? "2 weeks",
      params.dateFrom ?? "",
      params.dateTo ?? "",
      params.includeIncomplete ?? false,
    ],
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
      const scopedSystemIds = await resolveScopedSystemIds({
        farmId,
        stage: params.stage,
        batch: params.batch ?? "all",
        system: params.system,
        dateFrom: startDate,
        dateTo: endDate,
        signal,
        scopedSystemIds: params.scopedSystemIds,
      })
      if (scopedSystemIds === null) {
        return {
          rows: [] as DashboardSystemRow[],
          meta: { reason: "Scoped systems error", start: startDate, end: endDate },
        }
      }
      if (Array.isArray(scopedSystemIds) && scopedSystemIds.length === 0) {
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

      return {
        rows: ((result.data ?? []) as DashboardSystemRow[]).filter((row) => {
          if (Array.isArray(scopedSystemIds) && !scopedSystemIds.includes(row.system_id)) return false
          if (params.includeIncomplete) return true
          return hasCompleteSystemMetrics(row)
        }),
        meta: { source: "api_dashboard_systems", start: startDate, end: endDate },
      }
    },
    enabled: Boolean(session) && Boolean(params.farmId),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: true,
    initialData: params.initialData,
    initialDataUpdatedAt: params.initialData ? 0 : undefined,
  })
}

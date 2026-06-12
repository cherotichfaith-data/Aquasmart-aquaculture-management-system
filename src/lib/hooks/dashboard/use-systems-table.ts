"use client"

import { useQuery } from "@tanstack/react-query"
import type { Enums } from "@/lib/types/database"
import { useAuth } from "@/components/providers/auth-provider"
import { queryKeys } from "@/lib/cache/query-keys"
import type { DashboardSystemRow, SystemsTableData } from "@/features/dashboard/types"
import type { TimePeriod } from "@/lib/time-period"
import { useSystemOptions } from "@/lib/hooks/use-options"
import { toDashboardSystemRowsFromInventory } from "@/features/dashboard/dashboard-system-rows"
import { getDailyFishInventory } from "@/lib/api/inventory"

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
  const systemOptionsQuery = useSystemOptions({
    farmId: params.farmId,
    stage: params.stage,
    activeOnly: true,
  })
  const systemOptions = systemOptionsQuery.data?.status === "success" ? systemOptionsQuery.data.data : []

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

      const stage = params.stage === "all" ? undefined : params.stage
      const parsedSystemId = params.system && params.system !== "all" ? Number(params.system) : null
      const systemId = Number.isFinite(parsedSystemId) ? (parsedSystemId as number) : undefined
      const scopedSystemIds = Array.isArray(params.scopedSystemIds) ? params.scopedSystemIds : null
      const activeSystemIds =
        scopedSystemIds ??
        systemOptions.map((row) => row.id).filter((id): id is number => typeof id === "number" && Number.isFinite(id))
      if (debugEnabled) {
        console.debug("[dashboard][useSystemsTable]", {
          farmId,
          dateFrom: startDate,
          dateTo: endDate,
          stage: params.stage,
          batch: params.batch ?? "all",
          system: params.system ?? "all",
          scopedSystemIds,
          activeSystemIds,
        })
      }
      if (scopedSystemIds && scopedSystemIds.length === 0) {
        return {
          rows: [] as DashboardSystemRow[],
          meta: { reason: "No scoped systems", start: startDate, end: endDate },
        }
      }
      if (activeSystemIds.length === 0) {
        return {
          rows: [] as DashboardSystemRow[],
          meta: { reason: "No active systems", start: startDate, end: endDate },
        }
      }

      const result = await getDailyFishInventory({
        farmId,
        stage,
        systemId,
        dateFrom: startDate,
        dateTo: endDate,
        limit: 5000,
        signal,
      })

      if (result.status !== "success") {
        return {
          rows: [] as DashboardSystemRow[],
          meta: { reason: "RPC error", error: result.error, start: startDate, end: endDate },
        }
      }

      const rows = toDashboardSystemRowsFromInventory({
        inventoryRows: result.data ?? [],
        systemOptions,
        activeScopedSystemIds: activeSystemIds,
        dateFrom: startDate,
        dateTo: endDate,
      }).filter((row) => {
        if (params.includeIncomplete) return true
        return row.is_complete
      })

      if (debugEnabled) {
        console.debug("[dashboard][useSystemsTable][rows]", {
          resultCount: result.data?.length ?? 0,
          filteredCount: rows.length,
        })
      }

      return {
        rows,
        meta: { source: "api_daily_fish_inventory_rpc", start: startDate, end: endDate },
      }
    },
    enabled:
      (Boolean(session) || Boolean(user)) &&
      Boolean(params.farmId) &&
      hasBounds &&
      (systemOptionsQuery.data?.status === "success" || Array.isArray(params.scopedSystemIds)),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: true,
  })
}

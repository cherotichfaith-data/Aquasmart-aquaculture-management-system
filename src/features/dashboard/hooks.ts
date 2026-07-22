"use client"

import { useQuery } from "@tanstack/react-query"
import type { Enums } from "@/lib/types/database"
import { useAuth } from "@/components/providers/auth-provider"
import { queryKeys } from "@/lib/cache/query-keys"
import type { TimePeriod } from "@/lib/time-period"
import type { DashboardSystemRow, RecommendedAction } from "@/features/dashboard/types"
import { getDashboardKpiOverview } from "@/features/dashboard/queries.client"
import { mergeRecommendedActionRows } from "@/features/dashboard/analytics-rpc-shared"
import { useSystemOptions } from "@/lib/hooks/use-options"
import { getDashboardSystems } from "@/features/dashboard/queries.client"
import { getRecommendedActions } from "@/features/shared/analytics.client"
import { resolveSystemIdFromFilterValue } from "@/lib/system-options"

const hasSystemId = (row: unknown): row is { system_id: number } =>
  typeof row === "object" &&
  row !== null &&
  "system_id" in row &&
  typeof (row as { system_id?: unknown }).system_id === "number"

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

      return getDashboardKpiOverview({
        farmId: params.farmId ?? null,
        stage: params.stage === "all" ? undefined : params.stage,
        systemIds: scopedSystemIds,
        timePeriod: params.timePeriod,
        dateFrom,
        dateTo,
        signal,
      })
    },
    enabled:
      (Boolean(session) || Boolean(user)) &&
      Boolean(params.farmId) &&
      Boolean(params.dateFrom) &&
      Boolean(params.dateTo),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: true,
  })
}

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
      const actionsResult = await getRecommendedActions({
        farmId: params.farmId!,
        systemId: scopedSystemIds?.length === 1 ? scopedSystemIds[0] : undefined,
        signal,
      })

      if (actionsResult.status !== "success") {
        return [] as RecommendedAction[]
      }

      const rows = scopedSystemIds
        ? actionsResult.data.filter((row) => hasSystemId(row) && scopedSystemIds.includes(row.system_id))
        : actionsResult.data

      return mergeRecommendedActionRows(rows)
    },
    enabled: (Boolean(session) || Boolean(user)) && Boolean(params.farmId) && hasBounds,
    staleTime: 5 * 60_000,
  })
}

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
      const resolvedSystemId =
        params.system && params.system !== "all"
          ? (resolveSystemIdFromFilterValue(params.system, systemOptions) ??
            (Number.isFinite(Number(params.system)) ? Number(params.system) : null))
          : null
      const scopedSystemIds = Array.isArray(params.scopedSystemIds) ? params.scopedSystemIds : null
      const activeSystemIds =
        scopedSystemIds ??
        systemOptions.map((row) => row.id).filter((id): id is number => typeof id === "number" && Number.isFinite(id))
      const systemId =
        Number.isFinite(resolvedSystemId)
          ? (resolvedSystemId as number)
          : activeSystemIds.length === 1
            ? activeSystemIds[0]
            : undefined
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

      const requestedSystemIds = systemId != null ? [systemId] : activeSystemIds
      const result = await getDashboardSystems({
        farmId,
        stage,
        systemIds: requestedSystemIds,
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

      const requestedSet = new Set(requestedSystemIds)
      const rows = (result.data ?? []).filter((row) => {
        if (!requestedSet.has(row.system_id)) return false
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
        meta: { source: "api_dashboard_systems", start: startDate, end: endDate },
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

"use client"

// ─── React Query hooks for analytics layer RPCs ───────────────────────────────

import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/components/providers/auth-provider"
import { queryKeys } from "@/lib/cache/query-keys"
import {
  getHarvestForecast,
  getCycleBenchmarks,
  getRecommendedActions,
  getFcrIntervals,
  getFeedRateAnalysis,
} from "@/lib/api/analytics"

const STALE_5MIN = 5 * 60_000

const hasSystemId = (row: unknown): row is { system_id: number } =>
  typeof row === "object" &&
  row !== null &&
  "system_id" in row &&
  typeof (row as { system_id?: unknown }).system_id === "number"

// ── System Health Scores ──────────────────────────────────────────────────────

// ── Harvest Forecast ──────────────────────────────────────────────────────────

export function useHarvestForecast(params: {
  farmId?: string | null
  systemId?: number
}) {
  const { session } = useAuth()
  return useQuery({
    queryKey: queryKeys.analytics.harvestForecast({ farmId: params.farmId, systemId: params.systemId }),
    queryFn: ({ signal }) =>
      getHarvestForecast({ farmId: params.farmId!, systemId: params.systemId, signal }),
    enabled: Boolean(session) && Boolean(params.farmId),
    staleTime: STALE_5MIN,
  })
}



// ── Cycle Benchmarks ──────────────────────────────────────────────────────────

export function useCycleBenchmarks(params: {
  farmId?: string | null
  systemId?: number
}) {
  const { session } = useAuth()
  return useQuery({
    queryKey: queryKeys.analytics.cycleBenchmarks({ farmId: params.farmId, systemId: params.systemId }),
    queryFn: ({ signal }) =>
      getCycleBenchmarks({ farmId: params.farmId!, systemId: params.systemId, signal }),
    enabled: Boolean(session) && Boolean(params.farmId),
    staleTime: STALE_5MIN,
  })
}

// ── Recommended Actions ───────────────────────────────────────────────────────

export function useRecommendedActions(params: {
  farmId?: string | null
  systemId?: number
  systemIds?: number[] | null
}) {
  const { session } = useAuth()
  return useQuery({
    queryKey: queryKeys.analytics.recommendedActions({
      farmId: params.farmId,
      systemId: params.systemId,
      systemIds: params.systemIds,
    }),
    queryFn: async ({ signal }) => {
      const systemIds = params.systemId != null ? [params.systemId] : params.systemIds
      if (Array.isArray(systemIds) && systemIds.length === 0) {
        return { status: "success" as const, data: [] }
      }
      const result = await getRecommendedActions({
        farmId: params.farmId!,
        systemId: Array.isArray(systemIds) && systemIds.length === 1 ? systemIds[0] : undefined,
        signal,
      })
      if (result.status !== "success" || !Array.isArray(systemIds)) return result
      const scope = new Set(systemIds)
      return { ...result, data: result.data.filter((row) => hasSystemId(row) && scope.has(row.system_id)) }
    },
    enabled: Boolean(session) && Boolean(params.farmId),
    staleTime: STALE_5MIN,
  })
}

// ── FCR Intervals ─────────────────────────────────────────────────────────────

export function useFcrIntervals(params: {
  farmId?: string | null
  systemId?: number
  dateFrom?: string
  dateTo?: string
}) {
  const { session } = useAuth()
  return useQuery({
    queryKey: queryKeys.analytics.fcrIntervals({
      farmId: params.farmId,
      systemId: params.systemId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    }),
    queryFn: ({ signal }) =>
      getFcrIntervals({
        farmId: params.farmId!,
        systemId: params.systemId,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        signal,
      }),
    enabled: Boolean(session) && Boolean(params.farmId),
    staleTime: STALE_5MIN,
  })
}

// ── Feed Rate Analysis ────────────────────────────────────────────────────────

export function useFeedRateAnalysis(params: {
  farmId?: string | null
  systemId?: number
  systemIds?: number[] | null
  dateFrom?: string
  dateTo?: string
  enabled?: boolean
}) {
  const { session } = useAuth()
  return useQuery({
    queryKey: queryKeys.analytics.feedRateAnalysis({
      farmId: params.farmId,
      systemId: params.systemId,
      systemIds: params.systemIds,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    }),
    queryFn: async ({ signal }) => {
      const systemIds = params.systemId != null ? [params.systemId] : params.systemIds
      if (Array.isArray(systemIds) && systemIds.length === 0) {
        return { status: "success" as const, data: [] }
      }
      const result = await getFeedRateAnalysis({
        farmId: params.farmId!,
        systemId: Array.isArray(systemIds) && systemIds.length === 1 ? systemIds[0] : undefined,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        signal,
      })
      if (result.status !== "success" || !Array.isArray(systemIds)) return result
      const scope = new Set(systemIds)
      return { ...result, data: result.data.filter((row) => scope.has(row.system_id)) }
    },
    enabled:
      (params.enabled ?? true) &&
      Boolean(session) &&
      Boolean(params.farmId) &&
      (params.dateFrom == null || params.dateFrom.length > 0) &&
      (params.dateTo == null || params.dateTo.length > 0),
    staleTime: STALE_5MIN,
  })
}

// ── KPI Coverage ──────────────────────────────────────────────────────────────


"use client"

// ─── React Query hooks for analytics layer RPCs ───────────────────────────────

import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/components/providers/auth-provider"
import { queryKeys } from "@/lib/cache/query-keys"
import {
  getSystemHealthScores,
  getHarvestForecast,
  getFeedDemandForecast,
  getCycleBenchmarks,
  getScopedRecommendedActions,
  getFcrIntervals,
  getScopedFeedRateAnalysis,
  getKpiCoverage,
} from "@/lib/api/analytics"

const STALE_5MIN = 5 * 60_000

// ── System Health Scores ──────────────────────────────────────────────────────

export function useSystemHealthScores(params: {
  farmId?: string | null
  systemId?: number
}) {
  const { session } = useAuth()
  return useQuery({
    queryKey: queryKeys.analytics.healthScores({ farmId: params.farmId, systemId: params.systemId }),
    queryFn: ({ signal }) =>
      getSystemHealthScores({ farmId: params.farmId!, systemId: params.systemId, signal }),
    enabled: Boolean(session) && Boolean(params.farmId),
    staleTime: STALE_5MIN,
  })
}

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

// ── Feed Demand Forecast ──────────────────────────────────────────────────────

export function useFeedDemandForecast(params: {
  farmId?: string | null
  daysAhead?: number
}) {
  const { session } = useAuth()
  return useQuery({
    queryKey: queryKeys.analytics.feedDemand({ farmId: params.farmId, daysAhead: params.daysAhead }),
    queryFn: ({ signal }) =>
      getFeedDemandForecast({ farmId: params.farmId!, daysAhead: params.daysAhead, signal }),
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
    queryFn: ({ signal }) =>
      getScopedRecommendedActions({
        farmId: params.farmId!,
        systemIds: params.systemId != null ? [params.systemId] : params.systemIds,
        signal,
      }),
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
    queryFn: ({ signal }) =>
      getScopedFeedRateAnalysis({
        farmId: params.farmId!,
        systemIds: params.systemId != null ? [params.systemId] : params.systemIds,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        signal,
      }),
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

export function useKpiCoverage(params: {
  farmId?: string | null
  dateFrom?: string
  dateTo?: string
}) {
  const { session } = useAuth()
  return useQuery({
    queryKey: queryKeys.analytics.kpiCoverage({
      farmId: params.farmId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    }),
    queryFn: ({ signal }) =>
      getKpiCoverage({
        farmId: params.farmId!,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        signal,
      }),
    enabled: Boolean(session) && Boolean(params.farmId),
    staleTime: STALE_5MIN,
  })
}

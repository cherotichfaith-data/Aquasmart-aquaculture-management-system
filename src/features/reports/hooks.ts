"use client"

import { queryOptions, useQuery } from "@tanstack/react-query"
import { useAuth } from "@/components/providers/auth-provider"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { queryKeys } from "@/lib/cache/query-keys"
import type { Enums } from "@/lib/types/database"
import {
  getBatchSystemIds,
  getFeedingBreakdown,
  getFeedingRecords,
  getFeedingSummary,
  getGrowthTrend,
  getHarvests,
  getMortalityData,
  getPerformanceRecords,
  getPerformanceSummary,
  getSamplingData,
  getStockings,
  getTransferData,
} from "./queries.client"

const DISABLE_AUTO_REFETCH_IN_DEV = process.env.NODE_ENV !== "production"

function reportsQueryOptions<TResult>(params: {
  queryKey: readonly unknown[]
  queryFn: (context: { signal: AbortSignal }) => Promise<TResult>
  enabled: boolean
  staleTime: number
  refetchOnWindowFocus?: boolean
  refetchOnMount?: boolean | "always"
}) {
  return queryOptions({
    queryKey: params.queryKey,
    queryFn: params.queryFn,
    enabled: params.enabled,
    staleTime: params.staleTime,
    refetchOnWindowFocus: params.refetchOnWindowFocus,
    refetchOnMount: params.refetchOnMount,
  })
}

export function useFeedingRecords(params?: {
  systemId?: number
  systemIds?: number[]
  batchId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  enabled?: boolean
  farmId?: string | null
}) {
  const { session } = useAuth()
  const { farmId } = useActiveFarm()
  const resolvedFarmId = params?.farmId ?? farmId
  return useQuery({
    ...reportsQueryOptions({
      queryKey: queryKeys.reports.feedingRecords({ ...params, farmId: resolvedFarmId }),
      queryFn: ({ signal }) => getFeedingRecords({ ...params, farmId: resolvedFarmId, signal }),
      staleTime: 5 * 60_000,
      enabled: Boolean(session) && Boolean(resolvedFarmId) && (params?.enabled ?? true),
    }),
    placeholderData: (previous) => previous,
  })
}

export function useFeedingSummary(params?: {
  farmId?: string | null
  systemId?: number
  batchId?: number
  dateFrom?: string
  dateTo?: string
  enabled?: boolean
}) {
  const { session } = useAuth()
  const { farmId } = useActiveFarm()
  const resolvedFarmId = params?.farmId ?? farmId
  return useQuery(
    reportsQueryOptions({
      queryKey: queryKeys.reports.feedingSummary({
        farmId: resolvedFarmId,
        systemId: params?.systemId,
        batchId: params?.batchId,
        dateFrom: params?.dateFrom,
        dateTo: params?.dateTo,
      }),
      queryFn: ({ signal }) =>
        getFeedingSummary({
          farmId: resolvedFarmId,
          systemId: params?.systemId,
          batchId: params?.batchId,
          dateFrom: params?.dateFrom,
          dateTo: params?.dateTo,
          signal,
        }),
      staleTime: 5 * 60_000,
      enabled: Boolean(session) && Boolean(resolvedFarmId) && (params?.enabled ?? true),
    }),
  )
}

export function useFeedingBreakdown(params?: {
  farmId?: string | null
  systemId?: number
  batchId?: number
  dateFrom?: string
  dateTo?: string
  enabled?: boolean
}) {
  const { session } = useAuth()
  const { farmId } = useActiveFarm()
  const resolvedFarmId = params?.farmId ?? farmId
  return useQuery(
    reportsQueryOptions({
      queryKey: queryKeys.reports.feedingBreakdown({
        farmId: resolvedFarmId,
        systemId: params?.systemId,
        batchId: params?.batchId,
        dateFrom: params?.dateFrom,
        dateTo: params?.dateTo,
      }),
      queryFn: ({ signal }) =>
        getFeedingBreakdown({
          farmId: resolvedFarmId,
          systemId: params?.systemId,
          batchId: params?.batchId,
          dateFrom: params?.dateFrom,
          dateTo: params?.dateTo,
          signal,
        }),
      staleTime: 5 * 60_000,
      enabled: Boolean(session) && Boolean(resolvedFarmId) && (params?.enabled ?? true),
    }),
  )
}

export function useSamplingData(params?: {
  systemId?: number
  systemIds?: number[]
  batchId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  enabled?: boolean
}) {
  const { session } = useAuth()
  const { farmId } = useActiveFarm()
  return useQuery(
    reportsQueryOptions({
      queryKey: queryKeys.reports.sampling({ ...params, farmId }),
      queryFn: ({ signal }) => getSamplingData({ ...params, farmId, signal }),
      staleTime: 5 * 60_000,
      enabled: Boolean(session) && Boolean(farmId) && (params?.enabled ?? true),
    }),
  )
}

export function useStockingData(params?: {
  systemId?: number
  systemIds?: number[]
  batchId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  enabled?: boolean
}) {
  const { session } = useAuth()
  const { farmId } = useActiveFarm()
  return useQuery(
    reportsQueryOptions({
      queryKey: queryKeys.reports.stocking({ ...params, farmId }),
      queryFn: ({ signal }) => getStockings({ ...params, farmId, signal }),
      staleTime: 5 * 60_000,
      enabled: Boolean(session) && Boolean(farmId) && (params?.enabled ?? true),
    }),
  )
}

export function useHarvests(params?: {
  farmId?: string | null
  systemId?: number
  systemIds?: number[]
  batchId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  enabled?: boolean
}) {
  const { session } = useAuth()
  const { farmId } = useActiveFarm()
  const resolvedFarmId = params?.farmId ?? farmId
  return useQuery(
    reportsQueryOptions({
      queryKey: [
        "reports",
        "harvests",
        resolvedFarmId ?? "all",
        params?.systemId ?? "all",
        params?.systemIds?.join(",") ?? "all-systems",
        params?.batchId ?? "all",
        params?.dateFrom ?? "",
        params?.dateTo ?? "",
        params?.limit ?? 100,
      ] as const,
      queryFn: ({ signal }) => getHarvests({ ...params, farmId: resolvedFarmId, signal }),
      staleTime: 5 * 60_000,
      enabled: Boolean(session) && Boolean(resolvedFarmId) && (params?.enabled ?? true),
    }),
  )
}

export function useScopedGrowthTrend(params?: {
  farmId?: string | null
  systemIds?: number[]
  days?: number
  dateFrom?: string
  dateTo?: string
  enabled?: boolean
}) {
  const { session } = useAuth()
  const activeFarm = useActiveFarm()
  const farmId = params?.farmId ?? activeFarm.farmId
  const systemIds = params?.systemIds?.filter((id) => Number.isFinite(id)) ?? []
  return useQuery(
    reportsQueryOptions({
      queryKey: queryKeys.reports.growthTrend({
        farmId,
        systemIds,
        dateFrom: params?.dateFrom,
        dateTo: params?.dateTo,
        days: params?.days,
      }),
      queryFn: ({ signal }) =>
        getGrowthTrend({
          farmId,
          systemIds,
          days: params?.days,
          dateFrom: params?.dateFrom,
          dateTo: params?.dateTo,
          signal,
        }),
      enabled: Boolean(session) && Boolean(farmId) && systemIds.length > 0 && (params?.enabled ?? true),
      refetchOnWindowFocus: false,
      staleTime: 60_000,
    }),
  )
}

export function usePerformanceSummary(params?: {
  farmId?: string | null
  systemId?: number
  stage?: "all" | Enums<"system_growth_stage">
  dateFrom?: string
  dateTo?: string
  enabled?: boolean
}) {
  const { session } = useAuth()
  const { farmId } = useActiveFarm()
  const resolvedFarmId = params?.farmId ?? farmId
  return useQuery(
    reportsQueryOptions({
      queryKey: queryKeys.reports.performanceSummary({
        farmId: resolvedFarmId,
        systemId: params?.systemId,
        stage: params?.stage,
        dateFrom: params?.dateFrom,
        dateTo: params?.dateTo,
      }),
      queryFn: ({ signal }) =>
        getPerformanceSummary({
          farmId: resolvedFarmId,
          systemId: params?.systemId,
          stage: params?.stage && params.stage !== "all" ? params.stage : undefined,
          dateFrom: params?.dateFrom,
          dateTo: params?.dateTo,
          signal,
        }),
      staleTime: 5 * 60_000,
      enabled: Boolean(session) && Boolean(resolvedFarmId) && (params?.enabled ?? true),
    }),
  )
}

export function usePerformanceRecords(params?: {
  farmId?: string | null
  systemId?: number
  stage?: "all" | Enums<"system_growth_stage">
  dateFrom?: string
  dateTo?: string
  limit?: number
  enabled?: boolean
}) {
  const { session } = useAuth()
  const { farmId } = useActiveFarm()
  const resolvedFarmId = params?.farmId ?? farmId
  return useQuery(
    reportsQueryOptions({
      queryKey: queryKeys.reports.performanceRecords({
        farmId: resolvedFarmId,
        systemId: params?.systemId,
        stage: params?.stage,
        dateFrom: params?.dateFrom,
        dateTo: params?.dateTo,
        limit: params?.limit,
      }),
      queryFn: ({ signal }) =>
        getPerformanceRecords({
          farmId: resolvedFarmId,
          systemId: params?.systemId,
          stage: params?.stage && params.stage !== "all" ? params.stage : undefined,
          dateFrom: params?.dateFrom,
          dateTo: params?.dateTo,
          limit: params?.limit,
          signal,
        }),
      staleTime: 5 * 60_000,
      enabled: Boolean(session) && Boolean(resolvedFarmId) && (params?.enabled ?? true),
    }),
  )
}

export function useTransferData(params?: {
  systemId?: number
  systemIds?: number[]
  batchId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  enabled?: boolean
}) {
  const { session } = useAuth()
  const { farmId } = useActiveFarm()
  return useQuery(
    reportsQueryOptions({
      queryKey: queryKeys.reports.transfer({ ...params, farmId }),
      queryFn: ({ signal }) => getTransferData({ ...params, farmId, signal }),
      staleTime: 5 * 60_000,
      enabled: Boolean(session) && Boolean(farmId) && (params?.enabled ?? true),
    }),
  )
}

export function useMortalityData(params?: {
  farmId?: string | null
  systemId?: number
  systemIds?: number[]
  batchId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  enabled?: boolean
}) {
  const { session } = useAuth()
  const { farmId } = useActiveFarm()
  const resolvedFarmId = params?.farmId ?? farmId
  return useQuery(
    reportsQueryOptions({
      queryKey: queryKeys.reports.mortality({ ...params, farmId: resolvedFarmId }),
      queryFn: ({ signal }) => getMortalityData({ ...params, farmId: resolvedFarmId, signal }),
      staleTime: 5 * 60_000,
      enabled: Boolean(session) && Boolean(resolvedFarmId) && (params?.enabled ?? true),
    }),
  )
}

export function useBatchSystemIds(params?: {
  batchId?: number
  farmId?: string | null
  enabled?: boolean
}) {
  const { session } = useAuth()
  const { farmId } = useActiveFarm()
  const resolvedFarmId = params?.farmId ?? farmId
  return useQuery(
    reportsQueryOptions({
      queryKey: queryKeys.reports.batchSystemIds({ farmId: resolvedFarmId, batchId: params?.batchId }),
      queryFn: ({ signal }) => {
        if (!params?.batchId || !Number.isFinite(params.batchId)) {
          return Promise.resolve({ status: "success" as const, data: [] as Array<{ system_id: number }> })
        }
        return getBatchSystemIds({ batchId: params.batchId, signal })
      },
      staleTime: 5 * 60_000,
      enabled: Boolean(session) && (params?.enabled ?? true),
    }),
  )
}


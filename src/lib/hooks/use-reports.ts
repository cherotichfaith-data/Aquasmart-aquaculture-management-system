"use client"

import { queryOptions, useQuery } from "@tanstack/react-query"
import { useAuth } from "@/components/providers/auth-provider"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import { queryKeys } from "@/lib/cache/query-keys"
import {
  getBatchSystemIds,
  getFeedingRecords,
  getGrowthTrend,
  getMortalityData,
  getRecentEntries,
  getRunningStock,
  getSamplingData,
  getStockings,
  getTransferData,
} from "@/lib/api/reports"
import { getEfcrTrend } from "@/lib/api/analytics"
import type {
  FeedGrowthTrendRow,
  FeedingRecordWithType,
} from "@/lib/api/reports"

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

export function useRunningStock(params?: {
  farmId?: string | null
  enabled?: boolean
}) {
  const { session } = useAuth()
  const { farmId } = useActiveFarm()
  const resolvedFarmId = params?.farmId ?? farmId
  return useQuery(
    reportsQueryOptions({
      queryKey: queryKeys.reports.runningStock(resolvedFarmId),
      queryFn: ({ signal }) => getRunningStock({ farmId: resolvedFarmId, signal }),
      enabled: Boolean(session) && Boolean(resolvedFarmId) && (params?.enabled ?? true),
      staleTime: 60_000,
    }),
  )
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
      enabled: Boolean(session) && (params?.enabled ?? true),
    }),
    placeholderData: (previous) => previous,
  })
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
      enabled: Boolean(session) && (params?.enabled ?? true),
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
      enabled: Boolean(session) && (params?.enabled ?? true),
    }),
  )
}

export function useScopedEfcrTrend(params?: {
  farmId?: string | null
  systemIds?: number[]
  dateFrom?: string
  dateTo?: string
  enabled?: boolean
}) {
  const { session } = useAuth()
  const { farmId } = useActiveFarm()
  const resolvedFarmId = params?.farmId ?? farmId
  const systemIds = params?.systemIds?.filter((id) => Number.isFinite(id)) ?? []
  return useQuery(
    reportsQueryOptions({
      queryKey: queryKeys.reports.efcrTrend({
        farmId: resolvedFarmId,
        systemIds,
        dateFrom: params?.dateFrom,
        dateTo: params?.dateTo,
      }),
      queryFn: async ({ signal }) => {
        const result = await getEfcrTrend({
          farmId: resolvedFarmId!,
          dateFrom: params?.dateFrom,
          dateTo: params?.dateTo,
          signal,
        })
        if (result.status !== "success") return result

        const systemIdSet = new Set(systemIds)
        return {
          status: "success" as const,
          data: result.data.filter((row) => systemIdSet.has(row.system_id)),
        }
      },
      enabled: Boolean(session) && Boolean(resolvedFarmId) && systemIds.length > 0 && (params?.enabled ?? true),
      refetchOnWindowFocus: false,
      staleTime: 60_000,
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
      queryFn: async ({ signal }) => {
        const results = await Promise.all(
          systemIds.map((systemId) =>
            getGrowthTrend({
              farmId,
              systemId,
              days: params?.days,
              dateFrom: params?.dateFrom,
              dateTo: params?.dateTo,
              signal,
            }),
          ),
        )
        const firstError = results.find((result) => result.status === "error")
        if (firstError?.status === "error") {
          throw new Error(firstError.error ?? "Failed to load growth trend")
        }

        return {
          status: "success" as const,
          data: results.flatMap((result, index) =>
            result.status === "success"
              ? result.data.map((row) => ({ ...row, system_id: systemIds[index] }))
              : [],
          ),
        }
      },
      enabled: Boolean(session) && Boolean(farmId) && systemIds.length > 0 && (params?.enabled ?? true),
      refetchOnWindowFocus: false,
      staleTime: 60_000,
    }),
  )
}

export function useTransferData(params?: {
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
      enabled: Boolean(session) && (params?.enabled ?? true),
    }),
  )
}

export function useMortalityData(params?: {
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
      queryKey: queryKeys.reports.mortality({ ...params, farmId }),
      queryFn: ({ signal }) => getMortalityData({ ...params, farmId, signal }),
      staleTime: 5 * 60_000,
      enabled: Boolean(session) && (params?.enabled ?? true),
    }),
  )
}

export function useRecentEntries(params?: {
  farmId?: string | null
}) {
  const { session, user } = useAuth()
  const { farmId } = useActiveFarm()
  const resolvedFarmId = params?.farmId ?? farmId
  return useQuery(
    reportsQueryOptions({
      queryKey: queryKeys.reports.recentEntries(resolvedFarmId),
      queryFn: ({ signal }) => getRecentEntries(resolvedFarmId, signal),
      enabled: (Boolean(session) || Boolean(user)) && Boolean(resolvedFarmId),
      staleTime: 5 * 60_000,
      refetchOnMount: DISABLE_AUTO_REFETCH_IN_DEV ? false : undefined,
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

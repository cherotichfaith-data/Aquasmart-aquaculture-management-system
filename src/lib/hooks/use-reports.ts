"use client"

import { queryOptions, useQuery } from "@tanstack/react-query"
import { useAuth } from "@/components/providers/auth-provider"
import { useActiveFarm } from "@/lib/hooks/app/use-active-farm"
import type { QueryResult } from "@/lib/supabase-client"
import {
  getBatchSystemIds,
  getFeedPlans,
  getFarmKpisToday,
  getFcrTrend,
  getFeedingRecords,
  getGrowthTrend,
  getMortalityData,
  getRecentEntries,
  getRunningStock,
  getSamplingData,
  getStockings,
  getTransferData,
} from "@/lib/api/reports"
import { getSurvivalTrend } from "@/lib/api/mortality"
import type {
  FeedFcrTrendRow,
  FeedGrowthTrendRow,
  FeedingRecordWithType,
} from "@/lib/api/reports"

function reportsQueryOptions<TResult>(params: {
  queryKey: readonly unknown[]
  queryFn: (context: { signal: AbortSignal }) => Promise<TResult>
  enabled: boolean
  staleTime: number
  initialData?: TResult
  refetchOnWindowFocus?: boolean
}) {
  return queryOptions({
    queryKey: params.queryKey,
    queryFn: params.queryFn,
    enabled: params.enabled,
    staleTime: params.staleTime,
    initialData: params.enabled ? params.initialData : undefined,
    initialDataUpdatedAt: params.enabled && params.initialData ? 0 : undefined,
    refetchOnWindowFocus: params.refetchOnWindowFocus,
  })
}

const SCOPED_TREND_CONCURRENCY = 4

async function collectScopedTrendRows<T>(params: {
  systemIds: number[]
  signal: AbortSignal
  fetcher: (systemId: number) => Promise<QueryResult<T>>
  errorMessage: string
}): Promise<QueryResult<T & { system_id: number }>> {
  const results: Array<{ system_id: number; rows: T[] }> = []

  for (let index = 0; index < params.systemIds.length; index += SCOPED_TREND_CONCURRENCY) {
    const chunk = params.systemIds.slice(index, index + SCOPED_TREND_CONCURRENCY)
    const chunkResults = await Promise.all(
      chunk.map(async (systemId) => {
        const result = await params.fetcher(systemId)
        return { systemId, result }
      }),
    )

    const firstError = chunkResults.find((item) => item.result.status === "error")?.result
    if (firstError?.status === "error") {
      throw new Error(firstError.error ?? params.errorMessage)
    }

    results.push(
      ...chunkResults.flatMap((item) =>
        item.result.status === "success" ? [{ system_id: item.systemId, rows: item.result.data }] : [],
      ),
    )

    if (params.signal.aborted) {
      break
    }
  }

  const data = results.flatMap((item) => item.rows.map((row) => ({ ...row, system_id: item.system_id })))
  return { status: "success", data }
}

export function useFarmKpisToday(params?: {
  farmId?: string | null
  enabled?: boolean
}) {
  const { session } = useAuth()
  const { farmId } = useActiveFarm()
  const resolvedFarmId = params?.farmId ?? farmId
  return useQuery(
    reportsQueryOptions({
      queryKey: ["reports", "farm-kpis-today", resolvedFarmId ?? "all"],
      queryFn: ({ signal }) => getFarmKpisToday({ farmId: resolvedFarmId, signal }),
      enabled: Boolean(session) && Boolean(resolvedFarmId) && (params?.enabled ?? true),
      staleTime: 60_000,
    }),
  )
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
      queryKey: ["reports", "running-stock", resolvedFarmId ?? "all"],
      queryFn: ({ signal }) => getRunningStock({ farmId: resolvedFarmId, signal }),
      enabled: Boolean(session) && Boolean(resolvedFarmId) && (params?.enabled ?? true),
      staleTime: 60_000,
    }),
  )
}

export function useFeedPlans(params?: {
  farmId?: string | null
  systemIds?: number[]
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
      queryKey: [
        "reports",
        "feed-plans",
        resolvedFarmId ?? "all",
        params?.systemIds?.join(",") ?? "all-systems",
        params?.batchId ?? "all",
        params?.dateFrom ?? "",
        params?.dateTo ?? "",
      ],
      queryFn: ({ signal }) => getFeedPlans({ ...params, farmId: resolvedFarmId, signal }),
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
  initialData?: QueryResult<FeedingRecordWithType>
}) {
  const { session } = useAuth()
  const { farmId } = useActiveFarm()
  const resolvedFarmId = params?.farmId ?? farmId
  return useQuery({
    ...reportsQueryOptions({
      queryKey: [
        "reports",
        "feeding-records",
        resolvedFarmId ?? "all",
        params?.systemId ?? "all",
        params?.systemIds?.join(",") ?? "all-systems",
        params?.batchId ?? "all",
        params?.dateFrom ?? "",
        params?.dateTo ?? "",
        params?.limit ?? 100,
      ],
      queryFn: ({ signal }) => getFeedingRecords({ ...params, signal }),
      staleTime: 5 * 60_000,
      enabled: Boolean(session) && (params?.enabled ?? true),
      initialData: params?.initialData,
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
      queryKey: [
        "reports",
        "sampling",
        farmId ?? "all",
        params?.systemId ?? "all",
        params?.systemIds?.join(",") ?? "all-systems",
        params?.batchId ?? "all",
        params?.dateFrom ?? "",
        params?.dateTo ?? "",
        params?.limit ?? 100,
      ],
      queryFn: ({ signal }) => getSamplingData({ ...params, signal }),
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
      queryKey: [
        "reports",
        "stocking",
        farmId ?? "all",
        params?.systemId ?? "all",
        params?.systemIds?.join(",") ?? "all-systems",
        params?.batchId ?? "all",
        params?.dateFrom ?? "",
        params?.dateTo ?? "",
        params?.limit ?? 100,
      ],
      queryFn: ({ signal }) => getStockings({ ...params, signal }),
      staleTime: 5 * 60_000,
      enabled: Boolean(session) && (params?.enabled ?? true),
    }),
  )
}

export function useScopedFcrTrend(params?: {
  farmId?: string | null
  systemIds?: number[]
  days?: number
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
      queryKey: [
        "reports",
        "fcr-trend",
        resolvedFarmId ?? "all",
        systemIds.join(","),
        params?.dateFrom ?? "",
        params?.dateTo ?? "",
        params?.days ?? 180,
      ],
      queryFn: async ({ signal }) => {
        return collectScopedTrendRows<FeedFcrTrendRow>({
          systemIds,
          signal,
          fetcher: (systemId) =>
            getFcrTrend({
              farmId: resolvedFarmId,
              systemId,
              days: params?.days,
              dateFrom: params?.dateFrom,
              dateTo: params?.dateTo,
              signal,
            }),
          errorMessage: "Failed to load FCR trend",
        })
      },
      enabled: Boolean(session) && Boolean(resolvedFarmId) && systemIds.length > 0 && (params?.enabled ?? true),
      refetchOnWindowFocus: false,
      staleTime: 60_000,
    }),
  )
}

export function useScopedGrowthTrend(params?: {
  systemIds?: number[]
  days?: number
  dateFrom?: string
  dateTo?: string
  enabled?: boolean
}) {
  const { session } = useAuth()
  const systemIds = params?.systemIds?.filter((id) => Number.isFinite(id)) ?? []
  return useQuery(
    reportsQueryOptions({
      queryKey: [
        "reports",
        "growth-trend",
        systemIds.join(","),
        params?.dateFrom ?? "",
        params?.dateTo ?? "",
        params?.days ?? 180,
      ],
      queryFn: async ({ signal }) => {
        return collectScopedTrendRows<FeedGrowthTrendRow>({
          systemIds,
          signal,
          fetcher: (systemId) =>
            getGrowthTrend({
              systemId,
              days: params?.days,
              dateFrom: params?.dateFrom,
              dateTo: params?.dateTo,
              signal,
            }),
          errorMessage: "Failed to load growth trend",
        })
      },
      enabled: Boolean(session) && systemIds.length > 0 && (params?.enabled ?? true),
      refetchOnWindowFocus: false,
      staleTime: 60_000,
    }),
  )
}

export function useScopedSurvivalTrend(params?: {
  systemIds?: number[]
  dateFrom?: string
  dateTo?: string
  enabled?: boolean
}) {
  const { session } = useAuth()
  const systemIds = params?.systemIds?.filter((id) => Number.isFinite(id)) ?? []
  return useQuery(
    reportsQueryOptions({
      queryKey: [
        "reports",
        "survival-trend-scoped",
        systemIds.join(","),
        params?.dateFrom ?? "",
        params?.dateTo ?? "",
      ],
      queryFn: async ({ signal }) => {
        return collectScopedTrendRows({
          systemIds,
          signal,
          fetcher: (systemId) =>
            getSurvivalTrend({
              systemId,
              dateFrom: params?.dateFrom,
              dateTo: params?.dateTo,
              signal,
            }),
          errorMessage: "Failed to load survival trend",
        })
      },
      enabled:
        Boolean(session) &&
        systemIds.length > 0 &&
        Boolean(params?.dateFrom) &&
        (params?.enabled ?? true),
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
      queryKey: [
        "reports",
        "transfer",
        farmId ?? "all",
        params?.batchId ?? "all",
        params?.dateFrom ?? "",
        params?.dateTo ?? "",
        params?.limit ?? 100,
      ],
      queryFn: ({ signal }) => getTransferData({ ...params, signal }),
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
      queryKey: [
        "reports",
        "mortality",
        farmId ?? "all",
        params?.systemId ?? "all",
        params?.systemIds?.join(",") ?? "all-systems",
        params?.batchId ?? "all",
        params?.dateFrom ?? "",
        params?.dateTo ?? "",
        params?.limit ?? 100,
      ],
      queryFn: ({ signal }) => getMortalityData({ ...params, signal }),
      staleTime: 5 * 60_000,
      enabled: Boolean(session) && (params?.enabled ?? true),
    }),
  )
}

export function useRecentEntries(params?: {
  farmId?: string | null
  initialData?: Awaited<ReturnType<typeof getRecentEntries>>
}) {
  const { session } = useAuth()
  const { farmId } = useActiveFarm()
  const resolvedFarmId = params?.farmId ?? farmId
  return useQuery(
    reportsQueryOptions({
      queryKey: ["reports", "recent-entries", resolvedFarmId ?? "all"],
      queryFn: ({ signal }) => getRecentEntries(resolvedFarmId, signal),
      enabled: Boolean(session) && Boolean(resolvedFarmId),
      staleTime: 5 * 60_000,
      initialData: params?.initialData,
    }),
  )
}

export function useBatchSystemIds(params?: {
  batchId?: number
  farmId?: string | null
  enabled?: boolean
  initialData?: QueryResult<{ system_id: number }>
}) {
  const { session } = useAuth()
  const { farmId } = useActiveFarm()
  const resolvedFarmId = params?.farmId ?? farmId
  return useQuery(
    reportsQueryOptions({
      queryKey: ["reports", "batch-system-ids", resolvedFarmId ?? "all", params?.batchId ?? "all"],
      queryFn: ({ signal }) => {
        if (!params?.batchId || !Number.isFinite(params.batchId)) {
          return Promise.resolve({ status: "success" as const, data: [] as Array<{ system_id: number }> })
        }
        return getBatchSystemIds({ batchId: params.batchId, signal })
      },
      staleTime: 5 * 60_000,
      enabled: Boolean(session) && (params?.enabled ?? true),
      initialData: params?.initialData,
    }),
  )
}

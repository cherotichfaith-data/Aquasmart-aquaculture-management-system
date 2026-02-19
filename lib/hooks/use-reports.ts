"use client"

import { useQuery } from "@tanstack/react-query"
import {
  getBatchSystemIds,
  getFeedingRecords,
  getFeedIncomingWithType,
  getFeedTypes,
  getMortalityData,
  getRecentEntries,
  getSamplingData,
  getSuppliers,
  type FeedingRecordWithType,
} from "@/lib/api/reports"

export function useFeedIncoming(params?: { limit?: number }) {
  return useQuery({
    queryKey: ["reports", "feed-incoming", params?.limit ?? 50],
    queryFn: ({ signal }) => getFeedIncomingWithType({ limit: params?.limit, signal }),
    staleTime: 5 * 60_000,
  })
}

export function useFeedTypes() {
  return useQuery({
    queryKey: ["reports", "feed-types"],
    queryFn: ({ signal }) => getFeedTypes({ signal }),
    staleTime: 5 * 60_000,
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
}) {
  return useQuery({
    queryKey: [
      "reports",
      "feeding-records",
      params?.systemId ?? "all",
      params?.systemIds?.join(",") ?? "all-systems",
      params?.batchId ?? "all",
      params?.dateFrom ?? "",
      params?.dateTo ?? "",
      params?.limit ?? 100,
    ],
    queryFn: ({ signal }) => getFeedingRecords({ ...params, signal }),
    staleTime: 5 * 60_000,
    enabled: params?.enabled ?? true,
    placeholderData: (previous) => previous as typeof previous,
  })
}

export function useSuppliers() {
  return useQuery({
    queryKey: ["reports", "suppliers"],
    queryFn: ({ signal }) => getSuppliers({ signal }),
    staleTime: 5 * 60_000,
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
  return useQuery({
    queryKey: [
      "reports",
      "sampling",
      params?.systemId ?? "all",
      params?.systemIds?.join(",") ?? "all-systems",
      params?.batchId ?? "all",
      params?.dateFrom ?? "",
      params?.dateTo ?? "",
      params?.limit ?? 100,
    ],
    queryFn: ({ signal }) => getSamplingData({ ...params, signal }),
    staleTime: 5 * 60_000,
    enabled: params?.enabled ?? true,
  })
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
  return useQuery({
    queryKey: [
      "reports",
      "mortality",
      params?.systemId ?? "all",
      params?.systemIds?.join(",") ?? "all-systems",
      params?.batchId ?? "all",
      params?.dateFrom ?? "",
      params?.dateTo ?? "",
      params?.limit ?? 100,
    ],
    queryFn: ({ signal }) => getMortalityData({ ...params, signal }),
    staleTime: 5 * 60_000,
    enabled: params?.enabled ?? true,
  })
}

export function useRecentEntries() {
  return useQuery({
    queryKey: ["reports", "recent-entries"],
    queryFn: ({ signal }) => getRecentEntries(signal),
    staleTime: 5 * 60_000,
  })
}

export function useBatchSystemIds(params?: { batchId?: number }) {
  return useQuery({
    queryKey: ["reports", "batch-system-ids", params?.batchId ?? "all"],
    queryFn: ({ signal }) => {
      if (!params?.batchId || !Number.isFinite(params.batchId)) {
        return Promise.resolve({ status: "success" as const, data: [] as Array<{ system_id: number }> })
      }
      return getBatchSystemIds({ batchId: params.batchId, signal })
    },
    staleTime: 5 * 60_000,
  })
}

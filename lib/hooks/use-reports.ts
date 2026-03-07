"use client"

import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/components/providers/auth-provider"
import { useActiveFarm } from "@/hooks/use-active-farm"
import {
  getBatchSystemIds,
  getFeedingRecords,
  getFeedIncomingWithType,
  getFeedTypes,
  getMortalityData,
  getRecentEntries,
  getSamplingData,
  getTransferData,
} from "@/lib/api/reports"

export function useFeedIncoming(params?: { limit?: number }) {
  const { session } = useAuth()
  const { farmId } = useActiveFarm()
  return useQuery({
    queryKey: ["reports", "feed-incoming", farmId ?? "all", params?.limit ?? 50],
    queryFn: ({ signal }) => getFeedIncomingWithType({ limit: params?.limit, signal }),
    enabled: Boolean(session),
    staleTime: 5 * 60_000,
  })
}

export function useFeedTypes() {
  const { session } = useAuth()
  const { farmId } = useActiveFarm()
  return useQuery({
    queryKey: ["reports", "feed-types", farmId ?? "all"],
    queryFn: ({ signal }) => getFeedTypes({ signal }),
    enabled: Boolean(session),
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
  const { session } = useAuth()
  const { farmId } = useActiveFarm()
  return useQuery({
    queryKey: [
      "reports",
      "feeding-records",
      farmId ?? "all",
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
    placeholderData: (previous) => previous as typeof previous,
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
  return useQuery({
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
  })
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
  return useQuery({
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
  const { session } = useAuth()
  const { farmId } = useActiveFarm()
  return useQuery({
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
  })
}

export function useRecentEntries() {
  const { session } = useAuth()
  const { farmId } = useActiveFarm()
  return useQuery({
    queryKey: ["reports", "recent-entries", farmId ?? "all"],
    queryFn: ({ signal }) => getRecentEntries(signal),
    enabled: Boolean(session),
    staleTime: 5 * 60_000,
  })
}

export function useBatchSystemIds(params?: { batchId?: number }) {
  const { session } = useAuth()
  const { farmId } = useActiveFarm()
  return useQuery({
    queryKey: ["reports", "batch-system-ids", farmId ?? "all", params?.batchId ?? "all"],
    queryFn: ({ signal }) => {
      if (!params?.batchId || !Number.isFinite(params.batchId)) {
        return Promise.resolve({ status: "success" as const, data: [] as Array<{ system_id: number }> })
      }
      return getBatchSystemIds({ batchId: params.batchId, signal })
    },
    staleTime: 5 * 60_000,
    enabled: Boolean(session),
  })
}

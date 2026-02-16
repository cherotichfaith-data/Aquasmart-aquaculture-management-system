"use client"

import { useQuery } from "@tanstack/react-query"
import type { Enums } from "@/lib/types/database"
import { useAuth } from "@/components/providers/auth-provider"
import {
  getBatchOptions,
  getFarmOptions,
  getFeedTypeOptions,
  getSystemOptions,
} from "@/lib/api/options"

export function useSystemOptions(params?: {
  farmId?: string | null
  stage?: Enums<"system_growth_stage"> | "all"
  activeOnly?: boolean
}) {
  const { session } = useAuth()
  const enabled = Boolean(session) && Boolean(params?.farmId)
  return useQuery({
    queryKey: ["options", "systems", params?.farmId ?? "all", params?.stage ?? "all", params?.activeOnly ?? false],
    queryFn: ({ signal }) => getSystemOptions({ ...params, signal }),
    enabled,
    staleTime: 5 * 60_000,
  })
}

export function useBatchOptions(params?: { farmId?: string | null }) {
  const { session } = useAuth()
  const enabled = Boolean(session) && Boolean(params?.farmId)
  return useQuery({
    queryKey: ["options", "batches", params?.farmId ?? "all"],
    queryFn: ({ signal }) => getBatchOptions({ ...params, signal }),
    enabled,
    staleTime: 5 * 60_000,
  })
}

export function useFeedTypeOptions() {
  return useQuery({
    queryKey: ["options", "feeds"],
    queryFn: ({ signal }) => getFeedTypeOptions({ signal }),
    staleTime: 5 * 60_000,
  })
}

export function useFarmOptions(params?: { enabled?: boolean }) {
  const { session } = useAuth()
  return useQuery({
    queryKey: ["options", "farms"],
    queryFn: ({ signal }) => getFarmOptions({ signal }),
    enabled: Boolean(session) && (params?.enabled ?? true),
    staleTime: 5 * 60_000,
  })
}

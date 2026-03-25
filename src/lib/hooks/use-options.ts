"use client"

import { useQuery } from "@tanstack/react-query"
import type { Database, Enums } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import { useAuth } from "@/components/providers/auth-provider"
import type { SystemOption } from "@/lib/system-options"
import {
  getBatchOptions,
  getFarmOptions,
  getFeedSupplierOptions,
  getFeedTypeOptions,
  getFingerlingSupplierOptions,
  getAppConfig,
  getSystemVolumes,
  getSystemOptions,
} from "@/lib/api/options"

export function useSystemOptions(params?: {
  farmId?: string | null
  stage?: Enums<"system_growth_stage"> | "all"
  activeOnly?: boolean
  enabled?: boolean
  initialData?: QueryResult<SystemOption>
}) {
  const { session } = useAuth()
  const enabled = Boolean(session) && Boolean(params?.farmId) && (params?.enabled ?? true)
  return useQuery({
    queryKey: ["options", "systems", params?.farmId ?? "all", params?.stage ?? "all", params?.activeOnly ?? false],
    queryFn: ({ signal }) => getSystemOptions({ ...params, signal }),
    enabled,
    staleTime: 5 * 60_000,
    initialData: params?.initialData,
    initialDataUpdatedAt: params?.initialData ? 0 : undefined,
  })
}

export function useBatchOptions(params?: {
  farmId?: string | null
  initialData?: QueryResult<Database["public"]["Functions"]["api_fingerling_batch_options_rpc"]["Returns"][number]>
}) {
  const { session } = useAuth()
  const enabled = Boolean(session) && Boolean(params?.farmId)
  return useQuery({
    queryKey: ["options", "batches", params?.farmId ?? "all"],
    queryFn: ({ signal }) => getBatchOptions({ ...params, signal }),
    enabled,
    staleTime: 5 * 60_000,
    initialData: params?.initialData,
    initialDataUpdatedAt: params?.initialData ? 0 : undefined,
  })
}

export function useFeedTypeOptions(params?: {
  initialData?: QueryResult<Database["public"]["Functions"]["api_feed_type_options_rpc"]["Returns"][number]>
}) {
  const { session, user } = useAuth()
  return useQuery({
    queryKey: ["options", "feeds", user?.id ?? "anon"],
    queryFn: ({ signal }) => getFeedTypeOptions({ signal }),
    enabled: Boolean(session),
    staleTime: 5 * 60_000,
    initialData: params?.initialData,
    initialDataUpdatedAt: params?.initialData ? 0 : undefined,
  })
}

export function useFeedSupplierOptions(params?: { enabled?: boolean }) {
  const { session, user } = useAuth()
  return useQuery({
    queryKey: ["options", "feed-suppliers", user?.id ?? "anon"],
    queryFn: ({ signal }) => getFeedSupplierOptions({ signal }),
    enabled: Boolean(session) && (params?.enabled ?? true),
    staleTime: 5 * 60_000,
  })
}

export function useFingerlingSupplierOptions(params?: { enabled?: boolean }) {
  const { session, user } = useAuth()
  return useQuery({
    queryKey: ["options", "fingerling-suppliers", user?.id ?? "anon"],
    queryFn: ({ signal }) => getFingerlingSupplierOptions({ signal }),
    enabled: Boolean(session) && (params?.enabled ?? true),
    staleTime: 5 * 60_000,
  })
}

export function useFarmOptions(params?: { enabled?: boolean }) {
  const { session, user } = useAuth()
  return useQuery({
    queryKey: ["options", "farms", user?.id ?? "anon"],
    queryFn: ({ signal }) => getFarmOptions({ signal }),
    enabled: Boolean(session) && (params?.enabled ?? true),
    staleTime: 5 * 60_000,
  })
}

export function useSystemVolumes(params?: {
  farmId?: string | null
  stage?: Enums<"system_growth_stage"> | "all"
  activeOnly?: boolean
}) {
  const { session } = useAuth()
  const enabled = Boolean(session) && Boolean(params?.farmId)
  return useQuery({
    queryKey: [
      "options",
      "system-volumes",
      params?.farmId ?? "all",
      params?.stage ?? "all",
      params?.activeOnly ?? true,
    ],
    queryFn: ({ signal }) => getSystemVolumes({ ...params, signal }),
    enabled,
    staleTime: 5 * 60_000,
  })
}

export function useAppConfig(params?: { keys?: string[]; enabled?: boolean }) {
  const { session, user } = useAuth()
  const keys = params?.keys ?? []
  return useQuery({
    queryKey: ["app-config", user?.id ?? "anon", keys.join(",") || "none"],
    queryFn: ({ signal }) => getAppConfig({ keys, signal }),
    enabled: Boolean(session) && keys.length > 0 && (params?.enabled ?? true),
    staleTime: 5 * 60_000,
  })
}

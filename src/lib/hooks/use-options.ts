"use client"

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/cache/query-keys"
import type { Enums } from "@/lib/types/database"
import { useAuth } from "@/components/providers/auth-provider"
import type { SystemOption } from "@/lib/system-options"
import {
  getBatchOptions,
  getDashboardTimePeriodOptions,
  getFarmOptions,
  getFeedTypeOptions,
  getFingerlingSupplierOptions,
  getAppConfig,
  getSystemOptions,
} from "@/lib/api/options"

export function useSystemOptions(params?: {
  farmId?: string | null
  stage?: Enums<"system_growth_stage"> | "all"
  activeOnly?: boolean
  enabled?: boolean
}) {
  const { session, user } = useAuth()
  const enabled = (Boolean(session) || Boolean(user)) && Boolean(params?.farmId) && (params?.enabled ?? true)
  return useQuery({
    queryKey: queryKeys.options.systems(params),
    queryFn: ({ signal }) => getSystemOptions({ ...params, signal }),
    enabled,
    staleTime: 5 * 60_000,
  })
}

export function useBatchOptions(params?: {
  farmId?: string | null
  activeOnly?: boolean
}) {
  const { session, user } = useAuth()
  const enabled = (Boolean(session) || Boolean(user)) && Boolean(params?.farmId)
  return useQuery({
    queryKey: queryKeys.options.batches(params),
    queryFn: ({ signal }) => getBatchOptions({ ...params, signal }),
    enabled,
    staleTime: 0,
    refetchOnMount: "always",
  })
}

export function useDashboardTimePeriodOptions(params?: { enabled?: boolean }) {
  const { session, user } = useAuth()
  return useQuery({
    queryKey: queryKeys.options.timePeriods(),
    queryFn: ({ signal }) => getDashboardTimePeriodOptions({ signal }),
    enabled: (Boolean(session) || Boolean(user)) && (params?.enabled ?? true),
    staleTime: 5 * 60_000,
  })
}

export function useFeedTypeOptions(params?: {
  farmId?: string | null
  enabled?: boolean
}) {
  const { session, user } = useAuth()
  const enabled =
    (Boolean(session) || Boolean(user)) &&
    Boolean(params?.farmId) &&
    (params?.enabled ?? true)
  return useQuery({
    queryKey: queryKeys.options.feeds(params?.farmId, user?.id),
    queryFn: ({ signal }) => getFeedTypeOptions({ ...params, signal }),
    enabled,
    staleTime: 5 * 60_000,
  })
}

export function useFingerlingSupplierOptions(params?: { enabled?: boolean }) {
  const { session, user } = useAuth()
  return useQuery({
    queryKey: queryKeys.options.fingerlingSuppliers(user?.id),
    queryFn: ({ signal }) => getFingerlingSupplierOptions({ signal }),
    enabled: (Boolean(session) || Boolean(user)) && (params?.enabled ?? true),
    staleTime: 5 * 60_000,
  })
}

export function useFarmOptions(params?: { enabled?: boolean }) {
  const { session, user } = useAuth()
  return useQuery({
    queryKey: queryKeys.options.farms(user?.id),
    queryFn: ({ signal }) => getFarmOptions({ signal }),
    enabled: Boolean(session) && (params?.enabled ?? true),
    staleTime: 5 * 60_000,
  })
}

export function useAppConfig(params?: { keys?: string[]; enabled?: boolean }) {
  const { session, user } = useAuth()
  const keys = params?.keys ?? []
  return useQuery({
    queryKey: queryKeys.appConfig(keys, user?.id),
    queryFn: ({ signal }) => getAppConfig({ keys, signal }),
    enabled: (Boolean(session) || Boolean(user)) && keys.length > 0 && (params?.enabled ?? true),
    staleTime: 5 * 60_000,
  })
}

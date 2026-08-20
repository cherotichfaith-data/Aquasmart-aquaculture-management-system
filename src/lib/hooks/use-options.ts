"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/cache/query-keys"
import type { Enums } from "@/lib/types/database"
import { useAuth } from "@/components/providers/auth-provider"
import { useStockedSystemIds } from "@/lib/hooks/use-stocked-system-ids"
import {
  getBatchOptions,
  getFarmOptions,
  getFingerlingSupplierOptions,
  getAppConfig,
  getSystemOptions,
} from "@/features/shared/options.client"

export function useSystemOptions(params?: {
  farmId?: string | null
  stage?: Enums<"system_growth_stage"> | "all"
  activeOnly?: boolean
  enabled?: boolean
  /**
   * When true, cages with no live fish right now (fully harvested or
   * transferred out, and never-stocked cages) are left out of the result.
   * Use this for report/production filters and overview tables -- leave it
   * off for data-entry cage pickers like Stocking, which need to see empty
   * cages so they can be restocked.
   */
  stockedOnly?: boolean
}) {
  const { session, user, isLoading: authLoading } = useAuth()
  const enabled =
    !authLoading && (Boolean(session) || Boolean(user)) && Boolean(params?.farmId) && (params?.enabled ?? true)
  const query = useQuery({
    queryKey: queryKeys.options.systems(params),
    queryFn: ({ signal }) => getSystemOptions({ ...params, signal }),
    enabled,
    staleTime: 5 * 60_000,
  })
  const stockedSystems = useStockedSystemIds(params?.farmId, {
    enabled: enabled && Boolean(params?.stockedOnly),
  })

  return useMemo(() => {
    if (!params?.stockedOnly || query.data?.status !== "success") return query
    if (!stockedSystems.query.isSuccess) return query
    return {
      ...query,
      data: {
        ...query.data,
        data: query.data.data.filter((system) => stockedSystems.stockedIds.has(system.id)),
      },
    }
  }, [query, params?.stockedOnly, stockedSystems])
}

export function useBatchOptions(params?: {
  farmId?: string | null
  activeOnly?: boolean
}) {
  const { session, user, isLoading: authLoading } = useAuth()
  const enabled = !authLoading && (Boolean(session) || Boolean(user)) && Boolean(params?.farmId)
  return useQuery({
    queryKey: queryKeys.options.batches(params),
    queryFn: ({ signal }) => getBatchOptions({ ...params, signal }),
    enabled,
    staleTime: 0,
    refetchOnMount: "always",
  })
}

export function useFingerlingSupplierOptions(params?: { enabled?: boolean }) {
  const { session, user, isLoading: authLoading } = useAuth()
  return useQuery({
    queryKey: queryKeys.options.fingerlingSuppliers(user?.id),
    queryFn: ({ signal }) => getFingerlingSupplierOptions({ signal }),
    enabled: !authLoading && (Boolean(session) || Boolean(user)) && (params?.enabled ?? true),
    staleTime: 5 * 60_000,
  })
}

export function useFarmOptions(params?: { enabled?: boolean }) {
  const { session, user, isLoading: authLoading } = useAuth()
  return useQuery({
    queryKey: queryKeys.options.farms(user?.id),
    queryFn: ({ signal }) => getFarmOptions({ signal }),
    enabled: !authLoading && Boolean(session) && (params?.enabled ?? true),
    staleTime: 5 * 60_000,
  })
}

export function useAppConfig(params?: { keys?: string[]; enabled?: boolean }) {
  const { session, user, isLoading: authLoading } = useAuth()
  const keys = params?.keys ?? []
  return useQuery({
    queryKey: queryKeys.appConfig(keys, user?.id),
    queryFn: ({ signal }) => getAppConfig({ keys, signal }),
    enabled: !authLoading && (Boolean(session) || Boolean(user)) && keys.length > 0 && (params?.enabled ?? true),
    staleTime: 5 * 60_000,
  })
}

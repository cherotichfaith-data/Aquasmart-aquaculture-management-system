"use client"

import { useQuery } from "@tanstack/react-query"
import type { Enums } from "@/lib/types/database"
import { useAuth } from "@/components/providers/auth-provider"
import { queryKeys } from "@/lib/cache/query-keys"
import { getProductionPeriodEnrichment, getProductionSummary } from "@/features/production/queries.client"

export function useProductionSummary(params?: {
  systemId?: number
  stage?: Enums<"system_growth_stage">
  dateFrom?: string
  dateTo?: string
  limit?: number
  farmId?: string | null
  enabled?: boolean
  staleTime?: number
}) {
  const { session } = useAuth()
  const enabled = Boolean(session) && Boolean(params?.farmId) && (params?.enabled ?? true)
  return useQuery({
    queryKey: queryKeys.production.summary(params),
    queryFn: ({ signal }) => getProductionSummary({ ...params, signal }),
    enabled,
    staleTime: params?.staleTime ?? 5 * 60_000,
  })
}

export function useProductionPeriodEnrichment(params?: {
  farmId?: string | null
  systemId?: number
  systemIds?: number[]
  stage?: Enums<"system_growth_stage">
  batch?: string
  system?: string
  timePeriod?: string
  dateFrom?: string
  dateTo?: string
  enabled?: boolean
  staleTime?: number
}) {
  const { session } = useAuth()
  const enabled = Boolean(session) && Boolean(params?.farmId) && (params?.enabled ?? true)
  return useQuery({
    queryKey: queryKeys.production.periodView({
      farmId: params?.farmId,
      stage: params?.stage ?? "all",
      batch: params?.batch,
      system: params?.system,
      timePeriod: params?.timePeriod,
      dateFrom: params?.dateFrom ?? null,
      dateTo: params?.dateTo ?? null,
      scopedSystemIds: params?.systemIds ?? null,
      consolidate: false,
    }),
    queryFn: ({ signal }) =>
      getProductionPeriodEnrichment({
        farmId: params?.farmId,
        systemId: params?.systemId,
        systemIds: params?.systemIds,
        stage: params?.stage,
        dateFrom: params?.dateFrom,
        dateTo: params?.dateTo,
        signal,
      }),
    enabled,
    staleTime: params?.staleTime ?? 5 * 60_000,
  })
}

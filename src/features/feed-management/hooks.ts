"use client"

import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/components/providers/auth-provider"
import { queryKeys } from "@/lib/cache/query-keys"
import {
  getFeedDashboardKpis,
  getFeedEfcrTrend,
  getFeedPlanVsActual,
  getFeedVsBiomassGain,
  getFeedingAlerts,
  getFeedingRateVsTarget,
  getFeedingResponseDistribution,
  getSystemFeedStatus,
} from "@/lib/api/feed-management"

type ScopedFeedParams = {
  farmId?: string | null
  systemIds?: number[] | null
  dateFrom?: string | null
  dateTo?: string | null
  enabled?: boolean
}

function useFeedQuery<T>(
  queryKey: readonly unknown[],
  queryFn: (signal: AbortSignal) => Promise<T>,
  enabled: boolean,
) {
  return useQuery({
    queryKey,
    queryFn: ({ signal }) => queryFn(signal),
    enabled,
    staleTime: 60_000,
  })
}

export function useFeedDashboardKpis(params?: ScopedFeedParams) {
  const { session, user } = useAuth()
  const enabled = (Boolean(session) || Boolean(user)) && Boolean(params?.farmId) && (params?.enabled ?? true)
  return useFeedQuery(
    queryKeys.feedManagement.kpis(params),
    (signal) => getFeedDashboardKpis({ ...params, signal }),
    enabled,
  )
}

export function useFeedPlanVsActual(params?: ScopedFeedParams) {
  const { session, user } = useAuth()
  const enabled = (Boolean(session) || Boolean(user)) && Boolean(params?.farmId) && (params?.enabled ?? true)
  return useFeedQuery(
    queryKeys.feedManagement.planVsActual(params),
    (signal) => getFeedPlanVsActual({ ...params, signal }),
    enabled,
  )
}

export function useSystemFeedStatus(params?: ScopedFeedParams) {
  const { session, user } = useAuth()
  const enabled = (Boolean(session) || Boolean(user)) && Boolean(params?.farmId) && (params?.enabled ?? true)
  return useFeedQuery(
    queryKeys.feedManagement.systemStatus(params),
    (signal) => getSystemFeedStatus({ ...params, signal }),
    enabled,
  )
}

export function useFeedEfcrTrend(params?: ScopedFeedParams) {
  const { session, user } = useAuth()
  const enabled = (Boolean(session) || Boolean(user)) && Boolean(params?.farmId) && (params?.enabled ?? true)
  return useFeedQuery(
    queryKeys.feedManagement.efcrTrend(params),
    (signal) => getFeedEfcrTrend({ ...params, signal }),
    enabled,
  )
}

export function useFeedingRateVsTarget(params?: ScopedFeedParams) {
  const { session, user } = useAuth()
  const enabled = (Boolean(session) || Boolean(user)) && Boolean(params?.farmId) && (params?.enabled ?? true)
  return useFeedQuery(
    queryKeys.feedManagement.feedingRateVsTarget(params),
    (signal) => getFeedingRateVsTarget({ ...params, signal }),
    enabled,
  )
}

export function useFeedingResponseDistribution(params?: ScopedFeedParams) {
  const { session, user } = useAuth()
  const enabled = (Boolean(session) || Boolean(user)) && Boolean(params?.farmId) && (params?.enabled ?? true)
  return useFeedQuery(
    queryKeys.feedManagement.feedingResponse(params),
    (signal) => getFeedingResponseDistribution({ ...params, signal }),
    enabled,
  )
}

export function useFeedVsBiomassGain(params?: ScopedFeedParams) {
  const { session, user } = useAuth()
  const enabled = (Boolean(session) || Boolean(user)) && Boolean(params?.farmId) && (params?.enabled ?? true)
  return useFeedQuery(
    queryKeys.feedManagement.feedVsBiomassGain(params),
    (signal) => getFeedVsBiomassGain({ ...params, signal }),
    enabled,
  )
}

export function useFeedingAlerts(params?: ScopedFeedParams) {
  const { session, user } = useAuth()
  const enabled = (Boolean(session) || Boolean(user)) && Boolean(params?.farmId) && (params?.enabled ?? true)
  return useFeedQuery(
    queryKeys.feedManagement.alerts(params),
    (signal) => getFeedingAlerts({ ...params, signal }),
    enabled,
  )
}

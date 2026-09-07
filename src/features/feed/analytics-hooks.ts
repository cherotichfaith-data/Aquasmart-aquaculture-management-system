"use client"

import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/components/providers/auth-provider"
import { queryKeys } from "@/lib/cache/query-keys"
import { getFeedDashboard } from "@/features/feed/queries.client"

type ScopedFeedParams = {
  farmId?: string | null
  systemIds?: number[] | null
  dateFrom?: string | null
  dateTo?: string | null
  enabled?: boolean
}

/**
 * Every /feed section in one query. Previously this file exposed 8 hooks that
 * each fired their own RPC; they now come from a single `api_feed_dashboard`
 * call and the page derives the sections from `data`.
 */
export function useFeedDashboard(params?: ScopedFeedParams) {
  const { session, user } = useAuth()
  const enabled =
    (Boolean(session) || Boolean(user)) && Boolean(params?.farmId) && (params?.enabled ?? true)

  return useQuery({
    queryKey: queryKeys.feedManagement.dashboard(params),
    queryFn: ({ signal }) => getFeedDashboard({ ...params, signal }),
    enabled,
    staleTime: 60_000,
  })
}

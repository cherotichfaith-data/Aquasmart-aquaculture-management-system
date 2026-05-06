"use client"

import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/components/providers/auth-provider"
import { fetchSystemsOverview } from "@/lib/api/analytics"
import { queryKeys } from "@/lib/cache/query-keys"

export function useSystemsOverview(farmId?: string | null) {
  const { session } = useAuth()

  return useQuery({
    queryKey: queryKeys.dashboard.systemsOverview(farmId),
    queryFn: ({ signal }) => fetchSystemsOverview(farmId, signal),
    enabled: Boolean(session) && Boolean(farmId),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: true,
  })
}

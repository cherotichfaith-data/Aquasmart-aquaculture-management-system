"use client"

import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/components/providers/auth-provider"
import { getDashboardSystems } from "@/features/dashboard/queries.client"
import { queryKeys } from "@/lib/cache/query-keys"
import type { Enums } from "@/lib/types/database"

export function useDashboardSystems(params?: {
  farmId?: string | null
  stage?: Enums<"system_growth_stage"> | null
  systemId?: number | null
  systemIds?: number[] | null
  dateFrom?: string | null
  dateTo?: string | null
  enabled?: boolean
  staleTime?: number
}) {
  const { session } = useAuth()
  const enabled = Boolean(session) && Boolean(params?.farmId) && (params?.enabled ?? true)

  return useQuery({
    queryKey: queryKeys.dashboard.systems(params),
    queryFn: ({ signal }) => getDashboardSystems({ ...params, signal }),
    enabled,
    staleTime: params?.staleTime ?? 5 * 60_000,
  })
}

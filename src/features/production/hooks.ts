"use client"

import { useQuery } from "@tanstack/react-query"
import type { Enums } from "@/lib/types/database"
import { useAuth } from "@/components/providers/auth-provider"
import { queryKeys } from "@/lib/cache/query-keys"
import { getProductionSummary } from "@/features/production/queries.client"

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

"use client"

import { useQuery } from "@tanstack/react-query"
import { getDailyFishInventory } from "@/lib/api/inventory"
import { queryKeys } from "@/lib/cache/query-keys"
import { useAuth } from "@/components/providers/auth-provider"
import type { Enums } from "@/lib/types/database"

export function useDailyFishInventory(params?: {
  systemId?: number
  stage?: Enums<"system_growth_stage">
  dateFrom?: string
  dateTo?: string
  limit?: number
  cursorDate?: string
  farmId?: string | null
  orderAsc?: boolean
  enabled?: boolean
  staleTime?: number
}) {
  const { session } = useAuth()
  const enabled = Boolean(session) && Boolean(params?.farmId) && (params?.enabled ?? true)
  return useQuery({
    queryKey: queryKeys.inventory.daily(params),
    queryFn: ({ signal }) => getDailyFishInventory({ ...params, signal }),
    enabled,
    staleTime: params?.staleTime ?? 5 * 60_000,
  })
}

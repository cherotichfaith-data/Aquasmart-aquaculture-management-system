"use client"

import { useQuery } from "@tanstack/react-query"
import { getDailyFishInventory } from "@/lib/api/inventory"
import { queryKeys } from "@/lib/cache/query-keys"
import { useAuth } from "@/components/providers/auth-provider"

export function useDailyFishInventory(params?: {
  systemId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  cursorDate?: string
  farmId?: string | null
  orderAsc?: boolean
  enabled?: boolean
}) {
  const { session } = useAuth()
  const enabled = Boolean(session) && Boolean(params?.farmId) && (params?.enabled ?? true)
  return useQuery({
    queryKey: queryKeys.inventory.daily(params),
    queryFn: ({ signal }) => getDailyFishInventory({ ...params, signal }),
    enabled,
    staleTime: 5 * 60_000,
  })
}

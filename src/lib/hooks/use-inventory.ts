"use client"

import { useQuery } from "@tanstack/react-query"
import { getDailyFishInventory } from "@/lib/api/inventory"
import { useAuth } from "@/components/providers/auth-provider"
import type { Database } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"

export function useDailyFishInventory(params?: {
  systemId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  cursorDate?: string
  farmId?: string | null
  orderAsc?: boolean
  enabled?: boolean
  initialData?: QueryResult<Database["public"]["Functions"]["api_daily_fish_inventory_rpc"]["Returns"][number]>
}) {
  const { session } = useAuth()
  const enabled = Boolean(session) && Boolean(params?.farmId) && (params?.enabled ?? true)
  return useQuery({
    queryKey: [
      "inventory",
      "daily",
      params?.farmId ?? "all",
      params?.systemId ?? "all",
      params?.dateFrom ?? "",
      params?.dateTo ?? "",
      params?.limit ?? 50,
      params?.cursorDate ?? "",
      params?.orderAsc ?? false,
    ],
    queryFn: ({ signal }) => getDailyFishInventory({ ...params, signal }),
    enabled,
    staleTime: 5 * 60_000,
    initialData: enabled ? params?.initialData : undefined,
    initialDataUpdatedAt: enabled && params?.initialData ? 0 : undefined,
  })
}

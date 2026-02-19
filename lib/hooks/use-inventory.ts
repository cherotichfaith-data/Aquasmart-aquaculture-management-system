"use client"

import { useQuery } from "@tanstack/react-query"
import { getDailyFishInventory } from "@/lib/api/inventory"
import { useAuth } from "@/components/providers/auth-provider"

export function useDailyFishInventory(params?: {
  systemId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  cursorDate?: string
  farmId?: string | null
  orderAsc?: boolean
}) {
  const { session } = useAuth()
  const enabled = Boolean(session) && Boolean(params?.farmId)
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
  })
}

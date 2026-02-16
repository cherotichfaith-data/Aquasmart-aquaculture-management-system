"use client"

import { useQuery } from "@tanstack/react-query"
import { getDailyFishInventory, getDailyFishInventoryConsolidated, getLatestInventory } from "@/lib/api/inventory"
import { useAuth } from "@/components/providers/auth-provider"

export function useDailyFishInventory(params?: {
  systemId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  farmId?: string | null
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
    ],
    queryFn: ({ signal }) => getDailyFishInventory({ ...params, signal }),
    enabled,
    staleTime: 5 * 60_000,
  })
}

export function useLatestInventory(params?: { systemId?: number; farmId?: string | null }) {
  const { session } = useAuth()
  const enabled = Boolean(session) && Boolean(params?.farmId)
  return useQuery({
    queryKey: ["inventory", "latest", params?.farmId ?? "all", params?.systemId ?? "all"],
    queryFn: ({ signal }) => getLatestInventory({ ...params, signal }),
    enabled,
    staleTime: 5 * 60_000,
  })
}

export function useDailyFishInventoryConsolidated(params?: { limit?: number; farmId?: string | null }) {
  const { session } = useAuth()
  const enabled = Boolean(session) && Boolean(params?.farmId)
  return useQuery({
    queryKey: ["inventory", "consolidated", params?.farmId ?? "all", params?.limit ?? 1],
    queryFn: ({ signal }) => getDailyFishInventoryConsolidated({ limit: params?.limit, farmId: params?.farmId ?? null, signal }),
    enabled,
    staleTime: 5 * 60_000,
  })
}

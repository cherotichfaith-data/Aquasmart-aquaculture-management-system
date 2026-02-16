"use client"

import { useQuery } from "@tanstack/react-query"
import type { Enums } from "@/lib/types/database"
import { getEfcrTrend, getProductionSummary } from "@/lib/api/production"
import { useAuth } from "@/components/providers/auth-provider"

export function useProductionSummary(params?: {
  systemId?: number
  stage?: Enums<"system_growth_stage">
  dateFrom?: string
  dateTo?: string
  limit?: number
  farmId?: string | null
}) {
  const { session } = useAuth()
  const enabled = Boolean(session) && Boolean(params?.farmId)
  return useQuery({
    queryKey: [
      "production",
      "summary",
      params?.farmId ?? "all",
      params?.systemId ?? "all",
      params?.stage ?? "all",
      params?.dateFrom ?? "",
      params?.dateTo ?? "",
      params?.limit ?? 50,
    ],
    queryFn: ({ signal }) => getProductionSummary({ ...params, signal }),
    enabled,
    staleTime: 5 * 60_000,
  })
}

export function useEfcrTrend(params?: {
  systemId?: number
  dateFrom?: string
  dateTo?: string
  limit?: number
  farmId?: string | null
  enabled?: boolean
}) {
  const { session } = useAuth()
  const enabled = Boolean(session) && Boolean(params?.farmId) && (params?.enabled ?? true)
  return useQuery({
    queryKey: [
      "production",
      "efcr-trend",
      params?.farmId ?? "all",
      params?.systemId ?? "all",
      params?.dateFrom ?? "",
      params?.dateTo ?? "",
    ],
    queryFn: ({ signal }) => getEfcrTrend({ ...params, signal }),
    enabled,
    staleTime: 5 * 60_000,
  })
}

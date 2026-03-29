"use client"

import { useQuery } from "@tanstack/react-query"
import type { Enums } from "@/lib/types/database"
import type { Database } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import { getProductionSummary } from "@/lib/api/production"
import { useAuth } from "@/components/providers/auth-provider"

export function useProductionSummary(params?: {
  systemId?: number
  stage?: Enums<"system_growth_stage">
  dateFrom?: string
  dateTo?: string
  limit?: number
  farmId?: string | null
  enabled?: boolean
  initialData?: QueryResult<Database["public"]["Functions"]["api_production_summary"]["Returns"][number]>
}) {
  const { session } = useAuth()
  const enabled = Boolean(session) && Boolean(params?.farmId) && (params?.enabled ?? true)
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
    initialData: enabled ? params?.initialData : undefined,
    initialDataUpdatedAt: enabled && params?.initialData ? 0 : undefined,
  })
}

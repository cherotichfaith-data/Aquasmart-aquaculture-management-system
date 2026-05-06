"use client"

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/cache/query-keys"
import type { Enums } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import { getRecentActivities, type ChangeLogRow } from "@/lib/api/reports"

export function useRecentActivities(params?: {
  farmId?: string | null
  tableName?: string
  changeType?: Enums<"change_type_enum">
  dateFrom?: string
  dateTo?: string
  limit?: number
  enabled?: boolean
}) {
  const enabled = params?.enabled ?? true
  return useQuery({
    queryKey: queryKeys.activity.recentActivities(params),
    queryFn: ({ signal }) =>
      getRecentActivities({
        farmId: params?.farmId,
        tableName: params?.tableName,
        changeType: params?.changeType,
        dateFrom: params?.dateFrom,
        dateTo: params?.dateTo,
        limit: params?.limit ?? 5,
        signal,
      }),
    enabled: enabled && Boolean(params?.farmId),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60_000,
  })
}

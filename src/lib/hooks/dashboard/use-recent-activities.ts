"use client"

import { useQuery } from "@tanstack/react-query"
import type { Database, Enums } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import { getRecentActivities } from "@/lib/api/reports"

export function useRecentActivities(params?: {
  tableName?: string
  changeType?: Enums<"change_type_enum">
  dateFrom?: string
  dateTo?: string
  limit?: number
  enabled?: boolean
  initialData?: QueryResult<Database["public"]["Tables"]["change_log"]["Row"]>
}) {
  const enabled = params?.enabled ?? true
  return useQuery({
    queryKey: [
      "recent-activities",
      params?.tableName ?? "all",
      params?.changeType ?? "all",
      params?.dateFrom ?? "all",
      params?.dateTo ?? "all",
      params?.limit ?? 5,
    ],
    queryFn: ({ signal }) =>
      getRecentActivities({
        tableName: params?.tableName,
        changeType: params?.changeType,
        dateFrom: params?.dateFrom,
        dateTo: params?.dateTo,
        limit: params?.limit ?? 5,
        signal,
      }),
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60_000,
    initialData: enabled ? params?.initialData : undefined,
    initialDataUpdatedAt: enabled && params?.initialData ? 0 : undefined,
  })
}

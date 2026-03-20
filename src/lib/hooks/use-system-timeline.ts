"use client"

import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/components/providers/auth-provider"
import type { QueryResult } from "@/lib/supabase-client"
import { getSystemTimelineBounds, type SystemTimelineBoundsRow } from "@/lib/api/system-timeline"

export function useSystemTimelineBounds(params?: {
  farmId?: string | null
  systemId?: number
  enabled?: boolean
  initialData?: QueryResult<SystemTimelineBoundsRow>
}) {
  const { session } = useAuth()
  return useQuery({
    queryKey: ["system-timeline-bounds", params?.farmId ?? "all", params?.systemId ?? "all"],
    queryFn: ({ signal }) =>
      getSystemTimelineBounds({
        farmId: params?.farmId,
        systemId: params?.systemId,
        signal,
      }),
    enabled: Boolean(session) && Boolean(params?.farmId) && (params?.enabled ?? true),
    staleTime: 5 * 60_000,
    initialData: params?.initialData,
    initialDataUpdatedAt: params?.initialData ? 0 : undefined,
  })
}

export const buildSystemTimelineMap = (rows: SystemTimelineBoundsRow[]) =>
  new Map<number, SystemTimelineBoundsRow>(
    rows
      .filter((row): row is SystemTimelineBoundsRow & { system_id: number } => typeof row.system_id === "number")
      .map((row) => [row.system_id, row]),
  )

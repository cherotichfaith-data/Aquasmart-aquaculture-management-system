"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/components/providers/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { selectOccupiedSystemIds } from "@/features/shared/occupied-systems"
import { isSbPermissionDenied, logSbError } from "@/lib/supabase/log"

/**
 * The set of system (cage) IDs that currently hold live fish, derived from
 * the live `system.cage_status` flag instead of delayed production-summary
 * snapshots. Triggers keep cage_status in sync when cages are stocked,
 * harvested, transferred, or emptied, so newly restocked cages appear here
 * immediately and stale "empty cage" UI can clear without waiting for the
 * next inventory rollup.
 */
export function useStockedSystemIds(farmId: string | null | undefined, options?: { enabled?: boolean }) {
  const { session } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const enabled = Boolean(session) && Boolean(farmId) && (options?.enabled ?? true)
  const query = useQuery({
    queryKey: ["stocked-systems", farmId ?? "none"],
    enabled,
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      try {
        const ids = await selectOccupiedSystemIds(supabase, farmId!, { signal })
        return Array.from(ids)
      } catch (error) {
        if (!signal?.aborted && !isSbPermissionDenied(error)) {
          logSbError("stockedSystems:list", error)
        }
        return [] as number[]
      }
    },
  })

  const stockedIds = useMemo(() => new Set(query.data ?? []), [query.data])

  return { stockedIds, isLoading: query.isLoading, query }
}

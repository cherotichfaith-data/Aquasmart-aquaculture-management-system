"use client"

import { useMemo } from "react"
import { useDashboardSystems } from "./use-dashboard-systems"

/**
 * The set of system (cage) IDs that currently hold live fish, derived from
 * api_dashboard_systems's `fish_end` (current/period-end inventory) -- the
 * same field the dashboard "Systems Overview" table and mortality report
 * already treat as the source of truth for live stock. A cage that's been
 * fully harvested or had all its fish transferred out drops out of this set
 * until it's restocked, and a cage that's never been stocked (no rows yet)
 * is excluded the same way.
 */
export function useStockedSystemIds(farmId: string | null | undefined, options?: { enabled?: boolean }) {
  const query = useDashboardSystems({ farmId, enabled: options?.enabled })
  const stockedIds = useMemo(() => {
    const rows = query.data?.status === "success" ? query.data.data : []
    return new Set(
      rows
        .filter((row) => (row.fish_end ?? 0) > 0)
        .map((row) => row.system_id)
        .filter((id): id is number => typeof id === "number"),
    )
  }, [query.data])

  return { stockedIds, isLoading: query.isLoading, query }
}

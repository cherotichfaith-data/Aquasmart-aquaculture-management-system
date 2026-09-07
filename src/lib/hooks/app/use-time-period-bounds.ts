"use client"

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/cache/query-keys"
import {
  fetchTimePeriodBoundsClient,
  toCustomPeriodUrlValue,
  type AnalyticsTimeScope,
  type CustomTimeRange,
  type TimeBounds,
  type TimePeriod,
} from "@/lib/time-period"

export function useTimePeriodBounds(params: {
  farmId?: string | null
  timePeriod: TimePeriod
  customRange?: CustomTimeRange | null
  systemId?: number
  batchId?: number
  scope?: AnalyticsTimeScope
  enabled?: boolean
}) {
  const enabled = Boolean(params.farmId) && (params.enabled ?? true)
  const query = useQuery({
    queryKey: queryKeys.timePeriodBounds({
      ...params,
      custom: params.customRange ? toCustomPeriodUrlValue(params.customRange) : null,
    }),
    queryFn: ({ signal }) =>
      !params.farmId
        ? Promise.resolve<TimeBounds>({ start: null, end: null })
        : fetchTimePeriodBoundsClient({
            farmId: params.farmId,
            timePeriod: params.timePeriod,
            customRange: params.customRange,
            scope: params.scope ?? "dashboard",
            systemId: params.systemId,
            batchId: params.batchId,
            signal,
          }),
    enabled,
    // Bounds only shift when the farm's latest data date advances or the
    // period selector changes (the period is in the query key). Data-entry
    // writes already invalidate `time-period-bounds` via invalidateAfterWrite,
    // so a real staleTime just stops every analytics-page navigation from
    // re-running the 200-line bounds RPC.
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  })

  const bounds = query.data ?? { start: null, end: null }
  const start = bounds.start ?? null
  const end = bounds.end ?? null

  return {
    ...query,
    data: bounds,
    start,
    end,
    hasBounds: Boolean(start && end),
  }
}

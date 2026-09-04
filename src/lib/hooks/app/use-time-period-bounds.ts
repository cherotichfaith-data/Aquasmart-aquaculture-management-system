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
    // Bounds shift only as new production data lands, and every data-entry
    // mutation invalidates `time-period-bounds:<farmId>`. Caching for a couple
    // of minutes keeps the analytics pages from re-resolving the window (and
    // flashing their skeletons) on every navigation.
    staleTime: 2 * 60_000,
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

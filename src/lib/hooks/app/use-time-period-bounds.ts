"use client"

import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { queryKeys } from "@/lib/cache/query-keys"
import { createClient } from "@/lib/supabase/client"
import {
  fetchTimePeriodBounds,
  type AnalyticsTimeScope,
  type TimeBounds,
  type TimePeriod,
} from "@/lib/time-period"

export function useTimePeriodBounds(params: {
  farmId?: string | null
  timePeriod: TimePeriod
  systemId?: number
  scope?: AnalyticsTimeScope
  enabled?: boolean
}) {
  const supabase = useMemo(() => createClient(), [])
  const enabled = Boolean(params.farmId) && (params.enabled ?? true)
  const query = useQuery({
    queryKey: queryKeys.timePeriodBounds(params),
    queryFn: ({ signal }) =>
      !params.farmId
        ? Promise.resolve<TimeBounds>({ start: null, end: null })
        : fetchTimePeriodBounds(supabase as never, {
            farmId: params.farmId,
            timePeriod: params.timePeriod,
            scope: params.scope ?? "dashboard",
            systemId: params.systemId,
            signal,
          }),
    enabled,
    staleTime: 0,
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

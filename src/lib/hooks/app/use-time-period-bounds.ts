"use client"

import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { queryKeys } from "@/lib/cache/query-keys"
import { createClient } from "@/lib/supabase/client"
import {
  buildTimeBoundsFromAvailableRange,
  fetchTimePeriodBounds,
  type AnalyticsTimeScope,
  type TimeBounds,
  type TimePeriod,
} from "@/lib/time-period"
import { useSystemTimelineBounds } from "@/lib/hooks/use-system-timeline"
import { resolveSystemTimelineWindow } from "@/lib/system-timeline-window"

export function useTimePeriodBounds(params: {
  farmId?: string | null
  timePeriod: TimePeriod
  systemId?: number
  scope?: AnalyticsTimeScope
  enabled?: boolean
  initialData?: TimeBounds
}) {
  const supabase = useMemo(() => createClient(), [])
  const enabled = Boolean(params.farmId) && (params.enabled ?? true)
  const systemTimelineQuery = useSystemTimelineBounds({
    farmId: params.farmId,
    systemId: params.systemId,
    enabled: enabled && Boolean(params.systemId),
  })
  const query = useQuery({
    queryKey: queryKeys.timePeriodBounds(params),
    queryFn: ({ signal }) =>
      !params.farmId
        ? Promise.resolve<TimeBounds>({ start: null, end: null })
        : fetchTimePeriodBounds(supabase, {
            farmId: params.farmId,
            timePeriod: params.timePeriod,
            scope: params.scope ?? "dashboard",
            signal,
          }),
    enabled,
    staleTime: 5 * 60_000,
    initialData: params.initialData,
    initialDataUpdatedAt: params.initialData ? 0 : undefined,
  })

  const resolvedBounds = useMemo(() => {
    const baseBounds = query.data ?? params.initialData ?? { start: null, end: null }
    if (!params.systemId) return baseBounds

    const timelineRow =
      systemTimelineQuery.data?.status === "success" ? (systemTimelineQuery.data.data[0] ?? null) : null
    const timeline = resolveSystemTimelineWindow(timelineRow)
    if (!timeline?.fullStart || !timeline.fullEnd) return baseBounds

    return buildTimeBoundsFromAvailableRange({
      timePeriod: params.timePeriod,
      availableFromDate: timeline.fullStart,
      latestAvailableDate: timeline.fullEnd,
      anchorScope: `${params.scope ?? "dashboard"}:system`,
    })
  }, [params.initialData, params.scope, params.systemId, params.timePeriod, query.data, systemTimelineQuery.data])

  const start = resolvedBounds.start ?? null
  const end = resolvedBounds.end ?? null

  return {
    ...query,
    data: resolvedBounds,
    start,
    end,
    hasBounds: Boolean(start && end),
  }
}

"use client"

import { useQuery } from "@tanstack/react-query"
import type { Enums } from "@/lib/types/database"
import { getTimePeriodBounds } from "@/lib/api/dashboard"

type TimePeriod = Enums<"time_period"> | string

export function useTimePeriodBounds(params: {
  farmId?: string | null
  timePeriod: TimePeriod
  enabled?: boolean
}) {
  const enabled = Boolean(params.farmId) && (params.enabled ?? true)
  const query = useQuery({
    queryKey: ["time-period-bounds", params.farmId ?? "all", params.timePeriod],
    queryFn: ({ signal }) => getTimePeriodBounds(params.timePeriod, signal, params.farmId ?? null),
    enabled,
    staleTime: 5 * 60_000,
  })

  const start = query.data?.start ?? null
  const end = query.data?.end ?? null

  return {
    ...query,
    start,
    end,
    hasBounds: Boolean(start && end),
  }
}

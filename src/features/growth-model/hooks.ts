"use client"

import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/components/providers/auth-provider"
import { queryKeys } from "@/lib/cache/query-keys"
import { getGrowthStandardCurve } from "./queries.client"

const HOUR = 60 * 60_000

/**
 * The expected growth curve for a scenario, anchored at `startAbwG`. Reference
 * data -- cache aggressively. Used to draw the "expected / ideal" line on
 * growth, biomass and eFCR charts.
 */
export function useGrowthStandardCurve(params: {
  scenario?: string
  startAbwG?: number
  days?: number
  enabled?: boolean
}) {
  const { session, user, isLoading: authLoading } = useAuth()
  const enabled = !authLoading && (Boolean(session) || Boolean(user)) && (params.enabled ?? true)
  return useQuery({
    queryKey: queryKeys.growthModel.standardCurve({
      scenario: params.scenario,
      startAbwG: params.startAbwG,
      days: params.days,
    }),
    queryFn: ({ signal }) =>
      getGrowthStandardCurve({
        scenario: params.scenario,
        startAbwG: params.startAbwG,
        days: params.days,
        signal,
      }),
    enabled,
    staleTime: HOUR,
  })
}

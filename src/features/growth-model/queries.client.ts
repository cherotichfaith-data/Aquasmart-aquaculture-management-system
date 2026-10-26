"use client"

import type { QueryResult } from "@/lib/supabase-client"
import { fetchRpc } from "@/lib/supabase/query-transport"
import type { GrowthStandardCurvePoint } from "./types"

/**
 * Expected ABW / SGR / feeding-rate per day for a growth scenario, anchored at
 * `startAbwG`. Closed-form Richards curve (`public.growth_model_scenario`) --
 * the single source for every "expected growth" overlay in the app.
 */
export async function getGrowthStandardCurve(params: {
  scenario?: string
  startAbwG?: number
  days?: number
  signal?: AbortSignal
}): Promise<QueryResult<GrowthStandardCurvePoint>> {
  return fetchRpc<GrowthStandardCurvePoint>(
    "getGrowthStandardCurve",
    "api_growth_standard_curve",
    {
      p_scenario: params.scenario ?? "main",
      p_start_abw_g: params.startAbwG ?? 1,
      p_days: params.days ?? 365,
    },
    params.signal,
  )
}

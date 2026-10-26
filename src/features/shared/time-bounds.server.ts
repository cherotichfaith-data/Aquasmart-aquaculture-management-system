import "server-only"

import { createAccessTokenClient } from "@/lib/supabase/access-token-client"
import { runServerReadThrough } from "@/lib/cache/server"
import { cacheTags } from "@/lib/cache/tags"
import {
  customRangeToBounds,
  fetchTimePeriodBounds,
  type AnalyticsTimeScope,
  type CustomTimeRange,
  type DateType,
  type TimeBounds,
} from "@/lib/time-period"

export type ScopedTimeBoundsParams = {
  farmId: string
  timePeriod: DateType
  scope?: AnalyticsTimeScope
  systemId?: number | null
  batchId?: number | null
  anchorDate?: string | null
  customRange?: CustomTimeRange | null
}

/**
 * THE source for scoped time-period bounds. Every server prefetch and the
 * client hook (via /api/rpc) resolves bounds through this one function, so
 * there is a single cache, key convention and result shape -- no separate
 * front-end vs back-end time-period logic.
 *
 * `api_time_period_bounds_scoped` is a ~200-line / 10-CTE preamble whose result
 * only moves when the farm's newest data date advances, and it is identical for
 * every member of a farm. So cache it briefly, keyed by every input and tagged
 * `inventory:<farm>` / `farm:<farm>` so data-entry writes bust it. The Supabase
 * client is rebuilt inside the loader from the caller's token (same pattern as
 * getDataEntryPrefetch) so a cache entry never pins a request client.
 */
export async function resolveScopedTimeBounds(
  accessToken: string,
  params: ScopedTimeBoundsParams,
): Promise<TimeBounds> {
  if (params.customRange) return customRangeToBounds(params.customRange)

  return runServerReadThrough({
    keyParts: [
      "time-bounds",
      params.farmId,
      params.timePeriod,
      params.scope ?? "dashboard",
      params.systemId ?? "all",
      params.batchId ?? "all",
      params.anchorDate ?? "today",
    ],
    tags: [cacheTags.inventory(params.farmId), cacheTags.farm(params.farmId)],
    revalidate: 120,
    loader: () =>
      fetchTimePeriodBounds(createAccessTokenClient(accessToken), {
        farmId: params.farmId,
        timePeriod: params.timePeriod,
        scope: params.scope,
        systemId: params.systemId,
        batchId: params.batchId,
        anchorDate: params.anchorDate,
      }),
  })
}

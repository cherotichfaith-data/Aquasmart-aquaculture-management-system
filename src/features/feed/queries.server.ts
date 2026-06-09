import type { QueryResult } from "@/lib/supabase-client"
import { createAccessTokenClient } from "@/lib/supabase/server"
import { requireUserContext } from "@/lib/supabase/require-user"
import { toQuerySuccess } from "@/lib/api/_utils"
import { logSbError } from "@/lib/supabase/log"
import type {
  FeedPageInitialData,
  FeedPageInitialFilters,
  SystemOption,
} from "./types"
import type { FeedRateRow } from "@/lib/types/insights"
import {
  getScopedBatchSystems,
  getScopedSystemOptions,
  getScopedTimeBounds,
  parseSelectedNumericId,
} from "@/features/shared/scoped-analytics.server"
import { normalizeStageFilter } from "@/lib/stage-filter"
import { resolveSystemIdFromFilterValue } from "@/lib/system-options"
import { resolveTimePeriod, type TimePeriod } from "@/lib/time-period"

const DEFAULT_TIME_PERIOD: FeedPageInitialFilters["timePeriod"] = "quarter"
type ServerClient = ReturnType<typeof createAccessTokenClient>

function toSuccess<T>(data: T[]): QueryResult<T> {
  return toQuerySuccess<T>(data)
}

export function parseFeedPageFilters(searchParams?: Record<string, string | string[] | undefined>): FeedPageInitialFilters {
  const selectedBatchRaw = searchParams?.batch
  const selectedSystemRaw = searchParams?.cage ?? searchParams?.system
  const selectedStageRaw = searchParams?.stage
  const timePeriodRaw = searchParams?.period

  const selectedBatch = typeof selectedBatchRaw === "string" ? selectedBatchRaw : "all"
  const selectedSystem = typeof selectedSystemRaw === "string" ? selectedSystemRaw : "all"
  const selectedStage = normalizeStageFilter(selectedStageRaw)
  const timePeriod = resolveTimePeriod(timePeriodRaw, DEFAULT_TIME_PERIOD)

  return {
    selectedBatch,
    selectedSystem,
    selectedStage,
    timePeriod,
  }
}

async function loadFeedRateSummary(
  supabase: ServerClient,
  params: { farmId: string; systemId?: number; dateFrom: string; dateTo: string },
): Promise<FeedRateRow[]> {
  const { data, error } = await supabase.rpc("api_feed_rate_analysis", {
    p_farm_id: params.farmId,
    ...(params.systemId != null ? { p_system_id: params.systemId } : {}),
    p_date_from: params.dateFrom,
    p_date_to: params.dateTo,
  })
  if (error) {
    logSbError("feed:loadFeedRateSummary", error)
    return []
  }
  return (data ?? []) as FeedRateRow[]
}

async function loadFeedPageInitialData(
  supabase: ServerClient,
  params: {
  farmId: string | null
  filters: FeedPageInitialFilters
}): Promise<FeedPageInitialData> {
  if (!params.farmId) {
    return {
      bounds: { start: null, end: null },
      systems: toSuccess([]),
      batchSystems: toSuccess([]),
      feedingRecords: toSuccess([]),
      feedRateSummary: toSuccess([]),
    }
  }

  const [systems, batchSystems] = await Promise.all([
    getScopedSystemOptions(supabase, params.farmId, params.filters.selectedStage) as Promise<SystemOption[]>,
    getScopedBatchSystems(supabase, parseSelectedNumericId(params.filters.selectedBatch)),
  ])
  const selectedSystemId = resolveSystemIdFromFilterValue(params.filters.selectedSystem, systems)
  const bounds = await getScopedTimeBounds(
    supabase,
    params.farmId,
    params.filters.timePeriod,
    "feeding",
    selectedSystemId,
  )

  if (!bounds.start || !bounds.end) {
    return {
      bounds,
      systems: toSuccess(systems),
      batchSystems: toSuccess(batchSystems),
      feedingRecords: toSuccess([]),
      feedRateSummary: toSuccess([]),
    }
  }

  // Pre-fetch feed rate analysis so charts hydrate on first render.
  const feedRateSummary = await loadFeedRateSummary(supabase, {
    farmId: params.farmId,
    systemId: selectedSystemId ?? undefined,
    dateFrom: bounds.start,
    dateTo: bounds.end,
  })

  return {
    bounds,
    systems: toSuccess(systems),
    batchSystems: toSuccess(batchSystems),
    feedingRecords: toSuccess([]),
    feedRateSummary: toSuccess(feedRateSummary),
  }
}

export async function getFeedPageInitialData(params: {
  farmId: string | null
  filters: FeedPageInitialFilters
}): Promise<FeedPageInitialData> {
  const { accessToken } = await requireUserContext()
  return loadFeedPageInitialData(createAccessTokenClient(accessToken), params)
}

import type { QueryResult } from "@/lib/supabase-client"
import { runServerReadThrough } from "@/lib/cache/server"
import { cacheTags } from "@/lib/cache/tags"
import { createAccessTokenClient } from "@/lib/supabase/server"
import { requireUserContext } from "@/lib/supabase/require-user"
import { toQuerySuccess } from "@/lib/api/_utils"
import type {
  FeedPageInitialData,
  FeedPageInitialFilters,
  FeedTypeOption,
  SystemOption,
} from "./types"
import {
  getScopedBatchSystems,
  getScopedSystemOptions,
  getScopedTimeBounds,
  parseSelectedNumericId,
} from "@/features/shared/scoped-analytics.server"
import { isTimePeriod, type TimePeriod } from "@/lib/time-period"

const DEFAULT_TIME_PERIOD: FeedPageInitialFilters["timePeriod"] = "quarter"
const VALID_STAGES: FeedPageInitialFilters["selectedStage"][] = ["all", "nursing", "grow_out"]
type ServerClient = ReturnType<typeof createAccessTokenClient>

function toSuccess<T>(data: T[]): QueryResult<T> {
  return toQuerySuccess<T>(data)
}

export function parseFeedPageFilters(searchParams?: Record<string, string | string[] | undefined>): FeedPageInitialFilters {
  const selectedBatchRaw = searchParams?.batch
  const selectedSystemRaw = searchParams?.system
  const selectedStageRaw = searchParams?.stage
  const timePeriodRaw = searchParams?.period

  const selectedBatch = typeof selectedBatchRaw === "string" ? selectedBatchRaw : "all"
  const selectedSystem = typeof selectedSystemRaw === "string" ? selectedSystemRaw : "all"
  const selectedStage =
    typeof selectedStageRaw === "string" && VALID_STAGES.includes(selectedStageRaw as FeedPageInitialFilters["selectedStage"])
      ? (selectedStageRaw as FeedPageInitialFilters["selectedStage"])
      : "all"
  const timePeriod =
    typeof timePeriodRaw === "string" && isTimePeriod(timePeriodRaw)
      ? (timePeriodRaw as TimePeriod)
      : DEFAULT_TIME_PERIOD

  return {
    selectedBatch,
    selectedSystem,
    selectedStage,
    timePeriod,
  }
}

async function getFeedTypeOptions(supabase: ServerClient): Promise<FeedTypeOption[]> {
  const { data, error } = await supabase.rpc("api_feed_type_options_rpc")

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as FeedTypeOption[]
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
      feedTypes: toSuccess([]),
      feedingRecords: toSuccess([]),
      inventory: toSuccess([]),
    }
  }

  const selectedSystemId = parseSelectedNumericId(params.filters.selectedSystem)
  const bounds = await getScopedTimeBounds(
    supabase,
    params.farmId,
    params.filters.timePeriod,
    "feeding",
    selectedSystemId,
  )
  const [systems, batchSystems, feedTypes] = await Promise.all([
    getScopedSystemOptions(supabase, params.farmId, params.filters.selectedStage) as Promise<SystemOption[]>,
    getScopedBatchSystems(supabase, parseSelectedNumericId(params.filters.selectedBatch)),
    getFeedTypeOptions(supabase),
  ])

  if (!bounds.start || !bounds.end) {
    return {
      bounds,
      systems: toSuccess(systems),
      batchSystems: toSuccess(batchSystems),
      feedTypes: toSuccess(feedTypes),
      feedingRecords: toSuccess([]),
      inventory: toSuccess([]),
    }
  }

  return {
    bounds,
    systems: toSuccess(systems),
    batchSystems: toSuccess(batchSystems),
    feedTypes: toSuccess(feedTypes),
    feedingRecords: toSuccess([]),
    inventory: toSuccess([]),
  }
}

export async function getFeedPageInitialData(params: {
  farmId: string | null
  filters: FeedPageInitialFilters
}): Promise<FeedPageInitialData> {
  const { user, accessToken } = await requireUserContext()

  return runServerReadThrough({
    keyParts: [
      "feed-page",
      user.id,
      params.farmId,
      params.filters.selectedBatch,
      params.filters.selectedSystem,
      params.filters.selectedStage,
      params.filters.timePeriod,
    ],
    tags: params.farmId
      ? [
          cacheTags.feedTypes(),
          cacheTags.farm(params.farmId),
          cacheTags.systems(params.farmId),
          cacheTags.inventory(params.farmId),
          cacheTags.feeding(params.farmId),
        ]
      : [],
    loader: () => loadFeedPageInitialData(createAccessTokenClient(accessToken), params),
  })
}

import type { QueryResult } from "@/lib/supabase-client"
import { createClient } from "@/lib/supabase/server"
import { requireUser } from "@/lib/supabase/require-user"
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

async function getFeedTypeOptions(supabase: Awaited<ReturnType<typeof createClient>>): Promise<FeedTypeOption[]> {
  const { data, error } = await supabase.rpc("api_feed_type_options_rpc")

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as FeedTypeOption[]
}

export async function getFeedPageInitialData(params: {
  farmId: string | null
  filters: FeedPageInitialFilters
}): Promise<FeedPageInitialData> {
  await requireUser()

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

  const supabase = await createClient()
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

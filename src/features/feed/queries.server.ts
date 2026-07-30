import { normalizeStageFilter } from "@/lib/stage-filter"
import { resolveTimePeriod } from "@/lib/time-period"
import type { FeedDashboardFilters } from "./types"

const DEFAULT_TIME_PERIOD: FeedDashboardFilters["timePeriod"] = "month"

export function parseFeedDashboardFilters(
  searchParams?: Record<string, string | string[] | undefined>,
): FeedDashboardFilters {
  const selectedBatchRaw = searchParams?.batch
  const selectedSystemRaw = searchParams?.cage ?? searchParams?.system
  const selectedStageRaw = searchParams?.stage
  const timePeriodRaw = searchParams?.date

  return {
    selectedBatch: typeof selectedBatchRaw === "string" ? selectedBatchRaw : "all",
    selectedSystem: typeof selectedSystemRaw === "string" ? selectedSystemRaw : "all",
    selectedStage: normalizeStageFilter(selectedStageRaw),
    timePeriod: resolveTimePeriod(timePeriodRaw, DEFAULT_TIME_PERIOD),
  }
}

import type { Database } from "@/lib/types/database"
import type { FeedingRecordWithType } from "@/lib/api/reports"
import type { QueryResult } from "@/lib/supabase-client"
import type { TimeBounds, TimePeriod } from "@/lib/time-period"
import type { FeedRateRow } from "@/lib/types/insights"

export type StageFilter = "all" | Database["public"]["Enums"]["system_growth_stage"]
export type SystemOption = Database["public"]["Functions"]["api_system_options_rpc"]["Returns"][number]

export type FeedPageInitialFilters = {
  selectedBatch: string
  selectedSystem: string
  selectedStage: StageFilter
  timePeriod: TimePeriod
}

export type FeedPageInitialData = {
  bounds: TimeBounds
  systems: QueryResult<SystemOption>
  batchSystems: QueryResult<{ system_id: number }>
  feedingRecords: QueryResult<FeedingRecordWithType>
  /** G-03: pre-fetched feed rate analysis rows to hydrate charts on first render */
  feedRateSummary: QueryResult<FeedRateRow>
}

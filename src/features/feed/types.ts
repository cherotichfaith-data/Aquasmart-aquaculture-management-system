import type { Database } from "@/lib/types/database"
import type { FeedingRecordWithType } from "@/lib/api/reports"
import type { QueryResult } from "@/lib/supabase-client"
import type { TimeBounds, TimePeriod } from "@/lib/time-period"

export type StageFilter = "all" | Database["public"]["Enums"]["system_growth_stage"]
export type SystemOption = Database["public"]["Functions"]["api_system_options_rpc"]["Returns"][number]
export type FeedTypeOption = Database["public"]["Functions"]["api_feed_type_options_rpc"]["Returns"][number]
export type DailyInventoryRow = Database["public"]["Functions"]["api_daily_fish_inventory_rpc"]["Returns"][number]

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
  feedTypes: QueryResult<FeedTypeOption>
  feedingRecords: QueryResult<FeedingRecordWithType>
  inventory: QueryResult<DailyInventoryRow>
}

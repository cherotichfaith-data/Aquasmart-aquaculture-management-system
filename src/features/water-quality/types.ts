import type { Database, Enums, Tables } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import type { TimeBounds, TimePeriod } from "@/lib/time-period"
import type { WqParameter } from "@/app/water-quality/_lib/water-quality-utils"

export type WaterQualityRow = Tables<"water_quality_measurement">
export type WaterQualityInsert = Database["public"]["Tables"]["water_quality_measurement"]["Insert"]
export type WaterQualityParameter = Database["public"]["Enums"]["water_quality_parameters"]
export type WaterQualityPageTab =
  | "overview"
  | "alerts"
  | "sensors"
  | "parameter"
  | "environment"
  | "depth"
export type WaterQualityPageFilters = {
  selectedBatch: string
  selectedSystem: string
  selectedStage: "all" | Enums<"system_growth_stage">
  timePeriod: TimePeriod
  activeTab: WaterQualityPageTab
  selectedParameter: WqParameter
}
export type WaterQualitySystemOption = Database["public"]["Functions"]["api_system_options_rpc"]["Returns"][number]
export type WaterQualitySyncRow = Database["public"]["Functions"]["api_water_quality_sync_status"]["Returns"][number]
export type WaterQualityLatestStatusRow =
  Database["public"]["Functions"]["api_latest_water_quality_status"]["Returns"][number]
export type WaterQualityRatingRow = Database["public"]["Views"]["api_daily_water_quality_rating"]["Row"]
export type WaterQualityMeasurementViewRow = Database["public"]["Views"]["api_water_quality_measurements"]["Row"]
export type WaterQualityThresholdRow = Database["public"]["Views"]["api_alert_thresholds"]["Row"]
export type WaterQualityOverlayRow = Database["public"]["Functions"]["api_daily_overlay"]["Returns"][number]
export type WaterQualityActivityRow = {
  id: string | number
  table_name: string | null
  change_type: Enums<"change_type_enum"> | null
  column_name: string | null
  change_time: string | null
  record_id?: string | number | null
  new_value?: string | null
}
export type WaterQualityPageInitialData = {
  bounds: TimeBounds
  systemOptions: QueryResult<WaterQualitySystemOption>
  batchSystems: QueryResult<{ system_id: number }>
  syncStatus: QueryResult<WaterQualitySyncRow>
  latestStatus: QueryResult<WaterQualityLatestStatusRow>
  ratings: QueryResult<WaterQualityRatingRow>
  measurements: QueryResult<WaterQualityMeasurementViewRow>
  overlay: QueryResult<WaterQualityOverlayRow>
  activities: QueryResult<WaterQualityActivityRow>
  thresholds: QueryResult<WaterQualityThresholdRow>
}

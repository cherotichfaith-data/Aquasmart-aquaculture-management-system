import type { Database, Enums, Tables } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import type { TimeBounds, TimePeriod } from "@/lib/time-period"
import type { WqParameter } from "@/features/water-quality/wq-utils"
import type { SystemOption } from "@/lib/system-options"

export type WaterQualityRow = Tables<"water_quality_measurement">
export type WaterQualityInsert = Database["public"]["Tables"]["water_quality_measurement"]["Insert"]
export type WaterQualityParameter = Database["public"]["Enums"]["water_quality_parameters"]
export type WaterQualityPageTab =
  | "alerts"
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
export type WaterQualitySystemOption = SystemOption
export type WaterQualityLatestStatusRow =
  Database["public"]["Functions"]["api_latest_water_quality_status"]["Returns"][number]
export type WaterQualityMeasurementViewRow = Database["public"]["Views"]["api_water_quality_measurements"]["Row"]
export type WaterQualityThresholdRow = Database["public"]["Views"]["api_alert_thresholds"]["Row"]
export type WaterQualityPageInitialData = {
  bounds: TimeBounds
  systemOptions: QueryResult<WaterQualitySystemOption>
  batchSystems: QueryResult<{ system_id: number }>
  latestStatus: QueryResult<WaterQualityLatestStatusRow>
  measurements: QueryResult<WaterQualityMeasurementViewRow>
}

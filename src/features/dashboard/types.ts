import type { Database, Enums } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import type { TimeBounds, TimePeriod } from "@/lib/time-period"
import type { SystemOption } from "@/lib/system-options"

export type DashboardStageFilter = "all" | Enums<"system_growth_stage">
export type DashboardTimePeriod = TimePeriod

export type ProductionSummaryRpcRow = Database["public"]["Functions"]["api_production_summary"]["Returns"][number]
export type ProductionTrendRpcRow = ProductionSummaryRpcRow
export type ProductionTrendRow = ProductionSummaryRpcRow
export type DashboardUserProfile = Database["public"]["Tables"]["user_profile"]["Row"]
export type DashboardUserSettings = Database["public"]["Tables"]["user_settings"]["Row"]
export type DashboardSystemOption = SystemOption
export type DashboardWaterQualityMeasurement = Database["public"]["Views"]["api_water_quality_measurements"]["Row"]
export type DashboardRecentEntriesData = {
  mortality: QueryResult<Database["public"]["Tables"]["fish_mortality"]["Row"]>
  feeding: QueryResult<Database["public"]["Tables"]["feeding_record"]["Row"]>
  sampling: QueryResult<Database["public"]["Tables"]["fish_sampling_weight"]["Row"]>
  transfer: QueryResult<Database["public"]["Tables"]["fish_transfer"]["Row"]>
  harvest: QueryResult<Database["public"]["Tables"]["fish_harvest"]["Row"]>
  water_quality: QueryResult<Database["public"]["Tables"]["water_quality_measurement"]["Row"]>
  feed_inventory: QueryResult<Database["public"]["Tables"]["feed_inventory"]["Row"]>
  stocking: QueryResult<Database["public"]["Tables"]["fish_stocking"]["Row"]>
  systems: QueryResult<Database["public"]["Tables"]["system"]["Row"]>
}

export type KPIOverviewMetric = {
  key: string
  label: string
  value: number | null
  unit?: string
  decimals?: number
  trend: number | null
  trendFormat?: "percent" | "delta"
  trendDecimals?: number
  trendUnit?: string
  invertTrend: boolean
  tone?: "good" | "warn" | "bad" | "neutral"
  badge?: string
}

export type RecommendedAction = {
  title: string
  description: string
  priority: "High" | "Medium" | "Info"
  due: string
}

export type DashboardSystemRpcRow = Database["public"]["Functions"]["api_dashboard_systems"]["Returns"][number]
export type DashboardSystemRow = DashboardSystemRpcRow & {
  batch_name?: string | null
}

export type SystemsOverviewRow = {
  system_id: number
  system_name: string
  abw: DashboardSystemRpcRow["abw"]
  abw_arrow: DashboardSystemRpcRow["abw_arrow"]
  mortality_rate: DashboardSystemRpcRow["mortality_rate"]
  efcr: DashboardSystemRpcRow["efcr"]
  feeding_rate: DashboardSystemRpcRow["feeding_rate"]
  water_quality_rating: DashboardSystemRpcRow["water_quality_rating_average"]
  last_sample_date: DashboardSystemRpcRow["abw_latest_date"]
  summaryRow: DashboardSystemRow
}

export type SystemsTableData = {
  rows: DashboardSystemRow[]
  meta: {
    reason?: string
    source?: string
    error?: string
    start: string | null
    end: string | null
  }
}

export type DashboardPageInitialFilters = {
  selectedBatch: string
  selectedSystem: string
  selectedStage: DashboardStageFilter
  timePeriod: DashboardTimePeriod
}

export type DashboardPageInitialData = {
  bounds: TimeBounds
  systemOptions: QueryResult<DashboardSystemOption>
  batchSystems: QueryResult<{ system_id: number }>
  kpiOverview: {
    metrics: KPIOverviewMetric[]
    dateBounds: { start: string | null; end: string | null }
  }
  systemsTable: SystemsTableData
  waterQualityMeasurements: QueryResult<DashboardWaterQualityMeasurement>
  recommendedActions: RecommendedAction[]
}

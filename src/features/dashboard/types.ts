import type { Database, Enums } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import type { TimeBounds, TimePeriod } from "@/lib/time-period"

export type DashboardStageFilter = "all" | Enums<"system_growth_stage">
export type DashboardTimePeriod = TimePeriod

export type ProductionTrendRpcRow = Database["public"]["Functions"]["api_production_summary"]["Returns"][number]
export type ProductionTrendRow = ProductionTrendRpcRow & {
  feeding_rate: number | null
}
export type DashboardUserProfile = Database["public"]["Tables"]["user_profile"]["Row"]
export type DashboardUserSettings = Database["public"]["Tables"]["user_settings"]["Row"]
export type DashboardSystemOption = Database["public"]["Functions"]["api_system_options_rpc"]["Returns"][number]
export type DashboardWaterQualityMeasurement = Database["public"]["Views"]["api_water_quality_measurements"]["Row"]
export type DashboardAlertThreshold = Database["public"]["Views"]["api_alert_thresholds"]["Row"]
export type DashboardRecentEntriesData = {
  mortality: QueryResult<Database["public"]["Tables"]["fish_mortality"]["Row"]>
  feeding: QueryResult<Database["public"]["Tables"]["feeding_record"]["Row"]>
  sampling: QueryResult<Database["public"]["Tables"]["fish_sampling_weight"]["Row"]>
  transfer: QueryResult<Database["public"]["Tables"]["fish_transfer"]["Row"]>
  harvest: QueryResult<Database["public"]["Tables"]["fish_harvest"]["Row"]>
  water_quality: QueryResult<Database["public"]["Tables"]["water_quality_measurement"]["Row"]>
  incoming_feed: QueryResult<Database["public"]["Tables"]["feed_inventory"]["Row"]>
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
  trust?: {
    source: string
    basis: string
    coverage: string
  }
}

export type RecommendedAction = {
  title: string
  description: string
  priority: "High" | "Medium" | "Info"
  due: string
}

export type DashboardSystemRow = Database["public"]["Functions"]["api_dashboard_systems"]["Returns"][number]

export type SystemsOverviewRow = {
  system_id: number
  system_name: string
  abw: number | null
  abw_trend: "up" | "down" | "flat"
  mortality_rate: number | null
  efcr: number | null
  feeding_rate: number | null
  water_quality_rating: string | null
  last_sample_date: string | null
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
  productionTrend: ProductionTrendRow[]
  waterQualityMeasurements: QueryResult<DashboardWaterQualityMeasurement>
  alertThresholds: QueryResult<DashboardAlertThreshold>
  recommendedActions: RecommendedAction[]
}

import type { Database, Enums } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import type { TimeBounds, TimePeriod } from "@/lib/time-period"
import type { FarmKpisTodayRow } from "@/lib/api/dashboard"

export type DashboardStageFilter = "all" | Enums<"system_growth_stage">
export type DashboardTimePeriod = TimePeriod

export type ProductionTrendRow = Database["public"]["Functions"]["api_production_summary"]["Returns"][number]
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
  incoming_feed: QueryResult<Database["public"]["Tables"]["feed_inventory_snapshot"]["Row"]>
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

export type ProductionSummaryMetrics = {
  totalStockedFish: number
  cumulativeMortality: number
  transferInFish: number
  transferOutFish: number
  totalHarvestedFish: number
  totalHarvestedKg: number
  dateBounds: { start: string | null; end: string | null }
}

export type DashboardSystemRow = Database["public"]["Functions"]["api_dashboard_systems"]["Returns"][number]

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
  farmKpisToday: QueryResult<FarmKpisTodayRow>
  kpiOverview: {
    metrics: KPIOverviewMetric[]
    dateBounds: { start: string | null; end: string | null }
  }
  productionTrend: ProductionTrendRow[]
  systemsTable: SystemsTableData
  productionSummaryMetrics: ProductionSummaryMetrics
  recentEntries: DashboardRecentEntriesData
  waterQualityMeasurements: QueryResult<DashboardWaterQualityMeasurement>
  alertThresholds: QueryResult<DashboardAlertThreshold>
  recommendedActions: RecommendedAction[]
}

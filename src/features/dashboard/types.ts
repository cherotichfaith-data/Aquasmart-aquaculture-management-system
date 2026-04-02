import type { Database, Enums } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import type { TimeBounds, TimePeriod } from "@/lib/time-period"

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

export type DashboardSystemRow = {
  system_id: number
  system_name: string | null
  growth_stage: "nursing" | "grow out" | "grow_out" | string | null
  input_start_date: string | null
  input_end_date: string | null
  as_of_date: string | null
  sampling_end_date: string | null
  sample_age_days: number | null
  efcr: number | null
  efcr_date: string | null
  feed_total: number | null
  abw: number | null
  feeding_rate: number | null
  mortality_rate: number | null
  biomass_density: number | null
  fish_end: number | null
  biomass_end: number | null
  missing_days_count: number | null
  water_quality_rating_average: "optimal" | "acceptable" | "critical" | "lethal" | string | null
  water_quality_rating_numeric_average: number | null
  water_quality_latest_date: string | null
  worst_parameter: string | null
  worst_parameter_value: number | null
  worst_parameter_unit: string | null
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
  productionTrend: ProductionTrendRow[]
  systemsTable: SystemsTableData
  productionSummaryMetrics: ProductionSummaryMetrics
  recentEntries: DashboardRecentEntriesData
  waterQualityMeasurements: QueryResult<DashboardWaterQualityMeasurement>
  alertThresholds: QueryResult<DashboardAlertThreshold>
  recommendedActions: RecommendedAction[]
}

import type { Database, Enums } from "@/lib/types/database"
import type { QueryResult } from "@/lib/supabase-client"
import type { CustomTimeRange, TimeBounds, TimePeriod } from "@/lib/time-period"
import type { SystemOption } from "@/lib/system-options"

export type DashboardStageFilter = "all" | Enums<"system_growth_stage">
export type DashboardTimePeriod = TimePeriod

export type ProductionSummaryRpcRow = Database["public"]["Functions"]["api_production_summary"]["Returns"][number]
export type DashboardSystemOption = SystemOption
export type DashboardWaterQualityMeasurement = Database["public"]["Views"]["api_water_quality_measurements"]["Row"]

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

export type KpiOverviewData = {
  metrics: KPIOverviewMetric[]
  dateBounds: { start: string | null; end: string | null }
}

export type RecommendedAction = {
  title: string
  description: string
  priority: "High" | "Medium" | "Info"
  due: string
}

export type DashboardSystemRpcRow = Database["public"]["Functions"]["api_dashboard_systems"]["Returns"][number] & {
  batch_name?: string | null
}
export type DashboardSystemRow = DashboardSystemRpcRow

export type DashboardBatchRow = {
  batch_id: number
  batch_name: string
  cycle_day: number | null
  date_of_delivery: string | null
  system_ids: number[]
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
  customTimeRange: CustomTimeRange | null
}

export type DashboardPageInitialData = {
  bounds: TimeBounds
  systemOptions: QueryResult<DashboardSystemOption>
  batchSystems: QueryResult<{ system_id: number }>
  kpiOverview: KpiOverviewData
  systemsTable: SystemsTableData
  waterQualityMeasurements: QueryResult<DashboardWaterQualityMeasurement>
  recommendedActions: RecommendedAction[]
}

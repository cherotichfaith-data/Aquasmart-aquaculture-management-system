import type { Database, Enums } from "@/lib/types/database"
import type { TimePeriod } from "@/lib/time-period"

export type FeedDashboardFilters = {
  selectedBatch: string
  selectedSystem: string
  selectedStage: "all" | Enums<"system_growth_stage">
  timePeriod: TimePeriod
}

export type FeedDashboardKpiRow = Database["public"]["Functions"]["api_feed_dashboard_kpis"]["Returns"][number]
export type FeedPlanVsActualRow = Database["public"]["Functions"]["api_feed_plan_vs_actual"]["Returns"][number]
export type SystemFeedStatusRow = Database["public"]["Functions"]["api_system_feed_status"]["Returns"][number]
export type FeedEfcrTrendRow = Database["public"]["Functions"]["api_feed_efcr_trend"]["Returns"][number]
export type FeedingRateVsTargetRow = Database["public"]["Functions"]["api_feeding_rate_vs_target"]["Returns"][number]
export type FeedingResponseDistributionRow =
  Database["public"]["Functions"]["api_feeding_response_distribution"]["Returns"][number]
export type FeedVsBiomassGainRow = Database["public"]["Functions"]["api_feed_vs_biomass_gain"]["Returns"][number]
export type FeedingAlertRow = Database["public"]["Functions"]["api_feeding_alerts"]["Returns"][number]

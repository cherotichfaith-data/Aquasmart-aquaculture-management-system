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

/** One-call payload from `api_feed_dashboard` -- every /feed section in a single RPC. */
export type FeedDashboardPayload = {
  kpis: FeedDashboardKpiRow[]
  plan_vs_actual: FeedPlanVsActualRow[]
  system_status: SystemFeedStatusRow[]
  efcr_trend: FeedEfcrTrendRow[]
  feeding_rate: FeedingRateVsTargetRow[]
  feeding_response: FeedingResponseDistributionRow[]
  feed_vs_biomass: FeedVsBiomassGainRow[]
  alerts: FeedingAlertRow[]
}

export const EMPTY_FEED_DASHBOARD_PAYLOAD: FeedDashboardPayload = {
  kpis: [],
  plan_vs_actual: [],
  system_status: [],
  efcr_trend: [],
  feeding_rate: [],
  feeding_response: [],
  feed_vs_biomass: [],
  alerts: [],
}

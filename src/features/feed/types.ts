import type { Enums } from "@/lib/types/database"
import type { TimePeriod } from "@/lib/time-period"

export type FeedDashboardFilters = {
  selectedBatch: string
  selectedSystem: string
  selectedStage: "all" | Enums<"system_growth_stage">
  timePeriod: TimePeriod
}

// Section row shapes. These used to be derived from the api_feed_*/api_feeding_*
// RPCs; those are gone (migration 20260907140000) and every section now comes
// from api_feed_dashboard's JSONB payload, which emits the same rows.
export type FeedDashboardKpiRow = {
  as_of_date: string
  feed_used_today_kg: number
  feed_this_period_kg: number
  plan_vs_actual_pct: number
  avg_feeding_rate_pct: number
  overfeeding_systems: number
  underfeeding_systems: number
}

export type FeedPlanVsActualRow = {
  date: string
  planned_feed_kg: number
  actual_feed_kg: number
}

export type SystemFeedStatusRow = {
  system_id: number
  system_name: string
  date: string
  biomass_kg: number
  planned_feed_kg: number
  actual_feed_kg: number
  deviation_pct: number
  feeding_rate_pct: number
  efcr_period: number
  status: string
}

export type FeedEfcrTrendRow = {
  date: string
  efcr_period: number
}

export type FeedingRateVsTargetRow = {
  date: string
  actual_rate: number
  feed_rate_min_pct: number
  feed_rate_max_pct: number
}

export type FeedingResponseDistributionRow = {
  feeding_response: number
  count: number
}

export type FeedVsBiomassGainRow = {
  system_id: number
  system_name: string
  date: string
  feed_kg: number
  biomass_gain_kg: number
}

export type FeedingAlertRow = {
  system_id: number
  system_name: string
  date: string
  alert: string
  recommendation: string
  severity: string
}

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

import type { Database } from "@/lib/types/database"

export type HarvestForecastStatus = "on_track" | "ready" | "slow_growth" | "no_data"
export type ForecastConfidence = "high" | "low"

export type HarvestForecastRow = {
  system_id: number
  system_name: string
  current_abw_g: number | null
  last_sample_date: string | null
  sample_age_days: number | null
  adg_g_day: number | null
  target_weight_g: number
  days_to_target: number | null
  projected_harvest_date: string | null
  status: HarvestForecastStatus
  confidence: ForecastConfidence
}

export type BenchmarkLabel = "best_ever" | "above_avg" | "average" | "below_avg" | "no_history"

export type CycleBenchmarkRow = {
  system_id: number
  system_name: string
  current_cycle_start: string | null
  current_efcr: number | null
  current_adg_g_day: number | null
  current_survival_pct: number | null
  current_abw_g: number | null
  current_days_in_cycle: number | null
  best_efcr: number | null
  best_efcr_cycle_start: string | null
  best_adg_g_day: number | null
  best_survival_pct: number | null
  efcr_vs_best: number | null
  adg_vs_best: number | null
  survival_vs_best: number | null
  benchmark_label: BenchmarkLabel
}

export type ActionPriority = "High" | "Medium" | "Info"
export type RecommendedActionRow = Database["public"]["Functions"]["api_recommended_actions"]["Returns"][number]

export type FcrIntervalRow = {
  system_id: number
  system_name: string
  interval_start: string
  interval_end: string
  interval_days: number
  abw_start_g: number
  abw_end_g: number
  live_fish: number
  total_feed_kg: number
  weight_gain_kg: number | null
  fcr: number | null
  sgr_pct_per_day: number | null
  dominant_feed_type: string | null
  warning: string | null
}

export type FeedRateStatus = "above" | "below" | "in_target" | "no_target" | "missing"

export type FeedRateRow = {
  system_id: number
  system_name: string
  feed_date: string
  feed_kg: number
  biomass_kg: number | null
  abw_g: number | null
  live_fish: number | null
  feed_rate_pct: number | null
  lower_band_pct: number | null
  upper_band_pct: number | null
  pellet_size: string | null
  status: FeedRateStatus
  detail: string
}

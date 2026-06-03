// ─── Insights / Analytics Layer types ────────────────────────────────────────
// Corresponds to the four new RPCs in migration 20260420010000_analytics_layer

// ── Harvest Forecast ──────────────────────────────────────────────────────────

export type HarvestForecastStatus = "on_track" | "ready" | "slow_growth" | "no_data"
export type ForecastConfidence = "high" | "low"

export type HarvestForecastRow = {
  system_id: number
  system_name: string
  current_abw_g: number | null
  last_sample_date: string | null       // ISO date
  sample_age_days: number | null
  adg_g_day: number | null
  target_weight_g: number
  days_to_target: number | null
  projected_harvest_date: string | null // ISO date
  status: HarvestForecastStatus
  confidence: ForecastConfidence
}

// ── Feed Demand Forecast ──────────────────────────────────────────────────────

export type FeedStockStatus = "ok" | "low" | "critical" | "unknown"

export type FeedDemandRow = {
  feed_type_id: number
  feed_line: string | null
  feed_category: string
  feed_pellet_size: string
  avg_daily_kg: number
  forecast_7d_kg: number
  forecast_total_kg: number
  current_stock_kg: number
  days_of_stock: number | null
  stock_status: FeedStockStatus
}

// ── System Health Score ───────────────────────────────────────────────────────

export type HealthGrade = "excellent" | "good" | "fair" | "poor" | "critical"

export type SystemHealthRow = {
  system_id: number
  system_name: string
  health_score: number         // 0–10
  health_grade: HealthGrade
  wq_score: number             // 0–3
  mortality_score: number      // 0–3
  fcr_score: number            // 0-2 feed/appetite score retained under the legacy RPC field name
  growth_score: number         // 0–2
  // Raw inputs
  wq_rating_avg: number | null
  mortality_rate_pct: number | null
  latest_efcr: number | null
  adg_g_day: number | null
  latest_abw_g: number | null
  last_sample_date: string | null
  wq_date: string | null
}

export type SystemHealthScoreParams = {
  farmId: string
  systemId?: number
}

export type SystemHealthScoreRpcArgs = {
  p_farm_id: string
  p_system_id?: number
}

export function buildSystemHealthScoreRpcArgs(params: SystemHealthScoreParams): SystemHealthScoreRpcArgs {
  return {
    p_farm_id: params.farmId,
    ...(params.systemId != null ? { p_system_id: params.systemId } : {}),
  }
}

// ── Cycle Benchmarks ──────────────────────────────────────────────────────────

export type BenchmarkLabel = "best_ever" | "above_avg" | "average" | "below_avg" | "no_history"

export type CycleBenchmarkRow = {
  system_id: number
  system_name: string
  // Current
  current_cycle_start: string | null
  current_efcr: number | null
  current_adg_g_day: number | null
  current_survival_pct: number | null
  current_abw_g: number | null
  current_days_in_cycle: number | null
  // Historical best
  best_efcr: number | null
  best_efcr_cycle_start: string | null
  best_adg_g_day: number | null
  best_survival_pct: number | null
  // Deltas
  efcr_vs_best: number | null
  adg_vs_best: number | null
  survival_vs_best: number | null
  benchmark_label: BenchmarkLabel
}

// ── Aggregated page data ──────────────────────────────────────────────────────

export type InsightsPageData = {
  healthScores: SystemHealthRow[]
  harvestForecast: HarvestForecastRow[]
  feedDemand: FeedDemandRow[]
  benchmarks: CycleBenchmarkRow[]
}

// ─── Compute Layer types ──────────────────────────────────────────────────────
// Corresponds to the four new RPCs in migration 20260420020000_compute_layer

// ── Recommended Actions ───────────────────────────────────────────────────────

export type ActionPriority = "High" | "Medium" | "Info"

export type RecommendedActionRow = {
  title: string
  description: string
  priority: ActionPriority
  due: string
}

// ── Feed FCR Intervals ────────────────────────────────────────────────────────

export type FcrIntervalRow = {
  system_id: number
  system_name: string
  interval_start: string       // ISO date
  interval_end: string         // ISO date
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

// ── Feed Rate Analysis ────────────────────────────────────────────────────────

export type FeedRateStatus = "above" | "below" | "in_target" | "no_target" | "missing"

export type FeedRateRow = {
  system_id: number
  system_name: string
  feed_date: string            // ISO date
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

// ── KPI Coverage ─────────────────────────────────────────────────────────────

export type KpiCoverageRow = {
  kpi_key: string
  systems_covered: number
  systems_total: number
  coverage_label: string
  data_source: string
  basis: string
}

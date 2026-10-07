
export type BatchReportRow = {
  /** null on the final Total row. */
  batch_id: number | null
  batch_name: string
  date_in: string | null
  age_days: number | null
  total_stocked: number | null
  stock_end: number | null
  abw_g: number | null
  harvest_number: number | null
  harvest_kg: number | null
  harvest_abw_g: number | null
  biomass_kg: number | null
  cage_corrections: number | null
  mortality: number | null
  stock_loss_pct: number | null
  growth_kg: number | null
  feed_kg: number | null
  efcr: number | null
  acc_efcr: number | null
}

export type CageHarvestRow = {
  cycle_id: number
  system_id: number
  harvest_date: string
  cage_name: string
  batch_name: string
  original_stock_date: string
  age_days: number | null
  total_stocked: number | null
  mortalities: number | null
  mortality_pct: number | null
  cage_corrections: number | null
  cage_correction_pct: number | null
  survival_pct: number | null
  harvest_number: number | null
  harvest_kg: number | null
  harvest_abw_g: number | null
  feed_kg: number | null
  efcr: number | null
}

export type FeedVsExpectedRow = {
  system_id: number
  cage_name: string
  batch_name: string
  feed_fed_kg: number | null
  feed_expected_kg: number | null
  abw_start_g: number | null
  abw_end_g: number | null
  abw_increase_pct: number | null
  feed_vs_expected_pct: number | null
}

export type ForwardPlanRow = {
  month_start: string
  juvenile_stocking: number
  harvest_fish: number
  harvest_kg: number
  biomass_end_kg: number
  total_feed_kg: number
  feed_0_5_1mm_kg: number
  feed_0_9_1_6mm_kg: number
  feed_2mm_kg: number
  feed_3mm_kg: number
  feed_4mm_kg: number
  feed_6mm_kg: number
}

export type StockProfileRow = {
  class_no: number
  abw_from_g: number
  abw_to_g: number | null
  ideal_fish: number
  recorded_fish: number
  recorded_cages: number
  cage_names: string[]
}

export type FarmForecastRow = {
  month_start: string
  is_forecast_only: boolean
  biomass_forecast_kg: number | null
  biomass_recorded_kg: number | null
  harvest_forecast_kg: number | null
  harvest_recorded_kg: number | null
}

export type GrowthByBatchRow = {
  batch_id: number
  batch_name: string
  date_in: string
  gain_recorded_kg: number | null
  gain_expected_kg: number | null
}

export type AbwPointRow = {
  batch_id: number
  batch_name: string
  date: string
  age_days: number
  model_age_days: number
  abw_g: number
}

export type GrowthCurveRow = { scenario: string; day: number; abw_g: number }

/** api_analytics_performance(...) result; a section is null when it was not requested. */
export type PerformanceReports = {
  batches: BatchReportRow[] | null
  cage_harvests: CageHarvestRow[] | null
  feed_vs_expected: FeedVsExpectedRow[] | null
  growth_by_batch: GrowthByBatchRow[] | null
  abw_points: AbwPointRow[] | null
  growth_curve: GrowthCurveRow[] | null
}

/** api_analytics_outlook(...) result; a section is null when it was not requested. */
export type OutlookReports = {
  stock_profile: StockProfileRow[] | null
  farm_forecast: FarmForecastRow[] | null
  forward_plan: ForwardPlanRow[] | null
}

export const GROWTH_SCENARIOS = ["main", "slow", "potential"] as const
export type GrowthScenario = (typeof GROWTH_SCENARIOS)[number]

/** Planning assumptions the forward plan was run with (from the URL). */
export type ForwardPlanInputs = { plannedFish: number; plannedAbwG: number; scenario: GrowthScenario }

export type AnalyticsReportData = {
  /** First day of the reporting month, YYYY-MM-01. */
  /** First day of the month containing the period end (anchors the forecast and forward plan). */
  month: string
  /** Reporting period, YYYY-MM-DD, inclusive. */
  periodStart: string
  periodEnd: string
  batches: BatchReportRow[]
  cageHarvests: CageHarvestRow[]
  feedVsExpected: FeedVsExpectedRow[]
  growthByBatch: GrowthByBatchRow[]
  abwPoints: AbwPointRow[]
  growthCurve: GrowthCurveRow[]
  stockProfile: StockProfileRow[]
  farmForecast: FarmForecastRow[]
  forwardPlan: ForwardPlanRow[]
  forwardPlanInputs: ForwardPlanInputs
  /** Set when any of the three reports failed to load. */
  error: string | null
}

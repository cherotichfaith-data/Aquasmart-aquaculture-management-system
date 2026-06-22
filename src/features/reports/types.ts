import type { Database, Enums, Tables } from "@/lib/types/database"

type FeedTypeRow = Database["public"]["Functions"]["api_feed_type_options_rpc"]["Returns"][number]
type GrowthTrendRow = {
  system_id: number
  sample_date: string
  abw_g: number | null
  adg_g_day: number | null
  sgr_pct_day: number | null
  days_interval: number | null
  weight_gain_g: number | null
  age_days?: number | null
  expected_abw_g?: number | null
  growth_deviation_pct?: number | null
}
type RunningStockRow = {
  date: string | null
  system_id: number | null
  qty: number | null
}
type FeedingRecordRow = Tables<"feeding_record">

export type ChangeLogRow = {
  id: string | number
  table_name: string | null
  change_type: Enums<"change_type_enum"> | null
  column_name: string | null
  change_time: string | null
  system_id?: number | null
  batch_id?: number | null
}

export type FeedingRecordWithType = FeedingRecordRow & { feed_type: FeedTypeRow | null }
export type FeedGrowthTrendRow = GrowthTrendRow
export type FeedRunningStockRow = RunningStockRow

export type FeedingSummaryRow = {
  total_kg_fed: number
  average_protein_pct: number | null
  average_efcr: number | null
  biomass_gain_kg: number
}

export type PerformanceSummaryRow = {
  efcr_aggregated_consolidated: number | null
  average_biomass: number | null
  mortality_rate: number | null
  survival_rate_pct: number | null
  total_harvest_kg: number | null
  total_harvest_fish: number | null
}

export type FeedingBreakdownRow = {
  system_id: number
  system_label: string
  total_kg: number
  entries: number
  avg_protein: number | null
  last_date: string | null
}

export type PerformanceRecordRow = {
  date: string | null
  system_id: number | null
  system_name: string | null
  cycle_id: number | null
  efcr_aggregated: number | null
  survival_rate_pct: number | null
  total_weight_harvested_aggregated: number | null
  number_of_fish_harvested: number | null
  daily_mortality_count: number | null
}

export type ProductionSummaryRpcRow = {
  cycle_id: number | null
  system_id: number | null
  system_name: string | null
  growth_stage: string | null
  ongoing_cycle: boolean | null
  cycle_start: string | null
  cycle_end: string | null
  target_weight_g: number | null
  date: string
  activity: string | null
  days_in_period: number | null
  fish_count_period_start: number | null
  number_of_fish_inventory: number | null
  average_body_weight: number | null
  total_biomass: number | null
  biomass_density: number | null
  mortality_count_period: number | null
  total_feed_amount_period: number | null
  number_of_fish_transfer_in: number | null
  number_of_fish_transfer_out: number | null
  number_of_fish_harvested: number | null
  total_weight_harvested: number | null
  biomass_increase_period: number | null
  feeding_rate_on_date: number | null
  efcr_period: number | null
  sgr: number | null
  agr: number | null
  survival_rate_pct: number | null
  total_feed_amount_aggregated: number | null
  cumulative_mortality: number | null
  biomass_increase_aggregated: number | null
  number_of_fish_transfer_in_aggregated: number | null
  number_of_fish_transfer_out_aggregated: number | null
  number_of_fish_harvested_aggregated: number | null
  total_weight_harvested_aggregated: number | null
  efcr_aggregated: number | null
}

export type ProductionDailyTrendRow = {
  date: string
  estimated_abw_g: number | null
  abw_last_sampling: number | null
  mortality_rate: number | null
  feeding_rate: number | null
  biomass_density: number | null
}


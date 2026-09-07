import type { Tables } from "@/lib/types/database"

export type GrowthModelScenarioRow = Tables<"growth_model_scenario">
export type GrowthCycleBenchmarkRow = Tables<"growth_cycle_benchmark">

export type GrowthStandardCurvePoint = {
  day: number
  expected_abw_g: number
  expected_sgr_pct_day: number | null
  expected_feeding_rate_pct: number | null
}

export type GrowthScenarioName = "main" | "potential" | "slow"

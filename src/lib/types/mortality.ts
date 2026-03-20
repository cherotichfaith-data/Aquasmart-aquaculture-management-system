import type { Database } from "@/lib/types/database"

export const MORTALITY_CAUSES = [
  "unknown",
  "hypoxia",
  "disease",
  "injury",
  "handling",
  "predator",
  "starvation",
  "temperature",
  "other",
] as const

export type MortalityCause = (typeof MORTALITY_CAUSES)[number]

export const ALERT_SEVERITIES = ["info", "warning", "critical"] as const

export type AlertSeverity = (typeof ALERT_SEVERITIES)[number]

export type MortalityEventRow = Omit<Database["public"]["Tables"]["fish_mortality"]["Row"], "cause"> & {
  cause: MortalityCause
}

export type MortalityEventInsert = Omit<Database["public"]["Tables"]["fish_mortality"]["Insert"], "cause"> & {
  cause?: MortalityCause
}

export type AlertLogRow = {
  id: string
  farm_id: string
  system_id: number | null
  rule_code: string
  severity: AlertSeverity
  message: string
  value: number | null
  threshold: number | null
  action_taken: string | null
  acknowledged_at: string | null
  acknowledged_by: string | null
  fired_at: string
}

export type SurvivalTrendRow = {
  event_date: string
  daily_deaths: number
  cum_deaths: number
  stocked: number
  live_count: number
  survival_pct: number
  daily_mort_pct: number
}

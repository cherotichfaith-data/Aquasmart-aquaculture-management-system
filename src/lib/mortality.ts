import { Constants, type Enums } from "@/lib/types/database"

export const MORTALITY_CAUSES = Constants.public.Enums.mortality_cause
export type MortalityCause = Enums<"mortality_cause">

export const ALERT_SEVERITIES = ["info", "warning", "critical"] as const

export type AlertSeverity = (typeof ALERT_SEVERITIES)[number]

export type DerivedSurvivalSeriesRow = {
  system_id: number
  event_date: string
  daily_deaths: number
  cum_deaths: number
  daily_mort_pct: number | null
  live_count: number
  stocked: number
  survival_pct: number | null
}

export function isMortalityCause(value: string): value is MortalityCause {
  return MORTALITY_CAUSES.includes(value as MortalityCause)
}

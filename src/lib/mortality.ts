/**
 * Must stay in sync with the public.mortality_cause enum used by
 * public.fish_mortality.cause.
 */
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
  return (MORTALITY_CAUSES as readonly string[]).includes(value)
}

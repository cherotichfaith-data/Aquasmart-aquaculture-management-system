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

export function isMortalityCause(value: string): value is MortalityCause {
  return (MORTALITY_CAUSES as readonly string[]).includes(value)
}

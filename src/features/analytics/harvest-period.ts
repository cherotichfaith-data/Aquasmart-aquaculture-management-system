import type { AnalyticsPeriod } from "./report-period"

/** Monthly selects actual harvesting activity; cycle-to-date retains the complete history. */
export function harvestRowsForPeriod<T extends { harvest_date: string; harvest_status?: string }>(rows: T[], period: AnalyticsPeriod): T[] {
  return rows.filter(row => (row.harvest_status === "ongoing" || row.harvest_status === "complete")
    && row.harvest_date <= period.to && (period.mode === "cycle" || row.harvest_date >= period.month))
}

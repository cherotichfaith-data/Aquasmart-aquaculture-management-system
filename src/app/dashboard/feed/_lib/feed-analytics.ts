import type { FeedingRecordWithType } from "@/lib/api/reports"
import { formatFeedingResponseLevel, parseFeedingResponseLevel } from "@/lib/feeding-response"
import type { FeedRateRow } from "@/lib/types/insights"

type NormalizedFeedingResponse = "No Response" | "Low Appetite" | "Ideal Appetite" | "Good Appetite" | "Aggressive Appetite"

export type FeedRatePoint = {
  systemId: number
  date: string
  feedKg: number
  biomassKg: number | null
  abwG: number | null
  liveFish: number | null
  feedRatePct: number | null
  lowerBand: number | null
  upperBand: number | null
  inBand: boolean | null
  label: string
}

export type EfcrTrendPoint = {
  systemId: number
  date: string
  efcr: number | null
}

export function formatFeedDayLabel(value: string) {
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(parsed)
}

export function normalizeFeedingResponse(
  value: FeedingRecordWithType["feeding_response"] | string | null | undefined,
): NormalizedFeedingResponse | null {
  const level = parseFeedingResponseLevel(value)
  if (level == null) return null
  if (level === 1) return "No Response"
  if (level === 2) return "Low Appetite"
  if (level === 3) return "Ideal Appetite"
  if (level === 4) return "Good Appetite"
  return "Aggressive Appetite"
}

export function formatFeedingResponse(value: FeedingRecordWithType["feeding_response"] | string | null | undefined) {
  return formatFeedingResponseLevel(value)
}

export function buildFeedRatePointsFromAnalysis(rows: FeedRateRow[]): FeedRatePoint[] {
  return rows
    .map((row) => ({
      systemId: row.system_id,
      date: row.feed_date,
      feedKg: row.feed_kg,
      biomassKg: row.biomass_kg,
      abwG: row.abw_g,
      liveFish: row.live_fish,
      feedRatePct: row.feed_rate_pct,
      lowerBand: row.lower_band_pct,
      upperBand: row.upper_band_pct,
      inBand:
        row.status === "in_target"
          ? true
          : row.status === "above" || row.status === "below"
            ? false
            : null,
      label: formatFeedDayLabel(row.feed_date),
    }))
    .sort((a, b) => (a.systemId === b.systemId ? a.date.localeCompare(b.date) : a.systemId - b.systemId))
}

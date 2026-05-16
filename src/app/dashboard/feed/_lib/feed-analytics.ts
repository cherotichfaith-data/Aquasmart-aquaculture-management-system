import type { FeedingRecordWithType } from "@/lib/api/reports"
import { formatFeedingResponseLevel, isLowFeedingResponse, parseFeedingResponseLevel } from "@/lib/feeding-response"
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

export type FcrInterval = {
  systemId: number
  startDate: string
  endDate: string
  days: number
  previousAbwG: number
  currentAbwG: number
  liveFishCount: number | null
  totalFeedKg: number
  weightGainKg: number | null
  fcr: number | null
  sgrPctPerDay: number | null
  warning: string | null
  dominantFeedType: string | null
  dominantFeedTypeId: number | null
}

type ResponseAlert = {
  systemId: number
  date: string
  message: string
}

export type FeedDeviationCell = {
  systemId: number
  date: string
  status: "above" | "below" | "in_target" | "no_target" | "missing"
  label: string
  detail: string
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

export function buildConsecutivePoorAlerts(params: {
  feedingRecords: FeedingRecordWithType[]
  systemLabels: Map<number, string>
}): ResponseAlert[] {
  const bySystem = new Map<number, FeedingRecordWithType[]>()
  params.feedingRecords.forEach((record) => {
    if (record.system_id == null) return
    const list = bySystem.get(record.system_id) ?? []
    list.push(record)
    bySystem.set(record.system_id, list)
  })

  return Array.from(bySystem.entries()).flatMap(([systemId, records]) => {
    const sorted = records
      .slice()
      .sort((a, b) => String(a.created_at ?? a.date ?? "").localeCompare(String(b.created_at ?? b.date ?? "")))
    const alerts: ResponseAlert[] = []
    for (let index = 1; index < sorted.length; index += 1) {
      const previousNeedsAttention = isLowFeedingResponse(sorted[index - 1]?.feeding_response)
      const currentNeedsAttention = isLowFeedingResponse(sorted[index]?.feeding_response)
      if (previousNeedsAttention && currentNeedsAttention) {
        alerts.push({
          systemId,
          date: sorted[index]?.date ?? "",
          message: `${params.systemLabels.get(systemId) ?? `System ${systemId}`} recorded consecutive weak feeding responses.`,
        })
      }
    }
    return alerts
  })
}

export function buildFeedDeviationMatrixCells(params: {
  systemIds: number[]
  dates: string[]
  rows: FeedRateRow[]
}): FeedDeviationCell[] {
  const bySystemDate = new Map<string, FeedRateRow>()
  params.rows.forEach((row) => {
    bySystemDate.set(`${row.system_id}:${row.feed_date}`, row)
  })

  return params.systemIds.flatMap((systemId) =>
    params.dates.map((date) => {
      const row = bySystemDate.get(`${systemId}:${date}`)
      if (!row) {
        return {
          systemId,
          date,
          status: "missing" as const,
          label: formatFeedDayLabel(date),
          detail: "No feed-rate point available.",
        }
      }

      return {
        systemId,
        date,
        status: row.status,
        label: formatFeedDayLabel(row.feed_date),
        detail: row.detail,
      }
    }),
  )
}

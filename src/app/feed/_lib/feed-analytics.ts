import type { FeedingRecordWithType } from "@/lib/api/reports"
import type { DailyInventoryRow } from "@/features/feed/types"

type NormalizedFeedingResponse = "Excellent" | "Good" | "Fair" | "Poor"

type FeedRateBand = {
  label: string
  lower: number
  upper: number
  pellet: string
  source: "guide"
}

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

type PelletGuideRow = {
  label: string
  min: number
  max: number | null
  pellet: string
  lowerPct: number
  upperPct: number
}

const PELLET_GUIDE: PelletGuideRow[] = [
  { label: "Fry", min: 0, max: 1, pellet: "Crumble / powder", lowerPct: 15, upperPct: 20 },
  { label: "Fingerling", min: 1, max: 10, pellet: "1.0-1.5mm", lowerPct: 8, upperPct: 15 },
  { label: "Juvenile", min: 10, max: 50, pellet: "2.0mm", lowerPct: 5, upperPct: 8 },
  { label: "Grow-out", min: 50, max: 200, pellet: "3.0mm", lowerPct: 3, upperPct: 5 },
  { label: "Late grow-out", min: 200, max: null, pellet: "4-6mm", lowerPct: 2, upperPct: 3 },
]


export function formatFeedDayLabel(value: string) {
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(parsed)
}

export function normalizeFeedingResponse(
  value: FeedingRecordWithType["feeding_response"] | string | null | undefined,
): NormalizedFeedingResponse | null {
  const normalized = String(value ?? "").trim().toLowerCase()
  if (normalized === "very_good") return "Excellent"
  if (normalized === "good") return "Good"
  if (normalized === "fair") return "Fair"
  if (normalized === "bad" || normalized === "poor") return "Poor"
  return null
}

function getFeedRateBand(abwG: number | null | undefined): FeedRateBand | null {
  if (typeof abwG !== "number" || !Number.isFinite(abwG) || abwG < 0) return null
  const band =
    PELLET_GUIDE.find((item) => abwG >= item.min && (item.max == null || abwG < item.max)) ??
    PELLET_GUIDE[PELLET_GUIDE.length - 1]
  return {
    label: band.label,
    lower: band.lowerPct,
    upper: band.upperPct,
    pellet: band.pellet,
    source: "guide",
  }
}

const isDateWithinRange = (value: string, start: string, end: string | null) => {
  if (value < start) return false
  if (end && value > end) return false
  return true
}


export function buildFeedRateSeries(
  params: {
    rows: DailyInventoryRow[]
    batchId?: number | null
    selectedFeedTypeId?: number | null
  },
): FeedRatePoint[] {
  return params.rows
    .filter((row) => row.system_id != null && !!row.inventory_date)
    .map((row) => {
      const feedKg = row.feeding_amount_aggregated ?? row.feeding_amount ?? 0
      const biomassKg = row.biomass_last_sampling ?? null
      const abwG = row.abw_last_sampling ?? null
      const band = getFeedRateBand(abwG)
      const feedRatePct = biomassKg && biomassKg > 0 ? (feedKg / biomassKg) * 100 : null
      const inBand =
        feedRatePct != null && band ? feedRatePct >= band.lower && feedRatePct <= band.upper : null

      return {
        systemId: row.system_id as number,
        date: row.inventory_date as string,
        feedKg,
        biomassKg,
        abwG,
        liveFish: row.number_of_fish ?? null,
        feedRatePct,
        lowerBand: band?.lower ?? null,
        upperBand: band?.upper ?? null,
        inBand,
        label: formatFeedDayLabel(row.inventory_date as string),
      }
    })
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
      const previous = normalizeFeedingResponse(sorted[index - 1]?.feeding_response)
      const current = normalizeFeedingResponse(sorted[index]?.feeding_response)
      const previousNeedsAttention = previous === "Poor" || previous === "Fair"
      const currentNeedsAttention = current === "Poor" || current === "Fair"
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

export function buildFeedDeviationCells(params: {
  systemIds: number[]
  dates: string[]
  points: FeedRatePoint[]
}): FeedDeviationCell[] {
  const bySystemDate = new Map<string, FeedRatePoint>()
  params.points.forEach((point) => {
    bySystemDate.set(`${point.systemId}:${point.date}`, point)
  })

  return params.systemIds.flatMap((systemId) =>
    params.dates.map((date) => {
      const point = bySystemDate.get(`${systemId}:${date}`)
      if (!point) {
        return {
          systemId,
          date,
          status: "missing" as const,
          label: formatFeedDayLabel(date),
          detail: "No feed-rate point available.",
        }
      }

      const status =
        point.feedRatePct == null || (point.lowerBand == null && point.upperBand == null)
          ? ("no_target" as const)
          : point.upperBand != null && point.feedRatePct > point.upperBand
            ? ("above" as const)
            : point.lowerBand != null && point.feedRatePct < point.lowerBand
              ? ("below" as const)
              : ("in_target" as const)

      const targetLabel =
        point.lowerBand != null && point.upperBand != null
          ? `${point.lowerBand.toFixed(1)}% to ${point.upperBand.toFixed(1)}%`
          : "No target"

      return {
        systemId,
        date,
        status,
        label: point.label,
        detail: `Feed rate ${point.feedRatePct != null ? point.feedRatePct.toFixed(2) : "N/A"}%. Target ${targetLabel}. Feed ${point.feedKg.toFixed(1)} kg.`,
      }
    }),
  )
}

import type { FeedingRecordWithType } from "@/lib/api/reports"
import type { FeedPlan } from "@/lib/api/reports"
import type { DailyInventoryRow } from "@/features/feed/types"

type NormalizedFeedingResponse = "Excellent" | "Good" | "Fair" | "Poor"

type FeedRateBand = {
  label: string
  lower: number
  upper: number
  pellet: string
  source: "feed_plan" | "guide"
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

type FeedPlanMatchParams = {
  systemId: number
  date: string
  abwG: number | null
  batchId?: number | null
  feedTypeId?: number | null
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

const FEED_PLAN_TOLERANCE_RATIO = 0.1
const FEED_PLAN_TOLERANCE_FLOOR = 0.25

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

const isAbwWithinRange = (abwG: number | null, min: number | null, max: number | null) => {
  if (abwG == null || !Number.isFinite(abwG)) return min == null && max == null
  if (min != null && abwG < min) return false
  if (max != null && abwG > max) return false
  return true
}

export function selectApplicableFeedPlan(
  feedPlans: FeedPlan[],
  params: FeedPlanMatchParams,
): FeedPlan | null {
  const candidates = feedPlans
    .filter((plan) => plan.is_active)
    .filter((plan) => isDateWithinRange(params.date, plan.effective_from, plan.effective_to))
    .filter((plan) => (plan.system_id == null ? true : plan.system_id === params.systemId))
    .filter((plan) => (plan.batch_id == null ? true : plan.batch_id === params.batchId))
    .filter((plan) => (params.feedTypeId == null ? true : plan.feed_type_id === params.feedTypeId))
    .filter((plan) => isAbwWithinRange(params.abwG, plan.abw_min_g, plan.abw_max_g))
    .sort((left, right) => {
      const leftSpecificity =
        (left.system_id != null ? 8 : 0) +
        (left.batch_id != null ? 4 : 0) +
        (left.feed_type_id != null ? 2 : 0) +
        ((left.abw_min_g != null || left.abw_max_g != null) ? 1 : 0)
      const rightSpecificity =
        (right.system_id != null ? 8 : 0) +
        (right.batch_id != null ? 4 : 0) +
        (right.feed_type_id != null ? 2 : 0) +
        ((right.abw_min_g != null || right.abw_max_g != null) ? 1 : 0)

      if (leftSpecificity !== rightSpecificity) return rightSpecificity - leftSpecificity
      if (left.effective_from !== right.effective_from) {
        return right.effective_from.localeCompare(left.effective_from)
      }
      return right.id - left.id
    })

  return candidates[0] ?? null
}

function getFeedPlanBand(plan: FeedPlan | null): FeedRateBand | null {
  const target = plan?.target_feeding_rate_pct
  if (target == null || !Number.isFinite(target) || target <= 0) return null
  const tolerance = Math.max(target * FEED_PLAN_TOLERANCE_RATIO, FEED_PLAN_TOLERANCE_FLOOR)
  return {
    label: "Feed plan",
    lower: Math.max(0, target - tolerance),
    upper: target + tolerance,
    pellet: "",
    source: "feed_plan",
  }
}

export function buildFeedRateSeries(
  params: {
    rows: DailyInventoryRow[]
    feedPlans?: FeedPlan[]
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
      const matchedPlan = selectApplicableFeedPlan(params.feedPlans ?? [], {
        systemId: row.system_id as number,
        date: row.inventory_date as string,
        abwG,
        batchId: params.batchId ?? null,
        feedTypeId: params.selectedFeedTypeId ?? null,
      })
      const band = getFeedPlanBand(matchedPlan) ?? getFeedRateBand(abwG)
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

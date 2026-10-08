import { createAccessTokenClient } from "@/lib/supabase/server"
import { logSbError } from "@/lib/supabase/log"
import {
  GROWTH_SCENARIOS,
  type AnalyticsReportData,
  type ForwardPlanInputs,
  type GrowthScenario,
  type OutlookReports,
  type PerformanceReports,
} from "./types"

const DEFAULT_PLANNED_STOCKING = 125_000
const MONTH_PARAM = /^(\d{4})-(0[1-9]|1[0-2])$/

const DATE_PARAM = /^\d{4}-\d{2}-\d{2}$/

function isRealDate(value: string) {
  return DATE_PARAM.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export type AnalyticsPeriod = { from: string; to: string; month: string; growthCustom?: boolean }

/**
 * The reporting period. `?from=YYYY-MM-DD&to=YYYY-MM-DD` is used exactly; otherwise `?month=YYYY-MM`
 * (the whole month), defaulting to the current month. `month` is the first day of the month holding `to`.
 */
export function parseAnalyticsPeriod(
  searchParams: Record<string, string | string[] | undefined>,
  today = new Date(),
): AnalyticsPeriod {
  if (searchParams.report === "harvests") {
    const selected = typeof searchParams.month === "string" && MONTH_PARAM.test(searchParams.month) ? searchParams.month : null
    const base = selected ?? today.toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit" })
    const [year, month] = base.split("-").map(Number)
    return { from: base + "-01", to: base + "-" + String(lastDayOfMonth(year, month)).padStart(2, "0"), month: base + "-01" }
  }
  const from = typeof searchParams.from === "string" ? searchParams.from : ""
  const to = typeof searchParams.to === "string" ? searchParams.to : ""
  if (searchParams.period !== "custom") {
    // Default to the current cycle through today; only Custom uses URL dates.
    const end = today.toISOString().slice(0, 10)
    return { from: end, to: end, month: `${end.slice(0, 7)}-01` }
  }
  if (isRealDate(from) && isRealDate(to)) {
    const [start, end] = from <= to ? [from, to] : [to, from]
    return { from: start, to: end, month: `${end.slice(0, 7)}-01`, growthCustom: searchParams.period === "custom" }
  }
  const monthParam = typeof searchParams.month === "string" && MONTH_PARAM.test(searchParams.month) ? searchParams.month : null
  const base = monthParam ?? `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}`
  const [y, m] = base.split("-").map(Number)
  return {
    from: `${base}-01`,
    to: `${base}-${String(lastDayOfMonth(y, m)).padStart(2, "0")}`,
    month: `${base}-01`,
    growthCustom: searchParams.period === "custom",
  }
}

/** `?stocking=150000&stockingAbw=2`: the planned monthly juvenile stocking behind the forward plan. */
export function parseForwardPlanInputs(searchParams: Record<string, string | string[] | undefined>): ForwardPlanInputs {
  const read = (key: string) => {
    const raw = searchParams[key]
    const n = typeof raw === "string" ? Number(raw) : NaN
    return Number.isFinite(n) && n >= 0 ? n : null
  }
  // The farm plans 100,000-150,000 juveniles a month; plan on the midpoint unless overridden.
  const plannedFish = Math.min(read("stocking") ?? DEFAULT_PLANNED_STOCKING, 10_000_000)
  const plannedAbwG = Math.min(Math.max(read("stockingAbw") ?? 2, 0.1), 100)
  const scenarioRaw = searchParams.scenario
  const scenario: GrowthScenario = GROWTH_SCENARIOS.find((s) => s === scenarioRaw) ?? "main"
  return { plannedFish, plannedAbwG, scenario }
}

/** The dropdown views (`?report=`); each only loads the sections it shows. */
export type AnalyticsView = "outlook" | "batches" | "growth" | "cages" | "planning" | "harvests"

export function parseAnalyticsView(raw: string | string[] | undefined): AnalyticsView {
  if (raw === "forecast") return "planning"
  return raw === "outlook" || raw === "batches" || raw === "growth" || raw === "cages" || raw === "planning" || raw === "harvests" ? raw : "outlook"
}

const SECTIONS_BY_VIEW: Record<AnalyticsView, { performance: string[]; outlook: string[] }> = {
  outlook: { performance: [], outlook: ["stock_profile"] },
  planning: { performance: [], outlook: ["farm_forecast", "forward_plan"] },
  batches: { performance: ["batches"], outlook: [] },
  growth: { performance: ["growth_by_batch", "abw_points", "growth_curve"], outlook: [] },
  harvests: { performance: ["cage_harvests", "batch_harvests"], outlook: [] },
  cages: { performance: ["feed_vs_expected"], outlook: [] },
}

export async function getAnalyticsReportData(params: {
  farmId: string | null
  period: AnalyticsPeriod
  view: AnalyticsView
  accessToken: string
  forwardPlanInputs: ForwardPlanInputs
}): Promise<AnalyticsReportData> {
  const empty: AnalyticsReportData = {
    month: params.period.month,
    periodStart: params.period.from,
    periodEnd: params.period.to,
    batches: [],
    batchHarvests: [],
    cageHarvests: [],
    feedVsExpected: [],
    growthByBatch: [],
    abwPoints: [],
    growthCurve: [],
    stockProfile: [],
    farmForecast: [],
    forwardPlan: [],
    forwardPlanInputs: params.forwardPlanInputs,
    error: null,
  }
  if (!params.farmId) return empty

  const supabase = createAccessTokenClient(params.accessToken)
  let period = params.period
  if (params.view !== "harvests" && !period.growthCustom) {
    const cycles = await supabase
      .from("production_cycle")
      .select("cycle_start, fingerling_batch!inner(farm_id)")
      .eq("fingerling_batch.farm_id", params.farmId)
      .eq("ongoing_cycle", true)
      .lte("cycle_start", period.to)
      .order("cycle_start", { ascending: true })
      .limit(1)
      .maybeSingle()
    if (cycles.error) {
      logSbError("analytics:cyclePeriod", cycles.error)
      return { ...empty, error: "The cycle reporting period could not be loaded. Try again shortly." }
    }
    period = { ...period, from: cycles.data?.cycle_start ?? period.month }
  }
  // Forecast and forward plan are monthly and anchored to the month holding the period end;
  // the three period reports use the exact from/to dates.
  const args = { p_farm_id: params.farmId, p_month: period.month }
  const periodArgs = {
    p_farm_id: params.farmId,
    p_month: period.to,
    p_period_start: period.from,
    p_period_end: period.to,
  }
  const planArgs = {
    p_planned_fish: params.forwardPlanInputs.plannedFish,
    p_planned_abw_g: params.forwardPlanInputs.plannedAbwG,
    p_scenario: params.forwardPlanInputs.scenario,
  }
  const needs = SECTIONS_BY_VIEW[params.view]
  const [performance, outlook] = await Promise.all([
    needs.performance.length > 0
      ? supabase.rpc("api_analytics_performance", {
          ...periodArgs,
          p_sections: period.growthCustom ? [...needs.performance, "growth_custom"] : needs.performance,
          p_scenario: params.forwardPlanInputs.scenario,
        })
      : Promise.resolve(null),
    needs.outlook.length > 0
      ? supabase.rpc("api_analytics_outlook", {
          ...args,
          p_as_of: period.to,
          p_sections: needs.outlook,
          ...planArgs,
        })
      : Promise.resolve(null),
  ])

  const failed = [performance, outlook].find((r) => r?.error)
  if (failed?.error) logSbError("analytics:getAnalyticsReportData", failed.error)
  const perf = (performance?.data ?? null) as PerformanceReports | null
  const out = (outlook?.data ?? null) as OutlookReports | null

  return {
    month: period.month,
    periodStart: period.from,
    periodEnd: period.to,
    batches: perf?.batches ?? [],
    batchHarvests: perf?.batch_harvests ?? [],
    cageHarvests: perf?.cage_harvests ?? [],
    feedVsExpected: perf?.feed_vs_expected ?? [],
    growthByBatch: perf?.growth_by_batch ?? [],
    abwPoints: perf?.abw_points ?? [],
    growthCurve: perf?.growth_curve ?? [],
    stockProfile: out?.stock_profile ?? [],
    farmForecast: out?.farm_forecast ?? [],
    forwardPlan: out?.forward_plan ?? [],
    forwardPlanInputs: params.forwardPlanInputs,
    error: failed?.error ? "Some analytics could not be loaded. Try again shortly." : null,
  }
}
